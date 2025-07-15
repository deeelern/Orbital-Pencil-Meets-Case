import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  AppState,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../FirebaseConfig";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ChatRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, otherUser } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [appState, setAppState] = useState(AppState.currentState);

  const currentUserId = auth.currentUser?.uid;
  const lastReadAtRef = useRef(0);
  const unreadCountRef = useRef(0);
  const snapshotInitialized = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const isScreenActive = useRef(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" && isScreenActive.current) {
        markMessagesAsRead();
      }
      setAppState(next);
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const focusUnsub = navigation.addListener("focus", () => {
      isScreenActive.current = true;
      markMessagesAsRead();
    });
    const blurUnsub = navigation.addListener("blur", () => {
      isScreenActive.current = false;
      markMessagesAsRead();
    });
    return () => {
      focusUnsub();
      blurUnsub();
    };
  }, [navigation]);

  useEffect(() => {
    let unsubscribeChat;
    let unsubscribeMessages;
    const chatDocRef = doc(db, "chats", chatId);

    (async () => {
      // Load and subscribe to chat metadata
      const chatSnap = await getDoc(chatDocRef);
      const chatData = chatSnap.data() || {};
      lastReadAtRef.current = chatData.lastReadAt?.toMillis() || 0;
      unreadCountRef.current = chatData.unreadCounts?.[currentUserId] || 0;

      unsubscribeChat = onSnapshot(chatDocRef, (snap) => {
        const d = snap.data() || {};
        unreadCountRef.current = d.unreadCounts?.[currentUserId] || 0;
        const serverReadAt = d.lastReadAt?.toMillis() || 0;
        lastReadAtRef.current = Math.max(lastReadAtRef.current, serverReadAt);
      });

      // Subscribe to message stream
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, orderBy("timestamp", "asc"));
      unsubscribeMessages = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

        if (!snapshotInitialized.current) {
          snapshotInitialized.current = true;
          return;
        }

        // Show local notification if appropriate
        const shouldNotify =
          !isScreenActive.current &&
          appStateRef.current !== "active" &&
          unreadCountRef.current > 0;

        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;
          const m = change.doc.data();
          const t = m.timestamp?.toMillis() || 0;
          if (
            m.senderId !== currentUserId &&
            shouldNotify &&
            t > lastReadAtRef.current
          ) {
            showNotification(otherUser.firstName, m.text);
          }
        });
      });
    })();

    return () => {
      unsubscribeMessages?.();
      unsubscribeChat?.();
    };
  }, [chatId, currentUserId, otherUser.firstName]);

  const showNotification = async (senderName, messageText) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: senderName,
          body: messageText,
          data: { chatId, otherUser },
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastReadAt: serverTimestamp(),
        [`unreadCounts.${currentUserId}`]: 0,
      });
      lastReadAtRef.current = Date.now();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      await addDoc(msgRef, {
        senderId: currentUserId,
        text: text.trim(),
        timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: currentUserId,
        [`unreadCounts.${otherUser.id}`]: increment(1),
      });
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUserId;
    return (
      <View
        style={[
          styles.bubble,
          isMe ? styles.myBubble : styles.theirBubble,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            !isMe && styles.theirBubbleText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ 
              uri: otherUser?.photos?.[0] || "https://via.placeholder.com/100" 
            }}
            style={styles.headerAvatar}
            defaultSource={{ uri: "https://via.placeholder.com/100" }}
          />
          <Text style={styles.headerTitle}>{otherUser?.firstName || "User"}</Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#6C5CE7",
    paddingTop: Platform.OS === "android" ? 20 : 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,       
    height: 40,       
    borderRadius: 20, 
    marginRight: 12,
    borderWidth: 2,   
    borderColor: "#fff",
    backgroundColor: "hotpink",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  messageList: {
    padding: 12,
  },
  bubble: {
    padding: 10,
    marginVertical: 6,
    borderRadius: 16,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: "#6C5CE7",
    alignSelf: "flex-end",
  },
  theirBubble: {
    backgroundColor: "#dfe6e9",
    alignSelf: "flex-start",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    color: "#fff",
  },
  theirBubbleText: {
    color: "#333",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF",
    borderTopColor: "#DDD",
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F1F1F1",
    borderRadius: 20,
    maxHeight: 100,
    color: "#333",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#6C5CE7",
    borderRadius: 20,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

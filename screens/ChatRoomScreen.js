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
} from "react-native";
import { db, auth } from "../FirebaseConfig";
import {
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const flatListRef = useRef(null);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const msgRef = collection(db, "chats", chatId, "messages");
    const q = query(msgRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      if (snapshot.docChanges().length > 0) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newMessage = { id: change.doc.id, ...change.doc.data() };

            if (
              newMessage.senderId !== currentUserId &&
              appState !== "active"
            ) {
              showNotification(otherUser.firstName, newMessage.text);
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, currentUserId, otherUser.firstName, appState]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      markMessagesAsRead();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (appState === "active") {
      markMessagesAsRead();
    }
  }, [appState]);

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
        [`unreadCounts.${currentUserId}`]: 0,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (text.trim() === "") return;

    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      await addDoc(msgRef, {
        senderId: currentUserId,
        text: text.trim(),
        timestamp: serverTimestamp(),
      });

      const otherUserId = otherUser.id;
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: currentUserId,
        [`unreadCounts.${otherUserId}`]: increment(1),
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
        style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}
      >
        <Text style={[styles.bubbleText, !isMe && styles.theirBubbleText]}>
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
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{otherUser.firstName}</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input bar */}
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
    backgroundColor: "#f9f9f9",
  },
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    backgroundColor: "#6C5CE7",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 12 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 15,
    maxWidth: "70%",
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
    color: "#fff",
    fontSize: 16,
  },
  theirBubbleText: {
    color: "#333",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
    maxHeight: 100,
    color: "black",
  },
  sendButton: {
    backgroundColor: "#6C5CE7",
    padding: 10,
    borderRadius: 20,
  },
});

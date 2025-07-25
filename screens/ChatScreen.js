import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { auth, db } from "../FirebaseConfig";
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ChatScreen() {
  const [chats, setChats] = useState([]);
  const [blockedList, setBlockedList] = useState([]);
  const navigation = useNavigation();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;

    const fetchChats = async () => {
      const userSnap = await getDoc(doc(db, "users", currentUserId));
      const myBlocked = userSnap.data()?.blocked || [];
      setBlockedList(myBlocked);

      const q = query(
        collection(db, "chats"),
        where("members", "array-contains", currentUserId)
      );

      const unsubscribe = onSnapshot(q, async (chatSnapshot) => {
        const chatData = await Promise.all(
          chatSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const chatId = docSnap.id;
            const otherUserId = data.members.find((id) => id !== currentUserId);
            const otherUserSnap = await getDoc(doc(db, "users", otherUserId));

            const unreadCount = data.unreadCounts?.[currentUserId] || 0;

            return {
              id: chatId,
              lastMessage: data.lastMessage || "",
              lastMessageTime: data.lastMessageTime?.toDate() || null,
              lastMessageSenderId: data.lastMessageSenderId || null,
              unreadCount: unreadCount,
              user: otherUserSnap.exists()
                ? {
                    id: otherUserId,
                    ...otherUserSnap.data(),
                    online: otherUserSnap.data()?.online || false,
                    lastSeen: otherUserSnap.data()?.lastSeen?.toDate() || null,
                  }
                : null,
            };
          })
        );

        // ✅ Show all chats (even blocked users)
        const visibleChats = chatData.filter((chat) => chat.user);
        setChats(visibleChats);
      });

      return unsubscribe;
    };

    fetchChats();
  }, [currentUserId]);

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const renderItem = ({ item }) => {
    const isBlocked = blockedList.includes(item.user.id);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate("ChatRoom", {
            chatId: item.id,
            otherUser: item.user,
          })
        }
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: item.user?.photos?.[0] || "https://via.placeholder.com/100",
            }}
            style={styles.avatar}
          />
          {item.user?.settings?.showOnline && item.user?.online && (
            <View style={styles.onlineDot} />
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text
              style={[
                styles.nameText,
                item.unreadCount > 0 && styles.unreadNameText,
              ]}
            >
              {item.user.firstName}
            </Text>
            {item.lastMessageTime && (
              <Text style={styles.timeText}>
                {formatTime(item.lastMessageTime)}
              </Text>
            )}
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.messageText,
                item.unreadCount > 0 && styles.unreadMessageText,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || "Say hi 👋"}
            </Text>
            {item.unreadCount > 0 && <View style={styles.unreadDot} />}
          </View>

          {/* ✅ Show a muted label for blocked users */}
          {isBlocked && (
            <Text style={styles.blockedText}>You blocked this user</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6C5CE7", "#74b9ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          testID="home-icon"
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pencil Meets Case</Text>
      </LinearGradient>

      <FlatList
        data={chats.sort((a, b) => {
          if (!a.lastMessageTime && !b.lastMessageTime) return 0;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime - a.lastMessageTime;
        })}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 10 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No chats yet. Go match someone!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  homeButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    paddingLeft: 20,
  },
  chatItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 15,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ff3838",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  unreadNameText: {
    fontWeight: "bold",
    color: "#000",
  },
  timeText: {
    fontSize: 12,
    color: "#999",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messageText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  unreadMessageText: {
    color: "#333",
    fontWeight: "500",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6C5CE7",
    marginLeft: 5,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#777",
    fontSize: 16,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4cd137",
    borderWidth: 2,
    borderColor: "#fff",
  },
  blockedText: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
  },
});


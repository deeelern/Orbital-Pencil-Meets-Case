// /screens/ChatScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image
} from 'react-native';
import { auth, db } from '../FirebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatScreen() {
  const [chats, setChats] = useState([]);
  const navigation = useNavigation();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (currentUserId) fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const q = query(
        collection(db, 'chats'),
        where('members', 'array-contains', currentUserId)
      );
      const chatSnapshot = await getDocs(q);

      const chatData = await Promise.all(chatSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const chatId = docSnap.id;
        const otherUserId = data.members.find(id => id !== currentUserId);
        const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));

        return {
          id: chatId,
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime?.toDate() || null,
          user: otherUserSnap.exists() ? { id: otherUserId, ...otherUserSnap.data() } : null,
        };
      }));

      setChats(chatData.filter(chat => chat.user));
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, otherUser: item.user })}
    >
      <Image
        source={{ uri: item.user?.photos?.[0] || 'https://via.placeholder.com/100' }}
        style={styles.avatar}
      />
      <View style={styles.chatInfo}>
        <Text style={styles.nameText}>{item.user.firstName}</Text>
        <Text style={styles.messageText} numberOfLines={1}>
          {item.lastMessage || 'Say hi 👋'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6C5CE7', '#74b9ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pencil Meets Case</Text>
      </LinearGradient>

      {/* Chat List */}
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
  backgroundColor: 'rgba(0,0,0,0.6)',
  paddingTop: 50,
  paddingBottom: 20,
  paddingHorizontal: 20,
  flexDirection: 'row',
  alignItems: 'center'
  },
  backButton: {
    marginRight: 10,
  },
  backIcon: {
    fontSize: 22,
    color: '#fff'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    paddingLeft: 20,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    alignItems: 'center'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15
  },
  chatInfo: {
    flex: 1
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#777',
    fontSize: 16
  }
});

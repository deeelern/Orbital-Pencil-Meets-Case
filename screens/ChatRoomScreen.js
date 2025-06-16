import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { db, auth } from '../FirebaseConfig';
import {
  collection, doc, addDoc, query, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateDoc } from 'firebase/firestore';


export default function ChatRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, otherUser } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const flatListRef = useRef(null);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const msgRef = collection(db, 'chats', chatId, 'messages');
    const q = query(msgRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (text.trim() === '') return;

    try {
      const msgRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(msgRef, {
        senderId: currentUserId,
        text: text.trim(),
        timestamp: serverTimestamp()
      });

      // Update chat metadata
    await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: text.trim(),
    lastMessageTime: serverTimestamp()
    });

      setText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUserId;
    return (
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
        <Text style={styles.bubbleText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
        <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
            <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            style={styles.input}
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
  backgroundColor: '#f9f9f9',
},
container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    backgroundColor: '#6C5CE7',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: { marginRight: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 15,
    maxWidth: '70%'
  },
  myBubble: {
    backgroundColor: '#6C5CE7',
    alignSelf: 'flex-end'
  },
  theirBubble: {
    backgroundColor: '#dfe6e9',
    alignSelf: 'flex-start'
  },
  bubbleText: {
    color: '#fff',
    fontSize: 16
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc'
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10
  },
  sendButton: {
    backgroundColor: '#6C5CE7',
    padding: 10,
    borderRadius: 20
  }
});

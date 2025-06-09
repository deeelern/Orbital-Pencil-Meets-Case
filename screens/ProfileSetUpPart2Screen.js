// ./screens/ProfileSetUpPart2Screen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import { auth, db } from '../FirebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PROMPTS = [
  'A book everyone should read:',
  'Favorite weird food combo:',
  'I appreciate when my date…',
  'What show do you never get tired of?',
  'What terrifies you?',
  'Hands down, the best first date:',
  'Before we go on a date, you should know…',
  'What never fails to make you laugh?',
  'How do you know you’re in love?',
  'What’s the most important traits in a partner?'
];

export default function ProfileSetUpPart2Screen({ navigation, route }) {
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const incoming = route?.params?.prompts || [];
    const map = {};
    incoming.forEach(item => {
      map[item.prompt] = item.answer;
    });
    setAnswers(map);
  }, [route?.params?.prompts]);

  const handleSelectPrompt = (prompt) => {
    const updated = { ...answers };
    if (updated.hasOwnProperty(prompt)) {
      delete updated[prompt]; // Collapse box
    } else {
      updated[prompt] = '';   // Expand box
    }
    setAnswers(updated);
  };

  const handleChangeAnswer = (prompt, text) => {
    setAnswers({ ...answers, [prompt]: text });
  };

  const handleNext = async () => {
    const isEditing = route?.params?.fromEditProfile === true;
    const filled = Object.entries(answers)
      .filter(([_, ans]) => ans.trim().length > 0)
      .map(([prompt, ans]) => ({ prompt, answer: ans.trim() }));

    if (filled.length < 1)
      return Alert.alert('Answer at least one prompt', 'Please respond to at least one question to continue.');
    if (filled.length > 5)
      return Alert.alert('Too many answers', 'You can answer up to 5 prompts only.');

    if (isEditing && auth.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      const payload = {
        ...route.params.profile,
        prompts: filled,
        profileUpdatedAt: serverTimestamp(),
        promptsUpdatedAt: serverTimestamp()
      };

      try {
        await setDoc(doc(db, 'users', uid), payload, { merge: true });
        return navigation.replace('Me');
      } catch (err) {
        return Alert.alert('Failed to update profile', err.message);
      }
    }

    navigation.navigate('PhotoUpload', {
      ...route.params,
      prompts: filled
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6C5CE7', '#74b9ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tell Us About Yourself</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Pick up to 5 prompts and share your answers</Text>

        {PROMPTS.map(prompt => {
          const isOpen = answers.hasOwnProperty(prompt);
          return (
            <View key={prompt} style={styles.promptBlock}>
              <TouchableOpacity
                style={[styles.promptButton, isOpen && styles.promptButtonSelected]}
                onPress={() => handleSelectPrompt(prompt)}
              >
                <Ionicons name="chatbox-ellipses-outline" size={20} color={isOpen ? '#6C5CE7' : '#74b9ff'} />
                <Text style={[styles.promptText, isOpen && styles.promptTextSelected]}>
                  {prompt}
                </Text>
              </TouchableOpacity>

              {isOpen && (
                <TextInput
                  style={styles.input}
                  placeholder="Type your answer here…"
                  value={answers[prompt]}
                  onChangeText={text => handleChangeAnswer(prompt, text)}
                  multiline
                  placeholderTextColor="#a0a5aa"
                />
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.modernSubmitBtn} onPress={handleNext}>
          <LinearGradient
            colors={['#6C5CE7', '#74b9ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Text style={styles.modernSubmitText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: -40,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  heading: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2f3640',
    textAlign: 'center',
    marginBottom: 20,
  },
  promptBlock: {
    marginBottom: 20,
  },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  promptButtonSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#f3f2ff',
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: '#2f3640',
    fontWeight: '500',
  },
  promptTextSelected: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
  input: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2f3640',
    fontWeight: '500',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  modernSubmitBtn: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 25,
  },
  modernSubmitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
});

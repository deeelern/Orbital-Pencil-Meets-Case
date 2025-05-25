// ./screens/ProfileSetUpPart2Screen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert
} from 'react-native';
import { auth, db } from '../FirebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  const user = auth.currentUser;
  const uid = user?.uid;

  // Load existing prompt answers if provided
  const [answers, setAnswers] = useState(() => {
    const incoming = route?.params?.prompts || [];
    const map = {};
    incoming.forEach(item => { map[item.prompt] = item.answer; });
    return map;
  });

  const handleSelectPrompt = (prompt) => {
    if (answers.hasOwnProperty(prompt)) return;
    setAnswers({ ...answers, [prompt]: '' });
  };

  const handleChangeAnswer = (prompt, text) => {
    setAnswers({ ...answers, [prompt]: text });
  };

  const handleNext = async () => {
    const filled = Object.entries(answers)
      .filter(([_, ans]) => ans.trim().length > 0)
      .map(([prompt, ans]) => ({ prompt, answer: ans.trim() }));

    if (filled.length < 1) {
      return Alert.alert('Answer at least one prompt', 'Please respond to at least one question to continue.');
    }

    if (filled.length > 5) {
      return Alert.alert('Too many answers', 'You can answer up to 5 prompts only.');
    }

    if (!uid) {
      return Alert.alert('Not signed in', 'Could not find your user account.');
    }

    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          prompts: filled,
          promptsUpdatedAt: serverTimestamp()
        },
        { merge: true }
      );
      if (route?.params?.fromEditProfile) {
        navigation.replace('Me');
      } else {
        navigation.replace('PhotoUpload');
      }
    } catch (err) {
      Alert.alert('Error saving prompts', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>
        Let’s get personal: pick up to 5 prompts to tell people about you
      </Text>

      {PROMPTS.map(prompt => {
        const isOpen = answers.hasOwnProperty(prompt);
        return (
          <View key={prompt} style={styles.promptBlock}>
            <TouchableOpacity
              style={[styles.promptButton, isOpen && styles.promptButtonSelected]}
              onPress={() => handleSelectPrompt(prompt)}
            >
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
              />
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center'
  },
  promptBlock: {
    marginBottom: 16
  },
  promptButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    backgroundColor: '#FFF'
  },
  promptButtonSelected: {
    borderColor: '#0066FF',
    backgroundColor: '#E6F0FF'
  },
  promptText: {
    fontSize: 16,
    color: '#333'
  },
  promptTextSelected: {
    color: '#0066FF'
  },
  input: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#FFF'
  },
  nextButton: {
    marginTop: 24,
    backgroundColor: '#0066FF',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  nextText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

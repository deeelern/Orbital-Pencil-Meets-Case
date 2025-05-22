// ./screens/SignUpScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { auth, db } from '../FirebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    if (!email || !password) {
      return Alert.alert('All fields are required');
    }
    try {
      // 1) Create the Auth user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const uid = userCred.user.uid;

      // 2) Write basic profile to Firestore
      await setDoc(doc(db, 'users', uid), {
        email: email.trim(),
        createdAt: serverTimestamp()
      });

      // 3) Go to Home (replace so you can’t go back)
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Sign Up Failed', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create Account</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={handleSignUp}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.linkText}>
          Already have an account? Log In
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center'
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    fontSize: 16
  },
  button: {
    backgroundColor: '#000',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  linkContainer: {
    alignItems: 'center'
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14
  }
});

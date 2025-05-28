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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isValidPassword = (pwd) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;
    return regex.test(pwd);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      return Alert.alert('All fields are required');
    }
    if (!isValidPassword(password)) {
      return Alert.alert(
        'Invalid Password',
        'Password must be at least 6 characters and include uppercase, lowercase, number, and special character.'
      );
    }

    navigation.navigate('ProfileSetup', {
      email: email.trim(),
      password: password
    });
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

      <Text style={styles.passwordNote}>
        Password must be at least 6 characters and include:
        uppercase, lowercase, a number, and a special character.
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          !(email && password && isValidPassword(password)) && styles.buttonDisabled
        ]}
        activeOpacity={0.8}
        onPress={handleSignUp}
        disabled={!(email && password && isValidPassword(password))}
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
  passwordNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  button: {
    backgroundColor: '#000',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16
  },
  buttonDisabled: {
    backgroundColor: '#aaa'
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

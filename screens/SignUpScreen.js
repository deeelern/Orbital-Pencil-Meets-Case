import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function SignUpScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>📋 Sign Up</Text>
      <Text>This is just a placeholder for now.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});

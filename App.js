import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Animated } from 'react-native';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Fade in the logo
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Set a timeout to transition to the login screen
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Image 
            source={require('./assets/logo.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoginScreen onLogin={() => console.log('Login button pressed')} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});

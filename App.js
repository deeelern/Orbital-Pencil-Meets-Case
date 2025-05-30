// App.js
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Animated, Alert } from 'react-native';

import { NavigationContainer }             from '@react-navigation/native';
import { createNativeStackNavigator }      from '@react-navigation/native-stack';

import { auth }                            from "./FirebaseConfig";
import { signInWithEmailAndPassword }      from 'firebase/auth';

import LoginScreen             from './screens/LoginScreen';
import HomeScreen              from './screens/HomeScreen';
import SignUpScreen            from './screens/SignUpScreen';
import ProfileSetupScreen      from './screens/ProfileSetUpScreen';
import ProfileSetUpPart2Screen from './screens/ProfileSetUpPart2Screen';
import PhotoUploadScreen       from './screens/PhotoUploadScreen';
import MyPreferencesScreen     from './screens/MyPreferencesScreen';
import ChatScreen              from './screens/ChatScreen';
import MapScreen               from './screens/MapScreen';
import MeScreen                from './screens/MeScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true
    }).start();

    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (email, password, navigation) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Login failed', err.message);
    }
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {props => (
            <LoginScreen
              onLogin={(e, p) => handleLogin(e, p, props.navigation)}
              navigation={props.navigation}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="ProfileSetUpPart2" component={ProfileSetUpPart2Screen} />
        <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
        <Stack.Screen name="MyPreferences" component={MyPreferencesScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Meet" component={MapScreen} />
        <Stack.Screen name="Me" component={MeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: {
    width: 200,
    height: 200
  },
});


import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { updateUserLocation } from '../locationUtils';

export default function HomeScreen({ navigation }) {
  const [locationSharing, setLocationSharing] = useState(true);

  // Fetch user's locationSharing setting from Firestore
  const fetchLocationSetting = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      setLocationSharing(userData.settings?.locationSharing ?? true);
    }
  };

  // Load locationSharing preference on mount
  useEffect(() => {
    fetchLocationSetting();
  }, []);

  // Update location if sharing is enabled
  useEffect(() => {
    if (locationSharing) {
      updateUserLocation();
    }
  }, [locationSharing]);

  const handleSettings = () => navigation.navigate('Settings', { from: 'Home' });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6C5CE7', '#74b9ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} disabled>
          <Ionicons name="home-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home</Text>
        <TouchableOpacity onPress={handleSettings} style={styles.backButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.greeting}>Welcome Back!</Text>
        <Text style={styles.subText}>This is the app’s main screen!</Text>
      </View>

      <View style={styles.bottomPanel}>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('Chat')}>
          <Ionicons name="chatbubble-outline" size={22} color="#6C5CE7" />
          <Text style={styles.tabText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('Meet')}>
          <Ionicons name="heart-outline" size={22} color="#6C5CE7" />
          <Text style={styles.tabText}>Meet!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate('Me')}>
          <Ionicons name="person-outline" size={22} color="#6C5CE7" />
          <Text style={styles.tabText}>Me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 5
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: -40
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2f3640',
    marginBottom: 8
  },
  subText: {
    fontSize: 15,
    color: '#636e72'
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabText: {
    marginTop: 4,
    fontSize: 13,
    color: '#2f3640',
    fontWeight: '500'
  }
});

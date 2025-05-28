import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../FirebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen({ navigation, route }) {
  const [userProfile, setUserProfile] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const from = route?.params?.from || 'Home';

  const handleGoBack = () => {
    navigation.navigate(from === 'Me' ? 'Me' : 'Home');
  };

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    if (!user?.uid) return setLoading(false);

    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
        setNotifications(data.settings?.notifications ?? true);
        setShowOnline(data.settings?.showOnline ?? true);
        setPrivateMode(data.settings?.privateMode ?? false);
      }
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserSettings = async (newSettings) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        settings: {
          notifications,
          showOnline,
          privateMode,
          ...newSettings,
          updatedAt: serverTimestamp()
        }
      });
    } catch {
      Alert.alert('Error', 'Failed to update settings.');
    }
  };

  const handleNotificationToggle = (val) => {
    setNotifications(val);
    updateUserSettings({ notifications: val });
  };

  const handleOnlineToggle = (val) => {
    setShowOnline(val);
    updateUserSettings({ showOnline: val });
  };

  const handlePrivateModeToggle = (val) => {
    setPrivateMode(val);
    updateUserSettings({ privateMode: val });
  };

  const settingsSections = [
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          title: 'Push Notifications',
          subtitle: 'Get alerts for matches and chats',
          type: 'toggle',
          value: notifications,
          onToggle: handleNotificationToggle
        },
        {
          icon: 'eye-outline',
          title: 'Show Online Status',
          subtitle: 'Let others see your activity',
          type: 'toggle',
          value: showOnline,
          onToggle: handleOnlineToggle
        },
        {
          icon: 'lock-closed-outline',
          title: 'Private Mode',
          subtitle: 'Only visible to users you liked',
          type: 'toggle',
          value: privateMode,
          onToggle: handlePrivateModeToggle
        }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          title: 'Edit Profile',
          subtitle: 'Update your info and photos',
          type: 'navigation',
          onPress: () => navigation.navigate('ProfileSetup', {
            ...userProfile,
            prompts: userProfile?.prompts || [],
            editingMode: true,
            fromMeScreen: true,
            fromEditProfile: true
          })
        },
        {
          icon: 'options-outline',
          title: 'Dating Preferences',
          subtitle: 'Who you want to meet',
          type: 'navigation',
          onPress: () => navigation.navigate('MyPreferences', {
            fromMeScreen: true,
            fromEditProfile: true,
            prompts: userProfile?.prompts || []
          })
        },
        {
          icon: 'log-out-outline',
          title: 'Sign Out',
          subtitle: 'Log out of your account',
          type: 'action',
          onPress: () => {
            Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await auth.signOut();
                    navigation.replace('Login');
                  } catch {
                    Alert.alert('Error', 'Sign out failed.');
                  }
                }
              }
            ]);
          }
        }
      ]
    },
    {
      title: 'Danger Zone',
      items: [
        {
          icon: 'trash-outline',
          title: 'Delete Account',
          subtitle: 'All data will be permanently erased',
          type: 'danger',
          onPress: () => {
            Alert.alert('Delete Account', 'This action is irreversible.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteDoc(doc(db, 'users', user.uid));
                    await user.delete();
                    Alert.alert('Deleted', 'Account permanently removed.');
                    navigation.replace('Login');
                  } catch {
                    Alert.alert('Error', 'Failed to delete account.');
                  }
                }
              }
            ]);
          }
        }
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6C5CE7', '#74b9ff']} style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {userProfile && (
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userProfile.firstName} {userProfile.lastName}</Text>
            <Text style={styles.profileEmail}>{userProfile.email}</Text>
          </View>
        )}

        {settingsSections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, j) => (
              <TouchableOpacity
                key={j}
                style={[styles.settingItem, item.type === 'danger' && styles.dangerItem]}
                onPress={item.onPress}
                disabled={item.type === 'toggle'}
              >
                <View style={styles.left}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.type === 'danger' ? '#FF3B30' : '#6C5CE7'}
                  />
                  <View style={styles.settingText}>
                    <Text style={[styles.title, item.type === 'danger' && styles.dangerText]}>
                      {item.title}
                    </Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                {item.type === 'toggle' && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#ccc', true: '#6C5CE7' }}
                    thumbColor="#fff"
                  />
                )}
                {(item.type === 'navigation' || item.type === 'action') && (
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.version}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: -40
  },
  content: {
    padding: 20,
    paddingBottom: 100
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 24
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2f3640'
  },
  profileEmail: {
    fontSize: 14,
    color: '#636e72'
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2f3640',
    marginBottom: 12
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e1e8ed',
    marginBottom: 10,
    justifyContent: 'space-between'
  },
  dangerItem: {
    backgroundColor: '#fff5f5',
    borderColor: '#f3c4c4'
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingText: {
    marginLeft: 12,
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2f3640'
  },
  dangerText: {
    color: '#FF3B30'
  },
  subtitle: {
    fontSize: 13,
    color: '#636e72',
    marginTop: 2
  },
  version: {
    alignItems: 'center',
    marginTop: 30
  },
  versionText: {
    fontSize: 12,
    color: '#aaa'
  }
});
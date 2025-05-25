// ./screens/MeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../FirebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import firebase from 'firebase/compat/app';
import { UPLOAD_PRESET } from '../CloudinaryConfig';

const { width } = Dimensions.get('window');
const PHOTO_WIDTH = (width - 40) / 3;

export default function MeScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [editPhotos, setEditPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
      } else {
        Alert.alert('Profile not found', 'Please complete your profile setup.');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    let birthDate = dob.toDate ? dob.toDate() : new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleEditProfile = () => {
    if (!userProfile) return;
    navigation.navigate('ProfileSetup', {
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      heightCm: userProfile.heightCm,
      jobTitle: userProfile.jobTitle,
      school: userProfile.school,
      degree: userProfile.degree,
      religion: userProfile.religion,
      ethnicity: userProfile.ethnicity,
      datePref: userProfile.datePref,
      dateOfBirth: userProfile.dateOfBirth,
      gender: userProfile.gender,
      prompts: userProfile.prompts,
      fromEditProfile: true
    });
  };

  const handleEditPictures = () => {
    navigation.navigate('PhotoUpload', {
      existingPhotos: userProfile.photos || []
    });
  };

  const handleBack = () => navigation.goBack();
  const handleSettings = () => Alert.alert('Settings', 'Settings screen coming soon!');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSettings} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Profile not found</Text>
          <TouchableOpacity style={styles.setupButton} onPress={handleEditProfile}>
            <Text style={styles.setupButtonText}>Complete Profile Setup</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(userProfile.dateOfBirth);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSettings} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {userProfile.photos && (
          <View style={styles.photosSection}>
            <View style={styles.photosGrid}>
              {userProfile.photos.slice(0, 6).map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photo} />
              ))}
            </View>
            <TouchableOpacity onPress={handleEditPictures} style={styles.editProfileButton}>
              <Ionicons name="camera-outline" size={16} color="#0066FF" />
              <Text style={styles.editProfileButtonText}>Edit Pictures</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.name}>{userProfile.firstName} {userProfile.lastName}</Text>
          {age && <Text style={styles.age}>{age} years old</Text>}
          <TouchableOpacity onPress={handleEditProfile} style={styles.editProfileButton}>
            <Ionicons name="pencil-outline" size={16} color="#0066FF" />
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsGrid}>
          {userProfile.heightCm && (
            <View style={styles.detailItem}>
              <Ionicons name="resize-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{userProfile.heightCm} cm</Text>
            </View>
          )}
          {userProfile.jobTitle && (
            <View style={styles.detailItem}>
              <Ionicons name="briefcase-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{userProfile.jobTitle}</Text>
            </View>
          )}
          {userProfile.religion && (
            <View style={styles.detailItem}>
              <Ionicons name="star-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{userProfile.religion}</Text>
            </View>
          )}
        </View>

        {userProfile.prompts && userProfile.prompts.length > 0 && (
          <View style={styles.promptsSection}>
            <Text style={styles.sectionTitle}>About Me</Text>
            {userProfile.prompts.map((item, index) => (
              <View key={index} style={styles.promptCard}>
                <Text style={styles.promptQuestion}>{item.prompt}</Text>
                <Text style={styles.promptAnswer}>{item.answer}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>Looking For</Text>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceText}>
              Interested in: {userProfile.datePref || 'Not specified'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20
  },
  setupButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  scrollView: { flex: 1 },
  photosSection: { padding: 20 },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  photo: {
    width: PHOTO_WIDTH,
    height: PHOTO_WIDTH * 1.33,
    borderRadius: 12,
    marginBottom: 8
  },
  infoSection: { padding: 20 },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333'
  },
  age: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0066FF',
    alignSelf: 'flex-start',
    marginTop: 10
  },
  editProfileButtonText: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666'
  },
  promptsSection: { paddingHorizontal: 20, paddingBottom: 20 },
  promptCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  promptQuestion: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '600',
    marginBottom: 8
  },
  promptAnswer: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22
  },
  preferencesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  preferenceItem: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF'
  },
  preferenceText: {
    fontSize: 14,
    color: '#333'
  },
  bottomPadding: { height: 20 }
});

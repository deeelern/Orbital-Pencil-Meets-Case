// ./screens/PhotoUploadScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Dimensions,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../FirebaseConfig';
import firebase from 'firebase/compat/app';
import { UPLOAD_PRESET } from '../CloudinaryConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3;

export default function PhotoUploadScreen({ navigation, route }) {
  const user = auth.currentUser;
  const uid = user?.uid;

  const routePhotos = route?.params?.existingPhotos || [];
  const [photos, setPhotos] = useState(() => {
    const normalized = routePhotos.map((p, index) =>
      typeof p === 'string'
        ? { key: `existing-${index}-${Date.now()}`, uri: p }
        : { ...p, key: `existing-${index}-${Date.now()}` }
    );
    while (normalized.length < 6) {
      const emptyIndex = normalized.length;
      normalized.push({
        key: `empty-${emptyIndex}-${Date.now()}-${Math.random()}`,
        uri: null
      });
    }
    return normalized;
  });

  const [uploading, setUploading] = useState(false);

  const choosePhotoSource = (index) => {
    Alert.alert('Select Photo', 'Choose how to add your photo', [
      {
        text: 'Take Photo',
        onPress: () => takePhoto(index)
      },
      {
        text: 'Choose from Gallery',
        onPress: () => pickFromLibrary(index)
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const takePhoto = async (index) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Camera access is required.');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setPhotos(prev => {
        const updated = [...prev];
        updated[index] = { key: `photo-${index}-${Date.now()}`, uri };
        return updated;
      });
    }
  };

  const pickFromLibrary = async (index) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      return Alert.alert('Permission needed', 'Allow photo access to upload.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setPhotos(prev => {
        const updated = [...prev];
        updated[index] = { key: `photo-${index}-${Date.now()}`, uri };
        return updated;
      });
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => {
      const updated = [...prev];
      updated[index] = {
        key: `empty-${index}-${Date.now()}`,
        uri: null
      };
      return updated;
    });
  };

  const uploadPhotosToCloudinary = async () => {
    const validPhotos = photos.filter(p => p.uri);

    const uploadPromises = validPhotos.map((photo, i) => {
      if (photo.uri.startsWith('http')) return Promise.resolve(photo.uri);

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `photo_${Date.now()}_${i}.jpg`,
      });
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', `profile_photos/${uid}`);

      return fetch(`https://api.cloudinary.com/v1_1/dfqcdjkga/image/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => {
        if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
        return res.json();
      }).then(data => data.secure_url);
    });

    return Promise.all(uploadPromises);
  };

  const handleNext = async () => {
    const isEditing = route?.params?.fromEditProfile === true;
    const validPhotos = photos.filter(p => p.uri);
    if (validPhotos.length < 3) {
      return Alert.alert('Add more photos', 'Upload at least 3 photos.');
    }

    setUploading(true);
    try {
      const urls = await uploadPhotosToCloudinary();

      if (isEditing && uid) {
        await db.collection('users').doc(uid).set(
          {
            photos: urls,
            photosUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
        navigation.goBack();
      } else {
        navigation.navigate('MyPreferences', {
          ...route.params,
          photos: urls,
          fromEditProfile: false
        });
      }
    } catch (e) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setUploading(false);
    }
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
        <Text style={styles.headerTitle}>Upload Photos</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Tap + to add, or × to remove. Upload at least 3.</Text>

        <View style={styles.photoGrid}>
          {photos.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.9}
              style={styles.photoSlot}
              onPress={() => !item.uri && choosePhotoSource(index)}
            >
              {item.uri ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: item.uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.plusIcon}>+</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.modernSubmitBtn, (photos.filter(p => p.uri).length < 3 || uploading) && { opacity: 0.5 }]}
          onPress={handleNext}
          disabled={photos.filter(p => p.uri).length < 3 || uploading}
        >
          <LinearGradient
            colors={['#6C5CE7', '#74b9ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Text style={styles.modernSubmitText}>{uploading ? 'Uploading...' : 'Save Photos'}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
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
  headerSpacer: { width: 40 },
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  photoSlot: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.33,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptySlot: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  plusIcon: {
    fontSize: 32,
    color: '#999',
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

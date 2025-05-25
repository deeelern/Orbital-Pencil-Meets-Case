import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../FirebaseConfig';
import firebase from 'firebase/compat/app';
import { UPLOAD_PRESET } from '../CloudinaryConfig';
import { Ionicons } from '@expo/vector-icons';

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
      {
        text: 'Cancel',
        style: 'cancel'
      }
    ]);
  };

  const takePhoto = async (index) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Camera access is required to take a photo.');
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
        updated[index] = {
          key: `photo-${index}-${Date.now()}`,
          uri
        };
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
        updated[index] = {
          key: `photo-${index}-${Date.now()}`,
          uri
        };
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
    const uploadedUrls = [];
    const validPhotos = photos.filter(p => p.uri);

    for (let i = 0; i < validPhotos.length; i++) {
      const photo = validPhotos[i];
      if (photo.uri.startsWith('http')) {
        uploadedUrls.push(photo.uri);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}_${i}.jpg`,
        });
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', `profile_photos/${uid}`);

        const res = await fetch(`https://api.cloudinary.com/v1_1/dfqcdjkga/image/upload`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (!res.ok) throw new Error(`Failed upload: ${res.status}`);
        const data = await res.json();
        uploadedUrls.push(data.secure_url);
      } catch (e) {
        console.error('Upload error:', e);
        throw new Error(`Upload failed for photo ${i + 1}`);
      }
    }

    return uploadedUrls;
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
      // User is editing profile, update photos in Firestore only
      await db.collection('users').doc(uid).set(
        {
          photos: urls,
          photosUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true } // prevents overwriting other fields
      );
      navigation.goBack(); // return to MeScreen
    } else {
      // Part of sign-up flow — pass photos forward
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

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.heading}>Upload your photos</Text>
      <Text style={styles.subheading}>
        Tap + to add, or × to remove. Upload at least 3.
      </Text>

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

      <TouchableOpacity
        style={[
          styles.nextButton,
          (photos.filter(p => p.uri).length < 3 || uploading) && styles.nextButtonDisabled
        ]}
        onPress={handleNext}
        disabled={photos.filter(p => p.uri).length < 3 || uploading}
      >
        <Text style={styles.nextText}>{uploading ? 'Uploading...' : 'Save Photos'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subheading: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  backButton: {
  position: 'absolute',
  top: 30,
  left: 15,
  zIndex: 10,
  padding: 8
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
    overflow: 'hidden'
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative'
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12
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
    alignItems: 'center'
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  emptySlot: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    borderRadius: 12
  },
  plusIcon: {
    fontSize: 32,
    color: '#999'
  },
  nextButton: {
    backgroundColor: '#0066FF',
    marginTop: 30,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  nextButtonDisabled: {
    backgroundColor: '#CCC'
  },
  nextText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

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
import DraggableFlatList from 'react-native-draggable-flatlist';
import { auth, db } from '../FirebaseConfig';
import firebase from 'firebase/compat/app';
import { UPLOAD_PRESET } from '../CloudinaryConfig';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3;

export default function PhotoUploadScreen({ navigation, route }) {
  const user = auth.currentUser;
  const uid = user?.uid;

  const routePhotos = route?.params?.existingPhotos || [];
  const [photos, setPhotos] = useState(() => {
    const normalized = routePhotos.map(p => typeof p === 'string' ? { key: p, uri: p } : { ...p, key: p.uri });
    while (normalized.length < 6) normalized.push({ key: `empty-${Date.now() + Math.random()}`, uri: null });
    return normalized;
  });

  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert('Permissions needed', 'We need camera and photo library permissions to upload photos.');
      return false;
    }
    return true;
  };

  const pickFromLibrary = async (index) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled) {
        const newPhotos = [...photos];
        newPhotos[index] = {
          key: result.assets[0].uri,
          uri: result.assets[0].uri
        };
        setPhotos(newPhotos);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos[index] = { key: `empty-${Date.now() + Math.random()}`, uri: null };
    setPhotos(newPhotos);
  };

  const uploadPhotosToCloudinary = async () => {
    const uploadedUrls = [];
    const validPhotos = photos.filter(photo => photo.uri);

    for (let i = 0; i < validPhotos.length; i++) {
      const photo = validPhotos[i];
      if (photo.uri.startsWith('http')) {
        // Already uploaded
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

        const response = await fetch(`https://api.cloudinary.com/v1_1/dfqcdjkga/image/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (!response.ok) throw new Error(`Upload failed with status: ${response.status}`);
        const result = await response.json();
        uploadedUrls.push(result.secure_url);
      } catch (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload photo ${i + 1}`);
      }
    }

    return uploadedUrls;
  };

  const handleNext = async () => {
    const validPhotos = photos.filter(photo => photo.uri);
    if (validPhotos.length < 3) {
      return Alert.alert('Add more photos', 'Please upload at least 3 photos to continue.');
    }
    if (!uid) {
      return Alert.alert('Error', 'User not found');
    }

    setUploading(true);
    try {
      const photoUrls = await uploadPhotosToCloudinary();
      await db.collection('users').doc(uid).set(
        {
          photos: photoUrls,
          photosUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          profileCompleted: true
        },
        { merge: true }
      );
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item, index, drag }) => (
    <TouchableOpacity
      onLongPress={drag}
      style={[
        styles.photoSlot,
        index < 3 ? styles.photoSlotTopRow : styles.photoSlotBottomRow
      ]}
      activeOpacity={item.uri ? 0.8 : 1}
      onPress={() => !item.uri && pickFromLibrary(index)}
    >
      {item.uri ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: item.uri }} style={styles.photo} />
          <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(index)}>
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptySlot}>
          <Text style={styles.plusIcon}>+</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Reorder or update your photos</Text>
      <Text style={styles.subheading}>Tap + to add, hold to drag and reorder</Text>

      <DraggableFlatList
        data={photos}
        onDragEnd={({ data }) => setPhotos(data)}
        keyExtractor={(item, index) => item.key + index}
        renderItem={renderItem}
        numColumns={3}
        scrollEnabled={false}
        contentContainerStyle={styles.photoGrid}
      />

      <TouchableOpacity
        style={[styles.nextButton, (photos.filter(p => p.uri).length < 3 || uploading) && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={photos.filter(p => p.uri).length < 3 || uploading}
      >
        <Text style={styles.nextText}>{uploading ? 'Uploading...' : 'Save Photos'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingBottom: 40, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center', color: '#333' },
  subheading: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  photoGrid: { alignItems: 'center', justifyContent: 'center' },
  photoSlot: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.33,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden'
  },
  photoSlotTopRow: { marginBottom: 6 },
  photoSlotBottomRow: { marginTop: 6 },
  photoContainer: { flex: 1, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  emptySlot: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  plusIcon: { fontSize: 32, color: '#999', fontWeight: '300' },
  nextButton: {
    backgroundColor: '#0066FF',
    marginTop: 30,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  nextButtonDisabled: { backgroundColor: '#CCC' },
  nextText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});

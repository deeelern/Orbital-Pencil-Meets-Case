import * as Location from 'expo-location';
import { doc, updateDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { auth, db } from './FirebaseConfig';
import firebase from 'firebase/compat/app';

// ✅ Add the same testing toggle here
const TESTING_MODE = true;

export const updateUserLocation = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Skip location updates in testing mode
    if (TESTING_MODE) {
      console.log("🧪 Testing mode: Skipping real location update");
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission not granted');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const geoPoint = new GeoPoint(location.coords.latitude, location.coords.longitude);

    await updateDoc(doc(db, 'users', user.uid), {
      location: geoPoint,
      updatedAt: serverTimestamp()
    });

    console.log("Location updated successfully.");
  } catch (error) {
    console.error("Error updating location:", error);
  }
};
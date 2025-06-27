import * as Location from "expo-location";
import { doc, updateDoc, serverTimestamp, GeoPoint } from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

// Single source of truth for testing mode
export const TESTING_MODE = true;

// Location update interval in milliseconds (5 minutes = 300,000 ms)
const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000;

export const NUS_BOUNDARY = {
  minLat: 1.2840,
  maxLat: 1.3100,
  minLng: 103.7620,
  maxLng: 103.7925,
};

// ✅ Test coordinates inside NUS
export const TEST_COORDINATES = {
  latitude: 1.2966,
  longitude: 103.7764,
};

export const isInsideNUS = (latitude, longitude) => {
  return (
    latitude >= NUS_BOUNDARY.minLat &&
    latitude <= NUS_BOUNDARY.maxLat &&
    longitude >= NUS_BOUNDARY.minLng &&
    longitude <= NUS_BOUNDARY.maxLng
  );
};

export const updateUserLocation = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // ✅ Return fake location in testing mode
    if (TESTING_MODE) {
      console.log("🧪 Testing mode: Returning fake NUS location");
      
      // Still update Firebase with fake coordinates
      const geoPoint = new GeoPoint(TEST_COORDINATES.latitude, TEST_COORDINATES.longitude);
      await updateDoc(doc(db, "users", user.uid), {
        location: geoPoint,
        lastLocationUpdate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return TEST_COORDINATES;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Location permission not granted");
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    const latitude = location.coords.latitude;
    const longitude = location.coords.longitude;

    // ✅ Check if user is inside NUS before updating
    if (!isInsideNUS(latitude, longitude)) {
      console.log("❌ Location not updated: User is outside NUS bounds");
      console.log(`Current location: ${latitude}, ${longitude}`);
      return null;
    }

    const geoPoint = new GeoPoint(latitude, longitude);

    await updateDoc(doc(db, "users", user.uid), {
      location: geoPoint,
      lastLocationUpdate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Location updated successfully (inside NUS):", latitude, longitude);
    
    return {
      latitude,
      longitude
    };
  } catch (error) {
    console.error("Error updating location:", error);
    return null;
  }
};

// Location update interval management
let locationUpdateInterval = null;

export const startLocationUpdates = (callback) => {
  // Clear existing interval if any
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
  }

  // Set up new interval
  locationUpdateInterval = setInterval(async () => {
    console.log("📍 Updating location (5-minute interval)");
    const newLocation = await updateUserLocation();
    if (callback && newLocation) {
      callback(newLocation);
    }
  }, LOCATION_UPDATE_INTERVAL);

  console.log("🕐 Location update interval started (every 5 minutes)");
  return locationUpdateInterval;
};

export const stopLocationUpdates = () => {
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;
    console.log("🛑 Location update interval stopped");
  }
};

// Get current location once without updating Firebase
export const getCurrentLocation = async () => {
  try {
    if (TESTING_MODE) {
      console.log("🧪 Testing mode: Using hardcoded NUS location");
      return {
        ...TEST_COORDINATES,
        insideNUS: true,
      };
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Location permission not granted");
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const latitude = location.coords.latitude;
    const longitude = location.coords.longitude;

    // Check if user is inside NUS
    if (!isInsideNUS(latitude, longitude)) {
      console.log("📍 Current location is outside NUS bounds");
      return {
        latitude,
        longitude,
        insideNUS: false
      };
    }

    return {
      latitude,
      longitude,
      insideNUS: true
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
};
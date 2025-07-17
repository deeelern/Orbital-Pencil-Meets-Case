import * as Location from "expo-location";
import { doc, updateDoc, serverTimestamp, GeoPoint } from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

export let TESTING_MODE = false;

/** Flip testing mode on/off in code or via a debug menu */
export function setTestingMode(enabled) {
  TESTING_MODE = enabled;
}

const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000;

export const NUS_BOUNDARY = {
  minLat: 1.284,
  maxLat: 1.31,
  minLng: 103.762,
  maxLng: 103.7925,
};

export const TEST_COORDINATES = {
  latitude: 1.2966,
  longitude: 103.7765,
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

    if (TESTING_MODE) {
      console.log("🧪 Testing mode: Returning fake NUS location");

      const geoPoint = new GeoPoint(
        TEST_COORDINATES.latitude,
        TEST_COORDINATES.longitude
      );
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

    console.log(
      "✅ Location updated successfully (inside NUS):",
      latitude,
      longitude
    );

    return {
      latitude,
      longitude,
    };
  } catch (error) {
    console.error("Error updating location:", error);
    return null;
  }
};

let locationUpdateInterval = null;

export const startLocationUpdates = (callback) => {
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
  }

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

    if (!isInsideNUS(latitude, longitude)) {
      console.log("📍 Current location is outside NUS bounds");
      return {
        latitude,
        longitude,
        insideNUS: false,
      };
    }

    return {
      latitude,
      longitude,
      insideNUS: true,
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
};

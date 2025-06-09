import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db, auth } from '../FirebaseConfig';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import ProfileCardModal from './ProfileCardModal';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const LATITUDE_DELTA = 0.008;
const LONGITUDE_DELTA = LATITUDE_DELTA * (400 / 800);
const NUS_CENTER = { latitude: 1.3000, longitude: 103.7800, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA };

// ✅ Testing toggle — switch to true for hardcoded NUS location testing
const TESTING_MODE = true;

export default function MapScreen() {
  const [region, setRegion] = useState(NUS_CENTER);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [myLikes, setMyLikes] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const navigation = useNavigation();

  // Initialize on component mount
  useEffect(() => {
    initializeMap();
    fetchMyLikes();
  }, []);

  // Use useFocusEffect to refresh data when screen comes into focus (but not on first load)
  useFocusEffect(
    useCallback(() => {
      if (dataFetched) {
        // Only refresh if we've already loaded data once
        refreshData();
      }
    }, [dataFetched])
  );

  useEffect(() => {
    // nearbyUsers state updated
  }, [nearbyUsers, mapReady, dataFetched]);

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      let latitude = NUS_CENTER.latitude;
      let longitude = NUS_CENTER.longitude;

      if (!TESTING_MODE) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Location is needed to access map.");
          setIsLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }

      const newRegion = { 
        latitude, 
        longitude, 
        latitudeDelta: LATITUDE_DELTA, 
        longitudeDelta: LONGITUDE_DELTA 
      };
      
      setRegion(newRegion);
      
      // Fetch users and mark data as fetched
      await fetchNearbyUsers(latitude, longitude);
      setDataFetched(true);
      setIsLoading(false);
      
    } catch (err) {
      console.log("Location error:", err);
      setIsLoading(false);
    }
  };

  const fetchNearbyUsers = async (lat, lon) => {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      let users = [];

      snapshot.forEach(docSnap => {
        const userData = docSnap.data();
        
        // Skip current user
        if (docSnap.id === auth.currentUser?.uid) {
          return;
        }
        
        // Check location exists
        if (!userData.location) {
          return;
        }
        
        // Check location sharing
        if (!userData.settings?.locationSharing) {
          return;
        }
        
        // Check photos
        if (!userData.photos || userData.photos.length === 0) {
          return;
        }

        // Handle different location formats
        let userLat, userLon;
        
        if (userData.location._latitude !== undefined) {
          // GeoPoint format
          userLat = userData.location._latitude;
          userLon = userData.location._longitude;
        } else if (Array.isArray(userData.location)) {
          // Array format [lat, lon]
          userLat = userData.location[0];
          userLon = userData.location[1];
        } else if (userData.location.latitude !== undefined) {
          // Object format {latitude, longitude}
          userLat = userData.location.latitude;
          userLon = userData.location.longitude;
        } else {
          return;
        }

        const distance = getDistance(lat, lon, userLat, userLon);
        const preference = userData.preferences?.distanceKm ?? 50;

        if (distance <= preference) {
          users.push({ id: docSnap.id, ...userData, distance, userLat, userLon });
        }
      });

      // Force state update
      setNearbyUsers([...users]);
      
    } catch (error) {
      console.error("Error fetching nearby users:", error);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchMyLikes = async () => {
    try {
      const myDocRef = doc(db, 'users', auth.currentUser?.uid);
      const myDocSnap = await getDoc(myDocRef);
      if (myDocSnap.exists()) {
        const data = myDocSnap.data();
        setMyLikes(data.likes ?? []);
      }
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const openProfileModal = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Handle map ready event
  const handleMapReady = () => {
    setMapReady(true);
  };

  // Add a refresh function
  const refreshData = async () => {
    await initializeMap();
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Refresh Button */}
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={refreshData}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh" size={24} color="#fff" />
      </TouchableOpacity>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={handleMapReady}
        initialRegion={NUS_CENTER} // Add initial region
      >
        {/* Only render markers when both map is ready and data is fetched */}
        {mapReady && dataFetched && nearbyUsers.map((user, index) => {
          if (!user.userLat || !user.userLon || !user.photos || !user.photos[0]) {
            return null;
          }
          
          return (
            <Marker
              key={`${user.id}-${index}`}
              coordinate={{ latitude: user.userLat, longitude: user.userLon }}
              onPress={() => openProfileModal(user)}
              tracksViewChanges={false}
            >
              <View style={styles.markerContainer}>
                <Image 
                  source={{ uri: user.photos[0] }} 
                  style={styles.markerImage}
                  onError={(error) => console.log("Image load error:", error)}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ❤️ Likes counter */}
      <View style={styles.likesContainer}>
        <Ionicons name="heart" size={26} color="#e74c3c" />
        <Text style={styles.likesText}>{myLikes.length}</Text>
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading nearby users...</Text>
        </View>
      )}

      {/* Profile Modal */}
      <ProfileCardModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        user={selectedUser} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    borderWidth: 2, 
    borderColor: '#fff', 
    overflow: 'hidden',
    backgroundColor: '#f0f0f0' // Fallback background
  },
  markerImage: { width: '100%', height: '100%' },
  likesContainer: { 
    position: 'absolute', 
    top: 60, 
    right: 20, 
    backgroundColor: '#fff', 
    padding: 10, 
    borderRadius: 50, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowRadius: 5,
    elevation: 5 // Android shadow
  },
  likesText: { fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  backButton: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    zIndex: 10, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    borderRadius: 25, 
    padding: 10 
  },
  refreshButton: {
    position: 'absolute',
    top: 50,
    left: 80,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 10
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -12 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center'
  }
});
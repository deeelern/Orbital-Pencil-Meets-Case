import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { db, auth } from "../FirebaseConfig";
import { collection, query, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp, where } from "firebase/firestore";
import ProfileCardModal from "./ProfileCardModal";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { 
  updateUserLocation, 
  startLocationUpdates, 
  stopLocationUpdates, 
  getCurrentLocation, 
  isInsideNUS,
  NUS_BOUNDARY,
  TESTING_MODE,
  TEST_COORDINATES
} from "../utils/locationUtils";
import { fetchUsersWhoLikedMe } from "../utils/likedMe";

const LATITUDE_DELTA = 0.008;
const LONGITUDE_DELTA = LATITUDE_DELTA * (400 / 800);
const NUS_CENTER = {
  latitude: 1.3,
  longitude: 103.78,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

const NUS_BOUNDS = NUS_BOUNDARY;

function MyLikesModal({ visible, onClose }) {
  const [likedUsers, setLikedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadLikedUsers = async () => {
      setLoading(true);
      try {
        const users = await fetchUsersWhoLikedMe();
        setLikedUsers(users);
      } catch (error) {
        console.error("Error fetching users who liked me:", error);
        Alert.alert("Error", "Failed to load users who liked you");
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      loadLikedUsers();
    }
  }, [visible]);

  const renderLikedUser = ({ item }) => (
    <View style={styles.likedUserCard}>
      <View style={styles.blurredImageContainer}>
        <Image
          source={{
            uri: item.photos?.[0] || "https://via.placeholder.com/100",
          }}
          style={styles.blurredImage}
          blurRadius={15}
        />
        <View style={styles.blurOverlay}>
          <Ionicons name="heart" size={24} color="#ff4458" />
        </View>
      </View>
      <Text style={styles.blurredName}>{item.firstName?.[0] || "?"}***</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.likesOverlay}>
        <View style={styles.likesContainer}>
          <View style={styles.likesHeader}>
            <Text style={styles.likesTitle}>People who liked you</Text>
            <TouchableOpacity onPress={onClose} style={styles.likesCloseButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : likedUsers.length === 0 ? (
            <View style={styles.noLikesContainer}>
              <Ionicons name="heart-outline" size={50} color="#ccc" />
              <Text style={styles.noLikesText}>No likes yet</Text>
              <Text style={styles.noLikesSubText}>
                Keep exploring to find matches!
              </Text>
            </View>
          ) : (
            <FlatList
              data={likedUsers}
              renderItem={renderLikedUser}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.likedUsersList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function MapScreen() {
  const [region, setRegion] = useState(NUS_CENTER);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [myGenderPreference, setMyGenderPreference] = useState("Everyone");
  const [myLikes, setMyLikes] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showMyLikes, setShowMyLikes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Getting Location...");
  const navigation = useNavigation();
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    initializeMap();
    const loadLikedMe = async () => {
      const likedUsers = await fetchUsersWhoLikedMe();
      setMyLikes(likedUsers);
    };
    loadLikedMe();
    
    const intervalId = startLocationUpdates((newLocation) => {
      if (isMountedRef.current && newLocation) {
        console.log("📍 Location updated via callback:", newLocation);
        setCurrentLocation(newLocation);
        setLocationStatus("Location Active (NUS)");
        
        const newRegion = {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };
        setRegion(newRegion);
        
        fetchNUSUsers();
      }
    });

    return () => {
      isMountedRef.current = false;
      stopLocationUpdates();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (dataFetched) {
        refreshData();
      }
      
      const intervalId = startLocationUpdates((newLocation) => {
        if (isMountedRef.current && newLocation) {
          setCurrentLocation(newLocation);
          setLocationStatus("Location Active (NUS)");
          
          const newRegion = {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          };
          setRegion(newRegion);
          
          fetchNUSUsers();
        }
      });

      return () => {
        stopLocationUpdates();
      };
    }, [dataFetched])
  );

  useEffect(() => {
  }, [nearbyUsers, mapReady, dataFetched]);

  const fetchNUSUsers = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
      const currentUserData = currentUserDoc.data();

      console.log("=== FETCHING USERS ===");
      console.log("Current user:", currentUserData?.firstName, currentUserData?.gender);

      const usersQuery = query(collection(db, "users"));
      const querySnapshot = await getDocs(usersQuery);

      console.log(`Total users in DB: ${querySnapshot.size}`);

      const users = [];
      let rejectedCount = 0;

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;

        console.log(`\n--- Checking: ${userData.firstName || 'Unknown'} ---`);

        // Skip current user
        if (userId === currentUserId) {
          console.log("❌ Skipped: Current user");
          return;
        }

        let lat, lng;
        
        if (TESTING_MODE) {
          lat = TEST_COORDINATES.latitude;
          lng = TEST_COORDINATES.longitude;
          console.log("🧪 Using test coordinates for user");
        } else {
          if (!userData.location) {
            console.log("❌ Rejected: No location data");
            rejectedCount++;
            return;
          }
          
          lat = userData.location.latitude;
          lng = userData.location.longitude;
          console.log("✅ Has location");
        }

        if (!isInsideNUS(lat, lng)) {
          console.log(`❌ Rejected: Outside NUS bounds (${lat}, ${lng})`);
          rejectedCount++;
          return;
        }
        console.log("✅ Within NUS bounds");

        if (!userData.photos || userData.photos.length === 0) {
          console.log("❌ Rejected: No photos");
          rejectedCount++;
          return;
        }
        console.log("✅ Has photos");

        if (shouldIncludeBasedOnGenderPreference(userData, currentUserData)) {
          console.log("✅ ACCEPTED: Passes all filters");
          users.push({
            id: userId,
            ...userData,
            userLat: lat,
            userLon: lng,
          });
        } else {
          console.log("❌ Rejected: Gender preference mismatch");
          console.log(`  My gender: ${currentUserData?.gender}`);
          console.log(`  My prefs: ${JSON.stringify(currentUserData?.preferences?.gender)}`);
          console.log(`  Their gender: ${userData.gender}`);
          console.log(`  Their prefs: ${JSON.stringify(userData.preferences?.gender)}`);
          rejectedCount++;
        }
      });

      console.log(`\n=== RESULTS ===`);
      console.log(`Accepted: ${users.length}`);
      console.log(`Rejected: ${rejectedCount}`);
      console.log(`Found ${users.length} users within NUS campus`);

      setNearbyUsers(users);

    } catch (error) {
      console.error("Error fetching NUS users:", error);
      Alert.alert("Error", "Failed to load nearby users");
    }
  };

  const fetchMyPreferences = async () => {
    const currentUserDoc = await getDoc(
      doc(db, "users", auth.currentUser?.uid)
    );
    if (currentUserDoc.exists()) {
      const pref = currentUserDoc.data()?.genderPreference;
      if (pref) setMyGenderPreference(pref);
    }
  };

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      
      const location = await getCurrentLocation();
      
      if (!location) {
        Alert.alert("Permission Denied", "Location is needed to access map.");
        setIsLoading(false);
        return;
      }

      setCurrentLocation({ 
        latitude: location.latitude, 
        longitude: location.longitude 
      });

      if (location.insideNUS) {
        setLocationStatus("Location Active (NUS)");
        await updateUserLocation();
      } else {
        setLocationStatus("Outside NUS Campus");
      }

      const newRegion = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };

      setRegion(newRegion);
      await fetchMyPreferences();

      await fetchNUSUsers();
      setDataFetched(true);
      setIsLoading(false);
    } catch (err) {
      console.log("Location error:", err);
      setLocationStatus("Location Error");
      setIsLoading(false);
    }
  };

  const shouldIncludeBasedOnGenderPreference = (userData, currentUser) => {
    const myGender = currentUser?.gender?.toLowerCase();
    const myPref = normalizePreference(currentUser?.preferences?.gender);

    const theirGender = userData.gender?.toLowerCase();
    const theirPref = normalizePreference(userData.preferences?.gender);

    if (!myGender || !theirGender || !myPref || !theirPref) return false;

    const iMatchTheirPref = theirPref.includes(myGender);
    const theyMatchMyPref = myPref.includes(theirGender);

    return iMatchTheirPref && theyMatchMyPref;
  };

  const normalizePreference = (pref) => {
    if (!pref) return [];

    if (Array.isArray(pref)) {
      return pref.map((p) => p.toLowerCase());
    }

    if (typeof pref === "string") {
      const val = pref.toLowerCase();
      if (val === "everyone" || val === "all" || val === "both") {
        return ["male", "female", "other"];
      }
      return [val];
    }
    return [];
  };

  const openProfileModal = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLikesPress = () => {
    setShowMyLikes(true);
  };

  const handleMapReady = () => {
    setMapReady(true);
  };

  const refreshData = async () => {
    await initializeMap();
    const likedUsers = await fetchUsersWhoLikedMe();
    setMyLikes(likedUsers);
  };

  const handleProfileCardClose = async () => {
    setModalVisible(false);
    const likedUsers = await fetchUsersWhoLikedMe();
    setMyLikes(likedUsers);
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
        testID="map-view"
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={handleMapReady}
        initialRegion={NUS_CENTER}
        followsUserLocation={true}
      >
        {/* Only render markers when both map is ready and data is fetched */}
        {mapReady &&
          dataFetched &&
          nearbyUsers.map((user, index) => {
            if (
              !user.userLat ||
              !user.userLon ||
              !user.photos ||
              !user.photos[0]
            ) {
              return null;
            }

            return (
              <Marker
                testID={`marker-${user.uid}`}
                key={`${user.id}-${index}`}
                coordinate={{ latitude: user.userLat, longitude: user.userLon }}
                onPress={() => openProfileModal(user)}
                tracksViewChanges={true}
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

      {/* Likes counter - Now clickable */}
      <TouchableOpacity
        testID="liked-by-counter"
        style={styles.likesCounterContainer}
        onPress={handleLikesPress}
        activeOpacity={0.8}
      >
        <Ionicons name="heart" size={26} color="#e74c3c" />
        <Text style={styles.likesText}>{myLikes.length}</Text>
        {myLikes.length > 0 && (
          <View style={styles.newLikeBadge}>
            <Text style={styles.newLikeBadgeText}>!</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Location Status Indicator */}
      <View 
      testID="location-disabled-message"
      style={styles.locationStatusContainer}
      >
        <Ionicons 
          name="location" 
          size={16} 
          color={
            locationStatus.includes("Active") ? "#4CAF50" : 
            locationStatus.includes("Outside") ? "#FF5722" : 
            "#FFA726"
          } 
        />
        <Text style={styles.locationStatusText}>
          {locationStatus}
        </Text>
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading nearby users...</Text>
        </View>
      )}

      {/* Profile Modal */}
      <ProfileCardModal
        testID="profile-card"
        visible={modalVisible}
        onClose={handleProfileCardClose}
        user={selectedUser}
        showMatchModal={setMatchModalVisible}
        setMatchedUser={setMatchedUser}
      />

      {/* My Likes Modal */}
      <MyLikesModal
        visible={showMyLikes}
        onClose={() => setShowMyLikes(false)}
      />

      <Modal visible={matchModalVisible} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <View style={styles.matchContainer}>
            <Text style={styles.matchTitle}>🎉 It's a Match! 🎉</Text>
            {matchedUser?.photos && matchedUser.photos.length > 0 && (
              <Image
                source={{ uri: matchedUser.photos[0] }}
                style={styles.matchImage}
              />
            )}
            <Text style={styles.matchText}>
              You and {matchedUser?.firstName} liked each other!
            </Text>
              <TouchableOpacity
                onPress={() => {
                  setMatchModalVisible(false);
                  navigation.navigate("Chat", {
                    userId: matchedUser?.id,
                    userName: matchedUser?.firstName,
                  });
                }}
                style={styles.matchCloseBtn}
              >
                <Text style={styles.matchCloseText}>Chat now!</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMatchModalVisible(false)}
                style={[styles.matchCloseBtn, { backgroundColor: "#ccc", marginTop: 10 }]}
              >
                <Text style={[styles.matchCloseText, { color: "#333" }]}>Maybe later</Text>
              </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", 
  },
  markerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,  
    borderWidth: 2,
    borderColor: "#fff",   
    resizeMode: "cover",   
  },
  likesCounterContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 5,
    minWidth: 60,
    justifyContent: "center",
  },
  likesText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 6,
    color: "#333",
  },
  newLikeBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff4458",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  newLikeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    padding: 10,
  },
  refreshButton: {
    position: "absolute",
    top: 50,
    left: 80,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    padding: 10,
  },
  locationStatusContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 8,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 3,
  },
  locationStatusText: {
    fontSize: 12,
    marginLeft: 5,
    color: "#333",
    fontWeight: "500",
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -75 }, { translateY: -12 }],
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 5,
  },
  loadingText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },

  // My Likes Modal Styles
  likesOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  likesContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  likesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  likesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  likesCloseButton: {
    padding: 5,
  },
  noLikesContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noLikesText: {
    textAlign: "center",
    fontSize: 18,
    color: "#666",
    marginTop: 15,
    fontWeight: "600",
  },
  noLikesSubText: {
    textAlign: "center",
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  likedUsersList: {
    paddingTop: 10,
  },
  likedUserCard: {
    flex: 1,
    margin: 10,
    alignItems: "center",
  },
  matchOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  matchContainer: {
    width: "85%",
    padding: 30,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#ff4458",
  },
  matchImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  matchText: {
    fontSize: 18,
    textAlign: "center",
    color: "#333",
    marginBottom: 20,
  },
  matchCloseBtn: {
    backgroundColor: "#ff4458",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  matchCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  blurredImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    position: "relative",
  },
  blurredImage: {
    width: "100%",
    height: "100%",
  },
  blurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  blurredName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
});
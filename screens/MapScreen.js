import React, { useEffect, useState, useCallback } from "react";
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
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import ProfileCardModal from "./ProfileCardModal";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const LATITUDE_DELTA = 0.008;
const LONGITUDE_DELTA = LATITUDE_DELTA * (400 / 800);
const NUS_CENTER = {
  latitude: 1.3,
  longitude: 103.78,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

// ✅ Testing toggle — switch to true for hardcoded NUS location testing
const TESTING_MODE = true;

// Component to show who liked the current user
function MyLikesModal({ visible, onClose, likes }) {
  const [likedUsers, setLikedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLikedUsers = async () => {
    if (!likes || likes.length === 0) return;

    setLoading(true);
    try {
      const userPromises = likes.map(async (userId) => {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          return { id: userId, ...userDoc.data() };
        }
        return null;
      });

      const users = await Promise.all(userPromises);
      setLikedUsers(users.filter((u) => u !== null));
    } catch (error) {
      console.error("Error fetching users who liked me:", error);
      Alert.alert("Error", "Failed to load users who liked you");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      fetchLikedUsers();
    }
  }, [visible, likes]);

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
  const navigation = useNavigation();
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);

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
      let latitude = NUS_CENTER.latitude;
      let longitude = NUS_CENTER.longitude;

      if (!TESTING_MODE) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
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
        longitudeDelta: LONGITUDE_DELTA,
      };

      setRegion(newRegion);

      await fetchMyPreferences();

      // Fetch users and mark data as fetched
      await fetchNearbyUsers(latitude, longitude);
      setDataFetched(true);
      setIsLoading(false);
    } catch (err) {
      console.log("Location error:", err);
      setIsLoading(false);
    }
  };

  const shouldIncludeBasedOnGenderPreference = (userData, currentUser) => {
    const myGender = currentUser.gender?.toLowerCase();
    const myPref = normalizePreference(currentUser.preferences?.gender);

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

  const fetchNearbyUsers = async (lat, lon) => {
    const currentUserDoc = await getDoc(
      doc(db, "users", auth.currentUser?.uid)
    );
    const currentUser = currentUserDoc.exists() ? currentUserDoc.data() : null;

    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      let users = [];

      snapshot.forEach((docSnap) => {
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
          if (!shouldIncludeBasedOnGenderPreference(userData, currentUser))
            return;
          users.push({
            id: docSnap.id,
            ...userData,
            distance,
            userLat,
            userLon,
          });
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
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchMyLikes = async () => {
    try {
      const myDocRef = doc(db, "users", auth.currentUser?.uid);
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

  const handleLikesPress = () => {
    setShowMyLikes(true);
  };

  // Handle map ready event
  const handleMapReady = () => {
    setMapReady(true);
  };

  // Add a refresh function
  const refreshData = async () => {
    await initializeMap();
    await fetchMyLikes();
  };

  // Handle profile card close and refresh likes
  const handleProfileCardClose = async () => {
    setModalVisible(false);
    // Refresh my likes when closing profile card (in case someone liked me)
    await fetchMyLikes();
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
        initialRegion={NUS_CENTER}
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

      {/* ❤️ Likes counter - Now clickable */}
      <TouchableOpacity
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

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading nearby users...</Text>
        </View>
      )}

      {/* Profile Modal */}
      <ProfileCardModal
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
        likes={myLikes}
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
              onPress={() => setMatchModalVisible(false)}
              style={styles.matchCloseBtn}
            >
              <Text style={styles.matchCloseText}>Great!</Text>
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
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  markerImage: { width: "100%", height: "100%" },
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
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
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

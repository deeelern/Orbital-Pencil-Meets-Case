import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { db, auth } from "../FirebaseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { handleLike } from "../utils/handleLike";
import { updateUserLocation, getCurrentLocation, isInsideNUS } from "../utils/locationUtils";
import { fetchUsersWhoLikedMe } from "../utils/likedMe";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenHeight * 0.7;

function LikesModal({ visible, onClose, currentUserId }) {
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

function SwipeCard({ user, onSwipeLeft, onSwipeRight, style, panHandlers }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const handleImageTap = (event) => {
    if (!user.photos || user.photos.length <= 1) return;

    const { locationX } = event.nativeEvent;
    const tapZoneWidth = CARD_WIDTH / 3;

    if (locationX < tapZoneWidth) {
      const newIndex =
        activeImageIndex > 0 ? activeImageIndex - 1 : user.photos.length - 1;
      setActiveImageIndex(newIndex);
    } else if (locationX > CARD_WIDTH - tapZoneWidth) {
      const newIndex =
        activeImageIndex < user.photos.length - 1 ? activeImageIndex + 1 : 0;
      setActiveImageIndex(newIndex);
    }
  };

  const modifiedPanHandlers = {
    ...panHandlers,
    onStartShouldSetPanResponder: (evt, gestureState) => {
      if (isScrolling) return false;

      const imageHeight = CARD_HEIGHT * 0.6;
      const { locationY } = evt.nativeEvent;

      if (locationY > imageHeight) return false;

      return false;
    },

    onMoveShouldSetPanResponder: (evt, gestureState) => {
      if (isScrolling) return false;

      const imageHeight = CARD_HEIGHT * 0.6;
      const { locationY } = evt.nativeEvent;

      if (locationY > imageHeight) return false;

      const { dx, dy } = gestureState;
      const horizontalDistance = Math.abs(dx);
      const verticalDistance = Math.abs(dy);

      return (
        horizontalDistance > verticalDistance &&
        horizontalDistance > 20 &&
        (verticalDistance === 0 || horizontalDistance / verticalDistance > 1.5)
      );
    },
  };

  const safeActiveIndex = Math.min(
    activeImageIndex,
    user.photos?.length - 1 || 0
  );

  return (
    <Animated.View style={[styles.card, style]} {...modifiedPanHandlers}>
      {/* Image Section */}
      <View style={styles.imageSection}>
        {user.photos && user.photos.length > 0 ? (
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleImageTap}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri: user.photos[safeActiveIndex] }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={(e) => {
                console.log("Image load error:", e.nativeEvent.error);
              }}
            />

            {/* Navigation arrows overlay */}
            {user.photos.length > 1 && (
              <>
                <View style={styles.leftTapZone}>
                  <View style={styles.arrowContainer}>
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                </View>
                <View style={styles.rightTapZone}>
                  <View style={styles.arrowContainer}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="person" size={60} color="#ccc" />
            <Text style={styles.noImageText}>No photos available</Text>
          </View>
        )}

        {/* Photo Dots Indicator */}
        {user.photos && user.photos.length > 1 && (
          <View style={styles.dotContainer}>
            {user.photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  safeActiveIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Scrollable Profile Info Section */}
      <ScrollView
        style={styles.infoScrollView}
        contentContainerStyle={styles.infoScrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setIsScrolling(true)}
        onScrollEndDrag={() => setIsScrolling(false)}
        onMomentumScrollBegin={() => setIsScrolling(true)}
        onMomentumScrollEnd={() => setIsScrolling(false)}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.nameRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {user.firstName} {user.lastName}
          </Text>
          {user.likes && user.likes.length > 0 && (
            <View style={styles.likesIndicator}>
              <Ionicons name="heart" size={14} color="#ff4458" />
              <Text style={styles.likesCount}>{user.likes.length}</Text>
            </View>
          )}
        </View>

        {user.degree && user.school && (
          <Text style={styles.infoText} numberOfLines={2}>
            {user.degree} • {user.school}
          </Text>
        )}

        {user.jobTitle && (
          <Text style={styles.infoText} numberOfLines={2}>
            {user.jobTitle}
          </Text>
        )}

        {user.heightCm && (
          <Text style={styles.infoText}>Height: {user.heightCm} cm</Text>
        )}

        <Text style={styles.infoText} numberOfLines={2}>
          {[user.gender, user.ethnicity, user.religion]
            .filter(Boolean)
            .join(" • ")}
        </Text>

        {/* All Prompts if available */}
        {user.prompts && user.prompts.length > 0 && (
          <View style={styles.promptsContainer}>
            {user.prompts.map(
              (prompt, index) =>
                prompt.prompt &&
                prompt.answer && (
                  <View key={index} style={styles.promptContainer}>
                    <Text style={styles.promptQuestion}>{prompt.prompt}</Text>
                    <Text style={styles.promptAnswer}>{prompt.answer}</Text>
                  </View>
                )
            )}
          </View>
        )}

        {/* Additional Bio/About section if available */}
        {user.bio && (
          <View style={styles.bioContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        )}

        {/* Interests if available */}
        {user.interests && user.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsGrid}>
              {user.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add some bottom padding so last content isn't cut off */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const [locationSharing, setLocationSharing] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [showLikes, setShowLikes] = useState(false);

  const position = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const nextCardScale = useRef(new Animated.Value(0.9)).current;
  const nextCardOpacity = useRef(new Animated.Value(0.5)).current;

  const insets = useSafeAreaInsets();

  const fetchCurrentUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setCurrentUserData(userData);
        setLocationSharing(userData.settings?.locationSharing ?? true);

        const likedUsers = await fetchUsersWhoLikedMe();
        setLikesCount(likedUsers.length);
      }
    } catch (error) {
      console.error("Error fetching current user data:", error);
    }
  };

  const filterUsersByGenderPreference = (allUsers, currentUserData) => {
    if (
      !currentUserData ||
      !currentUserData.gender ||
      !currentUserData.preferences?.gender
    ) {
      return allUsers;
    }

    const myGender = currentUserData.gender.toLowerCase();
    const myPreference = normalizePreference(
      currentUserData.preferences.gender
    );

    return allUsers.filter((user) => {
      const theirGender = user.gender?.toLowerCase();
      const theirPref = normalizePreference(user.preferences?.gender);

      if (!theirGender || !theirPref) return false;

      const iMatchTheirPref = theirPref.includes(myGender);
      const theyMatchMyPref = myPreference.includes(theirGender);

      return iMatchTheirPref && theyMatchMyPref;
    });
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

  const filterOutAlreadyInteractedUsers = (users, currentUserData) => {
    if (!currentUserData) return users;

    const alreadyLiked = currentUserData.likes || [];
    const alreadyDisliked = currentUserData.dislikedUsers || [];
    const alreadyInteracted = [...alreadyLiked, ...alreadyDisliked];

    return users.filter((user) => !alreadyInteracted.includes(user.id));
  };

  const fetchUsers = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUserData) return;

      console.log(
        "Fetching users for:",
        currentUserData.firstName,
        "Gender:",
        currentUserData.gender,
        "Preferences:",
        currentUserData.preferences?.gender
      );

      const usersQuery = query(
        collection(db, "users"),
        where("__name__", "!=", currentUser.uid)
      );

      const querySnapshot = await getDocs(usersQuery);
      const fetchedUsers = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.firstName && userData.lastName) {
          fetchedUsers.push({
            id: doc.id,
            ...userData,
          });
        }
      });

      console.log("Fetched users from database:", fetchedUsers.length);

      const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!currentUserDoc.exists()) {
        console.log("Current user document not found");
        setLoading(false);
        return;
      }

      const freshCurrentUserData = currentUserDoc.data();
      console.log("Fresh user data for filtering:", {
        gender: freshCurrentUserData.gender,
        genderPreference: freshCurrentUserData.preferences?.gender,
      });

      let filteredUsers = filterUsersByGenderPreference(
        fetchedUsers,
        freshCurrentUserData
      );
      filteredUsers = filterOutAlreadyInteractedUsers(
        filteredUsers,
        freshCurrentUserData
      );

      console.log("Final filtered users:", filteredUsers.length);

      const shuffledUsers = filteredUsers.sort(() => Math.random() - 0.5);
      setUsers(shuffledUsers);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load profiles");
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      const imageHeight = CARD_HEIGHT * 0.6;
      const { locationY } = evt.nativeEvent;

      if (locationY > imageHeight) return false;

      return false; 
    },

    onMoveShouldSetPanResponder: (evt, gestureState) => {
      const imageHeight = CARD_HEIGHT * 0.6;
      const { locationY } = evt.nativeEvent;

      if (locationY > imageHeight) return false;

      const { dx, dy } = gestureState;
      const horizontalDistance = Math.abs(dx);
      const verticalDistance = Math.abs(dy);

      return (
        horizontalDistance > verticalDistance &&
        horizontalDistance > 20 &&
        (verticalDistance === 0 || horizontalDistance / verticalDistance > 1.5)
      );
    },

    onPanResponderGrant: () => {
      position.setOffset({
        x: position.x._value,
        y: position.y._value,
      });
    },

    onPanResponderMove: (_, gestureState) => {
      position.setValue({ x: gestureState.dx, y: 0 });

      const dragDistance = Math.abs(gestureState.dx);
      const scaleValue = Math.max(0.95, 1 - dragDistance / 1000);
      scale.setValue(scaleValue);

      const progress = Math.min(dragDistance / 100, 1);
      nextCardScale.setValue(0.9 + 0.05 * progress);
      nextCardOpacity.setValue(0.5 + 0.3 * progress);
    },

    onPanResponderRelease: (_, gestureState) => {
      position.flattenOffset();

      const swipeThreshold = 120;

      if (gestureState.dx > swipeThreshold) {
        handleSwipeRight();
      } else if (gestureState.dx < -swipeThreshold) {
        handleSwipeLeft();
      } else {
        Animated.parallel([
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
          }),
          Animated.spring(nextCardScale, {
            toValue: 0.9,
            useNativeDriver: false,
          }),
          Animated.spring(nextCardOpacity, {
            toValue: 0.5,
            useNativeDriver: false,
          }),
        ]).start();
      }
    },
  });

  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);

  const handleSwipeRight = async () => {
    const swipedUser = users[currentIndex];
    if (!swipedUser) return;

    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: screenWidth + 100, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(async () => {
      try {
        await handleLike(swipedUser, setMatchModalVisible, setMatchedUser);
      } catch (err) {
        console.error("Error during swipe right:", err);
      }

      moveToNextCard();
    });
  };

  const handleSwipeLeft = () => {
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: -screenWidth - 100, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      moveToNextCard();
    });
  };

  const moveToNextCard = () => {
    position.setValue({ x: 0, y: 0 });
    scale.setValue(1);
    nextCardScale.setValue(0.9);
    nextCardOpacity.setValue(0.5);

    setCurrentIndex((prev) => prev + 1);
  };

  const handleLikesPress = () => {
    setShowLikes(true);
  };

  useEffect(() => {
    fetchCurrentUserData();
  }, []);

  useEffect(() => {
    if (currentUserData) {
      fetchUsers();
    }
  }, [currentUserData]);

  useEffect(() => {
    if (locationSharing) {
      updateUserLocation();
    }
  }, [locationSharing]);

  const handleSettings = () =>
    navigation.navigate("Settings", { from: "Home" });

  const handleMeetPress = async () => {
    console.log("💡 Meet button pressed");
    
    const locationData = await getCurrentLocation();
    
    if (!locationData) {
      return Alert.alert("Location Error", "Unable to get your location. Please try again.");
    }
    
    const { latitude, longitude, insideNUS } = locationData;
    
    console.log("Fetched location:", latitude, longitude);
    console.log("Inside NUS?", insideNUS);
    
    if (!insideNUS) {
      return Alert.alert("Off Campus", "Proximity matching only works when you're on NUS campus.");
    }
    navigation.navigate("Meet");
  };

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];

return (
  <LinearGradient
    colors={["#6C5CE7", "#74b9ff"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{ flex: 1 }}
  >
    <SafeAreaView style={{ flex: 1 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} disabled>
          <Ionicons name="home-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.headerRight}>
          {likesCount > 0 && (
            <TouchableOpacity
              onPress={handleLikesPress}
              style={styles.likesHeaderButton}
            >
              <Ionicons name="heart" size={20} color="#fff" />
              <Text style={styles.likesHeaderCount}>{likesCount}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSettings}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : currentIndex >= users.length ? (
          <View style={styles.noMoreCardsContainer}>
            <Ionicons name="heart-outline" size={60} color="#ccc" />
            <Text style={styles.noMoreCardsText}>No more profiles</Text>
            <Text style={styles.noMoreCardsSubText}>
              Check back later for new people!
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                setCurrentIndex(0);
                fetchUsers();
              }}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardStack}>
            {/* Next card */}
            {nextUser && (
              <Animated.View
                style={[
                  styles.card,
                  styles.nextCard,
                  {
                    transform: [{ scale: nextCardScale }],
                    opacity: nextCardOpacity,
                  },
                ]}
              >
                <View style={styles.imageSection}>
                  {nextUser.photos?.length > 0 ? (
                    <Image
                      source={{ uri: nextUser.photos[0] }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noImageContainer}>
                      <Ionicons name="person" size={50} color="#ccc" />
                    </View>
                  )}
                </View>
                <View style={styles.infoSection}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {nextUser.firstName} {nextUser.lastName}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Current card */}
            {currentUser && (
              <SwipeCard
                user={currentUser}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                style={{
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { scale: scale },
                  ],
                  zIndex: 10,
                }}
                panHandlers={panResponder.panHandlers}
              />
            )}
          </View>
        )}

        {!loading && currentIndex < users.length && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionText}>
              ← Swipe left to pass • Swipe right to like →
            </Text>
          </View>
        )}
      </View>

      {/* MODALS */}
      <Modal visible={matchModalVisible} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <View style={styles.matchPopup}>
            <Text style={styles.matchText}>🎉 It's a match!</Text>
            <Text style={styles.matchText}>
              You and {matchedUser?.firstName} can now chat!
            </Text>
            <TouchableOpacity onPress={() => setMatchModalVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LikesModal
        visible={showLikes}
        onClose={() => setShowLikes(false)}
        currentUserId={auth.currentUser?.uid}
      />

      {/* FOOTER */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => {
            navigation.navigate("Chat");
          }}
        >
          <Ionicons
            name="chatbubble-outline"
            size={22}
            color="#6C5CE7"
          />
          <Text
            style={[
              styles.tabText,
              { color: "#6C5CE7" }
            ]}
          >
            Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={handleMeetPress}
        >
          <Ionicons
            name="heart-outline"
            size={22}
            color ="#6C5CE7"
          />
          <Text
            style={[
              styles.tabText,
              { color: "#6C5CE7" }
            ]}
          >
            Meet!
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => {
            navigation.navigate("Me");
          }}
        >
          <Ionicons
            name="person-outline"
            size={22}
            color ="#6C5CE7" 
          />
          <Text
            style={[
              styles.tabText,
              { color: "#6C5CE7" }
            ]}
          >
            Me
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  </LinearGradient>
);
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginLeft: -40,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  likesHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
  },
  likesHeaderCount: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
  blurredImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  likesOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", 
  },
  likesContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    height: "35%",
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
  },
  likesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  likesCloseButton: {
    position: "absolute",
    top: -5,
    right: -75,
    padding: 8,
    zIndex: 10,
  },
  likedUsersList: {
    paddingTop: 10,
  },
  likedUserCard: {
    margin: 10,
    alignItems: "center",
  },
  noMoreCardsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  noMoreCardsText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
  },
  noMoreCardsSubText: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  refreshButton: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cardStack: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#fff",
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: "hidden",
    top: 0,
    left: 0,
  },
  nextCard: {
    zIndex: 1,
  },
  imageSection: {
    flex: 2.2,
    position: "relative",
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  leftTapZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "33%",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 15,
  },
  rightTapZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "33%",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 15,
  },
  arrowContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 15,
    padding: 5,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  noImageText: {
    marginTop: 10,
    color: "#999",
    fontSize: 16,
  },
  dotContainer: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#fff",
    transform: [{ scale: 1.2 }],
  },
  infoScrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  infoScrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  promptsContainer: {
    marginTop: 8,
  },
  promptContainer: {
    marginBottom: 12,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6C5CE7",
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    lineHeight: 18,
  },
  promptAnswer: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  bioContainer: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  interestsContainer: {
    marginTop: 15,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  interestTag: {
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "500",
  },
  bottomPadding: {
    height: 20,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  likesIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffe8ea",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  likesCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ff4458",
    marginLeft: 4,
  },
  matchOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  matchPopup: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "80%",
    padding: 20,
  },
  matchText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",   
    textAlign: "center",
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 20,
    fontSize: 16,
    color: "#007AFF",
  },
  infoText: {
    fontSize: 15,
    color: "#666",
    marginVertical: 2,
    lineHeight: 20,
  },
  promptContainer: {
    marginTop: 12,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6C5CE7",
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    lineHeight: 18,
  },
  promptAnswer: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  instructionsContainer: {
    position: "absolute",
    bottom: 75,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: 12,
    color: "#fff",
    textAlign: "center",
    marginVertical: 2,
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 15, 
  },

  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  tabText: {
    fontSize: 12,
    fontWeight: "500",
  },
});


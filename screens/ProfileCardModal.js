import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../FirebaseConfig';
import { doc, updateDoc, arrayUnion, getDoc, arrayRemove } from 'firebase/firestore';

// Likes Modal Component
function LikesModal({ visible, onClose, user }) {
  const [likedUsers, setLikedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLikedUsers = async () => {
    if (!user?.likes || user.likes.length === 0) return;
    
    setLoading(true);
    try {
      const userPromises = user.likes.map(async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          return { id: userId, ...userDoc.data() };
        }
        return null;
      });
      
      const users = await Promise.all(userPromises);
      setLikedUsers(users.filter(u => u !== null));
    } catch (error) {
      console.error('Error fetching liked users:', error);
      Alert.alert('Error', 'Failed to load users who liked you');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible) {
      fetchLikedUsers();
    }
  }, [visible]);

  const renderLikedUser = ({ item }) => (
    <View style={styles.likedUserCard}>
      <View style={styles.blurredImageContainer}>
        <Image
          source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/100' }}
          style={styles.blurredImage}
          blurRadius={15}
        />
        <View style={styles.blurOverlay}>
          <Ionicons name="heart" size={24} color="#ff4458" />
        </View>
      </View>
      <Text style={styles.blurredName}>
        {item.firstName?.[0] || '?'}***
      </Text>
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
              <Text style={styles.noLikesSubText}>Keep exploring to find matches!</Text>
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

export default function ProfileCardModal({ visible, onClose, user }) {
  if (!user) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [showLikes, setShowLikes] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollRef = useRef(null);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const modalWidth = screenWidth * 0.95;
  const modalHeight = screenHeight * 0.85;

  const position = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Improved panResponder with better touch discrimination
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Don't intercept if user is actively scrolling
      if (isScrolling) return false;
      
      // Only respond to touches in the image area (top 400px)
      const { locationY } = evt.nativeEvent;
      if (locationY > 400) return false;
      
      // Require some initial movement to distinguish from taps
      return false;
    },
    
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Don't intercept if user is actively scrolling
      if (isScrolling) return false;
      
      // Only respond to touches in the image area
      const { locationY } = evt.nativeEvent;
      if (locationY > 400) return false;
      
      // Require significant horizontal movement compared to vertical
      const { dx, dy } = gestureState;
      const horizontalDistance = Math.abs(dx);
      const verticalDistance = Math.abs(dy);
      
      // Only respond if:
      // 1. Horizontal movement is greater than vertical movement
      // 2. Horizontal movement is significant (> 20px)
      // 3. The ratio of horizontal to vertical movement is > 1.5
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
      // Only update x position for horizontal swipes, keep y at 0
      position.setValue({ x: gestureState.dx, y: 0 });
      
      // Scale effect based on horizontal drag distance only
      const dragDistance = Math.abs(gestureState.dx);
      const scaleValue = Math.max(0.95, 1 - dragDistance / 1000);
      scale.setValue(scaleValue);
    },
    
    onPanResponderRelease: (_, gestureState) => {
      position.flattenOffset();
      
      const swipeThreshold = 120;
      
      if (gestureState.dx > swipeThreshold) {
        handleSwipeRight();
      } else if (gestureState.dx < -swipeThreshold) {
        handleSwipeLeft();
      } else {
        // Snap back to center
        Animated.parallel([
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
          })
        ]).start();
      }
    }
  });

  const handleSwipeRight = async () => {
    // Animate card off screen to the right
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: screenWidth, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: false,
      })
    ]).start(async () => {
      try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
          throw new Error('User not authenticated');
        }

        // Check if we already liked this user
        const userDocRef = doc(db, 'users', user.id);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const currentLikes = userData.likes || [];
          
          if (currentLikes.includes(currentUserId)) {
            Alert.alert('Already Liked', 'You have already liked this profile!');
          } else {
            // Add current user's ID to the viewed user's likes array
            await updateDoc(userDocRef, {
              likes: arrayUnion(currentUserId)
            });
            
            Alert.alert('👍', 'You liked this profile!', [
              { text: 'OK', onPress: () => {} }
            ]);
          }
        } else {
          // User document doesn't exist, create the likes array
          await updateDoc(userDocRef, {
            likes: [currentUserId]
          });
          
          Alert.alert('👍', 'You liked this profile!', [
            { text: 'OK', onPress: () => {} }
          ]);
        }
      } catch (err) {
        console.error('Error liking user:', err);
        Alert.alert('Error', `Failed to like profile: ${err.message}`);
      }
      
      // Reset position and close modal
      position.setValue({ x: 0, y: 0 });
      scale.setValue(1);
      onClose();
    });
  };

  const handleSwipeLeft = () => {
    // Animate card off screen to the left
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: -screenWidth, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: false,
      })
    ]).start(() => {
      // Reset position and close modal
      position.setValue({ x: 0, y: 0 });
      scale.setValue(1);
      onClose();
    });
  };

  // Alternative image navigation using tap zones
  const handleImageTap = (event) => {
    if (!user.photos || user.photos.length <= 1) return;
    
    const { locationX } = event.nativeEvent;
    const imageWidth = modalWidth;
    const tapZoneWidth = imageWidth / 3;
    
    if (locationX < tapZoneWidth) {
      // Left tap - previous image
      const newIndex = activeIndex > 0 ? activeIndex - 1 : user.photos.length - 1;
      setActiveIndex(newIndex);
    } else if (locationX > imageWidth - tapZoneWidth) {
      // Right tap - next image
      const newIndex = activeIndex < user.photos.length - 1 ? activeIndex + 1 : 0;
      setActiveIndex(newIndex);
    }
  };

  const handleLikesPress = () => {
    setShowLikes(true);
  };

  // ScrollView event handlers to track scrolling state
  const handleScrollBeginDrag = () => {
    setIsScrolling(true);
  };

  const handleScrollEndDrag = () => {
    setIsScrolling(false);
  };

  const handleMomentumScrollBegin = () => {
    setIsScrolling(true);
  };

  const handleMomentumScrollEnd = () => {
    setIsScrolling(false);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              { 
                width: modalWidth,
                height: modalHeight,
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { scale: scale }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            {/* Image Display with Tap Navigation */}
            <View style={styles.carouselWrapper}>
              {user.photos && user.photos.length > 0 ? (
                <TouchableOpacity 
                  activeOpacity={1} 
                  onPress={handleImageTap}
                  style={styles.imageContainer}
                >
                  <Image
                    source={{ uri: user.photos[activeIndex] }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                  
                  {/* Navigation arrows overlay */}
                  {user.photos.length > 1 && (
                    <>
                      <View style={styles.leftTapZone}>
                        <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.7)" />
                      </View>
                      <View style={styles.rightTapZone}>
                        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.imageContainer}>
                  <View style={styles.noImageContainer}>
                    <Ionicons name="person" size={50} color="#ccc" />
                    <Text style={styles.noImageText}>No photos</Text>
                  </View>
                </View>
              )}
              
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Photo Dots Indicator */}
            {user.photos && user.photos.length > 1 && (
              <View style={styles.dotContainer}>
                {user.photos.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.dot, 
                      activeIndex === index && styles.activeDot
                    ]} 
                  />
                ))}
              </View>
            )}

            {/* Profile Info with ScrollView */}
            <ScrollView
              ref={scrollRef}
              style={styles.profileInfo}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onMomentumScrollBegin={handleMomentumScrollBegin}
              onMomentumScrollEnd={handleMomentumScrollEnd}
            >
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>
                  {user.firstName} {user.lastName}
                </Text>
                {user.likes && user.likes.length > 0 && (
                  <TouchableOpacity 
                    style={styles.likesButton}
                    onPress={handleLikesPress}
                  >
                    <Ionicons name="heart" size={16} color="#ff4458" />
                    <Text style={styles.likesCount}>{user.likes.length}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.subText}>{user.degree} • {user.school}</Text>
              <Text style={styles.subText}>{user.jobTitle}</Text>
              <Text style={styles.subText}>Height: {user.heightCm} cm</Text>
              <Text style={styles.subText}>
                {user.gender} • {user.ethnicity} • {user.religion}
              </Text>

              {/* Prompts Section */}
              {user.prompts && user.prompts.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Prompts:</Text>
                  {user.prompts.map((promptObj, idx) => (
                    <View key={idx} style={styles.promptContainer}>
                      <Text style={styles.promptQuestion}>{promptObj.prompt}</Text>
                      <Text style={styles.promptAnswer}>{promptObj.answer}</Text>
                    </View>
                  ))}
                </>
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
            </ScrollView>

            {/* Swipe Instructions */}
            <View style={styles.swipeInstructions}>
              <Text style={styles.instructionText}>
                ← Swipe left to pass • Swipe right to like →
              </Text>
              <Text style={styles.instructionText}>
                Tap left/right edges of photo to navigate
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Likes Modal */}
      <LikesModal 
        visible={showLikes} 
        onClose={() => setShowLikes(false)} 
        user={user} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 40,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  carouselWrapper: {
    width: '100%',
    position: 'relative',
    height: 400,
  },
  imageContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  leftTapZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '33%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 15,
    backgroundColor: 'transparent',
  },
  rightTapZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '33%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 15,
    backgroundColor: 'transparent',
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  noImageText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#333',
  },
  profileInfo: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
    minHeight: 300,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  likesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe8ea',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  likesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4458',
    marginLeft: 4,
  },
  subText: {
    fontSize: 16,
    color: '#555',
    marginVertical: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  promptContainer: {
    marginVertical: 5,
    width: '100%',
  },
  promptQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 3,
  },
  promptAnswer: {
    fontSize: 15,
    color: '#555',
    lineHeight: 20,
  },
  bioContainer: {
    marginTop: 15,
  },
  bioText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 20,
  },
  interestsContainer: {
    marginTop: 15,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  swipeInstructions: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginVertical: 1,
  },
  
  // Likes Modal Styles
  likesOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  likesContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  likesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  likesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  likesCloseButton: {
    padding: 5,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  noLikesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noLikesText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    fontWeight: '600'
  },
  noLikesSubText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  likedUsersList: {
    paddingTop: 10,
  },
  likedUserCard: {
    flex: 1,
    margin: 10,
    alignItems: 'center',
  },
  blurredImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  blurredImage: {
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurredName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
import { doc, getDoc, updateDoc, arrayUnion, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../FirebaseConfig';

/**
 * Handles a like interaction and creates a match + chat if mutual
 * @param {Object} likedUser - The user being liked
 * @param {Function} setMatchModalVisible - Function to set match modal visibility
 * @param {Function} setMatchedUser - Function to set matched user data for UI
 */
export const handleLike = async (likedUser, setMatchModalVisible, setMatchedUser) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user found');
      return;
    }

    const currentUserId = currentUser.uid;
    const likedUserId = likedUser.id;

    console.log('Handling like for:', likedUserId);
    console.log('Current user:', currentUserId);

    const currentUserRef = doc(db, 'users', currentUserId);
    const likedUserRef = doc(db, 'users', likedUserId);

    // Get both user documents
    const [currentUserSnap, likedUserSnap] = await Promise.all([
      getDoc(currentUserRef),
      getDoc(likedUserRef)
    ]);

    if (!currentUserSnap.exists()) {
      console.error('Current user document does not exist');
      return;
    }
    if (!likedUserSnap.exists()) {
      console.error('Liked user document does not exist');
      return;
    }

    const currentUserData = currentUserSnap.data();
    const likedUserData = likedUserSnap.data();

    // Existing likes arrays
    const currentUserLikes = currentUserData.likes || [];
    const likedUserLikes = likedUserData.likes || [];

    console.log('Current user already liked:', currentUserLikes);
    console.log("Liked user's likes list:", likedUserLikes);

    // Prevent double-like
    if (currentUserLikes.includes(likedUserId)) {
      console.log('User already liked this person');
      return;
    }

    // Determine if mutual match
    const isMutualMatch = likedUserLikes.includes(currentUserId);
    console.log('Is mutual match:', isMutualMatch);

    // Step 1: update current user's likes
    console.log('Step 1: Updating current user likes...');
    await updateDoc(currentUserRef, {
      likes: arrayUnion(likedUserId)
    });
    console.log('✅ Successfully updated current user likes');

    if (isMutualMatch) {
      console.log('🎉 MATCH DETECTED! Proceeding to match flow...');

      // Step 2: record match and mark as seen on current user's doc
      console.log('Step 2: Recording match and marking as seen for current user...');
      await updateDoc(currentUserRef, {
        matchedUsers: arrayUnion(likedUserId),
        seenMatches:  arrayUnion(likedUserId)
      });
      console.log('✅ Updated current user matchedUsers and seenMatches');

      // Step 3: Creating chat room
      console.log('Step 3: Creating chat room...');
      const chatId = [currentUserId, likedUserId].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const existingChatSnap = await getDoc(chatRef);
      if (!existingChatSnap.exists()) {
        const chatData = {
          members: [currentUserId, likedUserId],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          unreadCount: 0
        };
        console.log('Chat payload →', chatData);
        await setDoc(chatRef, chatData);
        console.log('✅ Chat room created:', chatId);
      } else {
        console.log('Chat room already exists:', chatId);
      }

      // Step 4: show match UI
      console.log('Step 4: Showing match modal...');
      setMatchedUser(likedUser);
      setMatchModalVisible(true);
      console.log('✅ Match modal should now be visible');

    } else {
      console.log('No mutual match yet - waiting for the other user to like back');
    }
  } catch (error) {
    console.error('❌ Error in handleLike:', error);
    if (error.code === 'permission-denied') {
      alert('Permission denied. Please check your Firestore rules and try again.');
    } else {
      alert('An error occurred. Please try again.');
    }
    throw error;
  }
};

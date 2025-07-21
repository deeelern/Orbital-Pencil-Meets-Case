// utils/userUtils.js
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

/**
 * Updates the current user's online status in Firestore,
 * respecting their 'showOnline' setting.
 * 
 * @param {boolean} isOnline - true if setting user as online, false if offline
 */
export const setUserOnlineStatus = async (isOnline) => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const showOnline = userSnap.data()?.settings?.showOnline;

    if (!showOnline) {
      // User opted out — always appear offline
      await updateDoc(userRef, {
        online: false,
      });
    } else {
      await updateDoc(userRef, {
        online: isOnline,
        lastSeen: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Failed to set user online status:", err);
  }
};

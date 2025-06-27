import { auth, db } from "../FirebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export const fetchUsersWhoLikedMe = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const usersSnapshot = await getDocs(collection(db, "users"));
  const likedMe = [];

  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    const theirLikes = data.likes || [];
    if (theirLikes.includes(currentUser.uid)) {
      likedMe.push({ id: doc.id, ...data });
    }
  });

  return likedMe;
};

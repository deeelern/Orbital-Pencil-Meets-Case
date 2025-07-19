import { auth, db } from "../FirebaseConfig";
import { doc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export const signOutUser = async () => {
  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      online: false,
      lastSeen: serverTimestamp(),
    });
  }

  await auth.signOut();
};

export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const userRef = doc(db, "users", user.uid);

  await updateDoc(userRef, {
    online: false,
    lastSeen: serverTimestamp(),
  });

  await deleteDoc(userRef);

  await user.delete();
};

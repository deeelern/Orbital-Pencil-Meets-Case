import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const PHOTO_WIDTH = (width - 40) / 3;

export default function MeScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  const fetchUserProfile = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        Alert.alert("Profile not found", "Please complete your profile setup.");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const calculateAge = (dob) => {
    if (!dob) return null;
    let birthDate = dob.toDate ? dob.toDate() : new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleEditProfile = () => {
    if (!userProfile) return;
    navigation.navigate("ProfileSetup", {
      ...userProfile,
      prompts: userProfile.prompts || [],
      editingMode: true,
      fromMeScreen: true,
      fromEditProfile: true,
    });
  };

  const handleEditPictures = () => {
    navigation.navigate("PhotoUpload", {
      existingPhotos: userProfile.photos || [],
      from: "MeScreen",
      fromEditProfile: true,
    });
  };

  const handleEditPreferences = () => {
    navigation.navigate("MyPreferences", {
      fromMeScreen: true,
      fromEditProfile: true,
      prompts: userProfile.prompts || [],
    });
  };

  const handleBack = () => {
    navigation.navigate("Home");
  };

  const handleSettings = () => navigation.navigate("Settings", { from: "Me" });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#6C5CE7", "#74b9ff"]} style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Profile</Text>
          <TouchableOpacity
            onPress={handleSettings}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Profile not found</Text>
          <TouchableOpacity
            style={styles.setupButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.setupButtonText}>Complete Profile Setup</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(userProfile.dateOfBirth);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#6C5CE7", "#74b9ff"]} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <TouchableOpacity onPress={handleSettings} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {userProfile.photos?.length > 0 && (
          <View style={styles.photosSection}>
            <View style={styles.photosGrid}>
              {userProfile.photos.slice(0, 6).map((photo, i) => (
                <Image key={i} source={{ uri: photo }} style={styles.photo} />
              ))}
            </View>
            <TouchableOpacity
              onPress={handleEditPictures}
              style={styles.actionBtn}
            >
              <Ionicons name="camera-outline" size={16} color="#6C5CE7" />
              <Text style={styles.actionText}>Edit Pictures</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.name}>
            {userProfile.firstName} {userProfile.lastName}
          </Text>
          {age && <Text style={styles.age}>{age} years old</Text>}

          <TouchableOpacity
            onPress={handleEditProfile}
            style={styles.actionBtn}
          >
            <Ionicons name="pencil-outline" size={16} color="#6C5CE7" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEditPreferences}
            style={styles.actionBtn}
          >
            <Ionicons name="options-outline" size={16} color="#6C5CE7" />
            <Text style={styles.actionText}>Edit Preferences</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsSection}>
          {userProfile.heightCm && (
            <Text style={styles.detailText}>
              Height: {userProfile.heightCm} cm
            </Text>
          )}
          {userProfile.jobTitle && (
            <Text style={styles.detailText}>Job: {userProfile.jobTitle}</Text>
          )}
          {userProfile.religion && (
            <Text style={styles.detailText}>
              Religion: {userProfile.religion}
            </Text>
          )}
        </View>

        {userProfile.prompts?.length > 0 && (
          <View style={styles.promptsSection}>
            <Text style={styles.sectionTitle}>About Me</Text>
            {userProfile.prompts.map((p, i) => (
              <View key={i} style={styles.promptCard}>
                <Text style={styles.promptQ}>{p.prompt}</Text>
                <Text style={styles.promptA}>{p.answer}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.promptsSection}>
          <Text style={styles.sectionTitle}>Looking For</Text>
          <Text style={styles.detailText}>
            Interested in: {userProfile.preferences?.gender || "Not specified"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginLeft: -40,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  photosSection: {
    marginBottom: 20,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  photo: {
    width: PHOTO_WIDTH,
    height: PHOTO_WIDTH * 1.33,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#f0f7ff",
    alignSelf: "flex-start",
    borderColor: "#6C5CE7",
    borderWidth: 1,
  },
  actionText: {
    marginLeft: 6,
    color: "#6C5CE7",
    fontWeight: "600",
    fontSize: 14,
  },
  infoSection: {
    marginBottom: 20,
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2f3640",
  },
  age: {
    fontSize: 18,
    color: "#636e72",
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailText: {
    fontSize: 15,
    color: "#2f3640",
    marginBottom: 6,
  },
  promptsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2f3640",
    marginBottom: 12,
  },
  promptCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e1e8ed",
    marginBottom: 12,
  },
  promptQ: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C5CE7",
    marginBottom: 6,
  },
  promptA: {
    fontSize: 16,
    color: "#2f3640",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  setupButton: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  setupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

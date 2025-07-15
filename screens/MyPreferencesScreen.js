import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { auth, db } from "../FirebaseConfig";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

function RadioRow({ options, value, onChange }) {
  return (
    <View style={styles.editorContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.radioRow, value === opt && styles.radioRowSelected]}
          onPress={() => onChange(opt)}
        >
          <Text
            style={[
              styles.radioLabel,
              value === opt && styles.radioLabelSelected,
            ]}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MultiSelectRow({ options, value, onChange, exclusiveOptions = [] }) {
  const currentSelections = Array.isArray(value) ? value : [value];

  const handleOptionPress = (option) => {
    const isExclusive = exclusiveOptions.includes(option);
    const hasExclusive = currentSelections.some((item) =>
      exclusiveOptions.includes(item)
    );

    if (isExclusive) return onChange([option]);
    if (hasExclusive) return onChange([option]);

    const exists = currentSelections.includes(option);
    const newSelections = exists
      ? currentSelections.filter((v) => v !== option)
      : [...currentSelections, option];

    onChange(
      newSelections.length > 0
        ? newSelections
        : [exclusiveOptions[0] || options[0]]
    );
  };

  return (
    <View style={styles.multiSelectGrid}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.multiSelectOption,
            currentSelections.includes(opt) && styles.multiSelectOptionSelected,
          ]}
          onPress={() => handleOptionPress(opt)}
        >
          <Text
            style={[
              styles.multiSelectLabel,
              currentSelections.includes(opt) &&
                styles.multiSelectLabelSelected,
            ]}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MyPreferencesScreen({ navigation, route }) {
  const user = auth.currentUser;
  const uid = user?.uid;

  const [gender, setGender] = useState("Everyone");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(40);
  const [distance, setDistance] = useState(1);
  const [ethnicity, setEthnicity] = useState(["All"]);
  const [religion, setReligion] = useState(["All"]);
  const [goals, setGoals] = useState("All");
  const [heightMin, setHeightMin] = useState(140);
  const [heightMax, setHeightMax] = useState(180);
  const [education, setEducation] = useState("Diploma");
  const [smoking, setSmoking] = useState("Not at all");
  const [drinking, setDrinking] = useState("Not at all");

  const [editing, setEditing] = useState(null);

  const isEditing = route?.params?.fromEditProfile === true;

  const ages = Array.from({ length: 82 }, (_, i) => 18 + i);
  const kmOptions = [1, 10, 20, 50, 100];
  const heightRange = Array.from({ length: 300 }, (_, i) => i);
  const ethnicOpts = [
    "All",
    "Asian",
    "Black/African",
    "Hispanic/Latino",
    "Middle Eastern",
    "White",
    "Indigenous",
    "Other",
  ];
  const relOpts = [
    "All",
    "None",
    "Buddhist",
    "Christian",
    "Catholic",
    "Hindu",
    "Jewish",
    "Muslim",
    "Sikh",
    "Taoist",
    "Atheist",
    "Other",
  ];
  const goalOpts = [
    "All",
    "Friendship",
    "Short-term fun",
    "Long-term",
    "Marriage",
  ];
  const educOpts = [
    "High School",
    "Diploma",
    "Nitec",
    "Higher Nitec",
    "Post Secondary",
    "Bachelors",
    "Masters",
    "PhD",
  ];
  const smokeOpts = ["Not at all", "Open to it"];
  const drinkOpts = ["Not at all", "Open to it"];

  const formatArrayValue = (arr) => (Array.isArray(arr) ? arr.join(", ") : arr);

  useEffect(() => {
    if (isEditing && uid) {
      const fetch = async () => {
        const docSnap = await getDoc(doc(db, "users", uid));
        const prefs = docSnap.data()?.preferences || {};
        if (prefs.gender) setGender(prefs.gender);
        if (prefs.ageRange?.min) setAgeMin(prefs.ageRange.min);
        if (prefs.ageRange?.max) setAgeMax(prefs.ageRange.max);
        if (prefs.distanceKm) setDistance(prefs.distanceKm);
        if (prefs.ethnicity)
          setEthnicity(
            Array.isArray(prefs.ethnicity) ? prefs.ethnicity : [prefs.ethnicity]
          );
        if (prefs.religion)
          setReligion(
            Array.isArray(prefs.religion) ? prefs.religion : [prefs.religion]
          );
        if (prefs.goals) setGoals(prefs.goals);
        if (prefs.heightRange?.min) setHeightMin(prefs.heightRange.min);
        if (prefs.heightRange?.max) setHeightMax(prefs.heightRange.max);
        if (prefs.educationLevel) setEducation(prefs.educationLevel);
        if (prefs.smoking) setSmoking(prefs.smoking);
        if (prefs.drinking) setDrinking(prefs.drinking);
      };
      fetch();
    }
  }, [isEditing, uid]);

  const handleDone = async () => {
    const {
      email,
      password,
      profile,
      prompts = [],
      photos = [],
      fromEditProfile,
    } = route.params || {};

    if (ageMin > ageMax)
      return Alert.alert("Age range error", "Min age cannot exceed Max age.");
    if (heightMin > heightMax)
      return Alert.alert(
        "Height range error",
        "Min height cannot exceed Max height."
      );

    const preferences = {
      gender,
      ageRange: { min: ageMin, max: ageMax },
      distanceKm: distance,
      ethnicity,
      religion,
      goals,
      heightRange: { min: heightMin, max: heightMax },
      educationLevel: education,
      smoking,
      drinking,
      preferencesUpdatedAt: serverTimestamp(),
    };

    try {
      let finalUid = uid;
      if (!isEditing && !auth.currentUser) {
        const userCred = await auth.createUserWithEmailAndPassword(
          email,
          password
        );
        finalUid = userCred.user.uid;
      }

      let finalPhotos = photos;
      if (isEditing && (!photos || photos.length === 0)) {
        const docSnap = await getDoc(doc(db, "users", finalUid));
        finalPhotos = docSnap.data()?.photos || [];
      }

      const userData = {
        ...profile,
        prompts,
        preferences,
        profileCompleted: true,
        photos: finalPhotos,
        settings: {
          notifications: true,
          showOnline: true,
          privateMode: false,
          locationSharing: true,
        },
        ...(email && !isEditing ? { email } : {}),
        ...(isEditing
          ? {}
          : {
              createdAt: serverTimestamp(),
              seenMatches: [],
            }),
      };

      await setDoc(doc(db, "users", finalUid), userData, { merge: true });
      navigation.replace(isEditing ? "Me" : "Home");
    } catch (err) {
      Alert.alert("Error saving preferences", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6C5CE7", "#74b9ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Preferences</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {[
          {
            key: "Gender",
            value: gender,
            editor: (
              <RadioRow
                options={["Female", "Male", "Everyone"]}
                value={gender}
                onChange={setGender}
              />
            ),
          },
          {
            key: "Age Range",
            value: `${ageMin} – ${ageMax}`,
            editor: (
              <View style={styles.pickerRow}>
                <Picker
                  style={styles.picker}
                  selectedValue={ageMin}
                  onValueChange={setAgeMin}
                >
                  {ages.map((a) => (
                    <Picker.Item key={a} label={`${a}`} value={a} />
                  ))}
                </Picker>
                <Picker
                  style={styles.picker}
                  selectedValue={ageMax}
                  onValueChange={setAgeMax}
                >
                  {ages.map((a) => (
                    <Picker.Item key={a} label={`${a}`} value={a} />
                  ))}
                </Picker>
              </View>
            ),
          },
          {
            key: "Distance",
            value: `${distance} km`,
            editor: (
              <Picker
                style={styles.picker}
                selectedValue={distance}
                onValueChange={setDistance}
              >
                {kmOptions.map((k) => (
                  <Picker.Item key={k} label={`${k} km`} value={k} />
                ))}
              </Picker>
            ),
          },
          {
            key: "Ethnicity",
            value: formatArrayValue(ethnicity),
            editor: (
              <MultiSelectRow
                options={ethnicOpts}
                value={ethnicity}
                onChange={setEthnicity}
                exclusiveOptions={["All"]}
              />
            ),
          },
          {
            key: "Religion",
            value: formatArrayValue(religion),
            editor: (
              <MultiSelectRow
                options={relOpts}
                value={religion}
                onChange={setReligion}
                exclusiveOptions={["All", "None"]}
              />
            ),
          },
          {
            key: "Goals",
            value: goals,
            editor: (
              <Picker
                style={styles.picker}
                selectedValue={goals}
                onValueChange={setGoals}
              >
                {goalOpts.map((g) => (
                  <Picker.Item key={g} label={g} value={g} />
                ))}
              </Picker>
            ),
          },
          {
            key: "Height",
            value: `${heightMin} – ${heightMax}`,
            editor: (
              <View style={styles.pickerRow}>
                <Picker
                  style={styles.picker}
                  selectedValue={heightMin}
                  onValueChange={setHeightMin}
                >
                  {heightRange.map((h) => (
                    <Picker.Item key={h} label={`${h}`} value={h} />
                  ))}
                </Picker>
                <Picker
                  style={styles.picker}
                  selectedValue={heightMax}
                  onValueChange={setHeightMax}
                >
                  {heightRange.map((h) => (
                    <Picker.Item key={h} label={`${h}`} value={h} />
                  ))}
                </Picker>
              </View>
            ),
          },
          {
            key: "Education",
            value: `${education}+`,
            editor: (
              <RadioRow
                options={educOpts}
                value={education}
                onChange={setEducation}
              />
            ),
          },
          {
            key: "Smoking",
            value: smoking,
            editor: (
              <RadioRow
                options={smokeOpts}
                value={smoking}
                onChange={setSmoking}
              />
            ),
          },
          {
            key: "Drinking",
            value: drinking,
            editor: (
              <RadioRow
                options={drinkOpts}
                value={drinking}
                onChange={setDrinking}
              />
            ),
          },
        ].map(({ key, value, editor }) => (
          <View key={key} style={styles.card}>
            <TouchableOpacity
              onPress={() => setEditing(editing === key ? null : key)}
              style={styles.cardHeader}
            >
              <Text style={styles.cardLabel}>{key}</Text>
              <Text style={styles.cardValue}>{value}</Text>
            </TouchableOpacity>
            {editing === key && <View style={styles.editorBox}>{editor}</View>}
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleDone}>
          <LinearGradient
            colors={["#6C5CE7", "#74b9ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Text style={styles.submitText}>Done</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginLeft: -40,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3640",
  },
  cardValue: {
    fontSize: 14,
    color: "#657786",
  },
  editorBox: {
    marginTop: 16,
  },
  pickerRow: {
    flexDirection: "row",
  },
  picker: {
    flex: 1,
    height: 150,
  },
  multiSelectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  multiSelectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
  },
  multiSelectOptionSelected: {
    backgroundColor: "#6C5CE7",
    borderColor: "#6C5CE7",
  },
  multiSelectLabel: {
    color: "#333",
  },
  multiSelectLabelSelected: {
    color: "#fff",
  },
  radioRow: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#eee",
    borderRadius: 12,
  },
  radioRowSelected: {
    backgroundColor: "#6C5CE7",
  },
  radioLabel: {
    color: "#333",
    textAlign: "center",
  },
  radioLabelSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitBtn: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 5,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 25,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
});
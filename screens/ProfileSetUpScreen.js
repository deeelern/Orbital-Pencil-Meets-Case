// ./screens/ProfileSetupScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { auth, db } from "../FirebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

function ModernRadio({ label, selected, onPress, icon }) {
  return (
    <TouchableOpacity
      style={[
        styles.modernRadioContainer,
        selected && styles.modernRadioSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.modernRadioContent}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={selected ? "#6C5CE7" : "#74b9ff"}
            style={styles.radioIcon}
          />
        )}
        <Text
          style={[
            styles.modernRadioLabel,
            selected && styles.modernRadioLabelSelected,
          ]}
        >
          {label}
        </Text>
      </View>
      <View
        style={[
          styles.modernRadioButton,
          selected && styles.modernRadioButtonSelected,
        ]}
      >
        {selected && <View style={styles.modernRadioInner} />}
      </View>
    </TouchableOpacity>
  );
}

// Progress indicator component
function ProgressBar({ progress }) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <LinearGradient
          colors={["#6C5CE7", "#74b9ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress}%` }]}
        />
      </View>
      <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
    </View>
  );
}

// Section header component
function SectionHeader({ title, subtitle, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon && (
          <Ionicons
            name={icon}
            size={24}
            color="#6C5CE7"
            style={styles.sectionIcon}
          />
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function ProfileSetupScreen({ navigation, route }) {
  const params = route?.params || {};

  const [dob, setDob] = useState(() => {
    if (!params.dateOfBirth) return new Date();
    if (params.dateOfBirth.toDate) return params.dateOfBirth.toDate();
    const d = new Date(params.dateOfBirth);
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const [showDobPicker, setShowDobPicker] = useState(false);
  const onDobChange = (e, d) => {
    setShowDobPicker(Platform.OS === "ios");
    if (d) setDob(d);
  };
  const checkIs18 = (d) => {
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 18;
  };

  const [firstName, setFirstName] = useState(params.firstName || "");
  const [lastName, setLastName] = useState(params.lastName || "");
  const [myGender, setMyGender] = useState(params.gender || null);
  const [otherGender, setOtherGender] = useState("");

  const degrees = [
    "Bachelors",
    "Masters",
    "MBA",
    "PhD",
    "MD",
    "EdD",
    "Diploma",
    "Post-Tertiary",
    "Higher Nitec",
    "Nitec",
    "Post-Secondary",
  ];
  const [degree, setDegree] = useState(params.degree || null);
  const [school, setSchool] = useState(params.school || "");
  const [jobTitle, setJobTitle] = useState(params.jobTitle || "");

  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const heightRange = Array.from({ length: 300 }, (_, i) => 0 + i);
  const [heightCm, setHeightCm] = useState(params.heightCm || 160);

  const ethnicities = [
    "Asian",
    "Black/African",
    "Hispanic/Latino",
    "Middle Eastern",
    "White",
    "Indigenous",
    "Other",
  ];
  const [ethnicity, setEthnicity] = useState(params.ethnicity || null);
  const [otherEthnicity, setOtherEthnicity] = useState("");

  const religions = [
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
  const [religion, setReligion] = useState(params.religion || null);
  const [otherReligion, setOtherReligion] = useState("");

  const isEditing = route?.params?.fromEditProfile === true;

  const calculateProgress = () => {
    let filled = 0;
    const total = 10;

    if (dob && checkIs18(dob)) filled++;
    if (firstName.trim() && lastName.trim()) filled++;
    if (myGender) filled++;
    if (degree) filled++;
    if (school.trim()) filled++;
    if (jobTitle.trim()) filled++;
    if (heightCm) filled++;
    if (ethnicity) filled++;
    if (religion) filled++;

    return (filled / total) * 100;
  };

  const handleDone = async () => {
    if (!firstName.trim() || !lastName.trim())
      return Alert.alert(
        "Missing name",
        "Please enter both your first and last name."
      );
    if (!myGender)
      return Alert.alert("Missing gender", "Please select your gender.");
    if (!degree)
      return Alert.alert(
        "Missing degree",
        "Please select your highest degree."
      );
    if (!school.trim())
      return Alert.alert("Missing school", "Please enter where you studied.");
    if (!jobTitle.trim())
      return Alert.alert("Missing job title", "Please enter your job title.");
    if (!heightCm)
      return Alert.alert("Missing Height", "Please select your height.");
    if (!ethnicity)
      return Alert.alert("Missing ethnicity", "Please select your ethnicity.");
    if (!checkIs18(dob))
      return Alert.alert(
        "Too young",
        "You must be at least 18 years old to join!"
      );
    if (!religion)
      return Alert.alert("Missing religion", "Please select your religion.");

    navigation.navigate("ProfileSetUpPart2", {
      fromEditProfile: isEditing,
      fromMeScreen: route?.params?.fromMeScreen || false,
      prompts: route?.params.prompts || [],
      profile: {
        dateOfBirth: dob.toISOString(),
        firstName,
        lastName,
        gender: myGender,
        degree,
        school,
        jobTitle,
        heightCm,
        ethnicity: ethnicity === "Other" ? otherEthnicity : ethnicity,
        religion: religion === "Other" ? otherReligion : religion,
      },
      email: route?.params?.email,
      password: route?.params?.password,
    });
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
        <Text style={styles.headerTitle}>Set Up Profile</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ProgressBar progress={calculateProgress()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Birthday */}
          <View style={styles.section}>
            <SectionHeader
              title="When's your birthday?"
              subtitle="Your birthday is our secret—only your age appears on your profile."
              icon="calendar"
            />
            <TouchableOpacity
              style={styles.modernDateBtn}
              onPress={() => setShowDobPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6C5CE7" />
              <Text style={styles.modernDateText}>
                {dob.toLocaleDateString()}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#74b9ff" />
            </TouchableOpacity>
            {showDobPicker && (
              <DateTimePicker
                value={dob}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={onDobChange}
                style={styles.picker}
              />
            )}
          </View>

          {/* Name */}
          <View style={styles.section}>
            <SectionHeader title="What's your name?" icon="person" />
            <View style={styles.inputGroup}>
              <View style={styles.modernInputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#74b9ff"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="First name"
                  style={styles.modernInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholderTextColor="#a0a5aa"
                />
              </View>
              <View style={styles.modernInputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#74b9ff"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Last name"
                  style={styles.modernInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholderTextColor="#a0a5aa"
                />
              </View>
            </View>
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <SectionHeader title="What's your gender?" icon="male-female" />
            <View style={styles.optionsContainer}>
              {[
                { label: "Male", icon: "man" },
                { label: "Female", icon: "woman" },
                { label: "Other", icon: "transgender" },
              ].map((opt) => (
                <ModernRadio
                  key={opt.label}
                  label={opt.label}
                  icon={opt.icon}
                  selected={myGender === opt.label}
                  onPress={() => setMyGender(opt.label)}
                />
              ))}
            </View>
            {myGender === "Other" && (
              <View style={styles.modernInputContainer}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color="#74b9ff"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Please specify"
                  style={styles.modernInput}
                  value={otherGender}
                  onChangeText={setOtherGender}
                  placeholderTextColor="#a0a5aa"
                />
              </View>
            )}
          </View>

          {/* Education */}
          <View style={styles.section}>
            <SectionHeader title="Highest degree?" icon="school" />
            <View style={styles.optionsContainer}>
              {degrees.map((d) => (
                <ModernRadio
                  key={d}
                  label={d}
                  selected={degree === d}
                  onPress={() => setDegree(d)}
                />
              ))}
            </View>
          </View>

          {/* School */}
          <View style={styles.section}>
            <SectionHeader title="Where did you study?" icon="library" />
            <View style={styles.modernInputContainer}>
              <Ionicons
                name="library-outline"
                size={20}
                color="#74b9ff"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="e.g. NUS"
                style={styles.modernInput}
                value={school}
                onChangeText={setSchool}
                placeholderTextColor="#a0a5aa"
              />
            </View>
          </View>

          {/* Job */}
          <View style={styles.section}>
            <SectionHeader title="Your job title?" icon="briefcase" />
            <View style={styles.modernInputContainer}>
              <Ionicons
                name="briefcase-outline"
                size={20}
                color="#74b9ff"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="e.g. Student, Engineer"
                style={styles.modernInput}
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholderTextColor="#a0a5aa"
              />
            </View>
          </View>

          {/* Height */}
          <View style={styles.section}>
            <SectionHeader title="Height?" icon="resize" />
            <TouchableOpacity
              style={styles.modernDateBtn}
              onPress={() => setShowHeightPicker(!showHeightPicker)}
            >
              <Ionicons name="resize-outline" size={20} color="#6C5CE7" />
              <Text style={styles.modernDateText}>{heightCm} cm</Text>
              <Ionicons name="chevron-down" size={20} color="#74b9ff" />
            </TouchableOpacity>
            {showHeightPicker && (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  marginTop: 12,
                }}
              >
                <Picker
                  selectedValue={heightCm}
                  onValueChange={(itemValue) => setHeightCm(itemValue)}
                  itemStyle={{
                    height: 200,
                    fontSize: 20,
                    color: "#2f3640",
                  }}
                  style={{
                    height: 200,
                    width: "100%",
                  }}
                >
                  {heightRange.map((cm) => (
                    <Picker.Item key={cm} label={`${cm} cm`} value={cm} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Ethnicity */}
          <View style={styles.section}>
            <SectionHeader title="Your ethnicity?" icon="globe" />
            <View style={styles.optionsContainer}>
              {ethnicities.map((e) => (
                <ModernRadio
                  key={e}
                  label={e}
                  selected={ethnicity === e}
                  onPress={() => setEthnicity(e)}
                />
              ))}
            </View>
            {(ethnicity === "Other" || otherEthnicity.trim()) && (
              <View style={styles.modernInputContainer}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color="#74b9ff"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Please specify your ethnicity"
                  style={styles.modernInput}
                  value={otherEthnicity}
                  onChangeText={setOtherEthnicity}
                  placeholderTextColor="#a0a5aa"
                />
              </View>
            )}
          </View>

          {/* Religion */}
          <View style={styles.section}>
            <SectionHeader title="Your religion?" icon="star" />
            <View style={styles.optionsContainer}>
              {religions.map((r) => (
                <ModernRadio
                  key={r}
                  label={r}
                  selected={religion === r}
                  onPress={() => setReligion(r)}
                />
              ))}
            </View>
            {religion === "Other" && (
              <View style={styles.modernInputContainer}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color="#74b9ff"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Please specify"
                  style={styles.modernInput}
                  value={otherReligion}
                  onChangeText={setOtherReligion}
                  placeholderTextColor="#a0a5aa"
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.modernSubmitBtn} onPress={handleDone}>
          <LinearGradient
            colors={["#6C5CE7", "#74b9ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Text style={styles.modernSubmitText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
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
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  progressBackground: {
    height: 6,
    backgroundColor: "#e1e8ed",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    textAlign: "center",
    fontSize: 12,
    color: "#657786",
    marginTop: 8,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2f3640",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#657786",
    marginTop: 8,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 8,
  },
  modernRadioContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e1e8ed",
    backgroundColor: "#f8f9fa",
    marginBottom: 8,
  },
  modernRadioSelected: {
    borderColor: "#6C5CE7",
    backgroundColor: "#f3f2ff",
  },
  modernRadioContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioIcon: {
    marginRight: 12,
  },
  modernRadioLabel: {
    fontSize: 16,
    color: "#2f3640",
    fontWeight: "500",
  },
  modernRadioLabelSelected: {
    color: "#6C5CE7",
    fontWeight: "600",
  },
  modernRadioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e1e8ed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  modernRadioButtonSelected: {
    borderColor: "#6C5CE7",
  },
  modernRadioInner: {
    backgroundColor: "#6C5CE7",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inputGroup: {
    gap: 16,
  },
  modernInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e1e8ed",
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: "#2f3640",
    fontWeight: "500",
  },
  modernDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e1e8ed",
    paddingHorizontal: 16,
    height: 56,
    justifyContent: "space-between",
  },
  modernDateText: {
    fontSize: 16,
    color: "#2f3640",
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  picker: {
    width: "100%",
    height: 150,
    marginTop: 16,
  },
  modernPickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e1e8ed",
    paddingHorizontal: 16,
  },
  modernPicker: {
    flex: 1,
    height: 56,
  },
  pickerItem: {
    fontSize: 16,
    color: "#2f3640",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  modernSubmitBtn: {
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  modernSubmitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
});

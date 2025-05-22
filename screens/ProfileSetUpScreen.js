// ./screens/ProfileSetupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

import { auth, db } from '../FirebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function ProfileSetupScreen({ navigation }) {
  const user = auth.currentUser;
  const uid  = user?.uid;

  // --- form state ---
  const [gender, setGender] = useState('');             // e.g. "Male", "Female", "Non-binary"
  const [dob, setDob]       = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);  // enter as "YYYY-MM-DD"

  const [prefGenders, setPrefGenders] = useState('');   // comma-separated list
  const [minAge, setMinAge] = useState(18);             // min 18
  const [maxAge, setMaxAge] = useState(30);             // max 30
  const [loading, setLoading] = useState(false);

  const togglePref = option => {
    setPrefGenders(arr =>
      arr.includes(option)
        ? arr.filter(g => g !== option)
        : [...arr, option]
    );
  };
  
  const onChangeDob = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if  (selectedDate) {
        setDob(selectedDate);
    }
  };

  const checkIs18 = date => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        age--;
    }
    return age >= 18;
  };

  const handleSubmit = async () => {
    if (!gender) {
        return Alert.alert('Please select your gender');
    }
    if (!checkIs18(dob)) {
        return Alert.alert('You must be at least 18 years old!')
    }
    if (prefGenders.length === 0) {
      return Alert.alert('Select at least one preferred gender!');
    }
    if (minAge > maxAge) {
        return Alert.alert('Minimum Age cannot be greater than Maximum Age!');
    }
    if (!uid) {
      return Alert.alert('Not signed in');
    }

    setLoading(true);
    try {
      const preferences = {
        preferredGenders: prefGenders,
        ageRange: {
          min: minAge,
          max: maxAge
        }
      };

      // write into Firestore under /users/{uid}
      await setDoc(
        doc(db, 'users', uid),
        {
          gender,
          dateOfBirth: dob,
          preferences,
          profileSetupAt: serverTimestamp()
        },
        { merge: true }      // keep any existing fields (like email)
      );

      // navigate to your main app
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Error saving profile', err.message);
    } finally {
      setLoading(false);
    }
  };

  const ages = Array.from({ length: 82 }, (_, i) => 18 + i);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Tell us about yourself</Text>

       <View style={styles.row}>
        {['Male','Female'].map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.genderButton,
              gender === option && styles.genderButtonSelected
            ]}
            onPress={() => setGender(option)}
          >
            <Text
              style={[
                styles.genderText,
                gender === option && styles.genderTextSelected
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.dateInput}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.dateText}>
          {dob.toISOString().slice(0,10)}  {/* YYYY-MM-DD */}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={dob}
          mode="date"
          display="spinner"
          maximumDate={new Date()}      // no future dates
          onChange={onChangeDob}
          style={styles.picker}
        />
      )}

      <Text style={styles.sectionTitle}>Your Preferences</Text>

<Text style={styles.sectionTitle}>Preferred Genders</Text>
      <View style={styles.row}>
        {['Male','Female'].map(opt => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.genderButton,
              prefGenders.includes(opt) && styles.genderButtonSelected
            ]}
            onPress={() => togglePref(opt)}
          >
            <Text
              style={[
                styles.genderText,
                prefGenders.includes(opt) && styles.genderTextSelected
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Age Range</Text>
      <View style={styles.pickerRow}>
        <Picker
          style={styles.agePicker}
          selectedValue={minAge}
          onValueChange={v => setMinAge(v)}
        >
          {ages.map(a => (
            <Picker.Item key={a} label={`${a}`} value={a} />
          ))}
        </Picker>
        <Picker
          style={styles.agePicker}
          selectedValue={maxAge}
          onValueChange={v => setMaxAge(v)}
        >
          {ages.map(a => (
            <Picker.Item key={a} label={`${a}`} value={a} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Save Profile</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { padding: 20, paddingBottom: 40 },
  heading:       { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  row:           { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  genderButton:  {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    alignItems: 'center'
  },
  genderButtonSelected: { backgroundColor: '#000', borderColor: '#000' },
  genderText:          { fontSize: 16, color: '#000' },
  genderTextSelected:  { color: '#fff' },

  dateInput:  {
    height: 50, borderWidth: 1, borderColor: '#888',
    borderRadius: 8, justifyContent: 'center',
    paddingHorizontal: 12, marginBottom: 16
  },
  dateText:   { fontSize: 16, color: '#000' },
  picker:     { backgroundColor: '#fff', marginBottom: 16, height: 150 },

  sectionTitle:      { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 8 },

  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  agePicker: {
    flex: 1,
    height: 150,
    marginHorizontal: 4
  },

  input: {
    height: 50, borderColor: '#ccc', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, fontSize: 16,
    marginBottom: 16
  },
  button: {
    backgroundColor: '#000', height: 50,
    borderRadius: 8, justifyContent: 'center',
    alignItems: 'center', marginTop: 16
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
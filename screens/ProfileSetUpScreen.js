// ./screens/ProfileSetupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from '../FirebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Radio button component
function Radio({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={styles.radioRow} onPress={onPress}>
      <Text style={styles.radioLabel}>{label}</Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterSel]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileSetupScreen({ navigation, route }) {
  const params = route?.params || {};

  // 1) Who you want to date?
  const [datePref, setDatePref] = useState(params.datePref || null);

  // 2) Birthday
  const [dob, setDob] = useState(() => {
    if (!params.dateOfBirth) return new Date();
    if (params.dateOfBirth.toDate) return params.dateOfBirth.toDate(); // Timestamp
    const d = new Date(params.dateOfBirth);
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const [showDobPicker, setShowDobPicker] = useState(false);
  const onDobChange = (e, d) => {
    setShowDobPicker(Platform.OS === 'ios');
    if (d) setDob(d);
  };
  const checkIs18 = d => {
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 18;
  };

  // 3) Name
  const [firstName, setFirstName] = useState(params.firstName || '');
  const [lastName, setLastName] = useState(params.lastName || '');

  // 4) Your gender
  const [myGender, setMyGender] = useState(params.gender || null);
  const [otherGender, setOtherGender] = useState('');

  // 5) Highest degree
  const degrees = ['Bachelors','Masters','MBA','PhD','MD','EdD','Diploma', 'Post-Tertiary', 'Higher Nitec', 'Nitec', 'Post-Secondary'];
  const [degree, setDegree] = useState(params.degree || null);

  // 6) School
  const [school, setSchool] = useState(params.school || '');

  // 7) Job title
  const [jobTitle, setJobTitle] = useState(params.jobTitle || '');

  // 8) Height in cm
  const heightRange = Array.from({ length: 300 }, (_, i) => 0 + i);
  const [heightCm, setHeightCm] = useState(params.heightCm || 160);

  // 9) Ethnicity
  const ethnicities = ['Asian','Black/African','Hispanic/Latino','Middle Eastern','White','Indigenous'];
  const [ethnicity, setEthnicity] = useState(params.ethnicity || null);
  const [otherEthnicity, setOtherEthnicity] = useState('');

  // 10) Religion
  const religions = ['Buddhist','Christian','Catholic','Hindu','Jewish','Muslim','Sikh','Taoist','Atheist','Other'];
  const [religion, setReligion] = useState(params.religion || null);
  const [otherReligion, setOtherReligion] = useState('');

  const handleDone = async () => {
    if (!datePref) return Alert.alert('Missing field', 'Please choose who you want to date.');
    if (!firstName.trim() || !lastName.trim()) return Alert.alert('Missing name', 'Please enter both your first and last name.');
    if (!myGender) return Alert.alert('Missing gender', 'Please select your gender.');
    if (!degree) return Alert.alert('Missing degree', 'Please select your highest degree.');
    if (!school.trim()) return Alert.alert('Missing school', 'Please enter where you studied.');
    if (!jobTitle.trim()) return Alert.alert('Missing job title', 'Please enter your job title.');
    if (!heightCm) return Alert.alert('Missing Height', 'Please select your height.');
    if (!ethnicity) return Alert.alert('Missing ethnicity', 'Please select your ethnicity.');
    if (!checkIs18(dob)) return Alert.alert('Too young', 'You must be at least 18 years old to join!');
    if (!religion) return Alert.alert('Missing religion', 'Please select your religion.');

    const payload = {
      datePref,
      dateOfBirth: dob,
      firstName,
      lastName,
      gender: myGender,
      degree,
      school,
      jobTitle,
      heightCm,
      ethnicity: otherEthnicity || ethnicity,
      religion: religion === 'Other' ? otherReligion : religion,
      profileSetupAt: serverTimestamp(),
    };

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');
      const uid = user.uid;

      await setDoc(doc(db, 'users', uid), payload, { merge: true });
      console.log('Profile saved:', payload);
      navigation.replace('ProfileSetUpPart2', {
        fromEditProfile: true,
        fromMeScreen: params.fromMeScreen || false,
        prompts: params.prompts || []
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error saving profile', err.message);
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.h1}>Who do you want to date?</Text>
        {['Women','Men','Everyone'].map(opt => (
          <Radio key={opt} label={opt} selected={datePref===opt} onPress={()=>setDatePref(opt)} />
        ))}

        <Text style={styles.h1}>Right on. When’s your birthday?</Text>
        <Text style={styles.sub}>
          Your birthday is our secret—only your age appears on your profile.
        </Text>
        <TouchableOpacity style={styles.dateBtn} onPress={()=>setShowDobPicker(true)}>
          <Text style={styles.dateText}>{dob.toLocaleDateString()}</Text>
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

        <Text style={styles.h1}>What’s your name?</Text>
        <TextInput placeholder="First name" style={styles.input} value={firstName} onChangeText={setFirstName} />
        <TextInput placeholder="Last name" style={styles.input} value={lastName} onChangeText={setLastName} />

        <Text style={styles.h1}>What’s your gender?</Text>
        {['Male','Female','Other'].map(opt => (
          <Radio key={opt} label={opt} selected={myGender === opt} onPress={() => setMyGender(opt)} />
        ))}
        {myGender === 'Other' && (
          <TextInput placeholder="Please specify" style={styles.input} value={otherGender} onChangeText={setOtherGender} />
        )}

        <Text style={styles.h1}>Highest degree?</Text>
        {degrees.map(d => (
          <Radio key={d} label={d} selected={degree === d} onPress={() => setDegree(d)} />
        ))}

        <Text style={styles.h1}>Where did you study?</Text>
        <TextInput placeholder="e.g. NUS" style={styles.input} value={school} onChangeText={setSchool} />

        <Text style={styles.h1}>Your job title?</Text>
        <TextInput placeholder="e.g. Student, Engineer" style={styles.input} value={jobTitle} onChangeText={setJobTitle} />

        <Text style={styles.h1}>Height?</Text>
        <View style={styles.pickerRow}>
          <Picker style={styles.agePicker} selectedValue={heightCm} onValueChange={v => setHeightCm(v)}>
            {heightRange.map(cm => (
              <Picker.Item key={cm} label={`${cm} cm`} value={cm} />
            ))}
          </Picker>
        </View>

        <Text style={styles.h1}>Your ethnicity?</Text>
        {ethnicities.map(e => (
          <Radio key={e} label={e} selected={ethnicity === e} onPress={() => setEthnicity(e)} />
        ))}
        <TextInput placeholder="Other (e.g. Punjabi)" style={styles.input} value={otherEthnicity} onChangeText={setOtherEthnicity} />

        <Text style={styles.h1}>Your religion?</Text>
        {religions.map(r => (
          <Radio key={r} label={r} selected={religion === r} onPress={() => setReligion(r)} />
        ))}
        {religion === 'Other' && (
          <TextInput placeholder="Please specify" style={styles.input} value={otherReligion} onChangeText={setOtherReligion} />
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleDone}>
          <Text style={styles.submitText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 20, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  sub: { fontSize: 14, color: '#555', marginBottom: 12 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE'
  },
  radioLabel: { fontSize: 16, color: '#333' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioOuterSel: { borderColor: '#0066FF' },
  radioInner: {
    backgroundColor: '#0066FF',
    width: 12,
    height: 12,
    borderRadius: 6
  },
  dateBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 16
  },
  dateText: { fontSize: 16, color: '#333' },
  picker: { width: '100%', height: 150, marginBottom: 16 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  agePicker: { flex: 1, height: 150, marginHorizontal: 4 },
  submitBtn: {
    backgroundColor: '#0066FF',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});

// ./screens/ProfileSetupScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Alert } from 'react-native';
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

export default function ProfileSetupScreen({ navigation }) {
  // 1) Who you want to date?
  const [datePref, setDatePref] = useState(null);

  // 2) Birthday
  const [dob, setDob] = useState(new Date());
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
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');

  // 4) Your gender
  const [myGender, setMyGender] = useState(null);
  const [showMoreGenders, setShowMoreGenders] = useState(false);

  // 5) Highest degree
  const degrees = ['Bachelors','Masters','MBA','PhD','MD','EdD',
    'Diploma', 'Post-Tertiary', 'Higher Nitec', 'Nitec', 'Post-Secondary'
  ];
  const [degree, setDegree] = useState(null);

  // 6) School
  const [school, setSchool] = useState('');

  // 7) Job title
  const [jobTitle, setJobTitle] = useState('');

  // 8) Height in cm
  const heightRange = Array.from({ length: 300 }, (_, i) => 0 + i); // 140–220 cm
  const [heightCm, setHeightCm] = useState(160);

  // 9) Ethnicity (single for now)
  const ethnicities = [
    'Asian','East Asian','South Asian','Southeast Asian',
    'Black/African','Hispanic/Latino','Middle Eastern','Indigenous'
  ];
  const [ethnicity, setEthnicity] = useState(null);
  const [otherEthnicity, setOtherEthnicity] = useState('');

  // 10) Religion
  const religions = ['Buddhist','Christian','Catholic','Hindu','Jewish','Muslim','Sikh','Shinto','Other'];
  const [religion, setReligion] = useState(null);
  const [otherReligion, setOtherReligion] = useState('');

  // finally “Done”
  const handleDone = async () => {
    // validate and write to Firestore here...
    if (!datePref) {
      return Alert.alert('Missing field', 'Please choose who you want to date.');
    }
    if (!firstName.trim() || !lastName.trim()) {
      return Alert.alert('Missing name', 'Please enter both your first and last name.');
    }
    if (!myGender) {
      return Alert.alert('Missing gender', 'Please select your gender.');
    }
    if (!degree) {
      return Alert.alert('Missing degree', 'Please select your highest degree.');
    }
    if (!school.trim()) {
      return Alert.alert('Missing school', 'Please enter where you studied.');
    }
    if (!jobTitle.trim()) {
      return Alert.alert('Missing job title', 'Please enter your job title.');
    }
    if (!heightCm) {
      return Alert.alert('Missing Height', 'Please select your height.');
    }
    if (!ethnicity) {
      return Alert.alert('Missing ethnicity', 'Please select your ethnicity.');
    }
    if (!checkIs18(dob)) {
      return Alert.alert('Too young', 'You must be at least 18 years old to join!');
    }
    if (!religion) {
      return Alert.alert('Missing religion', 'Please select your religion.');
    }

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
       // get the user id
       const user = auth.currentUser;
       if (!user) throw new Error('Not signed in');
       const uid = user.uid;
  
       // write (merge) into /users/{uid}
       await setDoc(
         doc(db, 'users', uid),
         payload,
         { merge: true }
        );
 
       console.log('Profile saved:', payload);
       // move on to Part 2
       navigation.replace('ProfileSetUpPart2');
     } catch (err) {
       console.error(err);
       Alert.alert('Error saving profile', err.message);
     }
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.container}>

        {/* 1) Who do you want to date? */}
        <Text style={styles.h1}>Who do you want to date?</Text>
        {['Women','Men','Everyone'].map(opt => (
          <Radio
            key={opt}
            label={opt}
            selected={datePref===opt}
            onPress={()=>setDatePref(opt)}
          />
        ))}

        {/* 2) Birthday */}
        <Text style={styles.h1}>Right on. When’s your birthday?</Text>
        <Text style={styles.sub}>
          Your birthday is our secret—only your age appears on your profile.
        </Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={()=>setShowDobPicker(true)}
        >
          <Text style={styles.dateText}>
            {dob.toLocaleDateString()}
          </Text>
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

        {/* 3) Name */}
        <Text style={styles.h1}>You can call us PMC—what’s your name?</Text>
        <Text style={styles.sub}>
          Only first names get shared with matches & you can’t change it later.
        </Text>
        <TextInput
          placeholder="First name"
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          placeholder="Last name"
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
        />

        {/* 4) Your gender */}
        <Text style={styles.h1}>What’s your gender?</Text>
        <Text style={styles.sub}>
          Your gender stays hidden and can’t be changed later.
        </Text>
        {['Woman','Man'].map(opt=>(
          <Radio
            key={opt}
            label={opt}
            selected={myGender===opt}
            onPress={()=>setMyGender(opt)}
          />
        ))}
        <TouchableOpacity
          onPress={()=>setShowMoreGenders(!showMoreGenders)}
        >
          <Text style={styles.link}>
            {showMoreGenders ? 'Hide extra options' : 'Show me more'}
          </Text>
        </TouchableOpacity>
        {showMoreGenders && (
          <Text style={styles.sub}>…extra gender fields here…</Text>
        )}

        {/* 5) Highest degree */}
        <Text style={styles.h1}>What’s the highest degree you’ve earned?</Text>
        <Text style={styles.sub}>
          Add your degree to get seen by matches who filter by education.
        </Text>
        {degrees.map(d => (
          <Radio
            key={d}
            label={d}
            selected={degree===d}
            onPress={()=>setDegree(d)}
          />
        ))}

        {/* 6) Where did you study? */}
        <Text style={styles.h1}>Where did you study?</Text>
        <TextInput
          placeholder="e.g. National University of Singapore"
          style={styles.input}
          value={school}
          onChangeText={setSchool}
        />

        {/* 7) What’s your job title? */}
        <Text style={styles.h1}>What’s your job title?</Text>
        <TextInput
          placeholder="e.g. Student, Software Engineer"
          style={styles.input}
          value={jobTitle}
          onChangeText={setJobTitle}
        />

        {/* 8) Height (cm) */}
        <Text style={styles.h1}>Almost there! Mind sharing your height?</Text>
        <Text style={styles.sub}>
          Height helps us suggest the best matches.
        </Text>
        <View style={styles.pickerRow}>
        <Picker
          style={styles.agePicker}
          selectedValue={heightCm}
          onValueChange={v => setHeightCm(v)}
        >
        {heightRange.map(cm => (
         <Picker.Item key={cm} label={`${cm} cm`} value={cm} />
            ))}
          </Picker>
        </View>

        {/* 9) Ethnicity */}
        <Text style={styles.h1}>What’s your ethnicity?</Text>
        <Text style={styles.sub}>
          This controls how you show up in filtered results. Check all that apply.
        </Text>
        {ethnicities.map(e=>(
          <Radio
            key={e}
            label={e}
            selected={ethnicity===e}
            onPress={()=>setEthnicity(e)}
          />
        ))}
        <TextInput
          placeholder="Other (e.g. Punjabi, Pasifika)"
          style={styles.input}
          value={otherEthnicity}
          onChangeText={setOtherEthnicity}
        />

        {/* 10) Religion */}
        <Text style={styles.h1}>What’s your religion?</Text>
        {religions.map(r=>(
          <Radio
            key={r}
            label={r}
            selected={religion===r}
            onPress={()=>setReligion(r)}
          />
        ))}
        {religion === 'Other' && (
          <TextInput
            placeholder="Please specify"
            style={styles.input}
            value={otherReligion}
            onChangeText={setOtherReligion}
          />
        )}

        {/* Next */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleDone}
        >
          <Text style={styles.submitText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },

  h1:  { fontSize: 20, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  sub: { fontSize: 14, color: '#555', marginBottom: 12 },

  // text inputs
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16
  },

  // radio rows
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
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC'
  },
  radioOuterSel: {
    borderColor: '#0066FF'
  },
  radioInner: {
    backgroundColor: '#0066FF',
    width: 12, height: 12,
    borderRadius: 6,
    position: 'absolute', top: 3, left: 3
  },

  // date picker btn
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
  picker:   { width: '100%', height: 150, marginBottom: 16 },

  // dual picker row
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  agePicker: { flex: 1, height: 150, marginHorizontal: 4 },

  // link-style text
  link: { color: '#0066FF', fontSize: 15, marginVertical: 8, textAlign: 'right' },

  // submit
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

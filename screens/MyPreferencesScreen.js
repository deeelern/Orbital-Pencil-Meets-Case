// ./screens/MyPreferencesScreen.js

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from '../FirebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Reusable “radio‐button” row
function RadioRow({ options, value, onChange }) {
  return (
    <View style={styles.editorContainer}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.radioRow,
            value === opt && styles.radioRowSelected,
          ]}
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

export default function MyPreferencesScreen({ navigation }) {
  const user = auth.currentUser;
  const uid  = user?.uid;

  // --- preferences state ---
  const [gender, setGender]       = useState('Everyone');
  const [ageMin, setAgeMin]       = useState(18);
  const [ageMax, setAgeMax]       = useState(99);
  const [distance, setDistance]   = useState(1);    // km
  const [ethnicity, setEthnicity] = useState('All');
  const [religion, setReligion]   = useState('All');
  const [goals, setGoals]         = useState('All');
  const [heightMin, setHeightMin] = useState(0);
  const [heightMax, setHeightMax] = useState(299);
  const [education, setEducation] = useState('Diploma');
  const [smoking, setSmoking]     = useState('Not at all');
  const [drinking, setDrinking]   = useState('Not at all');

  // --- which row is being edited ---
  const [editing, setEditing] = useState(null);

  // helper arrays
  const ages      = Array.from({ length: 82 }, (_,i) => 18 + i);
  const kmOptions = [1,10,20,50,100];
  const ethnicOpts = ['All','Asian','East Asian','South Asian','Southeast Asian',
    'Black/African','Hispanic/Latino','Middle Eastern','Indigenous','Other'];
  const relOpts   = ['All','None','Buddhist','Christian','Catholic','Hindu',
    'Jewish','Muslim','Sikh','Shinto','Other'];
  const goalOpts  = ['All','Friendship','Dating','Long-term','Marriage'];
  const heightRange = Array.from({ length: 300 }, (_,i) => 0 + i); // 140–210 cm
  const educOpts   = ['High School','Diploma','Nitec','Higher Nitec','Post Secondary','Bachelors','Masters','PhD'];
  const smokeOpts  = ['Not at all','Open to it'];
  const drinkOpts  = ['Not at all','Open to it'];

  // save & navigate home
  const handleDone = async () => {
    if (!uid) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }
    if (ageMin > ageMax) {
      Alert.alert('Invalid age range', 'Min age cannot exceed Max age.');
      return;
    }
    if (heightMin > heightMax) {
      Alert.alert('Invalid height range', 'Min height cannot exceed Max height.');
      return;
    }
    const prefsPayload = {
      gender,
      ageRange: { min: ageMin, max: ageMax },
      distanceKm: distance,
      ethnicity,
      religion,
      goals,
      heightRange:   { min: heightMin, max: heightMax }, // cm
      educationLevel: education,                         // this and above
      smoking,
      drinking,
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(
        doc(db, 'users', uid),
        { preferences: prefsPayload },
        { merge: true }
      );
      // replace the stack so Home is the new root
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Error saving preferences', err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
    {/* 1) Header & subheader go here */}
      <Text style={styles.header}>What’s your type?</Text>
      <Text style={styles.subheader}>
        Preferences help us better find your match.
      </Text>
      {[
        {
          key: 'Gender',
          value: gender,
          editor: (
            <RadioRow
              options={['Women','Men','Everyone']}
              value={gender}
              onChange={setGender}
            />
          )
        },
        {
          key: 'Age',
          value: `${ageMin} – ${ageMax}`,
          editor: (
            <View style={styles.pickerRow}>
              <Picker
                style={styles.picker}
                selectedValue={ageMin}
                onValueChange={setAgeMin}
              >
                {ages.map(a => (
                  <Picker.Item key={a} label={`${a}`} value={a} />
                ))}
              </Picker>
              <Picker
                style={styles.picker}
                selectedValue={ageMax}
                onValueChange={setAgeMax}
              >
                {ages.map(a => (
                  <Picker.Item key={a} label={`${a}`} value={a} />
                ))}
              </Picker>
            </View>
          )
        },
        {
          key: 'Distance',
          value: `${distance} km`,
          editor: (
            <Picker
              style={styles.picker}
              selectedValue={distance}
              onValueChange={setDistance}
            >
              {kmOptions.map(km => (
                <Picker.Item key={km} label={`${km} km`} value={km} />
              ))}
            </Picker>
          )
        },
        {
          key: 'Ethnicity',
          value: ethnicity,
          editor: (
            <Picker
              style={styles.picker}
              selectedValue={ethnicity}
              onValueChange={setEthnicity}
            >
              {ethnicOpts.map(e => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          )
        },
        {
          key: 'Religion',
          value: religion,
          editor: (
            <View>
              <RadioRow
                options={relOpts}
                value={religion}
                onChange={setReligion}
              />
              {religion === 'Other' && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter your religion"
                  value={religion === 'Other' ? '' : religion}
                  onChangeText={setReligion}
                />
              )}
            </View>
          )
        },
        {
          key: 'Relationship Goals',
          value: goals,
          editor: (
            <Picker
              style={styles.picker}
              selectedValue={goals}
              onValueChange={setGoals}
            >
              {goalOpts.map(g => (
                <Picker.Item key={g} label={g} value={g} />
              ))}
            </Picker>
          )
        },
        {
          key: 'Height (cm)',
          value: `${heightMin} – ${heightMax}`,
          editor: (
            <View style={styles.pickerRow}>
              <Picker style={styles.picker} selectedValue={heightMin} onValueChange={setHeightMin}>
                {heightRange.map(h => <Picker.Item key={h} label={`${h}`} value={h}/> )}
              </Picker>
              <Picker style={styles.picker} selectedValue={heightMax} onValueChange={setHeightMax}>
                {heightRange.map(h => <Picker.Item key={h} label={`${h}`} value={h}/> )}
              </Picker>
            </View>
          )
        },
        {
          key: 'Education',
          value: `${education} & above`,
          editor: (
            <RadioRow options={educOpts} value={education} onChange={setEducation}/>
          )
        },
        {
          key: 'Smoking',
          value: smoking,
          editor: (
            <RadioRow options={smokeOpts} value={smoking} onChange={setSmoking}/>
          )
        },
        {
          key: 'Drinking',
          value: drinking,
          editor: (
            <RadioRow options={drinkOpts} value={drinking} onChange={setDrinking}/>
          )
        }
      ].map(({ key, value, editor }) => (
        <View key={key} style={styles.rowContainer}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setEditing(editing === key ? null : key)}
          >
            <Text style={styles.rowLabel}>{key}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </TouchableOpacity>

          {editing === key && (
            <View style={styles.editor}>
              {editor}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setEditing(null)}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneText}>I’m done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff', padding: 20 },

  header:       {
    fontSize:    24,
    fontWeight:  '600',
    marginBottom: 4
  },
  subheader:    {
    fontSize:     14,
    color:       '#555',
    marginBottom: 16
  },

  rowContainer:  { marginBottom: 12 },
  row: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingVertical:  12,
    borderBottomWidth:1,
    borderColor:      '#EEE',
  },
  rowLabel:  { fontSize: 16, color: '#333' },
  rowValue:  { fontSize: 14, color: '#777' },

  editor:           { backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, marginTop: 8 },
  editorContainer:  { marginBottom: 12 },

  radioRow:         { flexDirection: 'row', justifyContent: 'center', padding: 8, borderWidth: 1, borderColor: '#CCC', borderRadius: 6, marginHorizontal: 4 },
  radioRowSelected: { backgroundColor: '#0066FF', borderColor: '#0066FF' },
  radioLabel:       { color: '#333' },
  radioLabelSelected:{ color: '#fff' },

  pickerRow:        { flexDirection: 'row' },
  picker:           { flex: 1, height: 150, marginBottom: 16 },

  input:            { height: 48, borderWidth: 1, borderColor: '#CCC', borderRadius: 6, paddingHorizontal: 12, marginTop: 8 },

  saveButton:       { marginTop: 8, alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#0066FF', borderRadius: 6 },
  saveText:         { color: '#fff', fontWeight: '600' },

  doneButton:       { marginTop: 32, backgroundColor: '#000', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  doneText:         { color: '#fff', fontSize: 16, fontWeight: '600' },
});

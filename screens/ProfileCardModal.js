import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileCardModal({ visible, onClose, user }) {
  if (!user) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const screenWidth = Dimensions.get('window').width;
  const modalWidth = screenWidth * 0.9;
  const imageWidth = modalWidth;

  const handleMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / imageWidth);
    setActiveIndex(index);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width: modalWidth }]}>
          
          {/* Image carousel wrapper */}
          <View style={styles.carouselWrapper}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              ref={scrollRef}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              contentContainerStyle={{ alignItems: 'center' }}
              style={{ width: modalWidth }}
            >
              {user.photos?.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={[styles.profileImage, { width: imageWidth }]} />
              ))}
            </ScrollView>

            {/* Floating close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.dotContainer}>
            {user.photos?.map((_, index) => (
              <View key={index} style={[styles.dot, activeIndex === index && styles.activeDot]} />
            ))}
          </View>

          <Text style={styles.nameText}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.subText}>{user.degree} • {user.school}</Text>
          <Text style={styles.subText}>{user.jobTitle}</Text>
          <Text style={styles.subText}>Height: {user.heightCm} cm</Text>
          <Text style={styles.subText}>{user.gender} • {user.ethnicity} • {user.religion}</Text>

          <Text style={styles.sectionTitle}>Prompts:</Text>
          {user.prompts?.map((promptObj, idx) => (
            <View key={idx} style={styles.promptContainer}>
              <Text style={styles.promptQuestion}>{promptObj.prompt}</Text>
              <Text style={styles.promptAnswer}>{promptObj.answer}</Text>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', overflow: 'hidden' },
  carouselWrapper: { width: '100%', position: 'relative' },
  profileImage: { height: 300, borderRadius: 15 },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 20
  },
  dotContainer: { flexDirection: 'row', marginVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#333' },
  nameText: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  subText: { fontSize: 16, color: '#555', marginVertical: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, alignSelf: 'flex-start' },
  promptContainer: { marginVertical: 5, alignSelf: 'flex-start', width: '100%' },
  promptQuestion: { fontSize: 16, fontWeight: '600', color: '#222' },
  promptAnswer: { fontSize: 15, color: '#555', marginTop: 2 }
});
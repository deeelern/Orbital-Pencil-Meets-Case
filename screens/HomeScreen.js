import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Touchable, TouchableOpacity } from 'react-native';
import { auth } from '../FirebaseConfig';

export default function HomeScreen({ navigation }) {
    const handleSignOut = async () => {
        try {
            await auth.signOut();
            navigation.replace('Login');
        } catch (err) {
            Alert.alert('Sign out failed', err.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.heading}>Welcome Back!</Text>
            <Text>This is the app’s main screen!</Text>

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>

             <View style={styles.bottomPanel}>
                <TouchableOpacity
                    style={styles.tabButton}
                    onPress={() => navigation.navigate('Chat')}
                >
                <Text style={styles.tabText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabButton}
                    onPress={() => navigation.navigate('Meet')}
                >
                <Text style={styles.tabText}>Meet!</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabButton}
                    onPress={() => navigation.navigate('Me')}
                >
                <Text style={styles.tabText}>Me</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    color: '#333',
  },
});

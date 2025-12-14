import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, SafeAreaView, TextInput } from 'react-native';
import SongList from './components/SongList';
import AddSongForm from './components/AddSongForm';
import { sync } from './model/sync';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSync = async () => {
    try {
      await sync();
      alert('Sync finished!');
    } catch (error) {
      alert('Sync failed: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Magic Mic</Text>
        <Button title="Sync" onPress={handleSync} />
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <AddSongForm />
      <SongList searchQuery={searchQuery} />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 10,
    backgroundColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
});

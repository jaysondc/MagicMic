import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SongList from '../components/SongList';
import TagFilter from '../components/TagFilter';
import { initDatabase, getSongs, getTags, resetDatabase, seedDatabase, runMigrations } from '../lib/database';
import { seedData } from '../lib/seedData';
import { theme } from '../lib/theme';

export default function HomeScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [songs, setSongs] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

    useEffect(() => {
        initDatabase();
        runMigrations(); // Add missing columns to existing databases
        loadData();
    }, []);

    useEffect(() => {
        loadSongs();
    }, [searchQuery]);

    // Reload data when screen comes into focus (e.g. after adding a song)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadData = () => {
        loadSongs();
        loadTags();
    };

    const loadSongs = () => {
        const allSongs = getSongs(searchQuery);
        setSongs(allSongs);
    };

    const loadTags = () => {
        const allTags = getTags();
        setTags(allTags);
    };

    const handleToggleTag = (tagId) => {
        setSelectedTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            }
            return [...prev, tagId];
        });
    };

    const handleSeed = () => {
        try {
            resetDatabase();
            seedDatabase(seedData);
            loadData();
            alert('Database seeded successfully!');
        } catch (error) {
            alert('Error seeding database: ' + error.message);
        }
    };

    // Filter songs by selected tags
    const filteredSongs = selectedTags.length > 0
        ? songs.filter(song =>
            song.tags && song.tags.some(tag => selectedTags.includes(tag.id))
        )
        : songs;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>KaraokeVault</Text>
                <View style={styles.headerButtons}>
                    <Button title="Seed" onPress={handleSeed} color={theme.colors.secondary} />
                    <View style={styles.buttonSpacer} />
                    <Button title="Add Song" onPress={() => navigation.navigate('AddSong')} color={theme.colors.primary} />
                </View>
            </View>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search songs..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            <TagFilter
                tags={tags}
                selectedTags={selectedTags}
                onToggleTag={handleToggleTag}
                onTagsChanged={loadTags}
            />
            <SongList
                songs={filteredSongs}
                onSongPress={(song) => navigation.navigate('SongDetails', { songId: song.id })}
            />
            <StatusBar style="light" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.m,
    },
    headerButtons: {
        flexDirection: 'row',
    },
    buttonSpacer: {
        width: 10,
    },
    title: {
        ...theme.textVariants.header,
        fontSize: 20,
    },
    searchContainer: {
        paddingBottom: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        backgroundColor: theme.colors.background,
    },
    searchInput: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
});

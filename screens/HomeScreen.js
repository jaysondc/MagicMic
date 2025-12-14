import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { usePreview } from '../context/PreviewContext';
import SongList from '../components/SongList';
import TagFilter from '../components/TagFilter';
import { initDatabase, getSongs, getTags, resetDatabase, seedDatabase, runMigrations } from '../lib/database';
import { seedData } from '../lib/seedData';
import { theme } from '../lib/theme';
import { useToast } from '../context/ToastContext';
import FloatingActionButton from '../components/FloatingActionButton';
import SortBottomSheet from '../components/SortBottomSheet';


export default function HomeScreen({ navigation, route }) {
    const { showToast } = useToast();
    const { stopPreview } = usePreview();

    useFocusEffect(
        useCallback(() => {
            return () => stopPreview();
        }, [])
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [songs, setSongs] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

    // Sort State
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    const [sortSheetVisible, setSortSheetVisible] = useState(false);

    useEffect(() => {
        initDatabase();
        runMigrations(); // Add missing columns to existing databases
        loadData();
    }, []);

    useEffect(() => {
        loadSongs();
    }, [searchQuery, sortBy, sortOrder]);

    // Reload data when screen comes into focus (e.g. after adding a song or returning from details)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        return unsubscribe;
    }, [navigation, searchQuery, sortBy, sortOrder]);

    // Listen for refresh requests (e.g., from undo action)
    useEffect(() => {
        if (route.params?.refresh) {
            loadData();
        }
    }, [route.params?.refresh]);

    const loadData = () => {
        loadSongs();
        loadTags();
    };

    const loadSongs = () => {
        const allSongs = getSongs(searchQuery, sortBy, sortOrder);
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
            showToast({ message: 'Database seeded successfully!', type: 'success' });
        } catch (error) {
            showToast({ message: 'Error seeding database', type: 'error' });
        }
    };

    const handleSortSelect = (newSortBy) => {
        if (sortBy === newSortBy) {
            // Toggle order
            setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            // New sort, default to DESC (usually better for dates/counts)
            setSortBy(newSortBy);
            setSortOrder('DESC');
        }
    };

    const handleSortPress = () => {
        setSortSheetVisible(true);
    };

    const getSortLabel = () => {
        const labels = {
            'created_at': 'Added',
            'last_sung_date': 'Sung',
            'sing_count': '# Sung',
            'my_rating': 'Rating',
            'updated_at': 'Updated'
        };
        const arrow = sortOrder === 'ASC' ? '▲' : '▼';
        return `${labels[sortBy] || 'Sort'} ${arrow}`;
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
                sortLabel={getSortLabel()}
                onSortPress={handleSortPress}
            />
            <SongList
                songs={filteredSongs}
                onSongPress={(song) => navigation.navigate('SongDetails', { songId: song.id })}
            />
            <FloatingActionButton onPress={() => navigation.navigate('AddSong')} />
            <SortBottomSheet
                visible={sortSheetVisible}
                onClose={() => setSortSheetVisible(false)}
                currentSortBy={sortBy}
                onSelectSort={handleSortSelect}
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

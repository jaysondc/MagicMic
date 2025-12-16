import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { usePreview } from '../context/PreviewContext';
import SongList from '../components/SongList';
import TagFilter from '../components/TagFilter';

import {
    initDatabase,
    getSongs,
    getTags,
    resetDatabase,
    seedDatabase,
    runMigrations,
    deleteTag,
    addTag,
    getSongIdsForTag,
    linkTagToSong
} from '../lib/database';
import { seedData } from '../lib/seedData';
import { theme } from '../lib/theme';
import { useToast } from '../context/ToastContext';
import FloatingActionButton from '../components/FloatingActionButton';
import SortBottomSheet from '../components/SortBottomSheet';


import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
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

        // Custom sort: Top, To Try, To Learn first
        const priorityTags = ['Top', 'To Try', 'To Learn'];

        const sortedTags = allTags.sort((a, b) => {
            const indexA = priorityTags.indexOf(a.name);
            const indexB = priorityTags.indexOf(b.name);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Both are priority
            if (indexA !== -1) return -1; // Only A is priority
            if (indexB !== -1) return 1; // Only B is priority

            return a.name.localeCompare(b.name); // Default alphabetical
        });

        setTags(sortedTags);
    };

    const handleToggleTag = (tagId) => {
        setSelectedTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            }
            return [...prev, tagId];
        });
    };

    const handleDeleteTag = (tagId) => {
        const tagToDelete = tags.find(t => t.id === tagId);
        if (!tagToDelete) return;

        // Backup links before deleting
        const linkedSongIds = getSongIdsForTag(tagId);
        const wasSelected = selectedTags.includes(tagId);

        deleteTag(tagId);
        loadData();

        // Also remove from selected if it was selected
        if (wasSelected) {
            setSelectedTags(prev => prev.filter(id => id !== tagId));
        }

        showToast({
            message: `Deleted "${tagToDelete.name}"`,
            actionLabel: 'Undo',
            onAction: () => {
                // Restore tag
                const newTagId = addTag(tagToDelete.name, tagToDelete.color);

                // Restore links
                linkedSongIds.forEach(songId => {
                    linkTagToSong(songId, newTagId);
                });

                loadData();

                // Restore selection if it was selected
                if (wasSelected) {
                    setSelectedTags(prev => [...prev, newTagId]);
                }

                showToast({ message: 'Tag restored' });
            }
        });
    };

    // Removed handleSeed from here as it moved to Settings

    const handleSortSelect = (newSortBy) => {
        if (sortBy === newSortBy) {
            // Toggle order
            setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            // New sort, default to DESC usually, but ASC for text fields
            setSortBy(newSortBy);
            if (newSortBy === 'title' || newSortBy === 'artist') {
                setSortOrder('ASC');
            } else {
                setSortOrder('DESC');
            }
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
            'updated_at': 'Updated',
            'title': 'Song',
            'artist': 'Artist'
        };
        const arrow = sortOrder === 'ASC' ? '▲' : '▼';
        return `${labels[sortBy] || 'Sort'} ${arrow}`;
    };

    // Filter songs by selected tags (AND logic)
    const filteredSongs = selectedTags.length > 0
        ? songs.filter(song =>
            song.tags && selectedTags.every(selectedTagId =>
                song.tags.some(songTag => songTag.id === selectedTagId)
            )
        )
        : songs;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>Magic Mic</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
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
                onDeleteTag={handleDeleteTag}
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
                safeBottomPadding={insets.bottom}
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

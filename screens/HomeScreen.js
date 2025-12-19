import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity, InteractionManager } from 'react-native';
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
import RoulettePanel from '../components/RoulettePanel';


import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function HomeScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { stopPreview } = usePreview();

    useFocusEffect(
        useCallback(() => {
            // Run data loading after transition interactions are complete to prevent stutter
            const task = InteractionManager.runAfterInteractions(() => {
                loadData();
            });

            return () => {
                task.cancel();
                stopPreview();
            };
        }, [searchQuery, sortBy, sortOrder])
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [songs, setSongs] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);


    // Sort State
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    const [sortSheetVisible, setSortSheetVisible] = useState(false);

    // Roulette State
    const [rouletteVisible, setRouletteVisible] = useState(false);
    const [rouletteSongs, setRouletteSongs] = useState([]);
    const [isRolling, setIsRolling] = useState(false);

    useEffect(() => {
        initDatabase();
        runMigrations(); // Add missing columns to existing databases
        // Initial load is also deferred
        InteractionManager.runAfterInteractions(() => {
            loadData();
        });
    }, []);

    useEffect(() => {
        loadSongs();
    }, [searchQuery, sortBy, sortOrder]);

    // Listen for refresh requests (e.g., from undo action)
    useEffect(() => {
        if (route.params?.refresh) {
            loadData();
        }
    }, [route.params?.refresh]);

    const loadData = async () => {
        InteractionManager.runAfterInteractions(async () => {
            await Promise.all([loadSongs(), loadTags()]);
        });
    };


    const loadSongs = async () => {
        try {
            const allSongs = await getSongs(searchQuery, sortBy, sortOrder);
            setSongs(allSongs);
        } catch (error) {
            console.error('Failed to load songs:', error);
        }
    };

    const loadTags = async () => {
        try {
            const allTags = await getTags();

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
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    };

    const handleToggleTag = (tagId) => {
        setSelectedTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            }
            return [...prev, tagId];
        });
    };

    const handleDeleteTag = async (tagId) => {
        const tagToDelete = tags.find(t => t.id === tagId);
        if (!tagToDelete) return;

        // Backup links before deleting
        const linkedSongIds = await getSongIdsForTag(tagId);
        const wasSelected = selectedTags.includes(tagId);

        await deleteTag(tagId);
        await loadData();



        // Also remove from selected if it was selected
        if (wasSelected) {
            setSelectedTags(prev => prev.filter(id => id !== tagId));
        }

        showToast({
            message: `Deleted "${tagToDelete.name}"`,
            actionLabel: 'Undo',
            onAction: async () => {
                // Restore tag
                const newTagId = await addTag(tagToDelete.name, tagToDelete.color);

                // Restore links
                for (const songId of linkedSongIds) {
                    await linkTagToSong(songId, newTagId);
                }

                await loadData();

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

    const handleRollRoulette = () => {
        if (filteredSongs.length === 0) {
            showToast({ message: "No songs match current filters" });
            return;
        }
        setIsRolling(true);
        setRouletteVisible(true);

        // Scroll to top when opening roulette
        listRef.current?.scrollToOffset({ offset: 0, animated: true });

        // Randomly pick 3 (or fewer if not enough)
        const shuffled = [...filteredSongs].sort(() => 0.5 - Math.random());
        setRouletteSongs(shuffled.slice(0, 3));
    };

    const handleRouletteIconPress = () => {
        if (rouletteVisible) {
            setRouletteVisible(false);
        } else {
            handleRollRoulette();
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

    const listRef = useRef(null);

    // Filter songs by selected tags (OR logic)
    const filteredSongs = useMemo(() => {
        return selectedTags.length > 0
            ? songs.filter(song =>
                song.tags && selectedTags.some(selectedTagId =>
                    song.tags.some(songTag => songTag.id === selectedTagId)
                )
            )
            : songs;
    }, [songs, selectedTags]);


    // Memoized tags with selected ones first (in selection order)
    const displayTags = useMemo(() => {
        const selected = selectedTags.map(id => tags.find(t => t.id === id)).filter(Boolean);
        const unselected = tags.filter(t => !selectedTags.includes(t.id));
        return [...selected, ...unselected];
    }, [tags, selectedTags]);


    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>Magic Mic</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity onPress={handleRouletteIconPress} style={styles.headerButton}>
                        <Ionicons name={rouletteVisible ? "shuffle" : "shuffle-outline"} size={24} color={rouletteVisible ? theme.colors.secondary : theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                        <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <TextInput
                        style={[styles.searchInput, searchQuery.length > 0 && styles.searchInputWithClear]}
                        placeholder="Search songs..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={styles.tagFilterContainer}>
                <TagFilter
                    tags={displayTags}
                    selectedTags={selectedTags}
                    onToggleTag={handleToggleTag}
                    onDeleteTag={handleDeleteTag}
                    onTagsChanged={loadTags}
                    sortLabel={getSortLabel()}
                    onSortPress={handleSortPress}
                />
            </View>
            <SongList
                ref={listRef}
                songs={filteredSongs}
                onSongPress={(song) => navigation.navigate('SongDetails', { songId: song.id })}
                refreshing={isRolling}
                onRefresh={handleRollRoulette}
                ListHeaderComponent={
                    <RoulettePanel
                        visible={rouletteVisible}
                        songs={rouletteSongs}
                        isRolling={isRolling}
                        onCollapse={() => setRouletteVisible(false)}
                        onRollComplete={() => setIsRolling(false)}
                        onSongPress={(song) => navigation.navigate('SongDetails', { songId: song.id })}
                    />
                }
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
        alignItems: 'center',
    },
    headerButton: {
        marginRight: theme.spacing.m,
    },
    buttonSpacer: {
        width: 10,
    },
    title: {
        ...theme.textVariants.header,
        fontSize: 20,
    },
    searchContainer: {
        paddingBottom: theme.spacing.m,
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
    searchInputWithClear: {
        paddingRight: 40,
    },
    searchWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    tagFilterContainer: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.s,
    },
    clearButton: {
        position: 'absolute',
        right: theme.spacing.m,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

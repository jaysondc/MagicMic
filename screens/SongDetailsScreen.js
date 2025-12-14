
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

import TagFilter from '../components/TagFilter';
import RatingWidget from '../components/RatingWidget';
import { theme } from '../lib/theme';
import { useToast } from '../context/ToastContext';
import { usePreview } from '../context/PreviewContext';
import { getSongs, getTags, linkTagToSong, deleteSong, updateSong, addSong, db } from '../lib/database';
import { findSongMetadata } from '../lib/itunes';

export default function SongDetailsScreen({ route, navigation }) {
    const { songId } = route.params;
    const { showToast } = useToast();
    const { playPreview, stopPreview, currentUri, isPlaying, duration, position } = usePreview();

    const [song, setSong] = useState(null);
    const [allTags, setAllTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [lyricsExpanded, setLyricsExpanded] = useState(false);
    const [metadataExpanded, setMetadataExpanded] = useState(false);
    const [loadingMetadata, setLoadingMetadata] = useState(false);

    // Stop preview when leaving the screen
    useFocusEffect(
        useCallback(() => {
            return () => {
                stopPreview();
            };
        }, [])
    );

    useEffect(() => {
        loadSongData();
        loadTags();
    }, []);

    const loadSongData = () => {
        const songs = getSongs();
        const foundSong = songs.find(s => s.id === songId);
        if (foundSong) {
            setSong(foundSong);
            setSelectedTags(foundSong.tags ? foundSong.tags.map(t => t.id) : []);

            // Fetch lyrics if missing
            if (!foundSong.lyrics) {
                fetchLyrics(foundSong);
            }

            // Fetch metadata if missing (Art or Audio)
            if (!foundSong.audio_sample_url || !foundSong.album_cover_url) {
                fetchMetadata(foundSong);
            }
        }
    };

    const loadTags = () => {
        setAllTags(getTags());
    };

    const fetchLyrics = async (song) => {
        if (!song || !song.title || !song.artist) return;
        try {
            // Build URL with duration only if available
            let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(song.artist)}&track_name=${encodeURIComponent(song.title)}`;
            if (song.duration_ms) {
                const durationSeconds = Math.round(song.duration_ms / 1000);
                url += `&duration=${durationSeconds}`;
            }

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                if (data.plainLyrics) {
                    updateSong(song.id, { lyrics: data.plainLyrics });
                    setSong(prev => ({ ...prev, lyrics: data.plainLyrics }));
                }
            }
        } catch (error) {
            console.log('Error fetching lyrics:', error);
        }
    };

    const fetchMetadata = async (song) => {
        if (!song || !song.title || !song.artist) return;

        setLoadingMetadata(true);
        try {
            const metadata = await findSongMetadata(song.title, song.artist);

            if (metadata) {
                const updates = {};

                // Only update if missing
                if (!song.audio_sample_url && metadata.previewUrl) {
                    updates.audio_sample_url = metadata.previewUrl;
                }
                if (!song.album_cover_url && metadata.artworkUrl) {
                    updates.album_cover_url = metadata.artworkUrl;
                }

                if (Object.keys(updates).length > 0) {
                    updateSong(song.id, updates);
                    setSong(prev => ({ ...prev, ...updates }));
                    console.log('Metadata fetched:', updates);
                }
            }
        } catch (error) {
            console.log('Error fetching metadata:', error);
        } finally {
            setLoadingMetadata(false);
        }
    }

    const handleRatingChange = (newRating) => {
        setSong(prev => ({ ...prev, my_rating: newRating }));
        updateSong(songId, { my_rating: newRating });
    };

    // Animation values for Mark as Sung button
    const scale = useSharedValue(1);
    const successOpacity = useSharedValue(0);

    const animatedButtonStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const successStyle = useAnimatedStyle(() => {
        return {
            opacity: successOpacity.value,
            transform: [{ translateY: withTiming(successOpacity.value === 1 ? -20 : 0) }]
        };
    });

    const handleMarkAsSung = () => {
        scale.value = withSequence(
            withTiming(0.9, { duration: 100 }),
            withSpring(1, { damping: 50, stiffness: 500 })
        );

        successOpacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(0, { duration: 800, delay: 500 }) // Fade out after delay
        );

        const newCount = (song.sing_count || 0) + 1;
        const now = Date.now();

        updateSong(songId, { sing_count: newCount, last_sung_date: now });
        setSong(prev => ({ ...prev, sing_count: newCount, last_sung_date: now }));
    };

    const handleToggleTag = (tagId) => {
        const isSelected = selectedTags.includes(tagId);
        const newSelectedTags = isSelected
            ? selectedTags.filter(id => id !== tagId)
            : [...selectedTags, tagId];

        setSelectedTags(newSelectedTags);

        if (isSelected) {
            db.runSync('DELETE FROM song_tags WHERE song_id = ? AND tag_id = ?', [songId, tagId]);
        } else {
            linkTagToSong(songId, tagId);
        }
    };

    const handlePlayPreview = async () => {
        if (song?.audio_sample_url) {
            playPreview(song.audio_sample_url);
        } else if (!loadingMetadata) {
            // Trigger fetch if clicked and not already loading
            await fetchMetadata(song);
            // If we successfully got it, play it (need to rely on ref or state update, but song is state)
            // Simpler: just user taps again, or we rely on the effect.
            // But ideally we want one-tap. The effect runs on mount, so it should be loading already.
        }
    };

    const handleDelete = () => {
        const songToRestore = { ...song, tags: selectedTags };

        deleteSong(songId);
        navigation.goBack();

        showToast({
            message: 'Song deleted',
            type: 'info',
            actionLabel: 'UNDO',
            duration: 5000,
            onAction: () => {
                try {
                    const newId = addSong(songToRestore.title, songToRestore.artist, {
                        ...songToRestore
                    });

                    if (songToRestore.tags && songToRestore.tags.length > 0) {
                        songToRestore.tags.forEach(tagId => linkTagToSong(newId, tagId));
                    }

                    navigation.navigate('Home', { refresh: Date.now() });
                    showToast({ message: 'Song restored!', type: 'success' });
                } catch (e) {
                    showToast({ message: 'Failed to restore song.', type: 'error' });
                }
            }
        });
    };

    if (!song) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.text}>Loading...</Text>
            </SafeAreaView>
        );
    }

    // Circular Progress UI
    const isCurrent = currentUri === song.audio_sample_url;
    const isThisPlaying = isCurrent && isPlaying;
    const currentPosition = isCurrent ? position : 0;
    const currentDuration = isCurrent ? duration : 0;

    const size = 50;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = (isCurrent && currentDuration > 0) ? currentPosition / currentDuration : 0;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Header Section with Preview Player */}
                <View style={styles.headerContainer}>
                    <View style={styles.artworkWrapper}>
                        {song.album_cover_url ? (
                            <Image source={{ uri: song.album_cover_url }} style={styles.headerArtwork} />
                        ) : (
                            <View style={[styles.headerArtwork, styles.artworkPlaceholder]}>
                                {loadingMetadata ? (
                                    <ActivityIndicator color={theme.colors.textSecondary} />
                                ) : (
                                    <Ionicons name="musical-note" size={40} color={theme.colors.textSecondary} />
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{song.title}</Text>
                        <Text style={styles.artist}>
                            {song.artist}
                            {song.duration_ms ? ` • ${Math.floor(song.duration_ms / 60000)}:${((song.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}` : ''}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handlePlayPreview}
                        style={styles.playerButton}
                        disabled={loadingMetadata && !song.audio_sample_url}
                    >
                        {loadingMetadata && !song.audio_sample_url ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            // Always show play button structure, even if no URL yet (it will render play icon)
                            <>
                                <Svg width={size} height={size} style={styles.progressCircle}>
                                    <Circle
                                        stroke={theme.colors.border}
                                        fill="none"
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        strokeWidth={strokeWidth}
                                    />
                                    <Circle
                                        stroke={theme.colors.primary}
                                        fill="transparent"
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={`${circumference} ${circumference}`}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        rotation="-90"
                                        origin={`${size / 2}, ${size / 2}`}
                                    />
                                </Svg>
                                <View style={styles.iconContainer}>
                                    <Ionicons
                                        name={isThisPlaying ? "pause" : "play"}
                                        size={24}
                                        color={theme.colors.primary}
                                    />
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tags</Text>
                    <TagFilter
                        tags={allTags}
                        selectedTags={selectedTags}
                        onToggleTag={handleToggleTag}
                        onTagsChanged={loadTags}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Rating</Text>
                    <RatingWidget rating={song.my_rating || 0} onRatingChange={handleRatingChange} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Performance</Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{song.sing_count || 0}</Text>
                            <Text style={styles.statLabel}>Times Sung</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>
                                {song.last_sung_date
                                    ? new Date(song.last_sung_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                    : '--'}
                            </Text>
                            <Text style={styles.statLabel}>Last Sung</Text>
                        </View>
                    </View>

                    <View style={styles.actionContainer}>
                        <Animated.View style={[styles.markSungButtonContainer, animatedButtonStyle]}>
                            <TouchableOpacity
                                style={styles.markSungButton}
                                onPress={handleMarkAsSung}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="mic" size={24} color={theme.colors.background} style={{ marginRight: 8 }} />
                                <Text style={styles.markSungText}>Mark as Sung</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View style={[styles.successFeedback, successStyle]}>
                            <Text style={styles.successText}>+1</Text>
                        </Animated.View>
                    </View>
                </View>

                {song.lyrics && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Lyrics</Text>
                            <TouchableOpacity onPress={() => setLyricsExpanded(!lyricsExpanded)}>
                                <Ionicons
                                    name={lyricsExpanded ? "chevron-up" : "chevron-down"}
                                    size={24}
                                    color={theme.colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.lyrics} numberOfLines={lyricsExpanded ? undefined : 10}>
                            {song.lyrics}
                        </Text>
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Metadata</Text>
                        <TouchableOpacity onPress={() => setMetadataExpanded(!metadataExpanded)}>
                            <Ionicons
                                name={metadataExpanded ? "chevron-up" : "chevron-down"}
                                size={24}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>
                    {metadataExpanded && (
                        <>
                            <View style={styles.row}>
                                <Text style={styles.label}>ID:</Text>
                                <Text style={styles.value}>{song.id}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Status:</Text>
                                <Text style={styles.value}>{song.status}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Category:</Text>
                                <Text style={styles.value}>{song.category || 'repertoire'}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>My Rating:</Text>
                                <Text style={styles.value}>{song.my_rating}/5</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Sing Count:</Text>
                                <Text style={styles.value}>{song.sing_count}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Last Sung:</Text>
                                <Text style={styles.value}>
                                    {song.last_sung_date ? new Date(song.last_sung_date).toLocaleDateString() : 'Never'}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Created:</Text>
                                <Text style={styles.value}>{new Date(song.created_at).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Updated:</Text>
                                <Text style={styles.value}>{new Date(song.updated_at).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Album Cover:</Text>
                                <Text style={styles.value} numberOfLines={1}>
                                    {song.album_cover_url || 'None'}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Preview URL:</Text>
                                <Text style={styles.value} numberOfLines={1}>
                                    {song.audio_sample_url || 'None'}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
                        <Text style={styles.deleteButtonText}>Delete Song</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.m,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Changed to center for better alignment
        marginBottom: theme.spacing.l,
    },
    artworkWrapper: {
        marginRight: theme.spacing.m,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    headerArtwork: {
        width: 80,
        height: 80,
        borderRadius: theme.borderRadius.m,
    },
    artworkPlaceholder: {
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    titleContainer: {
        flex: 1,
        // marginRight: theme.spacing.m, // Removed to avoid large gap if short text, handled by flex
        justifyContent: 'center',
        paddingRight: theme.spacing.s,
    },
    title: {
        ...theme.textVariants.header,
        marginBottom: 4,
        fontSize: 20,
        lineHeight: 24,
    },
    artist: {
        ...theme.textVariants.subheader,
        fontSize: 16,
    },
    playerButton: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressCircle: {
        position: 'absolute',
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        marginBottom: theme.spacing.m,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.s,
    },
    lyrics: {
        ...theme.textVariants.body,
        color: theme.colors.text,
        lineHeight: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    label: {
        color: theme.colors.text,
        fontSize: 16,
    },
    value: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    text: {
        color: theme.colors.text,
    },
    actions: {
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: theme.colors.secondary,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    verticalDivider: {
        width: 1,
        height: '80%',
        backgroundColor: theme.colors.border,
    },
    actionContainer: {
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
    },
    markSungButtonContainer: {
        width: '100%',
    },
    markSungButton: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.round,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    markSungText: {
        color: theme.colors.background,
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    successFeedback: {
        position: 'absolute',
        top: -30,
        zIndex: 10,
        backgroundColor: theme.colors.success,
        borderRadius: theme.borderRadius.round,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    successText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 14,
    },
    deleteButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.error,
        backgroundColor: 'transparent',
        opacity: 0.8,
    },
    deleteButtonText: {
        color: theme.colors.error,
        fontSize: 16,
        fontWeight: '600',
    }
});

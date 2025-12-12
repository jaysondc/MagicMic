import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import TagFilter from '../components/TagFilter';
import { theme } from '../lib/theme';
import { useToast } from '../context/ToastContext';
import { getSongs, getTags, linkTagToSong, deleteSong, updateSong, addSong, db } from '../lib/database';
import RatingWidget from '../components/RatingWidget';

export default function SongDetailsScreen({ route, navigation }) {
    const { songId } = route.params;
    const { showToast } = useToast();
    const [song, setSong] = useState(null);
    const [allTags, setAllTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [lyricsExpanded, setLyricsExpanded] = useState(false);
    const [metadataExpanded, setMetadataExpanded] = useState(false);

    // Audio Player State
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);

    useEffect(() => {
        loadSongData();
        loadTags();

        // Cleanup sound on unmount
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    // Cleanup sound when leaving the screen or changing songs
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

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
        }
    };

    const loadTags = () => {
        setAllTags(getTags());
    };

    const fetchLyrics = async (song) => {
        if (!song || !song.title || !song.artist) return;

        console.log('Fetching lyrics for:', song.title, song.artist);
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
                    // Update database
                    updateSong(song.id, { lyrics: data.plainLyrics });

                    // Update local state
                    setSong(prev => ({ ...prev, lyrics: data.plainLyrics }));
                }
            }
        } catch (error) {
            console.log('Error fetching lyrics:', error);
        }
    };

    const handleRatingChange = (newRating) => {
        setSong(prev => ({ ...prev, my_rating: newRating }));
        updateSong(songId, { my_rating: newRating });
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
        if (!song?.audio_sample_url) return;

        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    // If the song finished, replay from start
                    if (position >= duration && duration > 0) {
                        await sound.replayAsync();
                    } else {
                        await sound.playAsync();
                    }
                    setIsPlaying(true);
                }
            } else {
                console.log('Loading Sound');
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: song.audio_sample_url },
                    {
                        shouldPlay: true,
                        progressUpdateIntervalMillis: 50 // Update every 50ms for smooth animation
                    },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                setIsPlaying(true);
            }
        } catch (error) {
            console.log('Error playing sound', error);
            showToast({ message: 'Could not play song preview', type: 'error' });
        }
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setDuration(status.durationMillis);
            setPosition(status.positionMillis);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(status.durationMillis); // Show full circle when done
                // Don't auto-reset position here, let the play button handle replay
            }
        }
    };

    const handleDelete = () => {
        // Prepare for restore with ALL fields
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
                    // Restore song with ALL fields
                    const newId = addSong(songToRestore.title, songToRestore.artist, {
                        album_cover_url: songToRestore.album_cover_url,
                        audio_sample_url: songToRestore.audio_sample_url,
                        duration_ms: songToRestore.duration_ms,
                        lyrics: songToRestore.lyrics,
                        lyrics_preview: songToRestore.lyrics_preview,
                        status: songToRestore.status,
                        my_rating: songToRestore.my_rating,
                        sing_count: songToRestore.sing_count,
                        last_sung_date: songToRestore.last_sung_date,
                        category: songToRestore.category,
                        created_at: songToRestore.created_at,
                        updated_at: songToRestore.updated_at
                    });

                    // Restore tags
                    if (songToRestore.tags && songToRestore.tags.length > 0) {
                        songToRestore.tags.forEach(tagId => linkTagToSong(newId, tagId));
                    }

                    // Trigger HomeScreen refresh
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
    const size = 50;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = duration > 0 ? position / duration : 0;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Header Section with Preview Player */}
                <View style={styles.headerContainer}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{song.title}</Text>
                        <Text style={styles.artist}>
                            {song.artist}
                            {song.duration_ms ? ` • ${Math.floor(song.duration_ms / 60000)}:${((song.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}` : ''}
                        </Text>
                    </View>

                    {song.audio_sample_url && (
                        <TouchableOpacity onPress={handlePlayPreview} style={styles.playerButton}>
                            <Svg width={size} height={size} style={styles.progressCircle}>
                                {/* Background Circle (Optional, for visual track) */}
                                <Circle
                                    stroke={theme.colors.border}
                                    fill="none"
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    strokeWidth={strokeWidth}
                                />
                                {/* Progress Circle */}
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
                                    name={isPlaying ? "pause" : "play"}
                                    size={24}
                                    color={theme.colors.primary}
                                />
                            </View>
                        </TouchableOpacity>
                    )}
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
           
                {/* Rating Widget */}
                <RatingWidget rating={song.my_rating || 0} onRatingChange={handleRatingChange} />

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
                            {song.album_cover_url && (
                                <View style={styles.row}>
                                    <Text style={styles.label}>Album Cover:</Text>
                                    <Text style={styles.value} numberOfLines={1}>
                                        {song.album_cover_url}
                                    </Text>
                                </View>
                            )}
                            {song.audio_sample_url && (
                                <View style={styles.row}>
                                    <Text style={styles.label}>Preview URL:</Text>
                                    <Text style={styles.value} numberOfLines={1}>
                                        {song.audio_sample_url}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.actions}>
                    <Button title="Delete Song" onPress={handleDelete} color={theme.colors.error} />
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
        alignItems: 'flex-start',
        marginBottom: theme.spacing.l,
    },
    titleContainer: {
        flex: 1,
        marginRight: theme.spacing.m,
    },
    title: {
        ...theme.textVariants.header,
        marginBottom: theme.spacing.s,
    },
    artist: {
        ...theme.textVariants.subheader,
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
        marginBottom: theme.spacing.l,
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
    }
});

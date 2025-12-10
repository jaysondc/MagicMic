import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import TagFilter from '../components/TagFilter';
import { theme } from '../lib/theme';
import { getSongs, getTags, linkTagToSong, deleteSong, db } from '../lib/database';

export default function SongDetailsScreen({ route, navigation }) {
    const { songId } = route.params;
    const [song, setSong] = useState(null);
    const [allTags, setAllTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

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
        }
    };

    const loadTags = () => {
        setAllTags(getTags());
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
            Alert.alert('Error', 'Could not play song preview.');
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
        Alert.alert(
            "Delete Song",
            "Are you sure you want to delete this song?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteSong(songId);
                        navigation.goBack();
                    }
                }
            ]
        );
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
                        <Text style={styles.artist}>{song.artist}</Text>
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

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Metadata</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Status:</Text>
                        <Text style={styles.value}>{song.status}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Sing Count:</Text>
                        <Text style={styles.value}>{song.sing_count}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Added:</Text>
                        <Text style={styles.value}>{new Date(song.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Preview URL:</Text>
                        <Text style={styles.value} numberOfLines={1}>
                            {song.audio_sample_url || 'Not available'}
                        </Text>
                    </View>
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
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.s,
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

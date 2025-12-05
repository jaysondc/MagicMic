import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TagFilter from '../components/TagFilter';
import { theme } from '../lib/theme';
import { getSongs, getTags, linkTagToSong, deleteSong, db } from '../lib/database';

export default function SongDetailsScreen({ route, navigation }) {
    const { songId } = route.params;
    const [song, setSong] = useState(null);
    const [allTags, setAllTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

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

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>{song.title}</Text>
                <Text style={styles.artist}>{song.artist}</Text>

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
    title: {
        ...theme.textVariants.header,
        marginBottom: theme.spacing.s,
    },
    artist: {
        ...theme.textVariants.subheader,
        marginBottom: theme.spacing.l,
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

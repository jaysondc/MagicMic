
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { usePreview } from '../context/PreviewContext';

const SongListItem = ({ item, onSongPress, playSong, loadingSongId, currentUri, isPlaying, onPreviewUrlUpdate }) => {

    // Derived state
    const isCurrent = currentUri === item.audio_sample_url;
    const isThisPlaying = isCurrent && isPlaying;
    const isLoading = loadingSongId === item.id;

    const handlePlayPress = () => {
        playSong(item, onPreviewUrlUpdate);
    };

    return (
        <View style={styles.itemContainer}>
            <TouchableOpacity
                style={styles.artworkContainer}
                onPress={handlePlayPress}
                activeOpacity={0.8}
            >
                {item.album_cover_url ? (
                    <Image source={{ uri: item.album_cover_url }} style={styles.artwork} />
                ) : (
                    <View style={[styles.artwork, styles.placeholderArtwork]}>
                        <Ionicons name="musical-note" size={24} color={theme.colors.textSecondary} />
                    </View>
                )}

                <View style={styles.playOverlay}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons
                            name={isThisPlaying ? "pause" : "play"}
                            size={20}
                            color="#fff"
                        />
                    )}
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.info}
                onPress={() => onSongPress && onSongPress(item)}
            >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.artist}>
                    {item.artist}
                    {item.duration_ms ? ` • ${Math.floor(item.duration_ms / 60000)}:${((item.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}` : ''}
                </Text>

                {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {item.tags.map(tag => (
                            <View key={tag.id} style={[styles.tagChip, { borderColor: tag.color }]}>
                                <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const SongList = ({ songs, onSongPress }) => {
    const insets = useSafeAreaInsets();
    const { playSong, loadingSongId, currentUri, isPlaying } = usePreview();

    // Local override for songs that just got a URL fetched.
    // This allows immediate feedback without waiting for parent refresh.
    // Map of songId -> { audio_sample_url, album_cover_url }
    const [localUpdates, setLocalUpdates] = useState({});

    const handlePreviewUrlUpdate = (id, url, artworkUrl) => {
        setLocalUpdates(prev => ({
            ...prev,
            [id]: { audio_sample_url: url, album_cover_url: artworkUrl }
        }));
    };

    const renderItem = ({ item }) => {
        // Merge local update if exists
        const updates = localUpdates[item.id];
        const displayItem = updates
            ? { ...item, ...updates }
            : item;

        return (
            <SongListItem
                item={displayItem}
                onSongPress={onSongPress}
                playSong={playSong}
                loadingSongId={loadingSongId}
                currentUri={currentUri}
                isPlaying={isPlaying}
                onPreviewUrlUpdate={handlePreviewUrlUpdate}
            />
        );
    };

    return (
        <FlatList
            data={songs}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No songs found.</Text>
                </View>
            }
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
        />
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.s,
        borderRadius: theme.borderRadius.m,
    },
    artworkContainer: {
        position: 'relative',
        marginRight: theme.spacing.m,
    },
    artwork: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.s,
        backgroundColor: theme.colors.background, // fallback
    },
    placeholderArtwork: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.border,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.s,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    artist: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    tagChip: {
        borderWidth: 1,
        borderRadius: theme.borderRadius.s,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
        marginBottom: 4,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
});

export default SongList;

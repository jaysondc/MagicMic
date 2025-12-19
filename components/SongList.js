import React, { forwardRef, memo } from 'react';

import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';

import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../lib/theme';
import { usePreview } from '../context/PreviewContext';
import { useSongUpdates } from '../hooks/useSongUpdates';


import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';

export const SONG_ITEM_HEIGHT = 108;

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

export const SongListItem = memo(({ item, onSongPress, playSong, loadingSongId, currentUri, isPlaying, onPreviewUrlUpdate }) => {
    const pressedValue = useSharedValue(0);

    // Derived state
    const isCurrent = currentUri === item.audio_sample_url;
    const isThisPlaying = isCurrent && isPlaying;
    const isLoading = loadingSongId === item.id;

    const handlePlayPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        playSong(item, onPreviewUrlUpdate);
    };

    const handlePressIn = () => {
        pressedValue.value = withTiming(1, { duration: 100 });
    };

    const handlePressOut = () => {
        pressedValue.value = withTiming(0, { duration: 150 });
    };

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            pressedValue.value,
            [0, 1],
            [theme.colors.surface, theme.colors.border]
        )
    }));

    return (
        <Animated.View style={[styles.itemContainer, cardAnimatedStyle]}>
            <TouchableOpacity
                style={styles.artworkContainer}
                onPress={handlePlayPress}
                activeOpacity={0.7}
            >
                <View style={styles.artworkWrapper}>
                    {item.album_cover_url ? (
                        <Image source={{ uri: item.album_cover_url }} style={styles.artwork} />
                    ) : (
                        <View style={[styles.artwork, styles.placeholderArtwork]}>
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
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.info}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                    onSongPress && onSongPress(item);
                }}
                activeOpacity={1}
            >
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.artistRow}>
                    <Text style={styles.artist}>{item.artist}</Text>
                    {item.duration_ms && (
                        <View style={styles.durationContainer}>
                            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} style={styles.durationIcon} />
                            <Text style={styles.artist}>
                                {Math.floor(item.duration_ms / 60000)}:{((item.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}
                            </Text>
                        </View>
                    )}
                </View>

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
        </Animated.View>
    );
});

const SongList = forwardRef(({ songs, onSongPress, refreshing, onRefresh, ListHeaderComponent }, ref) => {
    const insets = useSafeAreaInsets();
    const { playSong, loadingSongId, currentUri, isPlaying } = usePreview();

    const { handlePreviewUrlUpdate, applyUpdates } = useSongUpdates();

    const renderItem = ({ item }) => {
        const displayItem = applyUpdates([item])[0];

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
        <FlashList
            ref={ref}
            data={songs}
            renderItem={renderItem}
            extraData={{ isPlaying, currentUri, loadingSongId }}
            keyExtractor={(item) => item.id.toString()}
            estimatedItemSize={SONG_ITEM_HEIGHT}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No songs found.</Text>
                </View>
            }
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListHeaderComponent={ListHeaderComponent}
        />
    );
});




const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.s,
        borderRadius: theme.borderRadius.m,
    },
    artworkContainer: {
        position: 'relative',
        marginRight: theme.spacing.m,
    },
    artworkWrapper: {
        borderRadius: theme.borderRadius.s,
        overflow: 'hidden',
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
    artistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
    },
    artist: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    durationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    durationIcon: {
        paddingTop: 2,
        marginRight: 2,
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

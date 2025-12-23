
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    Easing
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import ShimmerEffect from './ShimmerEffect';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOP_OFFSET = SCREEN_HEIGHT * 0.1; // Max height (90%)
const INITIAL_OFFSET = SCREEN_HEIGHT * 0.5; // Initial height (50%)
const CLOSED_OFFSET = SCREEN_HEIGHT;

const PreviewBottomSheet = ({ isVisible, onClose, song, safeBottomPadding = 0 }) => {
    const [lyrics, setLyrics] = useState(null);
    const [loading, setLoading] = useState(false);

    const translateY = useSharedValue(CLOSED_OFFSET);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (isVisible) {
            scrollTo(INITIAL_OFFSET);
            opacity.value = withTiming(1, { duration: 250 });
            if (song) {
                fetchLyrics(song);
            }
        } else {
            translateY.value = CLOSED_OFFSET;
            opacity.value = withTiming(0, { duration: 200 });
            setLyrics(null);
        }
    }, [isVisible, song]);

    const scrollTo = (destination) => {
        'worklet';
        translateY.value = withTiming(destination, {
            duration: 250,
            easing: Easing.out(Easing.quad),
        });
    };

    const handleClose = () => {
        'worklet';
        translateY.value = withTiming(CLOSED_OFFSET, { duration: 250 }, (finished) => {
            if (finished) {
                runOnJS(onClose)();
            }
        });
        opacity.value = withTiming(0, { duration: 250 });
    };

    const fetchLyrics = async (songData) => {
        if (!songData.trackName || !songData.artistName) return;

        setLoading(true);
        try {
            let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(songData.artistName)}&track_name=${encodeURIComponent(songData.trackName)}`;
            if (songData.trackTimeMillis) {
                const durationSeconds = Math.round(songData.trackTimeMillis / 1000);
                url += `&duration=${durationSeconds}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setLyrics(data.plainLyrics || "No lyrics found.");
            } else {
                setLyrics("Lyrics not available for this song.");
            }
        } catch (error) {
            console.error('Error fetching lyrics for preview:', error);
            setLyrics("Could not load lyrics.");
        } finally {
            setLoading(false);
        }
    };

    const context = useSharedValue({ y: 0 });
    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = Math.max(TOP_OFFSET, context.value.y + event.translationY);
        })
        .onEnd((event) => {
            const dest = translateY.value + event.velocityY * 0.1;

            if (dest > SCREEN_HEIGHT * 0.75) {
                handleClose();
            } else if (dest < SCREEN_HEIGHT * 0.45) {
                scrollTo(TOP_OFFSET);
            } else {
                scrollTo(INITIAL_OFFSET);
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        top: translateY.value,
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    if (!isVisible && !song) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="none"
            onRequestClose={() => runOnJS(onClose)()}
            statusBarTranslucent
        >
            <GestureHandlerRootView style={styles.overlay}>
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => runOnJS(onClose)()} />
                </Animated.View>

                <Animated.View style={[styles.sheet, sheetStyle]}>
                    <GestureDetector gesture={gesture}>
                        <View style={styles.header}>
                            <View style={styles.handle} />
                            <View style={styles.headerContent}>
                                {song && (
                                    <>
                                        <Image
                                            source={{ uri: song.artworkUrl100?.replace('100x100bb', '300x300bb') || song.artworkUrl60 }}
                                            style={styles.artwork}
                                        />
                                        <View style={styles.songInfo}>
                                            <Text style={styles.title} numberOfLines={1}>{song.trackName}</Text>
                                            <Text style={styles.artist} numberOfLines={1}>{song.artistName}</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </GestureDetector>

                    <ScrollView contentContainerStyle={styles.content} bounces={false}>
                        <View style={styles.metadataRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.metaText}>
                                    {song?.trackTimeMillis ? `${Math.floor(song.trackTimeMillis / 60000)}:${((song.trackTimeMillis % 60000) / 1000).toFixed(0).padStart(2, '0')}` : '--:--'}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="pricetag-outline" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {song?.primaryGenreName || 'Unknown Genre'}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="disc-outline" size={16} color={theme.colors.textSecondary} />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {song?.collectionName || 'Unknown Album'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.lyricsContainer}>
                            {loading ? (
                                <View style={styles.lyricsShimmerContainer}>
                                    <View style={styles.shimmerLine}><ShimmerEffect width="100%" height={18} borderRadius={9} /></View>
                                    <View style={styles.shimmerLine}><ShimmerEffect width="100%" height={18} borderRadius={9} /></View>
                                    <View style={styles.shimmerLine}><ShimmerEffect width="100%" height={18} borderRadius={9} /></View>
                                    <View style={styles.shimmerLine}><ShimmerEffect width="80%" height={18} borderRadius={9} /></View>
                                    <View style={styles.shimmerLine}><ShimmerEffect width="90%" height={18} borderRadius={9} /></View>
                                    <View style={styles.shimmerLine}><ShimmerEffect width="70%" height={18} borderRadius={9} /></View>
                                    <Text style={[styles.statusText, { marginTop: theme.spacing.m }]}>Fetching lyrics...</Text>
                                </View>
                            ) : (
                                <View style={styles.lyricsContentContainer}>
                                    <Text style={styles.lyricsText}>{lyrics}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ height: 40 + safeBottomPadding }} />
                    </ScrollView>
                </Animated.View>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        // Top is handled by animation
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    header: {
        paddingTop: theme.spacing.m,
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: theme.colors.border,
        borderRadius: 3,
        marginBottom: theme.spacing.m,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: theme.spacing.s,
    },
    artwork: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: theme.spacing.m,
    },
    songInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
    },
    artist: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    content: {
        padding: theme.spacing.m,
    },
    metadataRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: theme.spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: theme.spacing.m,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing.l,
        marginBottom: 8,
    },
    metaText: {
        color: theme.colors.textSecondary,
        marginLeft: 6,
        fontSize: 13,
    },
    lyricsContainer: {
        paddingBottom: 20,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.s,
        textTransform: 'uppercase',
    },
    lyricsText: {
        fontSize: 16,
        lineHeight: 28,
        color: theme.colors.text,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    lyricsShimmerContainer: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    shimmerLine: {
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
    },
    statusText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: theme.spacing.m,
    },
    lyricsContentContainer: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    }
});

export default PreviewBottomSheet;

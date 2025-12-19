import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../lib/theme';
import { SongListItem, SONG_ITEM_HEIGHT } from './SongList';
import { usePreview } from '../context/PreviewContext';
import { useSongUpdates } from '../hooks/useSongUpdates';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withDelay,
    Easing,
    runOnJS,
    interpolate,
} from 'react-native-reanimated';

const ROULETTE_DURATION = 1500;
const PULSE_DURATION = 800;
const STAGGER_DELAY = 150;
const REVEAL_DURATION = 400;

const RouletteSlot = ({ song, pulseValue, revealOpacity, props }) => {
    const pulseStyle = useAnimatedStyle(() => ({
        opacity: song ? 0 : interpolate(pulseValue.value, [0, 1], [0.1, 1]),
        transform: [{ scale: interpolate(pulseValue.value, [0, 1], [0.98, 1.02]) }]
    }));

    const revealStyle = useAnimatedStyle(() => ({
        opacity: revealOpacity.value,
        transform: [{ translateY: interpolate(revealOpacity.value, [0, 1], [-10, 0]) }]
    }));

    const { playSong, loadingSongId, currentUri, isPlaying, handlePreviewUrlUpdate, onSongPress } = props;

    return (
        <View style={styles.slot}>
            {/* The Blank/Rolling Slot (hidden when song revealed) */}
            <Animated.View style={[styles.blankSlot, pulseStyle]}>
                <View style={styles.shimmer} />
            </Animated.View>

            {/* The Reveal Slot (only shows when song exists) */}
            {song && (
                <Animated.View style={[styles.songWrapper, revealStyle]}>
                    <SongListItem
                        item={song}
                        playSong={playSong}
                        loadingSongId={loadingSongId}
                        currentUri={currentUri}
                        isPlaying={isPlaying}
                        onPreviewUrlUpdate={handlePreviewUrlUpdate}
                        onSongPress={onSongPress}
                    />
                </Animated.View>
            )}
        </View>
    );
};


export default function RoulettePanel({ visible, songs, isRolling, onCollapse, onRollComplete, onSongPress }) {
    const [displaySongs, setDisplaySongs] = useState([]);

    const panelProgress = useSharedValue(0);
    const pulse1 = useSharedValue(0);
    const pulse2 = useSharedValue(0);
    const pulse3 = useSharedValue(0);
    const reveal1 = useSharedValue(0);
    const reveal2 = useSharedValue(0);
    const reveal3 = useSharedValue(0);

    const slotPulses = [pulse1, pulse2, pulse3];
    const revealOpacities = [reveal1, reveal2, reveal3];

    const { playSong, loadingSongId, currentUri, isPlaying } = usePreview();
    const { handlePreviewUrlUpdate, applyUpdates } = useSongUpdates();

    useEffect(() => {
        panelProgress.value = withTiming(visible ? 1 : 0, {
            duration: 400,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
        });
    }, [visible]);

    useEffect(() => {
        if (!isRolling) return;

        revealOpacities.forEach(o => o.value = 0);
        setDisplaySongs([]);

        slotPulses.forEach((p, i) => {
            p.value = 0;
            p.value = withDelay(i * 100, withRepeat(
                withTiming(1, { duration: PULSE_DURATION / 2, easing: Easing.inOut(Easing.quad) }),
                -1,
                true
            ));
        });

        // Dynamic Haptic Sequence: 3 Hard ticks at first pulse peaks, 3 Medium ticks at second pulse peaks
        const hapticTimers = [
            // Hard Ticks (Peak of first pulses)
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), STAGGER_DELAY * 1),
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), STAGGER_DELAY * 2),
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), STAGGER_DELAY * 3),

            // Medium Ticks (Peak of second pulses)
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), STAGGER_DELAY * 6 - 50),
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), STAGGER_DELAY * 7 - 50),
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), STAGGER_DELAY * 8 - 50),
        ];

        const timer = setTimeout(() => {
            // Stop pulses and ensure reveal values are at zero
            slotPulses.forEach(p => p.value = withTiming(0, { duration: 150 }));
            revealOpacities.forEach(o => o.value = 0);

            setDisplaySongs(songs || []);

            requestAnimationFrame(() => {
                revealOpacities.forEach((o, i) => {
                    o.value = withDelay(i * STAGGER_DELAY, withTiming(1, {
                        duration: REVEAL_DURATION,
                        easing: Easing.out(Easing.quad)
                    }));
                    // Trigger soft haptic when each result appears
                    setTimeout(() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                    }, i * STAGGER_DELAY);
                });

                if (onRollComplete) {
                    setTimeout(() => runOnJS(onRollComplete)(), REVEAL_DURATION + 3 * STAGGER_DELAY);
                }
            });
        }, ROULETTE_DURATION);


        return () => {
            clearTimeout(timer);
            hapticTimers.forEach(clearTimeout);
        };
    }, [isRolling]);

    // Update displaySongs if the source songs prop changes (e.g. after a refresh on focus)
    useEffect(() => {
        if (songs && songs.length > 0 && displaySongs.length > 0 && !isRolling) {
            setDisplaySongs(prev => prev.map(ds => {
                const latest = songs.find(s => s.id === ds.id);
                return latest || ds;
            }));
        }
    }, [songs]);

    const maxHeight = 435;

    const panelStyle = useAnimatedStyle(() => ({
        height: interpolate(panelProgress.value, [0, 1], [0, maxHeight]),
        opacity: panelProgress.value,
        marginBottom: interpolate(panelProgress.value, [0, 1], [0, theme.spacing.m]),
        borderWidth: interpolate(panelProgress.value, [0, 1], [0, 1]),
    }));

    const updatedSongs = applyUpdates(displaySongs);

    // Shared props for SongListItem
    const itemProps = {
        playSong,
        loadingSongId,
        currentUri,
        isPlaying,
        handlePreviewUrlUpdate,
        onSongPress
    };

    return (
        <Animated.View style={[styles.container, panelStyle]}>
            <View style={styles.header}>
                <Ionicons name="shuffle" size={18} color={theme.colors.secondary} />
                <Text style={styles.headerTitle}>KARAOKE ROULETTE</Text>
            </View>

            <View style={styles.content}>
                {[0, 1, 2].map((i) => (
                    <RouletteSlot
                        key={i}
                        index={i}
                        song={updatedSongs[i]}
                        pulseValue={slotPulses[i]}
                        revealOpacity={revealOpacities[i]}
                        props={itemProps}
                    />
                ))}
            </View>

            <TouchableOpacity
                style={styles.collapseButton}
                onPress={onCollapse}
                activeOpacity={0.7}
            >
                <Ionicons name="chevron-up" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderColor: theme.colors.secondary + '44',
        elevation: 5,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        justifyContent: 'center',
    },
    headerTitle: {
        color: theme.colors.secondary,
        fontWeight: 'bold',
        fontSize: 10,
        letterSpacing: 2,
        marginLeft: 8,
    },
    content: {
        paddingTop: 0,
    },
    slot: {
        height: SONG_ITEM_HEIGHT + 12, // Match SongListItem vertical space
        justifyContent: 'center',
    },
    blankSlot: {
        height: SONG_ITEM_HEIGHT,
        backgroundColor: theme.colors.secondary + '15',
        borderRadius: theme.borderRadius.m,
        marginHorizontal: theme.spacing.m,
    },
    songWrapper: {
        position: 'absolute',
        top: 6,
        left: 0,
        right: 0,
    },

    collapseButton: {
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    shimmer: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
    }
});

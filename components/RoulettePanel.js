import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { SongListItem, SONG_ITEM_HEIGHT } from './SongList';
import { usePreview } from '../context/PreviewContext';
import { useSongUpdates } from '../hooks/useSongUpdates';

const ROULETTE_DURATION = 1500;
const PULSE_DURATION = 750;
const STAGGER_DELAY = 150;
const REVEAL_DURATION = 350;

export default function RoulettePanel({ visible, songs, isRolling, onCollapse, onRollComplete, onSongPress }) {
    const [displaySongs, setDisplaySongs] = useState([]);

    // Animation for the panel sliding/expanding
    const heightAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Per-slot reveal animations
    const revealAnims = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    // 3 separate pulse animations for offset effect
    const pulseAnims = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    const { playSong, loadingSongId, currentUri, isPlaying } = usePreview();
    const { handlePreviewUrlUpdate, applyUpdates } = useSongUpdates();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(heightAnim, {
                toValue: visible ? 1 : 0,
                duration: 400,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: false,
            }),
            Animated.timing(opacityAnim, {
                toValue: visible ? 1 : 0,
                duration: 400,
                useNativeDriver: false,
            }),
        ]).start();
    }, [visible]);

    useEffect(() => {
        if (!isRolling) return;

        let active = true;
        let timer;
        const loops = pulseAnims.map((anim, i) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: PULSE_DURATION / 2,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: PULSE_DURATION / 2,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    })
                ])
            );
        });

        // Staggered fade out of existing songs if any
        const fadeOuts = revealAnims.map(anim =>
            Animated.timing(anim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            })
        );

        Animated.stagger(STAGGER_DELAY, fadeOuts).start(() => {
            if (!active) return;
            setDisplaySongs([]);

            // Start the rolling animation after fade out
            Animated.stagger(STAGGER_DELAY, loops).start();

            timer = setTimeout(() => {
                if (!active) return;

                loops.forEach(l => l.stop());
                pulseAnims.forEach(a => a.setValue(0));

                // Force all to 0 before swapping songs to prevent flashing
                revealAnims.forEach(a => a.setValue(0));
                setDisplaySongs(songs);

                const fadeIns = revealAnims.map(anim =>
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: REVEAL_DURATION,
                        useNativeDriver: true,
                    })
                );

                Animated.stagger(STAGGER_DELAY, fadeIns).start();

                onRollComplete && onRollComplete();
            }, ROULETTE_DURATION);
        });

        return () => {
            active = false;
            if (timer) clearTimeout(timer);
            loops.forEach(l => l.stop());
            pulseAnims.forEach(a => a.setValue(0));
        };
    }, [isRolling]);

    const maxHeight = 435; // Increased to prevent clipping

    const updatedSongs = applyUpdates(displaySongs);

    const renderPulseSlot = (index) => {
        const opacity = pulseAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.05, 0.3],
        });

        const scale = pulseAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1.02],
        });

        return (
            <Animated.View style={[
                styles.blankSlot,
                { opacity, transform: [{ scale }] }
            ]}>
                <View style={styles.shimmer} />
            </Animated.View>
        );
    };

    return (
        <Animated.View style={[
            styles.container,
            {
                height: heightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, maxHeight],
                }),
                opacity: opacityAnim,
                overflow: 'hidden',
                marginBottom: heightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, theme.spacing.m],
                }),
                borderWidth: heightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                }),
            }
        ]}>
            <View style={styles.header}>
                <Ionicons name="shuffle" size={18} color={theme.colors.secondary} />
                <Text style={styles.headerTitle}>ROULETTE SUGGESTIONS</Text>
            </View>

            <View style={styles.content}>
                {[0, 1, 2].map((i) => {
                    const song = updatedSongs[i];

                    return (
                        <View key={i} style={styles.slot}>
                            {song ? (
                                <Animated.View style={{ opacity: revealAnims[i] }}>
                                    <SongListItem
                                        item={song}
                                        playSong={playSong}
                                        loadingSongId={loadingSongId}
                                        currentUri={currentUri}
                                        isPlaying={isPlaying}
                                        onPreviewUrlUpdate={handlePreviewUrlUpdate}
                                        onSongPress={onSongPress}
                                        style={styles.rouletteItem}
                                    />
                                </Animated.View>
                            ) : renderPulseSlot(i)}
                        </View>
                    );
                })}
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
        paddingTop: theme.spacing.s,
    },
    slot: {
        height: SONG_ITEM_HEIGHT + 8, // Fixed height per slot (item + margin)
        justifyContent: 'center',
    },
    blankSlot: {
        height: SONG_ITEM_HEIGHT,
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.m,
        marginHorizontal: theme.spacing.m,
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

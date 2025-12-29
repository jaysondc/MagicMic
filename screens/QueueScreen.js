import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';

import { theme } from '../lib/theme';
import { getQueue, removeFromQueue, markQueueItemSung, clearQueue, reorderQueue } from '../lib/database';
import { useToast } from '../context/ToastContext';
import { usePreview } from '../context/PreviewContext';

const QueueListItem = ({ item, drag, isActive, onRemove, onMarkSung, onPress, playSong, isPlaying, isCurrent }) => {

    // Swipeable refs to manually close if needed, 
    // but user wants "releasing the item should automatically complete the action"
    // This implies we use onSwipeableOpen or similar.

    const renderRightActions = (progress, dragX) => {
        return (
            <View style={styles.rightAction}>
                <Ionicons name="mic" size={32} color="white" />
                <Text style={styles.actionText}>Sung</Text>
            </View>
        );
    };

    const renderLeftActions = (progress, dragX) => {
        return (
            <View style={styles.leftAction}>
                <Ionicons name="trash" size={32} color="white" />
                <Text style={styles.actionText}>Remove</Text>
            </View>
        );
    };

    const handlePlayPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        playSong(item);
    };

    return (
        <ScaleDecorator>
            <Swipeable
                renderRightActions={renderRightActions}
                renderLeftActions={renderLeftActions}
                overshootRight={true} // Allow pulling further
                overshootLeft={true}
                onSwipeableOpen={(direction) => {
                    if (direction === 'left') {
                        onRemove(item);
                    } else if (direction === 'right') {
                        onMarkSung(item);
                    }
                }}
            >
                <TouchableOpacity
                    style={[
                        styles.itemContainer,
                        isActive && styles.activeItem,
                        item.is_completed && styles.completedItem
                    ]}
                    onPress={() => onPress(item)}
                    activeOpacity={0.7}
                    onLongPress={drag}
                >
                    <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
                        <Ionicons name="reorder-two" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handlePlayPress} style={styles.playButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        {isCurrent && isPlaying ? (
                            <Ionicons name="pause-circle" size={36} color={theme.colors.primary} />
                        ) : (
                            <Ionicons name="play-circle" size={36} color={theme.colors.textSecondary} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, item.is_completed && styles.completedText]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.itemArtist, item.is_completed && styles.completedText]} numberOfLines={1}>{item.artist}</Text>
                    </View>

                    {!!item.is_completed && (
                        <Ionicons name="checkmark-done" size={20} color={theme.colors.success} style={{ marginLeft: 8 }} />
                    )}

                </TouchableOpacity>
            </Swipeable>
        </ScaleDecorator>
    );
};


export default function QueueScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { playSong, isPlaying, currentUri, stopPreview } = usePreview();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadQueue = async () => {
        setLoading(true);
        const data = await getQueue();
        setQueue(data);
        setLoading(false);
    };

    useEffect(() => {
        loadQueue();
        return () => stopPreview();
    }, []);

    const handleClearQueue = () => {
        if (queue.length === 0) return;

        Alert.alert(
            "Clear Queue",
            "Mark all songs as sung before clearing?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Just Clear",
                    style: 'destructive',
                    onPress: async () => {
                        await clearQueue();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        loadQueue();
                    }
                },
                {
                    text: "Mark All Sung",
                    onPress: async () => {
                        for (const item of queue) {
                            if (!item.is_completed) { // Only mark unsung ones
                                await markQueueItemSung(item.song_id);
                            }
                        }
                        await clearQueue();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        loadQueue();
                        showToast({ message: "All marked & cleared!" });
                    }
                }
            ]
        );
    };

    const handleRemove = useCallback(async (item) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await removeFromQueue(item.song_id);
        setQueue(prev => prev.filter(i => i.song_id !== item.song_id));
        showToast({ message: "Removed from queue" });
    }, []);

    const handleMarkSung = useCallback(async (item) => {
        if (item.is_completed) {
            // Optional: Toggle back to uncompleted? 
            // For now, just re-affirm or do nothing. User said "de-emphasizes". 
            // Usually un-marking is nice. Let's assume one-way for now as per instructions "marks the song as sung".
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await markQueueItemSung(item.song_id);

        // Optimistic update
        setQueue(prev => prev.map(i => {
            if (i.song_id === item.song_id) {
                return { ...i, is_completed: 1 };
            }
            return i;
        }));

        showToast({ message: "Marked as sung!" });
    }, []);

    const handlePressSong = (item) => {
        navigation.navigate('SongDetails', { songId: item.song_id });
    };

    const handleDragEnd = async ({ data }) => {
        setQueue(data);
        const reordered = data.map((item) => ({ song_id: item.song_id }));
        await reorderQueue(reordered);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Up Next ({queue.length})</Text>
                <TouchableOpacity onPress={handleClearQueue} disabled={queue.length === 0}>
                    <Text style={[styles.clearText, queue.length === 0 && styles.disabledText]}>Clear</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, paddingBottom: insets.bottom }}>
                <DraggableFlatList
                    data={queue}
                    onDragEnd={handleDragEnd}
                    keyExtractor={item => item.song_id.toString()}
                    renderItem={({ item, drag, isActive }) => (
                        <QueueListItem
                            item={item}
                            drag={drag}
                            isActive={isActive}
                            onRemove={handleRemove}
                            onMarkSung={handleMarkSung}
                            onPress={handlePressSong}
                            playSong={playSong}
                            isPlaying={isPlaying}
                            isCurrent={currentUri === item.audio_sample_url}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="list-outline" size={64} color={theme.colors.border} />
                                <Text style={styles.emptyText}>Queue is empty</Text>
                                <Text style={styles.emptySubText}>Add songs from the song list!</Text>
                            </View>
                        )
                    }
                />
            </View>
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
        zIndex: 10,
    },
    backButton: {
        padding: 4,
    },
    title: {
        ...theme.textVariants.header,
        fontSize: 18,
        alignItems: 'center',
    },
    clearText: {
        color: theme.colors.error,
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledText: {
        color: theme.colors.textSecondary,
        opacity: 0.5,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        height: 80,
    },
    activeItem: {
        backgroundColor: theme.colors.border,
        elevation: 10,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    completedItem: {
        backgroundColor: theme.colors.background, // Go darker/lighter
        opacity: 0.8,
    },
    playButton: {
        marginRight: theme.spacing.m,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    itemArtist: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    completedText: {
        fontStyle: 'italic',
        color: theme.colors.textSecondary,
    },
    dragHandle: {
        padding: theme.spacing.s,
        marginRight: theme.spacing.s,
    },
    rightAction: {
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 20,
        width: '100%',
        height: '100%',
    },
    leftAction: {
        backgroundColor: theme.colors.error,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 20,
        width: '100%',
        height: '100%',
    },
    actionText: {
        color: 'white',
        fontWeight: 'bold',
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.m,
    },
    emptySubText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.s,
    },
});

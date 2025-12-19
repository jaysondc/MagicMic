import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, InteractionManager } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../lib/theme';
import { addSong } from '../lib/database';
import { searchItunes } from '../lib/itunes';
import { usePreview } from '../context/PreviewContext';

import { useToast } from '../context/ToastContext';
import PreviewBottomSheet from '../components/PreviewBottomSheet';

export default function AddSongScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { playPreview, stopPreview, currentUri, isPlaying, isLoading } = usePreview();

    useFocusEffect(
        useCallback(() => {
            return () => {
                stopPreview();
            };
        }, [])
    );

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2) {
                handleSearch(query);
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSearch = async (term) => {
        setLoading(true);
        setError(null);
        try {
            const data = await searchItunes(term);
            setResults(data);
        } catch (err) {
            setError('Failed to fetch songs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSong = async (item) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            // Get higher quality artwork by replacing 100x100 with 600x600
            const highResArtwork = item.artworkUrl100?.replace('100x100bb', '600x600bb');

            const newSongId = await addSong(item.trackName, item.artistName, {
                album_cover_url: highResArtwork || item.artworkUrl100,
                audio_sample_url: item.previewUrl,
                duration_ms: item.trackTimeMillis
            });

            showToast({
                message: `Added "${item.trackName}"`,
                type: 'success',
                actionLabel: 'Edit',
                onAction: () => navigation.navigate('SongDetails', { songId: newSongId })
            });

            InteractionManager.runAfterInteractions(() => {
                navigation.goBack();
            });
        } catch (err) {
            showToast({ message: 'Error adding song', type: 'error' });
        }
    };


    const [previewSheetVisible, setPreviewSheetVisible] = useState(false);
    const [previewSong, setPreviewSong] = useState(null);

    const handlePreview = (item) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        setPreviewSong(item);
        setPreviewSheetVisible(true);
    };

    const renderItem = ({ item }) => {
        const isCurrent = currentUri === item.previewUrl;
        const isThisPlaying = isCurrent && isPlaying;
        const isThisLoading = isCurrent && isLoading;

        return (
            <View style={styles.item}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                        playPreview(item.previewUrl);
                    }}
                    style={styles.artworkContainer}
                >
                    <Image source={{ uri: item.artworkUrl60 }} style={styles.artwork} />
                    <View style={styles.playOverlay}>
                        {isThisLoading ? (
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
                    onPress={() => handlePreview(item)}
                >
                    <Text style={styles.title}>{item.trackName}</Text>
                    <Text style={styles.artist}>{item.artistName}</Text>
                    <Text style={styles.album}>{item.collectionName}</Text>
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handlePreview(item)} style={styles.actionButton}>
                        <Ionicons name="document-text-outline" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAddSong(item)} style={styles.actionButton}>
                        <Ionicons name="add-circle" size={28} color={theme.colors.secondary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <TextInput
                        style={[styles.searchInput, query.length > 0 && styles.searchInputWithClear]}
                        placeholder="Search for a song..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus={true}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            setQuery('');
                        }} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}

            {error && <Text style={styles.error}>{error}</Text>}

            <FlatList
                data={results}
                renderItem={renderItem}
                keyExtractor={(item) => item.trackId.toString()}
                contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + theme.spacing.xl }]}
                ListEmptyComponent={
                    !loading && query.length > 2 ? (
                        <Text style={styles.emptyText}>No results found.</Text>
                    ) : null
                }
            />

            <PreviewBottomSheet
                isVisible={previewSheetVisible}
                onClose={() => setPreviewSheetVisible(false)}
                song={previewSong}
                safeBottomPadding={insets.bottom}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    searchContainer: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    searchInput: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        color: theme.colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchInputWithClear: {
        paddingRight: 40,
    },
    searchWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    clearButton: {
        position: 'absolute',
        right: theme.spacing.m,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loader: {
        marginTop: theme.spacing.xl,
    },
    error: {
        color: theme.colors.error,
        textAlign: 'center',
        marginTop: theme.spacing.m,
    },
    list: {
        padding: theme.spacing.m,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.s,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    artworkContainer: {
        position: 'relative',
        marginRight: theme.spacing.m,
    },
    artwork: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.s,
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
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    artist: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    album: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
    }
});

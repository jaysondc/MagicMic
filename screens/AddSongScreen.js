import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { addSong } from '../lib/database';
import { searchItunes } from '../lib/itunes';
import { usePreview } from '../context/PreviewContext';

import { useToast } from '../context/ToastContext';

export default function AddSongScreen({ navigation }) {
    const { showToast } = useToast();
    const { playPreview, stopPreview, currentUri, isPlaying } = usePreview();

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

    const handleAddSong = (item) => {
        try {
            // Get higher quality artwork by replacing 100x100 with 600x600
            const highResArtwork = item.artworkUrl100?.replace('100x100bb', '600x600bb');

            addSong(item.trackName, item.artistName, {
                album_cover_url: highResArtwork || item.artworkUrl100,
                audio_sample_url: item.previewUrl,
                duration_ms: item.trackTimeMillis
            });

            showToast({ message: `Added "${item.trackName}"`, type: 'success' });
            navigation.goBack();
        } catch (err) {
            showToast({ message: 'Error adding song', type: 'error' });
        }
    };

    const renderItem = ({ item }) => {
        const isCurrent = currentUri === item.previewUrl;
        const isThisPlaying = isCurrent && isPlaying;

        return (
            <View style={styles.item}>
                <TouchableOpacity
                    onPress={() => playPreview(item.previewUrl)}
                    style={styles.artworkContainer}
                >
                    <Image source={{ uri: item.artworkUrl60 }} style={styles.artwork} />
                    <View style={styles.playOverlay}>
                        <Ionicons
                            name={isThisPlaying ? "pause" : "play"}
                            size={20}
                            color="#fff"
                        />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.info}
                    onPress={() => handleAddSong(item)}
                >
                    <Text style={styles.title}>{item.trackName}</Text>
                    <Text style={styles.artist}>{item.artistName}</Text>
                    <Text style={styles.album}>{item.collectionName}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleAddSong(item)}>
                    <Text style={styles.addText}>+</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search for a song..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus={true}
                />
            </View>

            {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />}

            {error && <Text style={styles.error}>{error}</Text>}

            <FlatList
                data={results}
                renderItem={renderItem}
                keyExtractor={(item) => item.trackId.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    !loading && query.length > 2 ? (
                        <Text style={styles.emptyText}>No results found.</Text>
                    ) : null
                }
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
        width: 50,
        height: 50,
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
    addText: {
        color: theme.colors.secondary,
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: theme.spacing.m,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
    }
});

import { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getSongs, updateSong } from '../lib/database';
import { findSongMetadata } from '../lib/itunes';
import { fetchLyrics } from '../lib/lyrics';

export const useCachePopulation = () => {
    const [progress, setProgress] = useState({
        visible: false,
        total: 0,
        current: 0,
        currentSongName: '',
        bytesDownloaded: 0,
        isRunning: false
    });

    // Use a ref for the AbortController to persist across renders and closures
    const abortController = useRef(null);

    const ensureDirExists = async (dir) => {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
    };

    const processSong = async (song, previewsDir, existingFiles, signal) => {
        if (signal.aborted) return 0;

        let totalBytes = 0;
        let updates = {};
        let hasUpdates = false;

        // 1. Metadata
        try {
            if (!song.album_cover_url || !song.duration_ms || !song.audio_sample_url) {
                const metadata = await findSongMetadata(song.title, song.artist, signal);
                if (metadata) {
                    if (!song.album_cover_url && metadata.artworkUrl) {
                        updates.album_cover_url = metadata.artworkUrl;
                        hasUpdates = true;
                    }
                    if (!song.duration_ms && metadata.durationMs) {
                        updates.duration_ms = metadata.durationMs;
                        hasUpdates = true;
                    }
                    if (!song.audio_sample_url && metadata.previewUrl) {
                        updates.audio_sample_url = metadata.previewUrl;
                        hasUpdates = true;
                    }
                }
            }
        } catch (e) {
            if (e.name === 'AbortError') throw e;
        }

        if (signal.aborted) return 0;

        // 2. Lyrics
        try {
            if (!song.lyrics) {
                const songForLyrics = {
                    trackName: song.title,
                    artistName: song.artist,
                    trackTimeMillis: song.duration_ms || updates.duration_ms
                };
                const lyrics = await fetchLyrics(songForLyrics, signal);
                if (lyrics) {
                    updates.lyrics = lyrics;
                    hasUpdates = true;
                }
            }
        } catch (e) {
            if (e.name === 'AbortError') throw e;
        }

        if (signal.aborted) return 0;

        if (hasUpdates && !signal.aborted) {
            await updateSong(song.id, updates);
        }

        return totalBytes;
    };


    const startCachePopulation = useCallback(async (onComplete) => {
        // Create new controller
        abortController.current = new AbortController();
        const signal = abortController.current.signal;

        try {
            const songs = await getSongs();
            const previewsDir = FileSystem.documentDirectory + 'previews/';
            await ensureDirExists(previewsDir);

            // Pre-fetch all existing files for O(1) existence checks
            // This massively speeds up checking "already populated" songs
            const files = await FileSystem.readDirectoryAsync(previewsDir);
            const existingFiles = new Set(files);

            setProgress({
                visible: true,
                total: songs.length,
                current: 0,
                currentSongName: 'Initializing...',
                bytesDownloaded: 0,
                isRunning: true
            });

            let totalBytes = 0;
            let processedCount = 0;

            const BATCH_SIZE = 50;
            for (let i = 0; i < songs.length; i += BATCH_SIZE) {
                if (signal.aborted) break;

                const batch = songs.slice(i, i + BATCH_SIZE);

                if (batch.length > 0) {
                    setProgress(prev => ({
                        ...prev,
                        currentSongName: batch[0].title
                    }));
                }

                try {
                    const results = await Promise.all(batch.map(s => processSong(s, previewsDir, existingFiles, signal)));

                    if (signal.aborted) break;

                    const batchBytes = results.reduce((a, b) => a + b, 0);
                    totalBytes += batchBytes;
                    processedCount += batch.length;

                    setProgress(prev => ({
                        ...prev,
                        current: Math.min(processedCount, songs.length),
                        bytesDownloaded: totalBytes,
                        currentSongName: prev.currentSongName
                    }));
                } catch (batchError) {
                    if (batchError.name === 'AbortError') break;
                    // Ignore other errors in batch?
                }

                await new Promise(r => setTimeout(r, 0));
            }

            if (onComplete) onComplete(signal.aborted, totalBytes);

        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            if (abortController.current && !abortController.current.signal.aborted) {
                setProgress(prev => ({ ...prev, isRunning: false }));
            }
        }
    }, []);

    const cancelCachePopulation = useCallback(() => {
        if (abortController.current) {
            abortController.current.abort();
        }
        setProgress(prev => ({ ...prev, currentSongName: 'Cancelling...', isRunning: false }));
    }, []);

    const hideProgressModal = useCallback(() => {
        setProgress(prev => ({ ...prev, visible: false }));
    }, []);

    return {
        progress,
        startCachePopulation,
        cancelCachePopulation,
        hideProgressModal
    };
};

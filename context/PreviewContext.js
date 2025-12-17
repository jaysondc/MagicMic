
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Audio } from 'expo-av';
import { findSongMetadata } from '../lib/itunes';
import { updateSong } from '../lib/database';

const PreviewContext = createContext();

export const usePreview = () => useContext(PreviewContext);

export const PreviewProvider = ({ children }) => {
    const [currentUri, setCurrentUri] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [loadingSongId, setLoadingSongId] = useState(null);
    const loadingSongIdRef = useRef(null);

    const soundRef = useRef(null);

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const fadeOut = async (soundObj) => {
        if (!soundObj) return;
        try {
            // Fast fade out (3 steps * 10ms = 30ms)
            const steps = 3;
            for (let i = steps; i >= 0; i--) {
                if (!soundObj._loaded) break; // Check if still loaded
                await soundObj.setVolumeAsync(i / steps);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (e) {
            // Ignore errors during fade
        }
    };

    const fadeIn = async (soundObj) => {
        if (!soundObj) return;
        try {
            // Fast fade in
            await soundObj.setVolumeAsync(0);
            const steps = 3;
            for (let i = 0; i <= steps; i++) {
                if (!soundObj._loaded) break;
                await soundObj.setVolumeAsync(i / steps);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (e) {
            console.log('Error fading in:', e);
        }
    };

    // Use a ref to store the latest callback logic to avoid stale closures
    const onPlaybackStatusUpdateCallback = useRef((status) => { });

    // Update the ref whenever the logic dependencies change (though usually stable)
    useEffect(() => {
        onPlaybackStatusUpdateCallback.current = (status) => {
            if (status.isLoaded) {
                setDuration(status.durationMillis);
                setPosition(status.positionMillis);

                if (status.didJustFinish) {
                    setIsPlaying(false);
                    setPosition(status.durationMillis);
                    if (soundRef.current) {
                        // Explicitly stop and reset
                        soundRef.current.stopAsync();
                        soundRef.current.setPositionAsync(0);
                        soundRef.current.setVolumeAsync(1);
                    }
                }
            } else if (status.error) {
                console.log(`Player Error: ${status.error}`);
                setIsPlaying(false);
            }
        };
    });

    const onPlaybackStatusUpdate = (status) => {
        if (onPlaybackStatusUpdateCallback.current) {
            onPlaybackStatusUpdateCallback.current(status);
        }
    };

    const playbackGenRef = useRef(0);

    const playPreview = async (uri) => {
        if (!uri) return;

        const myGen = ++playbackGenRef.current;

        try {
            // Case 1: Toggling the same song
            if (currentUri === uri && soundRef.current) {
                if (isPlaying) {
                    setIsPlaying(false);
                    await fadeOut(soundRef.current);
                    if (myGen !== playbackGenRef.current) return;
                    if (soundRef.current._loaded) await soundRef.current.pauseAsync();
                } else {
                    // Reset to start if it was finished/at end
                    const status = await soundRef.current.getStatusAsync();
                    if (status.positionMillis >= status.durationMillis) {
                        await soundRef.current.setPositionAsync(0);
                    }

                    setIsPlaying(true);
                    if (soundRef.current._loaded) {
                        await soundRef.current.setVolumeAsync(0); // Ensure volume starts at 0 for fade in
                        await soundRef.current.playAsync();
                        fadeIn(soundRef.current);
                    }
                }
                return;
            }

            // Case 2: New song
            // Update UI immediately (optimistic switch)
            setIsLoading(true);
            setIsPlaying(false);
            setCurrentUri(uri);

            // Detach and clean up old sound in PARALLEL
            const oldSound = soundRef.current;
            soundRef.current = null;

            if (oldSound) {
                // Fire and forget cleanup
                fadeOut(oldSound)
                    .then(() => oldSound.unloadAsync())
                    .catch(() => { });
            }

            // Load new sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false, volume: 0, progressUpdateIntervalMillis: 50 },
                onPlaybackStatusUpdate
            );

            // Check if cancelled
            if (myGen !== playbackGenRef.current) {
                await newSound.unloadAsync();
                return;
            }

            soundRef.current = newSound;

            // Start playing immediately before fade in
            await newSound.playAsync();
            setIsPlaying(true); // Sync UI with actual audio start
            setIsLoading(false);

            fadeIn(newSound); // Fire and forget fade in

        } catch (error) {
            console.log('Error playing preview:', error);
            if (myGen === playbackGenRef.current) {
                setIsPlaying(false);
                setIsLoading(false);
                setCurrentUri(null);
            }
        }
    };

    const fetchLyrics = async (title, artist, durationMs) => {
        if (!title || !artist) return null;

        try {
            let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
            if (durationMs) {
                const durationSeconds = Math.round(durationMs / 1000);
                url += `&duration=${durationSeconds}`;
            }

            console.log('Fetching lyrics from:', url);
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return data.plainLyrics || null;
            }
        } catch (error) {
            console.log('Error fetching lyrics in context:', error);
        }
        return null;
    };

    const playSong = async (song, onUrlFound) => {
        // Prevent re-trigger if already loading this song
        if (loadingSongId === song.id) return;

        // If we have the URL, play it but still check for missing metadata
        if (song.audio_sample_url) {
            // Cancel any pending load
            loadingSongIdRef.current = null;
            setLoadingSongId(null);
            playPreview(song.audio_sample_url);

            // Fetch missing metadata in the background
            if (!song.duration_ms || !song.lyrics) {
                fetchMissingMetadata(song, onUrlFound);
            }
            return;
        }

        // Need to fetch everything
        loadingSongIdRef.current = song.id;
        setLoadingSongId(song.id);

        try {
            const metadata = await findSongMetadata(song.title, song.artist);

            // Check race condition
            if (loadingSongIdRef.current !== song.id) return;

            if (metadata && metadata.previewUrl) {
                const updates = { audio_sample_url: metadata.previewUrl };

                // Save artwork if found and not already present
                if (metadata.artworkUrl && !song.album_cover_url) {
                    updates.album_cover_url = metadata.artworkUrl;
                }

                // Save duration if found and not already present
                if (metadata.durationMs && !song.duration_ms) {
                    updates.duration_ms = metadata.durationMs;
                    console.log('Saving duration:', metadata.durationMs);
                }

                // Fetch lyrics in parallel (don't block playback)
                if (!song.lyrics) {
                    fetchLyrics(song.title, song.artist, metadata.durationMs).then(lyrics => {
                        if (lyrics) {
                            console.log('Saving lyrics for song:', song.id);
                            updateSong(song.id, { lyrics });
                        }
                    });
                }

                updateSong(song.id, updates);

                if (onUrlFound) onUrlFound(song.id, metadata.previewUrl, updates.album_cover_url, updates.duration_ms);
                playPreview(metadata.previewUrl);
            } else {
                // Could not find preview
                // Maybe play error sound or just stop
            }
        } catch (error) {
            console.log('Error fetching preview in context:', error);
        } finally {
            if (loadingSongIdRef.current === song.id) {
                loadingSongIdRef.current = null;
                setLoadingSongId(null);
            }
        }
    };

    const fetchMissingMetadata = async (song, onUrlFound) => {
        try {
            const metadata = await findSongMetadata(song.title, song.artist);

            if (metadata) {
                const updates = {};

                // Save duration if found and not already present
                if (metadata.durationMs && !song.duration_ms) {
                    updates.duration_ms = metadata.durationMs;
                    console.log('Saving duration (background):', metadata.durationMs);
                }

                // Fetch lyrics in parallel
                if (!song.lyrics) {
                    fetchLyrics(song.title, song.artist, metadata.durationMs).then(lyrics => {
                        if (lyrics) {
                            console.log('Saving lyrics for song (background):', song.id);
                            updateSong(song.id, { lyrics });
                        }
                    });
                }

                if (Object.keys(updates).length > 0) {
                    updateSong(song.id, updates);

                    // Notify UI of duration update
                    if (onUrlFound && updates.duration_ms) {
                        onUrlFound(song.id, song.audio_sample_url, song.album_cover_url, updates.duration_ms);
                    }
                }
            }
        } catch (error) {
            console.log('Error fetching missing metadata:', error);
        }
    };

    const stopPreview = async () => {
        if (soundRef.current) {
            setIsPlaying(false);
            await fadeOut(soundRef.current);
            await soundRef.current.stopAsync();
        }
    };

    return (
        <PreviewContext.Provider value={{
            playPreview,
            stopPreview,
            currentUri,
            isPlaying,
            isLoading,
            duration,
            position,
            loadingSongId,
            playSong
        }}>
            {children}
        </PreviewContext.Provider>
    );
};

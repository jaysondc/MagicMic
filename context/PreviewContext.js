
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Audio } from 'expo-av';
import { findPreviewUrl } from '../lib/itunes';
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
            // Fade out over ~60ms
            const steps = 6;
            for (let i = steps; i >= 0; i--) {
                await soundObj.setVolumeAsync(i / steps);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (e) {
            console.log('Error fading out:', e);
        }
    };

    const fadeIn = async (soundObj) => {
        if (!soundObj) return;
        try {
            await soundObj.setVolumeAsync(0);
            await soundObj.playAsync();
            // Fade in over ~150ms
            const steps = 6;
            for (let i = 0; i <= steps; i++) {
                await soundObj.setVolumeAsync(i / steps);
                await new Promise(resolve => setTimeout(resolve, 25));
            }
        } catch (e) {
            console.log('Error fading in:', e);
        }
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setDuration(status.durationMillis);
            setPosition(status.positionMillis);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(status.durationMillis);
                if (soundRef.current) {
                    soundRef.current.setPositionAsync(0);
                    // Also reset volume for next play
                    soundRef.current.setVolumeAsync(1);
                }
            }
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
                    if (soundRef.current) await soundRef.current.pauseAsync();
                } else {
                    setIsPlaying(true);
                    await fadeIn(soundRef.current);
                }
                return;
            }

            // Case 2: New song or first song
            setIsLoading(true);

            // Detach and unload previous sound immediately from our tracker
            const oldSound = soundRef.current;
            soundRef.current = null;

            if (oldSound) {
                setIsPlaying(false);
                try {
                    await fadeOut(oldSound);
                    await oldSound.unloadAsync();
                } catch (e) {
                    console.log('Error unloading previous sound:', e);
                }
            }

            // If another request came in while we were unloading, abort
            if (myGen !== playbackGenRef.current) {
                setIsLoading(false);
                return;
            }

            // Load new sound
            setCurrentUri(uri);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false, volume: 0, progressUpdateIntervalMillis: 50 },
                onPlaybackStatusUpdate
            );

            // Check gen again before committing
            if (myGen !== playbackGenRef.current) {
                await newSound.unloadAsync();
                setIsLoading(false);
                return;
            }

            soundRef.current = newSound;
            setIsPlaying(true);
            await fadeIn(newSound);

        } catch (error) {
            console.log('Error playing preview:', error);
            // Reset state on error only if we are still the active request
            if (myGen === playbackGenRef.current) {
                setIsPlaying(false);
                setCurrentUri(null);
            }
        } finally {
            if (myGen === playbackGenRef.current) {
                setIsLoading(false);
            }
        }
    };

    const playSong = async (song, onUrlFound) => {
        // Prevent re-trigger if already loading this song
        if (loadingSongId === song.id) return;

        // If we have the URL, just play
        if (song.audio_sample_url) {
            // Cancel any pending load
            loadingSongIdRef.current = null;
            setLoadingSongId(null);
            playPreview(song.audio_sample_url);
            return;
        }

        // Need to fetch
        loadingSongIdRef.current = song.id;
        setLoadingSongId(song.id);

        try {
            const url = await findPreviewUrl(song.title, song.artist);

            // Check race condition
            if (loadingSongIdRef.current !== song.id) return;

            if (url) {
                updateSong(song.id, { audio_sample_url: url });
                if (onUrlFound) onUrlFound(song.id, url);
                playPreview(url);
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

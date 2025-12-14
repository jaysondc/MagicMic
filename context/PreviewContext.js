
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Audio } from 'expo-av';

const PreviewContext = createContext();

export const usePreview = () => useContext(PreviewContext);

export const PreviewProvider = ({ children }) => {
    const [currentUri, setCurrentUri] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);

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
            // Fade out over ~150ms
            const steps = 6;
            for (let i = steps; i >= 0; i--) {
                await soundObj.setVolumeAsync(i / steps);
                await new Promise(resolve => setTimeout(resolve, 25));
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

    const playPreview = async (uri) => {
        if (!uri) return;

        try {
            setIsLoading(true);

            // Case 1: Toggling the same song
            if (currentUri === uri && soundRef.current) {
                if (isPlaying) {
                    setIsPlaying(false);
                    await fadeOut(soundRef.current);
                    await soundRef.current.pauseAsync();
                } else {
                    setIsPlaying(true);
                    await fadeIn(soundRef.current);
                }
                setIsLoading(false);
                return;
            }

            // Case 2: New song or first song
            // Unload previous if exists
            if (soundRef.current) {
                setIsPlaying(false);
                await fadeOut(soundRef.current); // smooth transition
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            // Load new
            setCurrentUri(uri);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false, volume: 0, progressUpdateIntervalMillis: 50 },
                onPlaybackStatusUpdate
            );

            soundRef.current = newSound;
            setIsPlaying(true);
            await fadeIn(newSound);

        } catch (error) {
            console.log('Error playing preview:', error);
            // Reset state on error
            setIsPlaying(false);
            setCurrentUri(null);
        } finally {
            setIsLoading(false);
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
            position
        }}>
            {children}
        </PreviewContext.Provider>
    );
};

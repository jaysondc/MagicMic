import { useState, useCallback } from 'react';

export const useSongUpdates = () => {
    const [localUpdates, setLocalUpdates] = useState({});

    const handlePreviewUrlUpdate = useCallback((id, url, artworkUrl, durationMs) => {
        setLocalUpdates(prev => ({
            ...prev,
            [id]: {
                audio_sample_url: url,
                album_cover_url: artworkUrl,
                ...(durationMs && { duration_ms: durationMs })
            }
        }));
    }, []);

    const applyUpdates = useCallback((songs) => {
        return songs.map(song => {
            const updates = localUpdates[song.id];
            return updates ? { ...song, ...updates } : song;
        });
    }, [localUpdates]);

    return {
        localUpdates,
        handlePreviewUrlUpdate,
        applyUpdates,
    };
};

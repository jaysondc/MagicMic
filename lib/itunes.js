
export const searchItunes = async (term, signal) => {
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=20`, { signal });
        const data = await response.json();
        return data.results || [];
    } catch (err) {
        if (err.name === 'AbortError') {
            // Ignore/Rethrow? Usually rethrow so caller knows it was aborted
            throw err;
        }
        console.error('iTunes search error:', err);
        throw err;
    }
};

export const findPreviewUrl = async (title, artist, signal) => {
    // Search for the specific song
    const query = `${title} ${artist}`;
    const results = await searchItunes(query, signal);
    if (results.length > 0) {
        return results[0].previewUrl;
    }
    return null;
};

export const findSongMetadata = async (title, artist, signal) => {
    const query = `${title} ${artist}`;
    const results = await searchItunes(query, signal);
    if (results.length > 0) {
        const item = results[0];
        // Get high-res artwork
        const artworkUrl = item.artworkUrl100?.replace('100x100bb', '600x600bb');
        return {
            previewUrl: item.previewUrl,
            artworkUrl: artworkUrl || item.artworkUrl100,
            trackName: item.trackName,
            artistName: item.artistName,
            durationMs: item.trackTimeMillis
        };
    }
    return null;
};

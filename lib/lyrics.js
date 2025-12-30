
export const fetchLyrics = async (songData, signal) => {
    if (!songData.trackName || !songData.artistName) return null;

    try {
        let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(songData.artistName)}&track_name=${encodeURIComponent(songData.trackName)}`;
        if (songData.trackTimeMillis) {
            const durationSeconds = Math.round(songData.trackTimeMillis / 1000);
            url += `&duration=${durationSeconds}`;
        }

        const response = await fetch(url, { signal });
        if (response.ok) {
            const data = await response.json();
            return data.plainLyrics || null;
        }
        return null;
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.error('Error fetching lyrics:', error);
        return null;
    }
};

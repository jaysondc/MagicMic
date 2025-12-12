import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('karaoke.db');

// Initialize database
export const initDatabase = () => {
    db.execSync(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album_cover_url TEXT,
      lyrics_preview TEXT,
      lyrics TEXT,
      audio_sample_url TEXT,
      duration_ms INTEGER,
      status TEXT DEFAULT 'to_try',
      my_rating INTEGER DEFAULT 0,
      sing_count INTEGER DEFAULT 0,
      last_sung_date INTEGER,
      category TEXT DEFAULT 'repertoire',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS song_tags (
      song_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (song_id, tag_id),
      FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    );
  `);
};

// Run migrations to add new columns to existing tables
export const runMigrations = () => {
    try {
        const tableInfo = db.getAllSync('PRAGMA table_info(songs)');
        const hasAudioSampleUrl = tableInfo.some(col => col.name === 'audio_sample_url');
        const hasAlbumCoverUrl = tableInfo.some(col => col.name === 'album_cover_url');
        const hasLyrics = tableInfo.some(col => col.name === 'lyrics');
        const hasDuration = tableInfo.some(col => col.name === 'duration_ms');

        if (!hasAudioSampleUrl) {
            console.log('Adding audio_sample_url column...');
            db.execSync('ALTER TABLE songs ADD COLUMN audio_sample_url TEXT');
        }

        if (!hasAlbumCoverUrl) {
            console.log('Adding album_cover_url column...');
            db.execSync('ALTER TABLE songs ADD COLUMN album_cover_url TEXT');
        }

        if (!hasLyrics) {
            console.log('Adding lyrics column...');
            db.execSync('ALTER TABLE songs ADD COLUMN lyrics TEXT');
        }

        if (!hasDuration) {
            console.log('Adding duration_ms column...');
            db.execSync('ALTER TABLE songs ADD COLUMN duration_ms INTEGER');
        }
    } catch (error) {
        console.log('Migration error (may be safe to ignore):', error);
    }
};

// Get all songs (with optional search filter)
export const getSongs = (searchQuery = '', sortBy = 'created_at', sortOrder = 'DESC') => {
    const validSortColumns = ['created_at', 'last_sung_date', 'sing_count', 'my_rating', 'updated_at'];
    const safeSortBy = validSortColumns.includes(sortBy) ? `songs.${sortBy}` : 'songs.created_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const query = `
    SELECT songs.*, 
           GROUP_CONCAT(tags.name, ',') as tag_names,
           GROUP_CONCAT(tags.color, ',') as tag_colors,
           GROUP_CONCAT(tags.id, ',') as tag_ids
    FROM songs 
    LEFT JOIN song_tags ON songs.id = song_tags.song_id 
    LEFT JOIN tags ON song_tags.tag_id = tags.id 
    ${searchQuery ? 'WHERE songs.title LIKE ? OR songs.artist LIKE ? OR songs.lyrics_preview LIKE ?' : ''}
    GROUP BY songs.id
    ORDER BY ${safeSortBy} ${safeSortOrder}
  `;

    const params = searchQuery ? [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`] : [];
    const results = db.getAllSync(query, params);

    // Parse tags from GROUP_CONCAT
    return results.map(song => ({
        ...song,
        tags: song.tag_ids ? song.tag_ids.split(',').map((id, index) => ({
            id: parseInt(id),
            name: song.tag_names.split(',')[index],
            color: song.tag_colors.split(',')[index]
        })) : []
    }));
};

// Get all tags
export const getTags = () => {
    return db.getAllSync('SELECT * FROM tags ORDER BY name ASC');
};

// Add a new tag
export const addTag = (name, color) => {
    try {
        const result = db.runSync(
            'INSERT INTO tags (name, color) VALUES (?, ?)',
            [name, color]
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.log('Tag already exists or error:', error);
        const existing = db.getFirstSync('SELECT id FROM tags WHERE name = ?', [name]);
        return existing ? existing.id : null;
    }
};

// Link tag to song
export const linkTagToSong = (songId, tagId) => {
    try {
        db.runSync(
            'INSERT INTO song_tags (song_id, tag_id) VALUES (?, ?)',
            [songId, tagId]
        );
    } catch (error) {
        // Ignore duplicate links
    }
};

// Add a new song (with optional restoration of all fields)
export const addSong = (title, artist, options = {}) => {
    const now = Date.now();
    const {
        album_cover_url = null,
        audio_sample_url = null,
        duration_ms = null,
        lyrics = null,
        lyrics_preview = null,
        status = 'to_try',
        my_rating = 0,
        sing_count = 0,
        last_sung_date = null,
        category = 'repertoire',
        created_at = now,
        updated_at = now
    } = options;

    const result = db.runSync(
        `INSERT INTO songs (title, artist, album_cover_url, audio_sample_url, duration_ms, lyrics, lyrics_preview, status, my_rating, sing_count, last_sung_date, category, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, artist, album_cover_url, audio_sample_url, duration_ms, lyrics, lyrics_preview, status, my_rating, sing_count, last_sung_date, category, created_at, updated_at]
    );
    return result.lastInsertRowId;
};

// Update a song
export const updateSong = (id, updates) => {
    const now = Date.now();
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, id];

    db.runSync(
        `UPDATE songs SET ${fields}, updated_at = ? WHERE id = ?`,
        values
    );
};

// Delete a song
export const deleteSong = (id) => {
    db.runSync('DELETE FROM songs WHERE id = ?', [id]);
};

// Reset database (drop and recreate table)
export const resetDatabase = () => {
    db.execSync('DROP TABLE IF EXISTS song_tags');
    db.execSync('DROP TABLE IF EXISTS tags');
    db.execSync('DROP TABLE IF EXISTS songs');
    initDatabase();
};

// Seed database with initial data
export const seedDatabase = (data) => {
    const now = Date.now();
    db.withTransactionSync(() => {
        // Cache for tag IDs to avoid repeated lookups
        const tagCache = {};

        // Helper to get or create tag
        const getOrCreateTag = (tagName) => {
            if (tagCache[tagName]) return tagCache[tagName];

            // Generate random neon color for new tags
            const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#00FF00', '#FFA500'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            const id = addTag(tagName, color);
            tagCache[tagName] = id;
            return id;
        };

        data.forEach(song => {
            // Generate mock duration between 3:00 (180000ms) and 5:00 (300000ms)
            // const mockDuration = Math.floor(Math.random() * (300000 - 180000 + 1)) + 180000;

            const songId = db.runSync(
                `INSERT INTO songs (title, artist, album_cover_url, audio_sample_url, lyrics, duration_ms, status, my_rating, sing_count, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'to_try', 0, 0, ?, ?)`,
                [song.title, song.artist, song.album_cover_url || null, song.audio_sample_url || null, song.lyrics || null, null, now, now]
            ).lastInsertRowId;

            // Add tags from seed data
            if (song.tags && Array.isArray(song.tags)) {
                song.tags.forEach(tagName => {
                    const tagId = getOrCreateTag(tagName);
                    linkTagToSong(songId, tagId);
                });
            }

            // Auto-tag based on artist (simple heuristic)
            if (song.artist.includes('Queen') || song.artist.includes('Bon Jovi')) {
                const tagId = getOrCreateTag('Rock');
                linkTagToSong(songId, tagId);
            }
            if (song.artist.includes('Usher') || song.artist.includes('Beyoncé')) {
                const tagId = getOrCreateTag('R&B');
                linkTagToSong(songId, tagId);
            }
        });
    });
};

export default db;

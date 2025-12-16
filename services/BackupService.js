import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import db from '../lib/database';

export const BackupService = {
    async exportData() {
        try {
            const songs = db.getAllSync('SELECT * FROM songs');
            const tags = db.getAllSync('SELECT * FROM tags');
            const songTags = db.getAllSync('SELECT * FROM song_tags');

            const data = {
                version: 1,
                timestamp: Date.now(),
                songs,
                tags,
                song_tags: songTags,
            };

            const json = JSON.stringify(data, null, 2);
            const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 16).replace('T', '_');
            const filename = `MagicMic_Backup_${timestamp}.json`;
            const fileUri = FileSystem.cacheDirectory + filename;

            await FileSystem.writeAsStringAsync(fileUri, json, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Export Backup',
                UTI: 'public.json',
            });
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    },

    async importData() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return false; // User cancelled
            }

            const fileUri = result.assets[0].uri;
            const json = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            const data = JSON.parse(json);

            if (!data.version || !data.songs || !data.tags) {
                throw new Error('Invalid backup file format');
            }

            await db.withTransactionSync(() => {
                // 1. Clear existing data
                db.execSync('DELETE FROM song_tags');
                db.execSync('DELETE FROM tags'); // song_tags references this, order matters if FK constraints active?
                db.execSync('DELETE FROM songs'); // song_tags references this

                // Re-enable FKs if needed, usually on by default in expo-sqlite? 
                // Best to just delete children first.

                // 2. Insert Songs
                const songStmt = db.prepareSync(`
             INSERT INTO songs (id, title, artist, album_cover_url, lyrics_preview, lyrics, audio_sample_url, duration_ms, status, my_rating, sing_count, last_sung_date, category, created_at, updated_at)
             VALUES ($id, $title, $artist, $album_cover_url, $lyrics_preview, $lyrics, $audio_sample_url, $duration_ms, $status, $my_rating, $sing_count, $last_sung_date, $category, $created_at, $updated_at)
          `);

                for (const song of data.songs) {
                    songStmt.executeSync({
                        $id: song.id,
                        $title: song.title,
                        $artist: song.artist,
                        $album_cover_url: song.album_cover_url || null,
                        $lyrics_preview: song.lyrics_preview || null,
                        $lyrics: song.lyrics || null,
                        $audio_sample_url: song.audio_sample_url || null,
                        $duration_ms: song.duration_ms || null,
                        $status: song.status || 'to_try',
                        $my_rating: song.my_rating || 0,
                        $sing_count: song.sing_count || 0,
                        $last_sung_date: song.last_sung_date || null,
                        $category: song.category || 'repertoire',
                        $created_at: song.created_at,
                        $updated_at: song.updated_at
                    });
                }
                songStmt.finalizeSync();

                // 3. Insert Tags
                const tagStmt = db.prepareSync(`
              INSERT INTO tags (id, name, color)
              VALUES ($id, $name, $color)
          `);
                for (const tag of data.tags) {
                    tagStmt.executeSync({
                        $id: tag.id,
                        $name: tag.name,
                        $color: tag.color
                    });
                }
                tagStmt.finalizeSync();

                // 4. Insert SongTags
                const stStmt = db.prepareSync(`
              INSERT INTO song_tags (song_id, tag_id)
              VALUES ($song_id, $tag_id)
          `);
                for (const st of data.song_tags) {
                    stStmt.executeSync({
                        $song_id: st.song_id,
                        $tag_id: st.tag_id
                    });
                }
                stStmt.finalizeSync();
            });

            return true; // Success
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    },
};

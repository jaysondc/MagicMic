import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'songs',
            columns: [
                { name: 'title', type: 'string' },
                { name: 'artist', type: 'string' },
                { name: 'album_cover_url', type: 'string', isOptional: true },
                { name: 'lyrics_preview', type: 'string', isOptional: true },
                { name: 'audio_sample_url', type: 'string', isOptional: true },
                { name: 'status', type: 'string' }, // 'repertoire' | 'to_try' | 'archived'
                { name: 'my_rating', type: 'number' },
                { name: 'sing_count', type: 'number' },
                { name: 'last_sung_date', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'tags',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' }, // 'auto' | 'custom'
                { name: 'color_hex', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'song_tags',
            columns: [
                { name: 'song_id', type: 'string', isIndexed: true },
                { name: 'tag_id', type: 'string', isIndexed: true },
            ],
        }),
    ],
})

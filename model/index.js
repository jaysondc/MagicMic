import { Platform } from 'react-native'
import { Database } from '@nozbe/watermelondb'
import { mySchema } from './schema'
import Song from './Song'
import Tag from './Tag'
import SongTag from './SongTag'

let adapter;

if (Platform.OS === 'web') {
    const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
    adapter = new LokiJSAdapter({
        schema: mySchema,
        useWebWorker: false,
        useIncrementalIndexedDB: true,
        onSetUpError: error => {
            console.error('LokiJS Database failed to load', error)
        }
    });
} else {
    const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
    adapter = new SQLiteAdapter({
        schema: mySchema,
        jsi: false, // Expo Go doesn't support JSI
        onSetUpError: error => {
            console.error('SQLite Database failed to load', error)
        }
    });
}

export const database = new Database({
    adapter,
    modelClasses: [
        Song,
        Tag,
        SongTag,
    ],
})

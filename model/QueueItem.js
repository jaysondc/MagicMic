import { Model } from '@nozbe/watermelondb'
import { field, date, relation } from '@nozbe/watermelondb/decorators'

export default class QueueItem extends Model {
    static table = 'queue_items'
    static associations = {
        songs: { type: 'belongs_to', key: 'song_id' },
    }

    @field('song_id') songId
    @field('sort_order') sortOrder
    @date('created_at') createdAt

    @relation('songs', 'song_id') song
}

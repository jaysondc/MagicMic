import { Model } from '@nozbe/watermelondb'
import { field, relation, immutableRelation } from '@nozbe/watermelondb/decorators'

export default class SongTag extends Model {
    static table = 'song_tags'
    static associations = {
        songs: { type: 'belongs_to', key: 'song_id' },
        tags: { type: 'belongs_to', key: 'tag_id' },
    }

    @immutableRelation('songs', 'song_id') song
    @immutableRelation('tags', 'tag_id') tag
}

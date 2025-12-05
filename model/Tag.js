import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators'

export default class Tag extends Model {
    static table = 'tags'
    static associations = {
        song_tags: { type: 'has_many', foreignKey: 'tag_id' },
    }

    @field('name') name
    @field('type') type
    @field('color_hex') colorHex
    @readonly @date('created_at') createdAt
    @readonly @date('updated_at') updatedAt

    @children('song_tags') songTags
}

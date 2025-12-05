import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators'

export default class Song extends Model {
    static table = 'songs'
    static associations = {
        song_tags: { type: 'has_many', foreignKey: 'song_id' },
    }

    @field('title') title
    @field('artist') artist
    @field('album_cover_url') albumCoverUrl
    @field('lyrics_preview') lyricsPreview
    @field('audio_sample_url') audioSampleUrl
    @field('status') status
    @field('my_rating') myRating
    @field('sing_count') singCount
    @date('last_sung_date') lastSungDate
    @readonly @date('created_at') createdAt
    @readonly @date('updated_at') updatedAt

    @children('song_tags') songTags
}

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../lib/seedData.js');
const rawContent = fs.readFileSync(seedPath, 'utf8');

// Extract the array using regex
const match = rawContent.match(/export const seedData = (\[[\s\S]*?\]);/);

if (!match) {
    console.error('Could not find seedData array in file.');
    process.exit(1);
}

// Evaluate the string to get the object
let songs = eval(match[1]);

// Genre Helper
const getGenres = (artist, title) => {
    const tags = new Set();
    const lowerArtist = artist.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // HEURISTICS

    // R&B / Soul (Priority over Pop for these artists)
    if (lowerArtist.includes('usher') ||
        lowerArtist.includes('boyz ii men') ||
        lowerArtist.includes('tlc') ||
        lowerArtist.includes('destiny\'s child') ||
        lowerArtist.includes('aaliyah') ||
        lowerArtist.includes('ginuwine') ||
        lowerArtist.includes('blackstreet') ||
        lowerArtist.includes('r. kelly') ||
        lowerArtist.includes('ne-yo') ||
        lowerArtist.includes('alicia keys') ||
        lowerArtist.includes('john legend') ||
        lowerArtist.includes('the weeknd') ||
        lowerArtist.includes('mariah carey') ||
        lowerArtist.includes('whitney houston') ||
        lowerArtist.includes('beyoncé') ||
        lowerArtist.includes('beyonce') ||
        lowerArtist.includes('rihanna') ||
        lowerArtist.includes('lauryn hill') ||
        lowerArtist.includes('fugees') ||
        lowerArtist.includes('erykah badu') ||
        lowerArtist.includes('maxwell') ||
        lowerArtist.includes('d\'angelo') ||
        lowerArtist.includes('jill scott') ||
        lowerArtist.includes('sade') ||
        lowerArtist.includes('stevie wonder') ||
        lowerArtist.includes('marvin gaye') ||
        lowerArtist.includes('earth, wind & fire') ||
        lowerArtist.includes('the temptations') ||
        lowerArtist.includes('the supremes') ||
        lowerArtist.includes('the four tops') ||
        lowerArtist.includes('gladys knight') ||
        lowerArtist.includes('smokey robinson') ||
        lowerArtist.includes('al green') ||
        lowerArtist.includes('aretha franklin') ||
        lowerArtist.includes('etta james') ||
        lowerArtist.includes('sam cooke') ||
        lowerArtist.includes('otis redding') ||
        lowerArtist.includes('ray charles') ||
        lowerArtist.includes('bruno mars') || // Often qualifies as R&B/Soul/Pop
        lowerArtist.includes('silk sonic') ||
        lowerArtist.includes('childish gambino') ||
        lowerArtist.includes('frank ocean') ||
        lowerArtist.includes('sza') ||
        lowerArtist.includes('khalid') ||
        lowerArtist.includes('h.e.r.') ||
        lowerArtist.includes('summer walker') ||
        lowerArtist.includes('toni braxton') ||
        lowerArtist.includes('brandy') ||
        lowerArtist.includes('monica') ||
        lowerArtist.includes('mya') ||
        lowerArtist.includes('ciara') ||
        lowerArtist.includes('keyshia cole') ||
        lowerArtist.includes('fantasia') ||
        lowerArtist.includes('jennifer hudson') ||
        lowerArtist.includes('mary j. blige')) {
        tags.add('R&B');
    }

    // Rock / Banger
    if (lowerArtist.includes('blink-182') || lowerArtist.includes('sum 41') || lowerArtist.includes('green day') || lowerArtist.includes('fall out boy') || lowerArtist.includes('paramore') || lowerArtist.includes('panic! at the disco') || lowerArtist.includes('my chemical romance') || lowerArtist.includes('weezer') || lowerArtist.includes('yellowcard') || lowerArtist.includes('simple plan') || lowerArtist.includes('good charlotte') || lowerArtist.includes('avril lavigne') || lowerArtist.includes('relient k') || lowerArtist.includes('lit') || lowerArtist.includes('fountains of wayne') || lowerArtist.includes('jimmy eat world') || lowerArtist.includes('new found glory') || lowerArtist.includes('all-american rejects') || lowerArtist.includes('linkin park') || lowerArtist.includes('evanecence') || lowerArtist.includes('evanescence') || lowerArtist.includes('hoobastank') || lowerArtist.includes('3 doors down') || lowerArtist.includes('creed') || lowerArtist.includes('nickelback') || lowerArtist.includes('foo fighters') || lowerArtist.includes('red hot chili peppers') || lowerArtist.includes('sublime') || lowerArtist.includes('no doubt') || lowerArtist.includes('the killers') || lowerArtist.includes('kings of leon') || lowerArtist.includes('coldplay') || lowerArtist.includes('imagine dragons') || lowerArtist.includes('one republic') || lowerArtist.includes('onerepublic') || lowerArtist.includes('train') || lowerArtist.includes('goo goo dolls') || lowerArtist.includes('matchbox twenty') || lowerArtist.includes('third eye blind')) {
        tags.add('Rock');
        tags.add('Banger');
    } else if (lowerArtist.includes('queen') || lowerArtist.includes('bon jovi') || lowerArtist.includes('journey') || lowerArtist.includes('aerosmith') || lowerArtist.includes('guns n roses') || lowerArtist.includes('ac/dc') || lowerArtist.includes('nirvana') || lowerArtist.includes('metallica') || lowerArtist.includes('led zeppelin') || lowerArtist.includes('pink floyd') || lowerArtist.includes('the beatles') || lowerArtist.includes('rolling stones') || lowerArtist.includes('eagles') || lowerArtist.includes('fleetwood mac') || lowerArtist.includes('tom petty') || lowerArtist.includes('def leppard') || lowerArtist.includes('kiss') || lowerArtist.includes('police') || lowerArtist.includes('u2') || lowerArtist.includes('bruce springsteen') || lowerArtist.includes('billy joel') || lowerArtist.includes('elton john') || lowerArtist.includes('david bowie')) {
        tags.add('Rock');
        tags.add('Classic');
    }

    // Hip Hop
    else if (lowerArtist.includes('eminem') || lowerArtist.includes('dr. dre') || lowerArtist.includes('snoop dogg') || lowerArtist.includes('jay-z') || lowerArtist.includes('kanye west') || lowerArtist.includes('drake') || lowerArtist.includes('nicki minaj') || lowerArtist.includes('cardi b') || lowerArtist.includes('megan thee stallion') || lowerArtist.includes('lizzo') || lowerArtist.includes('outkast') || lowerArtist.includes('nelly') || lowerArtist.includes('50 cent') || lowerArtist.includes('ludacris') || lowerArtist.includes('missy elliott') || lowerArtist.includes('biggie') || lowerArtist.includes('2pac') || lowerArtist.includes('notorious b.i.g.') || lowerArtist.includes('ice cube') || lowerArtist.includes('kendrick lamar') || lowerArtist.includes('j. cole') || lowerArtist.includes('post malone') || lowerArtist.includes('travis scott') || lowerArtist.includes('future') || lowerArtist.includes('migos') || lowerArtist.includes('lil nas x')) {
        tags.add('Hip Hop');
        tags.add('Banger');
    }

    // Musicals / Disney
    else if (lowerArtist.includes('disney') || lowerArtist.includes('musical') || lowerArtist.includes('hamilton') || lowerArtist.includes('moulin rouge') || lowerArtist.includes('mulan') || lowerArtist.includes('lion king') || lowerArtist.includes('little mermaid') || lowerArtist.includes('aladdin') || lowerArtist.includes('frozen') || lowerArtist.includes('encanto') || lowerArtist.includes('moana') || lowerArtist.includes('wicked') || lowerArtist.includes('phantom') || lowerArtist.includes('les miserables') || lowerArtist.includes('rent') || lowerArtist.includes('hairspray') || lowerArtist.includes('grease') || lowerTitle.includes('theme')) {
        tags.add('Musical');
    }

    // Country
    else if (lowerArtist.includes('shania twain') || lowerArtist.includes('garth brooks') || lowerArtist.includes('dolly parton') || lowerArtist.includes('carrie underwood') || lowerArtist.includes('johnny cash') || lowerArtist.includes('blake shelton') || lowerArtist.includes('luke bryan') || lowerArtist.includes('keith urban') || lowerArtist.includes('miranda lambert') || lowerArtist.includes('zac brown band') || lowerArtist.includes('chris stapleton')) {
        tags.add('Country');
    }

    // Pop (Fallback if no other main genre set, or supplement)
    // Check if we already have R&B, Rock, Hip Hop, Country
    const mainGenres = ['R&B', 'Rock', 'Hip Hop', 'Country', 'Musical'];
    const hasMainGenre = Array.from(tags).some(t => mainGenres.includes(t));

    if (!hasMainGenre) {
        if (lowerArtist.includes('celine dion') || lowerArtist.includes('whitney houston') || lowerArtist.includes('adele') || lowerArtist.includes('mariah carey') || lowerArtist.includes('sam smith') || lowerArtist.includes('john legend') || lowerArtist.includes('lewis capaldi') || lowerArtist.includes('ed sheeran')) {
            tags.add('Ballad');
            tags.add('Pop');
        } else {
            tags.add('Pop');
        }
    }

    // Specific corrections
    if (lowerTitle.includes('stacy\'s mom')) { tags.add('Rock'); tags.add('Banger'); }
    if (lowerTitle.includes('bohemian rhapsody')) { tags.add('Rock'); tags.add('Classic'); }
    if (lowerTitle.includes('shallow')) { tags.add('Duet'); tags.add('Ballad'); }
    if (lowerTitle.includes('whole new world')) { tags.add('Duet'); tags.add('Musical'); }
    if (lowerTitle.includes('summer nights')) { tags.add('Duet'); tags.add('Musical'); }
    if (lowerTitle.includes('paradise by the dashboard light')) { tags.add('Duet'); tags.add('Rock'); }
    if (lowerTitle.includes('under pressure')) { tags.add('Duet'); tags.add('Rock'); }

    return Array.from(tags);
};

// Processing
const processedSongs = songs.map(song => {
    // 1. Remove Repertoire
    let newTags = (song.tags || []).filter(t => t !== 'Repertoire');

    // 2. Add Genres
    const genres = getGenres(song.artist, song.title);
    genres.forEach(g => {
        if (!newTags.includes(g)) newTags.push(g);
    });

    // 3. Add Metadata (Nulls as requested)
    // User asked to remove placeholder icons and lyrics
    const albumCover = null;
    const lyricsPreview = null;
    const audioSample = null;

    return {
        title: song.title,
        artist: song.artist,
        album_cover_url: albumCover,
        lyrics_preview: lyricsPreview,
        audio_sample_url: audioSample,
        tags: newTags
    };
});

// Generate Output
const fileContent = `export const seedData = ${JSON.stringify(processedSongs, null, 4)};\n`;

fs.writeFileSync(seedPath, fileContent);
console.log(`Processed ${processedSongs.length} songs.`);

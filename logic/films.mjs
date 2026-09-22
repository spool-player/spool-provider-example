// The films, and where Blender keeps their files. Everything else (which
// files exist, how big they are) is read from the download server.

export const films = [
    {
        id: 'sintel', title: 'Sintel', year: 2010, minutes: 15, genres: ['Fantasy', 'Animation'],
        overview: 'A lonely young woman, Sintel, helps and befriends a dragon, whom she calls Scales. When he '
            + 'is kidnapped by an adult dragon, Sintel sets out on a dangerous quest to find him.',
        folders: [{ path: 'durian/movies/', label: 'Film' }, { path: 'durian/trailer/', label: 'Trailer' }]
    },
    {
        id: 'elephants-dream', title: 'Elephants Dream', year: 2006, minutes: 11, genres: ['Science Fiction', 'Animation'],
        overview: 'Two strange characters explore a capricious and seemingly infinite machine: the elder, Proog, '
            + 'acts as a tour guide and protector, happily showing off the sights and dangers.',
        poster: 'https://download.blender.org/ED/cover.jpg',
        folders: [{ path: 'ED/', label: 'Film' }]
    },
    {
        id: 'tears-of-steel', title: 'Tears of Steel', year: 2012, minutes: 12, genres: ['Science Fiction'],
        overview: 'A group of warriors and scientists gather at the Oude Kerk in Amsterdam to stage a crucial '
            + 'event from the past, in a desperate attempt to rescue the world from destructive robots.',
        folders: [{ path: 'demo/movies/ToS/', label: 'Film' }]
    },
    {
        id: 'big-buck-bunny', title: 'Big Buck Bunny', year: 2008, minutes: 10, genres: ['Comedy', 'Animation'],
        overview: 'A giant rabbit with a heart bigger than himself gets his revenge on three bullying rodents. '
            + 'The full film is only published zipped, so only its trailers stream.',
        folders: [{ path: 'peach/trailer/', label: 'Trailer' }]
    }
];

export function film(id) {
    const found = films.find(f => f.id === id);
    if (!found)
        throw new Error('not_found');
    return found;
}

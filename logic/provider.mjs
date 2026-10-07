// SPDX-License-Identifier: 0BSD
// Open Movies: a complete Spool provider in one small file. No account and
// no API: the films are a fixed list, and the files each one has are read
// from download.blender.org's directory listings when they are needed.

import { films, film } from './films.mjs';

const server = 'https://download.blender.org/';
const playable = /\.(mkv|mp4|m4v|mov|avi|webm|ogg|ogv)$/i;

// One line of an Apache/nginx listing: <a href="file">file</a>  date  size
const row = /<a href="([^"?/]+)">[^<]*<\/a>\s+\S+\s+\S+\s+(\d+)/g;

export function parseListing(html) {
    const files = [];
    let match;
    row.lastIndex = 0;
    while ((match = row.exec(html)) !== null) {
        const name = decodeURIComponent(match[1]);
        if (playable.test(name))
            files.push({ name: name, size: Number(match[2]) });
    }
    return files;
}

// "Sintel.2010.1080p.mkv" -> "1080p", so the picker can say what each one is.
export function quality(name) {
    if (/4k/i.test(name))
        return '4K';
    const lines = /(\d{3,4})p(?![a-z])/i.exec(name);
    if (lines)
        return lines[1] + 'p';
    const width = /(?:^|[_-])(\d{3,4})(?=[_.-])/.exec(name);
    return width ? width[1] + ' wide' : '';
}

function item(entry) {
    return {
        id: entry.id, title: entry.title, type: 'Movie', year: entry.year, overview: entry.overview,
        genres: entry.genres, runtimeTicks: String(entry.minutes * 60 * 10000000),
        // Without an artwork template a tag is used as the image URL itself.
        posterTag: entry.poster || ''
    };
}

function page(rows, args) {
    const start = Number(args.cursor || 0);
    const limit = Math.max(1, Math.min(args.limit || 50, 100));
    const slice = rows.slice(start, start + limit);
    const exhausted = start + slice.length >= rows.length;
    return { items: slice.map(item), total: rows.length, exhausted: exhausted,
        cursor: exhausted ? null : String(start + slice.length) };
}

export function createSource(configuration, sourceHost) {
    // Listings change rarely; one read per film per session is plenty.
    const cache = {};

    function files(host, entry) {
        if (!cache[entry.id]) {
            cache[entry.id] = Promise.all(entry.folders.map(folder =>
                host.http(server + folder.path).then(response => {
                    if (response.status !== 200)
                        throw new Error('http_' + response.status);
                    return parseListing(response.body).map(file => ({
                        id: folder.path + file.name, title: file.name, size: file.size, kind: folder.label,
                        quality: quality(file.name)
                    }));
                }))).then(lists => [].concat(...lists), error => {
                delete cache[entry.id];
                throw error;
            });
        }
        return cache[entry.id];
    }

    function select(args, host, download) {
        const entry = film(args.itemId);
        return files(host, entry).then(list => {
            if (!list.length)
                throw new Error('nothing_to_play');
            const id = args.file || args.variantId;
            if (!id)
                return { pick: { kind: 'file', itemId: entry.id, title: entry.title, download: download } };
            const chosen = list.find(file => file.id === id);
            if (!chosen)
                throw new Error('selected_variant_unavailable');
            return { url: server + chosen.id.split('/').map(encodeURIComponent).join('/'),
                container: chosen.title.split('.').pop().toLowerCase().replace(/^ogv$/, 'ogg'),
                size: chosen.size, variantId: chosen.id };
        });
    }

    return {
        describe: () => ({ capabilities: {"search": true, "downloads": true} }),

        libraries: () => ({ items: [{ id: 'films', title: 'Open Movies', collectionType: 'movies' }] }),
        browse: args => page(films, args),
        latest: args => page(films.slice().sort((a, b) => b.year - a.year), args),
        items: args => page(films.filter(f => (args.ids || []).indexOf(f.id) >= 0), args),
        search: args => {
            const query = String(args.query || '').toLowerCase();
            return page(films.filter(f => f.title.toLowerCase().indexOf(query) >= 0), args);
        },
        details: (args, host) => {
            const entry = film(args.itemId);
            return files(host, entry).then(list => {
                const result = item(entry);
                result.variants = list.map(file => ({ id: file.id, label: file.kind + ' ' + file.quality,
                    filename: file.title, sizeBytes: String(file.size) }));
                result.links = [{ name: 'Blender Studio', url: 'https://studio.blender.org/films/' }];
                return { item: result };
            });
        },

        // The picker's list: every file this film has, like a torrent's.
        files: (args, host) => files(host, film(args.itemId)).then(list => ({ items: list })),

        // Playing asks which file first, then plays it straight from Blender.
        resolve: (args, host) => select(args, host, false).then(result =>
            result.pick ? result : Object.assign(result, { playMethod: 'DirectPlay' })),
        download: (args, host) => {
            if (args.mode !== 'original')
                throw new Error('download_transcode_unavailable');
            return select(args, host, true).then(result => {
                if (!result.pick)
                    host.log('debug', 'original download negotiated', { size: result.size, container: result.container });
                return result.pick ? result : { url: result.url, container: result.container, size: result.size };
            });
        }
    };
}

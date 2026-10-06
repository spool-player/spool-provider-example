// SPDX-License-Identifier: 0BSD
// Runs in Qt's JS engine, as in Spool: build/sdk/provider-contract-runner tests/contract.mjs
import { createSource, parseListing, quality } from '../logic/provider.mjs';

function check(value, message) {
    if (!value)
        throw new Error('contract: ' + message);
}

const listing = `<html><body><pre><a href="../">../</a>
<a href="Sintel.2010.1080p.mkv">Sintel.2010.1080p.mkv</a>                  06-Jul-2021 14:21          1180090590
<a href="Sintel.2010.4k.mkv.zip">Sintel.2010.4k.mkv.zip</a>                 20-Jul-2026 20:16          4506488537
<a href="sintel-m%2Be-st.flac">sintel-m+e-st.flac</a>                     06-Jul-2021 14:21            74266467
<a href="subtitles/">subtitles/</a>                                     06-Jul-2021 14:21                   -
</pre></body></html>`;

const trailers = `<pre><a href="Sintel_Trailer.720p.DivX_Plus_HD.mkv">Sintel_Trailer.720p.DivX_Plus_HD.mkv</a> 06-Jul-2021 14:21 14625077
</pre>`;

export function run() {
    const files = parseListing(listing);
    check(files.length === 1 && files[0].name === 'Sintel.2010.1080p.mkv' && files[0].size === 1180090590,
        'only playable files are listed, with their sizes');
    check(quality('tears_of_steel_720p.mov') === '720p' && quality('ED_1024.avi') === '1024 wide'
        && quality('Sintel.2010.4k.mkv') === '4K' && quality('trailer_iphone.m4v') === '', 'qualities');

    const requests = [];
    const host = { isLogEnabled: () => false, log: () => {}, http: url => {
        requests.push(url);
        const body = url.endsWith('durian/movies/') ? listing : url.endsWith('durian/trailer/') ? trailers : '';
        return Promise.resolve({ status: body ? 200 : 404, body: body });
    } };
    const source = createSource({}, {});
    const first = source.browse({ limit: 3 });
    check(first.items.length === 3 && !first.exhausted && first.cursor === '3' && first.total === 4, 'paging');
    check(source.browse({ cursor: first.cursor, limit: 3 }).exhausted, 'the last page is exhausted');
    check(source.search({ query: 'steel', limit: 10 }).items[0].id === 'tears-of-steel', 'search');
    check(source.latest({ limit: 1 }).items[0].year === 2012, 'latest is newest first');

    return source.details({ itemId: 'sintel' }, host).then(result => {
        check(result.item.variants.length === 2, 'every folder is read');
        check(result.item.variants[0].sizeBytes === '1180090590', 'sizes are decimal strings');
        return source.resolve({ itemId: 'sintel' }, host);
    }).then(result => {
        check(result.pick && result.pick.kind === 'file', 'playing asks which file first');
        check(requests.length === 2, 'listings are read once per film');
        return source.files({ itemId: 'sintel' }, host);
    }).then(result => {
        check(result.items[1].kind === 'Trailer' && result.items[1].quality === '720p', 'the picker rows');
        return source.resolve({ itemId: 'sintel', file: result.items[0].id }, host);
    }).then(result => {
        check(result.url === 'https://download.blender.org/durian/movies/Sintel.2010.1080p.mkv', 'the chosen file');
        check(result.container === 'mkv' && result.variantId === 'durian/movies/Sintel.2010.1080p.mkv', 'details');
        return source.resolve({ itemId: 'sintel', file: '../../etc/passwd' }, host).then(
            () => check(false, 'only listed files play'), error => check(error.message === 'selected_variant_unavailable',
                'unknown files are refused'));
    }).then(() => source.details({ itemId: 'big-buck-bunny' }, host).then(
        () => check(false, 'a failed listing rejects'), error => check(error.message === 'http_404', 'http errors')))
        .then(() => source.download({ itemId: 'sintel', mode: 'original' }, host)).then(result => {
        check(result.pick && result.pick.download, 'downloads ask for a concrete edition');
        return source.download({ itemId: 'sintel', mode: 'original',
            variantId: 'durian/movies/Sintel.2010.1080p.mkv' }, host);
    }).then(result => {
        check(result.container === 'mkv' && result.size === 1180090590,
            'the selected original has its complete file container and byte count');
        const ogvHost = { log: () => {}, http: () => Promise.resolve({ status: 200,
            body: '<a href="film.ogv">film.ogv</a> 01-Jan-2026 12:00 4096' }) };
        const ogvSource = createSource({}, {});
        return ogvSource.download({ itemId: 'sintel', mode: 'original',
            variantId: 'durian/movies/film.ogv' }, ogvHost).then(plan => {
            check(plan.container === 'ogg' && plan.size === 4096, 'Ogg video uses the host-supported Ogg container');
        });
    }).then(() => {
        return Promise.resolve().then(() => source.download({ itemId: 'sintel', mode: 'transcoded' }, host)).then(
            () => check(false, 'a public file host cannot convert media'),
            error => check(error.message === 'download_transcode_unavailable', 'conversion is explicitly unavailable'));
    });
}

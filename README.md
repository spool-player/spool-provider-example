# Open Movies: an example Spool provider

A complete [Spool](https://github.com/spool-player/spool) provider in about 150 lines: Blender's open
films (Sintel, Elephants Dream, Tears of Steel, Big Buck Bunny), streamed straight from
download.blender.org. Copy it to start your own; it is 0BSD, so no attribution is needed.

It shows the parts most providers need:

| | |
| --- | --- |
| `manifest.json` | Identity, `origins` (the one server it talks to) and a `picker` screen; no `login`, so Spool adds it without asking anything |
| `logic/provider.mjs` | `createSource` with a library, paging, search, details, playback and finite Original downloads |
| `logic/films.mjs` | The catalogue: a fixed list, with the folders Blender keeps each film's files in |
| `ui/Files.qml` | The existing file picker serves playback and downloads, including sizes and exact edition selection |
| `tests/contract.mjs` | Runs the provider in Qt's JS engine against scripted responses |

The contract every provider implements is `sdk/provider.d.ts`; `sdk/README.md` covers limits, screens
and packaging.

Open Movies 1.1.0 supports Original downloads with the current Spool host.
Blender's public server serves complete files but does not convert them, so the
provider deliberately omits `downloadTranscode`. Downloads retain the selected
file and declared byte count; `.ogv` files use the Ogg container. Native host
logging records download outcomes without exposing media URLs.

## Trying it

```
cmake -S sdk -B build/sdk && cmake --build build/sdk
build/sdk/provider-contract-runner tests/contract.mjs
python3 sdk/spool-provider.py build .        # dist/example.open-movies-<version>.tar.zst
```

In Spool: Settings → Providers → Add from a link, and paste this repository's URL. Spool reads
`spool-provider.json` from the latest release, checks the package's SHA-256, installs it, and keeps it
up to date from later releases.

## Releasing

Bump `version` in `manifest.json` and push a tag `v<version>`. `.github/workflows/release.yml` runs
the contract, builds the package and attaches it with `spool-provider.json` to a GitHub release. That
is all Spool needs to install and update it from a link.

### On GitLab

`.gitlab-ci.yml` does the same: on a `v*` tag it uploads the package and `spool-provider.json` to the
project's generic package registry and creates a release whose asset links use `filepath`, so
`https://gitlab.com/<group>/<project>/-/releases/permalink/latest/downloads/spool-provider.json`
always serves the newest feed. Paste the project URL into Spool, as on GitHub. The project (or at least
its packages) must be public so Spool can download without signing in.

### Anywhere else

Serve the package and a `spool-provider.json` (from `spool-provider.py feed`, with `--url` set to
where the package lives) from any static site, and add it in Spool with a link to the site: Spool
looks for `/spool-provider.json` at the address given.

## Listing it in the store

Providers in the store show up in Spool under Community, without anyone needing a link.

1. Release it as above.
2. Fork [spool-player/spool-providers](https://github.com/spool-player/spool-providers) and add
   `providers/<your id>.json`: the `spool-provider.json` from your release, unchanged.
3. Open a pull request. Its check downloads your package, compares it with the entry and runs the
   same validation Spool does; a maintainer then reviews the code.
4. For each later release, open a pull request updating that file.

Ids starting with `spool.` are reserved for first-party providers; use your own name
(`yourname.provider`).

The films are © Blender Foundation under Creative Commons licences; see NOTICE.

## Current capability contract

Packages use manifest format 3, with no `api` or `extensions` fields.
`capabilities` declares supported operations; `describe().capabilities` offers
strict boolean account availability. Host declarations are not authorization:
origin approval and operation-specific policy checks remain required. The copied
SDK is pinned by `sdk.lock.json`; releases must use those exact host SDK bytes.

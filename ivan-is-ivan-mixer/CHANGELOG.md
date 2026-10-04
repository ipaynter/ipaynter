# Changelog — Ivan is Ivan Live Mixer

Every release is listed here, newest first. The running version is shown in the mixer's top bar, on the start screen and in **Settings → About this version**.

## How version numbers work

The format is **MAJOR.MINOR.PATCH**, for example `2.5.0`:

| Part | Goes up when… | Example |
|---|---|---|
| **MAJOR** | A big change that alters how you work, or how saved data is stored | 1.x → 2.0 |
| **MINOR** | A new feature that adds to what you have, and your data keeps working | 2.4 → 2.5 |
| **PATCH** | A fix or wording change only | 2.5.0 → 2.5.1 |

- Each release has a matching tag on GitHub, for example `v2.5.0`, in the `ipaynter/ipaynter` repository.
- The download zip is named after its version, for example `ivan-is-ivan-mixer-v2.5.0.zip`, and each one comes with its SHA-256 fingerprint.
- **Data format** is a separate number. It only changes if the way your library is saved changes. Every backup and disk copy records both the data format and the app version that wrote it.

---

## v2.5.0 — 2026-10-04 — Version tracking
- The version is shown in the top bar, on the start screen and in Settings → About this version.
- New `VERSION` and `CHANGELOG.md` files. Git tags for every release.
- Backups and the disk copy record which version saved them. You get a warning if data comes from a newer version.
- Warns if Chrome is showing an older copy of the app than the files on disk, and tells you to press Ctrl+F5.
- After an update, Chrome always loads the new files instead of old cached ones.
- Both start servers report their version when they start.

## v2.4.0 — 2026-10-04 — Drag and paste links
- Drag a YouTube link onto a deck to load it, or onto the queue to line it up.
- Ctrl+V anywhere queues a copied link.
- New links go into the library by themselves. Title, writer and length fill in, with no duplicates.
- Typing a new link into a deck box asks once, then adds and loads it.

## v2.3.0 — 2026-10-04 — Import list
- Library → 📥 Import list reads a saved `Rundown Console.html`, CSV, text or a pasted list.
- Tables are read by column name. Writers are matched by name. Songs already in the library are reused.
- Option to queue the songs in order and save them as a playlist.
- The imported page is read as text only. Nothing in it runs.

## v2.2.0 — 2026-10-04 — Viewer page and Smart DJ override
- Viewer page: the full YouTube video fills the window, and F gives full screen. One badge shows the creator's picture, name and song title.
- Creator pictures come from each YouTube channel, or you upload your own.
- Override Smart DJ: SMART tags, ⇄ swap, "Not now" for the show, manual-only songs (🤖), and YOUR PICK / SMART DJ PICK on the waiting deck.
- Every queued song shows its YouTube image and length.

## v2.1.1 — 2026-10-04 — Test checklist
- Added `TESTING.md`, a step-by-step check of the whole app.

## v2.1.0 — 2026-10-04 — Airtime shares
- Each writer has a Share %, for example Ivan 40, the other writers 20 each.
- Smart DJ plays whoever is furthest below their share. Creator cards show the target against actual airtime.

## v2.0.1 — 2026-10-04 — Wording
- The Creators section is worded for the show's music writers.

## v2.0.0 — 2026-10-04 — Mixer v2
- Fixes:
  - Pop-up questions no longer freeze fades on air.
  - Esc no longer fades out the music.
  - Viewers never see the controls.
  - The library is also saved to the `data` folder, with daily backups.
- New:
  - Beat tools: TAP, GRID, beat lights, bar counter, mixing on the bar.
  - Creators with new-upload alerts.
  - Smart Next suggestions and Smart fill.
  - Hover help everywhere.
  - Credits with creator links.

## v1.0.0 — 2026-10-04 — First release
- Two YouTube decks, crossfader, faders, time-to-end warnings, CUE, hot cues, loops and trim.
- Auto DJ, Talk duck, approved library, queue, playlists and play log with credits.
- Stream Deck control through the local start servers.

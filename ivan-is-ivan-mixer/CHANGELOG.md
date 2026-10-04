# Changelog — Ivan is Ivan Live Mixer

Every release is listed here, newest first. The running version is shown in the mixer's top bar, on the start screen and in **Settings → About this version**.

## How version numbers work

The format is **MAJOR.MINOR.PATCH**, for example `2.5.0`:

| Part | Goes up when… | Example |
|---|---|---|
| **MAJOR** | A big change that alters how you work, or how saved data is stored | 1.x → 2.0 |
| **MINOR** | A new feature that adds to what you have, and your data keeps working | 2.4 → 2.5 |
| **PATCH** | A fix or wording change only | 2.5.0 → 2.5.1 |

- Each release below lists its **commit** in the `ipaynter/ipaynter` repository. On GitHub, open `https://github.com/ipaynter/ipaynter/commit/<commit>` to see exactly what that version contained. Optional GitHub *Releases*/tags can be added from the GitHub website. See the end of this file.
- The download zip is named after its version, for example `ivan-is-ivan-mixer-v2.5.0.zip`, and each one comes with its SHA-256 fingerprint.
- **Data format** is a separate number. It only changes if the way your library is saved changes. Every backup and disk copy records both the data format and the app version that wrote it.

---

## v3.2.1 — 2026-10-04 — Fix: old version kept showing
Commit: `pending`
- **Fixed:** if an older mixer was still running (an old black window, for example v2.5.2), starting the new one just opened the old one. Now the new version closes the old one by itself and starts. A second click on the same version still just opens it.
- If the old one won't close, it says so: close every black "Ivan is Ivan" window, or restart the computer.

## v3.2.0 — 2026-10-04 — Clean and simple
Commit: `285c12b`
- **Click any song in the list** to cue it as **UP NEXT** on the free deck.
- **One big ▶ Play next** (or Space, or the Stream Deck *mix* key) brings it in. If nothing is cued, it plays the next song in the list. If nothing is playing, it just starts.
- **Slimmer decks:** picture, title, time to end, progress, ▶ and cue. Everything else (seek, tempo, hot cues, loops, trim, link box) sits behind **⋯**.
- **Slimmer mixer:** Manual · Assist · Auto, ▶ Play next, crossfader, master and 🎙 Talk. Deck faders, fade time, curve, voice duck and the rest sit under **more**.
- **Smaller list rows**, so more songs fit on screen.
- Writers, Log and Settings stay closed until you click one. Click it again to close it.

## v3.1.0 — 2026-10-04 — Easy like Sunday morning
Commit: `1a10bab`
- **New look:** calm, flat and compact. Small decks, an inline crossover mixer, and slim faders.
- **One list for all the music**, in play order and always on screen. It replaces the separate queue, library and playlists. Each row shows the song's picture, writer, status (playing, on a deck, NEXT, ✓ played, ⚠ blocked), start time and length. Drag to reorder, ↑ plays a song next, and ✎ opens its details.
- **Manual · Assist · Auto:**
  - **Manual** is you DJing.
  - **Assist** lines up the next song and mixes it in if you don't.
  - **Auto** runs the show and keeps going with fair picks when the list runs out.

  One click switches, so you can take over at any time.
- **✨ Line-up assistant** arranges the songs still to play (writers' shares, tempo, energy). Undo puts the list back.
- **Your writers are ready:** Ivan (40%), Lance, Lise and Rhonda (20% each). New songs from them appear above the list, and ✓ Add puts them at the bottom.
- Adding a link, pasting, dragging or importing always puts songs at the bottom of the list.
- Your old queue is folded into the top of the list automatically. Nothing is lost.
- Changes reach the disk copy almost instantly, and are saved even if you close the mixer straight after a change.

## v3.0.0 — 2026-10-04 — Separate Viewer tab
Commit: `de22d6c`
- **The viewer page is now its own Chrome tab and no longer covers the mixer.** POWER ON opens it automatically. Click it once, then share **that tab** in StreamYard with *Also share tab audio*.
- The music and video play in the Viewer tab, so StreamYard captures them. The mixer remote-controls it. Deck screens in the mixer show the song's picture.
- Top-bar light shows the Viewer tab's status: *NOT OPEN* (click to open), *click it once*, or *connected ✓*. Full screen: press **F** in the Viewer tab.
- If the Viewer tab is closed or reloaded mid-song, the mixer warns you. Reopen it and every song resumes where it was.
- The mixer's timing (fades, Auto DJ) is driven by the Viewer tab, so it stays exact even when Chrome slows the mixer tab in the background. Tested with the mixer's own timers slowed to once a minute.
- The Viewer tab hides the mouse pointer when it isn't moving.
- The old single-tab mode is still available: Settings → untick *Play music in a separate Viewer tab*.

## v2.6.1 — 2026-10-04 — Re-check blocked songs
Commit: `a4a9ce7`
- **↻ Re-check ⚠ songs** in the Library tests every marked song again and clears the ⚠ on the ones that now play, for example after the owner switched on *Allow embedding*.
- A ↻ button on each marked song re-checks just that one.
- A marked song that plays successfully on a deck clears its own ⚠, and Smart DJ can pick it again.
- **Fixed:** the song check could take a late signal from the previous song as the answer. It now confirms the reply is about the song being tested.

## v2.6.0 — 2026-10-04 — Desktop button
Commit: `c9bd25e`
- New `Ivan Mixer.bat`. Each click installs the newest `ivan-is-ivan-mixer*.zip` from Downloads (only when it's new) into `%USERPROFILE%\IvanIsIvanMixer`, keeping your library and Stream Deck key. It then starts the mixer.
- The first click puts an **"Ivan is Ivan Mixer"** button on the desktop.
- No checksum step needed. Uses Windows' built-in unzip, with a PowerShell fallback.

## v2.5.2 — 2026-10-04 — Fix: reliable start on Windows
Commit: `b473953`
- `start-windows.bat` clears Windows' "downloaded from the internet" mark from the app files itself, so they're allowed to run.
- Opens the mixer in **Google Chrome** specifically. Before, it opened whatever your default browser was, such as Edge or Firefox.
- Starting it twice no longer fails. It just opens the mixer that's already running.
- Errors are shown in plain words and the window never closes silently.
- Every start writes `start-log.txt` (Windows and PowerShell version, policy, what happened) for troubleshooting.
- If PowerShell can't start it, it tries Python if that's installed.
- Tested in real Windows command-prompt (cmd) logic, including failure cases.

## v2.5.1 — 2026-10-04 — Fix: dragging links in
Commit: `c8e9fdf`
- **Fixed:** dragging a YouTube link onto the mixer did nothing. The deck videos (embedded YouTube pages) swallowed the drop, and other areas weren't drop targets.
- While you drag a link, a drop screen now appears with three big boxes: **Deck A · Queue · Deck B**. Dropping anywhere on it works, and Chrome no longer opens the link instead.
- The videos no longer catch the mouse. The mixer controls them, so nothing is lost.
- One handler takes every dropped link, so a drop can never add a song twice.
- Checked with a real browser-level drag over a real embedded page. The old version failed that test and this one passes. Dragging inside the mixer (library to deck, reordering the queue) still works.

## v2.5.0 — 2026-10-04 — Version tracking
Commit: `924236a`
- The version is shown in the top bar, on the start screen and in Settings → About this version.
- New `VERSION` and `CHANGELOG.md` files. Every release is listed with its commit.
- `check-version.py` refuses a release if the version number differs anywhere.
- Backups and the disk copy record which version saved them. You get a warning if data comes from a newer version.
- Warns if Chrome is showing an older copy of the app than the files on disk, and tells you to press Ctrl+F5.
- After an update, Chrome always loads the new files instead of old cached ones.
- Both start servers report their version when they start.

## v2.4.0 — 2026-10-04 — Drag and paste links
Commit: `3ac4b73`
- Drag a YouTube link onto a deck to load it, or onto the queue to line it up.
- Ctrl+V anywhere queues a copied link.
- New links go into the library by themselves. Title, writer and length fill in, with no duplicates.
- Typing a new link into a deck box asks once, then adds and loads it.

## v2.3.0 — 2026-10-04 — Import list
Commit: `5d9f64e`
- Library → 📥 Import list reads a saved `Rundown Console.html`, CSV, text or a pasted list.
- Tables are read by column name. Writers are matched by name. Songs already in the library are reused.
- Option to queue the songs in order and save them as a playlist.
- The imported page is read as text only. Nothing in it runs.

## v2.2.0 — 2026-10-04 — Viewer page and Smart DJ override
Commit: `596e430`
- Viewer page: the full YouTube video fills the window, and F gives full screen. One badge shows the creator's picture, name and song title.
- Creator pictures come from each YouTube channel, or you upload your own.
- Override Smart DJ: SMART tags, ⇄ swap, "Not now" for the show, manual-only songs (🤖), and YOUR PICK / SMART DJ PICK on the waiting deck.
- Every queued song shows its YouTube image and length.

## v2.1.1 — 2026-10-04 — Test checklist
Commit: `7f4380e`
- Added `TESTING.md`, a step-by-step check of the whole app.

## v2.1.0 — 2026-10-04 — Airtime shares
Commit: `7604a90`
- Each writer has a Share %, for example Ivan 40, the other writers 20 each.
- Smart DJ plays whoever is furthest below their share. Creator cards show the target against actual airtime.

## v2.0.1 — 2026-10-04 — Wording
Commit: `626d969`
- The Creators section is worded for the show's music writers.

## v2.0.0 — 2026-10-04 — Mixer v2
Commit: `69f5ae5`
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
Commit: `7ae9267`
- Two YouTube decks, crossfader, faders, time-to-end warnings, CUE, hot cues, loops and trim.
- Auto DJ, Talk duck, approved library, queue, playlists and play log with credits.
- Stream Deck control through the local start servers.

---

## Optional: GitHub Releases (tags)

The release history above is complete as it stands. If you would also like each version as a GitHub *Release*:
1. On GitHub, open the `ipaynter/ipaynter` repository → **Releases** → **Draft a new release**.
2. In **Choose a tag**, type `v2.5.0` and create it. Pick the branch `claude/podcast-dj-mixer-app-yruycr` as the target.
3. Title it `v2.5.0`, paste that version's notes from above, and attach the zip if you like. Publish.

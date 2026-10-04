# Ivan is Ivan — Live Mixer

A two-deck DJ mixer for YouTube links, built for the *Ivan is Ivan* live show on StreamYard.
Runs on your own computer in Google Chrome. You don't need an account, you don't need to install anything on Windows, and nothing tracks you.

**Version:** see the `VERSION` file, the top bar of the mixer, and `CHANGELOG.md` for what changed in each release.

## Start it

| Computer | What to do |
|---|---|
| **Windows** | Double-click `start-windows.bat`. Chrome opens the mixer. Keep the black window open during the show. |
| **Mac / Linux** | Run `./start-mac-linux.sh` (needs Python 3). |

Then click **POWER ON**. Press **?** (top right) at any time for the quick-start guide, and hover over any control to see what it does and its shortcut key.

Use the start script every time. If you double-click `index.html` directly, YouTube won't play and nothing is saved to disk.
The mixer is at `http://localhost:8765`. It only answers this computer, not your network.

## Daily flow

1. **Creators tab:** add your four music writers, yourself included (name, YouTube channel, color, **Share %**). Give your own songs a bigger share, e.g. you 40, the others 20 each. New uploads show up on their own. Click **✓ Approve** or **Ignore**.
2. **Library:** for any other approved link, paste it and press **Fetch info**. Add BPM and energy if you know them.
3. **Beats, once per song:** while it plays, press **TAP** to the beat 4+ times, then **GRID** exactly on a "1". This is saved forever.
4. **Queue:** drag songs in, or use the **Smart Next** cards.
5. Go live in StreamYard, press **ON AIR**, then **AUTO DJ**, or mix by hand.
6. Press **VIEWER PAGE** (V). This is the page you share in StreamYard: the full video, nothing else but a small creator badge. Press **F** for full screen.
7. After the show: **Play Log & Credits → Credits: this show → Copy** and paste it into the YouTube description.

## Adding music: just drag or paste the link

- **Drag** a YouTube link (from the address bar, a YouTube page, your Rundown page…) over the mixer. A drop screen appears with three boxes: **DECK A · QUEUE · DECK B**. Let go on the one you want.
- **Ctrl+V** anywhere in the mixer adds a copied YouTube link to the queue.
- **Paste** into a deck's link box and press LOAD. It asks once, then adds and loads it.

A new link is added to your approved library by itself, as you vouch for what you drop in. Title, writer (matched from the YouTube channel name) and length fill in within seconds. The same link is never added twice.

## Bring in your existing music list (Rundown console)

1. Have your Rundown console ready in **one** of these ways:
   - **The saved page itself**, e.g. `Rundown Console.html` in your Downloads. The mixer reads it directly. The page is only read as text: none of its scripts run.
   - **Copy and paste:** open the Rundown Console in Chrome, press Ctrl+A, then Ctrl+C.
   - **An export** as **CSV** or **text**. If it saves as Excel, open that in Excel and use *File → Save As → CSV*.
   - If the saved page shows "No YouTube links found", the console keeps its list inside the browser rather than in the file. Use copy and paste instead.
2. In the mixer: **Approved Library → 📥 Import list**.
3. Press **Choose file…** and pick `Rundown Console.html` (or your CSV/text file), or paste the list (Ctrl+V) and press **Read list**.
4. Check the preview:
   - Every YouTube link is found. Lines without a link (talk breaks, headings) are skipped.
   - Writers are matched by name. Fix any row with the drop-down, or use **Set creator for all checked**.
   - Songs already in your library are kept as they are, never duplicated.
5. Optional: tick **Add to the queue in this order**, and/or keep **Save as playlist** to keep the Rundown running order.
6. Press **Add songs**. Song lengths, and any missing titles, fill in by themselves within a minute.

It understands lines like `1. Song – Ivan https://youtu.be/…`, `Writer 2 | Song | https://www.youtube.com/watch?v=…`, and spreadsheet columns named Title/Song, Artist/Creator/Writer, Link/URL/YouTube, Notes and Permission.

## What it does

**Decks A and B**
- **TIME TO END** countdown: turns yellow at 30 s and flashes red at 10 s. It also tells you whether the next song is cued, so you don't hit dead air.
- **Beat counter:** 4 beat lights, BPM, "BAR 12.3 · 8 bars left", and a bar grid on the progress bar.
- **TAP / GRID / ½ / ×2:** set the tempo and the downbeat, saved with the song.
- **CUE** works like a club deck: when paused it sets the cue point, when playing it jumps back to the cue and pauses.
- **4 hot cues:** click to set, click again to jump, right-click clears.
- **Loops:** IN / OUT, a 4-bar instant loop (8 s if the tempo is unknown) and EXIT.
- **TRIM: START / MIX-OUT:** skip long intros and outros. Saved with the song.
- **Spinning record:** shows the song's thumbnail, with a top stripe in the creator's color.

**Mixer**
- **Tempo match:** shows both decks' BPM and turns green when they are close enough to overlap smoothly.
- Fader for each deck plus a master fader.
- Crossfader with three curves: Smooth (constant power), Linear and Scratch cut.
- **MIX ⇄** crossfades to the other deck, then stops the old one.
- **TALK** dips the music while you speak.
- **Voice auto-duck** does it automatically from your mic level. It never records. Wear headphones.
- **FADE ALL OUT:** an emergency fade to silence. It's on the button and the Stream Deck only, so a stray key can't kill your music.

**Auto DJ**
- Plays the queue for you. It preloads the next song and crossfades FADE seconds before the end (or at the MIX-OUT mark).
- **Mix on the bar:** when the tempo and grid are known, the crossfade starts exactly on a bar line.
- **Smart fill:** when the queue runs dry, Auto DJ adds the best Smart Next pick, so there's no dead air.

**Smart Next** suggests the next 3 songs and shows the reasons:
- **Airtime shares:** the writer furthest below their Share % comes first. With you at 40 and three writers at 20, a show plays roughly 2 of your songs for every 1 of each other writer, spread out rather than in blocks.
- **Tempo match:** songs with a close BPM, counting half and double time.
- **Energy flow:** stays within one energy step.
- **New releases:** gets a boost until the first play.
- Never repeats a song within the same show.

**Creators**
- Each writer gets a card with their color, number of songs and plays. It also shows **Target %** against **Now %** for this show, a bar with a white target line, and a status: on target, behind or ahead.
- Shares are relative, so 40/20/20/20 and 2/1/1/1 mean the same thing. Change them anytime with ✎.
- **New-upload alerts:** checked at start-up and every 30 minutes, but never while you're on air. Uses YouTube's public channel feed. The 🔔 badge shows how many are waiting.
- Creators can be linked by channel link, by `@handle`, or by channel ID (YouTube: channel → About → Share channel → Copy channel ID).

**Viewer page (what viewers see)**
- The full YouTube video fills the whole window. Press **F** for true full screen.
- One small badge in the corner shows the **creator's picture, name and song title**. It slides in again at every new song and changes colour with the creator.
- The video crossfades along with the audio.
- Your controls, pop-up messages and tooltips never appear on it.
- To show the Full screen / Exit buttons, move the mouse to the top-right corner. Viewers never see them.
- Press **V** or **Esc** to go back to the controls. The music keeps playing.
- **Creator pictures** come from each writer's YouTube channel automatically. Click **Image** in the Creators form to upload your own instead. A writer with no picture shows the song's YouTube image.

**You always have the final say over Smart DJ**
- Songs that Smart DJ queued carry a **SMART** tag. Press **⇄** to swap one for the next-best pick, **✕** to remove it, or drag your own song in front of it.
- Your own queued songs always play before Smart DJ adds anything. It only fills the queue when it's empty.
- **Not now** on a suggestion hides that song for the rest of the show.
- **🤖** in the library makes a song *manual only*. Smart DJ will never pick it, but you still can.
- The deck waiting to play next says **SMART DJ PICK** or **YOUR PICK**. Load or drop any song onto it to change it.
- Turn **Smart fill** off and Smart DJ only suggests. Nothing plays unless you queue it.
- Every queued song shows its YouTube image and length.

**Library, playlists, play log**
- **Approved-only mode** (on by default): decks refuse any link that isn't in the library.
- Thumbnails get bigger when you hover over them.
- Playlists can be saved, loaded or appended.
- The play log builds credits for your YouTube description, including "Support the creators" channel links.

## Getting the music into StreamYard

1. **Share the tab (free, simplest).** Press **VIEWER PAGE**. In StreamYard choose *Share screen → Chrome Tab → "Ivan is Ivan — Live Mixer"* and tick **Also share tab audio**. Viewers see the full video with the creator badge and hear the music. Control everything from the Stream Deck while it is shared.
2. **Virtual audio mixer (best control).** Install the free **Voicemeeter** (Windows). Route your XLR interface and Chrome into it, and pick *Voicemeeter Output* as your mic in StreamYard.

Run a private test broadcast first.

## Stream Deck

Open **Settings & Stream Deck**. Every action has a ready-made URL with a **Copy** button.
In the Stream Deck app, drag a **Website** action onto a key, paste the URL and tick **"GET request in background"**.
These keys work even when StreamYard is the window in front.

Good keys to set up first: Play A, Play B, MIX ⇄, Auto DJ, TALK, Viewer page, Full screen, Smart Next, Fade all out.
For the **Stream Deck +** dials, assign rotate left/right to `xfLeft` / `xfRight` or `masterDown` / `masterUp`. This depends on the dial plugin you use.

The URLs contain a private key (`control-key.txt`), so other websites can't press your buttons. To change the key, delete that file and restart.

| Key | Action | Key | Action |
|---|---|---|---|
| 1 / 2 | Play-pause A / B | Q / W | Cue A / B |
| A / S | Next from queue → A / B | E / R | Tap tempo A / B |
| Space | MIX ⇄ | N | Smart Next → queue |
| Z / X | Fade crossfader to A / B | C | Center |
| ← / → | Nudge crossfader | ↑ / ↓ | Master ±5 |
| [ / ] | Deck A volume | ; / ' | Deck B volume |
| D | Auto DJ | T | Talk duck |
| O | On Air | V | Viewer page |
| F | Viewer page full screen | | |
| Esc | Close / leave the viewer page (never stops music) | | |

## Your data

Everything is saved **twice**:
- in Chrome on this computer, and
- in the `data` folder next to the app: `mixer-data.json`, plus one dated backup per day, keeping the last 30 days.

If Chrome's data is ever cleared, the mixer restores itself from the `data` folder on the next start.
**Settings → Export backup** gives you one file to copy to another computer or share with your creators. **Import backup** merges it in.

The only outside connections are to YouTube: the players, thumbnails, title look-ups, and the public upload feeds of your creators. Players use YouTube's privacy-enhanced `youtube-nocookie.com` mode.

## Limits

- **Tempo is tapped, not detected.** YouTube doesn't let a web page read the audio inside its player, so the mixer can't hear the beat. You TAP and GRID once per song, and after that everything (lights, bar counter, mixing on the bar, Smart Next tempo match) uses it.
- **No EQ, filters or pitch/tempo-sync.** Same reason. Those need downloaded audio files, which is a different kind of app.
- **Loops are approximate.** A YouTube seek takes a moment.
- **"Smart" means clear rules, not an online AI.** Picks are made on your computer from your own data, and every pick shows its reasons.
- **The upload feed covers a channel's 15 most recent videos**, including non-music ones. Ignore those once and they stay gone.
- **Run the mixer in its own Chrome window**, not a hidden background tab. Chrome slows hidden tabs down.
- **Permission is on you.** Even with full permission, YouTube's Content ID can still flag a live stream. Keep each creator's written OK on file.

## Versions and updates

- The current version is shown in the top bar, and in **Settings → About this version**.
- What changed in each version is in `CHANGELOG.md`.
- **To update:** close the mixer and its black window, then extract the new zip **over** your app folder. Your `data` folder and `control-key.txt` stay as they are, so your library and Stream Deck buttons keep working. Start again and check that the new version number shows.
- If the mixer says *Version mismatch*, press **Ctrl+F5** once.

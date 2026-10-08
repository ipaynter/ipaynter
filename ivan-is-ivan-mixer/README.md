# Late Night with Ivan — DJ Board

A two-deck DJ board for YouTube links, built for *Late Night with Ivan* on StreamYard. By Mad World Studios.
It runs on your own computer in Google Chrome, with no account and no tracking. It never talks to GitHub.

**Version:** see `VERSION`, the top bar of the board, and `CHANGELOG.md`.

## Install and update: the Mad World Studios button

1. Right-click the zip → **Extract All**.
2. In the extracted folder, double-click **Mad World Studios**. If Windows says *"Windows protected your PC"*: **More info → Run anyway**. You only see this the first time.
3. It installs into `C:\Users\<you>\LateNightWithIvan`, puts a **MAD WORLD STUDIOS** button on the desktop, and opens the board.

**To update:** download the new zip into **Downloads**, then click the desktop button. Each click:
- installs the newest version found: an unzipped folder, or a `late-night-with-ivan-vX.Y.Z.zip` in Downloads;
- saves a copy of your songs first, in `data\versions\`;
- moves the old version, older zips, older unzipped copies and old start buttons to the **Recycle Bin**. Nothing is deleted outright;
- the first time, brings over your songs, Stream Deck key and settings from the old `IvanIsIvanMixer` install.

**Your data** lives in `LateNightWithIvan\data`, separate from the app, so updates never touch it:
- `mixer-data.json`: songs, writers and settings, plus a daily backup;
- `versions\`: a copy before every update;
- `overlays\`: your pictures and clips;
- `control-key.txt`: the Stream Deck key.

Every version reads the data of the versions before it. **Settings → Export backup** gives you one file to keep.

**Why Chrome:** StreamYard can only capture tab audio from Chrome. The board and the Share tab talk to each other inside one browser, so both run in Chrome.

## If it won't start

1. Click the button again and **read the black window**. It says what happened and stays open.
2. Send `LateNightWithIvan\install-log.txt` and `LateNightWithIvan\app\start-log.txt`, plus a photo of the black window.
3. Antivirus may ask about `launcher.ps1` or `serve.ps1`. Both are plain text you can read. They only serve files to this computer.

## Daily flow

1. Click the desktop button, then **Power on**. The **Share tab** opens. Click it once.
2. **Writers** (bottom of the page): paste the YouTube channel link once each for you, Lance, Lise and Rhonda. Their new songs appear above the list. **✓ Add** puts a song at the bottom of the list.
3. **The list** is all the show's music, in play order. Drag rows to reorder. **↑** plays a song next. **✨ Line-up** arranges the rest for you, and **Undo** puts it back.
4. Choose who drives:
   - **Manual**: you DJ, and the list just shows what's next.
   - **Assist**: the next song is lined up on the free deck and mixed in when a song ends, if you haven't already. You read the room.
   - **Auto**: runs the show down the list. When the list runs out, it keeps going with fair picks from your writers.

   Click **Manual** any time to take over completely.
5. In StreamYard, share the **Share tab** with *Also share tab audio*. Press **ON AIR** when you go live; that also starts a fresh "played" count.
6. After the show: **Log & credits → Credits: this show → Copy**.

## Adding music: just drag or paste the link

- **A whole playlist:** paste a YouTube playlist link (`youtube.com/playlist?list=…`) and every song in it is added in order. Public or unlisted playlists only.
- **Play next** (next to Add) puts what you paste in as the next song. **Add** or Enter puts it at the bottom.

- **Drag** a YouTube link (from the address bar, a YouTube page, your Rundown page…) over the mixer. A drop screen appears with four boxes: **DECK A · Play NEXT · Bottom of THE LIST · DECK B**. Let go on the one you want.
- **Ctrl+V** anywhere in the mixer adds a copied YouTube link to the bottom of the list. You can also paste into the box at the top of the list.
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

**The list (one list for everything)**
- Each song shows its YouTube picture, title, writer, start time from now and length.
- Status of each song: **▶ ON A/B** (playing), **ON A/B** (lined up on a deck), **NEXT**, **✓ played** (this show), or **⚠ blocked** (embedding is off; use ↻ to check again after it's fixed).
- **Click a song** to cue it as **UP NEXT**, then press **▶ Play next**. Hover a row for its buttons: **A** / **B** load it onto a deck, **↑** plays it next, **✎** opens its details (title, writer, BPM, energy, notes), **✕** removes it.
- **✨ Line-up** is the line-up assistant. It arranges the songs still to play so the writers get their fair share (you 40%, the others 20% each), the tempo and energy flow, and new songs come early. **Undo** puts the list back.
- **Find…** filters the list.

**Decks A and B** (compact)
- Picture, title and writer, plus a big **time to end** that turns yellow at 30 s and red at 10 s, and a progress bar you can click to jump.
- Buttons: **▶** play and **cue**.
- **⋯** opens seek, next ⤵, tap / grid (tempo), hot cues, loops, trim and the link box.

**Mixer: inline crossover**
- The **Manual · Assist · Auto** switch.
- **▶ Play next**: the main button. Brings in the cued song, or the next in the list.
- The crossfader, master volume and **🎙 Talk**.
- **more** holds deck faders, fade time and curve, voice auto-duck, mix on the bar, tempo match, crossfader snaps and fade all out.

**Writers**
- A card for each writer with their picture, channel, songs, and target against actual airtime this show.
- **Play next** puts that writer's best next song up next.
- 🔔 checks for their new uploads, and the mixer also checks every 30 minutes when you're not on air.

**Share tab (what viewers see)**
- A separate Chrome tab, opened automatically when you press POWER ON. Your mixer stays in its own tab, fully visible.
- Click the Share tab **once** so Chrome lets it play sound. Then share **that tab** in StreamYard with **Also share tab audio**. The music plays from there.
- It shows the full YouTube video, plus one small badge: the **creator's picture, name and song title**. The video crossfades with the audio.
- Press **F** in the Share tab for full screen. The mouse pointer hides by itself.
- The top-bar light in the mixer shows its status. If it says **NOT OPEN**, click it to open the Share tab again. Songs resume where they were.
- **Don't close the Share tab during the show.** The music plays from it.
- **Creator pictures** come from each writer's YouTube channel automatically. Click **Image** in the Creators form to upload your own instead.

**Overlays: pictures and short videos over the music**
- The **Overlays** strip sits under the decks. Add to it by:
  - dragging pictures or clips in from your computer (PNG, JPG, GIF, WEBP, MP4, WEBM; up to 100 MB);
  - pasting a screenshot (Ctrl+V);
  - pasting a picture or video link from the web, or dragging one in.
- **Click one** to show it on the Share tab. Click it again, or **Hide ✕**, to take it off.
- Choose where it shows: **Big**, **Full screen**, **Corner** or **Lower third**.
- Choose how long: 5, 10 or 20 seconds, or **until I click**. A video also goes away when it ends.
- **sound** plays a clip's own audio over the music.
- Files you add are copied into `data\overlays`. The Share tab only ever shows them as a picture or video, never as a web page.
- Stream Deck: `ov1`–`ov4` show or hide overlays 1–4, and `ovHide` takes it off.

**Play log & credits**
- Everything played is logged. **Credits: this show** builds the list for your YouTube description, with links to the writers' channels.

## Getting the music into StreamYard

1. **Share the Share tab (free, simplest).** In StreamYard choose *Share screen → Chrome Tab → "Late Night with Ivan — SHARE (StreamYard)"* and tick **Also share tab audio**. Viewers see the full video with the creator badge and hear the music. Your mixer stays in its own tab.
2. **Virtual audio mixer (best control).** Install the free **Voicemeeter** (Windows). Route your XLR interface and Chrome into it, and pick *Voicemeeter Output* as your mic in StreamYard.

Run a private test broadcast first.

## Stream Deck

Open **Settings & Stream Deck**. Every action has a ready-made URL with a **Copy** button.
In the Stream Deck app, drag a **Website** action onto a key, paste the URL and tick **"GET request in background"**.
These keys work even when StreamYard is the window in front.

Good keys to set up first: Play A, Play B, Play next, Manual, Assist, Auto, Talk, ✨ Line-up, Fade all out.
For the **Stream Deck +** dials, assign rotate left/right to `xfLeft` / `xfRight` or `masterDown` / `masterUp`. This depends on the dial plugin you use.

The URLs contain a private key (`control-key.txt`), so other websites can't press your buttons. To change the key, delete that file and restart.

| Key | Action | Key | Action |
|---|---|---|---|
| 1 / 2 | Play-pause A / B | Q / W | Cue A / B |
| A / S | Next from the list → A / B | E / R | Tap tempo A / B |
| Space | ▶ Play next | | |
| Z / X | Fade crossfader to A / B | C | Center |
| ← / → | Nudge crossfader | ↑ / ↓ | Master ±5 |
| [ / ] | Deck A volume | ; / ' | Deck B volume |
| D | Auto on / off | T | Talk duck |
| M | Manual (take over) | N | ✨ Line-up |
| O | On Air | V | Viewer page |
| F | Viewer page full screen | | |
| Esc | Close / leave the viewer page (never stops music) | | |

## Your data

Everything is saved **twice**:
- in Chrome on this computer;
- in `LateNightWithIvan\data` (see above).

If Chrome's data is ever cleared, the board restores itself from the `data` folder on the next start.
**Settings → Export backup** gives you one file to copy to another computer. **Import backup** merges it in.

The only outside connections are to YouTube (players, thumbnails, title look-ups, your writers' public upload feeds and playlists), plus any overlay links you add yourself. The players use YouTube's privacy-enhanced `youtube-nocookie.com` mode.

## Limits

- **Tempo is tapped, not detected.** YouTube doesn't let a web page read the audio inside its player, so the mixer can't hear the beat. You TAP and GRID once per song, and after that everything (lights, bar counter, mixing on the bar, Smart Next tempo match) uses it.
- **No EQ, filters or pitch/tempo-sync.** Same reason. Those need downloaded audio files, which is a different kind of app.
- **Loops are approximate.** A YouTube seek takes a moment.
- **"Smart" means clear rules, not an online AI.** Picks are made on your computer from your own data, and every pick shows its reasons.
- **The upload feed covers a channel's 15 most recent videos**, including non-music ones. Ignore those once and they stay gone.
- **Run the mixer in its own Chrome window**, not a hidden background tab. Chrome slows hidden tabs down.
- **Permission is on you.** Even with full permission, YouTube's Content ID can still flag a live stream. Keep each creator's written OK on file.

## Versions and updates

- The current version is in the top bar and in **Settings → About this version**. `CHANGELOG.md` lists what changed in each one.
- To update: download the new zip into Downloads, then click the **Mad World Studios** button. See the top of this file.
- If the board says *Version mismatch*, press **Ctrl+F5** once.

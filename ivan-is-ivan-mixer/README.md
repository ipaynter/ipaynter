# Ivan is Ivan — Live Mixer

A two-deck DJ mixer for YouTube links, built for the *Ivan is Ivan* live show on StreamYard.
Runs on your own computer in Google Chrome. You don't need an account, you don't need to install anything on Windows, and nothing tracks you.

**Version:** see the `VERSION` file, the top bar of the mixer, and `CHANGELOG.md` for what changed in each release.

## Easiest: the desktop button

1. Put `Ivan Mixer.bat` and the mixer zip in your **Downloads** folder.
2. Double-click `Ivan Mixer.bat`. It installs the mixer into `C:\Users\<you>\IvanIsIvanMixer`, makes an **"Ivan is Ivan Mixer"** desktop button, and starts it.
3. After that, just click the desktop button.

**To update:** download the new zip into Downloads and click the button. Your songs and Stream Deck key are kept.

## Start it

| Computer | What to do |
|---|---|
| **Windows** | Double-click `start-windows.bat`. Chrome opens the mixer. Keep the black window open during the show. |
| **Mac / Linux** | Run `./start-mac-linux.sh` (needs Python 3). |

Then click **POWER ON**. Press **?** (top right) at any time for the quick-start guide, and hover over any control to see what it does and its shortcut key.

Use the start script every time. If you double-click `index.html` directly, YouTube won't play and nothing is saved to disk.
The mixer is at `http://localhost:8765`. It only answers this computer, not your network.

## If it won't start

1. Double-click `start-windows.bat` again and **read the black window**. It always says what happened and stays open.
2. The folder now has **`start-log.txt`**. Send that file, plus a photo of the black window, and the problem can be pinned down exactly.
3. Common causes:
   - **Windows SmartScreen** shows "Windows protected your PC". Click **More info → Run anyway**.
   - **Antivirus** blocked the start script. Allow `start-windows.bat` / `serve.ps1` in that folder. The script only serves files to this computer, and it's plain text you can read.
   - **You ran it from inside the zip.** Extract the zip first (right-click → Extract All), then run it from the extracted folder.
   - **It opened in the wrong browser.** Copy `http://localhost:8765` into Chrome.

## Daily flow

1. Click the desktop button, then **Power on**. The **Viewer tab** opens. Click it once.
2. **Writers** (bottom of the page): paste the YouTube channel link once each for you, Lance, Lise and Rhonda. Their new songs appear above the list. **✓ Add** puts a song at the bottom of the list.
3. **The list** is all the show's music, in play order. Drag rows to reorder. **↑** plays a song next. **✨ Line-up** arranges the rest for you, and **Undo** puts it back.
4. Choose who drives:
   - **Manual**: you DJ, and the list just shows what's next.
   - **Assist**: the next song is lined up on the free deck and mixed in when a song ends, if you haven't already. You read the room.
   - **Auto**: runs the show down the list. When the list runs out, it keeps going with fair picks from your writers.

   Click **Manual** any time to take over completely.
5. In StreamYard, share the **Viewer tab** with *Also share tab audio*. Press **ON AIR** when you go live; that also starts a fresh "played" count.
6. After the show: **Log & credits → Credits: this show → Copy**.

## Adding music: just drag or paste the link

- **Drag** a YouTube link (from the address bar, a YouTube page, your Rundown page…) over the mixer. A drop screen appears with three boxes: **DECK A · THE LIST · DECK B**. Let go on the one you want.
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
- Hover a row for its buttons: **A** / **B** load it onto a deck, **↑** plays it next, **✎** opens its details (title, writer, BPM, energy, notes), **✕** removes it. Double-click a row to load it onto the free deck.
- **✨ Line-up** is the line-up assistant. It arranges the songs still to play so the writers get their fair share (you 40%, the others 20% each), the tempo and energy flow, and new songs come early. **Undo** puts the list back.
- **Find…** filters the list.

**Decks A and B** (compact)
- Picture, title and writer, plus a big **time to end** that turns yellow at 30 s and red at 10 s, and a progress bar you can click to jump.
- Buttons: **▶** play, **cue**, **⏮**, **−10 / +10**, **next ⤵** (the next song from the list), **tap / grid** (tempo and beat counter).
- **⋯** opens hot cues, loops and trim (start / mix-out marks).

**Mixer: inline crossover**
- The **Manual · Assist · Auto** switch.
- The crossfader, **Mix ⇄**, fade time and curve.
- Slim A / B / Master faders with level bars.
- **🎙 Talk**, which dips the music while you speak.
- **more** holds voice auto-duck, mix on the bar, tempo match and crossfader snaps.

**Writers**
- A card for each writer with their picture, channel, songs, and target against actual airtime this show.
- **Play next** puts that writer's best next song up next.
- 🔔 checks for their new uploads, and the mixer also checks every 30 minutes when you're not on air.

**Viewer tab (what viewers see)**
- A separate Chrome tab, opened automatically when you press POWER ON. Your mixer stays in its own tab, fully visible.
- Click the Viewer tab **once** so Chrome lets it play sound. Then share **that tab** in StreamYard with **Also share tab audio**. The music plays from there.
- It shows the full YouTube video, plus one small badge: the **creator's picture, name and song title**. The video crossfades with the audio.
- Press **F** in the Viewer tab for full screen. The mouse pointer hides by itself.
- The top-bar light in the mixer shows its status. If it says **NOT OPEN**, click it to open the Viewer tab again. Songs resume where they were.
- **Don't close the Viewer tab during the show.** The music plays from it.
- **Creator pictures** come from each writer's YouTube channel automatically. Click **Image** in the Creators form to upload your own instead.

**Play log & credits**
- Everything played is logged. **Credits: this show** builds the list for your YouTube description, with links to the writers' channels.

## Getting the music into StreamYard

1. **Share the Viewer tab (free, simplest).** In StreamYard choose *Share screen → Chrome Tab → "Ivan is Ivan — VIEWER (share this tab)"* and tick **Also share tab audio**. Viewers see the full video with the creator badge and hear the music. Your mixer stays in its own tab.
2. **Virtual audio mixer (best control).** Install the free **Voicemeeter** (Windows). Route your XLR interface and Chrome into it, and pick *Voicemeeter Output* as your mic in StreamYard.

Run a private test broadcast first.

## Stream Deck

Open **Settings & Stream Deck**. Every action has a ready-made URL with a **Copy** button.
In the Stream Deck app, drag a **Website** action onto a key, paste the URL and tick **"GET request in background"**.
These keys work even when StreamYard is the window in front.

Good keys to set up first: Play A, Play B, Mix ⇄, Manual, Assist, Auto, Talk, ✨ Line-up, Fade all out.
For the **Stream Deck +** dials, assign rotate left/right to `xfLeft` / `xfRight` or `masterDown` / `masterUp`. This depends on the dial plugin you use.

The URLs contain a private key (`control-key.txt`), so other websites can't press your buttons. To change the key, delete that file and restart.

| Key | Action | Key | Action |
|---|---|---|---|
| 1 / 2 | Play-pause A / B | Q / W | Cue A / B |
| A / S | Next from the list → A / B | E / R | Tap tempo A / B |
| Space | Mix ⇄ | | |
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

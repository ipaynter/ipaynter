# Ivan is Ivan — Live Mixer

A two-deck DJ mixer for YouTube links, built for the *Ivan is Ivan* live show on StreamYard.
Runs on your own computer in Google Chrome. You don't need an account, you don't need to install anything on Windows, and nothing tracks you.

## Start it

| Computer | What to do |
|---|---|
| **Windows** | Double-click `start-windows.bat`. Chrome opens the mixer. Keep the black window open during the show. |
| **Mac / Linux** | Run `./start-mac-linux.sh` (needs Python 3). |

Then click **POWER ON**. Use the start script every time. If you double-click `index.html` directly, YouTube won't play.
The mixer is at `http://localhost:8765`. It only answers this computer, not your network.

## What it does

**Decks A and B**
- Paste an approved YouTube link and press LOAD, or drag a track in from the library or queue.
- The **TIME TO END** countdown turns yellow at 30 s and flashes red at 10 s. It also tells you whether the next song is cued, so you don't hit dead air.
- **CUE** works like a CDJ: when paused it sets the cue point, when playing it jumps back to the cue and pauses.
- **4 hot cues**: click to set, click again to jump. Right-click or Shift-click clears one. They're saved with the track.
- **Loops**: IN / OUT, a quick 8-second loop, and EXIT.
- **TRIM: START / MIX-OUT**: mark where a song really starts (skip a long intro) and where Auto DJ should leave it (skip an outro). Saved with the track.
- Click the progress bar to jump.

**Mixer**
- A volume fader for each deck plus a master fader.
- Crossfader with three curves: Smooth (constant power, no volume dip), Linear and Scratch cut.
- **MIX ⇄** fades to the other deck over the FADE time, then stops the old deck.
- **TALK** dips the music to your "Duck to" level while you speak.
- **Voice auto-duck** listens to your mic level and dips the music while you talk. It only measures loudness and never records. Use headphones so the music doesn't trigger it.
- **FADE ALL OUT** fades everything to silence in 2 s (Esc).

**Auto DJ**
- Plays the queue for you. It preloads the next song on the idle deck, starts it FADE seconds before the end (or at the MIX-OUT mark) and crossfades.
- You can take over at any time. Touching the crossfader or pressing play/pause works as normal.

**Approved Library** (your running list of music you have permission to use)
- Stores the link, title, creator, permission note, approval date, tags and credit notes.
- **Fetch info** fills in the title and creator and checks that the video will actually play inside the mixer. Some owners block embedding, and you get a warning if so.
- **Approved-only mode** (on by default) means the decks refuse links that aren't in the library.

**Queue and playlists**: drag to reorder, see the estimated start time of each song and the total queue length, shuffle, save as a named playlist, then load or append it later.

**Play log & credits**: every song played is logged. **Credits: this show** builds a ready-to-paste list for your YouTube description from everything played since you pressed ON AIR.

**ON AIR** starts the show timer and arms the dead-air alarm (an on-screen warning only, never heard on stream).

## Getting the music into StreamYard

Two options. Run a private test broadcast first.

1. **Share the Chrome tab (free, simplest).** In StreamYard, choose *Share screen → Chrome Tab → "Ivan is Ivan — Live Mixer"* and tick **Also share tab audio**. The tab's audio only goes out while the share is in the broadcast, so check how your layout shows it.
2. **Virtual audio mixer (best control).** Install the free **Voicemeeter** (Windows). Route your XLR interface and Chrome into it, and pick *Voicemeeter Output* as your mic in StreamYard. You then get your voice and the music on one clean channel.

If your XLR interface has a "loopback" feature (RØDECaster, GoXLR, some Focusrite and Motu models), that does the same job as option 2.

## Stream Deck

Open **Settings & Stream Deck** in the mixer. Every action has a ready-made URL with a **Copy** button.

In the Stream Deck app, drag a **Website** action onto a key, paste the URL and tick **"GET request in background"**.
These buttons work even when StreamYard is the window in front.

- Each URL contains a private key from `control-key.txt`, so other websites can't press your buttons. To change the key, delete that file and restart the mixer.
- Keyboard shortcuts also work, but only when the mixer window has focus. A Stream Deck **Hotkey** action needs the mixer window in front.
- For the **Stream Deck +** dials, assign two Website/hotkey actions to rotate left/right, for example `xfLeft` / `xfRight` or `masterDown` / `masterUp`. This depends on the dial plugin you use, so check the Elgato Marketplace.

| Key | Action | Key | Action |
|---|---|---|---|
| 1 / 2 | Play-pause A / B | Q / W | Cue A / B |
| A / S | Next from queue → A / B | Space | MIX ⇄ |
| Z / X | Fade crossfader to A / B | C | Center |
| ← / → | Nudge crossfader | ↑ / ↓ | Master ±5 |
| [ / ] | Deck A volume | ; / ' | Deck B volume |
| D | Auto DJ | T | Talk duck |
| O | On Air | Esc | Fade all out |

## Your data

- Everything (library, playlists, play log, settings) is saved in Chrome on this computer, under `localhost:8765`. Keep using the start script so the address stays the same.
- Use **Settings → Export backup** regularly, and **Import backup** to restore it or move to another computer.
- The only outside connection is to YouTube, to play videos and look up titles. Players use YouTube's privacy-enhanced (`youtube-nocookie.com`) mode.

## Limits

- **No EQ, filters, BPM or beat-sync.** YouTube doesn't let a web page touch the audio inside its player, so this mixer controls the volume, position and timing of each player. Those features would need downloaded audio files, which is a different app.
- **Loops are approximate.** A YouTube seek takes a moment, so you'll hear a small gap.
- **Auto DJ is rule-based.** It follows your queue and fade settings. It's not an AI that picks songs.
- **Run the mixer in its own Chrome window**, not a hidden background tab. Chrome slows down timers in background tabs, which can make fades late.
- **Permission is on you.** Even with a creator's OK, YouTube's Content ID can still flag a live stream. Keep the creator's written permission, note it in the Permission field, and post the credits.

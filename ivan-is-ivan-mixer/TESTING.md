# Verification test — Late Night with Ivan (DJ Board)

Version tested: v________ (from the top bar)

Work top to bottom and tick each box. If something fails, stop, take a screenshot and note the step number.
Time needed: about 45 minutes. Use real songs from your writers, wear headphones, and use a **private** StreamYard broadcast.

---

## 0. Install

- [ ] 0.1 Download `late-night-with-ivan-v4.0.0.zip` into Downloads. In PowerShell, `Get-FileHash <zip> -Algorithm SHA256` matches the fingerprint you were given.
- [ ] 0.2 Right-click the zip → **Extract All**. Double-click **Mad World Studios** in the folder that opens. If you see "Windows protected your PC": **More info → Run anyway**.
- [ ] 0.3 The black window says **Installed v4.0.0**. If you had an older version, it also says it brought over your songs and moved old items to the Recycle Bin.
- [ ] 0.4 The desktop has a **MAD WORLD STUDIOS** button with the red-and-black icon. The old "Ivan is Ivan Mixer" button is gone.
- [ ] 0.5 The Recycle Bin holds the old version (`IvanIsIvanMixer`), old zips and the old start button.
- [ ] 0.6 `C:\Users\<you>\LateNightWithIvan\data` has `mixer-data.json` and a `versions` folder.

## 1. Start

- [ ] 1.1 Chrome opens the board. The top bar says **LATE NIGHT with IVAN v4.0.0**.
- [ ] 1.2 Click **Power on**. The **Share tab** opens. Click it once.
- [ ] 1.3 The top right shows **Share tab: connected ✓**, **Disk: saved ✓**, **Stream Deck: ready** and **YouTube: ready**.
- [ ] 1.4 Your songs from before are all in the list.
- [ ] 1.5 Close everything. Click the desktop button again. It starts straight away, with no install.

## 2. Writers

- [ ] 2.1 **Creators** tab: add yourself with your channel link and **Share 40**.
- [ ] 2.2 Add the three other writers, each with their channel link and **Share 20**.
- [ ] 2.3 Each card says **channel linked ✓**. If not, paste the channel ID (UC…) instead.
- [ ] 2.4 Click **🔔 Check for new songs**. The writers' recent uploads appear under *New uploads*.
- [ ] 2.5 Approve 2 or 3 songs from each writer. **Ignore** anything that isn't music.

## 3. Library

- [ ] 3.1 **Approved Library** tab: the approved songs are listed with thumbnails.
- [ ] 3.2 Paste one more approved link and click **Fetch info**. It shows **✓ Plays in the mixer · length m:ss**.
- [ ] 3.3 Pick the writer from the list and click **Add to approved library**.
- [ ] 3.4 Paste a link that is NOT in the library into Deck A and press LOAD. It must refuse and send you to the library.

## 3a. The list

- [ ] 3a.1 Paste a writer's YouTube link into **Paste a YouTube link…** at the top of the list and press Enter. It appears at the bottom with its picture; title, writer and length fill in.
- [ ] 3a.2 Drag a YouTube link from another window over the mixer and drop it on **THE LIST**. It is added.
- [ ] 3a.3 Drag a row to a new place. The order changes. **↑** on a row makes it **NEXT**.
- [ ] 3a.4 **✨ Line-up** arranges the songs still to play. **Undo** puts them back.
- [ ] 3a.5 **Writers** tab: paste each writer's channel link (✎ on their card). New songs show above the list; **✓ Add** puts one at the bottom.
- [ ] 3a.6 **Import** reads your saved `Rundown Console.html` and adds its songs to the bottom.

## 3b. Manual · Assist · Auto

- [ ] 3b.1 **Manual**: load and play a song yourself. When it ends, nothing else happens.
- [ ] 3b.2 **Assist**: the first song is ready on A. Press ▶. The next song appears on B. When A ends, it mixes into B by itself.
- [ ] 3b.3 While in Assist or Auto, click **Manual**. From now on nothing mixes by itself (you've taken over).
- [ ] 3b.4 **Auto**: music starts by itself and runs down the list.

## 4. One deck

- [ ] 4.1 Click **A** on a library song. Deck A shows the title, writer and video.
- [ ] 4.2 Press ▶. You hear the song and TIME TO END counts down.
- [ ] 4.3 Move the Deck A fader and the MASTER fader. The volume follows.
- [ ] 4.4 Press **TAP** in time with the beat, 8 times. BPM appears.
- [ ] 4.5 Press **GRID** exactly on a "1". The beat lights follow the music and "BAR x.x · n bars left" appears.
- [ ] 4.6 Press **CUE** while playing: it jumps back and pauses. Press ▶ again.
- [ ] 4.7 Click hot cue **1** to set it, then click it again to jump.
- [ ] 4.8 Click the progress bar to jump to a point in the song.

## 5. Mixing by hand

- [ ] 5.1 Load a different song on Deck B.
- [ ] 5.2 The Tempo box in the mixer shows both BPMs, once B has been tapped too.
- [ ] 5.3 Click a song in the list: it shows **UP NEXT**. Press **▶ Play next**. A fades out, B fades in, and A stops.
- [ ] 5.4 Move the crossfader slowly by hand. Both songs blend smoothly.
- [ ] 5.5 While B is playing on air, click **A** on a library song for Deck B. It must **ask first** before replacing, and the music keeps playing while it asks.

## 6. Auto DJ

- [ ] 6.1 Queue 4 songs. The **Smart Next** cards show reasons such as "behind" or "tempo match".
- [ ] 6.2 Set FADE to 8. Tick **Mix on the bar** and **Smart fill**.
- [ ] 6.3 Press **ON AIR**, then **AUTO DJ**. Music starts and the next song preloads on the other deck.
- [ ] 6.4 At the end of each song it crossfades by itself, with no dead air.
- [ ] 6.5 Let the queue run empty. Smart DJ adds songs on its own.
- [ ] 6.6 **Creators** tab: Target and Now update after each song. Over a long run, you get about 2 songs for each 1 per writer.

## 7. Talking

- [ ] 7.1 Press **TALK**. The music dips. Press again and it comes back.
- [ ] 7.2 Tick **Voice auto-duck** and allow the mic. Speak, and the music dips. Stop, and it returns after about 1 second.
- [ ] 7.3 If it dips with nobody talking, raise the trigger slider next to the mic meter.

## 8. Share tab

- [ ] 8.1 After POWER ON a second tab, **"Late Night with Ivan — SHARE (StreamYard)"**, opens by itself. If Chrome blocks it, allow pop-ups for localhost:8765 and click **VIEWER TAB**.
- [ ] 8.2 Click it once. The mixer's top-bar light turns **Share tab: connected ✓**.
- [ ] 8.3 Play a song from the mixer. You hear it, and the full video shows **in the Share tab** with the creator badge. The mixer tab stays fully visible.
- [ ] 8.4 Press **F** in the Share tab: full screen. Press **F** again to leave full screen.
- [ ] 8.5 During a mix, the video fades to the next song and the badge slides in with the new creator.
- [ ] 8.6 Close the Share tab while a song plays. The mixer warns you and the light shows **NOT OPEN**. Click the light, then click the new tab once. The song continues where it was.

## 8a. Overlays

- [ ] 8a.1 Drag a picture from your computer onto the board. The drop screen shows **OVERLAY**. The picture appears in the **Overlays** strip.
- [ ] 8a.2 Drag in a short MP4 clip, and paste a picture link into *picture / video link…*. Both appear in the strip.
- [ ] 8a.3 Pick **Big** and **5 s**, then click the picture. It shows on the Share tab over the video, and goes away after 5 seconds.
- [ ] 8a.4 Pick **Corner**, then click the clip. It plays in the corner and goes away when it ends. With **sound** ticked you hear it.
- [ ] 8a.5 Pick **until I click**, then show a picture. **Hide ✕** takes it off.
- [ ] 8a.6 Close and reopen the board. The overlays are still there.

## 8b. Overriding Smart DJ

- [ ] 8b.1 Let Smart DJ fill the queue. Its songs show a **SMART** tag and each row shows the song's image.
- [ ] 8b.2 Press **⇄** on a SMART song. It's replaced by another pick.
- [ ] 8b.3 Queue your own song and drag it to the top. It plays before the SMART songs.
- [ ] 8b.4 Press **Not now** on a suggestion. It doesn't come back during this show.
- [ ] 8b.5 Library: press **🤖** on a song. It shows *manual only* and Smart DJ never picks it.
- [ ] 8b.6 With Auto DJ on, the waiting deck says **SMART DJ PICK** or **YOUR PICK**. Drop another song on it and that song plays instead.

## 9. StreamYard (private broadcast)

- [ ] 9.1 StreamYard: set your XLR mic as normal.
- [ ] 9.2 **Share screen → Chrome Tab → "Late Night with Ivan — SHARE (StreamYard)"**, and tick **Also share tab audio**.
- [ ] 9.3 Put the share on stage. Viewers see the full video with the creator badge.
- [ ] 9.4 Start a **private / unlisted** test broadcast. Talk over music using TALK.
- [ ] 9.5 Watch the recording afterwards:
  - Is the music level right under your voice? Adjust MASTER if needed.
  - Did any song get a copyright claim? Note which one.

## 10. Stream Deck

- [ ] 10.1 Mixer **Settings & Stream Deck** tab: click **Copy** next to "Play / pause Deck A".
- [ ] 10.2 Stream Deck app: drag **Website** onto a key, paste the URL, tick **GET request in background**.
- [ ] 10.3 Click into StreamYard so the mixer is in the background, then press the key. Deck A plays or pauses.
- [ ] 10.4 Repeat for Play next, Auto DJ, TALK, ov1 (overlay), Full screen and Fade all out.

## 11. After the show

- [ ] 11.1 **Play Log & Credits → Credits: this show → Copy credits**.
- [ ] 11.2 Paste into Notepad. Check every song, writer and channel link is right.

## 11b. Updating

- [ ] 11b.1 Put a newer zip in Downloads (any `late-night-with-ivan-vX.Y.Z.zip`). Click the desktop button.
- [ ] 11b.2 The black window says **Installed vX.Y.Z**. The old version and the older zip are in the Recycle Bin. Your songs and overlays are still there.

## 12. Data is safe

- [ ] 12.1 Close Chrome and close the black window. Start again with the desktop button. Everything is still there.
- [ ] 12.2 `LateNightWithIvan\data` has `mixer-data.json` and a `backup-<date>.json`.
- [ ] 12.3 **Settings → Export backup** downloads a `.json` file. Keep it somewhere safe.

## 13. Safety

- [ ] 13.1 Press **FADE ALL OUT**. The music fades out in 2 seconds and Auto DJ turns off.
- [ ] 13.2 Close the mixer tab while music plays. Chrome asks "Leave site?". Click **Cancel**.

---

**Result:** ___ of 16 sections passed.  Date: ________

Failures (step number + what happened):

1.
2.
3.

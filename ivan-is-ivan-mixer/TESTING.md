# Verification test — Ivan is Ivan Live Mixer

Version tested: v________ (from the top bar)

Work top to bottom and tick each box. If something fails, stop, take a screenshot and note the step number.
Time needed: about 45 minutes. Use real songs from your writers, wear headphones, and use a **private** StreamYard broadcast.

---

## 0. Download and check the file

- [ ] 0.1 Download `ivan-is-ivan-mixer.zip`.
- [ ] 0.2 Check that the file is the one that was built. In PowerShell:
  `Get-FileHash .\ivan-is-ivan-mixer.zip -Algorithm SHA256`
  The hash must match the one you were given.
- [ ] 0.3 Right-click the zip → **Properties** → tick **Unblock** → OK. This stops Windows from blocking the start script.
- [ ] 0.4 Extract the zip to a folder you will keep, for example `Documents\ivan-is-ivan-mixer`. Don't run the mixer from inside the zip.

## 1. Start

- [ ] 1.1 Double-click `start-windows.bat`. A black window opens and Chrome opens the mixer.
  - If Windows SmartScreen appears: **More info → Run anyway**.
  - If Windows Firewall asks: choose **Cancel / don't allow**. The mixer only talks to your own computer and doesn't need network access.
- [ ] 1.2 Click **POWER ON**. The quick-start guide appears. Close it.
- [ ] 1.3 The top right shows **YouTube: ready**, **Stream Deck: ready** and **Disk: saved ✓** in green.
- [ ] 1.4 Hover over any button. A help box appears after a moment.
- [ ] 1.5 The top bar shows the version (for example **v2.5.0**). It matches the zip file name and **Settings → About this version**.

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

## 3a. Drag and paste links

- [ ] 3a.1 Put the mixer and a YouTube window side by side. Drag the song's link from YouTube's address bar over the mixer. A drop screen with **DECK A · QUEUE · DECK B** appears.
- [ ] 3a.2 Let go on **DECK A**. It loads, and the title and writer fill in. Drag another and let go on **QUEUE**. It joins the queue with its picture.
- [ ] 3a.3 Copy a YouTube link (Ctrl+C), click an empty spot in the mixer, then press **Ctrl+V**. It's queued.
- [ ] 3a.4 Drop the same link again. The library count doesn't go up.

## 3b. Import your Rundown music list

- [ ] 3b.1 **Approved Library → 📥 Import list → Choose file…** → pick `Downloads\Rundown Console.html`.
- [ ] 3b.2 If it says *No YouTube links found*: open the Rundown Console in Chrome, press Ctrl+A then Ctrl+C, paste into the box, then press **Read list**.
- [ ] 3b.3 The count of YouTube links found matches your list. Talk breaks and headings are skipped.
- [ ] 3b.4 Each song shows the right writer. Fix any that are wrong with the drop-down.
- [ ] 3b.5 Keep **Save as playlist**, then press **Add songs**. The songs appear in the library, and the playlist keeps the Rundown order.
- [ ] 3b.6 Within a minute, lengths fill in. Any song marked ⚠ cannot play in the mixer because the owner blocks embedding.

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
- [ ] 5.3 Press **MIX ⇄**. A fades out, B fades in, and A stops.
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

## 8. Viewer page

- [ ] 8.1 Press **VIEWER PAGE** (or V). The **full video fills the whole window**. The only extra is a badge at bottom left with the creator's picture, name and song title.
- [ ] 8.2 Press **F**. The page goes full screen. Press **F** again to leave full screen.
- [ ] 8.3 During a mix, the video fades to the next song and the badge slides in with the new creator.
- [ ] 8.4 Move the mouse to the top-right corner. The **Full screen / Exit** buttons appear. Move away and they vanish.
- [ ] 8.5 Press **Esc**. You're back at the controls and **the music keeps playing**.
- [ ] 8.6 Every writer shows their own picture. If one is missing, click ✎ on their card → **Image** → upload one → Save.

## 8b. Overriding Smart DJ

- [ ] 8b.1 Let Smart DJ fill the queue. Its songs show a **SMART** tag and each row shows the song's image.
- [ ] 8b.2 Press **⇄** on a SMART song. It's replaced by another pick.
- [ ] 8b.3 Queue your own song and drag it to the top. It plays before the SMART songs.
- [ ] 8b.4 Press **Not now** on a suggestion. It doesn't come back during this show.
- [ ] 8b.5 Library: press **🤖** on a song. It shows *manual only* and Smart DJ never picks it.
- [ ] 8b.6 With Auto DJ on, the waiting deck says **SMART DJ PICK** or **YOUR PICK**. Drop another song on it and that song plays instead.

## 9. StreamYard (private broadcast)

- [ ] 9.1 StreamYard: set your XLR mic as normal.
- [ ] 9.2 **Share screen → Chrome Tab → "Ivan is Ivan — Live Mixer"**, and tick **Also share tab audio**.
- [ ] 9.3 Put the share on stage. Viewers see the full video with the creator badge.
- [ ] 9.4 Start a **private / unlisted** test broadcast. Talk over music using TALK.
- [ ] 9.5 Watch the recording afterwards:
  - Is the music level right under your voice? Adjust MASTER if needed.
  - Did any song get a copyright claim? Note which one.

## 10. Stream Deck

- [ ] 10.1 Mixer **Settings & Stream Deck** tab: click **Copy** next to "Play / pause Deck A".
- [ ] 10.2 Stream Deck app: drag **Website** onto a key, paste the URL, tick **GET request in background**.
- [ ] 10.3 Click into StreamYard so the mixer is in the background, then press the key. Deck A plays or pauses.
- [ ] 10.4 Repeat for MIX ⇄, Auto DJ, TALK, Viewer page, Full screen and Fade all out.

## 11. After the show

- [ ] 11.1 **Play Log & Credits → Credits: this show → Copy credits**.
- [ ] 11.2 Paste into Notepad. Check every song, writer and channel link is right.

## 12. Data is safe

- [ ] 12.1 Close Chrome and close the black window. Start again with `start-windows.bat`. Everything is still there.
- [ ] 12.2 The app folder now has `data\mixer-data.json` and a `backup-<date>.json`.
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

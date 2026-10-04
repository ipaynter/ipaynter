/* Ivan is Ivan — Live Mixer
 * Two-deck YouTube mixer for live shows. Runs locally in Chrome.
 * No tracking, no accounts. Data lives in this browser's localStorage.
 */
'use strict';

// Privacy-enhanced YouTube host for the players.
const YT_HOST = 'https://www.youtube-nocookie.com';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function fmt(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}

function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 3600) + ':' + String(Math.floor((sec % 3600) / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

function parseVideoId(input) {
  const s = (input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1, 12);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v');
      if (!id) {
        const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/);
        if (m) id = m[2];
      }
    }
    if (id && /^[\w-]{11}$/.test(id.slice(0, 11))) return id.slice(0, 11);
  } catch { /* not a URL */ }
  return null;
}

/* ---------------- storage ---------------- */

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Could not save — browser storage is blocked or full', 'bad'); } }
};

const S = {
  library: store.get('iii.library', []),     // approved tracks
  queue: store.get('iii.queue', []),         // [{qid, id}]
  playlists: store.get('iii.playlists', []), // [{id, name, items:[trackId]}]
  history: store.get('iii.history', []),     // play log
  cfg: Object.assign({
    fadeSec: 8, curve: 'smooth', master: 90, duckLevel: 25, approvedOnly: true,
    warnSec: 30, volA: 80, volB: 80, voiceThresh: 35, deadAirMode: 'autodj'
  }, store.get('iii.settings', {})),
  xf: 0,              // crossfader 0 = A, 1 = B
  duckGain: 1, duckTarget: 1, panicGain: 1,
  talk: false, voiceTalk: false,
  autoDJ: false, onAir: false, onAirAt: 0, showElapsed: 0,
  transitioning: false, deadSince: 0, ytReady: false,
  creditsMode: 'show'
};

const save = {
  library: () => store.set('iii.library', S.library),
  queue: () => store.set('iii.queue', S.queue),
  playlists: () => store.set('iii.playlists', S.playlists),
  history: () => store.set('iii.history', S.history),
  cfg: () => store.set('iii.settings', S.cfg)
};

const byId = id => S.library.find(t => t.id === id);
const byVid = vid => S.library.find(t => t.videoId === vid);
const inLib = t => !!t && S.library.includes(t);

/* ---------------- toasts ---------------- */

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('out'), 3800);
  setTimeout(() => el.remove(), 4300);
}

/* ---------------- tweens (setInterval so they keep running when the window is in the background) ---------------- */

const tweens = {};
function cancelTween(key) { clearInterval(tweens[key]); delete tweens[key]; }
function tween(key, from, to, ms, step, done) {
  cancelTween(key);
  if (ms <= 0) { step(to); if (done) done(); return; }
  const t0 = performance.now();
  tweens[key] = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / ms);
    step(from + (to - from) * p);
    if (p >= 1) { cancelTween(key); if (done) done(); }
  }, 30);
}

/* ---------------- volume model ---------------- */

function xfGains(x, curve) {
  if (curve === 'linear') return [1 - x, x];
  if (curve === 'cut') return [x < 0.9 ? 1 : (1 - x) / 0.1, x > 0.1 ? 1 : x / 0.1];
  return [Math.cos(x * Math.PI / 2), Math.sin(x * Math.PI / 2)]; // constant power
}

function applyVolumes() {
  if (!decks.A) return;
  const [ga, gb] = xfGains(S.xf, S.cfg.curve);
  const m = (S.cfg.master / 100) * S.duckGain * S.panicGain;
  decks.A.setOut((S.cfg.volA / 100) * ga * m);
  decks.B.setOut((S.cfg.volB / 100) * gb * m);
  renderMeters();
}

/* ---------------- deck ---------------- */

class Deck {
  constructor(id, mount) {
    this.id = id;
    this.el = $('#deckTpl').content.firstElementChild.cloneNode(true);
    this.el.classList.add('deck-' + id.toLowerCase());
    mount.append(this.el);
    this.r = {};
    $$('[data-r]', this.el).forEach(e => { this.r[e.dataset.r] = e; });
    this.r.letter.textContent = id;
    this.r.player.id = 'player' + id;

    this.player = null; this.ready = false; this.track = null;
    this.ytState = -1; this.time = 0; this.dur = 0; this.out = 0; this.lastVol = -1;
    this.played = false; this.finished = false; this.errored = false; this.wantPlay = false;
    this.cuePoint = 0; this.loopIn = null; this.loop = null; this.markSig = '';
    this.bind();
    this.render();
  }

  bind() {
    this.el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.hc !== undefined) return this.hotcue(+b.dataset.hc, e.shiftKey);
      const a = b.dataset.a;
      if (a && typeof this['act_' + a] === 'function') this['act_' + a]();
    });
    this.el.addEventListener('contextmenu', e => {
      const b = e.target.closest('[data-hc]');
      if (b) { e.preventDefault(); this.hotcue(+b.dataset.hc, true); }
    });
    this.r.progress.addEventListener('click', e => {
      if (!this.track || !this.dur) return;
      const rect = this.r.progress.getBoundingClientRect();
      this.seek(((e.clientX - rect.left) / rect.width) * this.dur);
    });
    this.r.url.addEventListener('keydown', e => { if (e.key === 'Enter') this.act_load(); });
    this.el.addEventListener('dragover', e => { if (drag) { e.preventDefault(); this.el.classList.add('drop'); } });
    this.el.addEventListener('dragleave', e => { if (!this.el.contains(e.relatedTarget)) this.el.classList.remove('drop'); });
    this.el.addEventListener('drop', e => {
      e.preventDefault(); this.el.classList.remove('drop');
      if (!drag) return;
      const t = byId(drag.id);
      if (drag.qid) removeFromQueue(drag.qid);
      if (t) this.load(t);
      drag = null;
    });
  }

  create() {
    this.player = new YT.Player(this.r.player.id, {
      host: YT_HOST, width: '100%', height: '100%',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, playsinline: 1, origin: location.origin },
      events: {
        onReady: () => {
          this.ready = true; this.lastVol = -1; applyVolumes();
          if (this.track) this.cueCurrent(this.wantPlay);
        },
        onStateChange: e => this.onState(e.data),
        onError: e => this.onError(e.data)
      }
    });
  }

  load(track, autoplay = false) {
    if (!track) return;
    if (this.isPlaying() && this.out > 0.05 && !autoplay) {
      if (!confirm(`Deck ${this.id} is playing on air. Replace it?`)) return;
    }
    this.track = track;
    this.played = false; this.finished = false; this.errored = false;
    this.loop = null; this.loopIn = null;
    this.dur = track.duration || 0;
    this.cuePoint = track.inAt || 0;
    this.time = this.cuePoint;
    this.wantPlay = autoplay;
    this.ytState = -1;
    if (this.ready) this.cueCurrent(autoplay);
    this.r.url.value = '';
    this.render();
  }

  cueCurrent(autoplay) {
    const o = { videoId: this.track.videoId, startSeconds: this.cuePoint || 0 };
    this.lastVol = -1;
    applyVolumes();
    if (autoplay) this.player.loadVideoById(o); else this.player.cueVideoById(o);
  }

  isPlaying() { return this.ytState === 1 || (this.ytState === 3 && this.wantPlay); }

  play() {
    if (!this.track) { toast(`Deck ${this.id} is empty`); return; }
    if (this.errored) { toast(`Deck ${this.id}: this track cannot play`, 'bad'); return; }
    this.wantPlay = true;
    if (!this.ready) return;
    if (this.finished) { this.finished = false; this.player.seekTo(this.cuePoint, true); }
    this.player.playVideo();
  }

  pause() { this.wantPlay = false; if (this.ready && this.track) this.player.pauseVideo(); }
  toggle() { this.isPlaying() ? this.pause() : this.play(); }

  seek(t) {
    if (!this.ready || !this.track) return;
    t = Math.max(0, this.dur ? Math.min(t, this.dur - 0.25) : t);
    this.player.seekTo(t, true);
    this.time = t;
    if (this.finished && t < this.dur - 0.5) this.finished = false;
    this.render();
  }

  persist() { if (inLib(this.track)) { save.library(); renderLibrary(); } }

  // CDJ style: paused = set cue here, playing = jump back to cue and pause.
  act_cue() {
    if (!this.track) return;
    if (this.isPlaying()) { this.pause(); this.seek(this.cuePoint); }
    else { this.cuePoint = this.time; this.seek(this.cuePoint); toast(`Deck ${this.id}: cue set at ${fmt(this.time)}`); }
  }
  act_play() { this.toggle(); }
  act_restart() { this.seek(this.track?.inAt || 0); }
  act_back() { this.seek(this.time - 10); }
  act_fwd() { this.seek(this.time + 10); }

  act_loopIn() { if (!this.track) return; this.loopIn = this.time; this.loop = null; this.render(); }
  act_loopOut() {
    if (this.loopIn == null || this.time <= this.loopIn + 0.5) { toast('Press loop IN first, then OUT a moment later'); return; }
    this.loop = [this.loopIn, this.time]; this.seek(this.loopIn);
  }
  act_loop8() {
    if (!this.track) return;
    if (this.loop) { this.loop = null; this.render(); return; }
    this.loopIn = this.time; this.loop = [this.time, this.time + 8]; this.render();
  }
  act_loopExit() { this.loop = null; this.render(); }

  act_setIn() {
    if (!this.track) return;
    this.track.inAt = Math.round(this.time * 10) / 10; this.cuePoint = this.track.inAt;
    this.persist(); toast(`Deck ${this.id}: song now starts at ${fmt(this.track.inAt)}`, 'good');
  }
  act_setOut() {
    if (!this.track) return;
    this.track.outAt = Math.round(this.time * 10) / 10;
    this.persist(); toast(`Deck ${this.id}: Auto DJ will mix out at ${fmt(this.track.outAt)}`, 'good');
  }
  act_clearTrim() {
    if (!this.track) return;
    delete this.track.inAt; delete this.track.outAt; this.cuePoint = 0;
    this.persist(); toast(`Deck ${this.id}: start / mix-out cleared`);
  }

  act_load() {
    const raw = this.r.url.value.trim();
    if (!raw) { this.r.url.focus(); return; }
    const vid = parseVideoId(raw);
    if (!vid) { toast('That is not a YouTube link', 'bad'); return; }
    let t = byVid(vid);
    if (!t) {
      if (S.cfg.approvedOnly) {
        toast('Not in your approved library yet — add it first', 'bad');
        openTab('library'); resetLibForm(); $('#libUrl').value = raw; fetchInfo();
        return;
      }
      t = { id: 'tmp-' + vid, videoId: vid, title: '', artist: '', license: 'NOT IN LIBRARY' };
    }
    this.load(t);
  }
  act_next() {
    const t = dequeue();
    if (t) this.load(t); else toast('Queue is empty');
  }

  hotcue(i, clear) {
    if (!this.track) return;
    const c = this.track.cues || (this.track.cues = [null, null, null, null]);
    if (clear) { c[i] = null; }
    else if (c[i] == null) { c[i] = Math.round(this.time * 10) / 10; toast(`Deck ${this.id}: hot cue ${i + 1} set at ${fmt(c[i])}`); }
    else { this.seek(c[i]); if (!this.isPlaying()) this.play(); }
    this.persist(); this.render();
  }

  onState(s) {
    this.ytState = s;
    if (s === 1) {
      const d = this.player.getDuration();
      if (d > 0) this.setDur(d);
      if (this.track && !this.track.title) {
        const vd = this.player.getVideoData?.() || {};
        if (vd.title) this.track.title = vd.title;
        if (vd.author && !this.track.artist) this.track.artist = vd.author;
        this.persist();
      }
      if (!this.played) { this.played = true; logPlay(this); }
      if (!this.wantPlay) this.wantPlay = true; // started from somewhere else
    }
    if (s === 2) this.wantPlay = false;
    if (s === 0) { this.finished = true; this.wantPlay = false; onDeckEnded(this); }
    this.render();
  }

  onError(code) {
    const why = {
      2: 'bad video ID', 5: 'player error', 100: 'video removed or private',
      101: 'owner does not allow embedding', 150: 'owner does not allow embedding',
      153: 'player blocked — start the mixer with the start script, not as a file'
    }[code] || ('YouTube error ' + code);
    toast(`Deck ${this.id}: ${why}`, 'bad');
    const was = this.wantPlay;
    this.errored = true; this.finished = true; this.wantPlay = false;
    if (inLib(this.track)) { this.track.flag = why; save.library(); renderLibrary(); }
    this.render();
    if (S.autoDJ && was) onDeckEnded(this);
  }

  setDur(d) {
    this.dur = d;
    if (this.track && Math.abs((this.track.duration || 0) - d) > 1) {
      this.track.duration = d;
      if (inLib(this.track)) { save.library(); renderLibrary(); renderQueue(); }
    }
  }

  tick() {
    if (!this.ready || !this.track) return;
    const t = this.player.getCurrentTime?.();
    if (typeof t === 'number' && isFinite(t)) this.time = t;
    if (!this.dur) { const d = this.player.getDuration?.(); if (d > 0) this.setDur(d); }
    if (this.loop && this.isPlaying() && this.time >= this.loop[1]) this.seek(this.loop[0]);
  }

  // Effective end: the mix-out point if set and not yet passed, else the real end.
  end() {
    const o = this.track?.outAt;
    return (o && this.dur && o < this.dur && this.time < o) ? o : this.dur;
  }
  remaining() { return Math.max(0, this.end() - this.time); }

  setOut(g) {
    this.out = g;
    if (!this.ready) return;
    const v = clamp(Math.round(g * 100), 0, 100);
    if (v !== this.lastVol) {
      this.player.setVolume(v);
      if (v > 0 && this.player.isMuted?.()) this.player.unMute();
      this.lastVol = v;
    }
  }

  render() {
    const r = this.r, t = this.track;
    r.title.textContent = t ? (t.title || t.videoId) : '— Empty —';
    r.artist.textContent = t ? `${t.artist || 'Unknown creator'}${t.license ? ' · ' + t.license : ''}` : 'Drag a track here or paste an approved link';
    const playing = this.isPlaying();
    const st = !t ? 'EMPTY' : this.errored ? 'ERROR' : playing ? 'PLAYING' : this.finished ? 'ENDED' : this.ytState === 2 ? 'PAUSED' : 'CUED';
    r.state.textContent = st; r.state.dataset.s = st;
    r.playBtn.textContent = playing ? '❚❚' : '▶';

    const rem = this.remaining();
    r.elapsed.textContent = fmt(this.time);
    r.remain.textContent = '-' + fmt(Math.ceil(rem));
    r.length.textContent = fmt(this.dur);
    const pct = this.dur ? clamp(this.time / this.dur * 100, 0, 100) : 0;
    r.bar.style.width = pct + '%';
    r.playhead.style.left = pct + '%';

    const warn = playing && this.dur > 0 && rem <= S.cfg.warnSec;
    const live = liveDeck() === this;
    this.el.classList.toggle('playing', playing);
    this.el.classList.toggle('warn', warn && rem > 10);
    this.el.classList.toggle('crit', warn && rem <= 10);
    this.el.classList.toggle('live', live && playing && this.out > 0.01);

    const o = other(this);
    const nextReady = !!(o && o.track && !o.played && !o.errored);
    let msg = '';
    if (S.transitioning && playing && o?.isPlaying()) msg = `MIXING INTO DECK ${S.mixTarget}…`;
    else if (playing && S.autoDJ && live && nextReady) msg = `AUTO MIX TO ${o.id} IN ${fmt(Math.max(0, rem - S.cfg.fadeSec))}`;
    else if (playing && S.autoDJ && live) msg = S.queue.length ? `AUTO DJ: NEXT SONG LOADING ON DECK ${o.id}` : 'AUTO DJ: QUEUE EMPTY — ADD MUSIC';
    else if (warn) msg = nextReady ? `ENDING — NEXT ON ${o.id}: ${o.track.title || o.track.videoId}` : `ENDING — NOTHING CUED ON DECK ${o.id}`;
    r.mixout.textContent = msg;

    // markers only rebuild when they change
    const cues = t?.cues || [];
    const sig = [this.dur, t?.inAt, t?.outAt, this.cuePoint, this.loop?.join(), cues.join()].join('|');
    if (sig !== this.markSig) {
      this.markSig = sig;
      let h = '';
      if (this.dur) {
        const at = s => (clamp(s / this.dur, 0, 1) * 100).toFixed(2) + '%';
        if (this.loop) h += `<div class="mk loop" style="left:${at(this.loop[0])};width:calc(${at(this.loop[1])} - ${at(this.loop[0])})"></div>`;
        if (this.cuePoint) h += `<div class="mk cue" style="left:${at(this.cuePoint)}"></div>`;
        if (t?.inAt) h += `<div class="mk in" style="left:${at(t.inAt)}"><span>S</span></div>`;
        if (t?.outAt) h += `<div class="mk out" style="left:${at(t.outAt)}"><span>OUT</span></div>`;
        cues.forEach((c, i) => { if (c != null) h += `<div class="mk hc" style="left:${at(c)}"><span>${i + 1}</span></div>`; });
      }
      r.markers.innerHTML = h;
      $$('[data-hc]', this.el).forEach(b => b.classList.toggle('set', cues[+b.dataset.hc] != null));
    }
    r.loop8.classList.toggle('active', !!this.loop);
  }
}

const decks = {};
const other = d => (d.id === 'A' ? decks.B : decks.A);
const liveDeck = () => (S.xf <= 0.5 ? decks.A : decks.B);

/* ---------------- hidden probe player: reads song length / title for the library ---------------- */

const Probe = {
  player: null, ready: false, jobs: [], busy: null, timer: null,
  init() {
    this.player = new YT.Player('probe', {
      host: YT_HOST, width: 200, height: 200,
      playerVars: { autoplay: 0, controls: 0, mute: 1, origin: location.origin },
      events: {
        onReady: () => { this.ready = true; this.player.mute(); this.next(); },
        onStateChange: e => this.state(e.data),
        onError: e => this.finish({ error: e.data })
      }
    });
  },
  get(videoId) { return new Promise(res => { this.jobs.push({ videoId, res }); this.next(); }); },
  next() {
    if (!this.ready || this.busy || !this.jobs.length) return;
    this.busy = this.jobs.shift();
    this.player.mute();
    this.player.loadVideoById(this.busy.videoId);
    this.timer = setTimeout(() => this.finish(null), 15000);
  },
  state(s) {
    if (!this.busy || (s !== 1 && s !== 3 && s !== 5)) return;
    const d = this.player.getDuration();
    if (d > 0) {
      const vd = this.player.getVideoData?.() || {};
      this.player.stopVideo();
      this.finish({ duration: d, title: vd.title, author: vd.author });
    }
  },
  finish(result) {
    clearTimeout(this.timer);
    const job = this.busy; this.busy = null;
    if (job) job.res(result);
    setTimeout(() => this.next(), 250);
  }
};

/* ---------------- mixing logic ---------------- */

function syncXfUI() { $('#xfader').value = Math.round(S.xf * 1000); }

function setXf(v) {
  cancelTween('xf'); S.transitioning = false;
  S.xf = clamp(v, 0, 1); syncXfUI(); applyVolumes();
}

// Fade the crossfader over to `target` deck. stopOld pauses the other deck when done.
function mixTo(target, secs = S.cfg.fadeSec, { stopOld = true } = {}) {
  const from = other(target);
  if (!target.track || target.errored) { toast(`Deck ${target.id} has nothing loaded`, 'bad'); return false; }
  if (!target.isPlaying()) target.play();
  const to = target.id === 'A' ? 0 : 1;
  const ms = Math.max(0, secs * 1000 * Math.abs(to - S.xf));
  S.transitioning = true;
  S.mixTarget = target.id;
  tween('xf', S.xf, to, ms, v => { S.xf = v; syncXfUI(); applyVolumes(); }, () => {
    S.transitioning = false;
    if (stopOld && from.isPlaying()) from.pause();
    renderAll();
  });
  return true;
}

function mixNow() { mixTo(other(liveDeck())); }

function dequeue() {
  while (S.queue.length) {
    const q = S.queue.shift();
    const t = byId(q.id);
    if (t) { save.queue(); renderQueue(); return t; }
  }
  save.queue(); renderQueue();
  return null;
}

function onDeckEnded(d) {
  if (!S.autoDJ || liveDeck() !== d) return;
  const n = other(d);
  if (n.isPlaying()) return;
  if (!n.track || n.played || n.errored) {
    const t = dequeue();
    if (!t) { toast('Auto DJ: queue is empty', 'bad'); return; }
    n.load(t, true);
  } else n.play();
  setXf(n.id === 'A' ? 0 : 1);
}

function autoTick() {
  if (!S.autoDJ) return;
  const live = liveDeck(), next = other(live);
  // Pre-load the next song onto the idle deck.
  if (!S.transitioning && !next.isPlaying() && (!next.track || next.played || next.errored) && S.queue.length) {
    const t = dequeue();
    if (t) next.load(t, false);
  }
  if (S.transitioning) return;
  if (live.isPlaying() && live.dur > 0 && next.ready && next.track && !next.played && !next.errored) {
    const rem = live.remaining();
    if (rem <= S.cfg.fadeSec + 0.25) mixTo(next, Math.min(S.cfg.fadeSec, rem));
  }
}

function setAutoDJ(on) {
  S.autoDJ = on;
  $('#autoDJ').classList.toggle('on', on);
  if (on) {
    const live = liveDeck();
    if (!live.isPlaying() && !other(live).isPlaying()) {
      if (!live.track || live.finished || live.errored) {
        const t = dequeue();
        if (t) live.load(t, true); else toast('Queue is empty — add approved tracks first', 'bad');
      } else live.play();
    }
    toast('Auto DJ ON', 'good');
  } else toast('Auto DJ OFF — you are driving');
  renderAll();
}

function updateDuck() {
  const want = S.talk || S.voiceTalk;
  const target = want ? S.cfg.duckLevel / 100 : 1;
  $('#talk').classList.toggle('on', want);
  if (target === S.duckTarget) return;
  S.duckTarget = target;
  tween('duck', S.duckGain, target, want ? 250 : 900, v => { S.duckGain = v; applyVolumes(); });
}
function setTalk(on) { S.talk = on; updateDuck(); }

function panic() {
  tween('panic', S.panicGain, 0, 2000, v => { S.panicGain = v; applyVolumes(); }, () => {
    setAutoDJ(false);
    decks.A.pause(); decks.B.pause();
    setTimeout(() => { S.panicGain = 1; applyVolumes(); }, 300);
  });
}

function toggleOnAir() {
  S.onAir = !S.onAir;
  if (S.onAir) S.onAirAt = Date.now();
  $('#onair').classList.toggle('on', S.onAir);
}

function setMaster(v) { S.cfg.master = clamp(Math.round(v), 0, 100); $('#master').value = S.cfg.master; save.cfg(); applyVolumes(); }
function setDeckVol(id, v) { S.cfg['vol' + id] = clamp(Math.round(v), 0, 100); $('#vol' + id).value = S.cfg['vol' + id]; save.cfg(); applyVolumes(); }

/* ---------------- voice auto-duck (reads your mic level only, never records) ---------------- */

const Voice = {
  on: false, ctx: null, stream: null, analyser: null, buf: null, lastLoud: 0, level: 0,
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      this.ctx = new AudioContext();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.buf = new Float32Array(this.analyser.fftSize);
      src.connect(this.analyser);
      this.on = true;
      toast('Voice auto-duck ON — music dips when you talk', 'good');
    } catch (e) {
      $('#voiceDuck').checked = false;
      toast('Mic not available: ' + (e.message || e.name), 'bad');
    }
  },
  stop() {
    this.on = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.ctx?.close();
    this.ctx = this.stream = this.analyser = null;
    S.voiceTalk = false; updateDuck();
    $('#micMeter i').style.width = '0';
  },
  tick() {
    if (!this.on || !this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += v * v;
    const db = 20 * Math.log10(Math.sqrt(sum / this.buf.length) + 1e-9);
    this.level = clamp((db + 60) / 60 * 100, 0, 100); // -60 dB..0 dB → 0..100
    $('#micMeter i').style.width = this.level + '%';
    const now = Date.now();
    if (this.level >= S.cfg.voiceThresh) this.lastLoud = now;
    const talking = now - this.lastLoud < 1200;
    if (talking !== S.voiceTalk) { S.voiceTalk = talking; updateDuck(); }
  }
};

/* ---------------- Stream Deck remote (local server relays button presses) ---------------- */

const Remote = {
  ok: false, busy: false, key: null,
  async init() {
    try {
      const r = await fetch('/api/info', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      this.key = (await r.json()).key;
      this.ok = true;
    } catch { this.ok = false; }
    const pill = $('#remoteStatus');
    pill.textContent = this.ok ? 'Stream Deck: ready' : 'Stream Deck: keyboard only';
    pill.className = 'pill ' + (this.ok ? 'ok' : '');
    renderKeys();
  },
  async poll() {
    if (!this.ok || this.busy) return;
    this.busy = true;
    try {
      const r = await fetch('/api/poll', { cache: 'no-store' });
      if (r.ok) (await r.json()).forEach(runCommand);
    } catch { /* server stopped */ }
    this.busy = false;
  }
};

// name: [label, keyboard key or null, action]
const COMMANDS = {
  playA: ['Play / pause Deck A', '1', () => decks.A.toggle()],
  playB: ['Play / pause Deck B', '2', () => decks.B.toggle()],
  cueA: ['Cue Deck A', 'q', () => decks.A.act_cue()],
  cueB: ['Cue Deck B', 'w', () => decks.B.act_cue()],
  nextA: ['Load next from queue → A', 'a', () => decks.A.act_next()],
  nextB: ['Load next from queue → B', 's', () => decks.B.act_next()],
  mix: ['MIX ⇄ to the other deck (fade time)', ' ', mixNow],
  xfA: ['Fade crossfader to A (keep B playing)', 'z', () => mixTo(decks.A, S.cfg.fadeSec, { stopOld: false })],
  xfB: ['Fade crossfader to B (keep A playing)', 'x', () => mixTo(decks.B, S.cfg.fadeSec, { stopOld: false })],
  xfCenter: ['Crossfader to center', 'c', () => setXf(0.5)],
  xfLeft: ['Nudge crossfader toward A', 'ArrowLeft', () => setXf(S.xf - 0.05)],
  xfRight: ['Nudge crossfader toward B', 'ArrowRight', () => setXf(S.xf + 0.05)],
  autodj: ['Auto DJ on / off', 'd', () => setAutoDJ(!S.autoDJ)],
  talk: ['Talk-over duck on / off', 't', () => setTalk(!S.talk)],
  talkOn: ['Talk-over duck ON', null, () => setTalk(true)],
  talkOff: ['Talk-over duck OFF', null, () => setTalk(false)],
  onair: ['On Air on / off', 'o', toggleOnAir],
  masterUp: ['Master volume +5', 'ArrowUp', () => setMaster(S.cfg.master + 5)],
  masterDown: ['Master volume −5', 'ArrowDown', () => setMaster(S.cfg.master - 5)],
  volADown: ['Deck A volume −5', '[', () => setDeckVol('A', S.cfg.volA - 5)],
  volAUp: ['Deck A volume +5', ']', () => setDeckVol('A', S.cfg.volA + 5)],
  volBDown: ['Deck B volume −5', ';', () => setDeckVol('B', S.cfg.volB - 5)],
  volBUp: ['Deck B volume +5', "'", () => setDeckVol('B', S.cfg.volB + 5)],
  hcA1: ['Deck A hot cue 1', null, () => decks.A.hotcue(0)],
  hcA2: ['Deck A hot cue 2', null, () => decks.A.hotcue(1)],
  hcB1: ['Deck B hot cue 1', null, () => decks.B.hotcue(0)],
  hcB2: ['Deck B hot cue 2', null, () => decks.B.hotcue(1)],
  panic: ['Fade everything out (2 s)', 'Escape', panic]
};

function runCommand(name) {
  const c = COMMANDS[name];
  if (c) c[2](); else console.warn('Unknown command', name);
}

const KEYMAP = {};
Object.entries(COMMANDS).forEach(([name, c]) => { if (c[1]) KEYMAP[c[1]] = name; });

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.target.closest('input, textarea, select') && e.key !== 'Escape') return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const name = KEYMAP[k];
  if (!name) return;
  e.preventDefault();
  if (e.key === 'Escape' && e.target.closest('input, textarea, select')) { e.target.blur(); return; }
  runCommand(name);
});

/* ---------------- play log & credits ---------------- */

function logPlay(d) {
  const t = d.track;
  S.history.unshift({ at: Date.now(), id: t.id, videoId: t.videoId, title: t.title, artist: t.artist, license: t.license || '', deck: d.id });
  if (S.history.length > 1000) S.history.length = 1000;
  save.history();
  if (inLib(t)) { t.plays = (t.plays || 0) + 1; t.lastPlayed = Date.now(); save.library(); renderLibrary(); }
  renderHistory();
}

function buildCredits(mode) {
  S.creditsMode = mode;
  let since;
  if (mode === 'show' && S.onAirAt) since = S.onAirAt;
  else { const d = new Date(); d.setHours(0, 0, 0, 0); since = d.getTime(); }
  const seen = new Set(), lines = [];
  [...S.history].reverse().forEach(h => {
    if (h.at < since || seen.has(h.videoId)) return;
    seen.add(h.videoId);
    const t = byVid(h.videoId) || h;
    lines.push(`• ${t.title || h.videoId} — ${t.artist || 'Unknown creator'} — https://youtu.be/${h.videoId}${t.notes ? ' (' + t.notes + ')' : ''}`);
  });
  $('#credits').value = lines.length ? 'Music in this episode (used with the creators\' permission):\n' + lines.join('\n') : '';
  if (!lines.length) toast(mode === 'show' && !S.onAirAt ? 'No show yet — press ON AIR when you go live' : 'Nothing played yet');
}

/* ---------------- drag & drop ---------------- */

let drag = null; // { id, qid? }
document.addEventListener('dragend', () => { drag = null; $$('.drop, .dragover').forEach(e => e.classList.remove('drop', 'dragover')); });

/* ---------------- queue ---------------- */

function addToQueue(id, index = S.queue.length) {
  S.queue.splice(index, 0, { qid: uid(), id });
  save.queue(); renderQueue();
}
function removeFromQueue(qid) {
  S.queue = S.queue.filter(q => q.qid !== qid);
  save.queue(); renderQueue();
}

const trackLen = t => Math.max(0, (t.outAt || t.duration || 0) - (t.inAt || 0));

// Seconds until each queued song is expected to start.
function queueEtas(items) {
  const live = liveDeck(), next = other(live);
  let eta = 0;
  if (live.isPlaying()) eta += live.remaining();
  if (next.track && !next.played && !next.errored) eta += Math.max(0, trackLen(next.track) - S.cfg.fadeSec);
  return items.map(t => { const at = eta; eta += Math.max(0, trackLen(t) - S.cfg.fadeSec); return at; });
}

function renderQueue() {
  const items = S.queue.map(q => ({ q, t: byId(q.id) })).filter(x => x.t);
  const etas = queueEtas(items.map(x => x.t));
  $('#queueList').innerHTML = items.map(({ q, t }, i) => {
    const len = trackLen(t);
    return `<li draggable="true" data-qid="${q.qid}" data-id="${t.id}">
      <span class="num">${i + 1}</span>
      <div class="grow"><div class="ttl">${esc(t.title || t.videoId)}</div><div class="sub">${esc(t.artist || 'Unknown creator')} · ${esc(t.license || 'no permission note')}</div></div>
      <span class="eta" title="Estimated start">+${fmt(etas[i])}</span>
      <span class="len">${len ? fmt(len) : '?:??'}</span>
      <button type="button" data-q="A">→A</button><button type="button" data-q="B">→B</button>
      <button type="button" data-q="up" title="Move up">▲</button><button type="button" data-q="del" title="Remove">✕</button>
    </li>`;
  }).join('');
  $('#queueCount').textContent = items.length;
  $('#queueTime').textContent = fmt(items.reduce((s, x) => s + trackLen(x.t), 0));
}

// Refresh the ETA column without rebuilding rows (keeps drags and clicks intact).
function updateQueueEtas() {
  const rows = $$('#queueList li');
  const etas = queueEtas(rows.map(li => byId(li.dataset.id)).filter(Boolean));
  rows.forEach((li, i) => { const e = li.querySelector('.eta'); if (e && etas[i] != null) e.textContent = '+' + fmt(etas[i]); });
}

function initQueueUI() {
  const list = $('#queueList');
  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-q]'); if (!b) return;
    const li = b.closest('li'), qid = li.dataset.qid, id = li.dataset.id;
    const act = b.dataset.q;
    if (act === 'del') removeFromQueue(qid);
    else if (act === 'up') {
      const i = S.queue.findIndex(q => q.qid === qid);
      if (i > 0) { [S.queue[i - 1], S.queue[i]] = [S.queue[i], S.queue[i - 1]]; save.queue(); renderQueue(); }
    } else { removeFromQueue(qid); decks[act].load(byId(id)); }
  });
  list.addEventListener('dragstart', e => {
    const li = e.target.closest('li'); if (!li) return;
    drag = { id: li.dataset.id, qid: li.dataset.qid };
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', li.dataset.id);
  });
  list.addEventListener('dragover', e => {
    if (!drag) return; e.preventDefault();
    $$('li.dragover', list).forEach(x => x.classList.remove('dragover'));
    e.target.closest('li')?.classList.add('dragover');
  });
  list.addEventListener('drop', e => {
    if (!drag) return; e.preventDefault();
    const target = e.target.closest('li');
    let index = target ? S.queue.findIndex(q => q.qid === target.dataset.qid) : S.queue.length;
    if (drag.qid) {
      const from = S.queue.findIndex(q => q.qid === drag.qid);
      const [item] = S.queue.splice(from, 1);
      if (from < index) index--;
      S.queue.splice(index < 0 ? S.queue.length : index, 0, item);
      save.queue(); renderQueue();
    } else addToQueue(drag.id, index < 0 ? S.queue.length : index);
    drag = null;
  });
  // allow dropping library rows on the empty area around the list
  const body = $('[data-body="queue"]');
  body.addEventListener('dragover', e => { if (drag && !drag.qid) e.preventDefault(); });
  body.addEventListener('drop', e => { if (drag && !drag.qid && !e.target.closest('#queueList')) { e.preventDefault(); addToQueue(drag.id); drag = null; } });

  $('#qClear').onclick = () => { if (S.queue.length && confirm('Clear the whole queue?')) { S.queue = []; save.queue(); renderQueue(); } };
  $('#qShuffle').onclick = () => {
    for (let i = S.queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.queue[i], S.queue[j]] = [S.queue[j], S.queue[i]]; }
    save.queue(); renderQueue();
  };
  $('#qSave').onclick = () => {
    const name = $('#plName').value.trim();
    if (!name) { toast('Give the playlist a name'); $('#plName').focus(); return; }
    if (!S.queue.length) { toast('Queue is empty'); return; }
    const existing = S.playlists.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing && !confirm(`Overwrite playlist "${existing.name}"?`)) return;
    const items = S.queue.map(q => q.id);
    if (existing) existing.items = items; else S.playlists.push({ id: uid(), name, items });
    save.playlists(); renderPlaylists(); $('#plName').value = '';
    toast(`Playlist "${name}" saved`, 'good');
  };
}

/* ---------------- library ---------------- */

let editId = null, formDuration = 0;

function resetLibForm() {
  editId = null; formDuration = 0;
  $('#libForm').reset();
  $('#libDate').value = new Date().toISOString().slice(0, 10);
  $('#libSave').textContent = 'Add to approved library';
  $('#libCancel').classList.add('hidden');
  $('#libInfo').textContent = '';
}

async function fetchInfo() {
  const vid = parseVideoId($('#libUrl').value);
  if (!vid) { toast('That is not a YouTube link', 'bad'); return; }
  const info = $('#libInfo');
  info.textContent = 'Looking up…';
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + vid)}`);
    if (r.ok) {
      const j = await r.json();
      if (!$('#libTitle').value) $('#libTitle').value = j.title || '';
      if (!$('#libArtist').value) $('#libArtist').value = j.author_name || '';
    }
  } catch { /* oEmbed blocked; the probe below still tries */ }
  if (!S.ytReady) { info.textContent = 'YouTube player not ready — length will be filled in on first play.'; return; }
  const p = await Probe.get(vid);
  if (p?.error) {
    info.innerHTML = '<span class="bad">⚠ This video will NOT play in the mixer (owner blocks embedding or it is private).</span>';
    return;
  }
  if (p?.duration) {
    formDuration = p.duration;
    if (!$('#libTitle').value && p.title) $('#libTitle').value = p.title;
    if (!$('#libArtist').value && p.author) $('#libArtist').value = p.author;
    info.textContent = `✓ Plays in embed · length ${fmt(p.duration)}`;
  } else info.textContent = 'Could not read length — it will fill in on first play.';
}

function saveLibForm(e) {
  e.preventDefault();
  const vid = parseVideoId($('#libUrl').value);
  if (!vid) { toast('That is not a YouTube link', 'bad'); return; }
  const fields = {
    videoId: vid,
    url: 'https://www.youtube.com/watch?v=' + vid,
    title: $('#libTitle').value.trim(),
    artist: $('#libArtist').value.trim(),
    license: $('#libLicense').value.trim(),
    approvedOn: $('#libDate').value,
    tags: $('#libTags').value.trim(),
    notes: $('#libNotes').value.trim()
  };
  let t = editId ? byId(editId) : byVid(vid);
  const dupe = byVid(vid);
  if (editId && dupe && dupe !== t) { toast('That link is already in the library', 'bad'); return; }
  if (t) {
    Object.assign(t, fields);
    if (formDuration) t.duration = formDuration;
    delete t.flag;
    toast('Library updated', 'good');
  } else {
    t = Object.assign({ id: uid(), addedAt: Date.now(), plays: 0, duration: formDuration || 0 }, fields);
    S.library.push(t);
    toast(`Added "${t.title || vid}" to approved library`, 'good');
    if (!t.duration && S.ytReady) Probe.get(vid).then(p => { if (p?.duration) { t.duration = p.duration; save.library(); renderLibrary(); renderQueue(); } });
  }
  save.library(); resetLibForm(); renderLibrary(); renderQueue();
  Object.values(decks).forEach(d => d.render());
}

function editTrack(t) {
  editId = t.id; formDuration = 0;
  $('#libUrl').value = t.url || t.videoId;
  $('#libTitle').value = t.title || '';
  $('#libArtist').value = t.artist || '';
  $('#libLicense').value = t.license || '';
  $('#libDate').value = t.approvedOn || '';
  $('#libTags').value = t.tags || '';
  $('#libNotes').value = t.notes || '';
  $('#libSave').textContent = 'Save changes';
  $('#libCancel').classList.remove('hidden');
  $('#libInfo').textContent = '';
  $('#libUrl').focus();
}

function renderLibrary() {
  const q = $('#libSearch').value.trim().toLowerCase();
  const rows = S.library
    .filter(t => !q || [t.title, t.artist, t.tags, t.license, t.notes].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  $('#libBody').innerHTML = rows.map(t => `<tr draggable="true" data-id="${t.id}">
      <td class="handle">⋮⋮</td>
      <td><div class="ttl"><b>${esc(t.title || t.videoId)}</b></div>
        <div class="dim">${esc(t.artist || 'Unknown creator')}${t.tags ? ' · ' + esc(t.tags) : ''}</div>
        ${t.flag ? `<div class="flag">⚠ ${esc(t.flag)}</div>` : ''}</td>
      <td class="dim">${t.duration ? fmt(t.duration) : '?:??'}</td>
      <td class="dim">${esc(t.license || '—')}${t.approvedOn ? `<br><small>${esc(t.approvedOn)}</small>` : ''}</td>
      <td class="dim">${t.plays || 0}</td>
      <td class="acts">
        <button type="button" data-l="A" class="la" title="Load to deck A">A</button>
        <button type="button" data-l="B" class="lb" title="Load to deck B">B</button>
        <button type="button" data-l="q" title="Add to queue">+Q</button>
        <button type="button" data-l="open" title="Open on YouTube">↗</button>
        <button type="button" data-l="edit" title="Edit">✎</button>
        <button type="button" data-l="del" title="Delete">✕</button>
      </td></tr>`).join('');
  $('#libCount').textContent = S.library.length;
}

function initLibraryUI() {
  resetLibForm();
  $('#libForm').addEventListener('submit', saveLibForm);
  $('#libFetch').onclick = fetchInfo;
  $('#libCancel').onclick = resetLibForm;
  $('#libSearch').addEventListener('input', renderLibrary);
  $('#libBody').addEventListener('click', e => {
    const b = e.target.closest('button[data-l]'); if (!b) return;
    const t = byId(b.closest('tr').dataset.id); if (!t) return;
    const a = b.dataset.l;
    if (a === 'A' || a === 'B') decks[a].load(t);
    else if (a === 'q') { addToQueue(t.id); toast(`Queued "${t.title || t.videoId}"`); }
    else if (a === 'open') window.open('https://www.youtube.com/watch?v=' + t.videoId, '_blank', 'noopener');
    else if (a === 'edit') editTrack(t);
    else if (a === 'del' && confirm(`Remove "${t.title || t.videoId}" from the approved library?`)) {
      S.library = S.library.filter(x => x !== t);
      S.queue = S.queue.filter(q => q.id !== t.id);
      save.library(); save.queue(); renderLibrary(); renderQueue();
    }
  });
  $('#libBody').addEventListener('dragstart', e => {
    const tr = e.target.closest('tr'); if (!tr) return;
    drag = { id: tr.dataset.id };
    e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', tr.dataset.id);
  });
  $('#libProbeAll').onclick = async () => {
    if (!S.ytReady) { toast('YouTube player not ready yet', 'bad'); return; }
    const missing = S.library.filter(t => !t.duration);
    if (!missing.length) { toast('All lengths are known', 'good'); return; }
    toast(`Looking up ${missing.length} track(s)…`);
    for (const t of missing) {
      const p = await Probe.get(t.videoId);
      if (p?.duration) t.duration = p.duration;
      else if (p?.error) t.flag = 'will not play in embed (error ' + p.error + ')';
      save.library(); renderLibrary(); renderQueue();
    }
    toast('Done', 'good');
  };
}

/* ---------------- playlists ---------------- */

function renderPlaylists() {
  $('#plList').innerHTML = S.playlists.map(p => {
    const tracks = p.items.map(byId).filter(Boolean);
    const len = tracks.reduce((s, t) => s + trackLen(t), 0);
    return `<li data-id="${p.id}"><div class="grow"><div class="ttl">${esc(p.name)}</div>
      <div class="sub">${tracks.length} tracks · ${fmt(len)}</div></div>
      <button type="button" data-p="load">Load</button><button type="button" data-p="append">Append</button>
      <button type="button" data-p="del" class="danger">✕</button></li>`;
  }).join('') || '<li class="dim">No playlists yet.</li>';
}

function initPlaylistsUI() {
  $('#plList').addEventListener('click', e => {
    const b = e.target.closest('button[data-p]'); if (!b) return;
    const p = S.playlists.find(x => x.id === b.closest('li').dataset.id); if (!p) return;
    const a = b.dataset.p;
    if (a === 'del') { if (confirm(`Delete playlist "${p.name}"?`)) { S.playlists = S.playlists.filter(x => x !== p); save.playlists(); renderPlaylists(); } return; }
    if (a === 'load') { if (S.queue.length && !confirm('Replace the current queue?')) return; S.queue = []; }
    p.items.filter(byId).forEach(id => S.queue.push({ qid: uid(), id }));
    save.queue(); renderQueue(); openTab('queue');
    toast(`Playlist "${p.name}" ${a === 'load' ? 'loaded' : 'appended'}`, 'good');
  });
}

/* ---------------- history ---------------- */

function renderHistory() {
  $('#histList').innerHTML = S.history.slice(0, 200).map(h => `<li>
    <span class="num">${h.deck}</span>
    <div class="grow"><div class="ttl">${esc(h.title || h.videoId)}</div><div class="sub">${esc(h.artist || '')} · ${esc(h.license || '')}</div></div>
    <span class="len">${new Date(h.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></li>`).join('')
    || '<li class="dim">Nothing played yet.</li>';
}

function initHistoryUI() {
  $('#credShow').onclick = () => buildCredits('show');
  $('#credToday').onclick = () => buildCredits('today');
  $('#credCopy').onclick = async () => {
    if (!$('#credits').value) buildCredits(S.creditsMode);
    try { await navigator.clipboard.writeText($('#credits').value); toast('Credits copied — paste into your YouTube description', 'good'); }
    catch { $('#credits').select(); toast('Press Ctrl+C to copy'); }
  };
  $('#histClear').onclick = () => { if (confirm('Clear the whole play log?')) { S.history = []; save.history(); renderHistory(); } };
}

/* ---------------- settings, backup, shortcuts ---------------- */

function renderKeys() {
  const base = `${location.origin}/api/cmd/`;
  const keyName = k => ({ ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc' }[k] || k?.toUpperCase());
  $('#keysBody').innerHTML = Object.entries(COMMANDS).map(([name, c]) => {
    const url = Remote.ok ? `${base}${name}?k=${Remote.key}` : '';
    return `<tr><td>${esc(c[0])}</td><td>${c[1] ? `<kbd>${esc(keyName(c[1]))}</kbd>` : '—'}</td>
      <td>${url ? `<code>${esc(url)}</code>` : '<span class="dim">start with the start script</span>'}</td>
      <td>${url ? `<button type="button" data-copy="${esc(url)}">Copy</button>` : ''}</td></tr>`;
  }).join('');
}

function exportData() {
  const data = { app: 'ivan-is-ivan-mixer', version: 1, exportedAt: new Date().toISOString(), library: S.library, playlists: S.playlists, history: S.history };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `ivan-mixer-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.library)) throw new Error('no library in file');
    const idMap = {};
    let added = 0;
    data.library.forEach(raw => {
      const vid = parseVideoId(raw?.videoId || raw?.url || '');
      if (!vid) return;
      const existing = byVid(vid);
      if (existing) { idMap[raw.id] = existing.id; return; }
      const t = {
        id: uid(), videoId: vid, url: 'https://www.youtube.com/watch?v=' + vid,
        title: String(raw.title || ''), artist: String(raw.artist || ''), license: String(raw.license || ''),
        approvedOn: String(raw.approvedOn || ''), tags: String(raw.tags || ''), notes: String(raw.notes || ''),
        duration: +raw.duration || 0, plays: +raw.plays || 0, addedAt: +raw.addedAt || Date.now()
      };
      if (+raw.inAt) t.inAt = +raw.inAt;
      if (+raw.outAt) t.outAt = +raw.outAt;
      if (Array.isArray(raw.cues)) t.cues = raw.cues.slice(0, 4).map(c => (c == null ? null : +c));
      S.library.push(t); idMap[raw.id] = t.id; added++;
    });
    let pls = 0;
    (data.playlists || []).forEach(p => {
      if (!p?.name || !Array.isArray(p.items)) return;
      const items = p.items.map(i => idMap[i]).filter(Boolean);
      if (S.playlists.some(x => x.name === p.name)) return;
      S.playlists.push({ id: uid(), name: String(p.name), items }); pls++;
    });
    save.library(); save.playlists(); renderLibrary(); renderPlaylists(); renderQueue();
    toast(`Imported ${added} new track(s) and ${pls} playlist(s)`, 'good');
  } catch (e) { toast('Import failed: ' + e.message, 'bad'); }
}

function initSettingsUI() {
  $('#warnSec').value = S.cfg.warnSec;
  $('#deadAirMode').value = S.cfg.deadAirMode;
  $('#approvedOnly').checked = S.cfg.approvedOnly;
  $('#warnSec').onchange = e => { S.cfg.warnSec = clamp(+e.target.value || 30, 5, 120); save.cfg(); };
  $('#deadAirMode').onchange = e => { S.cfg.deadAirMode = e.target.value; save.cfg(); };
  $('#approvedOnly').onchange = e => { S.cfg.approvedOnly = e.target.checked; save.cfg(); };
  $('#exportBtn').onclick = exportData;
  $('#importFile').onchange = e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; };
  $('#keysBody').addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('URL copied', 'good'); } catch { toast('Copy failed — select the text instead', 'bad'); }
  });
}

/* ---------------- mixer UI ---------------- */

function renderMeters() {
  const set = (sel, d) => { $(sel).style.height = (d && d.isPlaying() ? d.out * 100 : 0) + '%'; };
  set('#meterA i', decks.A); set('#meterB i', decks.B);
  const m = Math.max(decks.A.isPlaying() ? decks.A.out : 0, decks.B.isPlaying() ? decks.B.out : 0);
  $('#meterM i').style.height = m * 100 + '%';
  $('#volAVal').textContent = S.cfg.volA;
  $('#volBVal').textContent = S.cfg.volB;
  $('#masterVal').textContent = S.cfg.master;
}

function initMixerUI() {
  $('#volA').value = S.cfg.volA; $('#volB').value = S.cfg.volB; $('#master').value = S.cfg.master;
  $('#fadeSec').value = S.cfg.fadeSec; $('#curve').value = S.cfg.curve;
  $('#duckLevel').value = S.cfg.duckLevel; $('#duckVal').textContent = S.cfg.duckLevel + '%';
  $('#voiceThresh').value = S.cfg.voiceThresh; $('#micThreshMark').style.left = S.cfg.voiceThresh + '%';

  $('#volA').oninput = e => setDeckVol('A', +e.target.value);
  $('#volB').oninput = e => setDeckVol('B', +e.target.value);
  $('#master').oninput = e => setMaster(+e.target.value);
  $('#xfader').oninput = e => setXf(+e.target.value / 1000);
  $('#curve').onchange = e => { S.cfg.curve = e.target.value; save.cfg(); applyVolumes(); };
  $('#fadeSec').onchange = e => { S.cfg.fadeSec = clamp(+e.target.value || 0, 0, 30); e.target.value = S.cfg.fadeSec; save.cfg(); };
  $$('.xf-snap button').forEach(b => { b.onclick = () => setXf(+b.dataset.xf); });
  $('#mixNow').onclick = mixNow;
  $('#autoDJ').onclick = () => setAutoDJ(!S.autoDJ);
  $('#talk').onclick = () => setTalk(!S.talk);
  $('#onair').onclick = toggleOnAir;
  $('#panic').onclick = panic;
  $('#duckLevel').oninput = e => {
    S.cfg.duckLevel = +e.target.value; $('#duckVal').textContent = S.cfg.duckLevel + '%'; save.cfg();
    S.duckTarget = null; updateDuck();
  };
  $('#voiceThresh').oninput = e => { S.cfg.voiceThresh = +e.target.value; $('#micThreshMark').style.left = S.cfg.voiceThresh + '%'; save.cfg(); };
  $('#voiceDuck').onchange = e => (e.target.checked ? Voice.start() : Voice.stop());
}

/* ---------------- tabs ---------------- */

function openTab(name) {
  $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab-body').forEach(b => b.classList.toggle('hidden', b.dataset.body !== name));
}

/* ---------------- main loop ---------------- */

function renderAll() { Object.values(decks).forEach(d => d.render()); renderMeters(); }

function deadAirCheck() {
  const mode = S.cfg.deadAirMode;
  const armed = S.onAir && (mode === 'always' || (mode === 'autodj' && S.autoDJ));
  const audible = Object.values(decks).some(d => d.isPlaying() && d.out > 0.02);
  if (armed && !audible) { if (!S.deadSince) S.deadSince = Date.now(); } else S.deadSince = 0;
  $('#deadAir').classList.toggle('hidden', !(S.deadSince && Date.now() - S.deadSince > 2500));
}

let tickN = 0;
function tick() {
  tickN++;
  Object.values(decks).forEach(d => d.tick());
  autoTick();
  Voice.tick();
  if (tickN % 2 === 0) Remote.poll();
  renderAll();
  deadAirCheck();
  if (tickN % 10 === 0) {
    $('#clock').textContent = new Date().toLocaleTimeString([], { hour12: false });
    if (S.onAir) $('#showTimer').textContent = fmtClock((Date.now() - S.onAirAt) / 1000);
    updateQueueEtas();
  }
}

/* ---------------- boot ---------------- */

window.onYouTubeIframeAPIReady = () => {
  S.ytReady = true;
  decks.A.create(); decks.B.create(); Probe.init();
  const pill = $('#ytStatus'); pill.textContent = 'YouTube: ready'; pill.className = 'pill ok';
};

function boot() {
  decks.A = new Deck('A', $('#mountA'));
  decks.B = new Deck('B', $('#mountB'));
  initMixerUI(); initQueueUI(); initLibraryUI(); initPlaylistsUI(); initHistoryUI(); initSettingsUI();
  $$('.tabs button').forEach(b => { b.onclick = () => openTab(b.dataset.tab); });
  renderQueue(); renderLibrary(); renderPlaylists(); renderHistory(); renderKeys(); syncXfUI(); applyVolumes();
  Remote.init();

  if (location.protocol === 'file:') $('#fileWarn').classList.remove('hidden');
  $('#power').onclick = () => $('#splash').classList.add('hidden');

  setTimeout(() => {
    if (!S.ytReady) { const p = $('#ytStatus'); p.textContent = 'YouTube: not loading — check internet'; p.className = 'pill bad'; }
  }, 10000);

  window.addEventListener('beforeunload', e => {
    if (decks.A.isPlaying() || decks.B.isPlaying() || S.onAir) { e.preventDefault(); e.returnValue = ''; }
  });

  setInterval(tick, 100);
}

boot();

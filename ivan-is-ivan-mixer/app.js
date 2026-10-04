/* Ivan is Ivan — Live Mixer (v2)
 * Two-deck YouTube mixer for live shows. Runs locally in Chrome.
 * No tracking, no accounts. Data lives in this browser and in the app's data folder.
 */
'use strict';

// Privacy-enhanced YouTube host for the players.
// Version of this app (keep in step with the VERSION file and CHANGELOG.md) and of the saved-data format.
const APP_VERSION = '2.5.0';
const DATA_VERSION = 2;

const YT_HOST = 'https://www.youtube-nocookie.com';
const DEFAULT_COLORS = ['#22d3ee', '#ff7a3d', '#a78bfa', '#2ee59d', '#ffd23f', '#f472b6'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const safeColor = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#8a95a8');
const thumb = vid => `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;
const today = () => new Date().toISOString().slice(0, 10);
// Only YouTube-hosted pictures or pictures you uploaded (stored inside the app) are ever shown.
const safeImg = u => (/^https:\/\/(yt3\.ggpht\.com|yt3\.googleusercontent\.com|i\.ytimg\.com)\/[\w\-./=~%?&]+$/.test(u || '') ||
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u || '')) ? u : '';
const NO_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#1a202a"/><path d="M6.5 2.5v4l3.5-2z" fill="#4a5568"/></svg>');

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

// true when version a (e.g. "2.10.0") is newer than b ("2.9.1")
function newerVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
}

function renderVersion() {
  $$('[data-ver]').forEach(e => { e.textContent = 'v' + APP_VERSION; });
  const about = $('#aboutVer');
  if (about) about.innerHTML = `App <b>v${APP_VERSION}</b> · data format <b>${DATA_VERSION}</b> · server <b>${S.serverVersion ? 'v' + esc(S.serverVersion) : 'not running'}</b>`;
}

function ago(ts) {
  const m = (Date.now() - ts) / 60000;
  if (m < 1) return 'just now';
  if (m < 60) return Math.round(m) + ' min ago';
  if (m < 48 * 60) return Math.round(m / 60) + ' h ago';
  return Math.round(m / 1440) + ' days ago';
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
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Could not save in Chrome — the disk copy still works', 'bad'); }
    Disk.schedule();
  }
};

const S = {
  library: store.get('iii.library', []),     // approved tracks
  queue: store.get('iii.queue', []),         // [{qid, id}]
  playlists: store.get('iii.playlists', []), // [{id, name, items:[trackId]}]
  history: store.get('iii.history', []),     // play log, newest first
  creators: store.get('iii.creators', []),   // [{id, name, channelId, color}]
  inbox: store.get('iii.inbox', []),         // new uploads waiting for approval
  ignored: store.get('iii.ignored', []),     // video IDs dismissed from the inbox
  cfg: Object.assign({
    fadeSec: 8, curve: 'smooth', master: 90, duckLevel: 25, approvedOnly: true,
    warnSec: 30, volA: 80, volB: 80, voiceThresh: 35, deadAirMode: 'autodj',
    snapBars: true, smartFill: true
  }, store.get('iii.settings', {})),
  xf: 0,              // crossfader 0 = A, 1 = B
  duckGain: 1, duckTarget: 1, panicGain: 1,
  talk: false, voiceTalk: false,
  autoDJ: false, onAir: false, onAirAt: 0, stage: false,
  transitioning: false, mixTarget: null, deadSince: 0, ytReady: false,
  creditsMode: 'show', smartSeed: 7,
  skip: new Set(),    // songs you said 'Not now' to this show
  lastAuto: false     // was the last song taken from the queue a Smart DJ pick?
};

const KEYS = {
  library: 'iii.library', queue: 'iii.queue', playlists: 'iii.playlists', history: 'iii.history',
  creators: 'iii.creators', inbox: 'iii.inbox', ignored: 'iii.ignored', cfg: 'iii.settings'
};
const save = {};
Object.entries(KEYS).forEach(([name, key]) => { save[name] = () => store.set(key, S[name]); });

/* Disk copy: the local server writes everything to data/mixer-data.json (+ a daily backup),
   so clearing Chrome's data can never wipe the library. */
const Disk = {
  ok: false, key: null, timer: null,
  schedule() { if (!this.ok) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 1500); },
  snapshot() {
    const o = { app: 'ivan-is-ivan-mixer', version: DATA_VERSION, appVersion: APP_VERSION, savedAt: new Date().toISOString() };
    Object.keys(KEYS).forEach(k => { o[k] = S[k]; });
    return o;
  },
  pill(ok, text) { const p = $('#diskStatus'); p.textContent = text; p.className = 'pill ' + (ok ? 'ok' : 'bad'); },
  async push() {
    try {
      const r = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Key': this.key }, body: JSON.stringify(this.snapshot()) });
      if (!r.ok) throw new Error(r.status);
      this.pill(true, 'Disk: saved ✓');
    } catch { this.pill(false, 'Disk: NOT saved'); }
  },
  async restoreIfEmpty() {
    if (S.library.length) return false;
    try {
      const r = await fetch('/api/load', { cache: 'no-store' });
      if (!r.ok) return false;
      const d = await r.json();
      if (!Array.isArray(d.library) || !d.library.length) return false;
      Object.keys(KEYS).forEach(k => {
        if (k === 'cfg') { if (d.cfg && typeof d.cfg === 'object') Object.assign(S.cfg, d.cfg); }
        else if (Array.isArray(d[k])) S[k] = d[k];
        save[k]();
      });
      toast(`Restored ${S.library.length} tracks from the disk copy (saved by v${d.appVersion || '2.4 or older'})`, 'good');
      if (d.appVersion && newerVersion(d.appVersion, APP_VERSION)) toast(`Careful: this data was saved by a newer mixer (v${d.appVersion}). You are running v${APP_VERSION}.`, 'bad');
      return true;
    } catch { return false; }
  }
};

const byId = id => S.library.find(t => t.id === id);
const byVid = vid => S.library.find(t => t.videoId === vid);
const inLib = t => !!t && S.library.includes(t);
const creatorById = id => S.creators.find(c => c.id === id);
function creatorOf(t) {
  if (!t) return null;
  return creatorById(t.creatorId) ||
    (t.artist ? S.creators.find(c => c.name.toLowerCase() === String(t.artist).toLowerCase()) : null) || null;
}
const artistOf = t => creatorOf(t)?.name || t?.artist || 'Unknown creator';
const avatarOf = c => safeImg(c?.avatar);
const trackLen = t => Math.max(0, (t.outAt || t.duration || 0) - (t.inAt || 0));

/* ---------------- toasts, confirm modal, tooltips ---------------- */

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  const box = $('#toasts');
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove(); // never bury the controls
  setTimeout(() => el.classList.add('out'), 3800);
  setTimeout(() => el.remove(), 4300);
}

// Non-blocking confirm. The browser's confirm() pauses the page, which would freeze fades on air.
let modalDone = null;
function ask(msg, okLabel = 'Yes') {
  if (modalDone) modalDone(false);
  return new Promise(res => {
    $('#modalMsg').textContent = msg;
    $('#modalOk').textContent = okLabel;
    $('#modal').classList.remove('hidden');
    modalDone = v => { $('#modal').classList.add('hidden'); modalDone = null; res(v); };
    $('#modalOk').focus();
  });
}

function keyName(k) {
  return ({ ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc' }[k] || (k ? k.toUpperCase() : ''));
}

// Hover help: every control with a title gets a styled tooltip that also shows its shortcut key.
const Tip = {
  el: null, timer: null, cur: null,
  init() {
    this.el = $('#tip');
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[title], [data-tip]');
      if (t === this.cur) return;
      this.hide();
      if (!t || S.stage) return;
      if (t.hasAttribute('title')) { t.dataset.tip = t.getAttribute('title'); t.removeAttribute('title'); }
      if (!t.dataset.tip) return;
      this.cur = t;
      this.timer = setTimeout(() => this.show(t), 350);
    });
    document.addEventListener('mousedown', () => this.hide());
    document.addEventListener('scroll', () => this.hide(), true);
  },
  keyFor(t) {
    let cmd = t.dataset.cmd;
    const deck = t.closest('.deck');
    if (!cmd && deck && ['play', 'cue', 'next', 'tap'].includes(t.dataset.a)) cmd = t.dataset.a + (deck.classList.contains('deck-a') ? 'A' : 'B');
    const k = cmd && COMMANDS[cmd] ? COMMANDS[cmd][1] : null;
    return k ? keyName(k) : '';
  },
  show(t) {
    if (!t.isConnected) return;
    const k = this.keyFor(t);
    this.el.innerHTML = esc(t.dataset.tip) + (k ? ` <kbd>${esc(k)}</kbd>` : '');
    this.el.classList.remove('hidden');
    const r = t.getBoundingClientRect(), w = this.el.offsetWidth, h = this.el.offsetHeight;
    let y = r.bottom + 8;
    if (y + h > innerHeight - 8) y = r.top - h - 8;
    this.el.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px';
    this.el.style.top = Math.max(8, y) + 'px';
  },
  hide() { clearTimeout(this.timer); this.cur = null; this.el?.classList.add('hidden'); }
};

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
    this.cuePoint = 0; this.loopIn = null; this.loop = null; this.markSig = ''; this.thumbVid = undefined;
    this.taps = [];
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
    this.el.addEventListener('dragover', e => { if (drag || linkDrag(e)) { e.preventDefault(); this.el.classList.add('drop'); } });
    this.el.addEventListener('dragleave', e => { if (!this.el.contains(e.relatedTarget)) this.el.classList.remove('drop'); });
    this.el.addEventListener('drop', e => {
      e.preventDefault(); this.el.classList.remove('drop');
      if (!drag) {
        // A YouTube link dragged in from another tab or page: first song to this deck, the rest to the queue.
        const tracks = ingestLinks(droppedText(e));
        if (!tracks.length) return;
        this.userLoad(tracks[0]);
        tracks.slice(1).forEach(t => addToQueue(t.id));
        return;
      }
      const { id, qid } = drag; drag = null;
      this.userLoad(byId(id)).then(ok => { if (ok && qid) removeFromQueue(qid); });
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

  onAirNow() { return this.isPlaying() && this.out > 0.05; }

  // Loads chosen by a person: asks first if this deck is audible on air.
  async userLoad(track) {
    if (!track) return false;
    if (this.onAirNow() && !(await ask(`Deck ${this.id} is ON AIR playing "${this.track.title || this.track.videoId}". Replace it?`, 'Replace'))) return false;
    this.load(track);
    return true;
  }

  load(track, autoplay = false, auto = false) {
    if (!track) return;
    this.track = track;
    this.autoPicked = auto;
    this.played = false; this.finished = false; this.errored = false;
    this.loop = null; this.loopIn = null; this.taps = [];
    this.dur = track.duration || 0;
    this.cuePoint = track.inAt || 0;
    this.time = this.cuePoint;
    this.wantPlay = autoplay;
    this.ytState = -1;
    if (this.ready) this.cueCurrent(autoplay);
    this.r.url.value = '';
    this.render();
    renderSmart();
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

  /* --- beats & tempo --- */

  act_tap() {
    if (!this.track) return;
    const now = performance.now();
    if (this.taps.length && now - this.taps[this.taps.length - 1] > 2000) this.taps = [];
    this.taps.push(now);
    if (this.taps.length > 12) this.taps.shift();
    if (this.taps.length >= 4) {
      const iv = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
      this.track.bpm = Math.round((60000 / iv) * 10) / 10;
      if (this.track.beat1 == null && this.isPlaying()) this.track.beat1 = Math.round(this.time * 1000) / 1000;
      this.persist();
    }
    this.r.tapBtn.classList.add('hit');
    setTimeout(() => this.r.tapBtn.classList.remove('hit'), 90);
    this.render();
  }
  act_grid() {
    if (!this.track) return;
    this.track.beat1 = Math.round(this.time * 1000) / 1000;
    this.persist();
    toast(this.track.bpm ? `Deck ${this.id}: downbeat marked — bar counter synced` : `Deck ${this.id}: downbeat marked. Now TAP the tempo.`);
    this.render();
  }
  act_half() { if (this.track?.bpm) { this.track.bpm = Math.round(this.track.bpm * 5) / 10; this.persist(); } }
  act_dbl() { if (this.track?.bpm) { this.track.bpm = Math.round(this.track.bpm * 20) / 10; this.persist(); } }

  // Beat position, or null if tempo/downbeat unknown.
  beat() {
    const t = this.track;
    if (!t?.bpm || t.beat1 == null) return null;
    const beatLen = 60 / t.bpm;
    const b = (this.time - t.beat1) / beatLen;
    const i = Math.floor(b);
    return { beatLen, frac: b - i, inBar: ((i % 4) + 4) % 4, bar: Math.floor(i / 4) + 1, barsLeft: Math.floor(this.remaining() / (beatLen * 4)) };
  }

  /* --- loops --- */

  act_loopIn() { if (!this.track) return; this.loopIn = this.time; this.loop = null; this.render(); }
  act_loopOut() {
    if (this.loopIn == null || this.time <= this.loopIn + 0.5) { toast('Press loop IN first, then OUT a moment later'); return; }
    this.loop = [this.loopIn, this.time]; this.seek(this.loopIn);
  }
  act_loopBars() {
    if (!this.track) return;
    if (this.loop) { this.loop = null; this.render(); return; }
    const t = this.track;
    let start = this.time, len = 8;
    if (t.bpm) {
      const bl = 60 / t.bpm;
      len = bl * 16;
      if (t.beat1 != null) start = t.beat1 + Math.round((this.time - t.beat1) / bl) * bl; // snap to nearest beat
    }
    this.loopIn = start; this.loop = [start, start + len]; this.render();
  }
  act_loopExit() { this.loop = null; this.render(); }

  /* --- trim --- */

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

  /* --- loading --- */

  act_load() {
    const raw = this.r.url.value.trim();
    if (!raw) { this.r.url.focus(); return; }
    const vid = parseVideoId(raw);
    if (!vid) { toast('That is not a YouTube link', 'bad'); return; }
    let t = byVid(vid);
    if (!t) {
      if (S.cfg.approvedOnly) {
        ask('This song is not in your approved library yet. Add it (you have the creator\'s permission) and load it?', 'Add & load')
          .then(ok => { if (ok) { const [nt] = ingestLinks('https://youtu.be/' + vid); if (nt) this.userLoad(nt); } });
        return;
      }
      t = { id: 'tmp-' + vid, videoId: vid, title: '', artist: '', license: 'NOT IN LIBRARY' };
    }
    this.userLoad(t);
  }
  async act_next() {
    if (!S.queue.length) { toast('Queue is empty — try Smart Next'); return; }
    if (this.onAirNow() && !(await ask(`Deck ${this.id} is ON AIR. Replace it with the next queued song?`, 'Replace'))) return;
    const t = dequeue();
    if (t) this.load(t);
  }

  hotcue(i, clear) {
    if (!this.track) return;
    const c = this.track.cues || (this.track.cues = [null, null, null, null]);
    if (clear) { c[i] = null; }
    else if (c[i] == null) { c[i] = Math.round(this.time * 10) / 10; toast(`Deck ${this.id}: hot cue ${i + 1} set at ${fmt(c[i])}`); }
    else { this.seek(c[i]); if (!this.isPlaying()) this.play(); }
    this.persist(); this.render();
  }

  /* --- player events --- */

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
    const c = creatorOf(t);
    this.el.style.setProperty('--cc', c ? safeColor(c.color) : 'transparent');
    r.title.textContent = t ? (t.title || t.videoId) : '— Empty —';
    r.artist.textContent = t ? `${artistOf(t)}${t.license ? ' · ' + t.license : ''}` : 'Drag a track here or paste an approved link';
    if ((t?.videoId || null) !== this.thumbVid) {
      this.thumbVid = t?.videoId || null;
      r.thumb.src = this.thumbVid ? thumb(this.thumbVid) : '';
      r.platter.classList.toggle('empty', !this.thumbVid);
    }
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

    // beats
    const b = this.beat();
    r.bpm.textContent = t?.bpm ? `${t.bpm.toFixed(1)} BPM` : '— BPM';
    r.barpos.textContent = b ? `BAR ${b.bar}.${b.inBar + 1} · ${b.barsLeft} bars left` : (t?.bpm ? 'press GRID on a "1"' : (t ? 'TAP to set tempo' : ''));
    const lights = r.lights.children;
    for (let i = 0; i < 4; i++) lights[i].classList.toggle('on', !!(b && playing && b.inBar === i && b.frac < 0.4));
    this.el.classList.toggle('beat', !!(b && playing && b.frac < 0.18));
    r.loopBtn.textContent = this.loop ? 'LOOPING' : (t?.bpm ? '4 BAR' : '8 s');

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
    else if (playing && S.autoDJ && live && nextReady) msg = `AUTO MIX TO ${o.id} IN ${fmt(Math.max(0, rem - S.cfg.fadeSec))}${S.cfg.snapBars && b ? ' · ON THE BAR' : ''}`;
    else if (playing && S.autoDJ && live) msg = S.queue.length || S.cfg.smartFill ? `AUTO DJ: NEXT SONG LOADING ON DECK ${o.id}` : 'AUTO DJ: QUEUE EMPTY — ADD MUSIC';
    else if (S.autoDJ && !live && t && !this.played && !this.errored && !playing) msg = `NEXT UP${this.autoPicked ? ' · SMART DJ PICK' : ' · YOUR PICK'} — load or drop a song here to change it`;
    else if (warn) msg = nextReady ? `ENDING — NEXT ON ${o.id}: ${o.track.title || o.track.videoId}` : `ENDING — NOTHING CUED ON DECK ${o.id}`;
    r.mixout.textContent = msg;

    // markers only rebuild when they change
    const cues = t?.cues || [];
    const sig = [this.dur, t?.inAt, t?.outAt, this.cuePoint, this.loop?.join(), cues.join(), t?.bpm, t?.beat1].join('|');
    if (sig !== this.markSig) {
      this.markSig = sig;
      let h = '';
      if (this.dur) {
        const at = s => (clamp(s / this.dur, 0, 1) * 100).toFixed(2) + '%';
        // bar grid: one faint line every 4 bars (16 beats)
        if (t?.bpm && t.beat1 != null) {
          const step = (60 / t.bpm) * 16;
          let first = t.beat1 - Math.floor(t.beat1 / step) * step;
          for (let s = first, n = 0; s < this.dur && n < 400; s += step, n++) h += `<div class="mk grid" style="left:${at(s)}"></div>`;
        }
        if (this.loop) h += `<div class="mk loop" style="left:${at(this.loop[0])};width:calc(${at(this.loop[1])} - ${at(this.loop[0])})"></div>`;
        if (this.cuePoint) h += `<div class="mk cue" style="left:${at(this.cuePoint)}"></div>`;
        if (t?.inAt) h += `<div class="mk in" style="left:${at(t.inAt)}"><span>S</span></div>`;
        if (t?.outAt) h += `<div class="mk out" style="left:${at(t.outAt)}"><span>OUT</span></div>`;
        cues.forEach((c2, i) => { if (c2 != null) h += `<div class="mk hc" style="left:${at(c2)}"><span>${i + 1}</span></div>`; });
      }
      r.markers.innerHTML = h;
      $$('[data-hc]', this.el).forEach(btn => btn.classList.toggle('set', cues[+btn.dataset.hc] != null));
    }
    r.loopBtn.classList.toggle('active', !!this.loop);
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

function probeLength(t) {
  if (!S.ytReady || t.duration) return;
  Probe.get(t.videoId).then(p => {
    if (p?.duration) {
      t.duration = p.duration;
      if (!t.title && p.title) t.title = p.title;
      if (!creatorOf(t) && p.author) {
        const c = matchCreator(p.author);
        if (c) { t.creatorId = c.id; t.artist = c.name; } else if (!t.artist) t.artist = p.author;
      }
    } else if (p?.error) t.flag = 'will not play in embed (error ' + p.error + ')';
    save.library(); renderLibrary(); renderQueue();
  });
}

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
    S.lastAuto = !!q.auto;
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
    if (!S.queue.length && S.cfg.smartFill) smartFillOne();
    const t = dequeue();
    if (!t) { toast('Auto DJ: queue is empty', 'bad'); return; }
    n.load(t, true, S.lastAuto);
  } else n.play();
  setXf(n.id === 'A' ? 0 : 1);
}

function autoTick() {
  if (!S.autoDJ) return;
  const live = liveDeck(), next = other(live);
  // Pre-load the next song onto the idle deck.
  if (!S.transitioning && !next.isPlaying() && (!next.track || next.played || next.errored)) {
    if (!S.queue.length && S.cfg.smartFill) smartFillOne();
    if (S.queue.length) { const t = dequeue(); if (t) next.load(t, false, S.lastAuto); }
  }
  if (S.transitioning) return;
  if (live.isPlaying() && live.dur > 0 && next.ready && next.track && !next.played && !next.errored) {
    const rem = live.remaining();
    const b = S.cfg.snapBars ? live.beat() : null;
    const barLen = b ? b.beatLen * 4 : 0;
    if (rem <= S.cfg.fadeSec + barLen + 0.25) {
      // On the bar: wait for the start of the next bar, unless time is running out.
      if (b && rem > S.cfg.fadeSec * 0.5 + 0.5) {
        const intoBar = (b.inBar + b.frac) * b.beatLen;
        if (intoBar > 0.15) return;
      }
      mixTo(next, Math.min(S.cfg.fadeSec, rem));
    }
  }
}

function setAutoDJ(on) {
  S.autoDJ = on;
  $('#autoDJ').classList.toggle('on', on);
  if (on) {
    const live = liveDeck();
    if (!live.isPlaying() && !other(live).isPlaying()) {
      if (!live.track || live.finished || live.errored) {
        if (!S.queue.length && S.cfg.smartFill) smartFillOne();
        const t = dequeue();
        if (t) live.load(t, true, S.lastAuto); else toast('Queue is empty — add approved tracks first', 'bad');
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
  if (S.onAir) { S.onAirAt = Date.now(); S.skip.clear(); }
  $('#onair').classList.toggle('on', S.onAir);
  renderCreators(); renderSmart();
}

function setMaster(v) { S.cfg.master = clamp(Math.round(v), 0, 100); $('#master').value = S.cfg.master; save.cfg(); applyVolumes(); }
function setDeckVol(id, v) { S.cfg['vol' + id] = clamp(Math.round(v), 0, 100); $('#vol' + id).value = S.cfg['vol' + id]; save.cfg(); applyVolumes(); }

/* ---------------- Smart Next: fair creator rotation, tempo, energy, new releases ---------------- */

// Start of the current show (ON AIR), or the last 3 hours.
const showStart = () => S.onAirAt || (Date.now() - 3 * 3600e3);

// Each writer's target share of music airtime. Shares are relative (40/20/20/20 = 40%, 20%, …).
const shareOf = c => clamp(Math.round(+c.share || 25), 1, 100);
function targetShare(c) {
  const sum = S.creators.reduce((s, x) => s + shareOf(x), 0) || 1;
  return shareOf(c) / sum;
}

// Airtime per creator this show: { creatorId: {plays, secs, lastAt} }
function airStats() {
  const since = showStart(), st = {};
  for (const h of S.history) {
    if (h.at < since) break;
    const t = byVid(h.videoId);
    const c = creatorOf(t) || creatorById(h.creatorId);
    if (!c) continue;
    const s = st[c.id] || (st[c.id] = { plays: 0, secs: 0, lastAt: 0 });
    s.plays++; s.secs += (t && trackLen(t)) || 180; // unknown length counts as 3 min s.lastAt = Math.max(s.lastAt, h.at);
  }
  return st;
}

function jitter(vid) {
  let h = S.smartSeed;
  for (const ch of vid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 250; // 0..4
}

function suggest(n = 3, { creatorId = null } = {}) {
  const since = showStart();
  const playedNow = new Set(S.history.filter(h => h.at >= since).map(h => h.videoId));
  const busy = new Set([decks.A?.track?.id, decks.B?.track?.id, ...S.queue.map(q => q.id)]);
  const live = liveDeck();
  const ref = (live?.isPlaying() ? live.track : null) || other(live)?.track || live?.track || null;
  // Count what has aired AND what is already lined up (decks + queue), so picks keep rotating.
  const st = airStats();
  const planned = [...[decks.A, decks.B].filter(d => d?.track && !d.played).map(d => d.track), ...S.queue.map(q => byId(q.id)).filter(Boolean)];
  for (const t of planned) {
    const c = creatorOf(t); if (!c) continue;
    const x = st[c.id] || (st[c.id] = { plays: 0, secs: 0, lastAt: 0 });
    x.secs += trackLen(t) || 180;
  }
  const lastT = planned.length ? planned[planned.length - 1] : byVid(S.history[0]?.videoId);
  const lastCreator = (creatorOf(lastT) || creatorById(S.history[0]?.creatorId))?.id || null;
  const total = Object.values(st).reduce((a, x) => a + x.secs, 0);
  const pct = v => Math.round(v * 100) + '%';
  return S.library
    .filter(t => !t.flag && !t.noAuto && !S.skip.has(t.videoId) && !busy.has(t.id) && (!creatorId || creatorOf(t)?.id === creatorId))
    .map(t => {
      let score = jitter(t.videoId);
      const why = [];
      if (playedNow.has(t.videoId)) score -= 100;
      const c = creatorOf(t);
      if (c && S.creators.length > 1 && !creatorId) {
        // Whoever is furthest below their target share goes first.
        const tgt = targetShare(c);
        const act = total ? (st[c.id]?.secs || 0) / total : 0;
        score += (tgt - act) * 80;
        if (!st[c.id]) why.push(`${c.name} hasn't aired yet`);
        else if (tgt - act > 0.05) why.push(`${c.name} behind: ${pct(act)} of ${pct(tgt)}`);
        if (c.id === lastCreator) score -= 15 * (1 - tgt); // big shares may run back-to-back
      }
      if (t.isNew) { score += 18; why.push('NEW release'); }
      if (ref?.bpm && t.bpm && ref !== t) {
        const d = Math.min(...[1, 2, 0.5].map(k => Math.abs(t.bpm * k - ref.bpm) / ref.bpm * 100));
        if (d <= 3) { score += 14; why.push(`tempo match ${Math.round(t.bpm)} BPM`); }
        else if (d <= 8) { score += 7; why.push(`close tempo ${Math.round(t.bpm)} BPM`); }
        else score -= 3;
      }
      if (ref?.energy && t.energy) {
        const de = t.energy - ref.energy;
        if (Math.abs(de) <= 1) { score += 5; why.push(de > 0 ? 'energy up' : de < 0 ? 'energy down' : 'same energy'); }
        else score -= 4;
      }
      if (!t.plays && !t.isNew) { score += 4; why.push('never played'); }
      if (playedNow.has(t.videoId)) why.unshift('already played this show');
      if (!why.length) why.push('fresh pick');
      return { t, score, why };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

function smartFillOne() {
  const s = suggest(1)[0];
  if (!s || s.score < -50) return false;
  addToQueue(s.t.id, S.queue.length, true);
  toast(`Smart DJ queued "${s.t.title || s.t.videoId}" — ${s.why[0]}`);
  return true;
}

function renderSmart() {
  const box = $('#smart');
  if (!box || !decks.B) return;
  const picks = suggest(3);
  box.innerHTML = picks.map(({ t, why }) => {
    const c = creatorOf(t);
    return `<div class="sm-card" data-id="${t.id}" style="--cc:${safeColor(c?.color)}" draggable="true">
      <img class="th" src="${thumb(t.videoId)}" alt="" loading="lazy">
      <div class="sm-body">
        <div class="ttl">${esc(t.title || t.videoId)}</div>
        <div class="sub"><i class="dot"></i>${esc(artistOf(t))} · ${t.duration ? fmt(trackLen(t)) : '?:??'}${t.bpm ? ' · ' + Math.round(t.bpm) + ' BPM' : ''}</div>
        <div class="chips">${why.slice(0, 3).map(w => `<span class="chip">${esc(w)}</span>`).join('')}</div>
      </div>
      <div class="sm-acts">
        <button type="button" data-s="q" title="Add to the end of the queue">+ Queue</button>
        <button type="button" data-s="top" title="Play this next (top of the queue)">Next</button>
        <button type="button" data-s="A" class="la" title="Load onto deck A">A</button>
        <button type="button" data-s="B" class="lb" title="Load onto deck B">B</button>
        <button type="button" data-s="skip" class="skip" title="Not now: never suggest this song again during this show">Not now</button>
      </div>
    </div>`;
  }).join('') || '<div class="dim smart-empty">Add songs to your library to get suggestions.</div>';
}

function initSmartUI() {
  $('#smart').addEventListener('click', e => {
    const b = e.target.closest('button[data-s]'); if (!b) return;
    const t = byId(b.closest('.sm-card').dataset.id); if (!t) return;
    const a = b.dataset.s;
    if (a === 'q') addToQueue(t.id);
    else if (a === 'top') addToQueue(t.id, 0);
    else if (a === 'skip') { S.skip.add(t.videoId); renderSmart(); }
    else decks[a].userLoad(t);
  });
  $('#smart').addEventListener('dragstart', e => {
    const card = e.target.closest('.sm-card'); if (!card) return;
    drag = { id: card.dataset.id };
    e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', card.dataset.id);
  });
  $('#smartReroll').onclick = () => { S.smartSeed = (S.smartSeed * 7 + 13) % 100003; renderSmart(); };
}

/* ---------------- creators & new-upload alerts ---------------- */

const Creators = {
  // Returns { channelId, avatar } from a channel link, @handle or channel ID.
  async resolve(input) {
    input = (input || '').trim();
    if (!input) return { channelId: '', avatar: '' };
    let m = input.match(/(UC[\w-]{22})/);
    const id = m ? m[1] : null;
    m = input.match(/@([\w.\-]{3,30})/);
    const handle = id ? null : (m ? m[1] : (/^[\w.\-]{3,30}$/.test(input) ? input : null));
    if (!id && !handle) throw new Error('Use a channel link, @handle or channel ID (UC…)');
    if (!Remote.ok) {
      if (id) return { channelId: id, avatar: '' };
      throw new Error('Start the mixer with the start script to look up channels');
    }
    const r = await fetch('/api/channel?' + (id ? 'c=' + id : 'h=' + encodeURIComponent(handle)), { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!j.channelId) {
      if (id) return { channelId: id, avatar: '' }; // YouTube unreachable: keep the ID, picture can come later
      throw new Error(j.error || 'Channel not found — paste the channel ID (UC…) instead');
    }
    return { channelId: j.channelId, avatar: safeImg(j.avatar) };
  },

  async check(c) {
    if (!c.channelId || !Remote.ok) return 0;
    const r = await fetch('/api/feed?c=' + c.channelId, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${c.name}: feed unavailable (${r.status})`);
    const xml = new DOMParser().parseFromString(await r.text(), 'application/xml');
    let added = 0;
    for (const e of xml.getElementsByTagName('entry')) {
      const vid = e.getElementsByTagName('yt:videoId')[0]?.textContent;
      if (!vid || !/^[\w-]{11}$/.test(vid) || byVid(vid) || S.ignored.includes(vid) || S.inbox.some(x => x.videoId === vid)) continue;
      S.inbox.push({
        videoId: vid,
        title: e.getElementsByTagName('title')[0]?.textContent || '',
        published: e.getElementsByTagName('published')[0]?.textContent || '',
        creatorId: c.id, foundAt: Date.now()
      });
      added++;
    }
    c.lastCheck = Date.now();
    save.creators(); save.inbox();
    return added;
  },

  async checkAll(manual) {
    const list = S.creators.filter(c => c.channelId);
    if (!list.length) { if (manual) toast('Add a channel link to a creator first'); return; }
    if (!Remote.ok) { if (manual) toast('Start the mixer with the start script to check for new songs', 'bad'); return; }
    $('#crStatus').textContent = 'Checking for new uploads…';
    let added = 0; const errs = [];
    for (const c of list) {
      try { added += await this.check(c); } catch (e) { errs.push(e.message); }
    }
    $('#crStatus').textContent = `Last checked ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` + (errs.length ? ' · ' + errs.join(' · ') : '');
    renderCreators(); renderInbox();
    if (added) toast(`🔔 ${added} new upload${added > 1 ? 's' : ''} from your creators — see the Creators tab`, 'good');
    else if (manual) toast(errs.length ? 'Check finished with problems — see the Creators tab' : 'No new uploads', errs.length ? 'bad' : '');
  }
};

let crEditId = null, crUpload = '';

// Shrink an uploaded picture to a 256px square so it stays small in storage.
function readAvatar(file) {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return rej(new Error('Use a PNG, JPG or WebP picture'));
    const img = new Image();
    img.onload = () => {
      const n = 256, cv = document.createElement('canvas');
      cv.width = cv.height = n;
      const k = Math.min(img.width, img.height);
      cv.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n);
      URL.revokeObjectURL(img.src);
      res(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => rej(new Error('Could not read that picture'));
    img.src = URL.createObjectURL(file);
  });
}

function renderCreators() {
  const st = airStats();
  const total = Object.values(st).reduce((s, x) => s + x.secs, 0) || 1;
  const sel = $('#libCreator'), cur = sel.value;
  sel.innerHTML = '<option value="">— Creator —</option>' + S.creators.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  sel.value = cur;
  $('#crCards').innerHTML = S.creators.map(c => {
    const s = st[c.id] || { plays: 0, secs: 0, lastAt: 0 };
    const songs = S.library.filter(t => creatorOf(t)?.id === c.id).length;
    const waiting = S.inbox.filter(i => i.creatorId === c.id).length;
    const share = Math.round((s.secs / total) * 100);
    const tgt = Math.round(targetShare(c) * 100);
    const gap = share - tgt;
    const status = !s.plays ? 'not aired yet' : Math.abs(gap) <= 5 ? 'on target' : gap < 0 ? `${-gap}% behind` : `${gap}% ahead`;
    const cls = !s.plays || Math.abs(gap) <= 5 ? '' : gap < 0 ? 'behind' : 'ahead';
    return `<div class="cr-card" style="--cc:${safeColor(c.color)}" data-id="${c.id}">
      <div class="cr-top">${avatarOf(c) ? `<img class="cr-av" src="${esc(avatarOf(c))}" alt="">` : '<span class="cr-dot"></span>'}<b>${esc(c.name)}</b>${waiting ? `<span class="badge">${waiting} new</span>` : ''}</div>
      <div class="cr-meta">${c.channelId ? `<a href="https://www.youtube.com/channel/${esc(c.channelId)}" target="_blank" rel="noopener" title="Open their channel">channel linked ✓</a>` : '<span class="bad">no channel linked</span>'} · ${songs} song${songs === 1 ? '' : 's'}</div>
      <div class="cr-target"><span>Target <b>${tgt}%</b></span><span>Now <b>${share}%</b></span><span class="cr-status ${cls}">${status}</span></div>
      <div class="cr-air" title="Airtime this show: ${share}% (target ${tgt}%). The white line is the target."><i style="width:${share}%"></i><b style="left:${tgt}%"></b></div>
      <div class="cr-stats">${s.plays} play${s.plays === 1 ? '' : 's'} · ${fmt(s.secs)} on air${s.lastAt ? ` · last ${ago(s.lastAt)}` : ''}</div>
      <div class="cr-acts">
        <button type="button" data-c="smart" title="Queue the best song from this creator">+ Queue a song</button>
        <button type="button" data-c="check" title="Check this creator for new uploads">🔔</button>
        <button type="button" data-c="edit" title="Edit">✎</button>
        <button type="button" data-c="del" title="Remove creator (their songs stay in the library)">✕</button>
      </div></div>`;
  }).join('') || '<div class="dim">Add your four music writers above. Each gets a color, fair-airtime tracking and alerts when they upload something new.</div>';
}

function renderInbox() {
  const items = [...S.inbox].sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  $('#inboxList').innerHTML = items.map(i => {
    const c = creatorById(i.creatorId);
    const pub = Date.parse(i.published);
    return `<li data-vid="${esc(i.videoId)}" style="--cc:${safeColor(c?.color)}">
      <img class="th" src="${thumb(i.videoId)}" alt="" loading="lazy">
      <div class="grow"><div class="ttl">${esc(i.title || i.videoId)}</div>
        <div class="sub"><i class="dot"></i>${esc(c?.name || 'Unknown')} · ${isFinite(pub) ? 'uploaded ' + ago(pub) : ''}</div></div>
      <button type="button" data-i="watch" title="Watch on YouTube first">↗</button>
      <button type="button" data-i="ok" class="primary" title="Add to the approved library">✓ Approve</button>
      <button type="button" data-i="okq" title="Approve and add to the queue">✓ + Queue</button>
      <button type="button" data-i="no" class="danger" title="Not a song / don't want it — hide it for good">Ignore</button></li>`;
  }).join('') || '<li class="dim">Nothing waiting. New uploads from your creators appear here automatically (checked every 30 minutes while not on air).</li>';
  const n = S.inbox.length;
  $('#inboxCount').textContent = n;
  $('#inboxPillN').textContent = n;
  $('#inboxPill').classList.toggle('hidden', !n);
  $('#crTabCount').textContent = n;
  $('#crTabCount').classList.toggle('hidden', !n);
}

function approveInbox(vid, queue) {
  const i = S.inbox.find(x => x.videoId === vid);
  if (!i) return;
  S.inbox = S.inbox.filter(x => x !== i);
  if (!byVid(vid)) {
    const c = creatorById(i.creatorId);
    const t = {
      id: uid(), videoId: vid, url: 'https://www.youtube.com/watch?v=' + vid, title: i.title, artist: c?.name || '',
      creatorId: i.creatorId, license: 'Full permission — creator', approvedOn: today(), tags: '', notes: '',
      duration: 0, plays: 0, addedAt: Date.now(), isNew: true, publishedAt: i.published
    };
    S.library.push(t);
    probeLength(t);
    if (queue) addToQueue(t.id);
  }
  save.inbox(); save.library();
  renderInbox(); renderLibrary(); renderCreators(); renderSmart();
}

function initCreatorsUI() {
  const resetForm = () => {
    crEditId = null; $('#crForm').reset();
    $('#crColor').value = DEFAULT_COLORS[S.creators.length % DEFAULT_COLORS.length];
    $('#crShare').value = 25;
    crUpload = ''; $('#crImgPrev').src = NO_IMG;
    $('#crSave').textContent = 'Add creator'; $('#crCancel').classList.add('hidden');
  };
  resetForm();
  $('#crCancel').onclick = resetForm;
  $('#crForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#crName').value.trim();
    if (!name) return;
    let found;
    try { found = await Creators.resolve($('#crChannel').value); }
    catch (err) { toast(err.message, 'bad'); return; }
    const channelId = found.channelId;
    const color = safeColor($('#crColor').value);
    const share = clamp(Math.round(+$('#crShare').value || 25), 1, 100);
    let c = crEditId && creatorById(crEditId);
    // Your uploaded picture wins; otherwise use the channel's picture.
    let avatar, uploaded;
    if (crUpload) { avatar = crUpload; uploaded = true; }
    else if (c?.avatarUploaded && c.avatar) { avatar = c.avatar; uploaded = true; }
    else { avatar = found.avatar || c?.avatar || ''; uploaded = false; }
    if (c) Object.assign(c, { name, channelId, color, share, avatar, avatarUploaded: uploaded });
    else { c = { id: uid(), name, channelId, color, share, avatar, avatarUploaded: uploaded }; S.creators.push(c); }
    if (!avatar) toast(`No picture for ${name} yet — click Image to upload one`);
    save.creators(); resetForm(); renderCreators(); renderLibrary(); renderQueue();
    toast(`Creator "${name}" saved`, 'good');
    if (channelId) { try { const n = await Creators.check(c); renderCreators(); renderInbox(); if (n) toast(`${n} upload(s) from ${name} waiting for approval`, 'good'); } catch (err) { toast(err.message, 'bad'); } }
  });
  $('#crCheck').onclick = () => Creators.checkAll(true);
  $('#crImg').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { crUpload = await readAvatar(f); $('#crImgPrev').src = crUpload; toast('Picture ready — press Add / Save creator'); }
    catch (err) { toast(err.message, 'bad'); }
  };
  $('#crCards').addEventListener('click', async e => {
    const b = e.target.closest('button[data-c]'); if (!b) return;
    const c = creatorById(b.closest('.cr-card').dataset.id); if (!c) return;
    const a = b.dataset.c;
    if (a === 'smart') {
      const s = suggest(1, { creatorId: c.id })[0];
      if (s) { addToQueue(s.t.id); toast(`Queued "${s.t.title}"`); } else toast(`No available songs from ${c.name}`);
    } else if (a === 'check') {
      try { const n = await Creators.check(c); renderCreators(); renderInbox(); toast(n ? `${n} new from ${c.name}` : `Nothing new from ${c.name}`); }
      catch (err) { toast(err.message, 'bad'); }
    } else if (a === 'edit') {
      crEditId = c.id; $('#crName').value = c.name; $('#crChannel').value = c.channelId || ''; $('#crColor').value = safeColor(c.color); $('#crShare').value = shareOf(c);
      crUpload = ''; $('#crImgPrev').src = avatarOf(c) || NO_IMG;
      $('#crSave').textContent = 'Save creator'; $('#crCancel').classList.remove('hidden'); $('#crName').focus();
    } else if (a === 'del' && await ask(`Remove creator "${c.name}"? Their songs stay in the library.`, 'Remove')) {
      S.creators = S.creators.filter(x => x !== c);
      S.inbox = S.inbox.filter(i => i.creatorId !== c.id);
      save.creators(); save.inbox(); renderCreators(); renderInbox(); renderLibrary();
    }
  });
  $('#inboxList').addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    const vid = b.closest('li').dataset.vid;
    const a = b.dataset.i;
    if (a === 'watch') window.open('https://www.youtube.com/watch?v=' + vid, '_blank', 'noopener');
    else if (a === 'ok' || a === 'okq') { approveInbox(vid, a === 'okq'); toast('Approved and added to the library', 'good'); }
    else if (a === 'no') {
      S.inbox = S.inbox.filter(x => x.videoId !== vid);
      S.ignored.push(vid); if (S.ignored.length > 2000) S.ignored.splice(0, S.ignored.length - 2000);
      save.inbox(); save.ignored(); renderInbox(); renderCreators();
    }
  });
  $('#inboxApproveAll').onclick = async () => {
    if (!S.inbox.length) return;
    if (!(await ask(`Approve all ${S.inbox.length} waiting uploads into the library?`, 'Approve all'))) return;
    [...S.inbox].forEach(i => approveInbox(i.videoId, false));
    toast('All approved', 'good');
  };
  $('#inboxIgnoreAll').onclick = async () => {
    if (!S.inbox.length) return;
    if (!(await ask(`Ignore all ${S.inbox.length} waiting uploads? They won't come back.`, 'Ignore all'))) return;
    S.ignored.push(...S.inbox.map(i => i.videoId)); S.inbox = [];
    save.inbox(); save.ignored(); renderInbox(); renderCreators();
  };
  $('#inboxPill').onclick = () => openTab('creators');
}

/* ---------------- stage view: the clean display viewers see ---------------- */

let stageSig = '';
function setStage(on) {
  S.stage = on;
  Tip.hide();
  document.body.classList.toggle('staged', on);
  $('#stage').classList.toggle('hidden', !on);
  $('#stageBtn').classList.toggle('on', on);
  Object.values(decks).forEach(d => {
    d.r.screen.classList.toggle('staged', on);
    d.r.screen.style.opacity = ''; d.r.screen.style.zIndex = '';
  });
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  stageSig = '';
  renderStage();
}

function toggleFullscreen() {
  if (!S.stage) setStage(true);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => toast('Full screen was blocked — click the page, then press F', 'bad'));
}

function renderStage() {
  if (!S.stage) return;
  const A = decks.A, B = decks.B, pa = A.isPlaying(), pb = B.isPlaying();
  // The full video fills the window and crossfades along with the audio.
  let wa = 1 - S.xf;
  if (pa && !pb) wa = 1; else if (!pa && pb) wa = 0; else if (!pa && !pb) wa = liveDeck() === A ? 1 : 0;
  const wb = 1 - wa;
  A.r.screen.style.opacity = wa.toFixed(2); B.r.screen.style.opacity = wb.toFixed(2);
  A.r.screen.style.zIndex = wa >= wb ? 62 : 61; B.r.screen.style.zIndex = wb > wa ? 62 : 61;

  // Badge: creator picture, creator name, song title.
  const main = wa >= wb ? A : B, t = main.track, c = creatorOf(t);
  const sig = [t?.id, t?.title, c?.id, c?.name, c?.avatar, c?.color].join('|');
  if (sig === stageSig) return;
  stageSig = sig;
  const badge = $('#stBadge');
  badge.classList.toggle('hidden', !t);
  if (!t) return;
  badge.style.setProperty('--cc', safeColor(c?.color || (main.id === 'A' ? '#22d3ee' : '#ff7a3d')));
  $('#stAvatar').src = avatarOf(c) || thumb(t.videoId);
  $('#stName').textContent = artistOf(t);
  $('#stSong').textContent = t.title || '';
  badge.classList.remove('enter'); void badge.offsetWidth; badge.classList.add('enter'); // slide in on each new song
}

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
      const info = await r.json();
      this.key = info.key;
      this.ok = true;
      S.serverVersion = info.version || 'unknown';
      if (info.version && info.version !== APP_VERSION) {
        toast(`Version mismatch: files are v${info.version} but this page is v${APP_VERSION}. Press Ctrl+F5 to reload.`, 'bad');
      }
    } catch { this.ok = false; }
    const pill = $('#remoteStatus');
    pill.textContent = this.ok ? 'Stream Deck: ready' : 'Stream Deck: keyboard only';
    pill.className = 'pill ' + (this.ok ? 'ok' : '');
    renderKeys(); renderVersion();
    if (this.ok) {
      Disk.ok = true; Disk.key = this.key;
      if (await Disk.restoreIfEmpty()) renderEverything();
      Disk.push();
    } else Disk.pill(false, 'Disk: off (no start script)');
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
  tapA: ['Tap tempo Deck A', 'e', () => decks.A.act_tap()],
  tapB: ['Tap tempo Deck B', 'r', () => decks.B.act_tap()],
  mix: ['MIX ⇄ to the other deck (fade time)', ' ', mixNow],
  xfA: ['Fade crossfader to A (keep B playing)', 'z', () => mixTo(decks.A, S.cfg.fadeSec, { stopOld: false })],
  xfB: ['Fade crossfader to B (keep A playing)', 'x', () => mixTo(decks.B, S.cfg.fadeSec, { stopOld: false })],
  xfCenter: ['Crossfader to center', 'c', () => setXf(0.5)],
  xfLeft: ['Nudge crossfader toward A', 'ArrowLeft', () => setXf(S.xf - 0.05)],
  xfRight: ['Nudge crossfader toward B', 'ArrowRight', () => setXf(S.xf + 0.05)],
  autodj: ['Auto DJ on / off', 'd', () => setAutoDJ(!S.autoDJ)],
  smart: ['Smart Next: queue the best next song', 'n', () => { if (!smartFillOne()) toast('No suggestions available'); }],
  talk: ['Talk-over duck on / off', 't', () => setTalk(!S.talk)],
  talkOn: ['Talk-over duck ON', null, () => setTalk(true)],
  talkOff: ['Talk-over duck OFF', null, () => setTalk(false)],
  onair: ['On Air on / off', 'o', toggleOnAir],
  stage: ['Viewer page on / off (share this tab)', 'v', () => setStage(!S.stage)],
  full: ['Viewer page full screen on / off', 'f', toggleFullscreen],
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
  panic: ['Fade everything out (2 s) — Stream Deck / button only', null, panic]
};

function runCommand(name) {
  const c = COMMANDS[name];
  if (c) c[2](); else console.warn('Unknown command', name);
}

const KEYMAP = {};
Object.entries(COMMANDS).forEach(([name, c]) => { if (c[1]) KEYMAP[c[1]] = name; });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modalDone) modalDone(false);
    else if (!$('#help').classList.contains('hidden')) $('#help').classList.add('hidden');
    else if (!$('#imp').classList.contains('hidden')) $('#imp').classList.add('hidden');
    else if (e.target.closest('input, textarea, select')) e.target.blur();
    else if (S.stage) setStage(false);
    return;
  }
  if (modalDone || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (!$('#imp').classList.contains('hidden') || !$('#help').classList.contains('hidden')) return;
  if (e.target.closest('input, textarea, select')) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const name = KEYMAP[k];
  if (!name) return;
  e.preventDefault();
  runCommand(name);
});

/* ---------------- play log & credits ---------------- */

function logPlay(d) {
  const t = d.track;
  const c = creatorOf(t);
  S.history.unshift({ at: Date.now(), id: t.id, videoId: t.videoId, title: t.title, artist: artistOf(t), creatorId: c?.id || null, license: t.license || '', deck: d.id });
  if (S.history.length > 1000) S.history.length = 1000;
  save.history();
  if (inLib(t)) { t.plays = (t.plays || 0) + 1; t.lastPlayed = Date.now(); delete t.isNew; save.library(); renderLibrary(); }
  renderHistory(); renderCreators(); renderSmart();
}

function buildCredits(mode) {
  S.creditsMode = mode;
  let since;
  if (mode === 'show' && S.onAirAt) since = S.onAirAt;
  else { const d = new Date(); d.setHours(0, 0, 0, 0); since = d.getTime(); }
  const seen = new Set(), lines = [], featured = new Map();
  [...S.history].reverse().forEach(h => {
    if (h.at < since || seen.has(h.videoId)) return;
    seen.add(h.videoId);
    const t = byVid(h.videoId) || h;
    const c = creatorOf(t) || creatorById(h.creatorId);
    if (c) featured.set(c.id, c);
    lines.push(`• ${t.title || h.videoId} — ${c?.name || t.artist || 'Unknown creator'} — https://youtu.be/${h.videoId}${t.notes ? ' (' + t.notes + ')' : ''}`);
  });
  let text = lines.length ? "Music in this episode (used with the creators' permission):\n" + lines.join('\n') : '';
  const chans = [...featured.values()].filter(c => c.channelId);
  if (chans.length) text += '\n\nSupport the creators:\n' + chans.map(c => `• ${c.name} — https://www.youtube.com/channel/${c.channelId}`).join('\n');
  $('#credits').value = text;
  if (!lines.length) toast(mode === 'show' && !S.onAirAt ? 'No show yet — press ON AIR when you go live' : 'Nothing played yet');
}

/* ---------------- drag & drop ---------------- */

let drag = null; // { id, qid? }
document.addEventListener('dragend', () => { drag = null; $$('.drop, .dragover').forEach(e => e.classList.remove('drop', 'dragover')); });

/* ---------------- queue ---------------- */

function addToQueue(id, index = S.queue.length, auto = false) {
  const q = { qid: uid(), id };
  if (auto) q.auto = true;
  S.queue.splice(index, 0, q);
  save.queue(); renderQueue();
}
function removeFromQueue(qid) {
  S.queue = S.queue.filter(q => q.qid !== qid);
  save.queue(); renderQueue();
}

// Seconds until each queued song is expected to start.
function queueEtas(items) {
  const live = liveDeck(), next = other(live);
  let eta = 0;
  if (live.isPlaying()) eta += live.remaining();
  if (next.track && !next.played && !next.errored) eta += Math.max(0, trackLen(next.track) - S.cfg.fadeSec);
  return items.map(t => { const at = eta; eta += Math.max(0, trackLen(t) - S.cfg.fadeSec); return at; });
}

function creatorChip(t) {
  const c = creatorOf(t), img = avatarOf(c);
  return (img ? `<img class="av" src="${esc(img)}" alt="">` : '<i class="dot"></i>') + esc(artistOf(t));
}

function renderQueue() {
  const items = S.queue.map(q => ({ q, t: byId(q.id) })).filter(x => x.t);
  const etas = queueEtas(items.map(x => x.t));
  $('#queueList').innerHTML = items.map(({ q, t }, i) => {
    const len = trackLen(t);
    const c = creatorOf(t);
    return `<li draggable="true" data-qid="${q.qid}" data-id="${t.id}" style="--cc:${safeColor(c?.color)}" class="cc-row">
      <span class="num">${i + 1}</span>
      <div class="qth"><img class="th" src="${thumb(t.videoId)}" alt="" loading="lazy"><span>${len ? fmt(len) : ''}</span></div>
      <div class="grow"><div class="ttl">${q.auto ? '<span class="auto-tag" title="Picked by Smart DJ. Swap it (⇄), remove it (✕) or drag your own song in front: you have the final say.">SMART</span> ' : ''}${t.isNew ? '<span class="new">NEW</span> ' : ''}${esc(t.title || t.videoId)}</div><div class="sub">${creatorChip(t)} · ${esc(t.license || 'no permission note')}</div></div>
      ${t.bpm ? `<span class="len">${Math.round(t.bpm)} BPM</span>` : ''}
      <span class="eta" title="Estimated start time from now">+${fmt(etas[i])}</span>
      <span class="len">${len ? fmt(len) : '?:??'}</span>
      <button type="button" data-q="A" class="la" title="Load onto deck A">A</button><button type="button" data-q="B" class="lb" title="Load onto deck B">B</button>
      <button type="button" data-q="up" title="Move up">▲</button>
      <button type="button" data-q="swap" title="Swap for Smart DJ's next-best pick (this one won't be suggested again this show)">⇄</button>
      <button type="button" data-q="del" title="Remove from queue">✕</button>
    </li>`;
  }).join('');
  $('#queueCount').textContent = items.length;
  $('#queueTime').textContent = fmt(items.reduce((s, x) => s + trackLen(x.t), 0));
  renderSmart();
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
    else if (act === 'swap') {
      const t = byId(id), q = S.queue.find(x => x.qid === qid);
      if (t) S.skip.add(t.videoId);
      const s2 = suggest(1)[0];
      if (!q || !s2) { toast('No other suggestion available'); renderSmart(); return; }
      q.id = s2.t.id; q.auto = true;
      save.queue(); renderQueue();
      toast(`Swapped for "${s2.t.title || s2.t.videoId}" — ${s2.why[0]}`);
    }
    else if (act === 'up') {
      const i = S.queue.findIndex(q => q.qid === qid);
      if (i > 0) { [S.queue[i - 1], S.queue[i]] = [S.queue[i], S.queue[i - 1]]; save.queue(); renderQueue(); }
    } else decks[act].userLoad(byId(id)).then(ok => { if (ok) removeFromQueue(qid); });
  });
  list.addEventListener('dragstart', e => {
    const li = e.target.closest('li'); if (!li) return;
    drag = { id: li.dataset.id, qid: li.dataset.qid };
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', li.dataset.id);
  });
  list.addEventListener('dragover', e => {
    if (!drag && !linkDrag(e)) return; e.preventDefault();
    $$('li.dragover', list).forEach(x => x.classList.remove('dragover'));
    e.target.closest('li')?.classList.add('dragover');
  });
  list.addEventListener('drop', e => {
    if (!drag && !linkDrag(e)) return; e.preventDefault();
    const target = e.target.closest('li');
    if (!drag) {
      let at = target ? S.queue.findIndex(q => q.qid === target.dataset.qid) : S.queue.length;
      if (at < 0) at = S.queue.length;
      ingestLinks(droppedText(e)).forEach(t => addToQueue(t.id, at++));
      return;
    }
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
  body.addEventListener('dragover', e => { if ((drag && !drag.qid) || linkDrag(e)) e.preventDefault(); });
  body.addEventListener('drop', e => {
    if (e.target.closest('#queueList')) return;
    if (drag && !drag.qid) { e.preventDefault(); addToQueue(drag.id); drag = null; }
    else if (!drag && linkDrag(e)) { e.preventDefault(); ingestLinks(droppedText(e)).forEach(t => addToQueue(t.id)); }
  });

  $('#qClear').onclick = async () => { if (S.queue.length && await ask('Clear the whole queue?', 'Clear')) { S.queue = []; save.queue(); renderQueue(); } };
  $('#qShuffle').onclick = () => {
    for (let i = S.queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.queue[i], S.queue[j]] = [S.queue[j], S.queue[i]]; }
    save.queue(); renderQueue();
  };
  $('#qSave').onclick = async () => {
    const name = $('#plName').value.trim();
    if (!name) { toast('Give the playlist a name'); $('#plName').focus(); return; }
    if (!S.queue.length) { toast('Queue is empty'); return; }
    const existing = S.playlists.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing && !(await ask(`Overwrite playlist "${existing.name}"?`, 'Overwrite'))) return;
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
  $('#libDate').value = today();
  $('#libLicense').value = '';
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
  // Auto-pick the creator when the channel name matches.
  const a = $('#libArtist').value.trim().toLowerCase();
  const match = S.creators.find(c => c.name.toLowerCase() === a);
  if (match && !$('#libCreator').value) { $('#libCreator').value = match.id; if (!$('#libLicense').value) $('#libLicense').value = 'Full permission — creator'; }
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
    info.textContent = `✓ Plays in the mixer · length ${fmt(p.duration)}`;
  } else info.textContent = 'Could not read length — it will fill in on first play.';
}

function saveLibForm(e) {
  e.preventDefault();
  const vid = parseVideoId($('#libUrl').value);
  if (!vid) { toast('That is not a YouTube link', 'bad'); return; }
  const creatorId = $('#libCreator').value || null;
  const bpm = parseFloat($('#libBpm').value);
  const energy = parseInt($('#libEnergy').value, 10);
  const fields = {
    videoId: vid,
    url: 'https://www.youtube.com/watch?v=' + vid,
    title: $('#libTitle').value.trim(),
    creatorId,
    artist: $('#libArtist').value.trim() || creatorById(creatorId)?.name || '',
    license: $('#libLicense').value.trim(),
    approvedOn: $('#libDate').value,
    bpm: bpm >= 40 && bpm <= 220 ? Math.round(bpm * 10) / 10 : undefined,
    energy: energy >= 1 && energy <= 5 ? energy : undefined,
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
    S.inbox = S.inbox.filter(i => i.videoId !== vid);
    toast(`Added "${t.title || vid}" to approved library`, 'good');
    probeLength(t);
  }
  Object.keys(t).forEach(k => { if (t[k] === undefined) delete t[k]; });
  save.library(); save.inbox(); resetLibForm(); renderLibrary(); renderQueue(); renderCreators(); renderInbox();
  Object.values(decks).forEach(d => d.render());
}

function editTrack(t) {
  editId = t.id; formDuration = 0;
  $('#libUrl').value = t.url || t.videoId;
  $('#libTitle').value = t.title || '';
  $('#libCreator').value = creatorOf(t)?.id || '';
  $('#libArtist').value = t.artist || '';
  $('#libLicense').value = t.license || '';
  $('#libDate').value = t.approvedOn || '';
  $('#libBpm').value = t.bpm || '';
  $('#libEnergy').value = t.energy || '';
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
    .filter(t => !q || [t.title, artistOf(t), t.tags, t.license, t.notes].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || (a.title || '').localeCompare(b.title || ''));
  $('#libBody').innerHTML = rows.map(t => {
    const c = creatorOf(t);
    return `<tr draggable="true" data-id="${t.id}" style="--cc:${safeColor(c?.color)}">
      <td><img class="th lib-th" src="${thumb(t.videoId)}" alt="" loading="lazy"></td>
      <td><div class="ttl">${t.isNew ? '<span class="new">NEW</span> ' : ''}<b>${esc(t.title || t.videoId)}</b></div>
        <div class="dim">${creatorChip(t)}${t.tags ? ' · ' + esc(t.tags) : ''}${t.noAuto ? ' · <span class="manual-tag">manual only</span>' : ''}</div>
        ${t.flag ? `<div class="flag">⚠ ${esc(t.flag)}</div>` : ''}</td>
      <td class="dim">${t.duration ? fmt(t.duration) : '?:??'}</td>
      <td class="dim">${t.bpm ? Math.round(t.bpm) : '—'}</td>
      <td class="energy" title="Energy ${t.energy || '?'} of 5">${t.energy ? '●'.repeat(t.energy) + '<span class="dim">' + '●'.repeat(5 - t.energy) + '</span>' : '<span class="dim">—</span>'}</td>
      <td class="dim">${esc(t.license || '—')}${t.approvedOn ? `<br><small>${esc(t.approvedOn)}</small>` : ''}</td>
      <td class="dim">${t.plays || 0}</td>
      <td class="acts">
        <button type="button" data-l="A" class="la" title="Load onto deck A">A</button>
        <button type="button" data-l="B" class="lb" title="Load onto deck B">B</button>
        <button type="button" data-l="q" title="Add to the queue">+Q</button>
        <button type="button" data-l="auto" class="${t.noAuto ? 'off' : ''}" title="${t.noAuto ? 'Manual only: Smart DJ will never pick this song. Click to allow.' : 'Smart DJ may pick this song. Click to make it manual only.'}">🤖</button>
        <button type="button" data-l="open" title="Open on YouTube">↗</button>
        <button type="button" data-l="edit" title="Edit details, BPM and energy">✎</button>
        <button type="button" data-l="del" title="Remove from the approved library">✕</button>
      </td></tr>`;
  }).join('');
  $('#libCount').textContent = S.library.length;
}

function initLibraryUI() {
  resetLibForm();
  $('#libForm').addEventListener('submit', saveLibForm);
  $('#libFetch').onclick = fetchInfo;
  $('#libCancel').onclick = resetLibForm;
  $('#libSearch').addEventListener('input', renderLibrary);
  $('#libCreator').addEventListener('change', e => {
    const c = creatorById(e.target.value);
    if (c && !$('#libLicense').value) $('#libLicense').value = 'Full permission — creator';
    if (c && !$('#libArtist').value) $('#libArtist').value = c.name;
  });
  $('#libBody').addEventListener('click', async e => {
    const b = e.target.closest('button[data-l]'); if (!b) return;
    const t = byId(b.closest('tr').dataset.id); if (!t) return;
    const a = b.dataset.l;
    if (a === 'A' || a === 'B') decks[a].userLoad(t);
    else if (a === 'q') { addToQueue(t.id); toast(`Queued "${t.title || t.videoId}"`); }
    else if (a === 'auto') {
      if (t.noAuto) delete t.noAuto; else t.noAuto = true;
      save.library(); renderLibrary(); renderSmart();
      toast(t.noAuto ? `"${t.title}" is manual only — Smart DJ won't pick it` : `Smart DJ may pick "${t.title}" again`);
    }
    else if (a === 'open') window.open('https://www.youtube.com/watch?v=' + t.videoId, '_blank', 'noopener');
    else if (a === 'edit') editTrack(t);
    else if (a === 'del' && await ask(`Remove "${t.title || t.videoId}" from the approved library?`, 'Remove')) {
      S.library = S.library.filter(x => x !== t);
      S.queue = S.queue.filter(q => q.id !== t.id);
      save.library(); save.queue(); renderLibrary(); renderQueue(); renderCreators();
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

/* ---------------- drag & paste YouTube links straight in ---------------- */

const linkDrag = e => !drag && [...(e.dataTransfer?.types || [])].some(t => t === 'text/uri-list' || t === 'text/plain' || t === 'text/html');
function droppedText(e) {
  const dt = e.dataTransfer;
  return [dt.getData('text/uri-list'), dt.getData('text/plain'), dt.getData('text/html')].filter(Boolean).join('\n');
}

// Turns any text with YouTube links into library tracks (adding the new ones: you vouch for what you drop in).
function ingestLinks(text) {
  const vids = [];
  for (const u of ytUrls(String(text || '').replace(/&amp;/g, '&'))) {
    const v = parseVideoId(u.replace(/[).\]]+$/, ''));
    if (v && !vids.includes(v)) vids.push(v);
  }
  if (!vids.length) { toast('No YouTube link found in what you dropped or pasted', 'bad'); return []; }
  let added = 0;
  const tracks = vids.map(vid => {
    let t = byVid(vid);
    if (!t) {
      t = { id: uid(), videoId: vid, url: 'https://www.youtube.com/watch?v=' + vid, title: '', artist: '',
        license: 'Full permission — creator', approvedOn: today(), tags: '', notes: '', duration: 0, plays: 0, addedAt: Date.now() };
      S.library.push(t); added++;
      fillDetails(t);
    }
    return t;
  });
  S.inbox = S.inbox.filter(i => !vids.includes(i.videoId));
  save.library(); save.inbox(); renderLibrary(); renderInbox(); renderCreators();
  toast(added ? `Added ${added} new song${added === 1 ? '' : 's'} to your library` : `${tracks.length} song${tracks.length === 1 ? '' : 's'} from your library`, 'good');
  return tracks;
}

// Title, creator and length for a link added by drag or paste.
async function fillDetails(t) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(t.url)}`);
    if (r.ok) {
      const j = await r.json();
      if (!t.title) t.title = j.title || '';
      const c = matchCreator(j.author_name);
      if (c) { t.creatorId = c.id; t.artist = c.name; } else if (!t.artist) t.artist = j.author_name || '';
      save.library(); renderLibrary(); renderQueue(); renderAll();
    }
  } catch { /* the player look-up below still fills it in */ }
  probeLength(t);
}

document.addEventListener('paste', e => {
  if (e.target.closest('input, textarea, select') || !$('#imp').classList.contains('hidden')) return;
  const text = e.clipboardData?.getData('text') || '';
  if (!ytUrls(text).length) return;
  e.preventDefault();
  const tracks = ingestLinks(text);
  tracks.forEach(t => addToQueue(t.id));
  if (tracks.length) toast(`Queued ${tracks.length} song${tracks.length === 1 ? '' : 's'}`, 'good');
});

/* ---------------- import a music list (Rundown console, spreadsheet, text) ---------------- */

const ytUrls = line => line.match(/https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/[^\s"'<>,;|]+/gi) || [];

// Match a creator by exact name, else the longest creator name found inside the text.
function matchCreator(text) {
  const low = String(text || '').toLowerCase().trim();
  if (!low) return null;
  return S.creators.find(c => c.name.toLowerCase() === low) ||
    S.creators.filter(c => new RegExp('\\b' + c.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(low))
      .sort((a, b) => b.name.length - a.name.length)[0] || null;
}

function splitCSV(text, delim) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);
  return rows;
}

// Returns { items: [{videoId, title, artist, creatorId, license, notes, bpm}], noLink, json }
function parseMusicList(text) {
  text = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!text) return { items: [], noLink: 0 };
  try { const j = JSON.parse(text); if (j && Array.isArray(j.library)) return { json: text, items: [], noLink: 0 }; } catch { /* not JSON */ }
  if (/<(html|body|table|div|a|ul|ol)\b/i.test(text)) return parseHtmlList(text);
  const out = [], seen = new Set();
  let noLink = 0;
  const push = it => {
    if (!it.videoId || seen.has(it.videoId)) return;
    seen.add(it.videoId);
    const c = matchCreator(it.artist) || (!it.artist ? matchCreator(it.title) : null);
    out.push({ ...it, creatorId: c?.id || '', title: (it.title || '').trim(), artist: (it.artist || '').trim() });
  };
  const first = text.split(/\r?\n/)[0];
  const delim = ['\t', ',', ';'].map(d => [d, first.split(d).length - 1]).sort((a, b) => b[1] - a[1])[0];
  // Spreadsheet / CSV with a header row
  if (delim[1] >= 1) {
    const rows = splitCSV(text, delim[0]);
    const hdr = rows[0].map(h => h.trim().toLowerCase());
    const col = (names, not = -1) => hdr.findIndex((h, i) => i !== not && names.some(n => h.includes(n)));
    const cUrl = col(['url', 'link', 'youtube', 'video']);
    const cArtist = col(['artist', 'creator', 'writer', 'author', 'channel', 'composer']);
    const cTitle = col(['title', 'song', 'track', 'name'], cArtist);
    const cLic = col(['permission', 'license', 'licence', 'rights']);
    const cNotes = col(['note', 'credit', 'comment']);
    const cBpm = col(['bpm', 'tempo']);
    if (cUrl >= 0 || cTitle >= 0) {
      for (const r of rows.slice(1)) {
        const vid = parseVideoId((cUrl >= 0 ? r[cUrl] : '') || '') || parseVideoId(ytUrls(r.join(' '))[0] || '');
        if (!vid) { noLink++; continue; }
        push({ videoId: vid, title: cTitle >= 0 ? r[cTitle] : '', artist: cArtist >= 0 ? r[cArtist] : '',
          license: cLic >= 0 ? (r[cLic] || '').trim() : '', notes: cNotes >= 0 ? (r[cNotes] || '').trim() : '',
          bpm: cBpm >= 0 ? parseFloat(r[cBpm]) : NaN });
      }
      return { items: out, noLink };
    }
  }
  // Free text: any line with a YouTube link; the rest of the line is the title (and maybe the creator)
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const urls = ytUrls(line);
    if (!urls.length) { noLink++; continue; }
    let rest = line;
    urls.forEach(u => { rest = rest.replace(u, ' '); });
    rest = rest.replace(/^\s*(\d+\s*[.):-]\s*|[-*•]\s*)/, '').replace(/\s+/g, ' ').replace(/^[\s\-–—|:,]+|[\s\-–—|:,]+$/g, '');
    const parts = rest.split(/\s+[-–—|]\s+|\t/).map(x => x.trim()).filter(Boolean);
    let title = rest, artist = '';
    const ci = parts.findIndex(x => matchCreator(x)?.name.toLowerCase() === x.toLowerCase());
    if (parts.length > 1 && ci >= 0) { artist = parts[ci]; title = parts.filter((_, i) => i !== ci).join(' - '); }
    urls.forEach(u => { const vid = parseVideoId(u.replace(/[).\]]+$/, '')); if (vid) push({ videoId: vid, title, artist }); });
  }
  return { items: out, noLink };
}

// A saved web page (e.g. "Rundown Console.html"). The page is only read as text: its scripts never run.
function parseHtmlList(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [], seen = new Set();
  const GENERIC = /^(watch|link|play|open|youtube|video|here|listen|go|view|▶|►)$/i;
  const clean = str => String(str || '').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ')
    .replace(/^[\s\d.):\-–—|•*]+|[\s\-–—|:,]+$/g, '').replace(/\s+(by|from|feat\.?)$/i, '').trim();
  const cellText = row => row.cells ? [...row.cells].map(c => c.textContent.trim()).filter(Boolean).join(' | ') : row.textContent;
  const add = (vid, title, context, artistText = '') => {
    if (!vid || seen.has(vid)) return;
    seen.add(vid);
    const c = matchCreator(artistText) || matchCreator(context) || matchCreator(title);
    let t = clean(title);
    if (c) t = clean(t.replace(new RegExp(c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' '));
    if (GENERIC.test(t)) t = '';
    out.push({ videoId: vid, title: t.slice(0, 120), artist: c?.name || clean(artistText), creatorId: c?.id || '' });
  };
  const vidIn = el => [...el.querySelectorAll('a[href], iframe[src]')].map(e => parseVideoId(e.getAttribute('href') || e.getAttribute('src') || '')).find(Boolean)
    || parseVideoId(ytUrls(el.textContent)[0] || '');
  // 0) tables: read them like a spreadsheet, using the header names
  doc.querySelectorAll('table').forEach(tb => {
    const rows = [...tb.rows];
    if (!rows.length) return;
    const hdrRow = rows.find(r => r.querySelector('th')) || rows[0];
    const hdr = [...hdrRow.cells].map(c => c.textContent.trim().toLowerCase());
    const col = (names, not = -1) => hdr.findIndex((h, i) => i !== not && names.some(n => h.includes(n)));
    const cA = col(['artist', 'creator', 'writer', 'author', 'channel', 'composer']);
    const cT = col(['title', 'song', 'track', 'name', 'music'], cA);
    rows.forEach(r => {
      if (r === hdrRow) return;
      const vid = vidIn(r);
      if (!vid) return;
      const cells = [...r.cells].map(c => c.textContent.trim());
      const link = r.querySelector('a[href]')?.textContent.trim() || '';
      const title = (cT >= 0 && cells[cT]) || (!GENERIC.test(link) && !/youtu/i.test(link) ? link : '') || cellText(r);
      add(vid, title, cellText(r), cA >= 0 ? cells[cA] : '');
    });
  });
  // 1) links and embedded players, titled from their link text or the row they sit in
  doc.querySelectorAll('a[href], iframe[src], [data-url], [data-href], [data-link], [data-src]').forEach(el => {
    const url = el.getAttribute('href') || el.getAttribute('src') || el.dataset.url || el.dataset.href || el.dataset.link || el.dataset.src;
    const vid = parseVideoId(url || '');
    if (!vid) return;
    const row = el.closest('tr, li, [class*="row"], [class*="item"], [class*="cue"], [class*="song"], [class*="track"], [class*="segment"]') || el.parentElement;
    const own = el.tagName === 'A' ? el.textContent : '';
    const ctx = row ? cellText(row) : own;
    add(vid, own && !/youtu/i.test(own) && !GENERIC.test(own.trim()) && clean(own).length > 1 ? own : ctx, ctx);
  });
  // 2) links typed as plain text in the page
  for (const line of (doc.body?.innerText || doc.body?.textContent || '').split(/\n/)) {
    ytUrls(line).forEach(u => add(parseVideoId(u.replace(/[).\]]+$/, '')), line, line));
  }
  // 3) links stored inside the page's own data (scripts, attributes): titles are looked up later
  ytUrls(html.replace(/\\\//g, '/')).forEach(u => add(parseVideoId(u.replace(/[).\]]+$/, '')), '', ''));
  return { items: out, noLink: 0, html: true };
}

let impItems = [];

function renderImport() {
  const opts = '<option value="">— none —</option>' + S.creators.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#impAllCreator').innerHTML = '<option value="">—</option>' + S.creators.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#impBody').innerHTML = impItems.map((it, i) => {
    const have = byVid(it.videoId);
    return `<tr data-i="${i}" class="${have ? 'dupe' : ''}">
      <td><input type="checkbox" class="imp-ck" checked></td>
      <td><img class="th lib-th" src="${thumb(it.videoId)}" alt="" loading="lazy"></td>
      <td>${have ? `<b>${esc(have.title || it.title || it.videoId)}</b><div class="dim">already in library — kept as is</div>`
        : `<input class="imp-title" value="${esc(it.title)}" placeholder="(title filled in automatically)">`}</td>
      <td>${have ? esc(artistOf(have)) : `<select class="imp-cr">${opts}</select>${it.artist && !it.creatorId ? `<div class="dim">${esc(it.artist)}</div>` : ''}`}</td>
      <td class="link">youtu.be/${esc(it.videoId)}</td></tr>`;
  }).join('');
  $$('#impBody tr').forEach(tr => { const sel = tr.querySelector('.imp-cr'); if (sel) sel.value = impItems[+tr.dataset.i].creatorId || ''; });
  const fresh = impItems.filter(it => !byVid(it.videoId)).length;
  $('#impPreview').classList.toggle('hidden', !impItems.length);
  $('#impAdd').disabled = !impItems.length;
  $('#impAdd').textContent = `Add ${impItems.length} song${impItems.length === 1 ? '' : 's'}`;
  return fresh;
}

function readImport() {
  const r = parseMusicList($('#impText').value);
  if (r.json) { $('#imp').classList.add('hidden'); importData({ text: async () => r.json }); return; }
  impItems = r.items;
  const fresh = renderImport();
  $('#impInfo').textContent = impItems.length
    ? `Found ${impItems.length} YouTube link${impItems.length === 1 ? '' : 's'} (${fresh} new, ${impItems.length - fresh} already in library)${r.noLink ? ` · ${r.noLink} line${r.noLink === 1 ? '' : 's'} without a YouTube link skipped` : ''}`
    : (r.html ? 'No YouTube links found in this page. Open your Rundown Console in Chrome, press Ctrl+A then Ctrl+C, and paste here instead.'
      : 'No YouTube links found. Paste the list again, or export it from Rundown as CSV or text.');
}

function addImport() {
  const ids = [];
  let added = 0;
  $$('#impBody tr').forEach(tr => {
    if (!tr.querySelector('.imp-ck').checked) return;
    const it = impItems[+tr.dataset.i];
    let t = byVid(it.videoId);
    if (!t) {
      const creatorId = tr.querySelector('.imp-cr')?.value || '';
      const c = creatorById(creatorId);
      t = {
        id: uid(), videoId: it.videoId, url: 'https://www.youtube.com/watch?v=' + it.videoId,
        title: (tr.querySelector('.imp-title')?.value || '').trim(), artist: c?.name || it.artist || '',
        license: it.license || 'Full permission — creator', approvedOn: today(), tags: '', notes: it.notes || '',
        duration: 0, plays: 0, addedAt: Date.now()
      };
      if (creatorId) t.creatorId = creatorId;
      if (it.bpm >= 40 && it.bpm <= 220) t.bpm = Math.round(it.bpm * 10) / 10;
      S.library.push(t); added++;
      probeLength(t);
    }
    ids.push(t.id);
  });
  if (!ids.length) { toast('Nothing checked'); return; }
  if ($('#impQueue').checked) ids.forEach(id => S.queue.push({ qid: uid(), id }));
  const plName = $('#impPlName').value.trim();
  if ($('#impPl').checked && plName) {
    const ex = S.playlists.find(p => p.name.toLowerCase() === plName.toLowerCase());
    if (ex) ex.items = ids; else S.playlists.push({ id: uid(), name: plName, items: ids });
  }
  S.inbox = S.inbox.filter(i => !ids.some(id => byId(id)?.videoId === i.videoId));
  save.library(); save.queue(); save.playlists(); save.inbox();
  renderEverything();
  $('#imp').classList.add('hidden');
  impItems = []; $('#impText').value = ''; $('#impInfo').textContent = ''; $('#impPreview').classList.add('hidden');
  toast(`Imported: ${added} new song${added === 1 ? '' : 's'}, ${ids.length - added} already in library${$('#impPl').checked && plName ? ` · playlist "${plName}" saved` : ''}`, 'good');
}

function initImportUI() {
  $('#libImportBtn').onclick = () => { $('#imp').classList.remove('hidden'); $('#impText').focus(); };
  $('#impCancel').onclick = () => $('#imp').classList.add('hidden');
  $('#impRead').onclick = readImport;
  $('#impAdd').onclick = addImport;
  $('#impFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (/\.(xlsx?|ods|docx?|pdf)$/i.test(f.name)) { toast('Save it as CSV or plain text first (File → Save as → CSV), then choose that file', 'bad'); return; }
    $('#impText').value = await f.text();
    readImport();
  };
  $('#impAll').onchange = e => $$('#impBody .imp-ck').forEach(c => { c.checked = e.target.checked; });
  $('#impAllCreator').onchange = e => {
    $$('#impBody tr').forEach(tr => { const sel = tr.querySelector('.imp-cr'); if (sel && tr.querySelector('.imp-ck').checked) sel.value = e.target.value; });
  };
}

/* ---------------- playlists ---------------- */

function renderPlaylists() {
  $('#plList').innerHTML = S.playlists.map(p => {
    const tracks = p.items.map(byId).filter(Boolean);
    const len = tracks.reduce((s, t) => s + trackLen(t), 0);
    return `<li data-id="${p.id}"><div class="grow"><div class="ttl">${esc(p.name)}</div>
      <div class="sub">${tracks.length} tracks · ${fmt(len)}</div></div>
      <button type="button" data-p="load" title="Replace the queue with this playlist">Load</button>
      <button type="button" data-p="append" title="Add this playlist to the end of the queue">Append</button>
      <button type="button" data-p="del" class="danger" title="Delete playlist">✕</button></li>`;
  }).join('') || '<li class="dim">No playlists yet.</li>';
}

function initPlaylistsUI() {
  $('#plList').addEventListener('click', async e => {
    const b = e.target.closest('button[data-p]'); if (!b) return;
    const p = S.playlists.find(x => x.id === b.closest('li').dataset.id); if (!p) return;
    const a = b.dataset.p;
    if (a === 'del') { if (await ask(`Delete playlist "${p.name}"?`, 'Delete')) { S.playlists = S.playlists.filter(x => x !== p); save.playlists(); renderPlaylists(); } return; }
    if (a === 'load') { if (S.queue.length && !(await ask('Replace the current queue?', 'Replace'))) return; S.queue = []; }
    p.items.filter(byId).forEach(id => S.queue.push({ qid: uid(), id }));
    save.queue(); renderQueue(); openTab('queue');
    toast(`Playlist "${p.name}" ${a === 'load' ? 'loaded' : 'appended'}`, 'good');
  });
}

/* ---------------- history ---------------- */

function renderHistory() {
  $('#histList').innerHTML = S.history.slice(0, 200).map(h => {
    const c = creatorById(h.creatorId) || creatorOf(byVid(h.videoId));
    return `<li style="--cc:${safeColor(c?.color)}" class="cc-row">
    <span class="num">${esc(h.deck)}</span>
    <img class="th" src="${thumb(h.videoId)}" alt="" loading="lazy">
    <div class="grow"><div class="ttl">${esc(h.title || h.videoId)}</div><div class="sub"><i class="dot"></i>${esc(c?.name || h.artist || '')} · ${esc(h.license || '')}</div></div>
    <span class="len">${new Date(h.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></li>`;
  }).join('') || '<li class="dim">Nothing played yet.</li>';
}

function initHistoryUI() {
  $('#credShow').onclick = () => buildCredits('show');
  $('#credToday').onclick = () => buildCredits('today');
  $('#credCopy').onclick = async () => {
    if (!$('#credits').value) buildCredits(S.creditsMode);
    try { await navigator.clipboard.writeText($('#credits').value); toast('Credits copied — paste into your YouTube description', 'good'); }
    catch { $('#credits').select(); toast('Press Ctrl+C to copy'); }
  };
  $('#histClear').onclick = async () => { if (await ask('Clear the whole play log?', 'Clear')) { S.history = []; save.history(); renderHistory(); renderCreators(); } };
}

/* ---------------- settings, backup, shortcuts ---------------- */

function renderKeys() {
  const base = `${location.origin}/api/cmd/`;
  $('#keysBody').innerHTML = Object.entries(COMMANDS).map(([name, c]) => {
    const url = Remote.ok ? `${base}${name}?k=${Remote.key}` : '';
    return `<tr><td>${esc(c[0])}</td><td>${c[1] ? `<kbd>${esc(keyName(c[1]))}</kbd>` : '—'}</td>
      <td>${url ? `<code>${esc(url)}</code>` : '<span class="dim">start with the start script</span>'}</td>
      <td>${url ? `<button type="button" data-copy="${esc(url)}">Copy</button>` : ''}</td></tr>`;
  }).join('');
}

function exportData() {
  const data = Disk.snapshot();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `ivan-mixer-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.library)) throw new Error('no library in file');
    if (data.appVersion && newerVersion(data.appVersion, APP_VERSION)) toast(`This backup was made by a newer mixer (v${data.appVersion}). Importing what this version understands.`, 'bad');
    // creators first so tracks can point at them
    const crMap = {};
    (data.creators || []).forEach(raw => {
      if (!raw?.name) return;
      const chan = /^UC[\w-]{22}$/.test(raw.channelId || '') ? raw.channelId : '';
      const existing = S.creators.find(c => (chan && c.channelId === chan) || c.name.toLowerCase() === String(raw.name).toLowerCase());
      if (existing) { crMap[raw.id] = existing.id; return; }
      const c = { id: uid(), name: String(raw.name), channelId: chan, color: safeColor(raw.color), share: clamp(Math.round(+raw.share || 25), 1, 100), avatar: safeImg(raw.avatar), avatarUploaded: !!raw.avatarUploaded };
      S.creators.push(c); crMap[raw.id] = c.id;
    });
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
      if (crMap[raw.creatorId]) t.creatorId = crMap[raw.creatorId];
      if (+raw.bpm >= 40 && +raw.bpm <= 220) t.bpm = +raw.bpm;
      if (raw.beat1 != null && isFinite(+raw.beat1)) t.beat1 = +raw.beat1;
      if (+raw.energy >= 1 && +raw.energy <= 5) t.energy = Math.round(+raw.energy);
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
    save.library(); save.playlists(); save.creators();
    renderEverything();
    toast(`Imported ${added} new track(s), ${pls} playlist(s)`, 'good');
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

function renderBpmMatch() {
  const a = decks.A.track?.bpm, b = decks.B.track?.bpm;
  $('#bmA').textContent = a ? a.toFixed(1) : '—';
  $('#bmB').textContent = b ? b.toFixed(1) : '—';
  const el = $('#bmDelta');
  if (a && b) {
    const d = Math.min(...[1, 2, 0.5].map(k => Math.abs(b * k - a) / a * 100));
    el.textContent = d <= 4 ? `Δ ${d.toFixed(1)}% ✓ MIX` : `Δ ${d.toFixed(1)}%`;
    el.className = 'bm-d ' + (d <= 4 ? 'good' : d <= 8 ? 'ok' : 'bad');
  } else { el.textContent = 'TEMPO'; el.className = 'bm-d'; }
}

function initMixerUI() {
  $('#volA').value = S.cfg.volA; $('#volB').value = S.cfg.volB; $('#master').value = S.cfg.master;
  $('#fadeSec').value = S.cfg.fadeSec; $('#curve').value = S.cfg.curve;
  $('#duckLevel').value = S.cfg.duckLevel; $('#duckVal').textContent = S.cfg.duckLevel + '%';
  $('#voiceThresh').value = S.cfg.voiceThresh; $('#micThreshMark').style.left = S.cfg.voiceThresh + '%';
  $('#snapBars').checked = S.cfg.snapBars; $('#smartFill').checked = S.cfg.smartFill;

  $('#volA').oninput = e => setDeckVol('A', +e.target.value);
  $('#volB').oninput = e => setDeckVol('B', +e.target.value);
  $('#master').oninput = e => setMaster(+e.target.value);
  $('#xfader').oninput = e => setXf(+e.target.value / 1000);
  $('#curve').onchange = e => { S.cfg.curve = e.target.value; save.cfg(); applyVolumes(); };
  $('#fadeSec').onchange = e => { S.cfg.fadeSec = clamp(+e.target.value || 0, 0, 30); e.target.value = S.cfg.fadeSec; save.cfg(); };
  $('#snapBars').onchange = e => { S.cfg.snapBars = e.target.checked; save.cfg(); };
  $('#smartFill').onchange = e => { S.cfg.smartFill = e.target.checked; save.cfg(); };
  $$('.xf-snap button').forEach(b => { b.onclick = () => setXf(+b.dataset.xf); });
  $('#mixNow').onclick = mixNow;
  $('#autoDJ').onclick = () => setAutoDJ(!S.autoDJ);
  $('#talk').onclick = () => setTalk(!S.talk);
  $('#onair').onclick = toggleOnAir;
  $('#panic').onclick = panic;
  $('#stageBtn').onclick = () => setStage(true);
  $('#stageExit').onclick = () => setStage(false);
  $('#stageFull').onclick = toggleFullscreen;
  $('#helpBtn').onclick = () => $('#help').classList.remove('hidden');
  $('#helpClose').onclick = () => $('#help').classList.add('hidden');
  $('#modalOk').onclick = () => modalDone && modalDone(true);
  $('#modalCancel').onclick = () => modalDone && modalDone(false);
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

function renderAll() { Object.values(decks).forEach(d => d.render()); renderMeters(); renderBpmMatch(); renderStage(); }

function renderEverything() {
  renderCreators(); renderInbox(); renderQueue(); renderLibrary(); renderPlaylists(); renderHistory(); renderKeys(); renderAll();
}

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

// Any song or creator picture that fails to load gets a neutral placeholder.
document.addEventListener('error', e => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.src !== NO_IMG && !img.closest('.platter')) img.src = NO_IMG;
}, true);

function boot() {
  decks.A = new Deck('A', $('#mountA'));
  decks.B = new Deck('B', $('#mountB'));
  Tip.init();
  initMixerUI(); initQueueUI(); initSmartUI(); initLibraryUI(); initCreatorsUI(); initImportUI(); initPlaylistsUI(); initHistoryUI(); initSettingsUI();
  $$('.tabs button').forEach(b => { b.onclick = () => openTab(b.dataset.tab); });
  renderEverything(); renderVersion(); syncXfUI(); applyVolumes();
  Remote.init().then(() => setTimeout(() => Creators.checkAll(false), 4000));

  // Look for new uploads every 30 minutes, but never while on air.
  setInterval(() => { if (!S.onAir) Creators.checkAll(false); }, 30 * 60 * 1000);

  if (location.protocol === 'file:') $('#fileWarn').classList.remove('hidden');
  $('#power').onclick = () => { $('#splash').classList.add('hidden'); if (!S.library.length && !S.creators.length) $('#help').classList.remove('hidden'); };

  setTimeout(() => {
    if (!S.ytReady) { const p = $('#ytStatus'); p.textContent = 'YouTube: not loading — check internet'; p.className = 'pill bad'; }
  }, 10000);

  window.addEventListener('beforeunload', e => {
    if (decks.A.isPlaying() || decks.B.isPlaying() || S.onAir) { e.preventDefault(); e.returnValue = ''; }
  });

  setInterval(tick, 100);
}

boot();

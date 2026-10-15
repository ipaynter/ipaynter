/* Late Night with Ivan — Share tab.
 * Plays the two YouTube decks full-window and shows the creator badge.
 * Everything is controlled by the Mixer tab through a same-origin BroadcastChannel.
 * Share THIS tab in StreamYard (with tab audio): the music comes from here.
 */
'use strict';

const YT_HOST = 'https://www.youtube-nocookie.com';
const ch = new BroadcastChannel('iii-mixer');
const $ = id => document.getElementById(id);
const P = {}, ready = {}, pending = { A: [], B: [] };
let activated = false, lastMixer = 0;

// Each Share tab has its own ID, so the mixer can tell a reopened tab from the old one.
const INSTANCE = Math.random().toString(36).slice(2) + Date.now().toString(36);
const post = m => { try { ch.postMessage({ ...m, vid: INSTANCE }); } catch { /* channel closed */ } };
// Only these player functions may be called from the mixer.
const ALLOWED = new Set(['loadVideoById', 'cueVideoById', 'playVideo', 'pauseVideo', 'stopVideo', 'seekTo', 'setVolume', 'mute', 'unMute']);
const safeImg = u => (u === 'logo-ivan.png' || /^https:\/\/(yt3\.ggpht\.com|yt3\.googleusercontent\.com|i\.ytimg\.com)\/[\w\-./=~%?&]+$/.test(u || '') ||
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u || '')) ? u : '';
const safeColor = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#22d3ee');
// Overlays: a file stored by the mixer, or a plain http(s) link. Shown only as <img> or <video>, never as a page.
const safeOvSrc = s => (/^\/overlay\/[a-f0-9]{24}\.(png|jpg|gif|webp|mp4|webm)$/.test(s || '') || /^https?:\/\/[^\s"'<>\\]+$/i.test(s || '')) ? s : '';
const OV_POS = new Set(['big', 'full', 'corner', 'lower']);

// One deck = a YouTube player (needs the internet) + Chrome's own player for song files
// stored on this computer (works with no internet at all, like a mixtape).
const FILE_RE = /^file:([a-f0-9]{24}\.(mp3|m4a|aac|wav|ogg|flac|mp4|webm))$/;
const AUDIO_ONLY = new Set(['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac']);
let ytFailed = false;   // the YouTube player script could not load (offline)
class DeckPlayer {
  constructor(id) {
    this.id = id; this.yt = null; this.ytReady = false; this.ytQueue = [];
    this.mode = 'yt'; this.vid = null; this.state = -1; this.vol = 100; this.muted = false;
    const v = this.el = document.createElement('video');
    v.className = 'filevid'; v.playsInline = true; v.preload = 'auto';
    $('wrap' + id).append(v);
    const st = s => { this.state = s; if (this.mode === 'file') post({ t: 'state', deck: id, s }); };
    v.addEventListener('playing', () => st(1));
    v.addEventListener('pause', () => { if (!v.ended) st(2); });
    v.addEventListener('ended', () => st(0));
    v.addEventListener('waiting', () => { if (!v.paused) st(3); });
    v.addEventListener('error', () => { if (this.mode === 'file' && v.getAttribute('src')) post({ t: 'error', deck: id, code: 'file' }); });
  }
  attachYT() {
    this.yt = new YT.Player('v' + this.id, {
      host: YT_HOST, width: '100%', height: '100%',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, playsinline: 1, origin: location.origin },
      events: {
        onReady: () => { this.ytReady = true; this.ytQueue.splice(0).forEach(([fn, args]) => this.ytCall(fn, ...args)); },
        onStateChange: e => { if (this.mode === 'yt') post({ t: 'state', deck: this.id, s: e.data }); },
        onError: e => { if (this.mode === 'yt') post({ t: 'error', deck: this.id, code: e.data }); }
      }
    });
  }
  ytCall(fn, ...args) {
    if (this.ytReady) { try { this.yt[fn](...args); } catch { /* busy */ } return; }
    if (fn === 'loadVideoById' || fn === 'cueVideoById') {
      if (ytFailed) { post({ t: 'error', deck: this.id, code: 'offline' }); return; }
      this.ytQueue = this.ytQueue.filter(([f]) => f !== 'loadVideoById' && f !== 'cueVideoById');
    }
    this.ytQueue.push([fn, args]);
  }
  load(o, play) {
    const m = FILE_RE.exec(o && o.videoId || '');
    const v = this.el;
    if (m) {
      this.mode = 'file'; this.vid = o.videoId;
      this.ytCall('stopVideo');
      $('wrap' + this.id).classList.add('file');
      $('wrap' + this.id).classList.toggle('audio', AUDIO_ONLY.has(m[2]));
      v.src = '/media/' + m[1];
      try { v.currentTime = Math.max(0, +o.startSeconds || 0); } catch { /* set once loaded */ }
      v.addEventListener('loadedmetadata', () => { try { v.currentTime = Math.max(0, +o.startSeconds || 0); } catch { /* fine */ } }, { once: true });
      this.applyVol();
      this.state = 5; post({ t: 'state', deck: this.id, s: 5 });
      if (play) v.play().catch(() => {});
    } else {
      this.mode = 'yt'; this.vid = null;
      if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); }
      $('wrap' + this.id).classList.remove('file', 'audio');
      this.ytCall(play ? 'loadVideoById' : 'cueVideoById', o);
    }
  }
  loadVideoById(o) { this.load(o, true); }
  cueVideoById(o) { this.load(o, false); }
  playVideo() { if (this.mode === 'file') this.el.play().catch(() => {}); else this.ytCall('playVideo'); }
  pauseVideo() { if (this.mode === 'file') this.el.pause(); else this.ytCall('pauseVideo'); }
  stopVideo() { if (this.mode === 'file') { this.el.pause(); this.state = 5; } else this.ytCall('stopVideo'); }
  seekTo(t) { if (this.mode === 'file') { try { this.el.currentTime = Math.max(0, +t || 0); } catch { /* fine */ } } else this.ytCall('seekTo', t, true); }
  applyVol() { this.el.volume = Math.max(0, Math.min(1, this.vol / 100)); this.el.muted = this.muted; }
  setVolume(v) { this.vol = +v || 0; this.applyVol(); this.ytCall('setVolume', v); }
  mute() { this.muted = true; this.applyVol(); this.ytCall('mute'); }
  unMute() { this.muted = false; this.applyVol(); this.ytCall('unMute'); }
  getCurrentTime() { return this.mode === 'file' ? this.el.currentTime || 0 : (this.ytReady ? this.yt.getCurrentTime?.() || 0 : 0); }
  getDuration() { return this.mode === 'file' ? (isFinite(this.el.duration) ? this.el.duration : 0) : (this.ytReady ? this.yt.getDuration?.() || 0 : 0); }
  getPlayerState() { return this.mode === 'file' ? this.state : (this.ytReady ? this.yt.getPlayerState?.() : -1); }
  getVideoData() { return this.mode === 'file' ? { video_id: this.vid } : (this.ytReady ? this.yt.getVideoData?.() || {} : {}); }
}
for (const id of ['A', 'B']) { P[id] = new DeckPlayer(id); ready[id] = true; }

function run(m) {
  const p = P[m.deck];
  if (!p || !ALLOWED.has(m.fn) || typeof p[m.fn] !== 'function') return;
  try { p[m.fn](...(Array.isArray(m.args) ? m.args : [])); } catch { /* player busy */ }
}

let badgeSig = '';
const BADGE_POS = new Set(['tl', 'tr', 'bl']);

function display(m) {
  overlay(m.ov);
  const corner = m.ov && m.ov.pos === 'corner';
  $('bug').classList.toggle('hidden', !m.logo || corner);
  for (const id of ['A', 'B']) {
    const w = $('wrap' + id), d = m[id] || {};
    w.style.opacity = String(Math.max(0, Math.min(1, +d.op || 0)));
    w.style.zIndex = d.top ? 2 : 1;
  }
  const b = m.badge;
  const badge = $('badge');
  if (!b) {
    if (badgeSig && !badge.classList.contains('hidden')) {   // slide away, then hide
      badge.classList.add('leave'); const was = badgeSig;
      setTimeout(() => { if (badgeSig === '' && was) badge.classList.add('hidden'); badge.classList.remove('leave'); }, 500);
    }
    badgeSig = ''; return;
  }
  const pos = BADGE_POS.has(b.pos) ? b.pos : 'tl';
  document.body.classList.toggle('badge-tr', pos === 'tr');
  const sig = [b.name, b.song, b.avatar, b.color, pos].join('|');
  if (sig === badgeSig) return;
  badgeSig = sig;
  badge.className = 'badge pos-' + pos;
  badge.style.setProperty('--cc', safeColor(b.color));
  const av = safeImg(b.avatar);
  if (av) $('avatar').src = av; else $('avatar').removeAttribute('src');
  $('name').textContent = String(b.name || '');
  $('song').textContent = String(b.song || '');
  badge.classList.remove('hidden', 'enter'); void badge.offsetWidth; badge.classList.add('enter');
}

let ovSig = '', ovTimer = null;
function overlay(o) {
  const box = $('ov');
  const src = o && safeOvSrc(o.src);
  if (!src) {
    if (ovSig) { ovSig = ''; box.classList.remove('show'); clearTimeout(ovTimer); ovTimer = setTimeout(() => { if (!ovSig) box.replaceChildren(); }, 500); }
    return;
  }
  const pos = OV_POS.has(o.pos) ? o.pos : 'big';
  if (o.k === ovSig) { box.className = 'ov show pos-' + pos; return; } // same overlay; position may change
  ovSig = String(o.k);
  clearTimeout(ovTimer);
  const el = document.createElement(o.kind === 'video' ? 'video' : 'img');
  if (o.kind === 'video') {
    el.playsInline = true; el.muted = !o.sound; el.loop = !!o.loop;
    const k = ovSig;
    el.onended = () => post({ t: 'ovEnd', k });
    el.src = src;
    el.play().catch(() => { el.muted = true; el.play().catch(() => {}); });
  } else {
    el.alt = ''; el.src = src;
  }
  box.replaceChildren(el);
  box.className = 'ov pos-' + pos;
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('show')));
}

function hello() { post({ t: 'hello', ready: { A: !!ready.A, B: !!ready.B }, activated }); }

let standby = false;
function setStandby(on) {
  standby = on;
  $('dup').classList.toggle('hidden', !on);
  if (on) for (const id of ['A', 'B']) { try { P[id]?.pauseVideo(); P[id]?.mute(); } catch { /* fine */ } }
  else for (const id of ['A', 'B']) { try { P[id]?.unMute(); } catch { /* fine */ } }
}

ch.onmessage = e => {
  const m = e.data || {};
  lastMixer = Date.now();
  if (m.t === 'standby') { if (m.to === INSTANCE && !standby) setStandby(true); return; }
  if (m.t === 'active') { if (m.to === INSTANCE && standby) setStandby(false); return; }
  if (standby && m.t !== 'ping') return;   // another Share tab is the live one
  if (m.t === 'cmd' && (m.deck === 'A' || m.deck === 'B')) { if (ready[m.deck]) run(m); else pending[m.deck].push(m); }
  else if (m.t === 'display') display(m);
  else if (m.t === 'ping') hello();
  else if (m.t === 'quit') { for (const id of ['A', 'B']) { try { P[id]?.pauseVideo(); } catch { /* fine */ } } setTimeout(() => window.close(), 400); }
};

window.onYouTubeIframeAPIReady = () => { P.A.attachYT(); P.B.attachYT(); };
// No internet: YouTube songs report "offline" so the board can skip them; song files keep playing.
window.ytLoadFailed = () => { ytFailed = true; for (const id of ['A', 'B']) if (P[id].ytQueue.some(([f]) => f === 'loadVideoById' || f === 'cueVideoById')) { P[id].ytQueue = []; post({ t: 'error', deck: id, code: 'offline' }); } };
setTimeout(() => { if (!window.YT || !window.YT.Player) window.ytLoadFailed(); }, 12000);
// Internet back: load YouTube's player now, so YouTube songs work again without a reload.
addEventListener('online', () => {
  if (window.YT && window.YT.Player) return;
  ytFailed = false;
  const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api';
  sc.onerror = () => window.ytLoadFailed(); document.head.append(sc);
});

// Report play position to the mixer 10x a second (this also keeps the mixer's timing exact in the background).
setInterval(() => {
  const out = { t: 'tick', lv: levels() };
  for (const id of ['A', 'B']) {
    const p = P[id];
    if (!ready[id] || !p) continue;
    const vd = p.getVideoData?.() || {};
    out[id] = { time: p.getCurrentTime?.() || 0, dur: p.getDuration?.() || 0, state: p.getPlayerState?.(), vd: { video_id: vd.video_id, title: vd.title, author: vd.author } };
  }
  post(out);
  $('status').classList.toggle('hidden', activated === false || Date.now() - lastMixer < 3000);
}, 100);

// Level meters: this tab listens to its OWN sound (the same sound StreamYard picks up)
// and sends left / right levels to the board's MUSIC OUT meters. Chrome asks once: "Share this tab?"
let meter = null;
async function startMeter() {
  if (meter || !navigator.mediaDevices?.getDisplayMedia) return;
  try {
    const st = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 1 }, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false },
      preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude', systemAudio: 'exclude'
    });
    st.getVideoTracks().forEach(t => { t.enabled = false; });   // only the sound is needed
    const at = st.getAudioTracks()[0];
    if (!at) { st.getTracks().forEach(t => t.stop()); return; }
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(new MediaStream([at]));
    const sp = ctx.createChannelSplitter(2); src.connect(sp);
    const an = [0, 1].map(i => { const a = ctx.createAnalyser(); a.fftSize = 1024; sp.connect(a, i); return a; });
    meter = { ctx, an, buf: new Float32Array(1024), st };
    at.addEventListener('ended', () => { meter = null; try { ctx.close(); } catch { /* fine */ } });
  } catch { meter = null; /* declined: the board shows an estimate instead */ }
}
// [left, right], each [peak, rms] from 0 to 1
function levels() {
  if (!meter) return null;
  return meter.an.map(a => {
    a.getFloatTimeDomainData(meter.buf);
    let pk = 0, sum = 0;
    for (const v of meter.buf) { const x = v < 0 ? -v : v; if (x > pk) pk = x; sum += v * v; }
    return [+pk.toFixed(4), +Math.sqrt(sum / meter.buf.length).toFixed(4)];
  });
}

$('connect').onclick = () => { activated = true; $('connect').classList.add('hidden'); hello(); startMeter(); };
document.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') startMeter();   // turn the level meters on, if "Share" was not clicked
  if (e.key === 'f' || e.key === 'F') {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }
});
document.addEventListener('dblclick', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); });

// Hide the mouse pointer when it is still, so it never shows on stream.
let idleTimer = null;
document.addEventListener('mousemove', () => {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 2000);
});

addEventListener('pagehide', () => post({ t: 'bye' }));
hello();

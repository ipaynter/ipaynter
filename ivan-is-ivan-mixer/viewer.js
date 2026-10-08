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
const safeImg = u => (/^https:\/\/(yt3\.ggpht\.com|yt3\.googleusercontent\.com|i\.ytimg\.com)\/[\w\-./=~%?&]+$/.test(u || '') ||
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u || '')) ? u : '';
const safeColor = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#22d3ee');
// Overlays: a file stored by the mixer, or a plain http(s) link. Shown only as <img> or <video>, never as a page.
const safeOvSrc = s => (/^\/overlay\/[a-f0-9]{24}\.(png|jpg|gif|webp|mp4|webm)$/.test(s || '') || /^https?:\/\/[^\s"'<>\\]+$/i.test(s || '')) ? s : '';
const OV_POS = new Set(['big', 'full', 'corner', 'lower']);

function makePlayer(id) {
  P[id] = new YT.Player('v' + id, {
    host: YT_HOST, width: '100%', height: '100%',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, playsinline: 1, origin: location.origin },
    events: {
      onReady: () => { ready[id] = true; pending[id].splice(0).forEach(run); post({ t: 'ready', deck: id }); },
      onStateChange: e => post({ t: 'state', deck: id, s: e.data }),
      onError: e => post({ t: 'error', deck: id, code: e.data })
    }
  });
}

function run(m) {
  const p = P[m.deck];
  if (!p || !ALLOWED.has(m.fn) || typeof p[m.fn] !== 'function') return;
  try { p[m.fn](...(Array.isArray(m.args) ? m.args : [])); } catch { /* player busy */ }
}

let badgeSig = '';
function display(m) {
  overlay(m.ov);
  for (const id of ['A', 'B']) {
    const w = $('wrap' + id), d = m[id] || {};
    w.style.opacity = String(Math.max(0, Math.min(1, +d.op || 0)));
    w.style.zIndex = d.top ? 2 : 1;
  }
  const b = m.badge;
  const badge = $('badge');
  if (!b) { badge.classList.add('hidden'); badgeSig = ''; return; }
  const sig = [b.name, b.song, b.avatar, b.color].join('|');
  if (sig === badgeSig) return;
  badgeSig = sig;
  badge.style.setProperty('--cc', safeColor(b.color));
  $('avatar').src = safeImg(b.avatar) || '';
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

ch.onmessage = e => {
  const m = e.data || {};
  lastMixer = Date.now();
  if (m.t === 'cmd' && (m.deck === 'A' || m.deck === 'B')) { if (ready[m.deck]) run(m); else pending[m.deck].push(m); }
  else if (m.t === 'display') display(m);
  else if (m.t === 'ping') hello();
};

window.onYouTubeIframeAPIReady = () => { makePlayer('A'); makePlayer('B'); };

// Report play position to the mixer 10x a second (this also keeps the mixer's timing exact in the background).
setInterval(() => {
  const out = { t: 'tick' };
  for (const id of ['A', 'B']) {
    const p = P[id];
    if (!ready[id] || !p) continue;
    const vd = p.getVideoData?.() || {};
    out[id] = { time: p.getCurrentTime?.() || 0, dur: p.getDuration?.() || 0, state: p.getPlayerState?.(), vd: { video_id: vd.video_id, title: vd.title, author: vd.author } };
  }
  post(out);
  $('status').classList.toggle('hidden', activated === false || Date.now() - lastMixer < 3000);
}, 100);

$('connect').onclick = () => { activated = true; $('connect').classList.add('hidden'); hello(); };
document.addEventListener('keydown', e => {
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

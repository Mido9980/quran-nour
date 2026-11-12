/* EASY QURAN — نور | EASY CODE · offline Quran app */
(function () {
'use strict';

const Q = window.QURAN || [];
const I18 = window.I18N || {};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const K = { last:'nq_last', saved:'nq_saved', th:'nq_theme', fs:'nq_fs', font:'nq_font', lang:'nq_lang', mode:'nq_mode' };

let LANG = localStorage.getItem(K.lang) || 'ar';
let TH   = localStorage.getItem(K.th) || 'light';
let FS   = +(localStorage.getItem(K.fs) || 32);
let FONT = localStorage.getItem(K.font) || 'amiri';
let MODE = localStorage.getItem(K.mode) || 'cards';
let SAVED = [];
try { SAVED = JSON.parse(localStorage.getItem(K.saved) || '[]'); } catch (e) { SAVED = []; }

let TAB = 'surah', curSurah = null, curAyah = null, picked = null, FLAT = [], FLATN = null;

const t = k => (I18[LANG] && I18[LANG][k]) || (I18.ar && I18.ar[k]) || k;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const AR = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
const num = n => (LANG === 'ar' || LANG === 'ur') ? AR(n) : String(n);

function toast(m, ms) {
  const el = $('#toast'); if (!el) return;
  el.textContent = m; el.classList.add('on');
  clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove('on'), ms || 1900);
}

function norm(s) {
  return String(s)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const BASM = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
(function stripBasmala() {
  Q.forEach(s => {
    if (s.n === 1 || s.n === 9) return;
    const a = s.ayahs[0];
    if (a && a[1].indexOf(BASM) === 0) a[1] = a[1].slice(BASM.length).trim();
  });
})();

function buildFlat() {
  FLAT = [];
  Q.forEach(s => s.ayahs.forEach(a => FLAT.push({ s: s.n, a: a[0], x: a[1] })));
}

/* ---------- language ---------- */
function applyLang() {
  const meta = I18[LANG] || I18.ar;
  document.documentElement.lang = LANG;
  document.documentElement.dir = meta.dir || 'rtl';
  localStorage.setItem(K.lang, LANG);
  $$('[data-i]').forEach(el => { el.textContent = t(el.dataset.i); });
  $$('[data-i-ph]').forEach(el => { el.placeholder = t(el.dataset.iPh); });
  buildLangList(); buildList(); renderLast(); renderSaved(); renderHero();
  if (curSurah) renderSurah(curSurah, false);
  applyFont();
}

function buildLangList() {
  const langs = Object.keys(I18);
  const list = $('#langList');
  if (list) {
    list.innerHTML = langs.map(k => `<button class="langrow ${k === LANG ? 'on' : ''}" data-l="${k}">
      <span class="fl">${I18[k].flag || ''}</span> <span>${esc(I18[k].name)}</span>
      ${k === LANG ? '<span class="tick">✓</span>' : ''}</button>`).join('');
    $$('#langList .langrow').forEach(b => b.onclick = () => {
      LANG = b.dataset.l; applyLang(); $('#langSheet').classList.remove('on');
    });
  }
  const chips = $('#langChipsHome');
  if (chips) {
    chips.innerHTML = langs.map(k => `<button class="${k === LANG ? 'on' : ''}" data-l2="${k}">${I18[k].flag || ''} ${esc(I18[k].name)}</button>`).join('');
    chips.querySelectorAll('[data-l2]').forEach(b => b.onclick = () => { LANG = b.dataset.l2; applyLang(); });
  }
}

/* ---------- theme / font / mode ---------- */
function applyTheme() {
  document.documentElement.setAttribute('data-th', TH);
  localStorage.setItem(K.th, TH);
  $$('#themeChips button').forEach(b => b.classList.toggle('on', b.dataset.th === TH));
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', TH === 'dark' ? '#080c1a' : TH === 'sepia' ? '#4a2c11' : '#141d46');
}

function applyFont() {
  const fam = FONT === 'amiri' ? 'Amiri, serif' : 'inherit';
  $$('.hero-ayah, .sample, .bism').forEach(el => { el.style.fontFamily = fam; });
  const fv = $('#fsVal'); if (fv) fv.textContent = num(FS);
  const sm = $('#fsSample');
  if (sm) { sm.style.fontSize = Math.round(FS * .86) + 'px'; sm.style.fontFamily = fam; }
  $$('#fontChips button').forEach(b => b.classList.toggle('on', b.dataset.f === FONT));
  localStorage.setItem(K.fs, FS); localStorage.setItem(K.font, FONT);
  paintAyahSizes();
}

function paintAyahSizes() {
  const fam = FONT === 'amiri' ? 'Amiri, serif' : 'inherit';
  $$('.ayah-card .at').forEach(el => { el.style.fontFamily = fam; el.style.fontSize = FS + 'px'; });
  $$('.mushaf-text').forEach(el => { el.style.fontFamily = fam; el.style.fontSize = FS + 'px'; });
  $$('.rt').forEach(el => { el.style.fontFamily = fam; });
}

function applyMode() {
  $$('#modeBar button').forEach(b => b.classList.toggle('on', b.dataset.m === MODE));
  localStorage.setItem(K.mode, MODE);
}

/* ---------- navigation ---------- */
function go(page) {
  $$('.page').forEach(p => p.classList.remove('on'));
  const el = $('#pg' + page); if (el) el.classList.add('on');
  const bb = $('#backBtn'); if (bb) bb.hidden = (page === 'Home');
  const brand = $('#brandBox');
  if (brand) { brand.style.visibility = page === 'Home' ? 'visible' : 'visible'; }
  $$('#bottomNav button').forEach(b => {
    const p = b.dataset.p;
    b.classList.toggle('on', p === page || (page === 'Read' && p === 'Home'));
  });
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (page === 'Home') { buildList(); renderLast(); renderHero(); }
  if (page === 'Saved') renderSaved();
  if (page === 'Search') setTimeout(() => { const q = $('#q2'); if (q) q.focus(); }, 80);
}
window.go = go;

/* ---------- hero verse of the day ---------- */
function renderHero() {
  const box = $('#heroAyah'); if (!box || !FLAT.length) return;
  const d = new Date();
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const item = FLAT[(doy * 41 + d.getFullYear()) % FLAT.length];
  const su = Q[item.s - 1];
  box.textContent = item.x.length > 230 ? item.x.slice(0, 230) + '…' : item.x;
  const ref = $('#heroRef');
  if (ref) ref.textContent = `${t('surah')} ${su ? su.name : ''} · ${t('ayah')} ${num(item.a)}`;
  const card = $('#heroCard');
  if (card) card.onclick = () => openSurah(item.s, item.a);
}

/* ---------- lists ---------- */
function surahStartJuz() {
  const starts = {};
  Q.forEach(s => s.ayahs.forEach(a => { if (!starts[a[2]]) starts[a[2]] = { s: s.n, name: s.name, a: a[0] }; }));
  return starts;
}

function buildList() {
  const box = $('#listBox'); if (!box) return;
  const fw = $('#filterWrap');
  if (fw) fw.style.display = TAB === 'surah' ? 'block' : 'none';

  if (TAB === 'surah') {
    const f = norm(($('#flt') && $('#flt').value) || '');
    const rows = Q.filter(s => {
      if (!f) return true;
      return norm(s.name).indexOf(f) === 0 || norm(s.name).indexOf(' ' + f) > -1 ||
             String(s.n) === f || norm(s.en || '').toLowerCase().indexOf(f) > -1;
    });
    if (!rows.length) { box.innerHTML = `<div class="empty"><b>${esc(t('no_results'))}</b></div>`; return; }
    box.innerHTML = rows.map(s => `<div class="srow" data-s="${s.n}">
      <div class="snum">${num(s.n)}</div>
      <div class="mid"><b>${esc(s.name)}</b>
        <i>${s.type === 'Medinan' ? t('medinan') : t('meccan')} · ${num(s.count)} ${t('ayahs')}</i></div>
      <span class="chev">›</span></div>`).join('');
    box.querySelectorAll('.srow').forEach(r => r.onclick = () => openSurah(+r.dataset.s));
  } else {
    const starts = surahStartJuz();
    box.innerHTML = Object.keys(starts).map(Number).sort((x, y) => x - y).map(j => {
      const st = starts[j];
      return `<div class="srow" data-s="${st.s}" data-a="${st.a}">
        <div class="snum">${num(j)}</div>
        <div class="mid"><b>${t('juz')} ${num(j)}</b>
          <i>${t('starts_from')} ${esc(st.name)} · ${t('ayah')} ${num(st.a)}</i></div>
        <span class="chev">›</span></div>`;
    }).join('');
    box.querySelectorAll('.srow').forEach(r => r.onclick = () => openSurah(+r.dataset.s, +r.dataset.a));
  }
}

/* ---------- last read ---------- */
function saveLast(s, a) {
  localStorage.setItem(K.last, JSON.stringify({ s: s, a: a, t: Date.now() }));
}
function renderLast() {
  const el = $('#lastRead'); if (!el) return;
  const raw = localStorage.getItem(K.last);
  if (!raw) { el.hidden = true; return; }
  let d; try { d = JSON.parse(raw); } catch (e) { el.hidden = true; return; }
  const s = Q[d.s - 1]; if (!s) { el.hidden = true; return; }
  el.hidden = false;
  const cap = el.querySelector('.lr-cap'); if (cap) cap.textContent = t('last_read');
  $('#lrName').textContent = t('surah') + ' ' + s.name;
  $('#lrAyah').textContent = t('ayah') + ' ' + num(d.a) + ' · ' + num(s.count) + ' ' + t('ayahs');
  el.onclick = () => openSurah(d.s, d.a);
}

/* ---------- reader ---------- */
function renderSurah(n, scroll) {
  const s = Q[n - 1]; if (!s) return;
  curSurah = n;
  const showBism = (s.n !== 1 && s.n !== 9);
  $('#rhTitle').textContent = t('surah') + ' ' + s.name;
  $('#rhSub').textContent = (s.type === 'Medinan' ? t('medinan') : t('meccan')) + ' · ' + num(s.count) + ' ' + t('ayahs');

  const box = $('#ayatBox');
  if (MODE === 'cards') {
    box.innerHTML = (showBism ? `<div class="bism">${BASM}</div>` : '') + s.ayahs.map(a => {
      const isSaved = SAVED.some(x => x.s === s.n && x.a === a[0]);
      return `<div class="ayah-card${isSaved ? ' saved' : ''}" data-a="${a[0]}">
        <span class="an">${num(a[0])}</span>
        <p class="at">${esc(a[1])}</p></div>`;
    }).join('');
    box.querySelectorAll('.ayah-card').forEach(el => el.onclick = ev => pickAyah(s.n, +el.dataset.a, ev));
  } else {
    box.innerHTML = `<p class="mushaf-text">${showBism ? `<span class="bism-inline">${BASM}</span><br>` : ''}` +
      s.ayahs.map(a => {
        const isSaved = SAVED.some(x => x.s === s.n && x.a === a[0]);
        return `<span class="aya${isSaved ? ' saved' : ''}" data-a="${a[0]}">${esc(a[1])}<span class="num">${num(a[0])}</span> </span>`;
      }).join('') + '</p>';
    box.querySelectorAll('.aya').forEach(el => el.onclick = ev => pickAyah(s.n, +el.dataset.a, ev));
  }

  $('#readFoot').innerHTML = `<div class="navrow">
      ${s.n > 1 ? `<button data-go="${s.n - 1}">‹ ${t('prev')}</button>` : ''}
      ${s.n < 114 ? `<button data-go="${s.n + 1}">${t('next')} ›</button>` : ''}
    </div>`;
  $('#readFoot').querySelectorAll('[data-go]').forEach(b => b.onclick = () => openSurah(+b.dataset.go));
  applyMode();
  paintAyahSizes();
  if (scroll) go('Read');
}

function openSurah(n, focusAyah) {
  if (!Q[n - 1]) return;
  curSurah = n;
  renderSurah(n, true);
  if (focusAyah) {
    const el = document.querySelector(`[data-a="${focusAyah}"]`);
    if (el) setTimeout(() => {
      el.scrollIntoView({ block: 'center' });
      const old = el.style.boxShadow;
      el.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--gold) 55%, transparent)';
      setTimeout(() => { el.style.boxShadow = old; }, 1500);
    }, 140);
  }
  saveLast(n, focusAyah || 1);
  curAyah = focusAyah || null;
}
window.openSurah = openSurah;

let scrollTick = false;
function onScroll() {
  if (scrollTick) return;
  scrollTick = true;
  requestAnimationFrame(() => {
    scrollTick = false;
    if (!$('#pgRead').classList.contains('on') || !curSurah) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    const pf = $('#progFill'); if (pf) pf.style.width = p + '%';

    const nodes = $$('#ayatBox [data-a]'); if (!nodes.length) return;
    let best = nodes[0], bestD = 1e9; const mid = window.innerHeight * .38;
    nodes.forEach(a => { const r = a.getBoundingClientRect(); const d = Math.abs(r.top - mid); if (d < bestD) { bestD = d; best = a; } });
    const nAyah = +best.dataset.a;
    if (nAyah && nAyah !== curAyah) { curAyah = nAyah; saveLast(curSurah, nAyah); }
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- ayah sheet ---------- */
function pickAyah(s, a, ev) {
  if (ev) ev.stopPropagation();
  const su = Q[s - 1]; if (!su) return;
  const ay = su.ayahs.find(x => x[0] === a);
  picked = { s: s, a: a, su: su, text: ay ? ay[1] : '' };
  $('#sheetT').textContent = `${t('surah')} ${su.name} · ${t('ayah')} ${num(a)}`;
  const isSaved = SAVED.some(x => x.s === s && x.a === a);
  $('#actSave').textContent = isSaved ? t('unsave_ayah') : t('save_ayah');
  $('#sheet').classList.add('on');
}
window.pickAyah = pickAyah;

function closeSheet() { $('#sheet').classList.remove('on'); }

function repaintSavedMarks() {
  if (!curSurah) return;
  $$('#ayatBox [data-a]').forEach(el => {
    const a = +el.dataset.a;
    el.classList.toggle('saved', SAVED.some(x => x.s === curSurah && x.a === a));
  });
}

function act(kind) {
  if (!picked) return;
  const { s, a, su, text } = picked;
  if (kind === 'save') {
    const i = SAVED.findIndex(x => x.s === s && x.a === a);
    if (i > -1) { SAVED.splice(i, 1); toast(t('removed_ok')); }
    else { SAVED.push({ s: s, a: a }); toast(t('saved_ok')); }
    localStorage.setItem(K.saved, JSON.stringify(SAVED));
    repaintSavedMarks(); renderSaved();
    closeSheet();
  } else if (kind === 'copy') {
    const body = `${text}\n\n${su.name} — ${t('ayah')} ${num(a)}\n${location.origin}${location.pathname}#s:${s}:${a}`;
    const done = () => { toast(t('copied')); closeSheet(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(body).then(done).catch(() => toast(t('copy_fail')));
    else {
      const ta = document.createElement('textarea');
      ta.value = body; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(t('copy_fail')); }
      ta.remove();
    }
  } else if (kind === 'share') {
    const body = `${text}\n\n${su.name} — ${t('ayah')} ${num(a)}\n${location.origin}${location.pathname}#s:${s}:${a}`;
    if (navigator.share) navigator.share({ title: t('app'), text: body }).then(() => closeSheet()).catch(() => {});
    else toast(t('share_fail'));
  } else if (kind === 'start') {
    saveLast(s, a); toast(t('pos_saved')); closeSheet();
  }
}

/* ---------- saved ---------- */
function renderSaved() {
  const box = $('#savedBox'); if (!box) return;
  if (!SAVED.length) {
    box.innerHTML = `<div class="empty"><b>${esc(t('no_saved'))}</b>${esc(t('no_saved_h'))}</div>`;
    return;
  }
  const items = SAVED.slice().reverse();
  box.innerHTML = items.map(x => {
    const s = Q[x.s - 1]; if (!s) return '';
    const a = s.ayahs.find(y => y[0] === x.a); if (!a) return '';
    return `<div class="res-wrap"><div class="res" data-s="${x.s}" data-a="${x.a}">
        <div class="rh">${esc(s.name)} · ${t('ayah')} ${num(x.a)}</div>
        <div class="rt">${esc(a[1].length > 140 ? a[1].slice(0, 140) + '…' : a[1])}</div>
      </div><button class="del" data-del="${x.s}:${x.a}" aria-label="remove">✕</button></div>`;
  }).join('');
  box.querySelectorAll('.res').forEach(r => r.onclick = () => openSurah(+r.dataset.s, +r.dataset.a));
  box.querySelectorAll('.del').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const [s, a] = b.dataset.del.split(':').map(Number);
    SAVED = SAVED.filter(x => !(x.s === s && x.a === a));
    localStorage.setItem(K.saved, JSON.stringify(SAVED));
    renderSaved(); repaintSavedMarks(); toast(t('removed_ok'));
  });
}

/* ---------- search ---------- */
function doSearch(v) {
  const box = $('#resBox'); if (!box) return;
  const nq = norm(v);
  if (nq.length < 2) {
    box.innerHTML = `<div class="hint">${esc(t('search_hint'))}</div>`;
    return;
  }
  if (!FLATN) FLATN = FLAT.map(f => norm(f.x));
  const hits = [];
  for (let i = 0; i < FLAT.length && hits.length < 150; i++) {
    if (FLATN[i].indexOf(nq) > -1) hits.push(FLAT[i]);
  }
  if (!hits.length) { box.innerHTML = `<div class="hint">${esc(t('no_results'))}</div>`; return; }

  const marked = txt => {
    const idx = txt.indexOf(v.trim());
    if (idx < 0) return esc(txt);
    const q = v.trim();
    return esc(txt.slice(0, idx)) + '<mark>' + esc(txt.slice(idx, idx + q.length)) + '</mark>' + esc(txt.slice(idx + q.length));
  };
  box.innerHTML = `<div class="count">${num(hits.length)} ${esc(t('results'))}</div>` + hits.map(f => {
    const s = Q[f.s - 1];
    return `<div class="res" data-s="${f.s}" data-a="${f.a}">
      <div class="rh">${esc(s.name)} · ${t('ayah')} ${num(f.a)}</div>
      <div class="rt">${marked(f.x)}</div></div>`;
  }).join('');
  box.querySelectorAll('.res').forEach(r => r.onclick = () => openSurah(+r.dataset.s, +r.dataset.a));
}

/* ---------- boot / events ---------- */
function boot() {
  buildFlat();
  applyLang(); applyTheme(); applyMode();

  $('#themeBtn').onclick = () => {
    const order = ['light', 'sepia', 'dark'];
    TH = order[(order.indexOf(TH) + 1) % order.length];
    applyTheme();
    toast({ light: t('th_light'), sepia: t('th_sepia'), dark: t('th_dark') }[TH]);
  };
  $('#langBtn').onclick = () => { buildLangList(); $('#langSheet').classList.add('on'); };
  $('#backBtn').onclick = () => go('Home');

  $$('#bottomNav button').forEach(b => b.onclick = () => go(b.dataset.p));
  $$('#tabs .tab').forEach(b => b.onclick = () => {
    TAB = b.dataset.t;
    $$('#tabs .tab').forEach(x => x.classList.toggle('on', x === b));
    buildList();
  });
  const flt = $('#flt');
  if (flt) flt.addEventListener('input', buildList);

  const runSearch = v => { const val = (v || '').trim(); if (!val) return; $('#q2').value = val; go('Search'); doSearch(val); };
  $('#qGo').onclick = () => runSearch($('#q').value);
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') $('#qGo').click(); });
  $('#q2Go').onclick = () => doSearch($('#q2').value);
  $('#q2').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch($('#q2').value); });

  $$('#modeBar button').forEach(b => b.onclick = () => {
    MODE = b.dataset.m; applyMode();
    if (curSurah) { const n = curSurah; renderSurah(n, false); window.scrollTo({ top: 0 }); }
  });

  $('#themeChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; TH = b.dataset.th; applyTheme();
  });
  $('#fontChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; FONT = b.dataset.f; applyFont();
  });
  $('#fs').value = FS;
  $('#fs').addEventListener('input', e => { FS = +e.target.value; applyFont(); });

  $('#clearBtn').onclick = () => {
    if (!confirm(t('clear_ask'))) return;
    SAVED = []; localStorage.removeItem(K.saved); localStorage.removeItem(K.last);
    renderSaved(); renderLast(); repaintSavedMarks(); toast(t('cleared'));
  };

  $('#actSave').onclick = () => act('save');
  $('#actCopy').onclick = () => act('copy');
  $('#actShare').onclick = () => act('share');
  $('#actStart').onclick = () => act('start');
  $('#actCancel').onclick = closeSheet;
  document.addEventListener('click', e => {
    if (e.target.id === 'sheet') closeSheet();
    const c = e.target.closest('[data-close]');
    if (c) document.getElementById(c.dataset.close).classList.remove('on');
  });

  /* PWA */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    const b = $('#installBtn'); if (b) b.hidden = false;
  });
  $('#installBtn').onclick = async () => {
    if (!deferredPrompt) { toast(t('install_hint'), 3200); return; }
    deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').hidden = true;
  };
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  const m = location.hash.match(/^#s:(\d+)(?::(\d+))?/);
  const spl = $('#splash');
  setTimeout(() => {
    if (spl) { spl.classList.add('hide'); setTimeout(() => spl.remove(), 620); }
    if (m) openSurah(+m[1], m[2] ? +m[2] : null);
    renderHero();
  }, 750);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* ================= offline preparation ================= */
(function offlinePrep() {
  const CACHE = 'quran-nour-v1';
  const FILES = ['./', './index.html', './styles.css', './app.js', './data.js', './i18n.js', './amiri.ttf',
    './manifest.json', './icons/i192.png', './icons/i512.png', './icons/apple-touch-icon.png', './icons/maskable512.png'];
  const T = k => ((window.I18N || {})[localStorage.getItem('nq_lang') || 'ar'] || (window.I18N || {}).ar || {})[k] || k;
  const bar = () => document.getElementById('offbar');
  const txt = () => document.getElementById('offtxt');
  const actEl = () => document.getElementById('offact');
  const inApp = /WhatsApp|FBAN|FBAV|Instagram|Line\/|MicroMessenger/i.test(navigator.userAgent);

  function show(msg, label, fn) {
    const b = bar(); if (!b) return;
    txt().textContent = msg;
    if (label) { actEl().style.display = 'inline-block'; actEl().textContent = label; actEl().onclick = fn; }
    else actEl().style.display = 'none';
    b.style.display = 'block';
  }
  function hide() { const b = bar(); if (b) b.style.display = 'none'; }

  async function ready() {
    if (!('caches' in window)) return false;
    const c = await caches.open(CACHE);
    return (await c.keys()).length >= FILES.length - 2;
  }

  async function prepare(manual) {
    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;
    if (await ready()) {
      if (manual) { show('✅ ' + T('ready')); setTimeout(hide, 2600); return; }
      if (inApp) show('✅ ' + T('inapp'), T('open_chrome'), () => {
        location.href = 'intent://mido9980.github.io/easy-quran/#Intent;scheme=https;package=com.android.chrome;end';
      });
      return;
    }
    show('⏳ ' + T('preparing') + '…');
    try { await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; } catch (e) {}
    const c = await caches.open(CACHE);
    let d = 0;
    for (const f of FILES) {
      try { const r = await fetch(f, { cache: 'reload' }); if (r.ok) await c.put(f, r.clone()); } catch (e) {}
      d++;
      txt().textContent = `⏳ ${T('preparing')} ${d}/${FILES.length}`;
    }
    if (await ready()) { show('✅ ' + T('ready')); setTimeout(hide, 2800); }
    else show('⚠ ' + T('preparing'), T('retry'), () => prepare(true));
  }

  window.addEventListener('online', () => prepare(false));
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => prepare(false), 1000));
})();

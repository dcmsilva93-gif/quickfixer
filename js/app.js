// ═══════════════════════════════════════════════════════════
//  QUICKFIXER  –  app.js  (Supabase connected)
// ═══════════════════════════════════════════════════════════

const SB_URL = 'https://otypgclbmfnilcbuzvdb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eXBnY2xibWZuaWxjYnV6dmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzU2NTUsImV4cCI6MjA5MTU1MTY1NX0.10uQHFpnjUZGD1DEl6RDB23GToVciGPOxGBX6oJShfo';
const SB_H = {
  'Content-Type':  'application/json',
  'apikey':        SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Prefer':        'return=representation'
};

// ─── DB HELPERS ───────────────────────────────────────────────
async function dbGet(table, query='') {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: SB_H });
    if (!r.ok) { await handleDbError(r, table); return null; }
    return await r.json();
  } catch(e) { showDbError('network', e.message); return null; }
}
async function dbInsert(table, data) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method:'POST', headers: SB_H, body: JSON.stringify(data) });
    if (!r.ok) { await handleDbError(r, table); return null; }
    return await r.json();
  } catch(e) { showDbError('network', e.message); return null; }
}
async function dbUpdate(table, id, data) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method:'PATCH', headers: SB_H, body: JSON.stringify(data) });
    if (!r.ok) { await handleDbError(r, table); return false; }
    return true;
  } catch(e) { showDbError('network', e.message); return false; }
}
async function dbDelete(table, id) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method:'DELETE', headers: SB_H });
    if (!r.ok) { await handleDbError(r, table); return false; }
    return true;
  } catch(e) { showDbError('network', e.message); return false; }
}

async function handleDbError(r, table) {
  let msg = '';
  try { const j = await r.json(); msg = j.message || j.hint || JSON.stringify(j); } catch(e) {}
  console.error(`DB error [${r.status}] on ${table}:`, msg);
  if (r.status === 404 || msg.includes('does not exist') || msg.includes('relation')) {
    showDbError('table');
  } else if (r.status === 401 || r.status === 403) {
    showDbError('rls');
  } else {
    showDbError('other', `${r.status}: ${msg}`);
  }
}

function showDbError(type, detail) {
  const messages = {
    table:   { title: 'Tables not created yet', body: 'Run the <code>supabase_setup.sql</code> file in your Supabase SQL Editor first, then reload this page.' },
    rls:     { title: 'Permission denied (RLS)', body: 'Row Level Security is blocking access. Run the SQL setup file which includes the RLS policies, then reload.' },
    network: { title: 'Cannot reach Supabase', body: 'Check your internet connection and make sure your Supabase project is active (not paused).' },
    other:   { title: 'Database error', body: detail || 'An unexpected error occurred. Check the browser console (F12) for details.' },
  };
  const m = messages[type] || messages.other;
  document.getElementById('app').innerHTML = `
    <nav style="background:#1c1917;padding:0 2rem;display:flex;align-items:center;height:62px">
      <span style="color:white;font-size:18px;font-weight:700">Quick<em style="color:#f97316;font-style:normal">Fixer</em></span>
    </nav>
    <div style="max-width:560px;margin:4rem auto;padding:0 2rem">
      <div style="background:white;border:1px solid #fecaca;border-radius:12px;padding:2rem">
        <div style="font-size:20px;margin-bottom:4px">⚠️ ${m.title}</div>
        <p style="font-size:14px;color:#6b7280;margin:0 0 1.5rem;line-height:1.6">${m.body}</p>
        <div style="background:#f9fafb;border-radius:8px;padding:1.25rem;font-size:13px;color:#374151;line-height:1.8">
          <strong>Fix in 3 steps:</strong><br>
          1. Go to <a href="https://supabase.com" target="_blank" style="color:#f97316">supabase.com</a> → your project<br>
          2. Click <strong>SQL Editor</strong> → <strong>New Query</strong><br>
          3. Paste &amp; run the contents of <code style="background:#e5e7eb;padding:1px 5px;border-radius:3px">supabase_setup.sql</code> (included in your zip)
        </div>
        <button onclick="location.reload()" style="margin-top:1.25rem;width:100%;background:#f97316;color:white;border:none;padding:12px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
          Retry after running SQL →
        </button>
        <button onclick="renderHomeOffline()" style="margin-top:8px;width:100%;background:transparent;color:#6b7280;border:1px solid #e5e7eb;padding:10px;border-radius:8px;font-size:13px;cursor:pointer">
          Continue in offline mode (local data only)
        </button>
      </div>
    </div>`;
}

// ─── LANGUAGE ─────────────────────────────────────────────────
let LANG = localStorage.getItem('qf_lang') || 'si';
function setLang(l) { LANG = l; localStorage.setItem('qf_lang', l); rerenderCurrent(); }
function t(k) { return (STRINGS[LANG]||{})[k] || STRINGS.si[k] || k; }

let PAGE = 'home', FILTER = {trade:'',area:'',term:''}, ADMIN_TAB = 'pros', EDIT_PRO_ID = null;
let adminLoggedIn = false;
let PROFESSIONALS = [], JOB_REQUESTS = [];
const ADMIN_PASS = 'admin123';

function rerenderCurrent() {
  if      (PAGE==='home')  renderHome();
  else if (PAGE==='dir')   renderDirectory(FILTER.trade, FILTER.area, FILTER.term);
  else if (PAGE==='reg')   renderRegister();
  else if (PAGE==='login') renderAdminLogin();
  else if (PAGE==='admin') renderAdmin(ADMIN_TAB);
}

// ─── STRINGS ──────────────────────────────────────────────────
const STRINGS = {
  si:{
    app_name:'QuickFixer', nav_find:'සේවා සපයන්නෙකු සොයන්න',
    nav_join:'සේවා සපයන්නෙකු ලෙස එකතු වන්න', lang_btn:'English',
    hero_tag:'මිනුවන්ගොඩ සහ අවට ප්‍රදේශ',
    hero_h1a:'විශ්වාසනීය', hero_h1b:'ශිල්පීන් සොයා ගන්න',
    hero_desc:'ජලනල, විදුලි, ලී වැඩ, මේසන් ශිල්පීන් සහ තවත් — ඔබේ අසල්වැසි ප්‍රදේශයෙන්ම.',
    search_ph:'ශිල්ප හෝ නම සොයන්න...', search_btn:'සොයන්න', all_trades:'සියලු ශිල්ප',
    stat_pros:'ශිල්පීන්', stat_types:'ශිල්ප වර්ග', stat_areas:'ආවරණය කළ ප්‍රදේශ',
    browse_h:'ශිල්පය අනුව බලන්න', browse_sub:'ශිල්ප වර්ගයක් තෝරන්න', pros_label:'ශිල්පීන්',
    top_h:'ඉහළ ශ්‍රේණිගත ශිල්පීන්', top_sub:'ඔබේ අසල්වැසියන් විසින් තහවුරු කළ',
    view_all:'සියලු ශිල්පීන් බලන්න →',
    cta_h:'ශිල්පියෙකුද?', cta_p:'නොමිලේ ලැයිස්තු කර ගනුදෙනුකරුවන් ලබා ගන්න.',
    cta_btn:'නොමිලේ ලියාපදිංචි වන්න →',
    feat1:'නොමිලේ ලැයිස්තුව', feat2:'රැකියා ලබා ගන්න', feat3:'සමාලෝචන', feat4:'ව්‍යාපාරය වර්ධනය',
    jobs_done:'රැකියා', rating_lbl:'ශ්‍රේණිය', area_lbl:'ප්‍රදේශය',
    call_btn:'📞 ඇමතුම', wa_btn:'💬 WhatsApp',
    available:'● ලබා ගත හැක', busy:'○ කාර්යබද්ධ',
    verified_lbl:'✓ තහවුරු', featured_lbl:'★ ශ්‍රේෂ්ඨ',
    dir_h:'සේවා සපයන්නෙකු සොයන්න', dir_sub:'සියලු ශිල්ප · මිනුවන්ගොඩ සහ අවට',
    all_areas:'සියලු ප්‍රදේශ', all_pros:'සියලු ශිල්පීන්',
    verified_f:'තහවුරු කළ', available_f:'ලබාගත හැකි', featured_f:'ශ්‍රේෂ්ඨ',
    search_name:'නම සොයන්න...', found_s:'ශිල්පියෙකු', found_p:'ශිල්පීන්',
    no_results:'ශිල්පීන් හමු නොවීය.',
    reg_h:'සේවා සපයන්නෙකු ලෙස ලියාපදිංචි වන්න',
    reg_sub:'නොමිලේ ඔබේ පැතිකඩ සාදා ගනුදෙනුකරුවන් ලබා ගන්න.',
    r_name:'සම්පූර්ණ නම', r_trade:'ශිල්පය', r_area:'ප්‍රදේශය',
    r_phone:'දුරකථන අංකය', r_exp:'අත්දැකීම් (වර්ෂ)',
    r_bio:'ඔබේ සේවා ගැන', r_cert:'සහතිකය (විකල්ප)',
    sel_trade:'ශිල්පය තෝරන්න', sel_area:'ප්‍රදේශය තෝරන්න',
    reg_btn:'නොමිලේ ලියාපදිංචි වන්න →',
    reg_ok:'✓ ඔබේ පැතිකඩ ලැබුණි! පැය 24ක් ඇතුළත ප්‍රකාශ කෙරේ. ස්තූතියි.',
    req_fields:'සියලු * ක්ෂේත්‍ර පුරවන්න.', reg_toast:'සාර්ථකව ලියාපදිංචි කෙරිණි!',
    r_name_ph:'ඔබේ නම', r_phone_ph:'07X-XXXXXXX', r_exp_ph:'උදා: 5',
    r_bio_ph:'ඔබේ කුසලතා විස්තර කරන්න...', r_cert_ph:'උදා: NVQ Level 3',
    footer_main:'QuickFixer · මිනුවන්ගොඩ ශිල්පීන් සහ ගනුදෙනුකරුවන් සම්බන්ධ කරයි',
    modal_avail:'ලබාගත හැකි', modal_jobs:'රැකියා', yes_lbl:'ඔව්', busy_lbl:'කාර්යබද්ධ',
    wa_msg:'ආයුබෝවන්, QuickFixer හරහා ඔබව සොයා ගත්තෙමි. ඔබේ සේවාව අවශ්‍යයි.',
    loading:'පූරණය වෙමින්...', saving:'සුරැකෙමින්...', saved:'සාර්ථකව සුරැකිණි!',
    save_fail:'සුරැකීම අසාර්ථකයි.', req_all:'සියලු * ක්ෂේත්‍ර පුරවන්න.',
    offline_banner:'⚠️ Offline mode — data not saved to cloud',
  },
  en:{
    app_name:'QuickFixer', nav_find:'Find a Service Provider',
    nav_join:'Join as a Service Provider', lang_btn:'සිංහල',
    hero_tag:'Minuwangoda & Surrounding Areas',
    hero_h1a:'Find Trusted Local', hero_h1b:'Tradespeople Fast',
    hero_desc:'Connect with verified plumbers, electricians, carpenters and more — right in your neighbourhood.',
    search_ph:'Search trade or name...', search_btn:'Search', all_trades:'All trades',
    stat_pros:'Professionals', stat_types:'Trade types', stat_areas:'Areas covered',
    browse_h:'Browse by Trade', browse_sub:'Tap a trade to see available professionals', pros_label:'pros',
    top_h:'Top Rated Professionals', top_sub:'Verified and reviewed by your neighbours',
    view_all:'View all professionals →',
    cta_h:'Are you a tradesperson?', cta_p:'List your services for free and get customers.',
    cta_btn:'Register for Free →',
    feat1:'Free listing', feat2:'Get job leads', feat3:'Build reviews', feat4:'Grow your business',
    jobs_done:'Jobs', rating_lbl:'Rating', area_lbl:'Area',
    call_btn:'📞 Call', wa_btn:'💬 WhatsApp',
    available:'● Available', busy:'○ Busy', verified_lbl:'✓ Verified', featured_lbl:'★ Featured',
    dir_h:'Find a Service Provider', dir_sub:'All trades · Minuwangoda & surrounding areas',
    all_areas:'All areas', all_pros:'All pros',
    verified_f:'Verified only', available_f:'Available now', featured_f:'Featured',
    search_name:'Search name...', found_s:'professional found', found_p:'professionals found',
    no_results:'No professionals found. Try adjusting your filters.',
    reg_h:'Join as a Service Provider',
    reg_sub:'Create your free profile and start getting job enquiries.',
    r_name:'Full Name', r_trade:'Trade / Skill', r_area:'Area',
    r_phone:'Phone Number', r_exp:'Years of Experience',
    r_bio:'About your work', r_cert:'NVQ / Certification (optional)',
    sel_trade:'Select your trade', sel_area:'Select your area',
    reg_btn:'Register for Free →',
    reg_ok:'✓ Your profile has been submitted! We\'ll review and publish it within 24 hours.',
    req_fields:'Please fill in all required fields.', reg_toast:'Registered successfully!',
    r_name_ph:'Your full name', r_phone_ph:'07X-XXXXXXX', r_exp_ph:'e.g. 5',
    r_bio_ph:'Describe your skills and services...', r_cert_ph:'e.g. NVQ Level 3',
    footer_main:'QuickFixer · Connecting Minuwangoda\'s tradespeople with customers',
    modal_avail:'Available', modal_jobs:'Jobs', yes_lbl:'Yes', busy_lbl:'Busy',
    wa_msg:'Hi, I found you on QuickFixer. I need your services.',
    loading:'Loading...', saving:'Saving...', saved:'Saved!',
    save_fail:'Save failed.', req_all:'Please fill all required fields.',
    offline_banner:'⚠️ Offline mode — data not saved to cloud',
  }
};

// ─── STATIC DATA ──────────────────────────────────────────────
const TRADES = [
  {id:'plumbing',    si:'ජලනල කාර්ය',    en:'Plumbing',    icon:'🔧'},
  {id:'electrical',  si:'විදුලි කාර්ය',   en:'Electrical',  icon:'⚡'},
  {id:'carpentry',   si:'ලී වැඩ',          en:'Carpentry',   icon:'🪚'},
  {id:'masonry',     si:'ගොඩනැගිලි',      en:'Masonry',     icon:'🧱'},
  {id:'welding',     si:'වෑල්ඩිං',         en:'Welding',     icon:'🔩'},
  {id:'fabrication', si:'ෆැබ්‍රිකේෂන්',  en:'Fabrication', icon:'🏗️'},
  {id:'painting',    si:'පින්තාරු',        en:'Painting',    icon:'🎨'},
  {id:'tiling',      si:'ටයිල්',           en:'Tiling',      icon:'◼️'},
  {id:'roofing',     si:'වහල',             en:'Roofing',     icon:'🏠'},
  {id:'ac_repair',   si:'AC අලුත්වැඩියා', en:'AC Repair',   icon:'❄️'},
  {id:'aluminium',   si:'ඇලුමිනියම්',     en:'Aluminium',   icon:'🪟'},
  {id:'other',       si:'වෙනත්',           en:'Other',       icon:'➕'},
];
const AREAS = ['Minuwangoda','Seeduwa','Katunayake','Negombo','Ja-Ela','Divulapitiya','Veyangoda','Gampaha','Wattala','Ragama'];
const AV_COLORS = ['av-o','av-g','av-b','av-p'];

// Fallback offline data shown when Supabase not yet set up
const DEMO_PROS = [
  {id:1,name:'Kamal Silva',trade:'electrical',area:'Minuwangoda',phone:'071-1234567',rating:5.0,jobs_count:48,verified:true,available:true,featured:true,bio_si:'අවුරුදු 12 පළපුරුද්ද ඇති විදුලි ශිල්පියෙකි.',bio_en:'Licensed electrician, 12 yrs experience.',initials:'KS',color:'av-o'},
  {id:2,name:'Ranjith Perera',trade:'plumbing',area:'Minuwangoda',phone:'077-2345678',rating:4.5,jobs_count:31,verified:true,available:true,featured:false,bio_si:'විශේෂඥ ජලනල ශිල්පියෙකි.',bio_en:'Expert plumber, fast response.',initials:'RP',color:'av-b'},
  {id:3,name:'Nimal de Silva',trade:'carpentry',area:'Seeduwa',phone:'076-3456789',rating:5.0,jobs_count:62,verified:true,available:false,featured:false,bio_si:'රිසිකර ගෘහ භාණ්ඩ සහ ලී වැඩ.',bio_en:'Custom furniture, doors, windows.',initials:'ND',color:'av-g'},
];
let OFFLINE_MODE = false;

// ─── HELPERS ──────────────────────────────────────────────────
function getBio(p)        { return LANG==='si' ? (p.bio_si||p.bio_en||'') : (p.bio_en||p.bio_si||''); }
function getTradeName(id) { const tr=TRADES.find(x=>x.id===id); return tr?(LANG==='si'?tr.si:tr.en):id; }
function trLabel(tr)      { return LANG==='si'?tr.si:tr.en; }
function stars(r)         { const f=Math.floor(r||0),h=(r||0)%1>=.5?1:0; return '★'.repeat(f)+(h?'½':'')+'☆'.repeat(5-f-h); }
function mkInitials(n)    { return (n||'').split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)||'??'; }
function randColor()      { return AV_COLORS[Math.floor(Math.random()*AV_COLORS.length)]; }

function showToast(msg, dur=3200) {
  let el=document.getElementById('qf-toast');
  if(!el){el=document.createElement('div');el.id='qf-toast';el.className='toast';document.body.appendChild(el);}
  el.textContent=msg; el.classList.add('show');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),dur);
}
function showSpinner(msg) {
  document.getElementById('app').innerHTML=`
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;color:#6b7280">
      <div style="width:36px;height:36px;border:3px solid #e5e7eb;border-top-color:#f97316;border-radius:50%;animation:spin .7s linear infinite"></div>
      <p style="font-size:14px">${msg||t('loading')}</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
}

// ─── SHARED UI ────────────────────────────────────────────────
function navHtml() {
  const offline = OFFLINE_MODE ? `<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:20px;margin-left:6px">offline</span>` : '';
  return `<nav>
    <a href="#" class="nav-logo" onclick="renderHome()">Quick<em>Fixer</em>${offline}</a>
    <div class="nav-links">
      <a href="#" onclick="renderDirectory()">${t('nav_find')}</a>
      <a href="#" onclick="renderRegister()" class="nav-btn">${t('nav_join')}</a>
      <button class="lang-btn" onclick="setLang(LANG==='si'?'en':'si')">${t('lang_btn')}</button>
    </div>
  </nav>`;
}
function footerHtml() {
  return `<footer>
    <p>${t('footer_main')}</p>
    <p style="margin-top:6px">
      <a href="#" onclick="renderDirectory()">${t('nav_find')}</a> ·
      <a href="#" onclick="renderRegister()">${t('nav_join')}</a>
    </p>
    <p style="margin-top:12px">
      <a href="#" onclick="renderAdminLogin()" style="color:rgba(255,255,255,0.12);font-size:11px;text-decoration:none">&#9679;</a>
    </p>
  </footer>`;
}
function modalHtml() {
  return `<div class="modal-overlay" id="pro-modal">
    <div class="modal">
      <div class="modal-header"><h3 id="modal-title"></h3><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div id="modal-body"></div>
    </div>
  </div>`;
}

function proCard(p) {
  return `<div class="pro-card${p.featured?' featured':''}" onclick="openProModal(${p.id})">
    ${p.featured?`<div class="featured-badge">${t('featured_lbl')}</div>`:''}
    <div class="pro-card-top">
      <div class="pro-avatar ${p.color||'av-o'}">${p.initials||mkInitials(p.name)}</div>
      <div style="flex:1">
        <div class="pro-name">${p.name}</div>
        <div class="pro-trade">${getTradeName(p.trade)}</div>
        <div class="pro-location">📍 ${p.area}</div>
        ${p.verified?`<span class="verified-badge">${t('verified_lbl')}</span>`:''}
      </div>
      <div>
        <div class="stars">${stars(p.rating)}</div>
        <div style="font-size:11px;color:var(--text-muted);text-align:right">${(p.rating||0).toFixed(1)}</div>
        ${p.available
          ?`<div style="font-size:11px;color:var(--green);font-weight:600;margin-top:4px">${t('available')}</div>`
          :`<div style="font-size:11px;color:#9ca3af;margin-top:4px">${t('busy')}</div>`}
      </div>
    </div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.5">${getBio(p)}</p>
    <div class="pro-stats">
      <div class="pro-stat"><strong>${p.jobs_count||0}</strong> ${t('jobs_done')}</div>
      <div class="pro-stat"><strong>${(p.rating||0).toFixed(1)}</strong> ${t('rating_lbl')}</div>
      <div class="pro-stat"><strong>${p.area}</strong> ${t('area_lbl')}</div>
    </div>
    <div class="pro-actions">
      <button class="btn-primary btn-orange" onclick="event.stopPropagation();callPro('${p.phone}','${p.name}')">${t('call_btn')}</button>
      <button class="btn-outline" onclick="event.stopPropagation();whatsappPro('${p.phone}','${p.name}')">${t('wa_btn')}</button>
    </div>
  </div>`;
}

// ─── DATA LOADING ─────────────────────────────────────────────
async function loadPros() {
  const data = await dbGet('professionals','select=*&order=featured.desc,created_at.asc');
  if (data === null) return false;
  PROFESSIONALS = data;
  return true;
}
async function loadJobs() {
  const data = await dbGet('job_requests','select=*&order=created_at.desc');
  if (data === null) return false;
  JOB_REQUESTS = data;
  return true;
}

// Offline fallback — uses demo data, no cloud save
function renderHomeOffline() {
  OFFLINE_MODE = true;
  PROFESSIONALS = DEMO_PROS;
  renderHomeContent();
}

// ─── HOME ─────────────────────────────────────────────────────
async function renderHome() {
  PAGE='home';
  showSpinner();
  const ok = await loadPros();
  if (!ok) return; // error screen shown by dbGet
  OFFLINE_MODE = false;
  renderHomeContent();
}

function renderHomeContent() {
  const topPros = [
    ...PROFESSIONALS.filter(p=>p.featured),
    ...PROFESSIONALS.filter(p=>p.verified&&!p.featured)
  ].slice(0,3);

  document.getElementById('app').innerHTML = `
    ${navHtml()}
    <div class="hero">
      <div class="hero-tag">${t('hero_tag')}</div>
      <h1>${t('hero_h1a')} <em>${t('hero_h1b')}</em></h1>
      <p>${t('hero_desc')}</p>
      <div class="hero-ctas">
        <button class="btn-hero-main" onclick="renderDirectory()">${t('nav_find')}</button>
        <button class="btn-hero-out" onclick="renderRegister()">${t('nav_join')}</button>
      </div>
      <div class="search-box">
        <input type="text" id="search-input" placeholder="${t('search_ph')}" onkeydown="if(event.key==='Enter')doSearch()"/>
        <select id="search-trade">
          <option value="">${t('all_trades')}</option>
          ${TRADES.map(tr=>`<option value="${tr.id}">${trLabel(tr)}</option>`).join('')}
        </select>
        <button onclick="doSearch()">${t('search_btn')}</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><strong>${PROFESSIONALS.length}+</strong><span>${t('stat_pros')}</span></div>
        <div class="hero-stat"><strong>${TRADES.length}</strong><span>${t('stat_types')}</span></div>
        <div class="hero-stat"><strong>${AREAS.length}+</strong><span>${t('stat_areas')}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h2>${t('browse_h')}</h2><p>${t('browse_sub')}</p></div>
      <div class="categories-grid">
        ${TRADES.map(tr=>`
          <a href="#" class="cat-card" onclick="renderDirectory('${tr.id}');return false;">
            <span class="cat-icon">${tr.icon}</span>
            <div class="cat-name">${trLabel(tr)}</div>
            <div class="cat-num">${PROFESSIONALS.filter(p=>p.trade===tr.id).length} ${t('pros_label')}</div>
          </a>`).join('')}
      </div>
    </div>

    <div style="background:#1c1917;padding:3rem 2rem;">
      <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:center">
        <div>
          <h2 style="color:white;font-size:24px;margin-bottom:1rem">${t('cta_h')}</h2>
          <p style="color:rgba(255,255,255,.7);font-size:15px;margin-bottom:1.5rem">${t('cta_p')}</p>
          <button class="btn-hero-main" onclick="renderRegister()">${t('cta_btn')}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${['feat1','feat2','feat3','feat4'].map(k=>`
            <div style="background:rgba(255,255,255,.07);border-radius:10px;padding:14px;color:white">
              <div style="color:var(--orange);font-size:18px;margin-bottom:5px">✓</div>
              <div style="font-size:13px;font-weight:500">${t(k)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h2>${t('top_h')}</h2><p>${t('top_sub')}</p></div>
      <div class="pros-grid">${topPros.length?topPros.map(proCard).join(''):`<p style="color:var(--text-muted);font-size:14px">${t('no_results')}</p>`}</div>
      <div style="text-align:center;margin-top:1.5rem">
        <button class="btn-outline" style="padding:11px 28px;font-size:14px" onclick="renderDirectory()">${t('view_all')}</button>
      </div>
    </div>
    ${footerHtml()}${modalHtml()}`;
}

// ─── DIRECTORY ────────────────────────────────────────────────
async function renderDirectory(ft='',fa='',term='') {
  PAGE='dir'; FILTER={trade:ft,area:fa,term};
  showSpinner();
  const ok = await loadPros();
  if (!ok && !OFFLINE_MODE) return;
  document.getElementById('app').innerHTML = `
    ${navHtml()}
    <div class="section">
      <div class="section-header"><h2>${t('dir_h')}</h2><p>${t('dir_sub')}</p></div>
      <div class="filter-bar">
        <select id="ft" onchange="applyFilters()">
          <option value="">${t('all_trades')}</option>
          ${TRADES.map(tr=>`<option value="${tr.id}" ${ft===tr.id?'selected':''}>${trLabel(tr)}</option>`).join('')}
        </select>
        <select id="fa" onchange="applyFilters()">
          <option value="">${t('all_areas')}</option>
          ${AREAS.map(a=>`<option value="${a}" ${fa===a?'selected':''}>${a}</option>`).join('')}
        </select>
        <select id="fv" onchange="applyFilters()">
          <option value="">${t('all_pros')}</option>
          <option value="verified">${t('verified_f')}</option>
          <option value="available">${t('available_f')}</option>
          <option value="featured">${t('featured_f')}</option>
        </select>
        <input type="text" id="fs" placeholder="${t('search_name')}" value="${term}" oninput="applyFilters()" style="min-width:140px"/>
        <span class="results-count" id="rc"></span>
      </div>
      <div class="pros-grid" id="pros-list"></div>
    </div>
    ${footerHtml()}${modalHtml()}`;
  applyFilters();
}

function applyFilters() {
  const trade=document.getElementById('ft')?.value||'';
  const area=document.getElementById('fa')?.value||'';
  const veri=document.getElementById('fv')?.value||'';
  const term=(document.getElementById('fs')?.value||'').toLowerCase();
  FILTER={trade,area,term};
  let res=PROFESSIONALS.filter(p=>{
    if(trade&&p.trade!==trade) return false;
    if(area&&p.area!==area) return false;
    if(veri==='verified'&&!p.verified) return false;
    if(veri==='available'&&!p.available) return false;
    if(veri==='featured'&&!p.featured) return false;
    if(term&&!p.name.toLowerCase().includes(term)&&!getTradeName(p.trade).toLowerCase().includes(term)) return false;
    return true;
  });
  res.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
  const rc=document.getElementById('rc');
  if(rc) rc.textContent=`${res.length} ${res.length===1?t('found_s'):t('found_p')}`;
  const list=document.getElementById('pros-list');
  if(list) list.innerHTML=res.length?res.map(proCard).join(''):`<div class="empty-state"><p>${t('no_results')}</p></div>`;
}
function doSearch() { renderDirectory(document.getElementById('search-trade')?.value||'','',document.getElementById('search-input')?.value||''); }

// ─── MODAL ────────────────────────────────────────────────────
function openProModal(id) {
  const p=PROFESSIONALS.find(x=>x.id===id); if(!p) return;
  document.getElementById('modal-title').textContent=p.name;
  document.getElementById('modal-body').innerHTML=`
    <div style="display:flex;gap:14px;align-items:center;margin-bottom:1.25rem">
      <div class="pro-avatar ${p.color||'av-o'}" style="width:58px;height:58px;font-size:20px">${p.initials||mkInitials(p.name)}</div>
      <div>
        <div style="font-size:15px;font-weight:600">${getTradeName(p.trade)}</div>
        <div class="stars">${stars(p.rating)} <span style="font-size:12px;color:var(--text-muted)">(${(p.rating||0).toFixed(1)})</span></div>
        <div style="font-size:13px;color:var(--text-muted)">📍 ${p.area}</div>
        <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap">
          ${p.verified?`<span class="badge badge-green">${t('verified_lbl')}</span>`:''}
          ${p.featured?`<span class="badge badge-gold">${t('featured_lbl')}</span>`:''}
        </div>
      </div>
    </div>
    <p style="font-size:14px;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">${getBio(p)}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:1.25rem">
      <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:18px;font-weight:700">${p.jobs_count||0}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t('modal_jobs')}</div>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:18px;font-weight:700">${p.verified?'✓':'—'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t('verified_lbl')}</div>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:18px;font-weight:700">${p.available?t('yes_lbl'):t('busy_lbl')}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t('modal_avail')}</div>
      </div>
    </div>
    <div class="pro-actions">
      <button class="btn-primary btn-orange" onclick="callPro('${p.phone}','${p.name}')">${t('call_btn')} ${p.phone}</button>
      <button class="btn-outline" onclick="whatsappPro('${p.phone}','${p.name}')">${t('wa_btn')}</button>
    </div>`;
  document.getElementById('pro-modal').classList.add('open');
}
function closeModal()   { document.getElementById('pro-modal')?.classList.remove('open'); }
function callPro(ph,nm) { showToast(nm); window.location.href=`tel:${ph.replace(/-/g,'')}`; }
function whatsappPro(ph,nm) {
  const num='94'+ph.replace(/-/g,'').replace(/^0/,'');
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(t('wa_msg'))}`,'_blank');
}

// ─── REGISTER ─────────────────────────────────────────────────
function renderRegister() {
  PAGE='reg';
  document.getElementById('app').innerHTML=`
    ${navHtml()}
    <div class="form-page">
      <div class="form-card">
        <div class="form-title">${t('reg_h')}</div>
        <div class="form-subtitle">${t('reg_sub')}</div>
        <div class="form-group"><label>${t('r_name')} *</label><input type="text" id="r-name" placeholder="${t('r_name_ph')}"/></div>
        <div class="form-row">
          <div class="form-group"><label>${t('r_trade')} *</label>
            <select id="r-trade"><option value="">${t('sel_trade')}</option>
              ${TRADES.filter(tr=>tr.id!=='other').map(tr=>`<option value="${tr.id}">${trLabel(tr)}</option>`).join('')}
              <option value="other">${LANG==='si'?'වෙනත්':'Other'}</option>
            </select></div>
          <div class="form-group"><label>${t('r_area')} *</label>
            <select id="r-area"><option value="">${t('sel_area')}</option>
              ${AREAS.map(a=>`<option value="${a}">${a}</option>`).join('')}
            </select></div>
        </div>
        <div class="form-group"><label>${t('r_phone')} *</label><input type="tel" id="r-phone" placeholder="${t('r_phone_ph')}"/></div>
        <div class="form-group"><label>${t('r_exp')}</label><input type="number" id="r-exp" placeholder="${t('r_exp_ph')}" min="0" max="50"/></div>
        <div class="form-group"><label>${t('r_bio')}</label><textarea id="r-bio" placeholder="${t('r_bio_ph')}"></textarea></div>
        <div class="form-group"><label>${t('r_cert')}</label><input type="text" id="r-cert" placeholder="${t('r_cert_ph')}"/></div>
        ${OFFLINE_MODE?`<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:1rem">⚠️ Offline mode — registration won't save to cloud. Set up Supabase first.</div>`:''}
        <button class="submit-btn" id="reg-btn" onclick="submitRegister()">${t('reg_btn')}</button>
        <div class="success-msg" id="reg-ok">${t('reg_ok')}</div>
      </div>
    </div>
    ${footerHtml()}`;
}

async function submitRegister() {
  const name=document.getElementById('r-name').value.trim();
  const trade=document.getElementById('r-trade').value;
  const area=document.getElementById('r-area').value;
  const phone=document.getElementById('r-phone').value.trim();
  const bio=document.getElementById('r-bio').value.trim();
  if(!name||!trade||!area||!phone){showToast(t('req_fields'));return;}
  const btn=document.getElementById('reg-btn');
  btn.textContent=t('saving'); btn.disabled=true;
  const data={name,trade,area,phone,
    bio_si:bio||area+' ශිල්පියෙකි.',
    bio_en:bio||'Professional tradesperson in '+area,
    rating:0,jobs_count:0,verified:false,available:true,featured:false,
    initials:mkInitials(name),color:randColor()
  };
  if(OFFLINE_MODE){
    document.getElementById('reg-ok').style.display='block';
    btn.textContent='✓'; return;
  }
  const result=await dbInsert('professionals',data);
  if(result){
    document.getElementById('reg-ok').style.display='block';
    btn.textContent='✓'; showToast(t('reg_toast'));
  } else {
    btn.textContent=t('reg_btn'); btn.disabled=false;
  }
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────
function renderAdminLogin() {
  PAGE='login';
  document.getElementById('app').innerHTML=`
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">Quick<em>Fixer</em> Admin</div>
        <div class="form-group"><label>Username</label><input type="text" id="au" placeholder="admin"/></div>
        <div class="form-group"><label>Password</label><input type="password" id="ap" placeholder="••••••••" onkeydown="if(event.key==='Enter')doAdminLogin()"/></div>
        <button class="submit-btn" onclick="doAdminLogin()">Login →</button>
        <p style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:1rem">
          <a href="#" onclick="renderHome()" style="color:var(--orange);text-decoration:none">← Back to QuickFixer</a>
        </p>
      </div>
    </div>`;
}
function doAdminLogin() {
  const u=document.getElementById('au').value.trim();
  const p=document.getElementById('ap').value;
  if(u==='admin'&&p===ADMIN_PASS){adminLoggedIn=true;renderAdmin('pros');}
  else{showToast('Invalid credentials');document.getElementById('ap').value='';}
}

// ─── ADMIN MAIN ───────────────────────────────────────────────
async function renderAdmin(tab) {
  if(!adminLoggedIn){renderAdminLogin();return;}
  PAGE='admin'; ADMIN_TAB=tab;
  showSpinner('Loading admin panel...');
  await loadPros(); await loadJobs();
  document.getElementById('app').innerHTML=`
    <nav>
      <a href="#" class="nav-logo" onclick="renderHome()">Quick<em>Fixer</em> <span style="font-size:12px;color:var(--orange);margin-left:4px;font-weight:400">Admin</span></a>
      <div class="nav-links">
        <a href="#" onclick="renderHome()" style="color:rgba(255,255,255,.7);font-size:13px">← Public site</a>
        <button class="lang-btn" onclick="adminLoggedIn=false;renderAdminLogin()">Logout</button>
      </div>
    </nav>
    <div class="admin-layout">
      <div class="admin-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">Management</div>
          <div class="sidebar-link ${tab==='pros'?'active':''}" onclick="renderAdmin('pros')">👥 Professionals</div>
          <div class="sidebar-link ${tab==='jobs'?'active':''}" onclick="renderAdmin('jobs')">📋 Job Requests</div>
          <div class="sidebar-link ${tab==='add'?'active':''}" onclick="renderAdmin('add')">➕ Add Professional</div>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">Overview</div>
          <div class="sidebar-link ${tab==='stats'?'active':''}" onclick="renderAdmin('stats')">📊 Statistics</div>
        </div>
        <div style="padding:1rem 1.5rem;margin-top:1rem;border-top:1px solid rgba(255,255,255,.08)">
          <div style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:6px">DATABASE</div>
          <div style="font-size:12px;color:${OFFLINE_MODE?'#fbbf24':'#34d399'}">
            ${OFFLINE_MODE?'⚠ Offline mode':'✓ Supabase connected'}
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:3px">${PROFESSIONALS.length} professionals · ${JOB_REQUESTS.length} jobs</div>
        </div>
      </div>
      <div class="admin-main" id="admin-content"></div>
    </div>`;
  renderAdminTab(tab);
}

function renderAdminTab(tab) {
  const el=document.getElementById('admin-content'); if(!el) return;
  if(tab==='pros')       el.innerHTML=adminProsHtml();
  else if(tab==='jobs')  el.innerHTML=adminJobsHtml();
  else if(tab==='add')   el.innerHTML=adminAddHtml();
  else if(tab==='stats') el.innerHTML=adminStatsHtml();
  else if(tab==='edit')  el.innerHTML=adminEditHtml(EDIT_PRO_ID);
}

// ─── ADMIN: PROS TABLE ────────────────────────────────────────
function adminProsHtml() {
  const pros=[...PROFESSIONALS].sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
  return `
    <div class="admin-header"><h2>Professionals <span style="font-size:14px;font-weight:400;color:var(--text-muted)">(${pros.length})</span></h2><p>All changes save to Supabase in real time</p></div>
    <div class="admin-table-wrap">
      <div class="admin-table-toolbar">
        <input type="text" id="at-s" placeholder="Search..." oninput="filterAdminTable()" style="flex:1;min-width:140px"/>
        <select id="at-t" onchange="filterAdminTable()"><option value="">All trades</option>${TRADES.map(tr=>`<option value="${tr.id}">${tr.en}</option>`).join('')}</select>
        <select id="at-f" onchange="filterAdminTable()">
          <option value="">All</option><option value="verified">Verified</option>
          <option value="featured">Featured</option><option value="pending">Unverified</option>
        </select>
        <button class="tbl-btn tbl-btn-add" onclick="renderAdmin('add')">+ Add New</button>
      </div>
      <div style="overflow-x:auto">
        <table><thead><tr><th>Name</th><th>Trade</th><th>Area</th><th>Phone</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="at-body">${pros.map(adminProRow).join('')}</tbody></table>
      </div>
    </div>`;
}
function adminProRow(p) {
  return `<tr id="row-${p.id}">
    <td><strong>${p.name}</strong></td>
    <td>${TRADES.find(x=>x.id===p.trade)?.en||p.trade}</td>
    <td>${p.area}</td><td>${p.phone}</td>
    <td>${(p.rating||0)>0?`${stars(p.rating)} ${(p.rating).toFixed(1)}`:'—'}</td>
    <td style="white-space:nowrap">
      ${p.featured?`<span class="badge badge-gold">★ Featured</span> `:''}
      ${p.verified?`<span class="badge badge-green">✓ Verified</span>`:`<span class="badge badge-gray">Pending</span>`}
      <span class="badge ${p.available?'badge-green':'badge-gray'}" style="margin-left:4px">${p.available?'Available':'Busy'}</span>
    </td>
    <td><div class="tbl-actions">
      <button class="tbl-act tbl-act-edit" onclick="openEdit(${p.id})">Edit</button>
      <button class="tbl-act tbl-act-star" onclick="toggleFeatured(${p.id})">${p.featured?'Unfeature':'★ Feature'}</button>
      <button class="tbl-act tbl-act-ver" onclick="toggleVerified(${p.id})">${p.verified?'Unverify':'✓ Verify'}</button>
      <button class="tbl-act tbl-act-del" onclick="deletePro(${p.id})">Delete</button>
    </div></td>
  </tr>`;
}
function filterAdminTable() {
  const term=(document.getElementById('at-s')?.value||'').toLowerCase();
  const trade=document.getElementById('at-t')?.value||'';
  const filt=document.getElementById('at-f')?.value||'';
  let pros=[...PROFESSIONALS].sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
  if(term) pros=pros.filter(p=>p.name.toLowerCase().includes(term)||(TRADES.find(x=>x.id===p.trade)?.en||'').toLowerCase().includes(term));
  if(trade) pros=pros.filter(p=>p.trade===trade);
  if(filt==='verified') pros=pros.filter(p=>p.verified);
  if(filt==='featured') pros=pros.filter(p=>p.featured);
  if(filt==='pending')  pros=pros.filter(p=>!p.verified);
  const tbody=document.getElementById('at-body');
  if(tbody) tbody.innerHTML=pros.map(adminProRow).join('');
}
async function toggleFeatured(id) {
  const p=PROFESSIONALS.find(x=>x.id===id); if(!p) return;
  const ok=await dbUpdate('professionals',id,{featured:!p.featured});
  if(ok){p.featured=!p.featured;showToast(p.featured?`★ ${p.name} — Featured!`:`${p.name} removed from Featured`);renderAdmin('pros');}
}
async function toggleVerified(id) {
  const p=PROFESSIONALS.find(x=>x.id===id); if(!p) return;
  const ok=await dbUpdate('professionals',id,{verified:!p.verified});
  if(ok){p.verified=!p.verified;showToast(`${p.name} ${p.verified?'verified ✓':'unverified'}`);renderAdmin('pros');}
}
async function deletePro(id) {
  if(!confirm('Delete this professional from the database?')) return;
  const ok=await dbDelete('professionals',id);
  if(ok){PROFESSIONALS=PROFESSIONALS.filter(x=>x.id!==id);showToast('Deleted');renderAdmin('pros');}
}

// ─── ADMIN: EDIT ──────────────────────────────────────────────
function openEdit(id) { EDIT_PRO_ID=id; ADMIN_TAB='edit'; renderAdminTab('edit'); }
function adminEditHtml(id) {
  const p=PROFESSIONALS.find(x=>x.id===id); if(!p) return '<p>Not found</p>';
  return `
    <div class="admin-header"><h2>Edit Professional</h2><p>Editing: <strong>${p.name}</strong> — saves to Supabase</p></div>
    <div style="max-width:640px"><div class="form-card">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input type="text" id="e-name" value="${p.name}"/></div>
        <div class="form-group"><label>Phone *</label><input type="tel" id="e-phone" value="${p.phone}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Trade *</label>
          <select id="e-trade">${TRADES.map(tr=>`<option value="${tr.id}" ${p.trade===tr.id?'selected':''}>${tr.en}</option>`).join('')}</select></div>
        <div class="form-group"><label>Area *</label>
          <select id="e-area">${AREAS.map(a=>`<option value="${a}" ${p.area===a?'selected':''}>${a}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Rating (0–5)</label><input type="number" id="e-rating" value="${p.rating||0}" min="0" max="5" step="0.1"/></div>
        <div class="form-group"><label>Jobs Completed</label><input type="number" id="e-jobs" value="${p.jobs_count||0}" min="0"/></div>
      </div>
      <div class="form-group"><label>Bio — Sinhala</label><textarea id="e-si">${p.bio_si||''}</textarea></div>
      <div class="form-group"><label>Bio — English</label><textarea id="e-en">${p.bio_en||''}</textarea></div>
      <div style="display:flex;gap:16px;margin:.5rem 0;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="e-verified" ${p.verified?'checked':''}/> Verified</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="e-available" ${p.available?'checked':''}/> Available</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="e-featured" ${p.featured?'checked':''}/> ★ Featured (Paid)</label>
      </div>
      <div style="display:flex;gap:10px;margin-top:1.5rem">
        <button class="submit-btn" id="save-btn" style="flex:1" onclick="saveEdit(${id})">Save to Database</button>
        <button class="btn-outline" style="flex:.4;padding:14px" onclick="renderAdmin('pros')">Cancel</button>
      </div>
    </div></div>`;
}
async function saveEdit(id) {
  const p=PROFESSIONALS.find(x=>x.id===id); if(!p) return;
  const btn=document.getElementById('save-btn');
  btn.textContent=t('saving'); btn.disabled=true;
  const data={
    name:     document.getElementById('e-name').value.trim()||p.name,
    phone:    document.getElementById('e-phone').value.trim()||p.phone,
    trade:    document.getElementById('e-trade').value,
    area:     document.getElementById('e-area').value,
    rating:   parseFloat(document.getElementById('e-rating').value)||0,
    jobs_count:parseInt(document.getElementById('e-jobs').value)||0,
    bio_si:   document.getElementById('e-si').value.trim(),
    bio_en:   document.getElementById('e-en').value.trim(),
    verified: document.getElementById('e-verified').checked,
    available:document.getElementById('e-available').checked,
    featured: document.getElementById('e-featured').checked,
    initials: mkInitials(document.getElementById('e-name').value.trim()),
  };
  const ok=await dbUpdate('professionals',id,data);
  if(ok){showToast(t('saved'));renderAdmin('pros');}
  else{btn.textContent='Save to Database';btn.disabled=false;}
}

// ─── ADMIN: ADD ───────────────────────────────────────────────
function adminAddHtml() {
  return `
    <div class="admin-header"><h2>Add Professional</h2><p>Manually add a service provider to the database</p></div>
    <div style="max-width:640px"><div class="form-card">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input type="text" id="a-name" placeholder="Full name"/></div>
        <div class="form-group"><label>Phone *</label><input type="tel" id="a-phone" placeholder="07X-XXXXXXX"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Trade *</label>
          <select id="a-trade"><option value="">Select</option>${TRADES.map(tr=>`<option value="${tr.id}">${tr.en}</option>`).join('')}</select></div>
        <div class="form-group"><label>Area *</label>
          <select id="a-area"><option value="">Select</option>${AREAS.map(a=>`<option value="${a}">${a}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Rating (0–5)</label><input type="number" id="a-rating" value="0" min="0" max="5" step="0.1"/></div>
        <div class="form-group"><label>Jobs Completed</label><input type="number" id="a-jobs" value="0" min="0"/></div>
      </div>
      <div class="form-group"><label>Bio — Sinhala</label><textarea id="a-si" placeholder="සිංහලෙන් විස්තර..."></textarea></div>
      <div class="form-group"><label>Bio — English</label><textarea id="a-en" placeholder="Describe in English..."></textarea></div>
      <div style="display:flex;gap:16px;margin:.5rem 0;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="a-verified"/> Verified</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="a-available" checked/> Available</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" id="a-featured"/> ★ Featured (Paid)</label>
      </div>
      <button class="submit-btn btn-orange" id="add-btn" onclick="adminAddPro()">Add to Database →</button>
      <div class="success-msg" id="a-ok">✓ Added to database successfully!</div>
    </div></div>`;
}
async function adminAddPro() {
  const name=document.getElementById('a-name').value.trim();
  const phone=document.getElementById('a-phone').value.trim();
  const trade=document.getElementById('a-trade').value;
  const area=document.getElementById('a-area').value;
  if(!name||!phone||!trade||!area){showToast('Fill all required fields');return;}
  const btn=document.getElementById('add-btn'); btn.textContent=t('saving'); btn.disabled=true;
  const data={name,phone,trade,area,
    rating:parseFloat(document.getElementById('a-rating').value)||0,
    jobs_count:parseInt(document.getElementById('a-jobs').value)||0,
    bio_si:document.getElementById('a-si').value.trim()||area+' ශිල්පියෙකි.',
    bio_en:document.getElementById('a-en').value.trim()||'Professional in '+area,
    verified:document.getElementById('a-verified').checked,
    available:document.getElementById('a-available').checked,
    featured:document.getElementById('a-featured').checked,
    initials:mkInitials(name),color:randColor()
  };
  const result=await dbInsert('professionals',data);
  if(result){document.getElementById('a-ok').style.display='block';btn.textContent='✓ Added';showToast('Added to database!');}
  else{btn.textContent='Add to Database →';btn.disabled=false;}
}

// ─── ADMIN: JOBS ──────────────────────────────────────────────
function adminJobsHtml() {
  if(!JOB_REQUESTS.length) return `
    <div class="admin-header"><h2>Job Requests</h2><p>Customer job requests from Supabase</p></div>
    <div class="empty-state"><p>No job requests yet.</p></div>`;
  return `
    <div class="admin-header"><h2>Job Requests <span style="font-size:14px;font-weight:400;color:var(--text-muted)">(${JOB_REQUESTS.length})</span></h2></div>
    <div class="admin-table-wrap"><div style="overflow-x:auto">
      <table><thead><tr><th>Customer</th><th>Phone</th><th>Trade</th><th>Area</th><th>Description</th><th>Urgency</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>${JOB_REQUESTS.map(j=>`<tr>
        <td><strong>${j.customer_name}</strong></td><td>${j.customer_phone}</td>
        <td>${TRADES.find(tr=>tr.id===j.trade)?.en||j.trade}</td><td>${j.area}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${j.description}">${j.description}</td>
        <td>${j.urgency||'—'}</td>
        <td><span class="badge ${j.status==='open'?'badge-orange':'badge-green'}">${j.status}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${j.created_at?new Date(j.created_at).toLocaleDateString():''}</td>
        <td><div class="tbl-actions">
          <button class="tbl-act tbl-act-ver" onclick="closeJob(${j.id})">Close</button>
          <button class="tbl-act tbl-act-del" onclick="deleteJob(${j.id})">Delete</button>
        </div></td>
      </tr>`).join('')}</tbody></table>
    </div></div>`;
}
async function closeJob(id) {
  const ok=await dbUpdate('job_requests',id,{status:'closed'});
  if(ok){const j=JOB_REQUESTS.find(x=>x.id===id);if(j){j.status='closed';renderAdminTab('jobs');}}
}
async function deleteJob(id) {
  if(!confirm('Delete this job request?')) return;
  const ok=await dbDelete('job_requests',id);
  if(ok){JOB_REQUESTS=JOB_REQUESTS.filter(x=>x.id!==id);renderAdminTab('jobs');}
}

// ─── ADMIN: STATS ─────────────────────────────────────────────
function adminStatsHtml() {
  const total=PROFESSIONALS.length, featured=PROFESSIONALS.filter(p=>p.featured).length;
  const verified=PROFESSIONALS.filter(p=>p.verified).length, available=PROFESSIONALS.filter(p=>p.available).length;
  const openJobs=JOB_REQUESTS.filter(j=>j.status==='open').length;
  const byTrade=TRADES.map(tr=>({...tr,count:PROFESSIONALS.filter(p=>p.trade===tr.id).length,feat:PROFESSIONALS.filter(p=>p.trade===tr.id&&p.featured).length})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
  return `
    <div class="admin-header"><h2>Statistics</h2><p>Live data from Supabase</p></div>
    <div class="admin-stats">
      <div class="stat-card"><div class="num">${total}</div><div class="lbl">Total Professionals</div></div>
      <div class="stat-card"><div class="num orange">${featured}</div><div class="lbl">Featured (Paid)</div></div>
      <div class="stat-card"><div class="num">${verified}</div><div class="lbl">Verified</div></div>
      <div class="stat-card"><div class="num">${available}</div><div class="lbl">Available Now</div></div>
      <div class="stat-card"><div class="num">${JOB_REQUESTS.length}</div><div class="lbl">Total Job Requests</div></div>
      <div class="stat-card"><div class="num orange">${openJobs}</div><div class="lbl">Open Requests</div></div>
    </div>
    <div class="admin-table-wrap" style="max-width:500px">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border);font-weight:600;font-size:14px">By Trade</div>
      <table><thead><tr><th>Trade</th><th>Total</th><th>Featured</th><th>Verified</th></tr></thead>
      <tbody>${byTrade.map(tr=>`<tr>
        <td>${tr.icon} ${tr.en}</td><td><strong>${tr.count}</strong></td>
        <td>${tr.feat||'—'}</td><td>${PROFESSIONALS.filter(p=>p.trade===tr.id&&p.verified).length||'—'}</td>
      </tr>`).join('')}</tbody></table>
    </div>`;
}

// ─── INIT ─────────────────────────────────────────────────────
// Check for admin access immediately (before any async renderHome)
if(window.location.search.includes('admin') || window.location.hash === '#admin') {
  renderAdminLogin();
} else {
  renderHome();
}
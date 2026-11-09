'use strict';
/* Tailor Studio – UI, state, camera, crop, fabric and accessories */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ------------------------------------------------------------------ i18n */
const I18N = {
  en: {
    appName: 'Tailor Studio', appSub: 'Show customers the finished costume', customer: 'Customer', customerPh: 'Customer name',
    tabOutfit: 'Outfit', tabAcc: 'Accessories', female: 'Female', male: 'Male',
    saveImage: 'Save image', garment: 'Costume', body: 'Customer measurements', garmentMeas: 'Costume measurements',
    autoFit: 'Suggest lengths from height', noFabricMsg: 'Take or upload a fabric photo to dress the costume',
    vFront: 'Front', vRight: 'Right side', vBack: 'Back', vLeft: 'Left side', changeView: 'Change view',
    spin360: '360°', hint3d: '3D Model · Drag to rotate 360°',
    material: 'Material (fabric photo)', noFabric: 'No fabric photo yet', takePhoto: 'Take photo', uploadPhoto: 'Choose photo',
    crop: 'Crop', recent: 'Recent fabrics', pattern: 'Pattern', mirror: 'Seamless tiling (mirror edges)', tipTitle: 'Tips',
    sameFabric: 'Same fabric for both pieces',
    camTitle: 'Photograph the fabric', switchCam: 'Switch camera', uploadInstead: 'Choose photo instead', retake: 'Retake', usePhoto: 'Use this photo',
    camErr: 'The camera could not be opened. Allow camera access in the browser, or choose a photo instead.',
    camNone: 'This browser cannot open the camera here. Choose a photo instead.',
    cropTitle: 'Crop the material', cropHint: 'Drag the box to move it and drag the handles to resize it. Only the area inside the box becomes the fabric.',
    ratioFree: 'Free', ratioSquare: 'Square 1:1', rotLeft: 'Rotate left', rotRight: 'Rotate right', cancel: 'Cancel', applyCrop: 'Use cropped photo',
    g_shirt: 'Shirt', g_pants: 'Pants', g_combo: 'Shirt + Pants', g_suit: 'Suit', g_dress: 'Dress', g_aodai: 'Áo dài',
    p_shirt: 'Shirt', p_pants: 'Pants', p_jacket: 'Jacket', p_trousers: 'Trousers',
    m_height: 'Customer height', m_shoulder: 'Shoulder width', m_bust: 'Bust / chest', m_waist: 'Waist', m_hip: 'Hip',
    m_length_shirt: 'Shirt length', m_length_combo: 'Shirt length', m_length_suit: 'Jacket length', m_length_dress: 'Dress length', m_length_aodai: 'Áo dài length',
    m_sleeve: 'Sleeve length', m_pantsLen: 'Trouser length', m_hem: 'Trouser hem (circ.)', m_sweep: 'Skirt hem sweep', m_ease: 'Ease (looseness)',
    m_ease_combo: 'Shirt ease', m_pantsEase: 'Trouser ease',
    p_size: 'Pattern size', p_rot: 'Pattern rotation',
    a_suit: 'Shirt colour', a_aodai: 'Trousers colour',
    d_len: 'Length', d_pants: 'Trousers', d_jacket: 'Jacket', d_shirt: 'Shirt',
    drawTitle: 'Draw an accessory', toolPen: 'Pen', toolEraser: 'Eraser', toolFill: 'Fill', undo: 'Undo', clear: 'Clear',
    brush: 'Brush size', mirrorDraw: 'Symmetric drawing (mirror left/right)', addToOutfit: 'Add to outfit', drawFirst: 'Draw something first',
    library: 'Accessory library', presetLib: 'Ready-made', customLib: 'My drawings', placed: 'Selected accessory',
    accTip: 'Draw on the left, then press “Add to outfit”. Drag an accessory to move it, use the corner handle to resize and the top handle to rotate. Accessories belong to the view they were added in.',
    accEmpty: 'Tap an accessory in the library to add it, then tap it on the model to edit it.',
    accSize: 'Width', accRot: 'Rotation', flip: 'Flip', dup: 'Duplicate', del: 'Delete', allViews: 'Show on all views',
    accAdded: 'Accessory added', accAcc: 'Accessories'
  },
  vi: {
    appName: 'Tiệm May Studio', appSub: 'Cho khách xem thành phẩm trước khi may', customer: 'Khách hàng', customerPh: 'Tên khách hàng',
    tabOutfit: 'Trang phục', tabAcc: 'Phụ kiện', female: 'Nữ', male: 'Nam',
    saveImage: 'Lưu ảnh', garment: 'Trang phục', body: 'Số đo khách', garmentMeas: 'Số đo trang phục',
    autoFit: 'Gợi ý độ dài theo chiều cao', noFabricMsg: 'Chụp hoặc tải ảnh vải để may thử trang phục',
    vFront: 'Mặt trước', vRight: 'Bên phải', vBack: 'Mặt sau', vLeft: 'Bên trái', changeView: 'Đổi góc nhìn',
    spin360: '360°', hint3d: 'Mô hình 3D · Kéo chuột để xoay 360°',
    material: 'Chất liệu (ảnh vải)', noFabric: 'Chưa có ảnh vải', takePhoto: 'Chụp ảnh', uploadPhoto: 'Chọn ảnh',
    crop: 'Cắt ảnh', recent: 'Vải gần đây', pattern: 'Hoa văn', mirror: 'Ghép liền mạch (lật mép)', tipTitle: 'Gợi ý',
    sameFabric: 'Dùng chung một loại vải',
    camTitle: 'Chụp ảnh vải', switchCam: 'Đổi camera', uploadInstead: 'Chọn ảnh có sẵn', retake: 'Chụp lại', usePhoto: 'Dùng ảnh này',
    camErr: 'Không mở được camera. Hãy cho phép truy cập camera hoặc chọn ảnh có sẵn.',
    camNone: 'Trình duyệt này không mở được camera. Hãy chọn ảnh có sẵn.',
    cropTitle: 'Cắt ảnh chất liệu', cropHint: 'Kéo khung để di chuyển, kéo các núm để đổi kích thước. Chỉ phần trong khung được dùng làm vải.',
    ratioFree: 'Tự do', ratioSquare: 'Vuông 1:1', rotLeft: 'Xoay trái', rotRight: 'Xoay phải', cancel: 'Hủy', applyCrop: 'Dùng ảnh đã cắt',
    g_shirt: 'Áo sơ mi', g_pants: 'Quần tây', g_combo: 'Áo + Quần', g_suit: 'Bộ vest', g_dress: 'Váy đầm', g_aodai: 'Áo dài',
    p_shirt: 'Áo', p_pants: 'Quần', p_jacket: 'Áo vest', p_trousers: 'Quần',
    m_height: 'Chiều cao khách', m_shoulder: 'Ngang vai', m_bust: 'Vòng ngực', m_waist: 'Vòng eo', m_hip: 'Vòng mông',
    m_length_shirt: 'Dài áo', m_length_combo: 'Dài áo', m_length_suit: 'Dài áo vest', m_length_dress: 'Dài váy', m_length_aodai: 'Dài áo dài',
    m_sleeve: 'Dài tay', m_pantsLen: 'Dài quần', m_hem: 'Ống quần (vòng)', m_sweep: 'Vòng lai váy', m_ease: 'Độ rộng thoải mái',
    m_ease_combo: 'Độ rộng áo', m_pantsEase: 'Độ rộng quần',
    p_size: 'Cỡ hoa văn', p_rot: 'Xoay hoa văn',
    a_suit: 'Màu áo sơ mi', a_aodai: 'Màu quần',
    d_len: 'Dài', d_pants: 'Quần', d_jacket: 'Áo vest', d_shirt: 'Áo',
    drawTitle: 'Vẽ phụ kiện', toolPen: 'Bút', toolEraser: 'Tẩy', toolFill: 'Tô màu', undo: 'Hoàn tác', clear: 'Xóa hết',
    brush: 'Cỡ nét', mirrorDraw: 'Vẽ đối xứng (lật trái/phải)', addToOutfit: 'Thêm vào trang phục', drawFirst: 'Hãy vẽ gì đó trước',
    library: 'Thư viện phụ kiện', presetLib: 'Có sẵn', customLib: 'Hình tự vẽ', placed: 'Phụ kiện đang chọn',
    accTip: 'Vẽ ở bên trái rồi bấm “Thêm vào trang phục”. Kéo phụ kiện để di chuyển, dùng núm góc để phóng to/thu nhỏ và núm phía trên để xoay. Phụ kiện thuộc về góc nhìn khi thêm.',
    accEmpty: 'Bấm một phụ kiện trong thư viện để thêm, rồi bấm vào nó trên người mẫu để chỉnh.',
    accSize: 'Chiều rộng', accRot: 'Góc xoay', flip: 'Lật', dup: 'Nhân đôi', del: 'Xóa', allViews: 'Hiện ở mọi góc nhìn',
    accAdded: 'Đã thêm phụ kiện', accAcc: 'Phụ kiện'
  }
};

/* ------------------------------------------------------------------ constants */
const BODY_FIELDS = [
  { k: 'height', min: 140, max: 200, step: .5 },
  { k: 'shoulder', min: 34, max: 56, step: .5 },
  { k: 'bust', min: 70, max: 140, step: .5 },
  { k: 'waist', min: 55, max: 130, step: .5 },
  { k: 'hip', min: 75, max: 140, step: .5 }
];
const BODY_DEFAULT = {
  female: { height: 165, shoulder: 40, bust: 88, waist: 70, hip: 94 },
  male: { height: 172, shoulder: 46, bust: 96, waist: 82, hip: 98 }
};
const ORDER = ['shirt', 'pants', 'combo', 'suit', 'dress', 'aodai'];
const VIEWS = ['front', 'right', 'back', 'left'];
const TWO_PART = { combo: ['p_shirt', 'p_pants'], suit: ['p_jacket', 'p_trousers'] };
const ICONS = {
  shirt: 'M16 6 8 11 3 22l6 3 4-6v23h22V19l4 6 6-3-5-11-8-5q-8 6-16 0z',
  pants: 'M14 5h20l4 38H27l-3-23-3 23H10z',
  combo: 'M16 3 9 7 5 15l5 2 3-3v8h22v-8l3 3 5-2-4-8-7-4q-8 5-16 0zM14 24h20l3 21H27l-3-12-3 12H11z',
  suit: 'M16 5 7 10 4 41h14l6-13 6 13h14L41 10 32 5l-8 19z',
  dress: 'M18 5l-2 3 2 14-8 21h28L30 22l2-14-2-3q-6 6-12 0z',
  aodai: 'M17 4 9 9 5 26l5 2 5-10 1 10-4 27h10l2-15 2 15h10l-4-27 1-10 5 10 5-2-4-17-8-5q-7 4-14 0z'
};
const fmt = v => (Math.round(v * 10) / 10).toString();
const t = k => (I18N[state.lang][k] ?? I18N.en[k] ?? k);
const tm = (k, g) => I18N[state.lang]['m_' + k + '_' + g] ?? I18N.en['m_' + k + '_' + g] ?? t('m_' + k);

/* ------------------------------------------------------------------ state */
const newFab = () => ({ fid: null, src: null, ar: 1, size: 14, rot: 0, mirror: true, orig: null });
function defaults() {
  const bodies = { female: { ...BODY_DEFAULT.female }, male: { ...BODY_DEFAULT.male } };
  const g = {};
  ORDER.forEach(k => { g[k] = {}; GARMENTS[k].fields.forEach(f => g[k][f.k] = f.def(bodies.female.height)); });
  return {
    lang: 'en', tab: 'outfit', gender: 'female', customer: '', garment: 'aodai', view: 'front',
    bodies, body: bodies.female, g,
    accent: { suit: '#f6f3ec', aodai: '#f4f1e8' },
    fab: { top: newFab(), bottom: newFab() }, linked: true, target: 'top',
    acc: [], sel: null
  };
}
let state = defaults();
let history = [];   // {id, src, ar}
let accLib = [];    // {id, name, src, ar}

try {
  const s = JSON.parse(localStorage.getItem('tailor-state') || 'null');
  if (s) {
    const d = defaults();
    state.lang = s.lang || d.lang; state.gender = s.gender || 'female'; state.customer = s.customer || '';
    state.garment = s.garment || d.garment; state.view = s.view || 'front'; state.linked = s.linked !== false;
    if (s.bodies) { state.bodies.female = { ...d.bodies.female, ...s.bodies.female }; state.bodies.male = { ...d.bodies.male, ...s.bodies.male }; }
    else if (s.body) state.bodies.female = { ...d.bodies.female, ...s.body };
    ORDER.forEach(k => state.g[k] = { ...d.g[k], ...((s.g || {})[k] || {}) });
    state.accent = { ...d.accent, ...(s.accent || {}) };
    ['top', 'bottom'].forEach(k => { const f = (s.fab || {})[k] || (k === 'top' ? s.fabric : null) || {}; state.fab[k] = { ...newFab(), ...f, src: null, orig: null }; });
    state.acc = s.acc || [];
  }
  if (!ORDER.includes(state.garment)) state.garment = 'shirt';
  state.body = state.bodies[state.gender];
  if (state.gender === 'male' && state.garment === 'dress') state.garment = 'shirt';
  history = (JSON.parse(localStorage.getItem('tailor-fabrics') || '[]')).map(h => typeof h === 'string' ? { id: uid(), src: h, ar: 1 } : h);
  ['top', 'bottom'].forEach(k => {
    const f = state.fab[k], h = history.find(x => x.id === f.fid) || (k === 'top' ? history[0] : null);
    if (h) { f.fid = h.id; f.src = h.src; f.ar = h.ar; }
  });
  accLib = JSON.parse(localStorage.getItem('tailor-acc-lib') || '[]');
} catch (e) { /* ignore corrupt storage */ }

function persist() {
  try {
    const c = { ...state, body: null, sel: null, tab: 'outfit', fab: {} };
    ['top', 'bottom'].forEach(k => { const f = state.fab[k]; c.fab[k] = { fid: f.fid, ar: f.ar, size: f.size, rot: f.rot, mirror: f.mirror }; });
    localStorage.setItem('tailor-state', JSON.stringify(c));
  } catch (e) { }
}
function persistFabrics() {
  try { localStorage.setItem('tailor-fabrics', JSON.stringify(history)); }
  catch (e) { try { localStorage.setItem('tailor-fabrics', JSON.stringify(history.slice(0, 2))); } catch (e2) { } }
}
const persistLib = () => { try { localStorage.setItem('tailor-acc-lib', JSON.stringify(accLib)); } catch (e) { toast('Storage full'); } };

const twoPart = () => !!TWO_PART[state.garment];
const slot = () => (twoPart() && !state.linked) ? state.target : 'top';
const cur = () => state.fab[slot()];

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ------------------------------------------------------------------ rendering */
let raf = 0;
function render(swap) { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => draw(swap)); }
function draw(swap) {
  const r = renderFigure(state);
  const fig = $('#figure');
  if (window.Tailor3D) {
    fig.innerHTML = '';
    const fe = $('#floorEllipse'); if (fe) fe.style.display = 'none';
    window.Tailor3D.update(state, r.c, !swap);
  } else {
    fig.innerHTML = r.svg;
    if (swap) { fig.classList.remove('swap'); void fig.getBoundingClientRect(); fig.classList.add('swap'); }
  }
  drawDims(r); drawRuler(r.c); renderAcc();
  $('#badgeGarment').textContent = state.tab === 'acc' ? t('accAcc') : t('g_' + state.garment);
  $('#badgeView').textContent = t({ front: 'vFront', right: 'vRight', back: 'vBack', left: 'vLeft' }[state.view]);
  $$('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.view === state.view));
  updateNoFabric();
}
function updateNoFabric() {
  const need = !state.fab.top.src || (twoPart() && !state.linked && !state.fab.bottom.src);
  $('#noFabric').hidden = !need || state.tab === 'acc';
}

function drawRuler(c) {
  const x = 46; let s = '';
  s += `<line x1="${x}" y1="${Y(0)}" x2="${x}" y2="${Y(200)}" stroke="#9b8f80" stroke-width="1.2"/>`;
  for (let cm = 0; cm <= 200; cm += 5) {
    const major = cm % 10 === 0, y = Y(cm);
    s += `<line x1="${x}" y1="${y}" x2="${x + (major ? 12 : 6)}" y2="${y}" stroke="#9b8f80" stroke-width="1"/>`;
    if (cm % 20 === 0) s += `<text x="${x - 6}" y="${y + 4}" font-size="11" fill="#8a7e70" text-anchor="end" font-family="Segoe UI,sans-serif">${cm}</text>`;
  }
  const yh = Y(c.H);
  s += `<path d="M${x + 14} ${yh}l9 -5v10z" fill="#b58b3f"/><text x="${x + 27}" y="${yh + 4}" font-size="12" font-weight="700" fill="#8a6620" font-family="Segoe UI,sans-serif">${fmt(c.H)} cm</text>`;
  s += `<text x="${x}" y="${Y(0) + 22}" font-size="11" fill="#8a7e70" text-anchor="middle" font-family="Segoe UI,sans-serif">cm</text>`;
  $('#ruler').innerHTML = s;
}

function drawDims(r) {
  let s = '';
  (r.dims || []).forEach(d => {
    const x = 572 + (d.off || 0) * 40, y0 = Y(d.h0), y1 = Y(d.h1), len = d.h0 - d.h1, col = '#27364a';
    s += `<line x1="${CX + 60}" y1="${y1}" x2="${x + 6}" y2="${y1}" stroke="#27364a" stroke-opacity=".25" stroke-dasharray="3 4"/>`;
    s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${col}" stroke-width="1.6"/>`;
    s += `<path d="M${x - 5} ${y0 + 8}L${x} ${y0}L${x + 5} ${y0 + 8}M${x - 5} ${y1 - 8}L${x} ${y1}L${x + 5} ${y1 - 8}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>`;
    s += `<line x1="${x - 7}" y1="${y0}" x2="${x + 7}" y2="${y0}" stroke="${col}" stroke-width="1.6"/><line x1="${x - 7}" y1="${y1}" x2="${x + 7}" y2="${y1}" stroke="${col}" stroke-width="1.6"/>`;
    const ym = (y0 + y1) / 2;
    s += `<g transform="translate(${x + 18} ${ym}) rotate(90)"><rect x="-52" y="-13" width="104" height="26" rx="13" fill="#fff" stroke="#27364a" stroke-opacity=".3"/><text x="0" y="5" font-size="13" font-weight="700" text-anchor="middle" fill="${col}" font-family="Segoe UI,sans-serif">${t('d_' + d.label)} ${fmt(len)} cm</text></g>`;
  });
  $('#dims').innerHTML = s;
}

/* ------------------------------------------------------------------ fabric patterns */
function buildPatternEl(pat, f) {
  pat.setAttribute('patternTransform', `rotate(${f.rot})`);
  if (!f.src) {
    pat.setAttribute('width', 24); pat.setAttribute('height', 24); pat.removeAttribute('patternTransform');
    pat.innerHTML = `<rect width="24" height="24" fill="#f0e9db"/><path d="M-6 6l12 12M0 24L24 0M18 30l12-12" stroke="#d3c7b0" stroke-width="3"/>`;
    return;
  }
  const T = f.size * SC, Th = T * (f.ar || 1), W = 2 * T, Hh = 2 * Th, s = f.src;
  const img = tr => `<image href="${s}" xlink:href="${s}" width="${T}" height="${Th}" preserveAspectRatio="none" ${tr ? `transform="${tr}"` : ''}/>`;
  if (f.mirror) {
    pat.setAttribute('width', W); pat.setAttribute('height', Hh);
    pat.innerHTML = img('') + img(`translate(${W} 0) scale(-1 1)`) + img(`translate(0 ${Hh}) scale(1 -1)`) + img(`translate(${W} ${Hh}) scale(-1 -1)`);
  } else {
    pat.setAttribute('width', T); pat.setAttribute('height', Th);
    pat.innerHTML = img('');
  }
}
function applyFabric() {
  const top = state.fab.top, bot = (state.linked || !twoPart()) ? top : state.fab.bottom;
  buildPatternEl($('#fabric'), top); buildPatternEl($('#fabric2'), bot);
  if (window.Tailor3D) { window.Tailor3D.updateTextures(state); window.Tailor3D.renderOnce(); }
  const f = cur(), sw = $('#swatch');
  sw.classList.toggle('has', !!f.src);
  sw.style.backgroundImage = f.src ? `url(${f.src})` : 'none';
  $('#recropBtn').hidden = !f.src;
  updateNoFabric(); renderRecent();
}
function renderRecent() {
  $('#recentSec').hidden = history.length < 1;
  const box = $('#recent'); box.innerHTML = '';
  history.slice(0, 6).forEach(h => {
    const b = document.createElement('button');
    b.style.backgroundImage = `url(${h.src})`;
    b.classList.toggle('on', h.src === cur().src);
    b.onclick = () => { const f = cur(); Object.assign(f, { fid: h.id, src: h.src, ar: h.ar, orig: null }); applyFabric(); persist(); };
    box.appendChild(b);
  });
}
function setFabric(src, ar = 1, orig = null) {
  const id = uid(), f = cur();
  history = [{ id, src, ar }, ...history].slice(0, 6);
  Object.assign(f, { fid: id, src, ar, orig });
  persistFabrics(); persist(); applyFabric(); render();
}
function updatePieceUI() {
  const two = twoPart();
  $('#pieceBox').hidden = !two;
  if (!two) return;
  $('#linked').checked = state.linked;
  $('#targetSeg').style.display = state.linked ? 'none' : 'flex';
  $('#tTop').textContent = t(TWO_PART[state.garment][0]);
  $('#tBottom').textContent = t(TWO_PART[state.garment][1]);
  $$('#targetSeg button').forEach(b => b.classList.toggle('on', b.dataset.target === state.target));
}
$('#linked').onchange = e => {
  state.linked = e.target.checked;
  if (!state.linked && !state.fab.bottom.src) state.fab.bottom = { ...state.fab.top, orig: null };
  state.target = 'top';
  updatePieceUI(); buildPatternRows(); applyFabric(); render(); persist();
};
$$('#targetSeg button').forEach(b => b.onclick = () => { state.target = b.dataset.target; updatePieceUI(); buildPatternRows(); applyFabric(); });

/* ------------------------------------------------------------------ image intake (photo / file) → crop */
function canvasFrom(source, w, h, max = 1600) {
  const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c;
}
function handleFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => { openCrop(canvasFrom(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(url); };
  img.src = url;
}
$('#uploadBtn').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = e => { handleFile(e.target.files[0]); e.target.value = ''; };
$('#recropBtn').onclick = () => {
  const f = cur(); if (!f.src) return;
  if (f.orig) return openCrop(f.orig);
  const img = new Image(); img.onload = () => openCrop(canvasFrom(img, img.naturalWidth, img.naturalHeight)); img.src = f.src;
};

/* ------------------------------------------------------------------ camera */
let stream = null, facing = 'environment', shot = null;
async function startCam() {
  stopCam();
  const msg = $('#camMsg'); msg.hidden = true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = t('camNone'); msg.hidden = false; return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    const v = $('#camVideo'); v.srcObject = stream; await v.play();
  } catch (e) { msg.textContent = t('camErr'); msg.hidden = false; }
}
function stopCam() { if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; } }
function openCam() { $('#camModal').hidden = false; showLive(); startCam(); }
function closeCam() { stopCam(); $('#camModal').hidden = true; }
function showLive() {
  $('.cam-frame').classList.remove('review'); $('#camShot').style.display = 'none'; $('#camVideo').style.display = 'block';
  $('#camLive').hidden = false; $('#camReview').hidden = true;
}
$('#camBtn').onclick = openCam;
$('#camClose').onclick = closeCam;
$('#camSwitch').onclick = () => { facing = facing === 'environment' ? 'user' : 'environment'; startCam(); };
$('#camFallback').onclick = () => { closeCam(); $('#fileInput').click(); };
$('#camShutter').onclick = () => {
  const v = $('#camVideo'); if (!stream || !v.videoWidth) return;
  shot = canvasFrom(v, v.videoWidth, v.videoHeight);          // whole frame – cropped in the next step
  $('#camShot').src = shot.toDataURL('image/jpeg', .9); $('#camShot').style.display = 'block'; $('#camVideo').style.display = 'none';
  $('.cam-frame').classList.add('review'); $('#camLive').hidden = true; $('#camReview').hidden = false;
};
$('#camRetake').onclick = showLive;
$('#camUse').onclick = () => { const c = shot; closeCam(); if (c) openCrop(c); };

/* ------------------------------------------------------------------ crop tool */
const crop = { src: null, s: 1, W: 0, H: 0, box: { x: 0, y: 0, w: 0, h: 0 }, ratio: 1, drag: null };
const MINB = 40;
function openCrop(canvas) {
  crop.src = canvas; $('#cropModal').hidden = false;
  layoutCrop(); setRatio('1');
}
function layoutCrop() {
  const s = Math.min(1100 / crop.src.width, 580 / crop.src.height);
  const cc = $('#cropCanvas'); cc.width = Math.round(crop.src.width * s); cc.height = Math.round(crop.src.height * s);
  cc.getContext('2d').drawImage(crop.src, 0, 0, cc.width, cc.height);
  Object.assign(crop, { s, W: cc.width, H: cc.height });
}
function setRatio(r) {
  crop.ratio = r === 'free' ? null : parseFloat(r);
  $$('#ratioSeg button').forEach(b => b.classList.toggle('on', b.dataset.ratio === r));
  $('#cropBox').classList.toggle('locked', !!crop.ratio);
  let w = crop.W * .86, h = crop.H * .86;
  if (crop.ratio) { w = Math.min(w, h * crop.ratio); h = w / crop.ratio; }
  crop.box = { x: (crop.W - w) / 2, y: (crop.H - h) / 2, w, h };
  paintBox();
}
function paintBox() {
  const b = crop.box, el = $('#cropBox');
  el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
}
$$('#ratioSeg button').forEach(b => b.onclick = () => setRatio(b.dataset.ratio));
$('#cropBox').addEventListener('pointerdown', e => {
  crop.drag = { h: e.target.dataset.h || 'move', sx: e.clientX, sy: e.clientY, b: { ...crop.box } };
  $('#cropBox').setPointerCapture(e.pointerId); e.preventDefault();
});
$('#cropBox').addEventListener('pointermove', e => {
  const d = crop.drag; if (!d) return;
  const k = $('#cropWrap').getBoundingClientRect().width / crop.W;       // stage is CSS-scaled
  const dx = (e.clientX - d.sx) / k, dy = (e.clientY - d.sy) / k, b = d.b, W = crop.W, H = crop.H;
  if (d.h === 'move') {
    crop.box = { x: clamp(b.x + dx, 0, W - b.w), y: clamp(b.y + dy, 0, H - b.h), w: b.w, h: b.h };
  } else {
    let x = b.x, y = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
    if (d.h.includes('w')) x = clamp(x + dx, 0, x2 - MINB);
    if (d.h.includes('e')) x2 = clamp(x2 + dx, x + MINB, W);
    if (d.h.includes('n')) y = clamp(y + dy, 0, y2 - MINB);
    if (d.h.includes('s')) y2 = clamp(y2 + dy, y + MINB, H);
    if (crop.ratio) {                                                       // corners only when ratio is locked
      let nw = x2 - x, nh = nw / crop.ratio;
      if (d.h.includes('n')) { y = y2 - nh; if (y < 0) { y = 0; nh = y2; nw = nh * crop.ratio; } }
      else { y2 = y + nh; if (y2 > H) { y2 = H; nh = H - y; nw = nh * crop.ratio; } }
      if (d.h.includes('w')) x = x2 - nw; else x2 = x + nw;
    }
    crop.box = { x, y, w: x2 - x, h: y2 - y };
  }
  paintBox();
});
['pointerup', 'pointercancel'].forEach(ev => $('#cropBox').addEventListener(ev, () => crop.drag = null));
function rotateCrop(dir) {
  const s = crop.src, c = document.createElement('canvas'); c.width = s.height; c.height = s.width;
  const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.rotate(dir * Math.PI / 2); g.drawImage(s, -s.width / 2, -s.height / 2);
  crop.src = c; layoutCrop(); setRatio($('#ratioSeg .on').dataset.ratio);
}
$('#rotL').onclick = () => rotateCrop(-1);
$('#rotR').onclick = () => rotateCrop(1);
const closeCrop = () => { $('#cropModal').hidden = true; };
$('#cropClose').onclick = closeCrop; $('#cropCancel').onclick = closeCrop;
$('#cropApply').onclick = () => {
  const b = crop.box, sw = b.w / crop.s, sh = b.h / crop.s, k = Math.min(1, 900 / Math.max(sw, sh));
  const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  c.getContext('2d').drawImage(crop.src, b.x / crop.s, b.y / crop.s, sw, sh, 0, 0, c.width, c.height);
  const orig = crop.src;
  closeCrop(); setFabric(c.toDataURL('image/jpeg', .9), c.height / c.width, orig);
};

/* ------------------------------------------------------------------ measurement controls */
function makeRow(host, label, f, get, set) {
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label></label><div class="num"><input type="number"><small>${f.unitText ?? 'cm'}</small></div><input type="range">`;
  row.querySelector('label').textContent = label;
  const num = row.querySelector('input[type=number]'), rng = row.querySelector('input[type=range]');
  [num, rng].forEach(i => { i.min = f.min; i.max = f.max; i.step = f.step; });
  const sync = v => { num.value = fmt(v); rng.value = v; };
  sync(get());
  rng.oninput = () => { const v = +rng.value; set(v); sync(v); };
  num.oninput = () => { const v = parseFloat(num.value); if (isNaN(v)) return; const c = clamp(v, f.min, f.max); set(c); rng.value = c; };
  num.onchange = () => { const v = clamp(parseFloat(num.value) || f.min, f.min, f.max); set(v); sync(v); };
  host.appendChild(row);
}
function buildBody() {
  const host = $('#bodyRows'); host.innerHTML = '';
  BODY_FIELDS.forEach(f => makeRow(host, t('m_' + f.k), f, () => state.body[f.k], v => { state.body[f.k] = v; render(); persist(); }));
}
function buildGarmentRows() {
  const host = $('#garmentRows'); host.innerHTML = '';
  const G = GARMENTS[state.garment];
  G.fields.forEach(f => makeRow(host, tm(f.k, state.garment), f, () => state.g[state.garment][f.k], v => { state.g[state.garment][f.k] = v; render(); persist(); }));
  $('#accentRow').hidden = !G.accent;
  if (G.accent) { $('#accentLabel').textContent = t('a_' + state.garment); $('#accent').value = state.accent[state.garment]; }
}
function buildGarmentGrid() {
  const host = $('#garmentGrid'); host.innerHTML = '';
  ORDER.filter(k => !(k === 'dress' && state.gender === 'male')).forEach(k => {
    const b = document.createElement('button'); b.className = 'g-btn' + (k === state.garment ? ' on' : '');
    b.innerHTML = `<svg viewBox="0 0 48 48"><path d="${ICONS[k]}"/></svg><span>${t('g_' + k)}</span>`;
    b.onclick = () => {
      state.garment = k; state.target = 'top';
      buildGarmentGrid(); buildGarmentRows(); updatePieceUI(); buildPatternRows(); applyFabric(); render(true); persist();
    };
    host.appendChild(b);
  });
  $$('#genderSeg button').forEach(b => b.classList.toggle('on', b.dataset.gender === state.gender));
}
function buildPatternRows() {
  const host = $('#patternRows'); host.innerHTML = '';
  makeRow(host, t('p_size'), { min: 3, max: 40, step: .5 }, () => cur().size, v => { cur().size = v; applyFabric(); persist(); });
  makeRow(host, t('p_rot'), { min: 0, max: 180, step: 1, unitText: '°' }, () => cur().rot, v => { cur().rot = v; applyFabric(); persist(); });
  $('#mirror').checked = cur().mirror;
}
function autoFitAll(onlyCurrent) {
  const H = state.body.height;
  (onlyCurrent ? [state.garment] : ORDER).forEach(g => GARMENTS[g].fields.forEach(f => {
    if (['length', 'sleeve', 'pantsLen'].includes(f.k)) state.g[g][f.k] = clamp(f.def(H), f.min, f.max);
  }));
}
$('#autoFit').onclick = () => { autoFitAll(true); buildGarmentRows(); render(); persist(); };
$('#accent').oninput = e => { state.accent[state.garment] = e.target.value; render(); persist(); };
$('#mirror').onchange = e => { cur().mirror = e.target.checked; applyFabric(); persist(); };
$('#customerName').oninput = e => { state.customer = e.target.value; persist(); };

/* gender */
function setGender(g) {
  if (g === state.gender) return;
  state.gender = g; state.body = state.bodies[g];
  if (g === 'male' && state.garment === 'dress') state.garment = 'shirt';
  autoFitAll(false);
  buildGarmentGrid(); buildBody(); buildGarmentRows(); updatePieceUI(); buildPatternRows(); applyFabric(); render(true); persist();
}
$$('#genderSeg button').forEach(b => b.onclick = () => setGender(b.dataset.gender));

/* views */
function setView(v) { state.view = v; if (window.Tailor3D) window.Tailor3D.setViewYaw(v); render(true); persist(); }
function stepView(d) { setView(VIEWS[(VIEWS.indexOf(state.view) + d + VIEWS.length) % VIEWS.length]); }
$$('#viewSeg button').forEach(b => b.onclick = () => setView(b.dataset.view));
$('#cycleView').onclick = () => stepView(1);
$('#nextView').onclick = () => stepView(1);
$('#prevView').onclick = () => stepView(-1);
if ($('#spinBtn')) $('#spinBtn').onclick = () => { if (window.Tailor3D) window.Tailor3D.toggleSpin(); };

/* tabs */
function setTab(tab) {
  state.tab = tab;
  const st = $('#stage'); st.classList.toggle('t-outfit', tab === 'outfit'); st.classList.toggle('t-acc', tab === 'acc');
  $$('#tabSeg button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  if (tab === 'acc') { buildLib(); buildAccSel(); }
  render();
}
$$('#tabSeg button').forEach(b => b.onclick = () => setTab(b.dataset.tab));

/* ------------------------------------------------------------------ accessories */
const svgWrap = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
const pearls = (() => { let s = ''; for (let i = 0; i <= 14; i++) { const u = i / 14, x = 10 + 150 * u, y = 12 + 70 * (1 - (1 - 2 * u) ** 2); s += `<circle cx="${x}" cy="${y}" r="8" fill="#f6f1e8" stroke="#a9a091" stroke-width="2"/><circle cx="${x - 2.5}" cy="${y - 2.5}" r="2.5" fill="#fff"/>`; } return s; })();
const petals = [0, 72, 144, 216, 288].map(a => `<ellipse cx="32" cy="17" rx="9" ry="14" transform="rotate(${a} 32 32)" fill="#eaa0b6" stroke="#a24a68" stroke-width="2"/>`).join('');
const PRESETS = [
  { id: 'belt', name: { en: 'Belt', vi: 'Thắt lưng' }, w: 300, h: 44, svg: '<rect x="2" y="10" width="296" height="24" rx="4" fill="#5b3a24" stroke="#2d1b10" stroke-width="2"/><rect x="2" y="14" width="296" height="3" fill="#8a6144" opacity=".7"/><rect x="128" y="3" width="44" height="38" rx="5" fill="none" stroke="#d6b04c" stroke-width="6"/><rect x="146" y="14" width="8" height="16" rx="2" fill="#d6b04c"/>' },
  { id: 'bowtie', name: { en: 'Bow tie', vi: 'Nơ cổ' }, w: 128, h: 64, svg: '<g transform="translate(4 0)"><path d="M60 32 8 6Q-2 32 8 58Z" fill="#8c1d2c" stroke="#4a0d16" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 32 112 6Q122 32 112 58Z" fill="#8c1d2c" stroke="#4a0d16" stroke-width="2.5" stroke-linejoin="round"/><rect x="48" y="20" width="24" height="24" rx="6" fill="#a62638" stroke="#4a0d16" stroke-width="2.5"/></g>' },
  { id: 'scarf', name: { en: 'Scarf', vi: 'Khăn quàng' }, w: 160, h: 130, svg: '<path d="M8 18Q80 -8 152 18L142 56Q80 36 18 56Z" fill="#c0563b" stroke="#6b2a18" stroke-width="3" stroke-linejoin="round"/><path d="M62 46H102L112 124 74 116Z" fill="#c0563b" stroke="#6b2a18" stroke-width="3" stroke-linejoin="round"/><path d="M30 30Q80 12 130 30M26 42Q80 26 134 42M72 70 108 72M74 90 110 94" fill="none" stroke="#f0d9a8" stroke-width="3"/>' },
  { id: 'brooch', name: { en: 'Flower brooch', vi: 'Hoa cài áo' }, w: 64, h: 64, svg: petals + '<circle cx="32" cy="32" r="8" fill="#d6b04c" stroke="#8a6b1e" stroke-width="2"/>' },
  { id: 'pocket', name: { en: 'Pocket square', vi: 'Khăn túi ngực' }, w: 64, h: 56, svg: '<path d="M4 52 8 20 19 31 30 6 42 30 54 16 60 52Z" fill="#fbfaf6" stroke="#b9b3a6" stroke-width="2.5" stroke-linejoin="round"/>' },
  { id: 'pearls', name: { en: 'Pearl necklace', vi: 'Dây chuyền ngọc trai' }, w: 170, h: 100, svg: pearls },
  { id: 'hat', name: { en: 'Hat', vi: 'Mũ' }, w: 200, h: 112, svg: '<ellipse cx="100" cy="84" rx="96" ry="20" fill="#4a3b32" stroke="#241b16" stroke-width="3"/><path d="M42 80Q40 20 100 16Q160 20 158 80Q100 98 42 80Z" fill="#5f4d41" stroke="#241b16" stroke-width="3" stroke-linejoin="round"/><path d="M43 68Q100 86 157 68L158 80Q100 98 42 80Z" fill="#241b16"/>' },
  { id: 'buttons', name: { en: 'Gold buttons', vi: 'Hàng nút vàng' }, w: 30, h: 170, svg: [20, 62, 104, 146].map(y => `<circle cx="15" cy="${y}" r="13" fill="#d6b04c" stroke="#8a6b1e" stroke-width="2"/><circle cx="15" cy="${y}" r="8" fill="none" stroke="#8a6b1e" stroke-width="1.5"/>`).join('') },
  { id: 'ribbon', name: { en: 'Ribbon bow', vi: 'Nơ lưng' }, w: 150, h: 96, svg: '<path d="M75 40Q30 -4 8 30Q24 62 75 48Z" fill="#e7a0b4" stroke="#a14a63" stroke-width="3" stroke-linejoin="round"/><path d="M75 40Q120 -4 142 30Q126 62 75 48Z" fill="#e7a0b4" stroke="#a14a63" stroke-width="3" stroke-linejoin="round"/><path d="M70 50 40 92 62 84 72 94ZM80 50 110 92 88 84 78 94Z" fill="#d98aa0" stroke="#a14a63" stroke-width="3" stroke-linejoin="round"/><rect x="62" y="30" width="26" height="26" rx="8" fill="#e7a0b4" stroke="#a14a63" stroke-width="3"/>' },
  { id: 'bag', name: { en: 'Handbag', vi: 'Túi xách' }, w: 130, h: 120, svg: '<path d="M36 44Q36 8 65 8Q94 8 94 44" fill="none" stroke="#4d2619" stroke-width="7" stroke-linecap="round"/><path d="M10 44H120L126 112H4Z" fill="#7b3f2a" stroke="#3f1f12" stroke-width="3" stroke-linejoin="round"/><rect x="55" y="40" width="20" height="20" rx="4" fill="#d6b04c" stroke="#8a6b1e" stroke-width="2"/>' }
];
PRESETS.forEach(p => { p.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgWrap(p.w, p.h, p.svg)); p.ar = p.h / p.w; });
const libItem = id => PRESETS.find(p => p.id === id) || accLib.find(a => a.id === id);

/* default position of a new accessory (cm from the figure, then to svg units) */
function defaultPlace(id, c) {
  const { lv, H, b } = c, side = state.view === 'left' || state.view === 'right';
  const wf = halfW(b.waist + 8) * 2 + 2;
  switch (id) {
    case 'belt': return { x: 0, h: lv.waist, w: side ? halfD(b.waist + 8) * 2 + 1.5 : wf };
    case 'bowtie': return { x: side ? 1 : 0, h: lv.hps - 1, w: 11 };
    case 'scarf': return { x: 0, h: lv.hps - 5, w: 30 };
    case 'brooch': return { x: side ? 3 : -halfW(b.bust) * .55, h: lv.bust + 1, w: 8 };
    case 'pocket': return { x: side ? 3 : halfW(b.bust) * .62, h: lv.bust + 2, w: 8 };
    case 'pearls': return { x: side ? 2 : 0, h: lv.hps - 9, w: 19 };
    case 'hat': return { x: side ? 1 : 0, h: .972 * H + 4.6, w: 33 };
    case 'buttons': return { x: side ? 2 : 0, h: lv.waist + 8, w: 2.6 };
    case 'ribbon': return { x: 0, h: lv.waist, w: 15 };
    case 'bag': return { x: side ? 6 : c.sh + 10, h: lv.hip - 5, w: 24 };
    default: return { x: 0, h: lv.bust, w: 22 };
  }
}
function addAcc(libId) {
  const it = libItem(libId); if (!it) return;
  const pl = defaultPlace(libId, makeCtx(state));
  const a = { id: 'a' + uid(), lib: libId, x: X(pl.x), y: Y(pl.h), w: pl.w * SC, rot: 0, flip: false, all: false, view: state.view };
  state.acc.push(a); state.sel = a.id; renderAcc(); buildAccSel(); persist();
}

function renderAcc() {
  const vis = state.acc.filter(a => (a.all || a.view === state.view) && libItem(a.lib));
  $('#acc').innerHTML = vis.map(a => {
    const it = libItem(a.lib), w = a.w, h = w * it.ar;
    return `<g class="acc" data-id="${a.id}" transform="translate(${a.x} ${a.y}) rotate(${a.rot})"><g transform="scale(${a.flip ? -1 : 1} 1)"><image href="${it.src}" xlink:href="${it.src}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" preserveAspectRatio="none"/></g></g>`;
  }).join('');
  const a = state.tab === 'acc' && vis.find(x => x.id === state.sel);
  if (!a) { $('#accUI').innerHTML = ''; return; }
  const it = libItem(a.lib), w = a.w, h = w * it.ar;
  $('#accUI').innerHTML = `<g transform="translate(${a.x} ${a.y}) rotate(${a.rot})">
    <rect x="${-w / 2 - 4}" y="${-h / 2 - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="#27364a" stroke-width="1.6" stroke-dasharray="6 4"/>
    <line x1="0" y1="${-h / 2 - 4}" x2="0" y2="${-h / 2 - 28}" stroke="#27364a" stroke-width="1.6"/>
    <circle data-h="rot" cx="0" cy="${-h / 2 - 30}" r="9" fill="#fff" stroke="#27364a" stroke-width="2.5" style="cursor:grab"/>
    <rect data-h="size" x="${w / 2 - 6}" y="${h / 2 - 6}" width="16" height="16" rx="4" fill="#fff" stroke="#27364a" stroke-width="2.5" style="cursor:nwse-resize"/></g>`;
}
function svgPt(e) {
  const svg = $('#svg'), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
let adrag = null;
$('#svg').addEventListener('pointerdown', e => {
  if (state.tab !== 'acc') return;
  const hEl = e.target.closest('[data-h]'), aEl = e.target.closest('.acc'), p = svgPt(e);
  const sel = state.acc.find(a => a.id === state.sel);
  if (hEl && sel) adrag = { mode: hEl.dataset.h, a: sel };
  else if (aEl) {
    state.sel = aEl.dataset.id; const a = state.acc.find(x => x.id === state.sel);
    adrag = { mode: 'move', a, dx: p.x - a.x, dy: p.y - a.y }; renderAcc(); buildAccSel();
  } else { state.sel = null; renderAcc(); buildAccSel(); return; }
  $('#svg').setPointerCapture(e.pointerId); e.preventDefault();
});
$('#svg').addEventListener('pointermove', e => {
  if (!adrag) return;
  const p = svgPt(e), a = adrag.a, it = libItem(a.lib);
  if (adrag.mode === 'move') { a.x = p.x - adrag.dx; a.y = p.y - adrag.dy; }
  else if (adrag.mode === 'rot') a.rot = Math.round((Math.atan2(p.y - a.y, p.x - a.x) * 180 / Math.PI + 90) * 2) / 2;
  else {
    const r = -a.rot * Math.PI / 180, vx = p.x - a.x, vy = p.y - a.y;
    const lx = Math.abs(vx * Math.cos(r) - vy * Math.sin(r)), ly = Math.abs(vx * Math.sin(r) + vy * Math.cos(r));
    a.w = clamp(2 * Math.max(lx, ly / it.ar), 8, 600);
  }
  renderAcc();
});
['pointerup', 'pointercancel'].forEach(ev => $('#svg').addEventListener(ev, () => { if (adrag) { adrag = null; buildAccSel(); persist(); } }));
document.addEventListener('keydown', e => {
  if (state.tab === 'acc' && state.sel && (e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) delAcc();
});
function delAcc() { state.acc = state.acc.filter(a => a.id !== state.sel); state.sel = null; renderAcc(); buildAccSel(); persist(); }

function buildLib() {
  const host = $('#accLib'); host.innerHTML = '';
  const add = (it, name, del) => {
    const d = document.createElement('div'); d.className = 'it'; d.title = name;
    d.innerHTML = `<img src="${it.src}" alt="">`;
    d.onclick = () => addAcc(it.id);
    if (del) {
      const x = document.createElement('button'); x.className = 'del'; x.textContent = '×';
      x.onclick = ev => { ev.stopPropagation(); accLib = accLib.filter(a => a.id !== it.id); state.acc = state.acc.filter(a => a.lib !== it.id); persistLib(); persist(); buildLib(); renderAcc(); buildAccSel(); };
      d.appendChild(x);
    }
    host.appendChild(d);
  };
  const sep = txt => { const s = document.createElement('div'); s.className = 'sep'; s.textContent = txt; host.appendChild(s); };
  sep(t('presetLib')); PRESETS.forEach(p => add(p, p.name[state.lang]));
  if (accLib.length) { sep(t('customLib')); accLib.forEach(a => add(a, a.name || '', true)); }
}
function buildAccSel() {
  const host = $('#accSel'); host.innerHTML = '';
  const a = state.acc.find(x => x.id === state.sel);
  if (!a) { host.innerHTML = `<div class="acc-empty">${t('accEmpty')}</div>`; return; }
  makeRow(host, t('accSize'), { min: 2, max: 120, step: .5 }, () => a.w / SC, v => { a.w = v * SC; renderAcc(); persist(); });
  makeRow(host, t('accRot'), { min: -180, max: 180, step: 1, unitText: '°' }, () => a.rot, v => { a.rot = v; renderAcc(); persist(); });
  const btns = document.createElement('div'); btns.className = 'acc-btns';
  btns.innerHTML = `<button class="btn" id="aFlip">${t('flip')}</button><button class="btn" id="aDup">${t('dup')}</button><button class="btn danger" id="aDel">${t('del')}</button>`;
  host.appendChild(btns);
  const all = document.createElement('label'); all.className = 'check';
  all.innerHTML = `<input type="checkbox" ${a.all ? 'checked' : ''}><span>${t('allViews')}</span>`;
  host.appendChild(all);
  $('#aFlip').onclick = () => { a.flip = !a.flip; renderAcc(); persist(); };
  $('#aDup').onclick = () => { const n = { ...a, id: 'a' + uid(), x: a.x + 18, y: a.y + 18 }; state.acc.push(n); state.sel = n.id; renderAcc(); buildAccSel(); persist(); };
  $('#aDel').onclick = delAcc;
  all.querySelector('input').onchange = e => { a.all = e.target.checked; if (!a.all) a.view = state.view; renderAcc(); persist(); };
}

/* ---- drawing studio ---- */
const dc = $('#drawCanvas'), dx = dc.getContext('2d', { willReadFrequently: true });
const PALETTE = ['#1f1f1f', '#ffffff', '#8c1d2c', '#d6453d', '#e8913a', '#e9c46a', '#4f8f5a', '#2a9d8f', '#2f5d9e', '#6a4c93', '#e9a8b8', '#7a5236', '#b8b8b8', '#d6b04c', '#27364a'];
const draw_ = { tool: 'pen', color: '#8c1d2c', size: 10, mirror: false, undo: [], last: null };
function buildPalette() {
  const host = $('#palette'); host.innerHTML = '';
  PALETTE.forEach(c => {
    const b = document.createElement('button'); b.style.background = c; b.className = c === draw_.color ? 'on' : '';
    b.onclick = () => { draw_.color = c; if (draw_.tool === 'eraser') setTool('pen'); buildPalette(); };
    host.appendChild(b);
  });
  const l = document.createElement('label'); l.innerHTML = '<input type="color">';
  l.querySelector('input').oninput = e => { draw_.color = e.target.value; buildPalette(); };
  host.appendChild(l);
}
function setTool(tl) { draw_.tool = tl; $$('#toolSeg button').forEach(b => b.classList.toggle('on', b.dataset.tool === tl)); }
$$('#toolSeg button').forEach(b => b.onclick = () => setTool(b.dataset.tool));
function pushUndo() { draw_.undo.push(dx.getImageData(0, 0, dc.width, dc.height)); if (draw_.undo.length > 30) draw_.undo.shift(); }
const dpos = e => { const r = dc.getBoundingClientRect(), k = dc.width / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; };
function strokeSeg(a, b) {
  dx.lineCap = dx.lineJoin = 'round'; dx.lineWidth = draw_.size;
  dx.globalCompositeOperation = draw_.tool === 'eraser' ? 'destination-out' : 'source-over';
  dx.strokeStyle = draw_.color;
  const go = (p, q) => { dx.beginPath(); dx.moveTo(p.x, p.y); dx.lineTo(q.x, q.y); dx.stroke(); };
  go(a, b);
  if (draw_.mirror) go({ x: dc.width - a.x, y: a.y }, { x: dc.width - b.x, y: b.y });
  dx.globalCompositeOperation = 'source-over';
}
function floodFill(x0, y0) {
  const w = dc.width, h = dc.height, img = dx.getImageData(0, 0, w, h), d = img.data;
  const n = parseInt(draw_.color.slice(1), 16), fr = n >> 16, fg = (n >> 8) & 255, fb = n & 255;
  const i0 = (Math.floor(y0) * w + Math.floor(x0)) * 4, tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
  if (tr === fr && tg === fg && tb === fb && ta === 255) return;
  const ok = i => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) + Math.abs(d[i + 3] - ta) < 90;
  const seen = new Uint8Array(w * h), st = [Math.floor(x0), Math.floor(y0)];
  while (st.length) {
    const y = st.pop(), x = st.pop(), p = y * w + x;
    if (x < 0 || y < 0 || x >= w || y >= h || seen[p]) continue;
    seen[p] = 1; const i = p * 4; if (!ok(i)) continue;
    d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
    st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  dx.putImageData(img, 0, 0);
}
dc.addEventListener('pointerdown', e => {
  const p = dpos(e); pushUndo();
  if (draw_.tool === 'fill') { floodFill(p.x, p.y); return; }
  draw_.last = p; strokeSeg(p, p); dc.setPointerCapture(e.pointerId); e.preventDefault();
});
dc.addEventListener('pointermove', e => { if (!draw_.last) return; const p = dpos(e); strokeSeg(draw_.last, p); draw_.last = p; });
['pointerup', 'pointercancel'].forEach(ev => dc.addEventListener(ev, () => draw_.last = null));
$('#drawUndo').onclick = () => { const s = draw_.undo.pop(); if (s) dx.putImageData(s, 0, 0); };
$('#drawClear').onclick = () => { pushUndo(); dx.clearRect(0, 0, dc.width, dc.height); };
$('#mirrorDraw').onchange = e => draw_.mirror = e.target.checked;
$('#addAcc').onclick = () => {
  const w = dc.width, h = dc.height, d = dx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { toast(t('drawFirst')); return; }
  const pad = 4; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const sw = x1 - x0 + 1, sh = y1 - y0 + 1, k = Math.min(1, 420 / Math.max(sw, sh));
  const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  c.getContext('2d').drawImage(dc, x0, y0, sw, sh, 0, 0, c.width, c.height);
  const item = { id: 'c' + uid(), name: '', src: c.toDataURL('image/png'), ar: c.height / c.width };
  accLib.push(item); persistLib();
  pushUndo(); dx.clearRect(0, 0, w, h);
  buildLib(); addAcc(item.id); toast(t('accAdded'));
};

/* ------------------------------------------------------------------ language */
function applyLang() {
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  $$('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  $$('#langSeg button').forEach(b => b.classList.toggle('on', b.dataset.lang === state.lang));
  buildGarmentGrid(); buildBody(); buildGarmentRows(); buildPatternRows(); updatePieceUI(); buildBrushRow();
  if (state.tab === 'acc') { buildLib(); buildAccSel(); }
  render(); persist();
}
function buildBrushRow() {
  const host = $('#brushRow'); host.innerHTML = '';
  makeRow(host, t('brush'), { min: 2, max: 60, step: 1, unitText: 'px' }, () => draw_.size, v => draw_.size = v);
}
$$('#langSeg button').forEach(b => b.onclick = () => { state.lang = b.dataset.lang; applyLang(); });

/* ------------------------------------------------------------------ export */
async function saveImage() {
  const svg = $('#svg').cloneNode(true);
  svg.querySelector('#accUI').innerHTML = '';
  svg.setAttribute('width', 660 * 2); svg.setAttribute('height', 840 * 2);
  if (!window.Tailor3D) {
    svg.insertAdjacentHTML('afterbegin', '<rect x="-20" y="-20" width="700" height="880" fill="#f6f1e8"/>');
  }
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await img.decode();
  const c = document.createElement('canvas'); c.width = 1320; c.height = 1760;
  const g = c.getContext('2d');
  g.fillStyle = '#f6f1e8'; g.fillRect(0, 0, c.width, c.height);
  if (window.Tailor3D && window.Tailor3D.getCanvas()) {
    window.Tailor3D.renderOnce();
    g.drawImage(window.Tailor3D.getCanvas(), 0, 80, 1320, 1680);
  }
  g.drawImage(img, 0, 80, 1320, 1680);
  g.fillStyle = '#27364a'; g.font = '600 44px Georgia, serif';
  g.fillText(state.customer || t('appName'), 50, 56);
  g.fillStyle = '#b58b3f'; g.font = '600 26px "Segoe UI", sans-serif';
  const gm = t('g_' + state.garment) + ' · ' + t({ front: 'vFront', right: 'vRight', back: 'vBack', left: 'vLeft' }[state.view]);
  g.textAlign = 'right'; g.fillText(gm.toUpperCase(), 1270, 54);
  const a = document.createElement('a');
  a.download = `${(state.customer || 'costume').replace(/\s+/g, '-')}-${state.garment}-${state.view}.png`;
  a.href = c.toDataURL('image/png'); a.click();
}
$('#saveBtn').onclick = () => saveImage().catch(console.error);

/* ------------------------------------------------------------------ fit 16:9 stage to window */
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  $('#stage').style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit); fit();
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#camModal').hidden) closeCam(); if (!$('#cropModal').hidden) closeCrop(); }
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) && e.target.type !== 'range') return;
  if (!$('#cropModal').hidden || !$('#camModal').hidden) return;
  if (e.key === 'ArrowRight') stepView(1);
  if (e.key === 'ArrowLeft') stepView(-1);
});

/* ------------------------------------------------------------------ boot */
$('#customerName').value = state.customer;
buildPalette(); setTool('pen');
applyFabric();
applyLang();
setTab(state.tab);
window.__tailor = { state, render, applyFabric, setFabric, setTab, setGender, addAcc };

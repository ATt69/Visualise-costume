'use strict';
/* ==========================================================================
   Tailor Studio – parametric 2D costume geometry
   All measurements are in centimetres. 1 cm = SC px inside the SVG viewBox.
   Heights ("h") are measured up from the floor, x is measured from the body
   centre line (front/back views) or from the body axis (+x = facing direction).
   ========================================================================== */

const SC = 4, FLOOR = 800, CX = 330, VBW = 660, VBH = 840;
const X = x => +(CX + x * SC).toFixed(1);
const Y = h => +(FLOOR - h * SC).toFixed(1);
const D = (pts, close = true) => 'M' + pts.map(p => X(p[0]) + ' ' + Y(p[1])).join('L') + (close ? 'Z' : '');
const mir = pts => pts.map(p => [-p[0], p[1]]);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DEG = Math.PI / 180;
let CUR_PAT = 'fabric';                       // which fabric slot the next fab() call uses
const patUrl = () => `url(#${CUR_PAT})`;

/* Monotone cubic interpolation through [t, value] control points. */
function curve(points) {
  const p = points.map(a => a.slice()).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < p.length; i++) if (p[i][0] - p[i - 1][0] < 0.05) p[i][0] = p[i - 1][0] + 0.05;
  const n = p.length, sl = [];
  for (let i = 0; i < n - 1; i++) sl.push((p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]));
  const m = [sl[0]];
  for (let i = 1; i < n - 1; i++) m.push(sl[i - 1] * sl[i] <= 0 ? 0 : 2 * sl[i - 1] * sl[i] / (sl[i - 1] + sl[i]));
  m.push(sl[n - 2]);
  return x => {
    if (x <= p[0][0]) return p[0][1];
    if (x >= p[n - 1][0]) return p[n - 1][1];
    let k = 0; while (x > p[k + 1][0]) k++;
    const h = p[k + 1][0] - p[k][0], t = (x - p[k][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p[k][1] + (t3 - 2 * t2 + t) * h * m[k] +
           (-2 * t3 + 3 * t2) * p[k + 1][1] + (t3 - t2) * h * m[k + 1];
  };
}

/* [f(h), h] samples from h0 down to h1 */
function sample(f, h0, h1, step = 1.2) {
  const n = Math.max(2, Math.ceil(Math.abs(h0 - h1) / step)), out = [];
  for (let i = 0; i <= n; i++) { const h = h0 + (h1 - h0) * i / n; out.push([f(h), h]); }
  return out;
}

/* A tapered limb / sleeve. p0 = centre of the top edge, a = angle (deg) from vertical. */
function limbPoly(p0, a, L, w0, w1, cap) {
  const r = a * DEG, d = [Math.sin(r), -Math.cos(r)], n = [Math.cos(r), Math.sin(r)];
  const e = [p0[0] + d[0] * L, p0[1] + d[1] * L];
  const pts = [
    [p0[0] + n[0] * w0 / 2, p0[1] + n[1] * w0 / 2],
    [e[0] + n[0] * w1 / 2, e[1] + n[1] * w1 / 2],
    [e[0] - n[0] * w1 / 2, e[1] - n[1] * w1 / 2],
    [p0[0] - n[0] * w0 / 2, p0[1] - n[1] * w0 / 2]
  ];
  if (cap) {
    for (let i = 1; i < 10; i++) {
      const f = Math.PI - Math.PI * i / 10;
      pts.push([p0[0] + (n[0] * Math.cos(f) - d[0] * Math.sin(f)) * w0 / 2,
                p0[1] + (n[1] * Math.cos(f) - d[1] * Math.sin(f)) * w0 / 2]);
    }
  }
  return pts;
}
const along = (p0, a, L) => { const r = a * DEG; return [p0[0] + Math.sin(r) * L, p0[1] - Math.cos(r) * L]; };

/* ------------------------------------------------------------------ svg bits */
const STK = 'rgba(35,28,22,.6)';
const pathEl = (d, fill, sw = 1.3, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${STK}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
const fab = (pts, sw = 1.3, shade = 'shade') => {
  const d = D(pts);
  return pathEl(d, patUrl(), sw) + `<path d="${d}" fill="url(#${shade})" stroke="none"/>`;
};
const solid = (pts, col, sw = 1.3, shade = 'shade') => {
  const d = D(pts);
  return pathEl(d, col, sw) + `<path d="${d}" fill="url(#${shade})" stroke="none"/>`;
};
const darken = (pts, a = .22) => `<path d="${D(pts)}" fill="rgba(0,0,0,${a})" stroke="none"/>`;
const skin = pts => {
  const d = D(pts);
  return `<path d="${d}" fill="#ddd6ce" stroke="#b5ab9f" stroke-width="1.2" stroke-linejoin="round"/>` +
         `<path d="${d}" fill="url(#shadeSkin)" stroke="none"/>`;
};
const ln = (pts, o = {}) =>
  `<path d="${D(pts, false)}" fill="none" stroke="${o.c || 'rgba(25,18,12,.55)'}" stroke-width="${o.w || 1}" ` +
  `stroke-linecap="round" stroke-linejoin="round" ${o.dash ? 'stroke-dasharray="' + o.dash + '"' : ''}/>`;
const dot = (x, h, r, fill = patUrl()) =>
  `<circle cx="${X(x)}" cy="${Y(h)}" r="${r * SC}" fill="${fill}" stroke="${STK}" stroke-width="1"/>` +
  `<circle cx="${X(x)}" cy="${Y(h)}" r="${r * SC}" fill="rgba(255,255,255,.18)"/>`;
const hl = pts => ln(pts, { c: 'rgba(255,255,255,.28)', w: 1.2 });

/* soft vertical folds from (x0·t at h0) to (x1·t at h1) */
function folds(x0, h0, x1, h1, n, bow = 0) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = ((i + .5) / n) * 2 - 1;
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      pts.push([lerp(x0 * t, x1 * t, u) + Math.sin(u * Math.PI) * bow * t, lerp(h0, h1, u)]);
    }
    s += ln(pts, { c: 'rgba(0,0,0,.10)', w: 3.5 }) + ln(pts, { c: 'rgba(255,255,255,.09)', w: 2, });
  }
  return s;
}

/* ------------------------------------------------------------------ context */
function makeCtx(st) {
  const b = st.body, H = b.height;
  const lv = {
    chin: .865 * H, hps: .835 * H, sh: .818 * H, arm: .76 * H, bust: .725 * H,
    waist: .625 * H, hip: .525 * H, crotch: .465 * H, knee: .28 * H, ankle: .045 * H
  };
  const male = st.gender === 'male';
  return { H, b, lv, male, overlay: '', nw: (male ? .037 : .032) * H, sh: b.shoulder / 2, g: st.g[st.garment], acc: st.accent[st.garment] || '#f3efe6' };
}
const halfW = C => C / 5.7;   // flat half-width from circumference
const halfD = C => C / 7.7;   // half-depth from circumference

function shoulderLine(c, x) {
  if (x <= c.nw) return c.lv.hps;
  return lerp(c.lv.hps, c.lv.sh, clamp((x - c.nw) / (c.sh - c.nw), 0, 1));
}

/* front / back half-width profile of the torso */
function torsoProf(c, e, hemH, flare = 0) {
  const { b, lv, sh } = c;
  const bh = halfW(b.bust + e), wh = halfW(b.waist + e), hh = halfW(b.hip + e);
  const ax = Math.min(bh * .97, sh - 2.8);
  const pts = [[lv.sh, sh], [lv.arm, ax], [lv.bust, bh], [lv.waist, wh], [lv.hip, hh]];
  if (hemH !== undefined && hemH < lv.hip - 4) pts.push([hemH, hh + flare]);
  return curve(pts);
}

/* closed polygon for the upper part of a garment, front or back view */
function topPoly(c, o) {
  const { lv, nw } = c;
  const nn = o.nn || nw;
  const hsN = shoulderLine(c, nn);
  const R = sample(o.prof, lv.sh, o.hemH, 1.2);
  const w = R[R.length - 1][0];
  const pts = [[nn, hsN]];
  R.forEach(p => pts.push(p));
  const N = 16;
  for (let i = 1; i < N; i++) {
    const x = w - 2 * w * i / N;
    pts.push([x, o.hemH + (o.hemFn ? o.hemFn(x, w) : 0)]);
  }
  mir(R).reverse().forEach(p => pts.push(p));
  pts.push([-nn, hsN]);
  if (o.neckDepth > .2) {
    const N2 = 18;
    for (let i = 1; i < N2; i++) {
      const x = -nn + 2 * nn * i / N2;
      const u = o.neckShape === 'v' ? 1 - Math.abs(x) / nn : Math.sqrt(Math.max(0, 1 - (x / nn) ** 2));
      pts.push([x, hsN - o.neckDepth * u]);
    }
  }
  return pts;
}

/* legs ---------------------------------------------------------------------*/
function legFns(c, hemH, wHem, wKnee, e) {
  const { lv, b } = c;
  const hh = halfW(b.hip + e);
  const wc = hh - .4, cc = (hh + .4) / 2;
  const hm = Math.min(hemH, lv.crotch - 3);
  const pts = [[lv.crotch, wc]];
  if (hm < lv.knee - 3) pts.push([lv.knee, wKnee != null ? wKnee : (wc * .62 + wHem) / 2]);
  pts.push([hm, wHem]);
  const w = curve(pts);
  const cenLin = h => cc * (1 - .12 * clamp((lv.crotch - h) / (lv.crotch - hm + .01), 0, 1));
  const cen = h => Math.max(cenLin(h), w(h) / 2 + .7);
  return {
    hm, w, cen,
    outer: h => cen(h) + w(h) / 2,
    inner: h => Math.max(.4, cen(h) - w(h) / 2)
  };
}

/* single polygon for torso(top) + both legs ; halves returned so callers can add necks */
function lowerHalves(outerFn, topH, hemH, leg, crotchH) {
  const out = sample(outerFn, topH, hemH, 1.5);
  const up = sample(leg.inner, hemH, crotchH, 1.5);
  const R = [...out, ...up, [0, crotchH + .4]];
  const L = mir(R).reverse();
  return { R, L };
}

/* ======================================================================== */
/*  MANNEQUIN                                                                */
/* ======================================================================== */
function headFront(c, back) {
  const { H, lv, male, nw } = c;
  const hc = lv.chin + .0675 * H, ry = .0675 * H, rx = (male ? .048 : .044) * H;
  const hair = '#3a3330';
  let s = '';
  s += `<ellipse cx="${X(0)}" cy="${Y(hc)}" rx="${rx * SC}" ry="${ry * SC}" fill="#ddd6ce" stroke="#b5ab9f" stroke-width="1.2"/>`;
  if (!back) {
    s += `<ellipse cx="${X(-rx)}" cy="${Y(hc - 1)}" rx="${1.1 * SC}" ry="${2.2 * SC}" fill="#d3cbc2" stroke="#b5ab9f"/>`;
    s += `<ellipse cx="${X(rx)}" cy="${Y(hc - 1)}" rx="${1.1 * SC}" ry="${2.2 * SC}" fill="#d3cbc2" stroke="#b5ab9f"/>`;
  }
  if (back) {
    s += `<ellipse cx="${X(0)}" cy="${Y(hc + .2)}" rx="${(rx + .5) * SC}" ry="${(ry + .5) * SC}" fill="${hair}"/>`;
    if (!male) {
      const w = curve([[lv.bust + 3, rx + 3.2], [lv.arm, rx + 6], [lv.hps, rx + 4.4], [lv.chin, rx + 1.4], [hc, rx + .9]]);
      const R = sample(w, hc - 1, lv.bust + 3, 1.5), bw = R[R.length - 1][0], bot = [];
      for (let i = 1; i < 10; i++) { const x = bw - 2 * bw * i / 10; bot.push([x, lv.bust + 3 - 3.2 * (1 - (x / bw) ** 2)]); }
      c.overlay += `<path d="${D([...R, ...bot, ...mir(R).reverse()])}" fill="${hair}" stroke="rgba(0,0,0,.4)" stroke-width="1.2" stroke-linejoin="round"/>`;
      [-.6, -.2, .2, .6].forEach(k => c.overlay += ln([[k * (rx + 3), lv.chin], [k * (rx + 4.5), lv.arm], [k * (rx + 3.5), lv.bust + 4]], { c: 'rgba(255,255,255,.1)', w: 1.6 }));
    }
  } else {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - Math.PI * i / 24;
      pts.push([Math.cos(a) * (rx + .7), hc + Math.sin(a) * (ry + .6)]);
    }
    for (let i = 0; i <= 14; i++) {
      const x = (rx + .7) - 2 * (rx + .7) * i / 14;
      pts.push([x, hc + ry * .5 * Math.sqrt(Math.max(0, 1 - (x / (rx + .7)) ** 2)) * (1 + .2 * Math.abs(x) / rx) - .2]);
    }
    s += `<path d="${D(pts)}" fill="${hair}"/>`;
    const bw = male ? 2.4 : 1.3;
    s += ln([[-3.4, hc - .6], [-1.4, hc - .2]], { c: 'rgba(60,45,40,.5)', w: bw });
    s += ln([[3.4, hc - .6], [1.4, hc - .2]], { c: 'rgba(60,45,40,.5)', w: bw });
    s += ln([[-3.2, hc - 1.6], [-1.6, hc - 1.4]], { c: 'rgba(80,60,50,.35)', w: 1 });
    s += ln([[3.2, hc - 1.6], [1.6, hc - 1.4]], { c: 'rgba(80,60,50,.35)', w: 1 });
    s += ln([[-1.8, hc - 5.2], [0, hc - 5.8], [1.8, hc - 5.2]], { c: male ? 'rgba(130,85,80,.4)' : 'rgba(190,80,90,.6)', w: male ? 1.2 : 2 });
    if (!male) {
      const out = curve([[hc + 1, rx + .9], [hc - 5, rx + 1.8], [lv.hps + 3, nw + 6.5], [lv.arm + 4, nw + 7.2], [lv.bust + 3, nw + 6]]);
      const inn = curve([[lv.bust + 3, nw + 3], [lv.arm + 1, nw + 2.6], [lv.hps, nw + 1.8], [lv.chin + .5, nw + 1], [hc - 3, rx - 2]]);
      [1, -1].forEach(sd => {
        const lock = [...sample(out, hc + 1, lv.bust + 3, 1.5), ...sample(inn, lv.bust + 3, hc - 3, 1.5)].map(p => [sd * p[0], p[1]]);
        c.overlay += `<path d="${D(lock)}" fill="${hair}" stroke="rgba(0,0,0,.4)" stroke-width="1.2" stroke-linejoin="round"/>`;
        c.overlay += ln([[sd * (nw + 4.5), lv.hps], [sd * (nw + 5), lv.arm], [sd * (nw + 4.2), lv.bust + 4]], { c: 'rgba(255,255,255,.1)', w: 1.6 });
      });
    }
  }
  return s;
}

function mannequinFB(c, back) {
  const { b, lv, H, sh } = c;
  let s = '';
  // arms
  const armL = .36 * H;
  [1, -1].forEach(sd => {
    const p0 = [sh - 4.4, lv.sh - 1.4];
    let pts = limbPoly(p0, 6, armL, 9.2, 5.6);
    const e = along(p0, 6, armL), he = along(p0, 6, armL + 5.2);
    const rot = sd > 0 ? -6 : 6, hx = sd * he[0];
    if (sd < 0) pts = mir(pts);
    s += skin(pts);
    s += `<ellipse cx="${X(hx)}" cy="${Y(he[1])}" rx="${3 * SC}" ry="${6.3 * SC}" fill="#ddd6ce" stroke="#b5ab9f" stroke-width="1.2" transform="rotate(${rot} ${X(hx)} ${Y(he[1])})"/>`;
  });
  // shoes
  const leg = legFns(c, 3, 7.4, 10.2, 0);
  [1, -1].forEach(sd => {
    s += `<ellipse cx="${X(sd * (leg.cen(3) + .3))}" cy="${Y(1.9)}" rx="${5.2 * SC}" ry="${2.6 * SC}" fill="#4a423c" stroke="rgba(0,0,0,.5)"/>`;
  });
  // neck
  const nw = c.nw;
  s += skin([[-nw, lv.chin + 1], [nw, lv.chin + 1], [nw + .6, lv.hps - 1], [-nw - .6, lv.hps - 1]]);
  s += headFront(c, back);
  // torso + legs
  const tor = torsoProf(c, 0);
  const torC = curve([[lv.sh, sh], [lv.arm, Math.min(halfW(b.bust) * .97, sh - 2.8)], [lv.bust, halfW(b.bust)],
                      [lv.waist, halfW(b.waist)], [lv.hip, halfW(b.hip)], [lv.crotch, halfW(b.hip)]]);
  const outer = h => h >= lv.crotch ? torC(h) : leg.outer(h);
  const hv = lowerHalves(outer, lv.sh, 3, leg, lv.crotch);
  const hsN = shoulderLine(c, nw);
  const pts = [[nw, hsN], ...hv.R, ...hv.L, [-nw, hsN]];
  s += skin(pts);
  // anatomical hints
  if (!back) {
    if (!c.male) s += ln([[-halfW(b.bust) * .55, lv.bust + 1], [-halfW(b.bust) * .2, lv.bust - 1.5]], { c: 'rgba(120,100,90,.25)', w: 1.2 });
    if (!c.male) s += ln([[halfW(b.bust) * .55, lv.bust + 1], [halfW(b.bust) * .2, lv.bust - 1.5]], { c: 'rgba(120,100,90,.25)', w: 1.2 });
    s += dot(0, lv.waist - 2.5, .35, '#c9c0b6');
    if (c.male) s += ln([[-halfW(b.bust) * .6, lv.bust - 2.5], [halfW(b.bust) * .6, lv.bust - 2.5]], { c: 'rgba(120,100,90,.22)', w: 1.2 });
  } else {
    s += ln([[0, lv.hps - 2], [0, lv.crotch + 4]], { c: 'rgba(120,100,90,.22)', w: 1.2 });
  }
  return s;
}

/* ---- side mannequin ---- */
function sideDepthFns(c, e, hemH, flare = 0) {
  const { b, lv } = c, m = c.male;
  const bB = halfD(b.bust + e), bW = halfD(b.waist + e), bH = halfD(b.hip + e);
  const fh = m ? .92 : .9, bh = m ? 1.08 : 1.1;
  const F = [[lv.sh, 4.8], [lv.arm, bB * (m ? .97 : .95)], [lv.bust, bB * (m ? 1.02 : 1.12)], [lv.waist, bW * .98], [lv.hip, bH * fh]];
  const B = [[lv.sh, 5.4], [lv.arm, bB * (m ? .92 : .85)], [lv.bust, bB * (m ? .98 : .88)], [lv.waist, bW * 1.02], [lv.hip, bH * bh]];
  if (hemH !== undefined && hemH < lv.hip - 4) { F.push([hemH, bH * fh + flare]); B.push([hemH, bH * bh + flare]); }
  return { F: curve(F), Bk: curve(B), bH, bB, bW };
}

function legSide(c, hemH, dHem, dKnee, e) {
  const { lv, b } = c;
  const { bH } = sideDepthFns(c, e);
  const hm = Math.min(hemH, lv.crotch - 3);
  const dc = bH * 1.75;
  const dk = dKnee != null ? dKnee : (dc * .5 + dHem) / 2;
  const fpts = [[lv.crotch, bH * .9]], bpts = [[lv.crotch, bH * .88]];
  const xc = h => .3 + .4 * clamp((lv.crotch - h) / lv.crotch, 0, 1);
  if (hm < lv.knee - 3) { fpts.push([lv.knee, xc(lv.knee) + dk / 2]); bpts.push([lv.knee, -(xc(lv.knee) - dk / 2)]); }
  fpts.push([hm, xc(hm) + dHem / 2 + .4]); bpts.push([hm, -(xc(hm) - dHem / 2 - .1)]);
  return { hm, f: curve(fpts), bk: curve(bpts) };
}

function headSide(c) {
  const { H, lv, male } = c;
  const hc = lv.chin + .0675 * H, ry = .0675 * H, rx = (male ? .052 : .049) * H, ox = 1.0;
  let s = '';
  s += `<ellipse cx="${X(ox)}" cy="${Y(hc)}" rx="${rx * SC}" ry="${ry * SC}" fill="#ddd6ce" stroke="#b5ab9f" stroke-width="1.2"/>`;
  s += `<path d="M${X(ox + rx - .4)} ${Y(hc + .6)} L${X(ox + rx + 1.3)} ${Y(hc - 1.6)} L${X(ox + rx - .3)} ${Y(hc - 2.4)}Z" fill="#ddd6ce" stroke="#b5ab9f" stroke-width="1.1" stroke-linejoin="round"/>`;
  const outer = [], inner = [];
  for (let i = 0; i <= 26; i++) {
    const a = (60 - i / 26 * 240) * DEG;
    outer.push([ox + Math.sin(a) * (rx + .6), hc + Math.cos(a) * (ry + .6)]);
  }
  for (let i = 26; i >= 0; i--) {
    const a = (60 - i / 26 * 240) * DEG;
    const k = .8 - .25 * (i / 26);
    inner.push([ox - 1.6 + Math.sin(a) * rx * k, hc - .5 + Math.cos(a) * ry * k]);
  }
  s += `<path d="${D([...outer, ...inner])}" fill="#3a3330"/>`;
  s += `<ellipse cx="${X(ox - 1.2)}" cy="${Y(hc - 1.2)}" rx="${1.1 * SC}" ry="${2 * SC}" fill="#d3cbc2" stroke="#b5ab9f"/>`;
  s += ln([[ox + 3.4, hc - .4], [ox + 6.2, hc - .1]], { c: 'rgba(60,45,40,.5)', w: male ? 2.2 : 1.2 });
  if (!male) {
    const { Bk } = sideDepthFns(c, 0);
    const bx = h => -(Bk(h) + 1.4);
    const back = curve([[lv.bust + 4, bx(lv.bust + 4)], [lv.arm, bx(lv.arm)], [lv.hps, bx(lv.hps)], [lv.chin + 2, ox - rx - .6], [hc - 2, ox - rx - .5]]);
    const inn = curve([[lv.bust + 4, bx(lv.bust + 4) + 5], [lv.arm, bx(lv.arm) + 4.8], [lv.hps, -4.2], [lv.chin + 2, -3.6], [hc - 2, ox - rx + 2]]);
    const pts = [...sample(back, hc - 2, lv.bust + 4, 1.5), ...sample(inn, lv.bust + 4, hc - 2, 1.5)];
    c.overlay += `<path d="${D(pts)}" fill="#3a3330" stroke="rgba(0,0,0,.4)" stroke-width="1.2" stroke-linejoin="round"/>`;
    c.overlay += ln([[bx(lv.hps) + 2.5, lv.hps], [bx(lv.arm) + 2.4, lv.arm], [bx(lv.bust + 4) + 2.3, lv.bust + 4]], { c: 'rgba(255,255,255,.12)', w: 1.6 });
  }
  return s;
}

function mannequinSide(c) {
  const { b, lv, H } = c;
  let s = '';
  const dleg = legSide(c, 3, 7.6, 10.2, 0);
  const shoeP = [[-4.5, .2], [-5, 4.2], [-2, 6], [3, 6.4], [9, 4.2], [14, 2.4], [14, .2]];
  // far leg
  const farOff = 2.4;
  const legPoly = off => {
    const fr = sample(h => dleg.f(h) + off, lv.crotch + 3, 3, 1.5);
    const bk = sample(h => -dleg.bk(h) * -1 + off, lv.crotch + 3, 3, 1.5);
    return [...fr, ...bk.map(p => [-(dleg.bk(p[1])) + off, p[1]]).reverse()];
  };
  s += `<g>${solid(shoeP.map(p => [p[0] + farOff, p[1]]), '#3d3631', 1)}</g>`;
  s += skin(legPoly(farOff)) + darken(legPoly(farOff), .1);
  s += solid(shoeP, '#4a423c', 1);
  // arm (far side hidden), torso
  const { F, Bk } = sideDepthFns(c, 0);
  const R = sample(F, lv.sh, lv.crotch + 2, 1.5), Lb = sample(Bk, lv.sh, lv.crotch + 2, 1.5);
  s += skin(legPoly(0));
  // neck
  s += skin([[-3.6, lv.chin + 1], [3.2, lv.chin + 1], [3.4, lv.hps], [-4, lv.hps]]);
  s += headSide(c);
  const tor = [[3.2, lv.hps], ...R, ...Lb.slice().reverse().map(p => [-p[0], p[1]]), [-3.8, lv.hps]];
  s += skin(tor);
  // arm
  const p0 = [-.3, lv.sh - 3.4];
  s += skin(limbPoly(p0, 3, .36 * H - 3, 9, 5.6, true));
  const he = along(p0, 3, .36 * H - 3 + 5.2);
  s += `<ellipse cx="${X(he[0])}" cy="${Y(he[1])}" rx="${2.6 * SC}" ry="${6 * SC}" fill="#ddd6ce" stroke="#b5ab9f" stroke-width="1.2" transform="rotate(-3 ${X(he[0])} ${Y(he[1])})"/>`;
  return s;
}

/* ======================================================================== */
/*  COMMON SLEEVES                                                           */
/* ======================================================================== */
function sleeveDims(c, e, L) {
  const wr = 6.8 + e * .15, w0 = 8.6 + (c.b.bust - 80) * .1 + e * .35;
  return [w0, w0 + (wr - w0) * Math.min(1, L / 50)];
}
function sleeveFrontPts(c, e, L) {
  const [w0, w1] = sleeveDims(c, e, L), a = 6 * DEG;
  const p0 = [c.sh + .5 - w0 / 2 * Math.cos(a), c.lv.sh - .3 - Math.sin(a) * w0 / 2];
  return limbPoly(p0, 6, L, w0, w1);
}
function sleeveCuff(pts, depth, fn) {
  // pts = [outer0, outer1, inner1, inner0]; returns a line across at (len - depth)
  const [o0, o1, i1, i0] = pts;
  const t = 1 - depth / Math.hypot(o1[0] - o0[0], o1[1] - o0[1]);
  return ln([[lerp(o0[0], o1[0], t), lerp(o0[1], o1[1], t)], [lerp(i0[0], i1[0], t), lerp(i0[1], i1[1], t)]], { w: 1 });
}
function sleeveFrontSvg(c, e, L, cuff = 3) {
  if (L < 1) return '';
  const pts = sleeveFrontPts(c, e, L);
  let s = '';
  [pts, mir(pts)].forEach(p => {
    s += fab(p);
    if (L > 14) s += sleeveCuff(p, cuff);
  });
  return s;
}
function sleeveSideSvg(c, e, L, cuff = 3) {
  if (L < 1) return '';
  const [w0, w1] = sleeveDims(c, e, L);
  const p0 = [-.3, c.lv.sh - 3.4 - 0];
  const pts = limbPoly(p0, 3, L - 2.4, w0 * .95, w1 * .98, true);
  let s = fab(pts);
  if (L > 14) s += sleeveCuff(pts.slice(0, 4), cuff);
  return s;
}

/* ======================================================================== */
/*  PANTS                                                                    */
/* ======================================================================== */
function pantsTop(c) { return c.lv.waist + .8; }

function pantsFront(c, o) { const prev = CUR_PAT; CUR_PAT = o.pat || 'fabric2'; try { return _pantsFront(c, o); } finally { CUR_PAT = prev; } }
function _pantsFront(c, o) {
  const { lv, b } = c, e = o.e;
  const top = pantsTop(c), hemH = Math.max(1.5, top - o.len);
  const wh = halfW(b.waist + e), hh = halfW(b.hip + e);
  const tor = curve([[top, wh], [lv.hip, hh], [lv.crotch, hh]]);
  const leg = legFns(c, hemH, o.hemC / 2.9, null, e);
  const outer = h => h >= lv.crotch ? tor(h) : leg.outer(h);
  const hv = lowerHalves(outer, top, hemH, leg, lv.crotch);
  const poly = [...hv.R, ...hv.L];
  let s = o.color ? solid(poly, o.color) : fab(poly);
  const wbh = top - 3.6, wbw = tor(wbh);
  const fill = o.color || patUrl();
  // waistband
  s += ln([[-wbw, wbh], [wbw, wbh]], { w: 1.1 });
  [-.84, -.45, 0, .45, .84].forEach(k => {
    if (o.back && k === 0) return;
    const x = wh * k;
    s += `<rect x="${X(x - .55)}" y="${Y(top + .5)}" width="${1.1 * SC}" height="${4.6 * SC}" fill="${fill}" stroke="${STK}" stroke-width=".8"/>`;
  });
  if (o.back) {
    s += ln([[0, wbh], [-.3, lv.hip], [0, lv.crotch + .5]], { w: 1.1 });
    [1, -1].forEach(sd => {
      const cx = sd * hh * .52, hy = top - 11.5;
      s += ln([[cx - 5, hy + .5], [cx + 5, hy - .5]], { w: 1.3 });
      s += ln([[cx - 5, hy - .3], [cx + 5, hy - 1.3]], { w: .8, c: 'rgba(0,0,0,.3)' });
      s += ln([[sd * hh * .12, wbh], [sd * hh * .32, top - 11]], { w: .9, c: 'rgba(0,0,0,.28)' });
    });
  } else {
    s += ln([[0, wbh], [0, top - 15.5], [2.8, top - 18.5], [3.4, top - 22]], { w: 1.1 });
    [1, -1].forEach(sd => {
      s += ln([[sd * wh * .55, wbh], [sd * wh * .74, top - 9.5], [sd * (wh * .98), top - 16.5]], { w: 1.1 });
    });
    s += dot(0, top - 1.8, .75);
  }
  if (o.crease) {
    [1, -1].forEach(sd => {
      const pts = [[sd * wh * .5, wbh - 1]];
      sample(h => leg.cen(h), lv.crotch + 2, hemH, 3).forEach(p => pts.push([sd * p[0], p[1]]));
      s += ln(pts, { c: 'rgba(255,255,255,.2)', w: 1.4 }) + ln(pts.map(p => [p[0] + sd * .35, p[1]]), { c: 'rgba(0,0,0,.2)', w: .9 });
    });
  }
  // hem lines
  [1, -1].forEach(sd => s += ln([[sd * leg.outer(hemH + 3.2), hemH + 3.2], [sd * leg.inner(hemH + 3.2), hemH + 3.2]], { w: .9, c: 'rgba(0,0,0,.35)' }));
  // soft vertical light on legs
  return { svg: s, hemH, top, leg };
}

function pantsSide(c, o) { const prev = CUR_PAT; CUR_PAT = o.pat || 'fabric2'; try { return _pantsSide(c, o); } finally { CUR_PAT = prev; } }
function _pantsSide(c, o) {
  const { lv, b } = c, e = o.e;
  const top = pantsTop(c), hemH = Math.max(1.5, top - o.len);
  const sd = sideDepthFns(c, e);
  const dc = legSide(c, hemH, o.hemC / 3.1, null, e);
  const bW = sd.bW, bH = sd.bH;
  const Fp = curve([[top, bW * .98], [lv.hip, bH * .9], [lv.crotch, bH * .9], ...(hemH < lv.knee - 3 ? [[lv.knee, dc.f(lv.knee)]] : []), [dc.hm, dc.f(dc.hm)]]);
  const Bp = curve([[top, bW * 1.02], [lv.hip, bH * 1.1], [lv.crotch, bH * .98], ...(hemH < lv.knee - 3 ? [[lv.knee, dc.bk(lv.knee)]] : []), [dc.hm, dc.bk(dc.hm)]]);
  const front = sample(Fp, top, dc.hm, 1.5), back = sample(Bp, top, dc.hm, 1.5);
  const mk = off => [...front.map(p => [p[0] + off, p[1]]), ...back.slice().reverse().map(p => [-p[0] + off, p[1]])];
  const fill = o.color;
  let s = '';
  const far = mk(o.farOff || 2.2);
  s += (fill ? solid(far, fill) : fab(far)) + darken(far, .2);
  const near = mk(0);
  s += fill ? solid(near, fill) : fab(near);
  const wbh = top - 3.6;
  const fillAttr = fill || 'url(#fabric)';
  s += ln([[Fp(wbh), wbh], [-Bp(wbh), wbh]], { w: 1.1 });
  s += ln([[Fp(lv.hip + 2) - 1.1, lv.hip + 2], [Fp(lv.hip - 6) - 1.4, lv.hip - 6]], { w: 1, c: 'rgba(0,0,0,.3)' });
  s += ln([[Fp(dc.hm + 3.2), dc.hm + 3.2], [-Bp(dc.hm + 3.2), dc.hm + 3.2]], { w: .9, c: 'rgba(0,0,0,.35)' });
  if (o.crease) s += ln(sample(h => Fp(h) - .2, lv.crotch, dc.hm, 3).map(p => [p[0] - dc.f(p[1]) * 0 - 0, p[1]]).map(p => [(Fp(p[1]) - Bp(p[1])) / 2 * 0 + (Fp(p[1]) + -Bp(p[1])) / 2, p[1]]), { c: 'rgba(255,255,255,.18)', w: 1.2 });
  return { svg: s, hemH, top };
}

/* ======================================================================== */
/*  SHIRT                                                                    */
/* ======================================================================== */
function shirtFront(c, back) {
  const g = c.g, e = g.ease, { lv, nw, b } = c;
  const hemH = lv.hps - g.length;
  const prof = torsoProf(c, e, hemH, .3);
  const nn = nw + .7;
  const poly = topPoly(c, { prof, hemH, nn, neckDepth: back ? 1.2 : 6, neckShape: 'v',
    hemFn: (x, w) => -2.2 * (1 - (x / w) ** 2) });
  let s = '';
  s += sleeveFrontSvg(c, e, g.sleeve, 3.2);
  s += fab(poly);
  const bh = halfW(b.bust + e), hh = halfW(b.hip + e);
  // collar
  const hps = lv.hps;
  if (!back) {
    const flap = [[nn - .6, hps + 3.4], [nn + 4.2, hps - .6], [1.5, hps - 7.4], [.5, hps - 5.4]];
    s += fab(flap, 1.2) + fab(mir(flap), 1.2);
    // placket
    const bot = hemH - 1.6;
    s += ln([[-1.5, hps - 7.5], [-1.5, bot]], { w: .9, c: 'rgba(0,0,0,.35)' });
    s += ln([[1.5, hps - 7.5], [1.5, bot]], { w: .9, c: 'rgba(0,0,0,.35)' });
    for (let h = hps - 10.5; h > hemH + 4; h -= 9.2) s += dot(0, h, .55);
    // pocket
    const hb = lv.bust + 1.5;
    s += ln([[bh * .32, hb], [bh * .8, hb], [bh * .8, hb - 8.5], [bh * .56, hb - 10.2], [bh * .32, hb - 8.5], [bh * .32, hb]], { w: 1 });
  } else {
    s += fab([[-nn - .5, hps + 3.4], [nn + .5, hps + 3.4], [nn + .9, hps - .2], [0, hps - 1.4], [-nn - .9, hps - .2]], 1.2);
    s += ln([[-bh * .98, lv.sh - 9.5], [-bh * .5, lv.sh - 10.8], [0, lv.sh - 11.2], [bh * .5, lv.sh - 10.8], [bh * .98, lv.sh - 9.5]], { w: 1, c: 'rgba(0,0,0,.35)' });
    s += ln([[0, hps - 1.4], [0, hemH - 2]], { w: .9, c: 'rgba(0,0,0,.25)', dash: '5 4' });
  }
  [1, -1].forEach(sd => s += ln([[sd * (prof(lv.arm - 2) - 2.2), lv.arm - 1.5], [sd * (prof(lv.waist) - 2.2), lv.waist], [sd * (prof(hemH + 2) - 2.2), hemH + 2]], { w: .8, c: 'rgba(0,0,0,.18)' }));

  return { svg: s, dims: [{ h0: lv.hps, h1: hemH, label: 'len' }] };
}

function shirtSide(c) {
  const g = c.g, e = g.ease, { lv } = c;
  const hemH = lv.hps - g.length;
  const { F, Bk } = sideDepthFns(c, e, hemH, .3);
  const Rf = sample(F, lv.sh, hemH, 1.2), Rb = sample(Bk, lv.sh, hemH, 1.2);
  const pts = [[3.2, lv.hps], ...Rf, ...Rb.slice().reverse().map(p => [-p[0], p[1]]), [-3.8, lv.hps]];
  let s = fab(pts);
  s += fab([[-4.2, lv.hps + 3.4], [3.6, lv.hps + 3.4], [4.3, lv.hps - 3], [-4.4, lv.hps - 1.6]], 1.2);
  s += ln([[F(lv.hps - 8) - 1.2, lv.hps - 8], [F(hemH + 2) - 1.2, hemH + 2]], { w: .9, c: 'rgba(0,0,0,.3)' });
  s += sleeveSideSvg(c, e, g.sleeve, 3.2);
  return { svg: s, dims: [{ h0: lv.hps, h1: hemH, label: 'len' }] };
}

/* ======================================================================== */
/*  JACKET (+ trousers + inner shirt) = SUIT                                 */
/* ======================================================================== */
function suitFront(c, back) {
  const g = c.g, e = g.ease, { lv, nw, b } = c;
  const hemH = lv.hps - g.length, hps = lv.hps;
  const btn = lv.waist + 3;
  const prof = torsoProf(c, e, hemH, 1.2);
  const nn = nw + 1.0;
  const bh = halfW(b.bust + e), wh = halfW(b.waist + e), hh = halfW(b.hip + e);
  let s = '';
  // trousers
  const pn = pantsFront(c, { len: g.pantsLen, hemC: g.hem, e: Math.max(2, e * .55), crease: true, back });
  const dims = [{ h0: pn.top, h1: pn.hemH, label: 'pants', off: 1 }, { h0: hps, h1: hemH, label: 'jacket', off: 0 }];
  if (!back) {
    // shirt + tie
    s += solid([[-nw - 1, hps + 3.4], [nw + 1, hps + 3.4], [nw + 2, hps - 2], [3.2, btn - 1], [-3.2, btn - 1], [-nw - 2, hps - 2]], c.acc, 1.1);
    s += `<path d="${D([[-nw - 1, hps + 3.4], [nw + 1, hps + 3.4], [nw + 2, hps - 2], [3.2, btn - 1], [-3.2, btn - 1], [-nw - 2, hps - 2]])}" fill="url(#shadeV)"/>`;
    if (c.male) s += solid([[-1.7, hps - .6], [1.7, hps - .6], [1.4, hps - 3.6], [-1.4, hps - 3.6]], '#7d2231', 1);
    if (c.male) s += solid([[-1.4, hps - 3.6], [1.4, hps - 3.6], [2.5, btn - 8], [0, btn - 12], [-2.5, btn - 8]], '#7d2231', 1);
  }
  const body = s;
  s = pn.svg;
  s += body;
  s += sleeveFrontSvg(c, e, g.sleeve, 3.5);
  const poly = topPoly(c, { prof, hemH, nn, neckDepth: back ? 1.4 : (hps - btn), neckShape: 'v',
    hemFn: (x, w) => back ? 0 : 3.2 * Math.pow(Math.max(0, 1 - Math.abs(x) / 8), 1.5) });
  s += fab(poly);
  if (!back) {
    // lapels
    const lap = [[nn - .1, hps + .6], [nn + 6.6, hps - 7.6], [1.6, btn + 2.8], [0, btn], [nn - .1 - 1.0, hps - 1.2]];
    s += fab(lap, 1.2) + fab(mir(lap), 1.2);
    s += ln([[nn + 2.8, hps - 4.0], [nn + 6.6, hps - 7.6]], { w: .9, c: 'rgba(0,0,0,.4)' }) + ln([[-nn - 2.8, hps - 4.0], [-nn - 6.6, hps - 7.6]], { w: .9, c: 'rgba(0,0,0,.4)' });
    s += ln([[0, btn], [0, hemH + 3.4 - 0]], { w: 1.1 });
    s += dot(1.0, btn - .8, .75) + dot(1.0, btn - 10.2, .75);
    // pockets
    const hp = lv.hip + 1.5;
    [1, -1].forEach(sdr => {
      s += ln([[sdr * hh * .33, hp + 1.1], [sdr * hh * .86, hp - .1]], { w: 1.2 });
      s += ln([[sdr * hh * .33, hp - 2.8], [sdr * hh * .86, hp - 4.1]], { w: 1.2 });
    });
    const cb = lv.bust + 3.2;
    s += ln([[bh * .5, cb], [bh * .88, cb + .8]], { w: 1.3 });
    s += solid([[bh * .6, cb + .6], [bh * .84, cb + 1.0], [bh * .82, cb + 1.9], [bh * .62, cb + 1.5]], '#f6f3ec', .6);
  } else {
    // collar band, centre seam, vent, side panels
    s += fab([[-nn - .4, hps + 3.0], [nn + .4, hps + 3.0], [nn + .8, hps - .6], [0, hps - 1.8], [-nn - .8, hps - .6]], 1.2);
    s += ln([[0, hps - 1.8], [-.4, lv.waist], [0, hemH]], { w: 1 });
    s += ln([[-.9, hemH + 24], [-.9, hemH + 0.2]], { w: .9, c: 'rgba(0,0,0,.4)' });
    [1, -1].forEach(sdr => {
      const pts = [[sdr * (bh * .7), lv.arm - 2], [sdr * (wh * .62), lv.waist], [sdr * hh * .7, hemH + 1.5]];
      s += ln(pts, { w: .9, c: 'rgba(0,0,0,.3)' });
    });
  }
  return { svg: s, dims };
}

function suitSide(c) {
  const g = c.g, e = g.ease, { lv } = c;
  const hemH = lv.hps - g.length, hps = lv.hps;
  const pn = pantsSide(c, { len: g.pantsLen, hemC: g.hem, e: Math.max(2, e * .55), crease: true });
  const { F, Bk } = sideDepthFns(c, e, hemH, 1.2);
  const Rf = sample(F, lv.sh, hemH, 1.2), Rb = sample(Bk, lv.sh, hemH, 1.2);
  const pts = [[3.2, hps], ...Rf, ...Rb.slice().reverse().map(p => [-p[0], p[1]]), [-3.8, hps]];
  let s = pn.svg;
  s += fab(pts);
  s += fab([[-4.4, hps + 2.8], [3.8, hps + 2.8], [4.4, hps - 3.2], [-4.4, hps - 2]], 1.2);
  s += ln([[F(hps - 6) - 1.4, hps - 6], [F(lv.waist + 3) - 1.0, lv.waist + 3], [F(hemH + 2) - .6, hemH + 2]], { w: 1, c: 'rgba(0,0,0,.35)' });
  s += ln([[-Bk(lv.hip) , lv.hip], [-Bk(hemH) + .3, hemH]].map(p => p), { w: .7, c: 'rgba(0,0,0,.2)' });
  s += ln([[F(lv.hip + 1) - 1.6, lv.hip + 1], [F(lv.hip + 1) - 8, lv.hip + .6]], { w: 1.1 });
  s += sleeveSideSvg(c, e, g.sleeve, 3.5);
  return { svg: s, dims: [{ h0: pn.top, h1: pn.hemH, label: 'pants', off: 1 }, { h0: hps, h1: hemH, label: 'jacket', off: 0 }] };
}

/* ======================================================================== */
/*  PANTS (garment)                                                          */
/* ======================================================================== */
function pantsGarmentFront(c, back) {
  const g = c.g;
  const pn = pantsFront(c, { len: g.pantsLen, hemC: g.hem, e: g.ease, crease: true, back, pat: 'fabric' });
  return { svg: pn.svg, dims: [{ h0: pn.top, h1: pn.hemH, label: 'pants', off: 0 }] };
}
function pantsGarmentSide(c) {
  const g = c.g;
  const pn = pantsSide(c, { len: g.pantsLen, hemC: g.hem, e: g.ease, crease: true, pat: 'fabric' });
  return { svg: pn.svg, dims: [{ h0: pn.top, h1: pn.hemH, label: 'pants', off: 0 }] };
}

/* ======================================================================== */
/*  DRESS                                                                    */
/* ======================================================================== */
function dressProfile(c, e, hemH, sweep) {
  const { b, lv, sh } = c;
  const bh = halfW(b.bust + e), wh = halfW(b.waist + e), hh = halfW(b.hip + e);
  const ax = Math.min(bh * .97, sh - 2.8);
  const hem = Math.max(sweep / 6, hh * .8);
  const hm = Math.min(hemH, lv.hip - 5);
  return { hm, hem, bh, wh, hh, prof: curve([[lv.sh, sh], [lv.arm, ax], [lv.bust, bh], [lv.waist, wh], [lv.hip, hh],
      [lerp(lv.hip, hm, .5), lerp(hh, hem, .38)], [hm, hem]]) };
}
function dressFront(c, back) {
  const g = c.g, e = g.ease, { lv, nw } = c;
  const hemH0 = lv.hps - g.length;
  const dp = dressProfile(c, e, hemH0, g.sweep);
  const hemH = dp.hm;
  const nn = back ? nw + 1.2 : nw * 1.9;
  const poly = topPoly(c, { prof: dp.prof, hemH, nn, neckDepth: back ? 3 : 10, neckShape: 'u',
    hemFn: (x, w) => -1.6 * (1 - (x / w) ** 2) });
  let s = '';
  s += sleeveFrontSvg(c, e, g.sleeve, 2.5);
  s += fab(poly);
  s += folds(dp.wh * .9, lv.waist - 1, dp.hem * .95, hemH + 1, 6, 1.2);
  // waist seam
  s += ln([[-dp.wh, lv.waist + .3], [0, lv.waist - .5], [dp.wh, lv.waist + .3]], { w: 1.1, c: 'rgba(0,0,0,.4)' });
  s += hl([[-dp.wh, lv.waist + 1.2], [0, lv.waist + .4], [dp.wh, lv.waist + 1.2]]);
  if (back) s += ln([[0, lv.hps - 3], [0, lv.waist]], { w: 1, c: 'rgba(0,0,0,.45)', dash: '4 3' });
  else {
    s += ln([[-dp.bh * .48, lv.bust + 1], [-dp.bh * .3, lv.waist + 1]], { w: .9, c: 'rgba(0,0,0,.25)' });
    s += ln([[dp.bh * .48, lv.bust + 1], [dp.bh * .3, lv.waist + 1]], { w: .9, c: 'rgba(0,0,0,.25)' });
  }
  return { svg: s, dims: [{ h0: lv.hps, h1: hemH0, label: 'len' }] };
}
function dressSide(c) {
  const g = c.g, e = g.ease, { lv } = c;
  const hemH0 = lv.hps - g.length;
  const dp = dressProfile(c, e, hemH0, g.sweep);
  const hemH = dp.hm;
  const sd = sideDepthFns(c, e);
  const hemD = dp.hem * .88;
  const F = curve([[lv.sh, 4.8], [lv.arm, sd.bB * .95], [lv.bust, sd.bB * 1.12], [lv.waist, sd.bW * .98], [lv.hip, sd.bH * .9],
      [lerp(lv.hip, hemH, .5), lerp(sd.bH * .9, hemD, .38) + .2], [hemH, hemD + .2]]);
  const Bk = curve([[lv.sh, 5.4], [lv.arm, sd.bB * .85], [lv.bust, sd.bB * .88], [lv.waist, sd.bW * 1.02], [lv.hip, sd.bH * 1.1],
      [lerp(lv.hip, hemH, .5), lerp(sd.bH * 1.1, hemD, .38)], [hemH, hemD]]);
  const Rf = sample(F, lv.sh, hemH, 1.2), Rb = sample(Bk, lv.sh, hemH, 1.2);
  const pts = [[3.2, lv.hps - 1], ...Rf, ...Rb.slice().reverse().map(p => [-p[0], p[1]]), [-3.8, lv.hps - 1]];
  let s = fab(pts);
  s += folds(2, lv.waist - 1, 6, hemH + 1, 4, 1);
  s += ln([[F(lv.waist), lv.waist + .2], [-Bk(lv.waist), lv.waist + .2]], { w: 1.1, c: 'rgba(0,0,0,.4)' });
  s += sleeveSideSvg(c, e, g.sleeve, 2.5);
  return { svg: s, dims: [{ h0: lv.hps, h1: hemH0, label: 'len' }] };
}

/* ======================================================================== */
/*  ÁO DÀI                                                                   */
/* ======================================================================== */
function aoDaiFront(c, back) {
  const g = c.g, e = g.ease, { lv, nw, b } = c;
  const hps = lv.hps, hemH = hps - g.length;
  const slitH = lv.waist - 2;
  const bh = halfW(b.bust + e), wh = halfW(b.waist + e), hh = halfW(b.hip + e);
  const ax = Math.min(bh * .97, c.sh - 2.8);
  const hemHalf = hh + 2.2;
  const prof = curve([[lv.sh, c.sh], [lv.arm, ax], [lv.bust, bh], [lv.waist, wh], [lv.hip, hh], [lerp(lv.hip, hemH, .5), hh + .8], [hemH, hemHalf]]);
  let s = '';
  // trousers (solid colour)
  const pn = pantsFront(c, { len: g.pantsLen, hemC: g.hem, e: 6, color: c.acc, back });
  s += pn.svg;
  // back panel peeking out on both sides
  const sm = t => t * t * (3 - 2 * t);
  const prof2 = h => prof(h) + 2.4 * sm(clamp((slitH - h) / 9, 0, 1));
  const bp = sample(prof2, slitH + .1, hemH - 1.2, 1.5);
  const peek = [...bp, ...mir(bp).reverse()];
  s += fab(peek) + darken(peek, .3);
  s += sleeveFrontSvg(c, e, g.sleeve, 3);
  const nn = nw + .9;
  const poly = topPoly(c, { prof, hemH, nn, neckDepth: 2.6, neckShape: 'u' });
  s += fab(poly);
  // collar
  const hp = hps;
  s += fab([[-nw - .7, hp + 4.4], [nw + .7, hp + 4.4], [nw + .9, hp - .6], [nw * .5, hp - 2.4], [0, hp - 2.9], [-nw * .5, hp - 2.4], [-nw - .9, hp - .6]].map(p => back ? [p[0], p[1] < hp - 1 ? hp - .9 : p[1]] : p), 1.2);
  s += ln([[-nw - .8, hp + 2], [nw + .8, hp + 2]], { w: .8, c: 'rgba(0,0,0,.25)' });
  if (!back) {
    const A = [1.0, hp - 2.6], B = [ax - 1.6, lv.arm - .6];
    const pathPts = [A, [lerp(A[0], B[0], .45), lerp(A[1], B[1], .55) + .5], B];
    const sidePts = sample(h => prof(h) - 1.7, B[1], slitH + 1, 1.5);
    s += ln([...pathPts, ...sidePts], { w: 1.2, c: 'rgba(0,0,0,.5)' });
    s += hl([...pathPts, ...sidePts].map(p => [p[0] - .4, p[1] + .1]));
    [.12, .45, .78].forEach(t => s += dot(lerp(A[0], B[0], t), lerp(A[1], B[1], t) + .3, .5));
    for (let h = B[1] - 4; h > slitH + 1; h -= 6.5) s += dot(prof(h) - 1.7, h, .5);
  } else {
    s += ln([[0, hp - 2.9], [-.2, lv.waist], [0, hemH]], { w: 1, c: 'rgba(0,0,0,.35)' });
  }
  // darts
  s += ln([[-bh * .5, lv.bust - 2], [-wh * .55, lv.waist], [-hh * .6, lv.hip - 2]], { w: .8, c: 'rgba(0,0,0,.18)' });
  s += ln([[bh * .5, lv.bust - 2], [wh * .55, lv.waist], [hh * .6, lv.hip - 2]], { w: .8, c: 'rgba(0,0,0,.18)' });
  s += folds(wh * .7, slitH - 2, hemHalf * .8, hemH + 2, 3, .5);
  return { svg: s, dims: [{ h0: hps, h1: hemH, label: 'len', off: 0 }, { h0: pn.top, h1: pn.hemH, label: 'pants', off: 1 }] };
}

function aoDaiSide(c) {
  const g = c.g, e = g.ease, { lv } = c;
  const hps = lv.hps, hemH = hps - g.length;
  const slitH = lv.waist - 2;
  const pn = pantsSide(c, { len: g.pantsLen, hemC: g.hem, e: 2, color: c.acc, farOff: 1.4 });
  const { F, Bk } = sideDepthFns(c, e, hemH, 1.4);
  const sm = t => t * t * (3 - 2 * t);
  const gap = h => 9.5 * sm(clamp((slitH - h) / 22, 0, 1));
  let s = pn.svg;
  // upper part
  const Ru = sample(F, lv.sh, slitH, 1.2), Bu = sample(Bk, lv.sh, slitH, 1.2);
  const upper = [[3.2, hps], ...Ru, ...Bu.slice().reverse().map(p => [-p[0], p[1]]), [-3.8, hps]];
  // panels
  const hmP = hemH;
  const frontPanel = [...sample(h => F(h) + 1.0 * sm(clamp((slitH - h) / 30, 0, 1)), slitH + .2, hmP, 1.5),
                      ...sample(h => F(h) - 13 * sm(clamp((slitH - h) / 22, 0, 1)) - 0.5, hmP, slitH + .2, 1.5)];
  const backPanel = [...sample(h => -Bk(h) - 1.0 * sm(clamp((slitH - h) / 30, 0, 1)), slitH + .2, hmP, 1.5),
                     ...sample(h => -Bk(h) + 13 * sm(clamp((slitH - h) / 22, 0, 1)) + 0.5, hmP, slitH + .2, 1.5)];
  s += fab(backPanel) + darken(backPanel, .12);
  s += fab(frontPanel);
  s += fab(upper);
  s += ln([[F(slitH), slitH], [-Bk(slitH), slitH]], { w: .8, c: 'rgba(0,0,0,.25)' });
  s += fab([[-4.0, hps + 4.4], [3.6, hps + 4.4], [4.0, hps - .8], [-4.2, hps - .8]], 1.2);
  s += sleeveSideSvg(c, e, g.sleeve, 3);
  return { svg: s, dims: [{ h0: hps, h1: hemH, label: 'len', off: 0 }, { h0: pn.top, h1: pn.hemH, label: 'pants', off: 1 }] };
}

/* ======================================================================== */
const GARMENTS = {
  shirt: {
    fields: [
      { k: 'length', min: 45, max: 110, step: .5, def: H => Math.round(.43 * H) },
      { k: 'sleeve', min: 0, max: 70, step: .5, def: H => Math.round(.365 * H) },
      { k: 'ease', min: 0, max: 30, step: .5, def: () => 8 }],
    front: shirtFront, side: shirtSide
  },
  combo: {
    fields: [
      { k: 'length', min: 45, max: 110, step: .5, def: H => Math.round(.43 * H) },
      { k: 'sleeve', min: 0, max: 70, step: .5, def: H => Math.round(.365 * H) },
      { k: 'ease', min: 0, max: 30, step: .5, def: () => 8 },
      { k: 'pantsLen', min: 30, max: 115, step: .5, def: H => Math.round(.6 * H) },
      { k: 'hem', min: 30, max: 75, step: .5, def: () => 40 },
      { k: 'pantsEase', min: 0, max: 25, step: .5, def: () => 6 }],
    front: comboFront, side: comboSide
  },
  suit: {
    fields: [
      { k: 'length', min: 55, max: 105, step: .5, def: H => Math.round(.46 * H) },
      { k: 'sleeve', min: 35, max: 70, step: .5, def: H => Math.round(.37 * H) },
      { k: 'pantsLen', min: 30, max: 115, step: .5, def: H => Math.round(.6 * H) },
      { k: 'hem', min: 30, max: 70, step: .5, def: () => 42 },
      { k: 'ease', min: 0, max: 30, step: .5, def: () => 10 }],
    accent: true, front: suitFront, side: suitSide
  },
  pants: {
    fields: [
      { k: 'pantsLen', min: 30, max: 115, step: .5, def: H => Math.round(.6 * H) },
      { k: 'hem', min: 30, max: 75, step: .5, def: () => 40 },
      { k: 'ease', min: 0, max: 25, step: .5, def: () => 6 }],
    front: pantsGarmentFront, side: pantsGarmentSide
  },
  dress: {
    fields: [
      { k: 'length', min: 70, max: 160, step: .5, def: H => Math.round(.64 * H) },
      { k: 'sleeve', min: 0, max: 70, step: .5, def: () => 22 },
      { k: 'sweep', min: 90, max: 300, step: 1, def: () => 150 },
      { k: 'ease', min: 0, max: 20, step: .5, def: () => 5 }],
    front: dressFront, side: dressSide
  },
  aodai: {
    fields: [
      { k: 'length', min: 90, max: 160, step: .5, def: H => Math.round(.72 * H) },
      { k: 'sleeve', min: 0, max: 70, step: .5, def: H => Math.round(.35 * H) },
      { k: 'pantsLen', min: 40, max: 115, step: .5, def: H => Math.round(.6 * H) },
      { k: 'hem', min: 30, max: 80, step: .5, def: () => 50 },
      { k: 'ease', min: 0, max: 15, step: .5, def: () => 3 }],
    accent: true, front: aoDaiFront, side: aoDaiSide
  }
};

/* Renders the figure for a view; returns { svg, dims } */
function renderFigure(st) {
  const c = makeCtx(st), G = GARMENTS[st.garment], v = st.view;
  let res, man;
  if (v === 'front' || v === 'back') {
    const back = v === 'back';
    man = mannequinFB(c, back);
    res = G.front(c, back);
    return { svg: man + res.svg + c.overlay, dims: res.dims, c };
  }
  man = mannequinSide(c);
  res = G.side(c);
  let svg = man + res.svg + c.overlay;
  if (v === 'left') svg = `<g transform="translate(${2 * CX} 0) scale(-1 1)">${svg}</g>`;
  return { svg, dims: res.dims, c };
}

/* ======================================================================== */
/*  SHIRT + PANTS shown together                                             */
/* ======================================================================== */
function comboFront(c, back) {
  const g = c.g;
  const pn = pantsFront(c, { len: g.pantsLen, hemC: g.hem, e: g.pantsEase, crease: true, back });
  const sh = shirtFront(c, back);
  return { svg: pn.svg + sh.svg, dims: [{ h0: c.lv.hps, h1: sh.dims[0].h1, label: 'shirt', off: 0 }, { h0: pn.top, h1: pn.hemH, label: 'pants', off: 1 }] };
}
function comboSide(c) {
  const g = c.g;
  const pn = pantsSide(c, { len: g.pantsLen, hemC: g.hem, e: g.pantsEase, crease: true });
  const sh = shirtSide(c);
  return { svg: pn.svg + sh.svg, dims: [{ h0: c.lv.hps, h1: sh.dims[0].h1, label: 'shirt', off: 0 }, { h0: pn.top, h1: pn.hemH, label: 'pants', off: 1 }] };
}
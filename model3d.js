'use strict';
/* ==========================================================================
   Tailor Studio – Parametric 3D Mannequin & Costume Engine (Three.js r147)
   ==========================================================================
   Coordinate system (in centimetres, matching garments.js 1:1):
     x : lateral (+x = viewer's right when yaw = 0, i.e. model's left side)
     y : height above the floor (0 cm = floor, H cm = top of head)
     z : depth (+z = facing direction / front of body when yaw = 0)
   Camera projection is calibrated to the 660×840 SVG viewBox (SC = 4 px/cm,
   CX = 330, FLOOR = 800) so the cm ruler, live measurement dimension arrows
   (#dims), and placed accessories (#acc) align seamlessly over the 3D model.
   ========================================================================== */

(function () {
  if (typeof THREE === 'undefined') return;

  const W_SVG = 660, H_SVG = 840;
  const PITCH = 3.0 * DEG; // subtle downward studio camera tilt for 3D foreshortening
  const gauss = (x, s) => { const t = x / s; return Math.exp(-t * t); };
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  let renderer, scene, camera, rootGroup, manGroup, garmentGroup, pedestalGroup;
  let canvasEl, curYaw = 0, targetYaw = 0, animId = 0, autoSpin = false;
  let dragging = false, dragStartX = 0, dragStartYaw = 0;

  /* ------------------------------------------------------ procedural textures */
  function makeWeaveBumpTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        const odd = ((x >> 2) + (y >> 2)) & 1;
        g.fillStyle = odd ? '#969696' : '#6a6a6a';
        g.fillRect(x, y, 3, 3);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.8, 0.8);
    return tex;
  }

  function makeToileTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#f0e8d8';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#dfd3be';
    g.lineWidth = 2;
    for (let i = -128; i < 256; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke();
    }
    g.strokeStyle = 'rgba(185,168,140,0.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 128; i += 8) {
      g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / 12, 1 / 12);
    return tex;
  }

  const weaveBump = makeWeaveBumpTexture();
  const toileTex = makeToileTexture();
  const texCache = { top: { src: null, tex: null }, bottom: { src: null, tex: null } };

  /* ------------------------------------------------------ materials */
  const matSkin = new THREE.MeshStandardMaterial({
    color: 0xdfd3c5, roughness: 0.62, metalness: 0.03
  });
  const matSkinLip = new THREE.MeshStandardMaterial({
    color: 0xc27d79, roughness: 0.48, metalness: 0.03
  });
  const matHair = new THREE.MeshStandardMaterial({
    color: 0x2d2522, roughness: 0.52, metalness: 0.06, side: THREE.DoubleSide
  });
  const matShoe = new THREE.MeshStandardMaterial({
    color: 0x38302b, roughness: 0.4, metalness: 0.1
  });
  const matTie = new THREE.MeshStandardMaterial({
    color: 0x7d1e2d, roughness: 0.42, metalness: 0.06, side: THREE.DoubleSide
  });
  const matSeam = new THREE.MeshStandardMaterial({
    color: 0x261f1a, roughness: 0.7, metalness: 0.05
  });
  const matButton = new THREE.MeshStandardMaterial({
    color: 0xe2dacb, roughness: 0.3, metalness: 0.2
  });
  const matBrass = new THREE.MeshStandardMaterial({
    color: 0xb88f3d, roughness: 0.32, metalness: 0.6
  });
  const matPocketSq = new THREE.MeshStandardMaterial({
    color: 0xf7f4ec, roughness: 0.55, metalness: 0.02, side: THREE.DoubleSide
  });

  const matFabTop = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: toileTex, bumpMap: weaveBump, bumpScale: 0.14,
    roughness: 0.72, metalness: 0.02, side: THREE.DoubleSide
  });
  const matFabBot = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: toileTex, bumpMap: weaveBump, bumpScale: 0.14,
    roughness: 0.72, metalness: 0.02, side: THREE.DoubleSide
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: 0xf4f1e8, bumpMap: weaveBump, bumpScale: 0.08,
    roughness: 0.62, metalness: 0.02, side: THREE.DoubleSide
  });

  function syncSlotMaterial(mat, slotKey, fabObj, onReady) {
    if (!fabObj || !fabObj.src) {
      mat.map = toileTex;
      mat.needsUpdate = true;
      return;
    }
    const cache = texCache[slotKey];
    const applyParams = tex => {
      const wrap = fabObj.mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
      if (tex.wrapS !== wrap || tex.wrapT !== wrap) {
        tex.wrapS = tex.wrapT = wrap;
        tex.needsUpdate = true;
      }
      const sz = Math.max(2, fabObj.size || 14);
      const ar = fabObj.ar || 1;
      tex.repeat.set(1 / sz, 1 / (sz * ar));
      tex.rotation = -(fabObj.rot || 0) * DEG;
      tex.center.set(0.5, 0.5);
      mat.map = tex;
      mat.needsUpdate = true;
    };
    if (cache.src === fabObj.src && cache.tex) {
      applyParams(cache.tex);
      return;
    }
    cache.src = fabObj.src;
    const img = new Image();
    img.onload = () => {
      if (cache.tex) cache.tex.dispose();
      const tex = new THREE.Texture(img);
      tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
      tex.needsUpdate = true;
      cache.tex = tex;
      applyParams(tex);
      if (onReady) onReady();
    };
    img.src = fabObj.src;
  }

  function updateFabricTextures(st) {
    const top = st.fab.top;
    const two = (st.garment === 'combo' || st.garment === 'suit');
    const bot = (st.linked || !two) ? top : st.fab.bottom;
    syncSlotMaterial(matFabTop, 'top', top, () => renderOnce());
    syncSlotMaterial(matFabBot, 'bottom', bot, () => renderOnce());
  }

  /* ------------------------------------------------------ scene & camera init */
  function init3D() {
    const center = document.getElementById('center');
    const svg = document.getElementById('svg');
    if (!center || !svg) return;

    canvasEl = document.createElement('canvas');
    canvasEl.id = 'glCanvas';
    center.insertBefore(canvasEl, svg);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W_SVG * 2, H_SVG * 2, false);

    scene = new THREE.Scene();

    // Orthographic frustum in cm: width = 165 cm (-82.5..82.5), height = 210 cm (-10..200)
    // Centered at cy = 95 cm so y = 0 is at FLOOR = 800 and y = 200 is at top = 0
    const dist = 300;
    const cy = 95;
    camera = new THREE.OrthographicCamera(-82.5, 82.5, 200 - cy, -10 - cy, 10, 700);
    camera.position.set(0, cy + dist * Math.sin(PITCH), dist * Math.cos(PITCH));
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();

    // Studio 3-point lighting + hemisphere light
    const hemi = new THREE.HemisphereLight(0xfffcf7, 0x6e6254, 0.62);
    hemi.position.set(0, 220, 0);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 0.58);
    keyLight.position.set(115, 210, 175);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xeef3ff, 0.24);
    fillLight.position.set(-140, 110, 110);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe8c2, 0.32);
    rimLight.position.set(20, 195, -180);
    scene.add(rimLight);

    rootGroup = new THREE.Group();
    pedestalGroup = new THREE.Group();
    manGroup = new THREE.Group();
    garmentGroup = new THREE.Group();
    rootGroup.add(pedestalGroup);
    rootGroup.add(manGroup);
    rootGroup.add(garmentGroup);
    scene.add(rootGroup);

    buildPedestal();
    setupOrbitInteraction(center);
  }

  /* ------------------------------------------------------ 3D turntable pedestal */
  function buildPedestal() {
    const shC = document.createElement('canvas');
    shC.width = shC.height = 128;
    const g = shC.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grd.addColorStop(0, 'rgba(25,20,15,0.34)');
    grd.addColorStop(0.65, 'rgba(25,20,15,0.14)');
    grd.addColorStop(1, 'rgba(25,20,15,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const shTex = new THREE.CanvasTexture(shC);
    const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
    const shMesh = new THREE.Mesh(new THREE.PlaneGeometry(76, 76), shMat);
    shMesh.rotation.x = -Math.PI / 2;
    shMesh.position.y = -1.6;
    pedestalGroup.add(shMesh);

    const topC = document.createElement('canvas');
    topC.width = topC.height = 512;
    const tg = topC.getContext('2d');
    const rGrd = tg.createRadialGradient(256, 256, 10, 256, 256, 250);
    rGrd.addColorStop(0, '#f5efe4');
    rGrd.addColorStop(0.82, '#e5dccb');
    rGrd.addColorStop(0.95, '#c9b898');
    rGrd.addColorStop(1, '#27364a');
    tg.fillStyle = rGrd;
    tg.beginPath(); tg.arc(256, 256, 254, 0, Math.PI * 2); tg.fill();

    tg.strokeStyle = 'rgba(39,54,74,0.45)';
    for (let deg = 0; deg < 360; deg += 10) {
      const a = deg * DEG;
      const major = deg % 45 === 0;
      const r0 = major ? 212 : 226, r1 = 242;
      tg.lineWidth = major ? 3 : 1.5;
      tg.beginPath();
      tg.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0);
      tg.lineTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1);
      tg.stroke();
    }
    tg.fillStyle = '#b58b3f';
    tg.beginPath();
    tg.moveTo(256, 248); tg.lineTo(244, 224); tg.lineTo(268, 224); tg.closePath();
    tg.fill();

    const topTex = new THREE.CanvasTexture(topC);
    topTex.anisotropy = 4;
    const platMatTop = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.5, metalness: 0.1 });
    const platMatSide = new THREE.MeshStandardMaterial({ color: 0x27364a, roughness: 0.4, metalness: 0.3 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(25, 26.5, 1.5, 64, 1), [platMatSide, platMatTop, platMatSide]);
    cyl.position.y = -0.75;
    pedestalGroup.add(cyl);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(25.3, 0.28, 12, 64), matBrass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.05;
    pedestalGroup.add(ring);
  }

  /* ------------------------------------------------------ geometry helpers */
  function disposeGroup(grp) {
    while (grp.children.length) {
      const ch = grp.children.pop();
      if (ch.geometry) ch.geometry.dispose();
    }
  }

  function buildLoftGeo(ringCount, segCount, pointFn, closeCaps = false, thetaStart = -Math.PI, thetaEnd = Math.PI) {
    const stride = segCount + 1;
    const pos = new Float32Array(ringCount * stride * 3);
    const uvs = new Float32Array(ringCount * stride * 2);
    let pIdx = 0, uIdx = 0;

    for (let i = 0; i < ringCount; i++) {
      const v = ringCount > 1 ? i / (ringCount - 1) : 0;
      for (let j = 0; j <= segCount; j++) {
        const u = j / segCount;
        const theta = thetaStart + (thetaEnd - thetaStart) * u;
        const pt = pointFn(i, j, v, theta);
        pos[pIdx++] = pt[0];
        pos[pIdx++] = pt[1];
        pos[pIdx++] = pt[2];
        uvs[uIdx++] = pt[3] !== undefined ? pt[3] : theta * 14;
        uvs[uIdx++] = pt[4] !== undefined ? pt[4] : pt[1];
      }
    }

    const indices = [];
    for (let i = 0; i < ringCount - 1; i++) {
      const r0 = i * stride, r1 = (i + 1) * stride;
      for (let j = 0; j < segCount; j++) {
        const a = r0 + j, b = r0 + j + 1, c = r1 + j, d = r1 + j + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    if (closeCaps && ringCount >= 2) {
      [0, ringCount - 1].forEach((rIdx, isBot) => {
        const base = rIdx * stride;
        for (let j = 1; j < segCount - 1; j++) {
          if (isBot) indices.push(base, base + j + 1, base + j);
          else indices.push(base, base + j, base + j + 1);
        }
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function buildThickPanelGeo(ringCount, segCount, pointFn, thickness = 0.35, thetaStart = -Math.PI, thetaEnd = Math.PI) {
    const stride = segCount + 1;
    const nVerts = ringCount * stride;
    const pos = new Float32Array(nVerts * 2 * 3);
    const uvs = new Float32Array(nVerts * 2 * 2);

    for (let i = 0; i < ringCount; i++) {
      const v = ringCount > 1 ? i / (ringCount - 1) : 0;
      for (let j = 0; j <= segCount; j++) {
        const u = j / segCount;
        const theta = thetaStart + (thetaEnd - thetaStart) * u;
        const pt = pointFn(i, j, v, theta);
        const nx = Math.sin(theta), nz = Math.cos(theta);
        const idxOut = i * stride + j;
        const idxIn = nVerts + idxOut;

        pos[idxOut * 3] = pt[0];
        pos[idxOut * 3 + 1] = pt[1];
        pos[idxOut * 3 + 2] = pt[2];
        uvs[idxOut * 2] = pt[3] !== undefined ? pt[3] : theta * 14;
        uvs[idxOut * 2 + 1] = pt[4] !== undefined ? pt[4] : pt[1];

        pos[idxIn * 3] = pt[0] - nx * thickness;
        pos[idxIn * 3 + 1] = pt[1];
        pos[idxIn * 3 + 2] = pt[2] - nz * thickness;
        uvs[idxIn * 2] = uvs[idxOut * 2];
        uvs[idxIn * 2 + 1] = uvs[idxOut * 2 + 1];
      }
    }

    const indices = [];
    for (let i = 0; i < ringCount - 1; i++) {
      const r0 = i * stride, r1 = (i + 1) * stride;
      for (let j = 0; j < segCount; j++) {
        const a = r0 + j, b = r0 + j + 1, c = r1 + j, d = r1 + j + 1;
        indices.push(a, c, b, b, c, d);
        const ai = nVerts + a, bi = nVerts + b, ci = nVerts + c, di = nVerts + d;
        indices.push(ai, bi, ci, bi, di, ci);
      }
      const l0 = r0, l1 = r1, l0i = nVerts + l0, l1i = nVerts + l1;
      indices.push(l0, l0i, l1, l1, l0i, l1i);
      const e0 = r0 + segCount, e1 = r1 + segCount, e0i = nVerts + e0, e1i = nVerts + e1;
      indices.push(e0, e1, e0i, e1, e1i, e0i);
    }
    const bRow = (ringCount - 1) * stride;
    for (let j = 0; j < segCount; j++) {
      const a = bRow + j, b = bRow + j + 1, ai = nVerts + a, bi = nVerts + b;
      indices.push(a, ai, b, b, ai, bi);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /* ------------------------------------------------------ anatomical 3D body profile */
  function makeTorsoSampler(c, ease = 0, garmentMode = false) {
    const { b, lv, sh, male, nw } = c;
    const bh = halfW(b.bust + ease), wh = halfW(b.waist + ease), hh = halfW(b.hip + ease);
    const ax = Math.min(bh * 0.97, sh - 2.6);
    const sd = sideDepthFns(c, ease);

    const relax = garmentMode ? clamp(ease / 32, 0, 0.55) : 0;
    const whEff = lerp(wh, Math.max(bh, hh) * 0.92, relax);
    const shTrunk = Math.min(sh - 2.2, Math.max(bh * 0.98, sh - 2.8));
    const wCurve = curve([
      [lv.hps + 1.5, nw + (garmentMode ? 0.5 : 0.1)],
      [lv.sh, shTrunk + (garmentMode ? 0.35 + ease * 0.05 : 0)],
      [lv.arm, ax + (garmentMode ? 0.25 : 0)],
      [lv.bust, bh],
      [lv.waist, whEff],
      [lv.hip, hh],
      [lv.crotch - 4, hh * 0.94]
    ]);

    return (h, theta, radBoost = 0) => {
      let rx = wCurve(h) + radBoost;
      let df = sd.F(h) + radBoost, db = sd.Bk(h) + radBoost;
      if (garmentMode && h < lv.bust && h > lv.hip) {
        const wRelax = Math.sin(clamp((lv.bust - h) / (lv.bust - lv.hip), 0, 1) * Math.PI) * relax * 1.6;
        df += wRelax;
        db += wRelax * 0.6;
      }

      if (h > lv.sh) {
        const tNeck = clamp((h - lv.sh) / (lv.hps - lv.sh + 0.01), 0, 1);
        df = lerp(df, nw * 0.92 + radBoost, tNeck);
        db = lerp(db, nw * 0.98 + radBoost, tNeck);
      }

      const s = Math.sin(theta), cs = Math.cos(theta);
      const shFactor = clamp(1 - Math.abs(h - lv.sh) / 8, 0, 1) * 0.12;
      const rMod = 1 + shFactor * Math.sin(2 * theta) ** 2;

      let x = rx * s * rMod;
      let rz = cs >= 0 ? df : db;
      let z = rz * cs * rMod;

      // Sculpted 3D bust / pectoral contour in front
      const bustBand = gauss(h - lv.bust, male ? 6.5 : 5.8);
      if (cs > 0 && bustBand > 0.02) {
        if (!male) {
          const lMound = gauss(theta - 0.34, 0.32);
          const rMound = gauss(theta + 0.34, 0.32);
          const bridge = garmentMode ? 0.58 * gauss(theta, 0.25) : 0.14;
          z += bustBand * (1.8 * Math.max(lMound + rMound, bridge));
        } else {
          const pec = gauss(theta, 0.62) * (1 - 0.25 * gauss(theta, 0.1));
          z += bustBand * 0.85 * pec;
        }
      }

      // Sculpted 3D glutes at hip in back
      const hipBand = gauss(h - (lv.hip - 1.5), 6.5);
      if (cs < 0 && hipBand > 0.02) {
        const glute = gauss(Math.abs(theta) - 2.65, 0.42);
        z -= hipBand * 1.1 * glute;
      }

      // Subtle spinal groove on upper back for bare mannequin
      if (!garmentMode && cs < -0.7 && h > lv.waist && h < lv.hps) {
        const groove = gauss(Math.PI - Math.abs(theta), 0.14);
        z += 0.4 * groove;
      }

      const spineZ = 0.5 * Math.sin(((h - lv.crotch) / (lv.hps - lv.crotch)) * Math.PI * 1.4);
      z += spineZ;

      const uCm = theta * ((rx + (df + db) * 0.5) * 0.5);
      return [x, h, z, uCm, h];
    };
  }

  /* ------------------------------------------------------ 3D MANNEQUIN BUILDER */
  function buildMannequin3D(c) {
    disposeGroup(manGroup);
    const { H, lv, sh, nw, male } = c;
    const torsoSample = makeTorsoSampler(c, 0, false);

    // 1. Torso + Neck (from crotch h = lv.crotch + 0.2 up to chin h = lv.chin + 1.8)
    const hBot = lv.crotch + 0.2, hTop = lv.chin + 1.8;
    const torsoGeo = buildLoftGeo(38, 48, (i, j, v, theta) => {
      const h = lerp(hTop, hBot, v);
      if (h > lv.hps) {
        const tN = clamp((h - lv.hps) / (hTop - lv.hps), 0, 1);
        const rX = lerp(nw + 0.3, nw * 0.88, tN);
        const rZ = lerp(nw * 0.95, nw * 0.86, tN);
        const zOff = lerp(0.3, 0.9, tN);
        return [rX * Math.sin(theta), h, rZ * Math.cos(theta) + zOff, theta * rX, h];
      }
      const pt = torsoSample(h, theta);
      if (h < lv.crotch + 2.5) {
        const tP = clamp((lv.crotch + 2.5 - h) / 2.5, 0, 1);
        pt[0] *= (1 - 0.16 * tP);
        pt[2] *= (1 - 0.28 * tP * Math.cos(theta) ** 2);
      }
      return pt;
    }, true);
    manGroup.add(new THREE.Mesh(torsoGeo, matSkin));

    // 2. Seamless Hip-to-Ankle Legs & Shoes
    const leg = legFns(c, 3, 7.4, 10.2, 0);
    const dleg = legSide(c, 3, 7.6, 10.2, 0);
    [1, -1].forEach(sd => {
      const legGeo = buildLoftGeo(30, 32, (i, j, v, theta) => {
        const h = lerp(lv.hip - 2, 2.8, v);
        const cx = sd * leg.cen(Math.min(lv.crotch, h));
        // Taper top of bare leg inside the pelvis/crotch so it never pokes through trousers or skirts
        const topTaper = h > lv.crotch - 4 ? lerp(1, 0.82, clamp((h - (lv.crotch - 4)) / (lv.hip - lv.crotch + 2), 0, 1)) : 1;
        const rx = leg.w(Math.min(lv.crotch, h)) * 0.5 * topTaper;
        const zF = dleg.f(Math.min(lv.crotch, h)) * topTaper;
        const zB = -dleg.bk(Math.min(lv.crotch, h)) * topTaper;
        const cz = (zF + zB) * 0.5;
        const rz = Math.max(2.4, (zF - zB) * 0.5);
        const calf = (h < lv.knee && h > 10 && Math.cos(theta) < 0)
          ? 0.65 * Math.sin(((lv.knee - h) / (lv.knee - 10)) * Math.PI) * (-Math.cos(theta))
          : 0;
        const x = cx + rx * Math.sin(theta);
        const z = cz + (rz + calf) * Math.cos(theta);
        return [x, h, z, theta * rx, h];
      }, true);
      manGroup.add(new THREE.Mesh(legGeo, matSkin));

      const cxShoe = sd * (leg.cen(3) + 0.25);
      const shoeGeo = buildLoftGeo(14, 28, (i, j, v, theta) => {
        const h = lerp(4.0, 0.05, v);
        const t = v;
        const rx = lerp(3.5, 4.7, Math.sin(t * Math.PI * 0.65));
        const zFront = lerp(4.2, 12.8, Math.pow(t, 0.65)) * (1 - 0.08 * t * t);
        const zBack = lerp(-3.6, -4.4, t);
        const s = Math.sin(theta), cs = Math.cos(theta);
        const x = cxShoe + rx * s * (cs > 0 ? (1 - 0.18 * cs * t) : 1);
        const z = cs >= 0 ? zFront * cs : (-zBack) * cs;
        return [x, h, z, theta * 4, h];
      }, true);
      manGroup.add(new THREE.Mesh(shoeGeo, matShoe));
    });

    // 3. Arms & Hands
    const armL = 0.36 * H;
    const armAng = 6 * DEG, armFwd = 2.8 * DEG;
    [1, -1].forEach(sd => {
      const p0 = [sd * (sh - 3.6), lv.sh - 1.6, -0.2];
      const armGeo = buildLoftGeo(22, 28, (i, j, v, theta) => {
        const d = v * (armL + 6.5);
        const isHand = d > armL;
        const uArm = clamp(d / armL, 0, 1);
        let rx, rz;
        if (!isHand) {
          const shTuck = v < 0.15 ? lerp(0.84, 1, v / 0.15) : 1;
          rx = lerp(4.3, 2.6, uArm) * (male ? 1.05 : 0.95) * shTuck;
          rz = lerp(4.4, 2.8, uArm) * (male ? 1.05 : 0.95) * shTuck;
        } else {
          const uH = (d - armL) / 6.5;
          const handEnv = Math.sin(Math.min(1, uH * 1.15) * Math.PI * 0.85 + 0.2);
          rx = lerp(2.45, 1.45, uH) * handEnv;
          rz = lerp(2.75, 3.3, Math.sin(uH * Math.PI)) * (1 - 0.35 * uH);
        }
        const bendZ = d > armL * 0.48 ? (d - armL * 0.48) * Math.sin(armFwd * 1.4) : 0;
        const cx = p0[0] + sd * Math.sin(armAng) * d;
        const cy = p0[1] - Math.cos(armAng) * d;
        const cz = p0[2] + Math.sin(armFwd) * d + bendZ;
        const s = Math.sin(theta), cs = Math.cos(theta);
        return [cx + rx * s, cy, cz + rz * cs, theta * rx, cy];
      }, true);
      manGroup.add(new THREE.Mesh(armGeo, matSkin));
    });

    // 4. Sculpted 3D Head, Nose, Ears & Hair
    const hc = lv.chin + 0.0675 * H, ry = 0.0675 * H, rx = (male ? 0.048 : 0.044) * H, rz = (male ? 0.054 : 0.050) * H;
    const headZ = 0.9;
    const headGeo = buildLoftGeo(28, 40, (i, j, v, theta) => {
      const phi = v * Math.PI;
      const y = hc + ry * Math.cos(phi);
      const ringScale = Math.sin(phi);
      const jawTaper = v > 0.55 ? (1 - (male ? 0.22 : 0.32) * ((v - 0.55) / 0.45) ** 1.4 * Math.abs(Math.sin(theta))) : 1;
      const s = Math.sin(theta), cs = Math.cos(theta);
      let x = rx * ringScale * jawTaper * s;
      let z = headZ + rz * ringScale * cs;

      const noseY = hc - 0.8;
      const noseBand = gauss(y - noseY, 2.2);
      const noseBridge = (y > noseY && y < hc + 2.2) ? gauss(y - (hc + 0.5), 2.0) * 0.65 : 0;
      const noseW = gauss(theta, 0.16);
      if (cs > 0) {
        z += (noseBand * 1.45 + noseBridge) * noseW;
        const brow = gauss(y - (hc + 2.0), 1.1) * gauss(theta, 0.55);
        const chin = gauss(y - (lv.chin + 1.4), 1.3) * gauss(theta, 0.28);
        z += brow * 0.45 + chin * (male ? 0.55 : 0.38);
      }
      return [x, y, z, theta * rx, y];
    }, true);
    manGroup.add(new THREE.Mesh(headGeo, matSkin));

    const lipGeo = new THREE.SphereGeometry(1.15, 16, 10);
    lipGeo.scale(1.35, 0.38, 0.55);
    const lipMesh = new THREE.Mesh(lipGeo, matSkinLip);
    lipMesh.position.set(0, hc - 4.8, headZ + rz * 0.86);
    manGroup.add(lipMesh);

    [1, -1].forEach(sd => {
      const earGeo = new THREE.SphereGeometry(1.1, 14, 12);
      earGeo.scale(0.55, 1.85, 0.95);
      const ear = new THREE.Mesh(earGeo, matSkin);
      ear.position.set(sd * (rx * 0.96), hc - 0.9, headZ - 0.6);
      manGroup.add(ear);
    });

    // 5. 3D Sculpted Hair
    const capGeo = buildLoftGeo(22, 40, (i, j, v, theta) => {
      const phi = v * Math.PI * 0.78;
      const y = hc + 0.35 + (ry + 0.7) * Math.cos(phi);
      const ringScale = Math.sin(phi);
      const s = Math.sin(theta), cs = Math.cos(theta);
      let rBoost = 0.75;
      if (cs > 0.25 && y < hc + ry * 0.42) {
        const foreCut = clamp((hc + ry * 0.42 - y) / (ry * 0.6), 0, 1) * clamp((cs - 0.25) / 0.75, 0, 1);
        rBoost -= foreCut * 2.2;
      }
      const wave = 0.18 * Math.sin(theta * 10);
      const x = (rx + rBoost + wave) * ringScale * s;
      const z = headZ + (rz + rBoost + wave) * ringScale * cs;
      return [x, y, z, theta * rx, y];
    }, true);
    manGroup.add(new THREE.Mesh(capGeo, matHair));

    const bangGeo = buildLoftGeo(10, 28, (i, j, v, theta) => {
      const y = lerp(hc + ry + 0.5, hc + ry * (male ? 0.38 : 0.26), v);
      const arch = Math.sin(v * Math.PI) * 0.55;
      const part = !male ? 0.45 * Math.sin(theta * 2) : 0.2 * Math.cos(theta * 2);
      const x = (rx + 0.7) * Math.sin(theta) * (0.4 + 0.6 * v);
      const z = headZ + (rz + 0.65 + arch) * Math.cos(theta) * (0.4 + 0.6 * v);
      return [x, y + part, z, theta * rx, y];
    }, false, -0.78 * Math.PI, 0.78 * Math.PI);
    manGroup.add(new THREE.Mesh(bangGeo, matHair));

    if (!male) {
      const hHairTop = hc + 1.5, hHairBot = lv.bust + 3.0;
      const longBackGeo = buildThickPanelGeo(22, 28, (i, j, v, theta) => {
        const h = lerp(hHairTop, hHairBot, v);
        const wBack = rx + 1.2 + 2.8 * Math.sin(v * Math.PI * 0.85);
        const wave = 0.35 * Math.sin(theta * 9 + v * 4) * Math.sin(v * Math.PI);
        const basePt = h <= lv.hps ? torsoSample(h, Math.PI) : [0, h, headZ - rz];
        const zBack = Math.min(basePt[2] - 1.4, headZ - rz * 0.95 - 1.2 * v) - wave;
        const x = (wBack + wave) * Math.sin(theta);
        const z = zBack * (-Math.cos(theta));
        return [x, h, z, theta * 8, h];
      }, 0.85, 0.66 * Math.PI, 1.34 * Math.PI);
      manGroup.add(new THREE.Mesh(longBackGeo, matHair));

      [1, -1].forEach(sd => {
        const lockGeo = buildLoftGeo(18, 16, (i, j, v, theta) => {
          const h = lerp(hc - 1.5, lv.bust + 4.0, v);
          const basePt = h > lv.hps
            ? [sd * (nw + 1.8), h, 1.6]
            : torsoSample(h, sd * 0.32);
          const rLock = lerp(1.3, 1.65, Math.sin(v * Math.PI * 0.85)) * (1 - 0.55 * v * v);
          const cx = sd * lerp(rx * 0.92, nw + 2.5, clamp(v * 1.4, 0, 1));
          const cz = basePt[2] + 1.35;
          return [cx + rLock * Math.sin(theta), h, cz + rLock * 0.65 * Math.cos(theta), theta * 2, h];
        }, true);
        manGroup.add(new THREE.Mesh(lockGeo, matHair));
      });
    }
  }

  /* ------------------------------------------------------ 3D SLEEVES HELPER */
  function addSleeves3D(c, ease, L, mat, shellOffset = 0.55, cuffLen = 3.2) {
    if (L < 1) return;
    const { H, lv, sh, male } = c;
    const armL = 0.36 * H;
    const armAng = 6 * DEG, armFwd = 2.8 * DEG;
    const [w0, w1] = sleeveDims(c, ease, L);

    [1, -1].forEach(sd => {
      const p0 = [sd * (sh - 3.6), lv.sh - 1.6, -0.2];
      const slvGeo = buildLoftGeo(22, 32, (i, j, v, theta) => {
        const d = v * L;
        const uArm = clamp(d / armL, 0, 1);
        const skinRx = lerp(4.3, 2.6, uArm) * (male ? 1.05 : 0.95);
        const skinRz = lerp(4.4, 2.8, uArm) * (male ? 1.05 : 0.95);
        const gW = lerp(w0 * 0.5, w1 * 0.5, v);
        let rx = Math.max(skinRx + shellOffset, gW);
        let rz = Math.max(skinRz + shellOffset, gW * 1.02);

        // Smooth tailored shoulder cap that tucks seamlessly into the shoulder slope
        let capLift = 0, capIn = 0;
        if (v < 0.22) {
          const tCap = (1 - v / 0.22) ** 1.4;
          const outerHalf = Math.max(0, sd * Math.sin(theta));
          capLift = tCap * 2.1 * (0.45 + 0.55 * outerHalf);
          capIn = -tCap * 2.0 * (0.5 + 0.5 * outerHalf);
        }

        const inCuff = (L > 14 && (L - d) <= cuffLen) ? 0.22 : 0;
        const fold = 0.14 * Math.sin(theta * 4 + v * 6) * Math.sin(v * Math.PI);

        const bendZ = d > armL * 0.48 ? (d - armL * 0.48) * Math.sin(armFwd * 1.4) : 0;
        const cx = p0[0] + sd * Math.sin(armAng) * d + sd * capIn;
        const cy = p0[1] - Math.cos(armAng) * d + capLift;
        const cz = p0[2] + Math.sin(armFwd) * d + bendZ;

        const s = Math.sin(theta), cs = Math.cos(theta);
        return [cx + (rx + inCuff + fold) * s, cy, cz + (rz + inCuff + fold) * cs, theta * rx, d];
      }, false);
      garmentGroup.add(new THREE.Mesh(slvGeo, mat));

      if (L > 14) {
        const dCuff = L - cuffLen;
        const uArm = clamp(dCuff / armL, 0, 1);
        const gW = lerp(w0 * 0.5, w1 * 0.5, dCuff / L);
        const rx = Math.max(lerp(4.3, 2.6, uArm) + shellOffset, gW) + 0.24;
        const bendZ = dCuff > armL * 0.48 ? (dCuff - armL * 0.48) * Math.sin(armFwd * 1.4) : 0;
        const cx = p0[0] + sd * Math.sin(armAng) * dCuff;
        const cy = p0[1] - Math.cos(armAng) * dCuff;
        const cz = p0[2] + Math.sin(armFwd) * dCuff + bendZ;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rx, 0.11, 8, 32), matSeam);
        ring.rotation.x = Math.PI / 2;
        ring.rotation.y = sd * armAng;
        ring.position.set(cx, cy, cz);
        garmentGroup.add(ring);
      }
    });
  }

  /* ------------------------------------------------------ 3D BUTTON HELPER */
  function addButton3D(x, y, z, radius = 0.58, mat = matButton) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.28, 16), mat);
    cyl.rotation.x = Math.PI / 2;
    cyl.position.set(x, y, z);
    garmentGroup.add(cyl);
  }

  /* ------------------------------------------------------ 3D PANTS BUILDER */
  function buildPants3D(c, o) {
    const { lv } = c;
    const e = o.e;
    const waistE = o.waistEase !== undefined ? o.waistEase : e;
    const mat = o.mat || matFabBot;
    const top = pantsTop(c), hemH = Math.max(1.5, top - o.len);
    const torsoSample = makeTorsoSampler(c, waistE, true);

    const leg = legFns(c, hemH, o.hemC / 2.9, null, e);
    const dleg = legSide(c, hemH, o.hemC / 3.1, null, e);
    const skinLeg = legFns(c, 3, 7.4, 10.2, 0);
    const skinDleg = legSide(c, 3, 7.6, 10.2, 0);

    // Continuous seamless loft from waistband (top) through hip/crotch down to ankle (hemH) for each side
    [1, -1].forEach(sd => {
      const sideGeo = buildLoftGeo(38, 36, (i, j, v, theta) => {
        const h = lerp(top, hemH, v);
        const s = Math.sin(theta), cs = Math.cos(theta);

        // Pelvis point (for h >= lv.crotch)
        const hPelvis = Math.max(lv.crotch - 2, h);
        const wbBoost = (h > top - 3.6) ? 0.25 : 0;
        const pTorso = torsoSample(hPelvis, theta, 0.85 + wbBoost);
        const xPelvis = sd > 0 ? Math.max(0, pTorso[0]) : Math.min(0, pTorso[0]);
        const zPelvis = pTorso[2];

        // Leg tube point
        const hLeg = Math.min(lv.crotch + 2, h);
        const cx = sd * leg.cen(hLeg);
        const rx = Math.max(leg.w(hLeg) * 0.5, skinLeg.w(hLeg) * 0.5 + 0.68);
        const zF = Math.max(dleg.f(hLeg), skinDleg.f(hLeg) + 0.68);
        const zB = Math.min(-dleg.bk(hLeg), -skinDleg.bk(hLeg) - 0.68);
        const cz = (zF + zB) * 0.5;
        const rz = Math.max(2.8, (zF - zB) * 0.5);
        const vLeg = clamp((lv.crotch - h) / Math.max(1, lv.crotch - hemH), 0, 1);
        const crease = o.crease ? 0.52 * Math.pow(Math.abs(cs), 7) * (0.25 + 0.75 * vLeg) : 0.16 * Math.sin(theta * 5) * vLeg;
        const xLeg = cx + rx * s * (o.crease ? (1 - 0.04 * Math.abs(cs)) : 1);
        const zLeg = cz + (rz + crease) * cs;

        // Smooth blend across the crotch transition zone (lv.crotch + 0.6 down to lv.crotch - 3.2)
        const tLeg = smoothstep(lv.crotch + 0.6, lv.crotch - 3.2, h);
        const x = lerp(xPelvis, xLeg, tLeg);
        const z = lerp(zPelvis, zLeg, tLeg);
        const uCm = lerp(pTorso[3], theta * rx, tLeg);
        return [x, h, z, uCm, h];
      }, false);
      garmentGroup.add(new THREE.Mesh(sideGeo, mat));
    });

    // Belt loops & front button (unless hidden under tunic)
    if (!o.underTunic) {
      const wbh = top - 1.8;
      [-0.82, -0.42, 0, 0.42, 0.82].forEach(k => {
        [1, -1].forEach(fb => {
          if (fb < 0 && k !== 0 && Math.abs(k) < 0.5) return;
          const theta = fb > 0 ? k * 1.15 : Math.PI - k * 1.15;
          if (fb > 0 && k === 0) return;
          const pt = torsoSample(wbh, theta, 0.65);
          const loop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.8, 0.45), mat);
          loop.position.set(pt[0], wbh, pt[2]);
          loop.rotation.y = theta;
          garmentGroup.add(loop);
        });
      });
      const frontWaist = torsoSample(wbh, 0, 0.7);
      addButton3D(0, wbh, frontWaist[2] + 0.25, 0.68, matButton);

      const flyGeo = buildLoftGeo(10, 4, (i, j, v, theta) => {
        const h = lerp(top - 3.6, lv.crotch + 1.8, v);
        const curveX = v > 0.72 ? ((v - 0.72) / 0.28) ** 1.5 * 2.2 : 0;
        const th = (curveX + (theta / Math.PI) * 0.16) / 14;
        const pt = torsoSample(h, th, 0.75);
        return [pt[0], h, pt[2], pt[3], h];
      }, false);
      garmentGroup.add(new THREE.Mesh(flyGeo, matSeam));
    }
  }

  /* ------------------------------------------------------ 3D SHIRT BUILDER */
  function buildShirt3D(c, shellOffset = 0.65) {
    const g = c.g, e = g.ease, { lv } = c;
    const hemH = lv.hps - g.length;
    const torsoSample = makeTorsoSampler(c, e, true);

    // 1. Shirt Torso Shell with anatomical shoulder slope, V-neck opening & curved hem
    const shirtGeo = buildLoftGeo(32, 52, (i, j, v, theta) => {
      const cs = Math.cos(theta);
      const vNeck = (cs > 0 && Math.abs(theta) < 0.44)
        ? 5.2 * (1 - Math.abs(theta) / 0.44)
        : 0.4 * gauss(Math.PI - Math.abs(theta), 0.45);
      const hemCurve = -2.0 * Math.cos(theta * 2) * 0.5 + 0.6;

      const hTop = lv.hps + 0.6 - vNeck;
      const hBot = hemH + hemCurve;
      const h = lerp(hTop, hBot, v);

      const flare = h < lv.hip ? ((lv.hip - h) / 20) * 0.75 : 0;
      const fold = 0.16 * Math.sin(theta * 6) * v;
      const pt = torsoSample(h, theta, shellOffset + flare + fold);
      return pt;
    }, false);
    garmentGroup.add(new THREE.Mesh(shirtGeo, matFabTop));

    // 2. 3D Spread Collar
    const collarGeo = buildThickPanelGeo(10, 36, (i, j, v, ang) => {
      const s = Math.sin(ang), cs = Math.cos(ang);
      const basePt = torsoSample(lv.hps, ang, shellOffset);
      let y, rOut;
      if (v <= 0.45) {
        const u = v / 0.45;
        y = lv.hps + u * 3.2;
        rOut = 0.35 + u * 0.45;
      } else {
        const u = (v - 0.45) / 0.55;
        const pointDrop = cs > 0 ? (3.0 + 3.4 * Math.pow(Math.max(0, cs), 1.5)) : 2.1;
        y = lv.hps + 3.2 - u * pointDrop;
        rOut = 0.8 + u * (cs > 0 ? 1.85 : 0.75);
      }
      return [basePt[0] + s * rOut, y, basePt[2] + cs * rOut, ang * 8, y];
    }, 0.26, 0.13 * Math.PI, 1.87 * Math.PI);
    garmentGroup.add(new THREE.Mesh(collarGeo, matFabTop));

    // 3. Raised 3D Front Placket + Buttons
    const plackTop = lv.hps - 5.2, plackBot = hemH - 1.2;
    const plackGeo = buildThickPanelGeo(20, 6, (i, j, v, theta) => {
      const h = lerp(plackTop, plackBot, v);
      const flare = h < lv.hip ? ((lv.hip - h) / 20) * 0.75 : 0;
      const pt = torsoSample(h, theta, shellOffset + flare + 0.38);
      return pt;
    }, 0.24, -0.09, 0.09);
    garmentGroup.add(new THREE.Mesh(plackGeo, matFabTop));

    for (let h = plackTop - 3.5; h > plackBot + 3.5; h -= 9.0) {
      const flare = h < lv.hip ? ((lv.hip - h) / 20) * 0.75 : 0;
      const pt = torsoSample(h, 0, shellOffset + flare + 0.55);
      addButton3D(0, h, pt[2], 0.54, matButton);
    }

    // 4. Left Chest 3D Patch Pocket
    const pTop = lv.bust + 1.8, pBot = lv.bust - 7.8;
    const pocketGeo = buildThickPanelGeo(8, 8, (i, j, v, theta) => {
      const tipDip = v === 1 ? -1.4 * (1 - Math.abs((theta - 0.52) / 0.22)) : 0;
      const h = lerp(pTop, pBot, v) + tipDip;
      const pt = torsoSample(h, theta, shellOffset + 0.38);
      return pt;
    }, 0.2, 0.30, 0.74);
    garmentGroup.add(new THREE.Mesh(pocketGeo, matFabTop));

    // 5. 3D Sleeves
    addSleeves3D(c, e, g.sleeve, matFabTop, shellOffset, 3.2);
  }

  /* ------------------------------------------------------ 3D SUIT BUILDER */
  function buildSuit3D(c) {
    const g = c.g, e = g.ease, { lv, male } = c;
    const hps = lv.hps, hemH = hps - g.length, btnH = lv.waist + 3;

    // 1. Trousers
    buildPants3D(c, { len: g.pantsLen, hemC: g.hem, e: Math.max(2, e * 0.55), crease: true, mat: matFabBot });

    const shirtSample = makeTorsoSampler(c, Math.max(2, e * 0.35), true);
    const jacketSample = makeTorsoSampler(c, e + 2.5, true);

    // 2. Inner Dress Shirt Chest & Collar
    const innerGeo = buildLoftGeo(16, 28, (i, j, v, theta) => {
      const h = lerp(hps + 2.2, btnH - 4, v);
      return shirtSample(h, theta, 0.58);
    }, false, -0.65 * Math.PI, 0.65 * Math.PI);
    garmentGroup.add(new THREE.Mesh(innerGeo, matAccent));

    // 3. 3D Silk Necktie (for male suit)
    if (male) {
      const tieGeo = buildThickPanelGeo(14, 6, (i, j, v, theta) => {
        const h = lerp(hps - 0.8, btnH - 5, v);
        let halfWidth;
        if (v < 0.16) halfWidth = lerp(1.7, 1.1, v / 0.16);
        else if (v < 0.82) halfWidth = lerp(1.1, 2.35, (v - 0.16) / 0.66);
        else halfWidth = lerp(2.35, 0.08, (v - 0.82) / 0.18);
        const th = (theta / Math.PI) * (halfWidth / 13);
        const pt = shirtSample(h, th, 0.92 + (v < 0.16 ? 0.3 : 0));
        return pt;
      }, 0.24, -Math.PI, Math.PI);
      garmentGroup.add(new THREE.Mesh(tieGeo, matTie));
    }

    // 4. 3D Tailored Suit Jacket Body
    const jacketGeo = buildThickPanelGeo(30, 56, (i, j, v, uAng) => {
      let openRad;
      const h = lerp(hps + 0.8, hemH, v);
      if (h > btnH) {
        const tV = clamp((h - btnH) / (hps + 0.8 - btnH), 0, 1);
        openRad = lerp(0.005, 0.36, Math.pow(tV, 0.92));
      } else {
        const tCut = clamp((btnH - h) / Math.max(1, btnH - hemH), 0, 1);
        openRad = 0.005 + 0.22 * Math.pow(tCut, 2.2);
      }
      const span = 2 * (Math.PI - openRad);
      let theta = Math.PI + (uAng - 0.5) * span;
      if (theta > Math.PI) theta -= 2 * Math.PI;

      const pt = jacketSample(h, theta, 1.18);
      return pt;
    }, 0.4, 0, 1);
    garmentGroup.add(new THREE.Mesh(jacketGeo, matFabTop));

    // 5. 3D Notched Lapels & Collar
    [1, -1].forEach(sd => {
      const lapelGeo = buildThickPanelGeo(16, 10, (i, j, v, u) => {
        const h = lerp(hps + 2.4, btnH + 1.5, v);
        const tV = clamp((h - btnH) / (hps + 2.4 - btnH), 0, 1);
        const innerAng = sd * lerp(0.015, 0.34, Math.pow(tV, 0.92));
        const notch = Math.abs(v - 0.28) < 0.07 ? 0.55 : 1.0;
        const widthRad = Math.sin(v * Math.PI * 0.88) * 0.32 * notch + 0.07;
        const theta = innerAng + sd * u * widthRad;
        const pt = jacketSample(h, theta, 1.55);
        return pt;
      }, 0.3, 0, 1);
      garmentGroup.add(new THREE.Mesh(lapelGeo, matFabTop));
    });

    const backCollarGeo = buildThickPanelGeo(6, 20, (i, j, v, theta) => {
      const h = lerp(hps + 2.6, hps - 0.8, v);
      return jacketSample(h, theta, 1.48);
    }, 0.3, 0.34 * Math.PI, 1.66 * Math.PI);
    garmentGroup.add(new THREE.Mesh(backCollarGeo, matFabTop));

    // 6. Jacket Buttons, Hip Welt Pockets & Breast Pocket Square
    [btnH - 0.8, btnH - 10.0].forEach(bh => {
      if (bh > hemH + 3) {
        const pt = jacketSample(bh, 0.025, 1.62);
        addButton3D(pt[0], bh, pt[2], 0.72, matSeam);
      }
    });

    const hp = lv.hip + 1.2;
    if (hp > hemH + 4) {
      [1, -1].forEach(sd => {
        const flapGeo = buildThickPanelGeo(5, 10, (i, j, v, theta) => {
          const h = lerp(hp + 1.2, hp - 2.6, v);
          return jacketSample(h, sd * theta, 1.55);
        }, 0.24, 0.34, 0.86);
        garmentGroup.add(new THREE.Mesh(flapGeo, matFabTop));
      });
    }

    const cb = lv.bust + 3.2;
    const sqGeo = buildThickPanelGeo(6, 8, (i, j, v, theta) => {
      const peak = (1 - v) * (1.2 + 0.9 * Math.sin((theta - 0.45) * 28));
      const h = cb + peak;
      const pt = jacketSample(cb, theta, 1.58);
      return [pt[0], h, pt[2], theta * 8, h];
    }, 0.18, 0.46, 0.76);
    garmentGroup.add(new THREE.Mesh(sqGeo, matPocketSq));

    // 7. 3D Suit Sleeves
    addSleeves3D(c, e + 2, g.sleeve, matFabTop, 0.95, 3.5);
  }

  /* ------------------------------------------------------ 3D DRESS BUILDER */
  function buildDress3D(c) {
    const g = c.g, e = g.ease, { lv } = c;
    const hemH0 = lv.hps - g.length;
    const dp = dressProfile(c, e, hemH0, g.sweep);
    const hemH = dp.hm;
    const torsoSample = makeTorsoSampler(c, e, true);

    // 1. Fitted 3D Bodice + Flared Pleated 3D Skirt
    const dressGeo = buildLoftGeo(44, 64, (i, j, v, theta) => {
      const s = Math.sin(theta), cs = Math.cos(theta);
      const frontScoop = cs > 0 && Math.abs(theta) < 0.56 ? 8.2 * Math.cos((theta / 0.56) * Math.PI * 0.5) : 0;
      const backScoop = cs < 0 && Math.abs(Math.PI - Math.abs(theta)) < 0.48
        ? 2.6 * Math.cos(((Math.PI - Math.abs(theta)) / 0.48) * Math.PI * 0.5)
        : 0;
      const hTop = lv.hps + 0.5 - frontScoop - backScoop;
      const h = lerp(hTop, hemH, v);

      if (h >= lv.waist) {
        return torsoSample(h, theta, 0.58);
      }

      const tSkirt = clamp((lv.waist - h) / Math.max(1, lv.waist - hemH), 0, 1);
      const waistPt = torsoSample(lv.waist, theta, 0.58);
      const hipPt = torsoSample(Math.max(lv.crotch, h), theta, 0.68);

      const rTargetX = dp.prof(h) + 0.68;
      const rTargetZ = rTargetX * 0.88;
      const pleatAmp = lerp(0.12, 2.1 * clamp(g.sweep / 150, 0.7, 1.8), Math.pow(tSkirt, 1.15));
      const pleat = pleatAmp * (Math.sin(theta * 8) + 0.35 * Math.cos(theta * 16));

      const flareBlend = smoothstep(lv.waist, lv.hip - 4, h);
      const x = lerp(hipPt[0], (rTargetX + pleat) * s, flareBlend);
      const z = lerp(hipPt[2], (rTargetZ + pleat) * cs, flareBlend);
      const hemWave = -1.1 * Math.sin(theta * 8) * tSkirt * tSkirt;
      return [x, h + hemWave * 0.32, z, theta * rTargetX, h];
    }, false);
    garmentGroup.add(new THREE.Mesh(dressGeo, matFabTop));

    // 2. 3D Waist Seam Belt Ring
    const waistGeo = buildThickPanelGeo(4, 48, (i, j, v, theta) => {
      const h = lerp(lv.waist + 0.8, lv.waist - 0.7, v);
      return torsoSample(h, theta, 0.82);
    }, 0.22);
    garmentGroup.add(new THREE.Mesh(waistGeo, matFabTop));

    // 3. 3D Sleeves
    addSleeves3D(c, e, g.sleeve, matFabTop, 0.55, 2.5);
  }

  /* ------------------------------------------------------ 3D ÁO DÀI BUILDER */
  function buildAoDai3D(c) {
    const g = c.g, e = g.ease, { lv, nw, sh } = c;
    const hps = lv.hps, hemH = hps - g.length, slitH = lv.waist - 2;
    const bh = halfW(c.b.bust + e), wh = halfW(c.b.waist + e), hh = halfW(c.b.hip + e);
    const hemHalf = hh + 2.4;
    const panelProf = curve([
      [lv.sh, sh], [lv.bust, bh], [lv.waist, wh], [lv.hip, hh],
      [lerp(lv.hip, hemH, 0.5), hh + 1.0], [hemH, hemHalf]
    ]);

    // 1. Wide-Leg Silk Trousers (Quần Áo Dài) fitted at the waist under the tunic, wide down the legs
    buildPants3D(c, { len: g.pantsLen, hemC: g.hem, e: 5.5, waistEase: Math.max(0, e - 1), underTunic: true, crease: false, mat: matAccent });

    const torsoSample = makeTorsoSampler(c, e, true);

    // 2. Fitted Upper Tunic (from hps down to slitH = lv.waist - 2)
    const upperGeo = buildLoftGeo(22, 48, (i, j, v, theta) => {
      const h = lerp(hps + 0.6, slitH, v);
      return torsoSample(h, theta, 0.88);
    }, false);
    garmentGroup.add(new THREE.Mesh(upperGeo, matFabTop));

    // 3. 3D Mandarin Standing Collar (Cổ cao Áo Dài)
    const collarGeo = buildThickPanelGeo(8, 36, (i, j, v, theta) => {
      const s = Math.sin(theta), cs = Math.cos(theta);
      const notch = (cs > 0 && Math.abs(theta) < 0.24) ? (1 - Math.abs(theta) / 0.24) * 2.0 * (1 - v) : 0;
      const h = lerp(hps + 4.0 - notch, hps - 0.5, v);
      const rX = nw + 0.85, rZ = nw * 0.95 + 0.85;
      return [rX * s, h, rZ * cs + 0.45, theta * rX, h];
    }, 0.26, -0.94 * Math.PI, 0.94 * Math.PI);
    garmentGroup.add(new THREE.Mesh(collarGeo, matFabTop));

    // Diagonal front flap buttons
    [0.15, 0.48, 0.80].forEach(t => {
      const h = lerp(hps - 2.2, lv.arm - 0.5, t);
      const th = lerp(0.08, 0.55, t);
      const pt = torsoSample(h, th, 1.05);
      addButton3D(pt[0], h, pt[2], 0.46, matButton);
    });
    for (let h = lv.arm - 4.5; h > slitH + 1.5; h -= 6.5) {
      const pt = torsoSample(h, 0.68, 1.05);
      addButton3D(pt[0], h, pt[2], 0.44, matButton);
    }

    // 4. Flowing Front & Back Panels (Tà trước & Tà sau) splitting at slitH
    const sd = sideDepthFns(c, e + 3.5);
    [1, -1].forEach(panelDir => {
      const tStart = panelDir > 0 ? -0.47 * Math.PI : 0.53 * Math.PI;
      const tEnd = panelDir > 0 ? 0.47 * Math.PI : 1.47 * Math.PI;

      const panelGeo = buildThickPanelGeo(28, 32, (i, j, v, thetaOrig) => {
        const h = lerp(slitH + 0.5, hemH, v);
        const slitGap = 1 - 0.14 * Math.sin(Math.min(1, v * 2.2) * Math.PI * 0.5);
        const centerAng = panelDir > 0 ? 0 : Math.PI;
        const localAng = (thetaOrig - centerAng) * slitGap;
        const theta = centerAng + localAng;
        const s = Math.sin(theta), cs = Math.cos(theta);

        // At top (v = 0), match upper tunic torsoSample(slitH, theta, 0.88) seamlessly
        const topPt = torsoSample(Math.max(lv.crotch, h), theta, 1.05);
        const rx = panelProf(h) + 1.25;
        const baseDepth = panelDir > 0 ? sd.F(Math.max(lv.hip, h)) : sd.Bk(Math.max(lv.hip, h));
        const billow = lerp(1.4, 4.0, Math.pow(v, 0.72));
        const wave = 0.65 * Math.sin(localAng * 7) * Math.pow(v, 0.9);
        const rz = baseDepth + billow + wave;

        const blend = smoothstep(0, 0.22, v);
        const x = lerp(topPt[0], rx * s, blend);
        const z = lerp(topPt[2], rz * cs, blend);
        const hemDip = -1.4 * Math.cos((localAng / (0.47 * Math.PI)) * Math.PI * 0.5) * v;
        return [x, h + hemDip, z, localAng * rx, h];
      }, 0.26, tStart, tEnd);
      garmentGroup.add(new THREE.Mesh(panelGeo, matFabTop));
    });

    // 5. 3D Sleeves
    addSleeves3D(c, e, g.sleeve, matFabTop, 0.62, 3.0);
  }

  /* ------------------------------------------------------ 3D COMBO (SHIRT + PANTS) */
  function buildCombo3D(c) {
    const g = c.g;
    buildPants3D(c, { len: g.pantsLen, hemC: g.hem, e: g.pantsEase, crease: true, mat: matFabBot });
    buildShirt3D(c, 1.12);
  }

  /* ------------------------------------------------------ SCENE UPDATE & ANIMATION */
  const VIEW_YAW = {
    front: 0,
    right: Math.PI / 2,
    back: Math.PI,
    left: -Math.PI / 2
  };

  function shortestAngleDist(a0, a1) {
    const max = Math.PI * 2;
    const da = (a1 - a0) % max;
    return ((2 * da) % max) - da;
  }

  function renderOnce() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
  }

  function tickAnimation() {
    animId = 0;
    if (autoSpin && !dragging) {
      curYaw += 0.014;
      targetYaw = curYaw;
      rootGroup.rotation.y = curYaw;
      renderOnce();
      animId = requestAnimationFrame(tickAnimation);
      return;
    }
    const diff = shortestAngleDist(curYaw, targetYaw);
    if (Math.abs(diff) > 0.002) {
      curYaw += diff * 0.22;
      rootGroup.rotation.y = curYaw;
      renderOnce();
      animId = requestAnimationFrame(tickAnimation);
    } else {
      curYaw = targetYaw;
      rootGroup.rotation.y = curYaw;
      renderOnce();
    }
  }

  function startAnimLoop() {
    if (!animId) animId = requestAnimationFrame(tickAnimation);
  }

  function updateScene3D(st, c, snapImmediate) {
    if (!renderer) init3D();
    if (!renderer) return;

    const accCol = st.accent[st.garment] || '#f4f1e8';
    matAccent.color.set(accCol);
    updateFabricTextures(st);

    buildMannequin3D(c);
    disposeGroup(garmentGroup);

    switch (st.garment) {
      case 'shirt': buildShirt3D(c); break;
      case 'pants': buildPants3D(c, { len: c.g.pantsLen, hemC: c.g.hem, e: c.g.ease, crease: true, mat: matFabTop }); break;
      case 'combo': buildCombo3D(c); break;
      case 'suit': buildSuit3D(c); break;
      case 'dress': buildDress3D(c); break;
      case 'aodai': buildAoDai3D(c); break;
    }

    const desiredYaw = VIEW_YAW[st.view] ?? 0;
    if (snapImmediate) {
      curYaw = targetYaw = desiredYaw;
      rootGroup.rotation.y = curYaw;
      renderOnce();
    } else if (!dragging && !autoSpin) {
      targetYaw = desiredYaw;
      startAnimLoop();
      renderOnce();
    } else {
      renderOnce();
    }
  }

  /* ------------------------------------------------------ 360° ORBIT DRAG & SPIN */
  function setupOrbitInteraction(center) {
    center.addEventListener('pointerdown', e => {
      const st = window.__tailor && window.__tailor.state;
      if (!st || st.tab === 'acc') return;
      if (e.target.closest('#viewBar') || e.target.closest('#badge') || e.target.closest('#noFabric')) return;
      dragging = true;
      autoSpin = false;
      const spinBtn = document.getElementById('spinBtn');
      if (spinBtn) spinBtn.classList.remove('on');
      dragStartX = e.clientX;
      dragStartYaw = curYaw;
      try { center.setPointerCapture(e.pointerId); } catch (err) { }
    });

    center.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      curYaw = targetYaw = dragStartYaw + dx * 0.011;
      rootGroup.rotation.y = curYaw;
      renderOnce();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      const st = window.__tailor && window.__tailor.state;
      if (!st) return;
      const norm = ((curYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let closest = 'front', minD = 99;
      Object.entries(VIEW_YAW).forEach(([k, ang]) => {
        const d = Math.abs(shortestAngleDist(norm, ang));
        if (d < minD) { minD = d; closest = k; }
      });
      if (st.view !== closest) {
        st.view = closest;
        document.querySelectorAll('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.view === closest));
      }
    };
    center.addEventListener('pointerup', endDrag);
    center.addEventListener('pointercancel', endDrag);
  }

  function setViewYaw(viewName, snap = false) {
    autoSpin = false;
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) spinBtn.classList.remove('on');
    targetYaw = VIEW_YAW[viewName] ?? 0;
    if (snap) {
      curYaw = targetYaw;
      if (rootGroup) rootGroup.rotation.y = curYaw;
      renderOnce();
    } else {
      startAnimLoop();
    }
  }

  function toggleSpin() {
    autoSpin = !autoSpin;
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) spinBtn.classList.toggle('on', autoSpin);
    if (autoSpin) startAnimLoop();
    return autoSpin;
  }

  window.Tailor3D = {
    update: updateScene3D,
    updateTextures: updateFabricTextures,
    setViewYaw,
    toggleSpin,
    renderOnce,
    getCanvas: () => canvasEl
  };
})();

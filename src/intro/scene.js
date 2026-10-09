// ═══════════════════════════════════════════════════════════════════
//  3D INTRO — "Dirty Cut" natpis pada na beton, makaze ga probadaju,
//  ekran se preseca po liniji makaza i otkriva sajt.
//
//  0.0–0.9 s  pad (gravitacija, rotacija se ispravlja)
//  0.9 s      udar: drmanje kamere, prašina, pukotine, odskok
//  0.9–1.9 s  mirovanje (~1 s)
//  1.9–2.3 s  makaze ulete iz gornjeg desnog ugla i zabodu se
//  2.3 s      mikro drmanje, varnice, akcentni odsjaj na sečivu
//  2.5–3.4 s  rez ekrana po dijagonali makaza, polovine se razdvajaju
// ═══════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import wordmarkSvg from './wordmark.svg?raw';
import colorUrl from './tex/concrete_color.jpg?url';
import normalUrl from './tex/concrete_normal.jpg?url';
import roughUrl from './tex/concrete_rough.jpg?url';
import { playThud, playShink } from './sound.js';

const ACCENT = new THREE.Color('#d4375a');
const T = { impact: 0.9, scissorsStart: 1.9, stab: 2.3, cut: 2.5, end: 3.4 };

export async function createIntroScene({ container, overlay, onStart, onDone }) {
  const mobile = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  const Q = mobile
    ? { dust: 260, sparks: 40, shadow: 1024, cracks: 16, tex: 1024 }
    : { dust: 760, sparks: 90, shadow: 2048, cracks: 26, tex: 2048 };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const params = new URLSearchParams(location.search);
  const debugAt = parseFloat(params.get('introAt'));
  const debugCut = parseFloat(params.get('introCut'));

  /* ── Renderer ─────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050505');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const camTarget = new THREE.Vector3(0, 0, 0.35);
  const camDir = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(57)), Math.cos(THREE.MathUtils.degToRad(57)));
  const camBase = new THREE.Vector3();
  const shake = { amp: 0, decay: 0, t0: 0 };

  /* ── Teksture betona ──────────────────────────────────────── */
  const loader = new THREE.TextureLoader();
  const [colorMap, normalMap, roughMap] = await Promise.all([colorUrl, normalUrl, roughUrl].map((u) => loader.loadAsync(u)));
  colorMap.colorSpace = THREE.SRGBColorSpace;
  for (const tx of [colorMap, normalMap, roughMap]) {
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(7, 7);
    tx.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({
      map: colorMap, normalMap, roughnessMap: roughMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      color: new THREE.Color('#8a8580'), roughness: 1, metalness: 0, envMapIntensity: 0.1,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ── Svetla: nisko, dramatično, sa jedne strane ───────────── */
  const key = new THREE.DirectionalLight('#fff2e2', 3.4);
  key.position.set(-7.5, 6.2, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(Q.shadow, Q.shadow);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 30 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 12;
  scene.add(key);
  scene.add(new THREE.HemisphereLight('#9aa3b0', '#050505', 0.22));
  const rim = new THREE.SpotLight('#dfe6ff', 55, 30, 0.55, 1, 1.6);
  rim.position.set(7, 4.5, -6);
  rim.target.position.set(0, 0, 0);
  scene.add(rim, rim.target);

  /* ── 3D natpis "Dirty Cut" (iz vektorizovanog logoa) ─────── */
  const svg = new SVGLoader().parse(wordmarkSvg);
  const shapes = svg.paths.flatMap((p) => p.toShapes(true));
  const DEPTH = 34, BEVEL = 3.2;
  const signGeo = new THREE.ExtrudeGeometry(shapes, {
    depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: 1.8, bevelSegments: 4, curveSegments: 12,
  });
  signGeo.computeBoundingBox();
  const bb = signGeo.boundingBox;
  signGeo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
  signGeo.rotateX(Math.PI / 2); // dubina ka -Y, SVG "dole" ka kameri (+Z)
  signGeo.translate(0, DEPTH + BEVEL, 0);
  const SIGN_W = 7.2;
  const s = SIGN_W / (bb.max.x - bb.min.x);
  signGeo.scale(s, s, s);
  signGeo.computeBoundingBox();
  const signBox = signGeo.boundingBox.clone();
  const signTop = signBox.max.y;

  const capMat = new THREE.MeshStandardMaterial({ color: '#ece8e1', metalness: 0.45, roughness: 0.34, envMapIntensity: 0.9 });
  const sideMat = new THREE.MeshStandardMaterial({ color: '#131315', metalness: 0.88, roughness: 0.28, envMapIntensity: 1.1 });
  const sign = new THREE.Mesh(signGeo, [capMat, sideMat]);
  sign.castShadow = true;
  sign.receiveShadow = true;
  const signGroup = new THREE.Group();
  signGroup.add(sign);
  scene.add(signGroup);

  /* ── Pukotine u betonu (canvas maska, rastu kroz shader) ─── */
  const CRACK_WORLD = 16;
  const crackTex = makeCrackTexture(Q.tex, CRACK_WORLD, signBox, Q.cracks);
  const crackMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { map: { value: crackTex }, progress: { value: 0 }, scuff: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float progress; uniform float scuff; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(map, vUv);
        float grown = step(c.r, progress) * c.a;
        float front = smoothstep(progress - 0.08, progress, c.r) * grown;      // svetliji vrh pukotine dok raste
        vec2 p = (vUv - 0.5) * vec2(1.0, 2.6);
        float dark = scuff * smoothstep(0.42, 0.0, length(p)) * 0.16;           // tamni trag udara
        float a = max(grown * (0.92 - c.g * 0.35), dark);
        vec3 col = mix(vec3(0.0), vec3(0.32), front * 0.6);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const cracks = new THREE.Mesh(new THREE.PlaneGeometry(CRACK_WORLD, CRACK_WORLD), crackMat);
  cracks.rotation.x = -Math.PI / 2;
  cracks.position.y = 0.004;
  cracks.renderOrder = 1;
  scene.add(cracks);

  /* ── Prašina ──────────────────────────────────────────────── */
  const dust = makeDust(Q.dust, signBox);
  scene.add(dust.points);

  /* ── Makaze (proceduralne) ───────────────────────────────── */
  const sc = makeScissors();
  sc.group.visible = false;
  sc.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(sc.group);

  // Tačka uboda: pogodi stvarni potez slova (raycast odozgo)
  signGroup.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const stabPoint = new THREE.Vector3(0.9, signTop, 0);
  for (const [x, z] of [[0.95, 0.05], [1.2, 0], [0.7, -0.2], [1.5, 0.1], [0.4, 0.1], [-0.6, 0], [1.8, -0.3]]) {
    ray.set(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(sign, false)[0];
    if (hit && hit.point.y > signTop - 0.05) { stabPoint.copy(hit.point); break; }
  }
  const STAB_DEPTH = 0.32;

  /* ── Varnice ──────────────────────────────────────────────── */
  const sparks = makeSparks(Q.sparks, stabPoint);
  scene.add(sparks.points);

  /* ── Kamera: kadriranje prema širini ekrana ───────────────── */
  const fit = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 50 : 35;
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const dW = (SIGN_W * (camera.aspect < 1 ? 0.58 : 0.66)) / Math.tan(hHalf);
    const dH = 3.2 / Math.tan(vHalf);
    const d = Math.max(dW, dH, 9);
    camBase.copy(camTarget).addScaledVector(camDir, d);
    camera.position.copy(camBase);
    camera.lookAt(camTarget);
    camera.updateProjectionMatrix();
    scene.fog = new THREE.Fog('#050505', d * 1.05, d * 2.4);
    dust.material.uniforms.uScale.value = h * dpr * 0.5;
    sparks.material.uniforms.uScale.value = h * dpr * 0.5;
  };
  fit();
  window.addEventListener('resize', fit);

  // Putanja makaza: iz gornjeg desnog ugla ekrana ka tački uboda
  const scStart = new THREE.Vector3();
  const scDir = new THREE.Vector3();
  const computeScissorsPath = () => {
    const ndc = new THREE.Vector3(1.25, 1.2, 0.5).unproject(camera);
    const rd = ndc.sub(camera.position).normalize();
    scStart.copy(camera.position).addScaledVector(rd, camera.position.distanceTo(camTarget) * 0.62);
    scDir.copy(stabPoint).sub(scStart).normalize();
  };
  computeScissorsPath();
  const orientScissors = (roll) => {
    // široka strana sečiva okrenuta ka kameri
    const x = scDir.clone();
    const toCam = camera.position.clone().sub(stabPoint).normalize();
    const z = toCam.sub(x.clone().multiplyScalar(toCam.dot(x)));
    if (z.lengthSq() < 1e-4) z.set(0, 0, 1);
    z.normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    const m = new THREE.Matrix4().makeBasis(x, y, z);
    sc.group.quaternion.setFromRotationMatrix(m);
    sc.group.rotateX(roll);
  };

  /* ── Stanje animacije ─────────────────────────────────────── */
  const st = { fallY: 3.4, rx: 0.42, ry: 0.28, rz: -0.22, crack: 0, scP: 0, open: 0.42, roll: 1.4, glint: 0 };
  const startShake = (amp, ms) => { shake.amp = amp; shake.decay = ms / 1000; shake.t0 = tl.time(); };

  const tl = gsap.timeline({ paused: true });
  tl.to(st, { fallY: 0, duration: T.impact, ease: 'power2.in' }, 0)
    .to(st, { rx: 0, ry: 0, rz: 0, duration: T.impact * 0.92, ease: 'power1.out' }, 0)
    .call(() => { startShake(0.22, 240); playThud(); }, null, T.impact)
    .to(st, { fallY: 0.12, duration: 0.1, ease: 'power2.out' }, T.impact)
    .to(st, { fallY: 0, duration: 0.16, ease: 'power2.in' }, T.impact + 0.1)
    .to(st, { fallY: 0.025, duration: 0.06, ease: 'power1.out' }, T.impact + 0.26)
    .to(st, { fallY: 0, duration: 0.07, ease: 'power1.in' }, T.impact + 0.32)
    .to(st, { crack: 1, duration: 0.32, ease: 'power2.out' }, T.impact)
    .to(crackMat.uniforms.scuff, { value: 1, duration: 0.25 }, T.impact)
    .call(() => { sc.group.visible = true; }, null, T.scissorsStart)
    .to(st, { scP: 1, duration: T.stab - T.scissorsStart, ease: 'power3.in' }, T.scissorsStart)
    .to(st, { roll: 0, duration: T.stab - T.scissorsStart, ease: 'power2.out' }, T.scissorsStart)
    .to(st, { open: 0.0, duration: 0.14, ease: 'power2.in' }, T.stab - 0.14)
    .call(() => { startShake(0.06, 120); playShink(); }, null, T.stab)
    .to(st, { glint: 1, duration: 0.32, ease: 'power1.inOut' }, T.stab)
    .call(() => startCut(), null, T.cut);

  /* ── Render petlja ────────────────────────────────────────── */
  const tmp = new THREE.Vector3();
  const update = () => {
    const time = tl.time();
    signGroup.position.y = st.fallY;
    signGroup.rotation.set(st.rx, st.ry, st.rz);
    crackMat.uniforms.progress.value = st.crack;
    dust.material.uniforms.uTime.value = time - T.impact;
    sparks.material.uniforms.uTime.value = time - T.stab;

    sc.setOpen(st.open);
    sc.setGlint(st.glint);
    // vrh makaza (lokalno +X * TIP) prati pravu od početka do tačke uboda
    const tipEnd = stabPoint.clone().addScaledVector(scDir, STAB_DEPTH);
    const tipPos = scStart.clone().lerp(tipEnd, st.scP);
    orientScissors(st.roll);
    sc.group.position.copy(tipPos).addScaledVector(scDir, -sc.TIP);

    camera.position.copy(camBase);
    const since = time - shake.t0;
    if (shake.amp > 0 && since < shake.decay) {
      const k = shake.amp * Math.pow(1 - since / shake.decay, 2);
      tmp.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5)).multiplyScalar(k);
      camera.position.add(tmp);
    }
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  };

  let rendering = true;
  const tick = () => { if (rendering) update(); };

  /* ── Rez ekrana ───────────────────────────────────────────── */
  let cutEl = null;
  function startCut() {
    update();
    const W = window.innerWidth, H = window.innerHeight;
    const src = renderer.domElement;
    // Linija reza u ekranskim koordinatama: kroz tačku uboda, u pravcu leta makaza
    const P = project(stabPoint, camera, W, H);
    const A = project(scStart, camera, W, H);
    let dx = P.x - A.x, dy = P.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const n = { x: -dy, y: dx };
    const [e1, e2] = lineRectIntersections(P, { x: dx, y: dy }, W, H);

    cutEl = document.createElement('div');
    cutEl.className = 'intro-cut';
    cutEl.setAttribute('aria-hidden', 'true');
    const halves = [1, -1].map((side) => {
      const half = document.createElement('div');
      half.className = 'intro-cut__half';
      const c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      const g2 = c.getContext('2d');
      g2.drawImage(src, 0, 0);
      // ista vinjeta kao preko 3D scene (CSS), da prelaz bude neprimetan
      const r = Math.hypot(c.width, c.height) / 2;
      const vg = g2.createRadialGradient(c.width / 2, c.height * 0.55, r * 0.35, c.width / 2, c.height * 0.55, r);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.75)');
      g2.fillStyle = vg;
      g2.fillRect(0, 0, c.width, c.height);
      half.appendChild(c);
      const poly = clipRect(W, H, P, n, side);
      half.style.clipPath = `polygon(${poly.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(',')})`;
      cutEl.appendChild(half);
      return { half, side };
    });
    const glint = document.createElement('div');
    glint.className = 'intro-cut__glint';
    const gl = Math.hypot(e2.x - e1.x, e2.y - e1.y);
    glint.style.width = `${gl}px`;
    glint.style.transform = `translate(${e1.x}px, ${e1.y - 1}px) rotate(${Math.atan2(e2.y - e1.y, e2.x - e1.x)}rad) scaleX(0)`;
    glint.dataset.base = `translate(${e1.x}px, ${e1.y - 1}px) rotate(${Math.atan2(e2.y - e1.y, e2.x - e1.x)}rad)`;
    cutEl.appendChild(glint);
    document.body.appendChild(cutEl);

    // 3D scena više nije potrebna — sajt je već iscrtan ispod
    rendering = false;
    overlay.style.visibility = 'hidden';
    document.documentElement.dataset.intro = 'cutting';
    document.dispatchEvent(new CustomEvent('intro:reveal'));

    const diag = Math.hypot(W, H);
    const ctl = gsap.timeline({ onComplete: () => onDone('done') });
    ctl.to(glint, { duration: 0.16, ease: 'power2.out', onUpdate() { glint.style.transform = `${glint.dataset.base} scaleX(${this.progress()})`; } }, 0);
    halves.forEach(({ half, side }) => {
      ctl.to(half, {
        x: n.x * side * diag * 0.62 + dx * side * 40,
        y: n.y * side * diag * 0.62 + dy * side * 40,
        rotation: side * 2.5,
        duration: T.end - T.cut - 0.16,
        ease: 'power3.in',
      }, 0.14);
    });
    ctl.to(glint, { opacity: 0, duration: 0.3 }, 0.45);
    if (!Number.isNaN(debugCut)) ctl.progress(debugCut).pause(); // samo za snimke ekrana
  }

  /* ── API ──────────────────────────────────────────────────── */
  let disposed = false;
  return {
    play() {
      if (!Number.isNaN(debugAt)) {
        // Debug/screenshot: zamrzni određeni trenutak (?intro=force&introAt=1.2)
        tl.seek(Math.min(debugAt, T.cut - 0.01), false).pause();
        gsap.ticker.add(tick);
        return;
      }
      // Animacija prati stvarno vreme i na sporim uređajima (preskače kadrove, ne usporava)
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.add(tick);
      tl.play(0);
      onStart?.(T.end);
    },
    skip() {
      tl.pause();
      gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => onDone('skipped') });
      if (cutEl) gsap.to(cutEl, { opacity: 0, duration: 0.3 });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      rendering = false;
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      tl.kill();
      window.removeEventListener('resize', fit);
      cutEl?.remove();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => {
          Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
          if (m.uniforms) Object.values(m.uniforms).forEach((u) => { if (u.value && u.value.isTexture) u.value.dispose(); });
          m.dispose();
        });
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

/* ═════════════════════════ pomoćne funkcije ═════════════════════════ */

function project(v, camera, W, H) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H };
}

/** Polovina pravougaonika [0,W]x[0,H] sa jedne strane prave (P, normala n). */
function clipRect(W, H, P, n, side) {
  const pts = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const f = (p) => side * ((p.x - P.x) * n.x + (p.y - P.y) * n.y);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) {
      const tt = fa / (fa - fb);
      out.push({ x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt });
    }
  }
  // malo preklapanje da ne ostane svetla pukotina između polovina
  return out;
}

function lineRectIntersections(P, d, W, H) {
  const ts = [];
  if (Math.abs(d.x) > 1e-6) { ts.push((0 - P.x) / d.x, (W - P.x) / d.x); }
  if (Math.abs(d.y) > 1e-6) { ts.push((0 - P.y) / d.y, (H - P.y) / d.y); }
  const pts = ts.map((t) => ({ x: P.x + d.x * t, y: P.y + d.y * t, t }))
    .filter((p) => p.x >= -1 && p.x <= W + 1 && p.y >= -1 && p.y <= H + 1)
    .sort((a, b) => a.t - b.t);
  return [pts[0] || { x: 0, y: 0 }, pts[pts.length - 1] || { x: W, y: H }];
}

/**
 * Mreža pukotina: R = vreme rasta (0..1, od mesta udara ka spolja),
 * G = tanjina (rubovi blede), A = maska.
 */
function makeCrackTexture(size, world, box, count) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  const px = (x) => (x / world + 0.5) * size;
  const rnd = mulberry32(39);
  const maxLen = world * 0.34;
  const unit = size / world;

  // Pukotine u betonu su izlomljene: duži pravi segmenti sa naglim skretanjima
  const grow = (x, z, ang, len, width, dist, depth) => {
    let cx = x, cz = z, travelled = dist, left = len;
    const base = ang;
    while (left > 0) {
      const seg = 0.12 + rnd() * 0.3;
      ang = base + (rnd() - 0.5) * 1.1 + (ang - base) * 0.35;
      const nx = cx + Math.cos(ang) * seg, nz = cz + Math.sin(ang) * seg;
      travelled += seg; left -= seg;
      const k = Math.max(0, left / len);
      const w = Math.max(0.55, width * (0.25 + 0.75 * k));
      const tval = Math.min(1, travelled / maxLen);
      ctx.strokeStyle = `rgba(${Math.round(tval * 255)}, ${Math.round((1 - k) * 255)}, 0, 1)`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(px(cx), px(cz));
      ctx.lineTo(px(nx), px(nz));
      ctx.stroke();
      cx = nx; cz = nz;
      if (depth < 2 && rnd() < 0.14) grow(cx, cz, ang + (rnd() < 0.5 ? -1 : 1) * (0.45 + rnd() * 0.7), left * (0.3 + rnd() * 0.4), w * 0.65, travelled, depth + 1);
    }
  };

  // Polazne tačke ispod natpisa; pukotine zrače ka spolja
  const hw = (box.max.x - box.min.x) / 2, hd = (box.max.z - box.min.z) / 2;
  for (let i = 0; i < count; i++) {
    const x = (rnd() * 2 - 1) * hw * 0.85;
    const z = (rnd() * 2 - 1) * hd * 0.3;
    const up = rnd() < 0.5 ? -1 : 1;
    const ang = Math.atan2(up * (0.6 + rnd()), (x / hw) * 0.9 + (rnd() - 0.5) * 0.6);
    grow(x, z, ang, maxLen * (0.35 + rnd() * 0.65), ((1.0 + rnd() * 1.4) * unit) / 48, 0, 0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeDust(count, box) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const misc = new Float32Array(count * 3); // life, size, seed
  const rnd = mulberry32(7);
  const hw = (box.max.x - box.min.x) / 2, hd = (box.max.z - box.min.z) / 2;
  for (let i = 0; i < count; i++) {
    const side = rnd();
    let x, z, nx, nz;
    if (side < 0.35) { x = (rnd() * 2 - 1) * hw; z = hd; nx = (rnd() - 0.5) * 0.6; nz = 1; }
    else if (side < 0.7) { x = (rnd() * 2 - 1) * hw; z = -hd; nx = (rnd() - 0.5) * 0.6; nz = -1; }
    else if (side < 0.85) { x = hw; z = (rnd() * 2 - 1) * hd; nx = 1; nz = (rnd() - 0.5) * 0.8; }
    else { x = -hw; z = (rnd() * 2 - 1) * hd; nx = -1; nz = (rnd() - 0.5) * 0.8; }
    // malo nasumičnosti da se ne vidi oblik pravougaonika
    x += (rnd() - 0.5) * 0.5; z += (rnd() - 0.5) * 0.4;
    pos.set([x, 0.04 + rnd() * 0.12, z], i * 3);
    const sp = 1.2 + Math.pow(rnd(), 1.6) * 4.5;
    const ang = Math.atan2(nz, nx) + (rnd() - 0.5) * 1.2;
    vel.set([Math.cos(ang) * sp, 0.15 + rnd() * 0.7, Math.sin(ang) * sp], i * 3);
    misc.set([1.0 + rnd() * 1.4, 25 + rnd() * 60, rnd()], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  geo.setAttribute('aMisc', new THREE.BufferAttribute(misc, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: -1 }, uScale: { value: 400 }, uColor: { value: new THREE.Color('#b9b2a9') } },
    vertexShader: /* glsl */`
      attribute vec3 aVel; attribute vec3 aMisc;
      uniform float uTime; uniform float uScale;
      varying float vA;
      void main(){
        float t = max(uTime, 0.0);
        float k = 2.4;
        vec3 p = position + vec3(aVel.x, 0.0, aVel.z) * (1.0 - exp(-k * t)) / k;
        p.y += aVel.y * (1.0 - exp(-1.8 * t)) / 1.8 - 0.06 * t * t * aMisc.z;
        p.y = max(p.y, 0.02);
        float life = aMisc.x;
        vA = step(0.0, uTime) * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(life * 0.35, life, t));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aMisc.y * 0.014 * (1.0 + t * 1.4) * uScale / -mv.z, 160.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, a * a * vA * 0.38);
      }`,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return { points, material };
}

function makeSparks(count, origin) {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const misc = new Float32Array(count * 2);
  const rnd = mulberry32(11);
  for (let i = 0; i < count; i++) {
    pos.set([origin.x, origin.y + 0.02, origin.z], i * 3);
    const a = rnd() * Math.PI * 2, up = 0.4 + rnd() * 0.9, sp = 1.5 + rnd() * 3.5;
    vel.set([Math.cos(a) * sp, up * sp, Math.sin(a) * sp], i * 3);
    misc.set([0.25 + rnd() * 0.35, rnd()], i * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  geo.setAttribute('aMisc', new THREE.BufferAttribute(misc, 2));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: -1 }, uScale: { value: 400 }, uAccent: { value: ACCENT.clone() } },
    vertexShader: /* glsl */`
      attribute vec3 aVel; attribute vec2 aMisc;
      uniform float uTime; uniform float uScale;
      varying float vA; varying float vMix;
      void main(){
        float t = max(uTime, 0.0);
        vec3 p = position + aVel * t + vec3(0.0, -9.8 * 0.5 * t * t, 0.0);
        p.y = max(p.y, 0.01);
        vA = step(0.0, uTime) * (1.0 - smoothstep(0.0, aMisc.x, t));
        vMix = aMisc.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.08 + 0.06 * aMisc.y) * uScale / -mv.z;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uAccent; varying float vA; varying float vMix;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d);
        vec3 c = mix(vec3(1.0, 0.86, 0.6), uAccent, vMix * 0.7);
        gl_FragColor = vec4(c * 2.0, a * vA);
      }`,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return { points, material };
}

/**
 * Proceduralne makaze od poliranog čelika. Lokalni sistem: vrh sečiva ka +X,
 * osovina u (0,0,0), drške ka -X. Ravan makaza je XY.
 */
function makeScissors() {
  const steel = new THREE.MeshStandardMaterial({ color: '#a9afb7', metalness: 1, roughness: 0.14, envMapIntensity: 1.6 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#2b2d31', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
  const TIP = 2.15;

  const blade = (sign) => {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-0.3, 0.13 * sign);
    s.quadraticCurveTo(0.9, 0.2 * sign, TIP, 0.0);
    s.quadraticCurveTo(1.0, -0.035 * sign, -0.3, -0.05 * sign);
    s.lineTo(-0.3, 0.13 * sign);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 });
    geo.translate(0, 0, -0.0175);
    g.add(new THREE.Mesh(geo, steel));

    // vrat ka prstenu
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.04 * sign, 0),
      new THREE.Vector3(-0.7, 0.16 * sign, 0),
      new THREE.Vector3(-1.05, 0.34 * sign, 0),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.05, 10, false), steel));
    // prsten za prste
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.055, 14, 40), steel);
    ring.position.set(-1.3, 0.47 * sign, 0);
    ring.scale.set(1.15, 0.9, 1);
    g.add(ring);
    return g;
  };

  const group = new THREE.Group();
  const a = blade(1);
  const b = blade(-1);
  a.position.z = 0.03;
  b.position.z = -0.03;
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 20), darkSteel);
  screw.rotation.x = Math.PI / 2;

  // akcentni odsjaj duž sečiva
  const glintMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSweep: { value: 0 }, uColor: { value: ACCENT.clone() } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uSweep; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float on = step(0.001, uSweep) * (1.0 - smoothstep(0.85, 1.0, uSweep));
        float peak = exp(-pow((vUv.x - uSweep) * 7.0, 2.0));
        vec3 c = mix(uColor, vec3(1.0), peak * 0.7);
        gl_FragColor = vec4(c * (0.6 + peak * 2.0), on * (0.35 + peak));
      }`,
  });
  const glint = new THREE.Mesh(new THREE.BoxGeometry(TIP + 0.25, 0.016, 0.05), glintMat);
  glint.position.set((TIP - 0.3) / 2, 0.0, 0.0);

  group.add(a, b, screw, glint);
  return {
    group,
    TIP,
    setOpen(angle) {
      a.rotation.z = angle / 2;
      b.rotation.z = -angle / 2;
      glint.rotation.z = angle / 2;
    },
    setGlint(v) { glintMat.uniforms.uSweep.value = v; },
  };
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

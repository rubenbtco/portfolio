/* ==========================================================
   Intro 3D pilotée par le scroll (Three.js)
   Des particules passent d'une forme à l'autre au fil du scroll :
   sphère → </> → réseau → maison connectée → "PROJETS",
   puis explosent et disparaissent pour laisser place aux projets.
   ========================================================== */
(function () {
    const section = document.getElementById('intro');
    const canvas = document.getElementById('intro-canvas');
    if (!section || !canvas) return;

    const captions = [...section.querySelectorAll('.intro-caption')];
    const dots = [...section.querySelectorAll('.intro-progress button')];
    const sticky = section.querySelector('.intro-sticky');
    const STAGES = captions.length;           // 5 étapes
    const MORPH_END = 0.86;                   // après : explosion + disparition

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof THREE === 'undefined') {
        section.classList.add('intro-static');
        captions[0].style.opacity = 1;
        return;
    }

    /* ---------- Rendu ---------- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 13);

    const isMobile = window.innerWidth < 768;
    const N = isMobile ? 2600 : 5200;

    /* ---------- Générateurs de formes (N points chacun) ---------- */
    function sphere() {
        const a = new Float32Array(N * 3), golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < N; i++) {
            const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i, R = 3.3;
            a[i * 3] = Math.cos(th) * r * R; a[i * 3 + 1] = y * R; a[i * 3 + 2] = Math.sin(th) * r * R;
        }
        return a;
    }

    function text(str, width) {
        const c = document.createElement('canvas'), W = 1200, H = 300;
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 220px "Space Grotesk", Arial, sans-serif';
        const scale = Math.min(1, (W - 40) / ctx.measureText(str).width);
        ctx.font = `700 ${220 * scale}px "Space Grotesk", Arial, sans-serif`;
        ctx.fillText(str, W / 2, H / 2);
        const textW = ctx.measureText(str).width;
        const data = ctx.getImageData(0, 0, W, H).data, pts = [];
        for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
        const a = new Float32Array(N * 3), k = width / textW;
        for (let i = 0; i < N; i++) {
            const p = pts[Math.floor(Math.random() * pts.length)];
            a[i * 3] = (p[0] - W / 2) * k + (Math.random() - 0.5) * 0.04;
            a[i * 3 + 1] = -(p[1] - H / 2) * k + (Math.random() - 0.5) * 0.04;
            a[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        }
        return a;
    }

    // Répartit N points le long d'une liste de segments [[x1,y1,z1],[x2,y2,z2]]
    function alongSegments(segs, jitter) {
        const lens = segs.map(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
        const total = lens.reduce((s, l) => s + l, 0), a = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            let r = Math.random() * total, j = 0;
            while (r > lens[j] && j < segs.length - 1) r -= lens[j++];
            const [p, q] = segs[j], t = Math.random();
            for (let d = 0; d < 3; d++) a[i * 3 + d] = p[d] + (q[d] - p[d]) * t + (Math.random() - 0.5) * jitter;
        }
        return a;
    }

    function network() {
        const nodes = [];
        for (let i = 0; i < 26; i++) {
            const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1), r = 1.6 + Math.random() * 2.2;
            nodes.push([Math.sin(v) * Math.cos(u) * r * 1.3, Math.cos(v) * r * 0.9, Math.sin(v) * Math.sin(u) * r]);
        }
        const segs = [];
        nodes.forEach((n, i) => {
            nodes.map((m, j) => [j, Math.hypot(n[0] - m[0], n[1] - m[1], n[2] - m[2])])
                .filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 3)
                .forEach(([j]) => segs.push([n, nodes[j]]));
            // petite "boule" sur chaque nœud
            for (let k = 0; k < 6; k++) segs.push([n, n.map(c => c + (Math.random() - 0.5) * 0.35)]);
        });
        return alongSegments(segs, 0.05);
    }

    function house() {
        const x = 2.4, yb = -2.2, yt = 0.6, z = 1.6, yr = 2.5;
        const P = (a, b, c) => [a, b, c];
        const segs = [
            // murs
            [P(-x, yb, z), P(x, yb, z)], [P(-x, yt, z), P(x, yt, z)], [P(-x, yb, -z), P(x, yb, -z)], [P(-x, yt, -z), P(x, yt, -z)],
            [P(-x, yb, z), P(-x, yt, z)], [P(x, yb, z), P(x, yt, z)], [P(-x, yb, -z), P(-x, yt, -z)], [P(x, yb, -z), P(x, yt, -z)],
            [P(-x, yb, z), P(-x, yb, -z)], [P(x, yb, z), P(x, yb, -z)], [P(-x, yt, z), P(-x, yt, -z)], [P(x, yt, z), P(x, yt, -z)],
            // toit
            [P(-x - .3, yt, z), P(0, yr, z)], [P(x + .3, yt, z), P(0, yr, z)], [P(-x - .3, yt, -z), P(0, yr, -z)], [P(x + .3, yt, -z), P(0, yr, -z)],
            [P(0, yr, z), P(0, yr, -z)],
            // porte
            [P(-.5, yb, z), P(-.5, -.8, z)], [P(.5, yb, z), P(.5, -.8, z)], [P(-.5, -.8, z), P(.5, -.8, z)],
            // fenêtres
            [P(-1.9, -.9, z), P(-1.1, -.9, z)], [P(-1.9, -.1, z), P(-1.1, -.1, z)], [P(-1.9, -.9, z), P(-1.9, -.1, z)], [P(-1.1, -.9, z), P(-1.1, -.1, z)],
            [P(1.1, -.9, z), P(1.9, -.9, z)], [P(1.1, -.1, z), P(1.9, -.1, z)], [P(1.1, -.9, z), P(1.1, -.1, z)], [P(1.9, -.9, z), P(1.9, -.1, z)]
        ];
        // ondes Wi-Fi au-dessus du toit
        [0.5, 0.95, 1.4].forEach(r => {
            for (let k = 0; k < 10; k++) {
                const a1 = Math.PI * (0.25 + 0.05 * k), a2 = Math.PI * (0.25 + 0.05 * (k + 1));
                segs.push([P(Math.cos(a1) * r, yr + 0.35 + Math.sin(a1) * r, 0), P(Math.cos(a2) * r, yr + 0.35 + Math.sin(a2) * r, 0)]);
            }
        });
        return alongSegments(segs, 0.06);
    }

    const shapes = [sphere(), text('</>', isMobile ? 5 : 6.5), network(), house(), text('PROJETS', isMobile ? 7.5 : 10)];

    /* ---------- Particules ---------- */
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N), dir = new Float32Array(N * 3);
    const palette = [0x4f46e5, 0x06b6d4, 0xec4899, 0x6366f1, 0x1e293b].map(c => new THREE.Color(c));
    for (let i = 0; i < N; i++) {
        const c = palette[i % 5 === 4 && Math.random() > .5 ? 4 : i % 4 === 3 ? 0 : i % 4];
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        seed[i] = Math.random() * Math.PI * 2;
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
        dir[i * 3] = Math.sin(v) * Math.cos(u); dir[i * 3 + 1] = Math.cos(v); dir[i * 3 + 2] = Math.sin(v) * Math.sin(u);
    }
    pos.set(shapes[0]);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    // Sprite rond et doux pour les particules
    const dot = document.createElement('canvas'); dot.width = dot.height = 64;
    const dctx = dot.getContext('2d'), grd = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    dctx.fillStyle = grd; dctx.fillRect(0, 0, 64, 64);

    const mat = new THREE.PointsMaterial({
        size: isMobile ? 0.11 : 0.09, map: new THREE.CanvasTexture(dot), vertexColors: true,
        transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    const group = new THREE.Group();
    group.add(points);
    scene.add(group);

    /* ---------- Taille / placement ---------- */
    let wide = true;
    function resize() {
        const w = sticky.clientWidth, h = sticky.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        wide = w >= 992;
        group.position.set(wide ? 3.2 : 0, wide ? 0 : 2.4, 0);
        group.scale.setScalar(wide ? 1 : Math.min(0.7, w / 620));
    }
    window.addEventListener('resize', resize);
    resize();

    /* ---------- Souris ---------- */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', e => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });

    /* ---------- Progression du scroll ---------- */
    function progress() {
        const r = section.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        return Math.min(Math.max(-r.top / total, 0), 1);
    }
    const smooth = t => t * t * (3 - 2 * t);

    // Clic sur un point de l'indicateur → saute à l'étape
    dots.forEach((b, k) => b.addEventListener('click', () => {
        const total = section.offsetHeight - window.innerHeight;
        window.scrollTo({ top: section.offsetTop + (k / (STAGES - 1)) * MORPH_END * total, behavior: 'smooth' });
    }));

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);

    let shown = 0;   // progression lissée
    const clock = new THREE.Clock();
    function frame() {
        requestAnimationFrame(frame);
        if (!visible) return;
        const time = clock.getElapsedTime();
        shown += (progress() - shown) * 0.12;
        const p = shown;

        // Étape courante et morphing
        const P = Math.min(p / MORPH_END, 1) * (STAGES - 1);
        const k = Math.min(Math.floor(P), STAGES - 2);
        const t = P - k;
        const e = smooth(Math.min(Math.max((t - 0.3) / 0.4, 0), 1));
        const A = shapes[k], B = shapes[k + 1];

        // Explosion finale
        const q = p > MORPH_END ? (p - MORPH_END) / (1 - MORPH_END) : 0;
        const qe = q * q;

        for (let i = 0; i < N; i++) {
            const s = seed[i], w = 0.04 + qe * 0.3;
            for (let d = 0; d < 3; d++) {
                const j = i * 3 + d;
                pos[j] = A[j] + (B[j] - A[j]) * e + Math.sin(time * 1.2 + s + d) * w + dir[j] * qe * 9;
            }
        }
        geo.attributes.position.needsUpdate = true;

        // Mouvement de la caméra / du groupe
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;
        const spin = (k === 0 || k === 2) ? (1 - e) : (k === 1 || k === 3) ? e : 0;
        group.rotation.y = mouse.x * 0.35 + Math.sin(time * 0.4) * 0.12 + spin * Math.sin(time * 0.25) * 0.5;
        group.rotation.x = mouse.y * 0.2;
        camera.position.z = 13 - q * 3;

        mat.opacity = 0.95 * (1 - q);
        sticky.style.opacity = String(1 - smooth(Math.min(q * 1.2, 1)));

        // Textes : chaque légende est visible autour de son étape
        captions.forEach((c, i) => {
            let o = 1 - Math.min(Math.abs(P - i) / 0.35, 1);
            if (i === STAGES - 1 && P >= STAGES - 1) o = 1 - q * 1.5;
            o = Math.max(o, 0);
            c.style.opacity = o.toFixed(3);
            const shift = (P - i) * -40;
            c.style.transform = wide ? `translateY(calc(-50% + ${shift}px))` : `translateY(${shift}px)`;
            c.classList.toggle('is-active', o > 0.5);
        });
        const active = Math.round(P);
        dots.forEach((b, i) => b.classList.toggle('active', i === active));

        renderer.render(scene, camera);
    }
    // Attend la police pour dessiner les textes en particules
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
        shapes[1] = text('</>', isMobile ? 5 : 6.5);
        shapes[4] = text('PROJETS', isMobile ? 7.5 : 10);
    });
    frame();
})();

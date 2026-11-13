/* ==========================================================
   Intro 3D pilotée par le scroll (Three.js)
   Des particules passent d'une forme à l'autre au fil du scroll :
   sphère armillaire → </> → réseau → tourne-disque → vinyle dans sa pochette,
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

    // Sphère armillaire dorée : cercles célestes qui tournent autour de l'axe des pôles
    // (incliné à 44,5°, la latitude de Gap), méridien, horizon et pied fixes
    const armCol = new Float32Array(N * 3), armBase = new Float32Array(N * 3), armSpin = new Uint8Array(N);
    const LAT = 44.5 * Math.PI / 180, TILT = -(Math.PI / 2 - LAT), armAxis = [-Math.sin(TILT), Math.cos(TILT), 0];

    function armillary() {
        const R = 2.5, RM = 2.95, EPS = 23.44 * Math.PI / 180;
        const gold = new THREE.Color(0xd4a017), bright = new THREE.Color(0xf5b301), pale = new THREE.Color(0xffd54f),
              bronze = new THREE.Color(0xb8860b), dark = new THREE.Color(0x7a5200);
        const rz = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
        const rx = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
        const circle = (r, y, th) => [Math.cos(th) * r, y, Math.sin(th) * r];
        const jit = s => (Math.random() - 0.5) * s;
        for (let i = 0; i < N; i++) {
            const u = Math.random(), th = Math.random() * Math.PI * 2;
            let p, c = gold, spin = 1;
            if (u < 0.1) {
                // équateur (double filet)
                p = circle(R + (Math.random() < 0.5 ? 0 : 0.1), jit(0.02), th);
            } else if (u < 0.18) {
                // tropiques
                const s = Math.random() < 0.5 ? 1 : -1;
                p = circle(R * Math.cos(EPS), s * R * Math.sin(EPS), th);
            } else if (u < 0.24) {
                // cercles polaires
                const s = Math.random() < 0.5 ? 1 : -1;
                p = circle(R * Math.sin(EPS), s * R * Math.cos(EPS), th);
                c = bronze;
            } else if (u < 0.32) {
                // colures, passant par les pôles
                p = Math.random() < 0.5 ? [Math.cos(th) * R, Math.sin(th) * R, jit(0.02)] : [jit(0.02), Math.sin(th) * R, Math.cos(th) * R];
                c = bronze;
            } else if (u < 0.48) {
                // bande du zodiaque inclinée, graduée en 12 secteurs
                let q;
                if (Math.random() < 0.25) {
                    const t = Math.round(th * 6 / Math.PI) * Math.PI / 6;
                    q = circle(R + 0.02, (Math.random() - 0.5) * 0.36, t); c = dark;
                } else {
                    q = circle(R + 0.02, (Math.random() < 0.5 ? 0.18 : -0.18) + jit(0.02), th); c = bright;
                }
                p = rx(q, EPS);
            } else if (u < 0.56) {
                // globe central
                const d = 0.55 * Math.cbrt(Math.random()), v = Math.acos(2 * Math.random() - 1);
                p = [Math.sin(v) * Math.cos(th) * d, Math.cos(v) * d, Math.sin(v) * Math.sin(th) * d];
                c = d < 0.35 ? pale : bright;
            } else if (u < 0.59) {
                // axe des pôles
                p = [jit(0.04), (Math.random() * 2 - 1) * RM * 1.12, jit(0.04)];
                c = dark;
            } else if (u < 0.74) {
                // méridien fixe, gradué tous les 10°
                spin = 0;
                if (Math.random() < 0.3) {
                    const t = Math.round(th * 18 / Math.PI) * Math.PI / 18, r = RM + Math.random() * 0.22;
                    p = [Math.cos(t) * r, Math.sin(t) * r, 0]; c = dark;
                } else {
                    p = [Math.cos(th) * (RM + (Math.random() < 0.5 ? 0 : 0.22)), Math.sin(th) * (RM + (Math.random() < 0.5 ? 0 : 0.22)), jit(0.03)];
                    c = gold;
                }
                p = rz(p, 0);
            } else if (u < 0.9) {
                // horizon fixe : large anneau gradué
                spin = 0;
                if (Math.random() < 0.3) {
                    const t = Math.round(th * 18 / Math.PI) * Math.PI / 18;
                    p = circle(RM + 0.1 + Math.random() * 0.35, 0, t); c = dark;
                } else {
                    p = circle(Math.random() < 0.5 ? RM + 0.1 : RM + 0.45, jit(0.02), th); c = bronze;
                }
            } else {
                // pied et socle
                spin = 0;
                if (Math.random() < 0.45) { p = [jit(0.08), -RM - Math.random() * 1.1, jit(0.08)]; c = bronze; }
                else { const r = Math.random() < 0.5 ? 1.2 : 0.8; p = circle(r, -RM - 1.1 + jit(0.03), th); c = gold; }
            }
            if (spin) p = rz(p, TILT);
            armBase[i * 3] = p[0]; armBase[i * 3 + 1] = p[1] + 0.45; armBase[i * 3 + 2] = p[2];
            armSpin[i] = spin;
            armCol[i * 3] = c.r; armCol[i * 3 + 1] = c.g; armCol[i * 3 + 2] = c.b;
        }
        return armBase.slice();
    }

    /* ---------- Style mid-century : tourne-disque et vinyle ---------- */
    // Sur l'ambiance « canard » (fond bleu canard), le bleu canard des formes passe en bleu-vert clair
    const canard = document.documentElement.dataset.ambiance === 'canard';
    const MC = {
        teal: new THREE.Color(canard ? 0x9fd8cf : 0x2a9d8f), mustard: new THREE.Color(0xe0a526), orange: new THREE.Color(canard ? 0xf08a5d : 0xd1603d),
        walnut: new THREE.Color(canard ? 0x1d3f3c : 0x6b4226), ink: new THREE.Color(canard ? 0x16302e : 0x2b2118),
        sheen: new THREE.Color(canard ? 0x4f7f7a : 0x6e5d4e), mint: new THREE.Color(canard ? 0xd8efe9 : 0x5fb3a8)
    };
    const turnCol = new Float32Array(N * 3), vinylCol = new Float32Array(N * 3);

    // Tire un point au hasard sur une liste de segments (proportionnellement à leur longueur)
    function segPicker(segs, jitter) {
        const lens = segs.map(([p, q]) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
        const total = lens.reduce((s, l) => s + l, 0);
        return () => {
            let r = Math.random() * total, j = 0;
            while (r > lens[j] && j < segs.length - 1) r -= lens[j++];
            const [p, q] = segs[j], t = Math.random();
            return [0, 1, 2].map(d => p[d] + (q[d] - p[d]) * t + (Math.random() - 0.5) * jitter);
        };
    }
    const arc = (cx, cy, r, z, a0, a1, n = 24) => {
        const s = [];
        for (let k = 0; k < n; k++) {
            const t0 = a0 + (a1 - a0) * k / n, t1 = a0 + (a1 - a0) * (k + 1) / n;
            s.push([[cx + Math.cos(t0) * r, cy + Math.sin(t0) * r, z], [cx + Math.cos(t1) * r, cy + Math.sin(t1) * r, z]]);
        }
        return s;
    };
    const rect = (x0, y0, x1, y1, z) => [[[x0, y0, z], [x1, y0, z]], [[x1, y0, z], [x1, y1, z]], [[x1, y1, z], [x0, y1, z]], [[x0, y1, z], [x0, y0, z]]];

    // Points remplissant un texte, centrés en (cx, cy) et de largeur donnée
    function glyphs(str, width, cx, cy, weight = 700) {
        const c = document.createElement('canvas'), W = 1200, H = 300;
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${weight} 200px "Space Grotesk", Arial, sans-serif`;
        const tw = ctx.measureText(str).width;
        ctx.fillText(str, W / 2, H / 2);
        const data = ctx.getImageData(0, 0, W, H).data, pts = [], k = width / tw;
        for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) pts.push([cx + (x - W / 2) * k, cy - (y - H / 2) * k]);
        return pts;
    }

    // Applique une liste de "pièces" (part du total, générateur, couleur) puis une rotation de vue
    function build(parts, out, colOut, ry, rx, dy) {
        const total = parts.reduce((s, p) => s + p[0], 0);
        for (let i = 0; i < N; i++) {
            let r = Math.random() * total, j = 0;
            while (r > parts[j][0] && j < parts.length - 1) r -= parts[j++][0];
            let [x, y, z] = parts[j][1]();
            const c = typeof parts[j][2] === 'function' ? parts[j][2]() : parts[j][2];
            [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
            [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
            out[i * 3] = x; out[i * 3 + 1] = y + dy; out[i * 3 + 2] = z;
            colOut[i * 3] = c.r; colOut[i * 3 + 1] = c.g; colOut[i * 3 + 2] = c.b;
        }
        return out;
    }

    // Tourne-disque : le disque et son étiquette tournent sur le plateau
    const turnLocal = new Float32Array(N * 3), turnSpin = new Uint8Array(N), turnPos = new Float32Array(N * 3);
    const TT = { cx: -0.7, cz: 0, ry: -0.3, rx: 0.8, dy: 0, k: 0.82 };

    function turntable() {
        const X = 3.0, Z = 2.15, H = 0.55, jit = s => (Math.random() - 0.5) * s;
        const rectXZ = (x0, z0, x1, z1, y) => [[[x0, y, z0], [x1, y, z0]], [[x1, y, z0], [x1, y, z1]], [[x1, y, z1], [x0, y, z1]], [[x0, y, z1], [x0, y, z0]]];
        const ring = (cx, cz, r, y0, y1) => () => { const t = Math.random() * Math.PI * 2; return [cx + Math.cos(t) * r, y0 + (y1 - y0) * Math.random(), cz + Math.sin(t) * r]; };
        const disk = (cx, cz, r, y) => () => { const d = r * Math.sqrt(Math.random()), t = Math.random() * Math.PI * 2; return [cx + Math.cos(t) * d, y, cz + Math.sin(t) * d]; };
        // socle en noyer : arêtes, filet doré sur le dessus, lattes en façade, pieds
        const plinth = [...rectXZ(-X, -Z, X, Z, 0), ...rectXZ(-X, -Z, X, Z, -H),
            ...[[-X, -Z], [X, -Z], [X, Z], [-X, Z]].map(([x, z]) => [[x, 0, z], [x, -H, z]])];
        const trim = rectXZ(-X + 0.15, -Z + 0.15, X - 0.15, Z - 0.15, 0);
        const front = [-0.18, -0.37].map(y => [[-X, y, Z], [X, y, Z]]);
        const foot = () => { const fx = Math.random() < 0.5 ? -(X - 0.45) : X - 0.45, fz = Math.random() < 0.5 ? -(Z - 0.45) : Z - 0.45; return ring(fx, fz, 0.18, -H - 0.3, -H)(); };
        // plateau, disque à sillons, étiquette bicolore (pour voir la rotation), axe central
        const { cx, cz } = TT;
        const groove = () => { const r = 0.62 + Math.floor(Math.random() * 18) * 0.062 + jit(0.015), t = Math.random() * Math.PI * 2; return [cx + Math.cos(t) * r, 0.2, cz + Math.sin(t) * r]; };
        let labelTurn = false;
        const label = () => { const r = 0.55 * Math.sqrt(Math.random()), t = Math.random() * Math.PI * 2; labelTurn = t < 1.2; return [cx + Math.cos(t) * r, 0.21, cz + Math.sin(t) * r]; };
        // bras de lecture : pivot, contrepoids, bras coudé, cellule posée sur le disque, repose-bras
        const P = [2.05, 0.5, -1.25];
        const arm = [[P, [1.55, 0.5, 0.75]], [[1.55, 0.5, 0.75], [0.55, 0.3, 1.05]]];
        const weight = () => { const t = Math.random(), u = Math.random() * Math.PI * 2; return [P[0] + 0.3 * t + Math.cos(u) * 0.13, P[1] + Math.sin(u) * 0.13, P[2] - 0.6 * t - 0.05]; };
        const head = () => [0.55 + jit(0.22), 0.3 + jit(0.06), 1.05 + jit(0.14)];
        // boutons de volume et de vitesse
        const knob = () => disk(Math.random() < 0.5 ? 2.2 : 1.55, 1.55, 0.2, 0.03)();
        const speeds = [...rectXZ(-2.6, 1.5, -2.2, 1.8, 0.02), ...rectXZ(-2.05, 1.5, -1.65, 1.8, 0.02)];
        const parts = [
            [11, segPicker(plinth, 0.03), MC.walnut, 0], [6, segPicker(trim, 0.03), MC.mustard, 0], [4, segPicker(front, 0.04), MC.walnut, 0],
            [4, foot, MC.walnut, 0],
            [7, ring(cx, cz, 1.85, 0.02, 0.18), MC.sheen, 0], [4, ring(cx, cz, 1.85, 0.18, 0.18), MC.mint, 0],
            [26, groove, () => Math.random() < 0.8 ? MC.ink : MC.sheen, 1], [7, label, () => labelTurn ? MC.mustard : MC.orange, 1],
            [1, () => [cx + jit(0.04), 0.2 + Math.random() * 0.25, cz + jit(0.04)], MC.sheen, 0],
            [2, disk(P[0], P[2], 0.35, 0.02), MC.mustard, 0], [1, () => [P[0] + jit(0.06), Math.random() * 0.5, P[2] + jit(0.06)], MC.sheen, 0],
            [3, weight, MC.teal, 0], [6, segPicker(arm, 0.03), MC.mint, 0], [2, head, MC.orange, 0],
            [1, () => [2.45 + jit(0.05), Math.random() * 0.45, 0.55 + jit(0.05)], MC.sheen, 0],
            [3, knob, MC.teal, 0], [3, segPicker(speeds, 0.02), MC.mustard, 0]
        ];
        const total = parts.reduce((s, p) => s + p[0], 0);
        for (let i = 0; i < N; i++) {
            let r = Math.random() * total, j = 0;
            while (r > parts[j][0] && j < parts.length - 1) r -= parts[j++][0];
            const p = parts[j][1](), c = typeof parts[j][2] === 'function' ? parts[j][2]() : parts[j][2];
            turnLocal.set(p, i * 3);
            turnSpin[i] = parts[j][3];
            turnCol[i * 3] = c.r; turnCol[i * 3 + 1] = c.g; turnCol[i * 3 + 2] = c.b;
        }
        return turntableView(0);
    }

    // Fait tourner le disque d'un angle donné puis applique l'angle de vue
    function turntableView(ang) {
        const c = Math.cos(ang), s = Math.sin(ang), cy = Math.cos(TT.ry), sy = Math.sin(TT.ry), cx = Math.cos(TT.rx), sx = Math.sin(TT.rx);
        for (let i = 0; i < N; i++) {
            const j = i * 3;
            let x = turnLocal[j], y = turnLocal[j + 1], z = turnLocal[j + 2];
            if (turnSpin[i]) {
                const dx = x - TT.cx, dz = z - TT.cz;
                x = TT.cx + dx * c - dz * s; z = TT.cz + dx * s + dz * c;
            }
            [x, z] = [x * cy + z * sy, -x * sy + z * cy];
            [y, z] = [y * cx - z * sx, y * sx + z * cx];
            turnPos[j] = x * TT.k; turnPos[j + 1] = y * TT.k + TT.dy; turnPos[j + 2] = z * TT.k;
        }
        return turnPos;
    }

    function vinyl() {
        const x0 = -3.1, x1 = 1.3, S = 2.2, zs = 0.12, R = 2.05, a = new Float32Array(N * 3);
        // pochette : contour, bandes de couleur et étoile rayonnante
        const sleeve = rect(x0, -S, x1, S, zs);
        const band = y => [[[x0 + 0.15, y, zs], [x1 - 0.15, y, zs]]];
        const star = [];
        for (let k = 0; k < 12; k++) {
            const t = k * Math.PI / 6, l = k % 2 ? 0.25 : 0.5;
            star.push([[-2.4 + Math.cos(t) * 0.08, 1.5 + Math.sin(t) * 0.08, zs], [-2.4 + Math.cos(t) * l, 1.5 + Math.sin(t) * l, zs]]);
        }
        // texte de la pochette
        const big = glyphs('PROJET', 3.4, (x0 + x1) / 2, 0.45), small = glyphs('by Ruben', 2.7, (x0 + x1) / 2, -0.6, 700);
        const pick = pts => () => { const p = pts[Math.floor(Math.random() * pts.length)]; return [p[0] + (Math.random() - 0.5) * 0.02, p[1] + (Math.random() - 0.5) * 0.02, zs + 0.02]; };
        // disque qui dépasse de la pochette : sillons, étiquette, trou central
        const groove = () => {
            let r, t, x;
            do { r = 0.75 + Math.floor(Math.random() * 20) * 0.065 + (Math.random() - 0.5) * 0.015; t = Math.random() * Math.PI * 2; x = x1 + Math.cos(t) * r; } while (x < x1 + 0.05);
            return [x, Math.sin(t) * r, 0];
        };
        const label = () => {
            let r, t, x;
            do { r = 0.1 + 0.55 * Math.sqrt(Math.random()); t = Math.random() * Math.PI * 2; x = x1 + Math.cos(t) * r; } while (x < x1 + 0.05);
            return [x, Math.sin(t) * r, 0.01];
        };
        const rim = () => { let t; do { t = Math.random() * Math.PI * 2; } while (Math.cos(t) < 0.03); return [x1 + Math.cos(t) * R, Math.sin(t) * R, 0]; };
        if (!big.length) return a;
        return build([
            [12, segPicker(sleeve, 0.04), MC.walnut],
            [3, segPicker(band(-1.5), 0.05), MC.orange], [3, segPicker(band(-1.68), 0.05), MC.mustard], [3, segPicker(band(-1.86), 0.05), MC.teal],
            [5, segPicker(star, 0.03), MC.mustard],
            [18, pick(big), MC.teal], [14, pick(small), MC.orange],
            [27, groove, () => Math.random() < 0.8 ? MC.ink : MC.sheen], [4, rim, MC.ink], [9, label, MC.orange]
        ], a, vinylCol, -0.25, 0.1, 0);
    }

    const shapes = [armillary(), text('</>', isMobile ? 5 : 6.5), network(), turntable(), vinyl()];

    /* ---------- Particules ---------- */
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N), dir = new Float32Array(N * 3);
    const palettes = {
        midcentury: canard ? [0xf08a5d, 0x9fd8cf, 0xe5a832, 0xf6ecd9, 0x1d3f3c] : [0xc4552f, 0x2a8a7e, 0xc98f12, 0x7d8b4f, 0x6b4226],
        vintage: [0x8c2f39, 0x3f6c63, 0xb07d1e, 0x6b4e71, 0x2b2118],
        classique: [0x4f46e5, 0x06b6d4, 0xec4899, 0x6366f1, 0x1e293b]
    };
    const palette = (palettes[document.documentElement.dataset.palette] || palettes.classique).map(c => new THREE.Color(c));
    for (let i = 0; i < N; i++) {
        const c = palette[i % 5 === 4 && Math.random() > .5 ? 4 : i % 4 === 3 ? 0 : i % 4];
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        seed[i] = Math.random() * Math.PI * 2;
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
        dir[i * 3] = Math.sin(v) * Math.cos(u); dir[i * 3 + 1] = Math.cos(v); dir[i * 3 + 2] = Math.sin(v) * Math.sin(u);
    }
    const base = col.slice();
    // Couleurs propres à certaines formes (null = palette du site)
    const looks = [armCol, null, null, turnCol, vinylCol];
    col.set(looks[0]);
    let lastLook = '';
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

        // Les cercles célestes de la sphère armillaire tournent autour de l'axe des pôles
        if (k === 0) {
            const c = Math.cos(time * 0.4), s = Math.sin(time * 0.4), [nx, ny, nz] = armAxis;
            const vc = Math.cos(0.22), vs = Math.sin(0.22);
            for (let i = 0; i < N; i++) {
                const j = i * 3, x = armBase[j], y = armBase[j + 1] - 0.45, z = armBase[j + 2];
                let px = x, py = y, pz = z;
                if (armSpin[i]) {
                    const dot = (nx * x + ny * y + nz * z) * (1 - c);
                    px = x * c + (ny * z - nz * y) * s + nx * dot;
                    py = y * c + (nz * x - nx * z) * s + ny * dot;
                    pz = z * c + (nx * y - ny * x) * s + nz * dot;
                }
                // vue légèrement plongeante pour voir l'anneau de l'horizon
                A[j] = px; A[j + 1] = py * vc - pz * vs + 0.45; A[j + 2] = py * vs + pz * vc;
            }
        }

        // Le disque tourne sur la platine
        if (k === 2 || k === 3) turntableView(-time * 2);

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

        // Fondu des couleurs entre deux formes
        const cA = looks[k] || base, cB = looks[k + 1] || base;
        const look = cA === base && cB === base ? 'plain' : k + ':' + e.toFixed(3);
        if (look !== lastLook) {
            for (let j = 0; j < N * 3; j++) col[j] = cA[j] + (cB[j] - cA[j]) * e;
            geo.attributes.color.needsUpdate = true;
            lastLook = look;
        }

        // Mouvement de la caméra / du groupe
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;
        const spin = k === 0 ? (1 - e) * 0.3 : k === 2 ? (1 - e) : (k === 1 || k === 3) ? e : 0;
        group.rotation.y = mouse.x * 0.35 + Math.sin(time * 0.9) * 0.12 + spin * Math.sin(time * 0.6) * 0.5;
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
    // Attend la police pour dessiner le texte en particules
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
        shapes[1] = text('</>', isMobile ? 5 : 6.5);
        shapes[4] = vinyl();
        lastLook = '';
    });
    frame();
})();

/* ==========================================================
   Scène 3D de l'accueil (Three.js)
   Un cristal filaire, un noyau lumineux, des anneaux en orbite
   et un champ de particules qui réagissent à la souris.
   ========================================================== */
(function () {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero = canvas.parentElement;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060f, 0.045);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    const VIOLET = new THREE.Color(0x7c5cff);
    const CYAN = new THREE.Color(0x22d3ee);
    const PINK = new THREE.Color(0xff4fd8);

    // Groupe principal (placé à droite sur grand écran, au centre sur mobile)
    const core = new THREE.Group();
    scene.add(core);

    // Cristal filaire extérieur
    const outerGeo = new THREE.IcosahedronGeometry(3.4, 1);
    const outer = new THREE.LineSegments(
        new THREE.WireframeGeometry(outerGeo),
        new THREE.LineBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.55 })
    );
    core.add(outer);

    // Sommets du cristal en points lumineux
    const vertices = new THREE.Points(
        outerGeo,
        new THREE.PointsMaterial({ color: CYAN, size: 0.12, transparent: true, opacity: 0.95 })
    );
    outer.add(vertices);

    // Noyau intérieur
    const inner = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.6, 0),
        new THREE.MeshStandardMaterial({
            color: 0x1a1440, emissive: VIOLET, emissiveIntensity: 0.35,
            metalness: 0.9, roughness: 0.2, flatShading: true
        })
    );
    core.add(inner);

    const innerWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.62, 0)),
        new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.9 })
    );
    inner.add(innerWire);

    // Anneaux en orbite
    function ring(radius, color, tiltX, tiltY) {
        const m = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.015, 8, 180),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
        );
        m.rotation.set(tiltX, tiltY, 0);
        core.add(m);
        return m;
    }
    const ring1 = ring(4.6, CYAN, 1.2, 0.3);
    const ring2 = ring(5.2, PINK, -0.9, 0.8);

    // Petites lunes sur les anneaux
    function moon(color) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color }));
        core.add(s);
        return s;
    }
    const moon1 = moon(CYAN);
    const moon2 = moon(PINK);

    // Champ de particules
    const COUNT = window.innerWidth < 768 ? 900 : 2200;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const palette = [VIOLET, CYAN, PINK];
    for (let i = 0; i < COUNT; i++) {
        const r = 8 + Math.random() * 22;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
        positions[i * 3 + 2] = r * Math.cos(phi) - 6;
        const c = palette[i % 3];
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({
        size: 0.06, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false
    }));
    scene.add(stars);

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const l1 = new THREE.PointLight(CYAN, 2.2, 30); l1.position.set(5, 4, 6); scene.add(l1);
    const l2 = new THREE.PointLight(PINK, 1.8, 30); l2.position.set(-6, -3, 4); scene.add(l2);

    // Taille / placement
    function resize() {
        const w = hero.clientWidth, h = hero.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const wide = w >= 992;
        core.position.set(wide ? 3.2 : 0, wide ? 0 : -2.5, wide ? 0 : -9);
        core.scale.setScalar(wide ? 1.15 : 0.9);
        outer.material.opacity = wide ? 0.55 : 0.3;
    }
    window.addEventListener('resize', resize);
    resize();

    // Souris
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', (e) => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // Pause quand l'accueil n'est plus visible
    let visible = true;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);

    const clock = new THREE.Clock();
    function frame() {
        requestAnimationFrame(frame);
        if (!visible) return;
        const t = clock.getElapsedTime();
        const speed = reduceMotion ? 0 : 1;

        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        outer.rotation.y = t * 0.12 * speed;
        outer.rotation.x = t * 0.06 * speed;
        inner.rotation.y = -t * 0.35 * speed;
        inner.rotation.z = t * 0.2 * speed;
        inner.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04 * speed);
        ring1.rotation.z = t * 0.25 * speed;
        ring2.rotation.z = -t * 0.18 * speed;

        // Lunes qui suivent les anneaux
        const a1 = t * 0.9 * speed, a2 = -t * 0.6 * speed + 2;
        moon1.position.set(Math.cos(a1) * 4.6, Math.sin(a1) * 4.6, 0).applyEuler(ring1.rotation);
        moon2.position.set(Math.cos(a2) * 5.2, Math.sin(a2) * 5.2, 0).applyEuler(ring2.rotation);

        core.rotation.y = mouse.x * 0.5;
        core.rotation.x = mouse.y * 0.35;
        stars.rotation.y = t * 0.015 * speed + mouse.x * 0.1;
        stars.rotation.x = mouse.y * 0.06;

        // Léger recul de la caméra au scroll
        const s = Math.min(window.scrollY / window.innerHeight, 1);
        camera.position.z = 12 + s * 6;
        camera.position.y = -s * 2;

        renderer.render(scene, camera);
    }
    frame();
})();

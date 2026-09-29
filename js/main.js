/* ==========================================================
   Interactions du portfolio
   ========================================================== */

// Active les animations d'apparition (le contenu reste visible si le JS ne tourne pas)
document.documentElement.classList.add('js');

// Téléchargement d'un compte-rendu (appelé par les boutons des projets)
function downloadReport(fileName) {
    const link = document.createElement('a');
    link.href = fileName;
    link.download = fileName.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;

    /* ---------- Défilement doux avec décalage pour la barre de navigation ---------- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id.length < 2) return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            window.scrollTo({ top: id === '#intro' ? 0 : target.offsetTop - 80, behavior: 'smooth' });
            const menu = document.getElementById('navbarNav');
            if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
        });
    });

    /* ---------- CV ---------- */
    document.getElementById('downloadCV').addEventListener('click', function (e) {
        e.preventDefault();
        const link = document.createElement('a');
        link.href = 'documents/cv/CV Ruben Battocchio 2024.pdf';
        link.download = 'CV_Ruben_Battocchio.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    /* ---------- Barre de navigation + progression du scroll ---------- */
    const nav = document.getElementById('mainNav');
    const progress = document.querySelector('.scroll-progress');
    const navLinks = document.querySelectorAll('.navbar .nav-link[href^="#"]');
    const sections = [...navLinks].map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

    function onScroll() {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 40);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

        let current = sections[0];
        sections.forEach(s => { if (y + 140 >= s.offsetTop) current = s; });
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current.id && !l.classList.contains('nav-cta')));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Effet d'inclinaison 3D sur les cartes ---------- */
    document.querySelectorAll('.project-card, .veille-method-card').forEach(el => el.setAttribute('data-tilt', ''));

    if (canHover && !reduceMotion) {
        document.querySelectorAll('[data-tilt]').forEach(el => {
            const max = parseFloat(el.dataset.tiltMax || 12);
            const glare = document.createElement('div');
            glare.className = 'tilt-glare';
            el.appendChild(glare);

            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                el.style.transition = 'transform .12s ease-out, box-shadow .5s, border-color .4s';
                el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) scale3d(1.02, 1.02, 1.02)`;
                el.style.setProperty('--gx', px * 100 + '%');
                el.style.setProperty('--gy', py * 100 + '%');
            });
            el.addEventListener('pointerleave', () => {
                el.style.transition = '';
                el.style.transform = '';
            });
        });
    }

    /* ---------- Apparition au scroll ---------- */
    const revealObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            revealObs.unobserve(entry.target);
        });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el, i) => {
        el.style.transitionDelay = (i % 6) * 70 + 'ms';
        revealObs.observe(el);
    });

    /* ---------- Anneaux de compétences ---------- */
    const CIRC = 2 * Math.PI * 52;
    const skillObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const level = parseFloat(entry.target.dataset.level) || 0;
            entry.target.querySelector('.ring-fg').style.strokeDashoffset = CIRC * (1 - level / 100);
            skillObs.unobserve(entry.target);
        });
    }, { threshold: 0.4 });
    document.querySelectorAll('.skill-card').forEach(el => skillObs.observe(el));

    /* ---------- Compteurs (calculés automatiquement) ---------- */
    const veilleRows = [...document.querySelectorAll('.veille-item')];
    const totals = {
        projects: document.querySelectorAll('.project-card').length,
        veille: veilleRows.length
    };
    document.querySelectorAll('[data-count]').forEach(el => { el.textContent = totals[el.dataset.count] || 0; });

    /* ---------- Veille : recherche, filtres et "Afficher plus" ---------- */
    const PAGE = 10;
    let limit = PAGE, filter = 'all', query = '';
    const search = document.getElementById('veilleSearch');
    const moreBtn = document.getElementById('veilleMore');
    const countEl = document.getElementById('veilleCount');
    const normalize = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    veilleRows.forEach(r => { r.dataset.text = normalize(r.textContent); });

    const months = [...document.querySelectorAll('.vt-month')];
    const emptyEl = document.getElementById('veilleEmpty');
    const filterBtns = [...document.querySelectorAll('#veilleFilters button')];
    const THEMES = { protocoles: 'Protocoles', ha: 'Home Assistant', energie: 'Énergie', securite: 'Sécurité', ia: 'IA', materiel: 'Matériel' };

    // Chiffres clés
    const sources = new Set(veilleRows.map(r => r.querySelector('.vt-source').textContent.trim()));
    const stats = { total: veilleRows.length, months: months.length, sources: sources.size };
    document.querySelectorAll('[data-vstat]').forEach(el => { el.textContent = stats[el.dataset.vstat]; });

    // Nombre d'articles par filtre, affiché dans les boutons
    const countFor = f => veilleRows.filter(r => f === 'all' || r.dataset.cat.split(' ').includes(f)).length;
    filterBtns.forEach(b => b.insertAdjacentHTML('beforeend', ` <b>${countFor(b.dataset.filter)}</b>`));

    // Barre de répartition (thème principal de chaque article)
    const bar = document.getElementById('veilleBar'), legend = document.getElementById('veilleLegend');
    Object.keys(THEMES).forEach(t => {
        const n = veilleRows.filter(r => r.dataset.theme === t).length;
        if (!n) return;
        bar.insertAdjacentHTML('beforeend', `<span data-theme="${t}" data-w="${(n / veilleRows.length * 100).toFixed(2)}" title="${THEMES[t]} : ${n}"></span>`);
        legend.insertAdjacentHTML('beforeend', `<button type="button" data-theme="${t}" data-filter="${t}">${THEMES[t]} <b>${n}</b></button>`);
    });
    new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        bar.querySelectorAll('span').forEach(s => { s.style.width = s.dataset.w + '%'; });
        obs.disconnect();
    }).observe(bar);

    function setFilter(f) {
        filter = f;
        limit = PAGE;
        filterBtns.forEach(x => x.classList.toggle('active', x.dataset.filter === f));
        legend.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.filter === f));
        renderVeille();
    }
    filterBtns.forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
    legend.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        setFilter(filter === b.dataset.filter ? 'all' : b.dataset.filter);
        document.getElementById('veilleTimeline').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Apparition des cartes
    const cardObs = new IntersectionObserver(entries => entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('visible');
        cardObs.unobserve(en.target);
    }), { threshold: 0.1 });

    function renderVeille() {
        const matches = veilleRows.filter(r =>
            (filter === 'all' || r.dataset.cat.split(' ').includes(filter)) &&
            (!query || r.dataset.text.includes(query)));
        const visible = new Set(matches.slice(0, limit));

        // Alternance gauche / droite seulement entre les cartes visibles
        let side = 0;
        veilleRows.forEach(r => {
            const show = visible.has(r);
            r.classList.toggle('is-hidden', !show);
            if (!show) return;
            if (!r.classList.contains('is-featured')) r.classList.toggle('is-right', side++ % 2 === 1);
            cardObs.observe(r);
        });
        // Masque les mois qui n'ont plus d'article visible
        months.forEach(m => {
            let el = m.nextElementSibling, any = false;
            while (el && !el.classList.contains('vt-month')) { if (visible.has(el)) any = true; el = el.nextElementSibling; }
            m.classList.toggle('is-hidden', !any);
        });
        // La première carte d'un mois ne remonte pas sur l'étiquette du mois
        let afterMonth = false;
        [...document.getElementById('veilleTimeline').children].forEach(el => {
            if (el.classList.contains('vt-month')) { if (!el.classList.contains('is-hidden')) afterMonth = true; return; }
            if (!visible.has(el)) return;
            el.classList.toggle('no-shift', afterMonth);
            afterMonth = false;
        });

        const shown = visible.size;
        emptyEl.classList.toggle('show', shown === 0);
        countEl.textContent = shown ? `${shown} article${shown > 1 ? 's' : ''} affiché${shown > 1 ? 's' : ''} sur ${matches.length}` : '';
        moreBtn.style.display = matches.length > limit ? '' : 'none';
    }
    search.addEventListener('input', () => { query = normalize(search.value.trim()); limit = PAGE; renderVeille(); });
    moreBtn.addEventListener('click', () => { limit += PAGE; renderVeille(); });
    renderVeille();
});

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
    const veilleRows = [...document.querySelectorAll('.table-veille tbody tr')];
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

    function renderVeille() {
        const matches = veilleRows.filter(r =>
            (filter === 'all' || (r.dataset.cat || '').split(' ').includes(filter)) &&
            (!query || r.dataset.text.includes(query)));
        veilleRows.forEach(r => r.classList.add('is-hidden'));
        matches.slice(0, limit).forEach(r => r.classList.remove('is-hidden'));
        const shown = Math.min(limit, matches.length);
        countEl.textContent = `${shown} article${shown > 1 ? 's' : ''} affiché${shown > 1 ? 's' : ''} sur ${matches.length}`;
        moreBtn.style.display = matches.length > limit ? '' : 'none';
    }
    document.querySelectorAll('#veilleFilters button').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('#veilleFilters button').forEach(x => x.classList.toggle('active', x === b));
        filter = b.dataset.filter;
        limit = PAGE;
        renderVeille();
    }));
    search.addEventListener('input', () => { query = normalize(search.value.trim()); limit = PAGE; renderVeille(); });
    moreBtn.addEventListener('click', () => { limit += PAGE; renderVeille(); });
    renderVeille();
});

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
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
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
            const base = getComputedStyle(el).transform;
            const baseTransform = base && base !== 'none' ? base + ' ' : '';
            const glare = document.createElement('div');
            glare.className = 'tilt-glare';
            el.appendChild(glare);

            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                el.style.transition = 'transform .12s ease-out, box-shadow .5s, border-color .4s';
                el.style.transform = `${baseTransform}perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) scale3d(1.02, 1.02, 1.02)`;
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
    }, { threshold: 0.15 });
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

    /* ---------- Compteurs de l'accueil (calculés automatiquement) ---------- */
    const totals = {
        projects: document.querySelectorAll('.project-card').length,
        veille: document.querySelectorAll('.table-veille tbody tr').length
    };
    document.querySelectorAll('[data-count]').forEach(el => {
        const end = totals[el.dataset.count] || 0;
        if (reduceMotion) { el.textContent = end; return; }
        const start = performance.now();
        (function tick(now) {
            const p = Math.min((now - start) / 1600, 1);
            el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
        })(start);
    });

    /* ---------- Éditeur de code animé ---------- */
    const codeContent = `
<span class="syntax-comment">// Initialisation du profil étudiant</span><br>
<span class="syntax-keyword">const</span> <span class="syntax-variable">Ruben</span> <span class="text-white">=</span> {<br>
&nbsp;&nbsp;<span class="syntax-variable">role</span>: <span class="syntax-string">"Étudiant en BTS SIO au lycée Dominique Villars"</span>,<br>
&nbsp;&nbsp;<span class="syntax-variable">localisation</span>: <span class="syntax-string">"Gap, France"</span>,<br>
&nbsp;&nbsp;<span class="syntax-variable">passion</span>: [<span class="syntax-string">"Basketball"</span>, <span class="syntax-string">"Jeu Vidéo"</span>, <span class="syntax-string">"Cinéma"</span>],<br>
<br>
&nbsp;&nbsp;<span class="syntax-comment">// Compétences principales</span><br>
&nbsp;&nbsp;<span class="syntax-variable">stackTechnique</span>: {<br>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="syntax-variable">front</span>: [<span class="syntax-string">"HTML/CSS"</span>, <span class="syntax-string">"JS"</span>, <span class="syntax-string">"Bootstrap"</span>],<br>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="syntax-variable">back</span>: [<span class="syntax-string">"Python"</span>, <span class="syntax-string">"Java"</span>, <span class="syntax-string">"SQL"</span>],<br>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="syntax-variable">tools</span>: [<span class="syntax-string">"Git"</span>, <span class="syntax-string">"VS Code"</span>]<br>
&nbsp;&nbsp;},<br>
<br>
&nbsp;&nbsp;<span class="syntax-comment">// Fonction d'initialisation</span><br>
&nbsp;&nbsp;<span class="syntax-function">startMission</span>: <span class="syntax-keyword">function</span>() {<br>
&nbsp;&nbsp;&nbsp;&nbsp;console.<span class="syntax-function">log</span>(<span class="syntax-string">"Prêt à transformer des idées en réalité."</span>);<br>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="syntax-keyword">return</span> <span class="syntax-keyword">true</span>;<br>
&nbsp;&nbsp;}<br>
};<br>
<br>
<span class="syntax-comment">// Lancement...</span><br>
<span class="syntax-variable">Ruben</span>.<span class="syntax-function">startMission</span>();
`;

    if (typeof TypeIt !== 'undefined' && !reduceMotion) {
        new TypeIt('#typing-code', {
            strings: codeContent,
            speed: 22,
            lifeLike: true,
            html: true,
            cursorChar: '▋'
        }).go();
    } else {
        document.getElementById('typing-code').innerHTML = codeContent;
    }
});

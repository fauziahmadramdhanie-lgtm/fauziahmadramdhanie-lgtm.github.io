import content from './content.json';
import 'lenis/dist/lenis.css';
import './styles.css';
import { initAnimations } from './animations.js';
import { initMenu } from './menu.js';
import { initCollage } from './collage.js';

const { person, hero, ui } = content;

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Content still marked TODO renders as a neutral, searchable placeholder (see CLAUDE.md).
const isTodo = (v) => v == null || /TODO/i.test(String(v));
const ph = (v, fallback) => {
  if (!isTodo(v)) return esc(v);
  const before = v == null ? '' : String(v).split(/TODO/i)[0].trim();
  return `${before ? esc(before) + ' ' : ''}<span class="ph">${esc(fallback)}</span>`;
};
const isUrl = (v) => /^https?:\/\//.test(v ?? '');
const since = new Date(`${person.current_role.since}-01`).toLocaleDateString(content.meta.language, {
  month: 'short',
  year: 'numeric',
});

const header = () => `
  <a class="skip" href="#main">${esc(ui.skip)}</a>
  <header class="site-header" data-header>
    <a class="logo" href="#top" aria-label="${esc(ui.home)}">${esc(person.nickname)}</a>
    <nav class="site-nav" aria-label="${esc(ui.primary)}">
      ${ui.nav.map((n) => `<a href="#${esc(n.target)}">${esc(n.label)}</a>`).join('')}
    </nav>
    <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu">
      <span class="menu-toggle__label">${esc(ui.menu)}</span>
      <span class="menu-toggle__label" aria-hidden="true">${esc(ui.close)}</span>
    </button>
  </header>
  <nav class="menu" id="menu" data-menu aria-label="${esc(ui.menu)}" inert>
    <ul>
      ${ui.nav.map((n) => `<li><a href="#${esc(n.target)}" data-menu-link>${esc(n.label)}</a></li>`).join('')}
    </ul>
  </nav>`;

const clock = () =>
  new Intl.DateTimeFormat(content.meta.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: hero.timezone,
    timeZoneName: 'short',
  }).format(new Date());

// Stack of rotated sheets: the first work cover on top, palette-colored sheets behind (decorative).
const stack = () => {
  const cover = coverHtml(content.work[0]);
  return `
    <a class="stack" href="#work" data-open-collage data-cursor="arrow" aria-label="${esc(ui.sections.work)}">
      <span class="sheet sheet--mid"></span><span class="sheet sheet--soft"></span><span class="sheet sheet--accent"></span>
      <span class="sheet sheet--top">${cover}</span>
    </a>`;
};

const heroSection = () => `
  <section class="hero" id="top">
    <div class="hero__top">
      <p class="hero__intro">${esc(hero.intro)}</p>
      <p class="hero__now"><span>${esc(ui.now)}</span> ${ph(person.current_role.title, 'Placeholder role title')}<br />${esc(
        person.current_role.org,
      )} · ${esc(since)}</p>
    </div>
    ${stack()}
    <h1 class="hero__name" data-split="lines">${esc(hero.big_text)}</h1>
    <div class="hero__side" data-hero-after>
      <p class="hero__copy">${esc(hero.copyright_line)}</p>
      <p class="hero__clock"><span>${esc(person.location)}</span> <span data-clock>${clock()}</span></p>
    </div>
  </section>
  <section class="statement">
    <p data-split="words">${esc(content.statement)}</p>
  </section>`;

const marquee = () => {
  const group = (hidden) =>
    `<ul class="marquee__group"${hidden ? ' aria-hidden="true"' : ''}>${content.marquee
      .map((m) => `<li>${esc(m)}</li>`)
      .join('')}</ul>`;
  return `<div class="marquee" data-marquee><div class="marquee__track">${group(false)}${group(true)}</div></div>`;
};

const coverHtml = (w, { lazy = false, label = false } = {}) =>
  isTodo(w?.cover)
    ? `<div class="cover cover--ph"${label ? ' role="img" aria-label="Placeholder cover"' : ''}></div>`
    : `<img class="cover" src="${esc(w.cover)}" alt="" width="1200" height="900"${lazy ? ' loading="lazy"' : ''} />`;

const card = (w) => {
  const live = isUrl(w.url);
  const cover = coverHtml(w, { lazy: true, label: true });
  const body = `
    <div class="card__media" data-reveal="expand">${cover}</div>
    <div class="card__meta">
      <h3>${ph(w.title, 'Placeholder title')}</h3>
      <p>${esc(w.category)} · ${ph(w.year, '0000')}</p>
      <p class="card__sum">${ph(w.summary, 'Placeholder summary.')}</p>
    </div>`;
  return live
    ? `<a class="card" href="${esc(w.url)}" target="_blank" rel="noopener" data-cursor="arrow">${body}</a>`
    : `<div class="card">${body}</div>`;
};

const work = () => `
  <section class="section" id="work">
    <h2 class="section__title">${esc(ui.sections.work)}</h2>
    <div class="cards">${content.work.map(card).join('')}</div>
  </section>`;

// Each digit is a 10-row column so the odometer can roll it (animation 8); '.' stays static.
const odometer = (value) => {
  const text = isTodo(value) ? '00' : String(value);
  const cols = [...text]
    .map((ch) => {
      if (!/\d/.test(ch)) return `<span class="odo__sep" aria-hidden="true">${ch}</span>`;
      const rows = Array.from({ length: 10 }, (_, i) => `<span>${i}</span>`).join('');
      return `<span class="odo__col" aria-hidden="true"><span class="odo__roll" data-digit="${ch}" style="transform:translateY(-${ch * 10}%)">${rows}</span></span>`;
    })
    .join('');
  return `<span class="odo" role="img" aria-label="${esc(text)}">${cols}</span>`;
};

const stat = (s) => {
  const bg = isTodo(s.image) ? '' : ` style="--stat-bg:url(${esc(s.image)}) center/cover"`;
  return `
    <article class="stat grid">
      <div class="stat__num" data-stat${bg}>${odometer(s.value)}</div>
      <div class="stat__copy">
        <h3>${ph(s.label, 'Placeholder label')}</h3>
        <p>${esc(s.text)}</p>
      </div>
    </article>`;
};

const stats = () => `
  <section class="section section--stats" aria-label="${esc(ui.sections.stats)}">
    ${content.stats.map(stat).join('')}
  </section>`;

const row = (a, b, c) => `
  <li class="row">
    <span class="row__a">${a}</span>
    <span class="row__b">${b}</span>
    <span class="row__c">${c}</span>
    <span class="row__arrow" aria-hidden="true">→</span>
  </li>`;

const about = () => `
  <section class="section" id="about">
    <h2 class="section__title">${esc(person.name)}</h2>
    <p class="lede">${esc(person.positioning)}</p>

    <h3 class="sub">${esc(ui.sections.process)}</h3>
    <ol class="process">
      ${content.process
        .map((p) => `<li><span class="process__n">${esc(p.n)}</span><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p></li>`)
        .join('')}
    </ol>

    <h3 class="sub">${esc(ui.sections.experience)}</h3>
    <ul class="rows">
      ${content.experience
        .map((e) =>
          row(
            esc(e.org),
            `${ph(e.role, 'Placeholder role')}<small>${ph(e.summary, 'Placeholder summary.')}</small>`,
            ph(e.period, 'Placeholder period'),
          ),
        )
        .join('')}
    </ul>

    <div class="facts">
      <div>
        <h3 class="sub">${esc(ui.sections.education)}</h3>
        ${content.education
          .map((e) => `<p><strong>${esc(e.school)}</strong><br />${esc(e.degree)}<br />${esc(e.note)}</p>`)
          .join('')}
      </div>
      <div>
        <h3 class="sub">${esc(ui.sections.organizations)}</h3>
        <ul class="plain">${content.organizations.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
      </div>
      <div>
        <h3 class="sub">${esc(ui.sections.languages)}</h3>
        <ul class="plain">${content.languages.map((l) => `<li>${esc(l.name)} — ${esc(l.level)}</li>`).join('')}</ul>
      </div>
    </div>

    <h3 class="sub">${esc(ui.sections.faq)}</h3>
    <div class="faq">
      ${content.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </div>
  </section>`;

const credentials = () => `
  <section class="section" id="credentials">
    <h2 class="section__title">${esc(ui.sections.credentials)}</h2>
    <ul class="rows">
      ${content.awards.map((a) => row(esc(a.name), `${esc(a.detail)} · ${esc(ui.kinds.award)}`, ph(a.year, '0000'))).join('')}
      ${content.certifications
        .map((c) => row(esc(c.name), esc(ui.kinds.certification), ph(c.year, '0000')))
        .join('')}
    </ul>
  </section>`;

const link = (label, href) =>
  isUrl(href) || href?.startsWith('mailto:')
    ? `<a href="${esc(href)}"${isUrl(href) ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`
    : `<span class="ph" title="Placeholder link">${esc(label)}</span>`;

const footerLinks = () => {
  const hrefs = { linkedin: person.links.linkedin, irfolks: person.links.irfolks, email: `mailto:${person.email}` };
  const social = content.footer.social.map((s) => link(s, hrefs[s.toLowerCase()]));
  return [...social, link(ui.cv, person.links.cv)].map((l) => `<li>${l}</li>`).join('');
};

const contact = () => `
  <section class="contact" id="contact">
    <h2 class="contact__title">${esc(content.contact.headline)}</h2>
    <a class="btn" href="mailto:${esc(person.email)}">${esc(content.contact.cta)} <span aria-hidden="true">→</span></a>
  </section>`;

const footer = () => `
  <footer class="footer">
    <ul class="footer__links">${footerLinks()}</ul>
    <p>${esc(person.name)} ${esc(hero.copyright_line)} · ${esc(person.location)}</p>
    <p class="footer__note">${esc(content.footer.note)}</p>
  </footer>`;

// Work collage (route #/work): [x, y] as fractions of the pan field, width in vw, aspect (w/h), parallax speed.
// shortcut: 8 layout slots, extra work items reuse them cyclically; hand-place more when work grows past ~12.
// Mirrored layout: four tiles frame the title, four wait just outside the viewport for the pan.
const SLOTS = [
  [-0.2, -0.21, 23, 0.8, 1],
  [0.2, -0.21, 23, 0.8, 1],
  [-0.2, 0.21, 23, 0.8, 1],
  [0.2, 0.21, 23, 0.8, 1],
  [-0.48, 0, 24, 1.25, 1.2],
  [0.48, 0, 24, 1.25, 1.2],
  [0, -0.46, 24, 1.25, 1.2],
  [0, 0.46, 24, 1.25, 1.2],
];
const DECO = ['accent', 'soft', 'muted'];

// w === undefined -> decorative palette tile that keeps the layout full until there is more work.
const tile = (w, i) => {
  const [x, y, width, ratio, speed] = SLOTS[i % SLOTS.length];
  const attrs = (cls) =>
    `class="tile ${cls}" data-x="${x}" data-y="${y}" data-speed="${speed}" style="--w:${width};--r:${ratio}"`;
  if (!w) return `<div ${attrs(`tile--deco tile--${DECO[(i >> 1) % DECO.length]}`)} aria-hidden="true"></div>`;
  const body = `<div class="tile__media">${coverHtml(w, { lazy: true })}</div>
    <p class="tile__cap">${ph(w.title, 'Placeholder title')}<span>${esc(w.category)}</span></p>`;
  return isUrl(w.url)
    ? `<a ${attrs('')} href="${esc(w.url)}" target="_blank" rel="noopener" data-cursor="arrow">${body}</a>`
    : `<div ${attrs('')}>${body}</div>`;
};

const collage = () => `
  <div class="collage" data-collage role="region" aria-label="${esc(ui.sections.work)}" inert>
    <h2 class="collage__title" aria-hidden="true">${esc(ui.collage.title)}</h2>
    <p class="collage__hint">${esc(ui.collage.hint)}</p>
    ${Array.from({ length: Math.max(SLOTS.length, content.work.length) }, (_, i) => tile(content.work[i], i)).join('')}
    <button class="collage__close" type="button" data-collage-close>${esc(ui.close)}</button>
  </div>`;

document.getElementById('app').innerHTML =
  header() +
  `<main id="main">${heroSection()}${marquee()}${work()}${stats()}${about()}${credentials()}${contact()}</main>` +
  footer() +
  collage();

setInterval(() => (document.querySelector('[data-clock]').textContent = clock()), 15000);

// The fixed header bar keeps its position and takes the color of what is under it: dark over contact/footer.
const headerBar = document.querySelector('[data-header]');
const darkBlocks = [...document.querySelectorAll('.contact, .footer')];
const paintHeader = () => {
  const mid = headerBar.offsetHeight / 2;
  const dark = darkBlocks.some((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= mid && r.bottom > mid;
  });
  headerBar.dataset.theme = dark ? 'dark' : 'light';
};
addEventListener('scroll', paintHeader, { passive: true });
addEventListener('resize', paintHeader);
paintHeader();
initAnimations();
initMenu();
initCollage();

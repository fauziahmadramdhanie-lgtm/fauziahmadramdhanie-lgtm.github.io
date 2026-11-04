import content from './content.json';
import 'lenis/dist/lenis.css';
import './styles.css';
import { initMenu } from './menu.js';
import { initCollage } from './collage.js';
import { initRouter } from './router.js';

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

// Work and Credentials open a collage (collage.js); the other items are pages (#/about ...), handled by router.js.
const COLLAGES = ['work', 'credentials'];
const navLink = (n, extra = '') =>
  `<a href="#/${esc(n.target)}"${COLLAGES.includes(n.target) ? ` data-open-collage="${esc(n.target)}"` : ''} ${extra}>${esc(n.label)}</a>`;

const header = () => `
  <a class="skip" href="#main">${esc(ui.skip)}</a>
  <header class="site-header" data-header>
    <a class="page-close" href="#/">${esc(ui.close)}</a>
    <nav class="site-nav" aria-label="${esc(ui.primary)}">
      ${ui.nav.map((n) => navLink(n)).join('')}
    </nav>
    <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu">
      <span class="menu-toggle__label">${esc(ui.menu)}</span>
      <span class="menu-toggle__label" aria-hidden="true">${esc(ui.close)}</span>
    </button>
  </header>
  <nav class="menu" id="menu" data-menu aria-label="${esc(ui.menu)}" inert>
    <ul>
      <li><a href="#/" data-menu-link>${esc(ui.home)}</a></li>
      ${ui.nav.map((n) => `<li>${navLink(n, 'data-menu-link')}</li>`).join('')}
    </ul>
  </nav>
  <p class="clock"><span>${esc(person.location)}</span> <span data-clock>${clock()}</span></p>`;

const clock = () =>
  new Intl.DateTimeFormat(content.meta.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: hero.timezone,
    timeZoneName: 'short',
  }).format(new Date());

const coverHtml = (w, { lazy = false, label = false } = {}) =>
  isTodo(w?.cover)
    ? `<div class="cover cover--ph"${label ? ' role="img" aria-label="Placeholder cover"' : ''}></div>`
    : `<img class="cover" src="${esc(w.cover)}" alt="" width="1200" height="900"${lazy ? ' loading="lazy"' : ''} />`;

// Sheets of rotated paper: palette-colored ones behind, `top` (an image) in front. Decorative.
const sheets = (top) => `
  <span class="sheet sheet--mid"></span><span class="sheet sheet--soft"></span><span class="sheet sheet--accent"></span>
  <span class="sheet sheet--top">${top}</span>`;

const portraitImg = (lazy = true) =>
  isTodo(person.photo)
    ? '<div class="cover cover--ph" role="img" aria-label="Placeholder portrait"></div>'
    : `<img class="cover" src="${esc(person.photo)}" alt="${esc(person.name)}" width="1000" height="1337"${lazy ? ' loading="lazy"' : ''} />`;

// ---------- Home ----------
const stack = () => `
  <a class="stack" href="#/work" data-open-collage="work" data-cursor="arrow" aria-label="${esc(ui.sections.work)}">
    ${sheets(coverHtml(content.work[0]))}
  </a>`;

const heroSection = () => `
  <section class="hero" id="top">
    <div class="hero__top">
      <p class="hero__intro" data-intro="1">${esc(hero.intro)}</p>
      <p class="hero__now" data-intro="2"><span>${esc(ui.now)}</span> ${ph(person.current_role.title, 'Placeholder role title')}<br />${esc(
        person.current_role.org,
      )} · ${esc(since)}</p>
    </div>
    ${stack()}
    <h1 class="hero__name" data-intro="0">${esc(hero.big_text)}</h1>
    <div class="hero__side" data-intro-fade>
      <p class="hero__copy">${esc(hero.copyright_line)}</p>
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
  // --em: the number's width in em (digit ~0.62, separator ~0.3), so the pinned stage can fit 2-3 characters.
  const em = [...text].reduce((w, ch) => w + (/\d/.test(ch) ? 0.62 : 0.3), 0);
  return `<span class="odo" role="img" aria-label="${esc(text)}" style="--em:${em.toFixed(2)}">${cols}</span>`;
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

// On desktop with motion this section pins: all three stats sit in one screen in a zigzag and their
// numbers roll as you scroll (see numbersStage).
const stats = () => `
  <section class="numbers" aria-label="${esc(ui.sections.stats)}">
    <p class="numbers__label">${esc(ui.sections.stats)}</p>
    ${content.stats.map(stat).join('')}
  </section>`;

// Home ends with a teaser that leads to the contact page.
const teaser = () => `
  <section class="contact" data-dark>
    <h2 class="contact__title">${esc(content.contact.headline)}</h2>
    <a class="btn" href="#/contact">${esc(content.contact.cta)} <span aria-hidden="true">→</span></a>
  </section>`;

const homePage = () => `
  <div data-page="home" tabindex="-1">${heroSection()}${marquee()}${work()}${stats()}${teaser()}</div>`;

// ---------- Shared bits ----------
const row = (a, b, c) => `
  <li class="row">
    <span class="row__a">${a}</span>
    <span class="row__b">${b}</span>
    <span class="row__c">${c}</span>
    <span class="row__arrow" aria-hidden="true">→</span>
  </li>`;

// Big title at the top of every inner page; [data-intro] makes it rise line by line on entry.
const pageHead = (title, lede) => `
  <section class="page-head">
    <h1 class="page-title" data-intro="0">${esc(title)}</h1>
    ${lede ? `<p class="page-lede" data-intro="1">${esc(lede)}</p>` : ''}
  </section>`;

// ---------- About ----------
// The portrait stays put (sticky) while the text column scrolls past it.
const portrait = () => `
  <figure class="portrait">
    <div class="portrait__media" data-reveal="expand">${portraitImg()}</div>
    <figcaption>${esc(person.name)} · ${esc(person.location)}</figcaption>
  </figure>`;

// Process as a Gantt-style timeline: one bar per step, staircased over 11 columns (decorative; the list below is the content).
const BARS = [[1, 5], [3, 8], [6, 11], [9, 12]]; // [start line, end line] on an 11-column grid
const processSection = () => `
  <section class="section" id="process">
    <h2 class="section__title">${esc(ui.sections.process)}</h2>
    <div class="gantt" aria-hidden="true">
      ${content.process
        .map((p, i) => `<span class="gantt__bar" data-bar style="grid-row:${i + 1};grid-column:${BARS[i % BARS.length][0]} / ${BARS[i % BARS.length][1]}">${esc(p.title)}</span>`)
        .join('')}
      ${Array.from({ length: 11 }, (_, i) => `<span class="gantt__tick" style="grid-row:${content.process.length + 1};grid-column:${i + 1}">${String(i + 1).padStart(2, '0')}</span>`).join('')}
    </div>
    <ol class="process">
      ${content.process
        .map((p) => `<li><span class="process__n">${esc(p.n)}</span><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p></li>`)
        .join('')}
    </ol>
  </section>`;

// FAQ: label stays on the left, big accordion questions scroll on the right.
const faq = () => `
  <section class="section split" id="faq">
    <div class="split__side"><h2 class="split__label">${esc(ui.sections.faq)}</h2></div>
    <div class="split__main faq">
      ${content.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
    </div>
  </section>`;

const aboutPage = () => `
  <div data-page="about" hidden tabindex="-1">
    ${pageHead(ui.sections.about, person.positioning)}
    <section class="section split" id="about">
      <div class="split__side">${portrait()}</div>
      <div class="split__main">
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

        <h3 class="sub">${esc(ui.sections.skills)}</h3>
        <div class="facts skills">
          ${content.skills.map((s) => `<div><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p></div>`).join('')}
        </div>

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
      </div>
    </section>
    ${processSection()}
    ${faq()}
  </div>`;

// ---------- Contact ----------
// Dark page like the home hero: the contact links as large rows, the big headline docked at the bottom.
const shown = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const contactRow = (label, href, value, copy) => {
  const live = isUrl(href) || href?.startsWith('mailto:');
  const inner = `<span class="contact-row__label">${esc(label)}</span><span class="contact-row__value">${live ? esc(value) : `<span class="ph">Placeholder link</span>`}</span><span class="contact-row__arrow" aria-hidden="true">→</span>`;
  return `
    <li class="contact-row" data-intro-fade>
      ${
        live
          ? `<a class="contact-row__link" href="${esc(href)}"${isUrl(href) ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>`
          : `<span class="contact-row__link">${inner}</span>`
      }
      ${copy ? `<button class="contact-row__copy" type="button" data-copy="${esc(copy)}">${esc(ui.copy)}</button>` : ''}
    </li>`;
};

const contactPage = () => `
  <div data-page="contact" hidden tabindex="-1">
    <section class="contact-page" data-dark>
      <ul class="contact-rows">
        ${contactRow('Email', `mailto:${person.email}`, person.email, person.email)}
        ${contactRow('LinkedIn', person.links.linkedin, shown(person.links.linkedin ?? ''))}
        ${contactRow('irfolks', person.links.irfolks, shown(person.links.irfolks ?? ''))}
        ${contactRow(ui.cv, person.links.cv, ui.cvOpen)}
      </ul>
      <h1 class="contact-page__title" data-intro="0">${esc(content.contact.headline)}</h1>
    </section>
  </div>`;

// ---------- Footer (icon links) ----------
// Footer links are icons (outline glyphs drawn here); the label stays as the accessible name.
// shortcut: generic glyphs, swap the irfolks one for the real logo once /assets has it.
const ICONS = {
  linkedin:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V16M12 16v-5.5M12 13c0-1.7 1-2.6 2.4-2.6S17 11.3 17 13v3"/><circle cx="8" cy="7.4" r=".6" fill="currentColor"/>',
  irfolks: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  cv: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 15.5h5"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
};

const iconLink = (key, label, href) => {
  const svg = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key]}</svg>`;
  return isUrl(href) || href?.startsWith('mailto:')
    ? `<a class="icon-link" href="${esc(href)}"${isUrl(href) ? ' target="_blank" rel="noopener"' : ''} aria-label="${esc(label)}" title="${esc(label)}">${svg}</a>`
    : `<span class="icon-link icon-link--ph" title="${esc(label)} (placeholder link)">${svg}<span class="sr-only">${esc(label)}</span></span>`;
};

const footerLinks = () => {
  const hrefs = { linkedin: person.links.linkedin, irfolks: person.links.irfolks, email: `mailto:${person.email}` };
  const social = content.footer.social.map((s) => iconLink(s.toLowerCase(), s, hrefs[s.toLowerCase()]));
  return [...social, iconLink('cv', ui.cv, person.links.cv)].map((l) => `<li>${l}</li>`).join('');
};

const footer = () => `
  <footer class="footer" data-dark>
    <ul class="footer__links">${footerLinks()}</ul>
    <p>${esc(person.name)} ${esc(hero.copyright_line)} · ${esc(person.location)}</p>
    <p class="footer__note">${esc(content.footer.note)}</p>
  </footer>`;

// ---------- Work collage (route #/work) ----------
// [x, y] as fractions of the pan field, width in vw, aspect (w/h), parallax speed.
// shortcut: 8 layout slots, extra work items reuse them cyclically; hand-place more when work grows past ~12.
// Mirrored layout: four tiles frame the title, four wait just outside the viewport for the pan.
const SLOTS = [
  [-0.2, -0.21, 23, 0.8, 1],
  [0.2, -0.21, 23, 0.8, 1],
  [-0.2, 0.21, 23, 0.8, 1],
  [0.2, 0.21, 23, 0.8, 1],
  // The outer ring stays well inside the wrap seam: tiles that wrap around must not land on their neighbors.
  [-0.4, 0, 24, 1.25, 1.2],
  [0.4, 0, 24, 1.25, 1.2],
  [0, -0.36, 24, 1.25, 1.2],
  [0, 0.36, 24, 1.25, 1.2],
];
const DECO = ['accent', 'soft', 'muted'];

// w === undefined -> decorative palette tile that keeps the layout full until there is more work.
const tile = (w, i) => {
  const [x, y, width, ratio, speed] = SLOTS[i % SLOTS.length];
  const attrs = (cls) =>
    `class="tile ${cls}" data-x="${x}" data-y="${y}" data-speed="${speed}" style="--w:${width};--r:${ratio};--wh:40"`;
  if (!w) return `<div ${attrs(`tile--deco tile--${DECO[(i >> 1) % DECO.length]}`)} aria-hidden="true"></div>`;
  const body = `<div class="tile__media">${coverHtml(w, { lazy: true })}</div>
    <p class="tile__cap">${ph(w.title, 'Placeholder title')}<span>${esc(w.category)}</span></p>`;
  return isUrl(w.url)
    ? `<a ${attrs('')} href="${esc(w.url)}" target="_blank" rel="noopener" data-cursor="arrow">${body}</a>`
    : `<div ${attrs('')}>${body}</div>`;
};

// ---------- Credentials collage (route #/credentials) ----------
// Landscape certificate tiles on a larger field (data-field): four frame the title, three more rings wait outside.
// Items without an image become typographic cards, so nothing in content.json is left out.
// Every tile moves at the same speed: with 14 big tiles, different parallax speeds make them run into each other.
// The grid is periodic (wrap-around gaps are wider than the inner ones), so tiles never overlap while panning.
const CRED_SLOTS = [
  [-0.12, -0.12, 26, 1.4, 1],
  [0.12, -0.12, 26, 1.4, 1],
  [-0.12, 0.12, 26, 1.4, 1],
  [0.12, 0.12, 26, 1.4, 1],
  [-0.3, -0.12, 26, 1.4, 1],
  [0.3, -0.12, 26, 1.4, 1],
  [-0.3, 0.12, 26, 1.4, 1],
  [0.3, 0.12, 26, 1.4, 1],
  [-0.12, -0.3, 26, 1.4, 1],
  [0.12, -0.3, 26, 1.4, 1],
  [-0.12, 0.3, 26, 1.4, 1],
  [0.12, 0.3, 26, 1.4, 1],
  [-0.3, -0.3, 26, 1.4, 1],
  [0.3, -0.3, 26, 1.4, 1],
  [-0.3, 0.3, 26, 1.4, 1],
  [0.3, 0.3, 26, 1.4, 1],
];

const credTile = (c, i) => {
  const [x, y, width, ratio, speed] = CRED_SLOTS[i % CRED_SLOTS.length];
  // --wh caps the width by the viewport height: row spacing follows the height, so on wide screens the
  // vw-based width alone would make a tile taller than the gap between rows.
  const attrs = (cls) =>
    `class="tile ${cls}" data-x="${x}" data-y="${y}" data-speed="${speed}" style="--w:${width};--r:${ratio};--wh:34"`;
  const year = isTodo(c.year) ? '' : ` · ${esc(c.year)}`;
  if (isTodo(c.image)) {
    return `<div ${attrs('tile--text')}>
      <div class="tile__text"><span>${esc(ui.kinds[c.kind])}${year}</span><strong>${esc(c.name)}</strong>${c.detail ? `<small>${esc(c.detail)}</small>` : ''}</div>
    </div>`;
  }
  return `<div ${attrs('tile--cert')}>
    <div class="tile__media"><img class="cover" src="${esc(c.image)}" alt="${esc(ui.kinds[c.kind])}: ${esc(c.name)}" width="900" height="640" loading="lazy" /></div>
    <p class="tile__cap">${esc(c.name)}<span>${esc(c.detail)}${year}</span></p>
  </div>`;
};

const collageHtml = (name, label, title, tiles, field) => `
  <div class="collage" data-collage="${name}" data-field="${field}" role="region" aria-label="${esc(label)}" inert>
    <h2 class="collage__title" aria-hidden="true">${esc(title)}</h2>
    ${tiles.join('')}
    <button class="collage__close" type="button" data-collage-close>${esc(ui.close)}</button>
  </div>`;

const collages = () =>
  collageHtml(
    'work',
    ui.sections.work,
    ui.collage.title,
    Array.from({ length: Math.max(SLOTS.length, content.work.length) }, (_, i) => tile(content.work[i], i)),
    1.5,
  ) +
  collageHtml(
    'credentials',
    ui.sections.credentials,
    ui.sections.credentials,
    content.credentials.map(credTile),
    1.9,
  );

document.getElementById('app').innerHTML =
  header() +
  `<main id="main">${homePage()}${aboutPage()}${contactPage()}</main>` +
  footer() +
  collages();

setInterval(() => (document.querySelector('[data-clock]').textContent = clock()), 15000);

// The fixed header bar keeps its position and takes the color of what is under it: dark over [data-dark] blocks.
const headerBar = document.querySelector('[data-header]');
const paintHeader = () => {
  const mid = headerBar.offsetHeight / 2;
  // During a page transition only the incoming page counts (it sits at scroll 0), not the old one under it.
  const scope = document.querySelector('.page-layer') ?? document;
  const dark = [...scope.querySelectorAll('[data-dark]')].some((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.top <= mid && r.bottom > mid;
  });
  headerBar.dataset.theme = dark ? 'dark' : 'light';
};
addEventListener('scroll', paintHeader, { passive: true });
addEventListener('resize', paintHeader);
addEventListener('pagechange', paintHeader);

// The underlined nav item is whatever is open: a collage over the page, else the page itself (none on home).
const paintNav = () => {
  const open = /^#\/(work|credentials)$/.exec(location.hash)?.[1] ?? document.documentElement.dataset.route;
  document.querySelectorAll('.site-nav a').forEach((a) =>
    a.getAttribute('href') === `#/${open}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'),
  );
};
addEventListener('pagechange', paintNav);

// Copy-to-clipboard buttons on the contact page.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try {
    await navigator.clipboard.writeText(b.dataset.copy);
    b.textContent = ui.copied;
    setTimeout(() => (b.textContent = ui.copy), 1600);
  } catch {
    /* clipboard blocked: the address is on screen and the row is a mailto link anyway */
  }
});

initMenu();
initCollage(); // before the router: both listen for link clicks in the capture phase, in this order
initRouter();

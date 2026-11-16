import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import content from './content.json';
import { countItems } from './feed.js';
import { esc } from './esc.js';
import irfolks from './irfolks.json'; // article count, refreshed from the irfolks RSS feed before each build
import 'lenis/dist/lenis.css';
import './styles.css';
import { initMenu } from './menu.js';
import { initCollage } from './collage.js';
import { initCards } from './cards.js';
import { initRouter } from './router.js';

const { person, hero, ui } = content;

// Content still marked TODO renders as a neutral, searchable placeholder (see CLAUDE.md).
const isTodo = (v) => v == null || /TODO/i.test(String(v));
const ph = (v, fallback) => {
  if (!isTodo(v)) return esc(v);
  const before = v == null ? '' : String(v).split(/TODO/i)[0].trim();
  return `${before ? esc(before) + ' ' : ''}<span class="ph">${esc(fallback)}</span>`;
};
const isUrl = (v) => /^https?:\/\//.test(v ?? '');
// timeZone UTC: "2026-08-01" is midnight UTC, which would print as July in the Americas.
const since = new Date(`${person.current_role.since}-01`).toLocaleDateString(content.meta.language, {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
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
  <div class="mode-slider" role="radiogroup" aria-label="${esc(ui.modes.aria)}" data-mode-slider>
    ${['light', 'dark', 'color']
      .map((m) => `<button class="mode-slider__stop" type="button" role="radio" aria-checked="false" aria-label="${esc(ui.modes[m])}" data-mode="${m}"></button>`)
      .join('')}
    <span class="mode-slider__thumb" aria-hidden="true"></span>
  </div>
  <p class="clock"><span>${esc(person.location)}</span> <span data-clock>${clock()}</span></p>`;

const clock = () =>
  new Intl.DateTimeFormat(content.meta.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: hero.timezone,
    timeZoneName: 'short',
  }).format(new Date());

const portraitImg = (lazy = true) =>
  isTodo(person.photo)
    ? '<div class="cover cover--ph" role="img" aria-label="Placeholder portrait"></div>'
    : `<img class="cover" src="${esc(person.photo)}" alt="${esc(person.name)}" width="1000" height="1337"${lazy ? ' loading="lazy"' : ''} />`;

// ---------- Home ----------
const heroSection = () => `
  <section class="hero" id="top">
    <div class="hero__top">
      <p class="hero__intro" data-intro="1">${esc(hero.intro)}</p>
      <p class="hero__now" data-intro="2"><span>${esc(ui.now)}</span> ${ph(person.current_role.title, 'Placeholder role title')}<br />${esc(
        person.current_role.org,
      )} · ${esc(since)}</p>
    </div>
    <h1 class="hero__name" data-intro="0" data-intro-chars>${esc(hero.big_text)}</h1>
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

// One photo between the marquee and the numbers, revealed like the About portrait. It comes in three colorways, one
// per color mode (light: orange, dark: gray, color: purple and yellow); the one for the active mode fades in.
const skyline = () => `
  <section class="skyline" aria-hidden="true">
    <div class="skyline__media" data-reveal="expand">
      <div class="skyline__zoom">
        ${['light', 'dark', 'color']
          .map((k) => `<img class="skyline__img skyline__img--${k}" src="/assets/skyline-${k}.webp" alt="" width="1308" height="736" loading="lazy" />`)
          .join('')}
      </div>
    </div>
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
      <div class="stat__num" data-stat${s.source ? ` data-live="${esc(s.source)}"` : ''}${bg}>${odometer(s.source === 'irfolks' ? irfolks.count : s.value)}</div>
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
    <h2 class="numbers__label">${esc(ui.sections.stats)}</h2>
    ${content.stats.map(stat).join('')}
  </section>`;

// Home ends with a teaser that leads to the contact page.
const teaser = () => `
  <section class="contact" data-dark>
    <h2 class="contact__title">${esc(content.contact.headline)}</h2>
    <a class="btn" href="#/contact">${esc(content.contact.cta)} <span aria-hidden="true">→</span></a>
  </section>`;

const homePage = () => `
  <div data-page="home" tabindex="-1">${heroSection()}${marquee()}${skyline()}${stats()}${teaser()}</div>`;

// ---------- Shared bits ----------
// Big title at the top of every inner page; [data-intro] makes it rise line by line on entry.
const pageHead = (title, lede) => `
  <section class="page-head">
    <h1 class="page-title" data-intro="0" data-intro-chars>${esc(title)}</h1>
    ${lede ? `<p class="page-lede" data-intro="1">${esc(lede)}</p>` : ''}
  </section>`;

// ---------- About ----------
// The portrait stays put (sticky) while the text column scrolls past it.
const portrait = () => `
  <figure class="portrait">
    <div class="portrait__media" data-reveal="expand"><div class="portrait__zoom">${portraitImg()}</div></div>
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

// Experience as a large-type index: each line opens to its summary (one at a time, the first starts open).
const indexItem = (e, i) => {
  const now = /present/i.test(e.period);
  return `
    <li class="ix__item">
      <button class="ix__head" type="button" aria-expanded="${i === 0}" aria-controls="ix-${i}">
        <span class="ix__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <span class="ix__org">${esc(e.org)}</span>
        <span class="ix__plus" aria-hidden="true"></span>
        <span class="ix__meta">
          <span class="ix__period">${now ? `<em>${esc(ui.now)}</em> ` : ''}${ph(e.period, 'Placeholder period')}</span>
          <span>${ph(e.role, 'Placeholder role')}</span>
        </span>
      </button>
      <div class="ix__panel" id="ix-${i}"${i === 0 ? '' : ' inert'}>
        <div>
          <p class="ix__unit">${esc(e.unit)}</p>
          <p>${ph(e.summary, 'Placeholder summary.')}</p>
        </div>
      </div>
    </li>`;
};

const orgCard = (o) => `
  <li class="org">
    <span class="org__period">${esc(o.period)}</span>
    <h4 class="org__role">${esc(o.role)}</h4>
    <p class="org__name">${esc(o.org)}</p>
    <p class="org__sum">${esc(o.summary)}</p>
  </li>`;

const skillGroup = (g) => `
  <div class="chips">
    <h4 class="chips__label">${esc(g.title)}</h4>
    <ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  </div>`;

// The figure (GPA, average score) is the headline of each education card.
const eduCard = (e) => `
  <article class="edu">
    <p class="edu__fig">${esc(e.figure)}<small>${esc(e.figureNote)}</small></p>
    <h4 class="edu__school">${esc(e.school)}</h4>
    <p class="edu__degree">${esc(e.degree)} · ${esc(e.period)}</p>
    <ul class="edu__pts">${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
  </article>`;

// Five segments, filled up to the level (LinkedIn's scale: elementary ... native).
const langItem = (l) => `
  <li class="lang">
    <strong>${esc(l.name)}</strong>
    <small>${esc(l.level)}</small>
    <span class="lang__bar" role="img" aria-label="${esc(l.level)}">${Array.from({ length: 5 }, (_, k) => `<i${k < l.bars ? ' class="on"' : ''}></i>`).join('')}</span>
  </li>`;

const aboutPage = () => `
  <div data-page="about" hidden tabindex="-1">
    ${pageHead(ui.sections.about, person.positioning)}
    <section class="section split" id="about">
      <div class="split__side">${portrait()}</div>
      <div class="split__main">
        <h3 class="sub">${esc(ui.sections.experience)}</h3>
        <ul class="ix">${content.experience.map(indexItem).join('')}</ul>

        <h3 class="sub">${esc(ui.sections.organizations)}</h3>
        <ul class="orgs">${content.organizations.map(orgCard).join('')}</ul>

        <h3 class="sub">${esc(ui.sections.skills)}</h3>
        <div class="chipset">${content.skills.map(skillGroup).join('')}</div>

        <h3 class="sub">${esc(ui.sections.education)}</h3>
        <div class="edus">${content.education.map(eduCard).join('')}</div>

        <h3 class="sub">${esc(ui.sections.languages)}</h3>
        <ul class="langs">${content.languages.map(langItem).join('')}</ul>
      </div>
    </section>
    ${processSection()}
    ${faq()}
  </div>`;

// ---------- Contact ----------
// Dark page: the big headline on top, then a full-width photo that tilts as it scrolls, with the contact links
// in a card laid over it.
const shown = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const contactRow = (label, href, value, copy) => {
  const live = isUrl(href) || href?.startsWith('mailto:') || href?.startsWith('tel:');
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
      <h1 class="contact-page__title" data-intro="0" data-intro-chars>${esc(content.contact.headline)}</h1>
    </section>
    <section class="contact-photo" data-dark data-tilt>
      <div class="contact-photo__tilt"><img class="cover" src="${esc(content.contact.photo)}" alt="${esc(content.contact.photo_alt)}" width="2000" height="1333" loading="lazy" decoding="async" /></div>
      <ul class="contact-rows">
        ${contactRow('Email', `mailto:${person.email}`, person.email, person.email)}
        ${contactRow('LinkedIn', person.links.linkedin, shown(person.links.linkedin ?? ''))}
        ${contactRow('Phone', `tel:${person.phone.replaceAll(' ', '')}`, person.phone, person.phone)}
        ${contactRow('Instagram', person.links.instagram, '@' + person.links.instagram.split('/').pop())}
      </ul>
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

// ---------- Card tables (routes #/work and #/credentials) ----------
// A table opens clean, with a deck in the corner. Tapping the deck deals the cards face down, left to right, into the
// middle of the screen; tapping a card turns it over and opens it large (cards.js).
// A card is described by { title, label, sub, image | text, url }.

// content.collage is one card per section of work (an institution or a project). Its front is a gallery of `items`, each
// either { work: slug, ... } (a work item, with its link) or an item of its own; a section with only `text` has a text face.
const galleryItem = (c) => (c.work ? { ...content.work.find((w) => w.slug === c.work), ...c } : c);

const workCard = (w) => ({
  title: w.title,
  label: w.category,
  sub: w.category,
  image: !w.cover_text && !isTodo(w.cover) ? w.cover : null,
  text: [w.year, w.cover_text], // a typographic face for work with no image (a paper)
  thumb: w.cover_text && !isTodo(w.cover) ? w.cover : null, // a text tile that also has a picture
  about: w.about, // what I did, shown beside the photo in a zig-zag gallery
  url: w.url,
});

// A credential is a photo of its certificate in a section gallery; its caption is the issuer and year.
const credItem = (c) => ({
  title: c.name,
  note: [c.detail, isTodo(c.year) ? '' : c.year].filter(Boolean).join(' · '),
  image: isTodo(c.image) ? null : c.image,
  text: [c.year, c.detail], // an item without an image becomes a text tile
});

const sectionCard = (s, item = (it) => workCard(galleryItem(it))) => ({
  title: s.title,
  label: s.label,
  sub: s.sub,
  text: [s.label, ...(s.text ?? [])],
  gallery: s.items?.map(item),
});

// A photo is a button (it enlarges inside the card, cards.js); a paper or other item without a picture is a text tile.
// With `zig`, each photo is a row with its text beside it, the sides alternating (styles.css .gal--zig).
const galleryHtml = (items, zig) =>
  `<div class="gal${zig ? ' gal--zig' : ''}" data-lenis-prevent>${items
    .map((d) => {
      const link = isUrl(d.url) ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(ui.visit)}</a>` : '';
      const fig = (src) => `<button class="gal__fig" type="button" aria-label="${esc(d.title)}"><img data-src="${esc(src)}" alt="" decoding="async" /><span>${esc(d.title)}${d.note ? `<br>${esc(d.note)}` : ''}</span></button>`;
      if (zig) {
        const src = d.image || d.thumb;
        const lead = src ? fig(src) : `<div class="gal__plate"><span>${esc(d.label)}</span>${d.text[0] ? `<small>${esc(d.text[0])}</small>` : ''}</div>`; // no picture: a typographic plate
        return `<div class="gal__row">${lead}<div class="gal__about"><strong>${esc(d.title)}</strong>${d.about ? `<p>${esc(d.about)}</p>` : ''}${link}</div></div>`;
      }
      return d.image
        ? fig(d.image)
        : `<div class="gal__txt">${d.thumb ? `<img class="gal__thumb" data-src="${esc(d.thumb)}" alt="" decoding="async" />` : ''}${[d.text[0], d.title, d.text[1]].filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('')}${link}</div>`;
    })
    .join('')}</div>`;

const cardHtml = (d, i) => {
  const media = d.gallery
    ? galleryHtml(d.gallery, d.zig)
    : d.image
    ? `<img class="card-t__img" data-src="${esc(d.image)}" alt="${esc(d.title)}" decoding="async" />` // src is set when the cards are dealt (cards.js)
    : `<div class="card-t__text">${d.text.filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('')}</div>`;
  const link = isUrl(d.url)
    ? `<a class="card-t__link" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(ui.visit)}</a>`
    : '';
  return `
    <div class="card-t" data-card>
      <div class="card-t__inner">
        <button class="card-t__face card-t__back" type="button" aria-label="${esc(ui.open)}: ${esc(d.title)}">
          <span class="card-t__no">${String(i + 1).padStart(2, '0')}</span>
          <span class="card-t__lab">${esc(d.label)}</span>
          <strong class="card-t__ttl">${esc(d.title)}</strong>
        </button>
        <div class="card-t__face card-t__front" inert>
          <div class="card-t__media">${media}</div>
          <div class="card-t__cap">
            <strong>${esc(d.title)}</strong><span>${esc(d.sub)}</span>
            <div class="card-t__acts">${link}<button class="card-t__close" type="button">${esc(ui.close)}</button></div>
          </div>
        </div>
      </div>
    </div>`;
};

const collageHtml = (name, label, title, cards) => `
  <div class="collage" data-collage="${name}" data-collect="${esc(ui.collect)}" role="region" aria-label="${esc(label)}" inert>
    <h2 class="collage__title" aria-hidden="true">${esc(title)}</h2>
    <div class="table" data-table>
      <button class="deck" type="button" data-deck aria-label="${esc(ui.deal)}">
        <span class="deck__stack" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span class="deck__hint" aria-hidden="true" data-deck-hint>${esc(ui.deal)}</span>
      </button>
      ${cards.map(cardHtml).join('')}
      <div class="table__shade" data-shade></div>
    </div>
    <button class="collage__close" type="button" data-collage-close>${esc(ui.close)}</button>
  </div>`;

const collages = () =>
  collageHtml('work', ui.sections.work, ui.collage.title, content.collage.map((s) => ({ ...sectionCard(s), zig: true }))) +
  collageHtml('credentials', ui.sections.credentials, ui.sections.credentials, content.credentials.map((s) => sectionCard(s, credItem)));

document.getElementById('app').innerHTML =
  header() +
  `<main id="main">${homePage()}${aboutPage()}${contactPage()}</main>` +
  footer() +
  collages();

setInterval(() => (document.querySelector('[data-clock]').textContent = clock()), 15000);

// The fixed header bar keeps its position and takes the color of what is under it: dark over [data-dark] blocks.
const headerBar = document.querySelector('[data-header]');
const paintHeader = (e) => {
  // A page transition repaints the bar itself ('headerpaint', router.js) when the circle crosses it.
  if (e?.type === 'pagechange' && document.documentElement.classList.contains('is-transitioning')) return;
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
addEventListener('headerpaint', paintHeader);

// Color mode: a vertical slider with three stops (top light, middle dark, bottom color; palettes in styles.css).
// Click a stop or the track, drag the thumb, or use the arrow keys. Remembered, and applied before paint by index.html.
const MODES = ['light', 'dark', 'color'];
const slider = document.querySelector('[data-mode-slider]');
const stops = [...slider.querySelectorAll('[data-mode]')];
let mode = document.documentElement.dataset.mode ?? 'light';
const setMode = (next, save = true) => {
  mode = next;
  const html = document.documentElement;
  if (next === 'light') delete html.dataset.mode;
  else html.dataset.mode = next;
  slider.style.setProperty('--i', MODES.indexOf(next));
  stops.forEach((s) => s.setAttribute('aria-checked', s.dataset.mode === next));
  if (!save) return;
  try {
    localStorage.setItem('mode', next);
  } catch {
    /* private mode: the choice just lasts for this visit */
  }
};
setMode(mode, false);

// The stop nearest to a pointer height.
const stopAt = (y) => {
  const r = slider.getBoundingClientRect();
  return MODES[Math.round(Math.min(1, Math.max(0, (y - r.top) / r.height)) * (MODES.length - 1))];
};
let dragging = false;
slider.addEventListener('pointerdown', (e) => {
  dragging = true;
  slider.setPointerCapture(e.pointerId);
  setMode(stopAt(e.clientY));
});
slider.addEventListener('pointermove', (e) => dragging && stopAt(e.clientY) !== mode && setMode(stopAt(e.clientY)));
slider.addEventListener('pointerup', () => (dragging = false));
slider.addEventListener('pointercancel', () => (dragging = false));
slider.addEventListener('keydown', (e) => {
  const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const next = MODES[Math.min(MODES.length - 1, Math.max(0, MODES.indexOf(mode) + step))];
  setMode(next);
  stops[MODES.indexOf(next)].focus();
});
// Keyboard activation (Enter / Space on a focused stop); pointer clicks were handled on pointerdown.
stops.forEach((s) => s.addEventListener('click', () => s.dataset.mode !== mode && setMode(s.dataset.mode)));

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

// Experience index (About): one line open at a time. A collapsed panel is inert, so its text is out of the tab order.
// The page height changes with each toggle, so scroll triggers are measured again once the panels stop moving.
let remeasure = 0;
document.addEventListener('click', (e) => {
  const head = e.target.closest('.ix__head');
  if (!head) return;
  const wasOpen = head.getAttribute('aria-expanded') === 'true';
  head.closest('.ix').querySelectorAll('.ix__head').forEach((h) => {
    const open = h === head && !wasOpen;
    h.setAttribute('aria-expanded', open);
    document.getElementById(h.getAttribute('aria-controls')).toggleAttribute('inert', !open);
  });
  clearTimeout(remeasure);
  remeasure = setTimeout(() => ScrollTrigger.refresh(), 600);
});

// The article count baked in at build time (irfolks.json) is only the starting value. Each visit also asks the feed
// (irfolks.com allows reads from other sites), so a new article shows up without waiting for a rebuild.
const showLiveCount = (n) => {
  const odo = document.querySelector('[data-live="irfolks"] .odo');
  if (!odo || n === irfolks.count) return;
  const digits = [...String(n)];
  const rolls = [...odo.querySelectorAll('.odo__roll')];
  if (digits.length === rolls.length) {
    // Same number of digits: point each roll at its new digit. The scroll animation reads it again once invalidated.
    rolls.forEach((roll, i) => {
      roll.dataset.digit = digits[i];
      const tweens = gsap.getTweensOf(roll);
      if (tweens.length) tweens.forEach((t) => t.invalidate());
      else roll.style.transform = `translateY(-${digits[i] * 10}%)`; // reduced motion: parked on the digit
    });
    odo.setAttribute('aria-label', n);
    ScrollTrigger.update();
  } else {
    odo.outerHTML = odometer(n); // another number of digits: shown as is, without the roll
    ScrollTrigger.refresh();
  }
};
(async () => {
  try {
    const res = await fetch(irfolks.feed, { signal: AbortSignal.timeout(6000) });
    const xml = res.ok ? await res.text() : '';
    if (xml.includes('<rss')) showLiveCount(countItems(xml));
  } catch {
    /* offline or blocked: the number from the build stays */
  }
})();

initCards(); // first: its Esc handler (capture) must run before the router's and the collage's
initMenu();
initCollage(); // before the router: both listen for link clicks in the capture phase, in this order
initRouter();

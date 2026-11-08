import gsap from 'gsap';
import { fitGrid } from './grid.js';

// The card tables of #/work and #/credentials. Closed, a table is clean: only the deck in the corner. Tap the deck and
// the cards fly out of it one after another and settle face down in the middle of the screen, left to right and top to
// bottom, like a deal in Spider Solitaire. Tap a card and it turns over while it grows into a large view that covers
// most of the page, not all of it. Esc, the backdrop or Close turns it back into its place; the deck gathers them again.
const EDGE = { top: 76, bottom: 112, side: 20 }; // the header above; the deck and the Close pill below
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const dur = (s) => (reduced() ? 0 : s);
const tables = [];

export function initCards() {
  document.querySelectorAll('[data-table]').forEach((el) => tables.push(setup(el)));
  addEventListener('resize', () => tables.forEach((t) => t.relayout()));
  // Capture and registered first (see main.js): Esc closes an open card before the router or the collage see it.
  addEventListener(
    'keydown',
    (e) => {
      const t = tables.find((x) => x.isOpen());
      if (!t) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        t.close();
      } else if (e.key === 'Tab') t.trap(e);
    },
    true,
  );
}

// collage.js calls this once a collage has closed, so the next visit starts clean.
export function resetTable(root) {
  tables.find((t) => root.contains(t.el))?.reset();
}

function setup(el) {
  const root = el.closest('.collage');
  const deck = el.querySelector('[data-deck]');
  const hint = el.querySelector('[data-deck-hint]');
  const shade = el.querySelector('[data-shade]');
  const title = root.querySelector('.collage__title');
  const all = [...el.querySelectorAll('[data-card]')];
  const tabs = [...root.querySelectorAll('.tabs [data-part]')]; // Work only: the partitions
  const text = { deal: deck.getAttribute('aria-label'), collect: root.dataset.collect };
  let part = tabs[0]?.dataset.part;
  let cards = part ? all.filter((c) => c.dataset.part === part) : all; // the cards of the pressed tab
  let dealt = false;
  let busy = false;
  let open = null; // { card, i }
  let slots = [];

  // Places every card in its slot (grid.js decides the size and where each one goes). The tabs row, if any, is above the grid.
  const layout = () => {
    const bar = root.querySelector('.tabs')?.getBoundingClientRect().bottom ?? 0;
    slots = fitGrid(cards.length, innerWidth, innerHeight, { ...EDGE, top: Math.max(EDGE.top, bar + 12) });
    cards.forEach((c, i) => gsap.set(c, { left: slots[i].x, top: slots[i].y, width: slots[i].w, height: slots[i].h }));
  };

  const deckPoint = () => {
    const r = deck.querySelector('.deck__stack').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const fromDeck = (d) => ({
    x: (i) => d.x - (slots[i].x + slots[i].w / 2),
    y: (i) => d.y - (slots[i].y + slots[i].h / 2),
  });

  const setDealt = (on) => {
    dealt = on;
    deck.classList.toggle('is-empty', on);
    const label = on ? text.collect : text.deal;
    deck.setAttribute('aria-label', label);
    hint.textContent = label;
    gsap.to(title, { '--dim': on ? 0.08 : 1, duration: dur(0.6), overwrite: 'auto' });
  };

  const deal = () => {
    if (busy || dealt) return;
    busy = true;
    // The pictures download now, not with the page: nobody sees them before the deck is tapped.
    el.querySelectorAll('img[data-src]').forEach((img) => (img.src = img.dataset.src));
    layout();
    const from = fromDeck(deckPoint());
    gsap.set(cards, { ...from, scale: 0.35, rotation: () => gsap.utils.random(-16, 16), autoAlpha: 1 });
    setDealt(true);
    gsap.to(cards, {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      duration: dur(0.55),
      ease: 'power2.out',
      stagger: dur(0.085),
      onComplete: () => (busy = false),
    });
  };

  const collect = () => {
    if (busy || !dealt || open) return;
    busy = true;
    const from = fromDeck(deckPoint());
    gsap.to(cards, {
      ...from,
      scale: 0.35,
      rotation: () => gsap.utils.random(-16, 16),
      autoAlpha: 0,
      duration: dur(0.4),
      ease: 'power2.in',
      stagger: { each: dur(0.045), from: 'end' },
      onComplete: () => {
        busy = false;
        setDealt(false);
      },
    });
  };

  // The large view: as big as fits with room around it, the picture at its own proportions above its caption.
  const target = (img) => {
    const capH = innerWidth < 600 ? 132 : 100;
    const maxW = Math.min(innerWidth - 40, 1000);
    const maxH = innerHeight - 150;
    let w;
    let h;
    if (img?.naturalWidth) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const ih = Math.min(maxH - capH, maxW / ratio);
      w = Math.max(ih * ratio, Math.min(maxW, 340));
      h = ih + capH;
    } else {
      w = Math.min(maxW, 520);
      h = Math.min(maxH, 380);
    }
    return { x: (innerWidth - w) / 2, y: Math.max(72, (innerHeight - h) / 2 + 18), w, h };
  };

  const parts = (card) => ({
    inner: card.querySelector('.card-t__inner'),
    back: card.querySelector('.card-t__back'),
    front: card.querySelector('.card-t__front'),
  });

  const openCard = async (card) => {
    if (busy || open || !dealt) return;
    busy = true;
    const img = card.querySelector('.card-t__img');
    if (img && !img.complete) await img.decode().catch(() => {});
    const t = target(img);
    const { inner, back, front } = parts(card);
    open = { card, i: cards.indexOf(card) };
    card.classList.add('is-open');
    back.tabIndex = -1;
    back.setAttribute('aria-hidden', 'true');
    front.inert = false;
    shade.classList.add('is-on');
    gsap.to(shade, { opacity: 1, duration: dur(0.5) });
    gsap
      .timeline({
        defaults: { duration: dur(0.8), ease: 'power3.inOut' },
        onComplete: () => {
          busy = false;
          front.querySelector('.card-t__close').focus({ preventScroll: true });
        },
      })
      .to(card, { left: t.x, top: t.y, width: t.w, height: t.h }, 0)
      .to(inner, { rotationY: 180 }, 0);
  };

  const finishClose = (card) => {
    const { back, front } = parts(card);
    card.classList.remove('is-open');
    back.tabIndex = 0;
    back.removeAttribute('aria-hidden');
    front.inert = true;
    shade.classList.remove('is-on');
    open = null;
    busy = false;
    back.focus({ preventScroll: true });
  };

  const close = () => {
    if (!open || busy) return;
    busy = true;
    const { card, i } = open;
    const s = slots[i];
    gsap.to(shade, { opacity: 0, duration: dur(0.4) });
    gsap
      .timeline({ defaults: { duration: dur(0.7), ease: 'power3.inOut' }, onComplete: () => finishClose(card) })
      .to(card, { left: s.x, top: s.y, width: s.w, height: s.h }, 0)
      .to(parts(card).inner, { rotationY: 0 }, 0);
  };

  // No animation: the screen changed size, or the collage closed.
  const snapClose = () => {
    if (!open) return;
    const { card, i } = open;
    gsap.killTweensOf([card, parts(card).inner, shade]);
    gsap.set(parts(card).inner, { rotationY: 0 });
    gsap.set(shade, { opacity: 0 });
    gsap.set(card, { left: slots[i].x, top: slots[i].y, width: slots[i].w, height: slots[i].h });
    finishClose(card);
  };

  // A tab press swaps the set: if the cards were dealt, the old ones fade away and the new ones are dealt from the deck.
  const select = (id) => {
    if (id === part) return;
    const old = cards;
    const again = dealt;
    snapClose();
    const swap = () => {
      gsap.killTweensOf(all);
      gsap.set(all, { autoAlpha: 0, x: 0, y: 0, scale: 1, rotation: 0 });
      part = id;
      cards = all.filter((c) => c.dataset.part === id);
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.part === id)));
      busy = false;
      dealt = false;
      if (again) deal();
    };
    if (again && !busy && !reduced()) {
      busy = true;
      gsap.to(old, { autoAlpha: 0, scale: 0.85, duration: 0.25, stagger: 0.02, ease: 'power2.in', onComplete: swap });
    } else swap();
  };

  tabs.forEach((t) => t.addEventListener('click', () => select(t.dataset.part)));
  deck.addEventListener('click', () => (dealt ? collect() : deal()));
  all.forEach((card) => {
    const { back, front } = parts(card);
    back.addEventListener('click', () => openCard(card));
    front.addEventListener('click', (e) => !e.target.closest('a') && close());
  });
  shade.addEventListener('click', close);

  return {
    el,
    isOpen: () => !!open,
    close,
    trap(e) {
      const stops = [...parts(open.card).front.querySelectorAll('a, button')];
      const at = stops.indexOf(document.activeElement);
      e.preventDefault();
      stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
    },
    relayout() {
      if (!dealt) return;
      snapClose();
      layout();
    },
    reset() {
      snapClose();
      gsap.killTweensOf(all);
      gsap.set(all, { autoAlpha: 0, x: 0, y: 0, scale: 1, rotation: 0 });
      busy = false;
      setDealt(false);
    },
  };
}

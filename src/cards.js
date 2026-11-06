import gsap from 'gsap';

// The card tables of #/work and #/credentials. Closed, a table is clean: only the deck in the corner. Tap the deck and
// the cards fly out of it one after another and settle face down in the middle of the screen, left to right and top to
// bottom, like a deal in Spider Solitaire. Tap a card and it turns over while it grows into a large view that covers
// most of the page, not all of it. Esc, the backdrop or Close turns it back into its place; the deck gathers them again.
const ASPECT = 5 / 7; // card width / height
const GAP = 14;
const EDGE = { top: 76, bottom: 112, side: 20 }; // the header above; the deck and the Close pill below
const MAX_W = 300; // widest a card gets on a big screen
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
  const cards = [...el.querySelectorAll('[data-card]')];
  const text = { deal: deck.getAttribute('aria-label'), collect: root.dataset.collect };
  let dealt = false;
  let busy = false;
  let open = null; // { card, i }
  let slots = [];

  // The biggest 5:7 card for which all of them fit in the free area, as a grid of rows centered one by one.
  const layout = () => {
    const W = innerWidth;
    const areaW = W - 2 * EDGE.side;
    const areaH = innerHeight - EDGE.top - EDGE.bottom;
    const n = cards.length;
    let best = { w: 0, cols: 1 };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const w = Math.min((areaW - GAP * (cols - 1)) / cols, ((areaH - GAP * (rows - 1)) / rows) * ASPECT, MAX_W);
      if (w > best.w + 0.5) best = { w, cols };
    }
    const { w, cols } = best;
    const h = w / ASPECT;
    const rows = Math.ceil(n / cols);
    const top = EDGE.top + (areaH - (rows * h + (rows - 1) * GAP)) / 2;
    slots = cards.map((_, i) => {
      const r = Math.floor(i / cols);
      const inRow = Math.min(cols, n - r * cols);
      const rowW = inRow * w + (inRow - 1) * GAP;
      return { x: (W - rowW) / 2 + (i % cols) * (w + GAP), y: top + r * (h + GAP), w, h };
    });
    cards.forEach((c, i) => gsap.set(c, { left: slots[i].x, top: slots[i].y, width: w, height: h }));
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

  deck.addEventListener('click', () => (dealt ? collect() : deal()));
  cards.forEach((card) => {
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
      gsap.killTweensOf(cards);
      gsap.set(cards, { autoAlpha: 0, x: 0, y: 0, scale: 1, rotation: 0 });
      busy = false;
      setDealt(false);
    },
  };
}

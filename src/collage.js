import gsap from 'gsap';
import { getLenis } from './animations.js';

const ROUTE = '#/work';

// Work collage: a fullscreen layer (hash route #/work) holding tiles that pan with wheel, drag or arrow
// keys. Each tile moves at its own speed (parallax) and wraps around, so the field never runs out.
export function initCollage() {
  const root = document.querySelector('[data-collage]');
  const tiles = [...root.querySelectorAll('.tile')];
  const behind = [document.getElementById('main'), document.querySelector('.footer'), document.querySelector('.skip')];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cur = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let open = false;
  let opener = null;
  let origin = null; // viewport point the reveal grows from: the center of the clicked stack
  const title = root.querySelector('.collage__title');
  let field = { w: 0, h: 0 };
  let items = [];

  const measure = () => {
    field = { w: innerWidth * 1.5, h: innerHeight * 1.5 };
    items = tiles.map((el) => ({
      el,
      x0: el.dataset.x * field.w,
      y0: el.dataset.y * field.h,
      speed: reduced() ? 1 : +el.dataset.speed,
    }));
  };

  const tick = () => {
    const k = reduced() ? 1 : 0.08; // inertia
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    for (const t of items) {
      const x = gsap.utils.wrap(-field.w / 2, field.w / 2, t.x0 - cur.x * t.speed);
      const y = gsap.utils.wrap(-field.h / 2, field.h / 2, t.y0 - cur.y * t.speed);
      t.el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
    }
  };

  const sync = (animate = true) => {
    const want = location.hash === ROUTE;
    if (want === open) return;
    open = want;
    document.documentElement.classList.toggle('collage-open', open);
    behind.forEach((el) => (el.inert = open));
    root.inert = !open;
    const animated = animate && !reduced();
    // The page opens as a circle growing out of the clicked stack and closes back into it.
    const o = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
    const circle = (r) => `circle(${r}px at ${o.x}px ${o.y}px)`;
    const reach = Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
    if (open) {
      opener = document.activeElement;
      getLenis()?.stop();
      measure();
      cur.x = cur.y = target.x = target.y = 0;
      gsap.ticker.add(tick);
      tick();
      gsap.set(root, { autoAlpha: 1 }); // visible at once; the clip-path circle does the revealing
      gsap.fromTo(
        root,
        { clipPath: circle(0) },
        { clipPath: circle(reach), duration: animated ? 1 : 0, ease: 'power3.inOut', overwrite: true, clearProps: 'clipPath' },
      );
      gsap.fromTo(
        [title, ...tiles],
        { '--in': 0 },
        { '--in': 1, duration: animated ? 1 : 0, delay: animated ? 0.3 : 0, stagger: 0.05, ease: 'power3.out', overwrite: 'auto' },
      );
      root.querySelector('[data-collage-close]').focus({ preventScroll: true });
    } else {
      getLenis()?.start();
      gsap.fromTo(
        root,
        { clipPath: circle(reach) },
        {
          clipPath: circle(0),
          duration: animated ? 0.8 : 0,
          ease: 'power3.inOut',
          overwrite: true,
          onComplete: () => {
            gsap.set(root, { autoAlpha: 0, clearProps: 'clipPath' });
            gsap.ticker.remove(tick);
          },
        },
      );
      opener?.isConnected && opener.focus({ preventScroll: true });
    }
  };

  const go = (on) => {
    history.pushState(null, '', on ? ROUTE : location.pathname + location.search);
    sync();
  };

  // Capture phase: runs before the Lenis anchor handler, so the opener click is claimed here and an
  // in-page link (menu, header nav) closes the collage first and then scrolls normally.
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a');
      if (a?.matches('[data-open-collage]')) {
        e.preventDefault();
        const r = a.getBoundingClientRect();
        origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        go(true);
      } else if (open && a?.getAttribute('href')?.startsWith('#')) go(false);
    },
    true,
  );
  root.querySelector('[data-collage-close]').addEventListener('click', () => go(false));
  addEventListener('popstate', () => sync());
  addEventListener('resize', () => open && measure());

  root.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      target.x += e.deltaX;
      target.y += e.deltaY;
    },
    { passive: false },
  );

  // No pointer capture: it would retarget the click away from the tile links.
  let drag = null;
  let dragged = false;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-collage-close]')) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    root.classList.add('is-dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    target.x -= dx;
    target.y -= dy;
  });
  const endDrag = () => {
    if (!drag) return;
    dragged = drag.moved > 6;
    drag = null;
    root.classList.remove('is-dragging');
    setTimeout(() => (dragged = false));
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  root.addEventListener('click', (e) => dragged && (e.preventDefault(), e.stopPropagation()), true);

  addEventListener('keydown', (e) => {
    if (!open) return;
    const step = { ArrowLeft: [-160, 0], ArrowRight: [160, 0], ArrowUp: [0, -160], ArrowDown: [0, 160] }[e.key];
    if (step) {
      e.preventDefault();
      target.x += step[0];
      target.y += step[1];
    } else if (e.key === 'Escape') go(false);
  });

  sync(false); // deep link: opened straight on #/work
}

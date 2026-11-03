import gsap from 'gsap';
import { getLenis } from './animations.js';

// 3. Fullscreen menu: clip-path wipe + staggered links, focus trap, Esc to close.
// Works with or without motion: reduced motion just collapses the durations to 0.
export function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const links = [...menu.querySelectorAll('[data-menu-link]')];
  const labels = [...toggle.querySelectorAll('.menu-toggle__label')];
  const behind = [document.getElementById('main'), document.querySelector('.footer'), document.querySelector('.skip')];
  const trap = [toggle, ...links];
  const d = (s) => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : s);
  let open = false;

  gsap.set(menu, { clipPath: 'inset(0% 0% 100% 0%)' });
  gsap.set(links, { y: 40, opacity: 0 });
  const tl = gsap
    .timeline({ paused: true })
    .to(menu, { clipPath: 'inset(0% 0% 0% 0%)', duration: d(0.6), ease: 'power3.inOut' })
    .to(links, { y: 0, opacity: 1, duration: d(0.5), stagger: d(0.08), ease: 'power3.out' }, '-=0.25');

  const set = (next) => {
    open = next;
    toggle.setAttribute('aria-expanded', open);
    labels[0].setAttribute('aria-hidden', open);
    labels[1].setAttribute('aria-hidden', !open);
    document.documentElement.classList.toggle('menu-open', open);
    menu.inert = !open;
    behind.forEach((el) => (el.inert = open));
    if (open) {
      getLenis()?.stop();
      tl.play();
      links[0].focus({ preventScroll: true });
    } else {
      getLenis()?.start();
      tl.reverse();
    }
  };

  toggle.addEventListener('click', () => set(!open));
  links.forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      set(false);
      toggle.focus();
    } else if (e.key === 'Tab') {
      const i = trap.indexOf(document.activeElement);
      const next = trap[(i + (e.shiftKey ? -1 : 1) + trap.length) % trap.length];
      e.preventDefault();
      next.focus();
    }
  });
}

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;
export const getLenis = () => lenis;

// 1. Smooth scroll (Lenis) driven by the GSAP ticker; also owns in-page anchor links.
function smoothScroll() {
  lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const onClick = (e) => {
    const a = e.target.closest('a[href^="#"]');
    const target = a && document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target);
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    gsap.ticker.remove(tick);
    lenis.destroy();
    lenis = null;
  };
}

export function initAnimations() {
  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 768px)',
      fine: '(hover: hover) and (pointer: fine)',
    },
    (ctx) => {
      const { motion } = ctx.conditions;
      if (!motion) return; // reduced motion: content stays in its final, static state

      const cleanups = [smoothScroll()];
      // [anim-hooks]
      return () => cleanups.forEach((fn) => fn());
    },
  );
}

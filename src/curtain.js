import gsap from 'gsap';

// The one transition used for every view change (pages and collages): an ink curtain sweeps up, names the
// destination, the swap runs behind it, then the curtain lifts off the top. The scrollbar thumb is hidden
// meanwhile (html.is-transitioning; its width stays), so the jump caused by the swap never shows.
let busy = false;
let swapped = true; // false from the start of a sweep until its swap moment
const pending = [];
const textEl = () => document.querySelector('[data-curtain] span');

const run = (label) => {
  const el = document.querySelector('[data-curtain]');
  const text = textEl();
  const root = document.documentElement;
  busy = true;
  swapped = false;
  text.textContent = label;
  root.classList.add('is-transitioning');
  gsap
    .timeline({
      onComplete: () => {
        busy = false;
        root.classList.remove('is-transitioning');
        if (pending.length) run(label); // swaps requested after the swap moment get their own sweep
      },
    })
    .set(el, { display: 'grid', clipPath: 'inset(100% 0% 0% 0%)' })
    .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power3.inOut' })
    .fromTo(text, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.3')
    .add(() => {
      swapped = true;
      pending.splice(0).forEach((fn) => fn()); // every swap requested so far runs here, in order
    })
    .to(text, { y: -40, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.15')
    .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'power3.inOut' }, '-=0.1')
    .set(el, { display: 'none' });
};

// `swap` changes the view (and must read the current URL/target when it runs, not when it was queued).
export function sweep(label, swap) {
  pending.push(swap);
  if (busy) {
    if (!swapped) textEl().textContent = label; // the latest request names the destination
    return;
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) pending.splice(0).forEach((fn) => fn());
  else run(label);
}

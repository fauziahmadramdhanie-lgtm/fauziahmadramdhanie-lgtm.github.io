// The site's one transition: a circle that grows out of the link you clicked and shows the destination
// (collages and pages alike), and shrinks back into that link when a collage closes. Shared geometry only;
// collage.js and router.js run the tweens.
let origin = null; // viewport point the circle grows from: the center of the last clicked link

// Capture phase and registered on import (before collage.js and router.js attach theirs).
document.addEventListener(
  'click',
  (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const r = a.getBoundingClientRect();
    origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },
  true,
);

const at = () => origin ?? { x: innerWidth / 2, y: innerHeight / 2 }; // back button: no click, so the screen center
// dy: how far the clipped element's top is above the viewport's top (a page that is scrolled).
export const circle = (r, dy = 0) => `circle(${r}px at ${at().x}px ${at().y + dy}px)`;
export const reach = () => Math.hypot(Math.max(at().x, innerWidth - at().x), Math.max(at().y, innerHeight - at().y));

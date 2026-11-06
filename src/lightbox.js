import content from './content.json';

const { ui } = content;

// Click a picture in a collage ([data-zoom]) to see it large. Esc, the backdrop or Close dismisses it, and a tile that
// links somewhere (a work item) keeps its link inside the lightbox. Esc is caught first (capture, window) so it
// closes only the lightbox, not the collage under it.
export function initLightbox() {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <figure class="lightbox__fig">
      <img class="lightbox__img" alt="" />
      <figcaption class="lightbox__cap"><strong></strong><span></span><a class="lightbox__link" target="_blank" rel="noopener">${ui.visit}</a></figcaption>
    </figure>
    <button class="lightbox__close" type="button">${ui.close}</button>`;
  document.body.append(box);

  const img = box.querySelector('img');
  const title = box.querySelector('strong');
  const sub = box.querySelector('span');
  const link = box.querySelector('a');
  const closeBtn = box.querySelector('button');
  let opener = null;

  const open = (media) => {
    const tile = media.closest('.tile');
    const cap = tile.querySelector('.tile__cap');
    const name = cap.querySelector('.tile__title')?.textContent ?? cap.firstChild.textContent;
    opener = media;
    img.src = media.querySelector('img').currentSrc || media.querySelector('img').src;
    img.alt = name;
    title.textContent = name;
    sub.textContent = cap.querySelector('span')?.textContent ?? '';
    link.hidden = !tile.matches('a[href]');
    if (!link.hidden) link.href = tile.href;
    box.setAttribute('aria-label', name);
    box.hidden = false;
    closeBtn.focus({ preventScroll: true });
  };
  const close = () => {
    box.hidden = true;
    img.removeAttribute('src');
    opener?.isConnected && opener.focus?.({ preventScroll: true });
  };

  document.addEventListener('click', (e) => {
    const media = e.target.closest('[data-zoom]');
    if (!media) return;
    e.preventDefault(); // a work tile is a link: the picture opens the lightbox, its caption still follows the link
    open(media);
  });
  box.addEventListener('click', (e) => (e.target === box || e.target === closeBtn) && close());

  addEventListener(
    'keydown',
    (e) => {
      if (box.hidden) {
        const media = e.target.closest?.('[data-zoom][role="button"]');
        if (media && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          open(media);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      } else if (e.key === 'Tab') {
        // focus stays on the two controls inside the dialog
        const stops = link.hidden ? [closeBtn] : [link, closeBtn];
        const at = stops.indexOf(document.activeElement);
        e.preventDefault();
        stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
      }
    },
    true,
  );
}

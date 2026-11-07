// History for the two things a visitor can close: a collage and an inner page.
// Entries this session pushed are marked (state.own). Closing one of those steps back, so Back does not reopen what was
// just closed. A deep link has no earlier entry of ours, so its entry is replaced instead.
export const push = (url) => history.pushState({ own: true }, '', url);

// `url`: where the visitor ends up. `then`: runs the change itself when there is no popstate to do it (the replace case).
export const closeTo = (url, then) => {
  if (history.state?.own) return history.back(); // popstate follows and the owner of the route reacts to it
  history.replaceState(null, '', url);
  then();
};

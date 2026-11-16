// The language of this build (a build-time constant). The French and Spanish source copies set 'fr' / 'es'.
export const LANG = 'es';
// The language builds offered in the ⋯ menu (a build-time flag). The "Language" row is shown only when this lists more
// than one language: remove a code here if its build is not ready.
export const LANGS = ['en', 'fr', 'es'];

// Address of the same page in another language, keeping the query and the hash (the current view).
// Offline files side by side: firebridge.html ↔ firebridge.fr.html ↔ firebridge.es.html. Anything else (hosted:
// …/, …/index.html, …/fr.html, …/es.html): ./ (English) ↔ ./fr.html ↔ ./es.html. Pure: `location` is a Location,
// a URL or a string.
export function langUrl(target, location) {
  const u = new URL(typeof location === 'string' ? location : location.href);
  const i = u.pathname.lastIndexOf('/'), dir = u.pathname.slice(0, i + 1), name = u.pathname.slice(i + 1);
  const offline = /^firebridge(\.(fr|es))?\.html$/i.test(name);
  u.pathname = dir + (offline ? (target === 'en' ? 'firebridge.html' : 'firebridge.' + target + '.html') : (target === 'en' ? '' : target + '.html'));
  return u.href;
}

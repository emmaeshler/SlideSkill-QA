import './style.css';
import { createNav } from './components/nav.js';
import { mount as mountProgression } from './pages/progression.js';
import { mount as mountConversion } from './pages/conversion.js';
import { mount as mountAllVersions } from './pages/all-versions.js';

const navEl = document.getElementById('siteNav');
const appEl = document.getElementById('app');

let cleanup = null;

function navigate(pageId) {
  if (cleanup) cleanup();
  window.location.hash = pageId;
  if (pageId === 'conversion') {
    cleanup = mountConversion(appEl);
  } else if (pageId === 'all-versions') {
    cleanup = mountAllVersions(appEl);
  } else {
    cleanup = mountProgression(appEl);
  }
}

const nav = createNav(navEl, { onNavigate: navigate });

function initFromHash() {
  const hash = window.location.hash.replace('#', '') || 'all-versions';
  nav.render(hash);
  navigate(hash);
}

window.addEventListener('hashchange', initFromHash);
initFromHash();

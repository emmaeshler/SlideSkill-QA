import './style.css';
import { createNav } from './components/nav.js';
import { mount as mountProgression } from './pages/progression.js';
import { mount as mountConversion } from './pages/conversion.js';
import { mount as mountAllVersions } from './pages/all-versions.js';
import { mount as mountSkeletons } from './pages/skeletons.js';
import { mount as mountGoldens } from './pages/goldens.js';
import { mount as mountTemplates } from './pages/templates.js';

const navEl = document.getElementById('siteNav');
const appEl = document.getElementById('app');

let cleanup = null;

function navigate(pageId) {
  if (cleanup) cleanup();
  const page = pageId.split('/')[0];
  window.location.hash = page;
  if (page === 'conversion') {
    cleanup = mountConversion(appEl);
  } else if (page === 'all-versions') {
    cleanup = mountAllVersions(appEl);
  } else if (page === 'skeletons') {
    cleanup = mountSkeletons(appEl);
  } else if (page === 'templates') {
    cleanup = mountTemplates(appEl);
  } else if (page === 'goldens') {
    cleanup = mountGoldens(appEl);
  } else {
    cleanup = mountProgression(appEl);
  }
}

const nav = createNav(navEl, { onNavigate: navigate });

function initFromHash() {
  const hash = window.location.hash.replace('#', '') || 'all-versions';
  const page = hash.split('/')[0];
  nav.render(page);
  navigate(hash);
}

window.addEventListener('hashchange', initFromHash);
initFromHash();

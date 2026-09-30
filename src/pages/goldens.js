import { createModal } from '../components/modal.js';

const GOLDENS_DIR = 'goldens';

const GOLDENS = [
  'golden-01-analyst-dataviz-stacked-revenue',
  'golden-02-analyst-dataviz-ranking-composition',
  'golden-03-executive-argument-problem-cause-fix',
  'golden-04-executive-process-flywheel-thesis',
  'golden-05-analyst-dataviz-waterfall-bridge',
  'golden-06-consultant-benchmark-margin-comparison',
  'golden-07-consultant-maturity-operations',
  'golden-08-consultant-reference-fx-rates',
  'golden-09-executive-dataviz-waterfall-margin',
  'golden-10-executive-argument-price-dispersion',
  'golden-11-analyst-dataviz-stacked-quarterly',
  'golden-12-executive-dataviz-contribution-growth',
  'golden-13-strategist-progress-adoption',
  'golden-14-strategist-feature-announcement',
  'golden-15-strategist-progress-dual-track',
  'golden-16-executive-pipeline-bottleneck-funnel',
  'golden-16-strategist-action-plan-training-strategy',
  'golden-17-strategist-strategy-recap-pricing-logic',
  'golden-18-executive-comparison-before-after',
];

const ANTI_GOLDENS = [
  'anti-golden-01-icon-emoji-bullets',
  'anti-golden-02-subject-palette-subtle',
  'anti-golden-03-data-without-geometry',
  'anti-golden-04-over-engineered-reference',
];

function parseGoldenName(filename) {
  const noPrefix = filename.replace(/^(anti-)?golden-\d+[a-z]?-/, '');
  return noPrefix.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function personaFromFilename(filename) {
  const match = filename.match(/^(?:anti-)?golden-\d+[a-z]?-(\w+)-/);
  return match ? match[1] : null;
}

export function mount(root) {
  root.innerHTML = `
    <main class="wrap" style="padding-top:52px">
      <header class="mast">
        <h1>Goldens</h1>
        <p style="color:var(--soft);max-width:72ch;margin-bottom:4px">Reference slides that define what good looks like — and anti-goldens that show what to avoid.</p>
        <div class="meta">
          <span>${GOLDENS.length} goldens</span>
          <span>${ANTI_GOLDENS.length} anti-goldens</span>
        </div>
      </header>

      <section>
        <h2 style="font:600 16px/1.3 var(--display);margin:0 0 16px;color:var(--ink)">Goldens</h2>
        <div id="goldensGrid" class="goldens-grid"></div>
      </section>

      <section style="margin-top:48px">
        <h2 style="font:600 16px/1.3 var(--display);margin:0 0 16px;color:var(--bad)">Anti-Goldens</h2>
        <div id="antiGoldensGrid" class="goldens-grid"></div>
      </section>
    </main>
    <div id="modal" class="modal" role="dialog" aria-modal="true" aria-label="Zoomed screenshot">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="modal-bar"><span id="modalTitle"></span></div>
      <img id="modalImage" alt="Zoomed view">
      <div class="hint">ESC to close</div>
    </div>
    <footer class="foot"><div class="wrap foot-line"><span>Pepper · Goldens</span></div></footer>`;

  const modal = createModal(root.querySelector('#modal'));

  function renderGrid(container, items, isAnti) {
    items.forEach(name => {
      const persona = personaFromFilename(name);
      const label = parseGoldenName(name);
      const src = `${GOLDENS_DIR}/${name}.png`;
      const id = name.match(/^(?:anti-)?golden-(\d+)/)?.[1] || '';

      const card = document.createElement('div');
      card.className = 'golden-card' + (isAnti ? ' anti' : '');
      card.innerHTML = `
        <div class="golden-thumb-wrap">
          <img class="golden-thumb" src="${src}" alt="${name}" loading="lazy">
        </div>
        <div class="golden-info">
          <div class="golden-id">${isAnti ? 'Anti-' : ''}Golden ${id}</div>
          <div class="golden-label">${label}</div>
          ${persona ? `<span class="skel-badge persona-${persona}">${persona}</span>` : ''}
        </div>`;

      card.querySelector('.golden-thumb').addEventListener('click', () => {
        root.querySelector('#modalTitle').textContent = `${isAnti ? 'Anti-' : ''}Golden ${id} — ${label}`;
        root.querySelector('#modalImage').src = src;
        root.querySelector('#modal').classList.add('open');
      });

      container.appendChild(card);
    });
  }

  renderGrid(root.querySelector('#goldensGrid'), GOLDENS, false);
  renderGrid(root.querySelector('#antiGoldensGrid'), ANTI_GOLDENS, true);

  const keyHandler = (e) => {
    if (e.key === 'Escape') modal.close();
  };
  window.addEventListener('keydown', keyHandler);

  return () => {
    window.removeEventListener('keydown', keyHandler);
    root.innerHTML = '';
  };
}

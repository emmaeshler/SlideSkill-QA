import SKELETONS_INDEX from '../data/skeletons-index.json';
import { createModal } from '../components/modal.js';
/* skeleton data v2 */

const TESTS = [
  {
    id: 'skeleton-03-leakage',
    title: 'FY25 Margin Leakage — Executive Argument',
    skeleton: 'skeleton-03a',
    persona: 'executive',
    golden: 'golden-03',
    duration: 160,
    tools: 9,
    baseline: 551,
    goldenPreview: 'html-to-pptx/screenshots/golden-03-reference.png',
    outputPreview: 'html-to-pptx/screenshots/skeleton-03-margin-leakage-executive.png',
    outputHtml: 'presentations/fy25-margin-leakage-executive.html',
  },
  {
    id: 'skeleton-05-novapack',
    title: 'NovaPack Gross Margin Bridge — Analyst Waterfall',
    skeleton: 'skeleton-05a',
    persona: 'analyst',
    golden: 'golden-05',
    duration: 330,
    tools: 9,
    baseline: 551,
    goldenPreview: 'html-to-pptx/screenshots/golden-05-reference.png',
    outputPreview: 'html-to-pptx/screenshots/skeleton-05-novapack-waterfall-analyst.png',
    outputHtml: 'presentations/novapack-margin-bridge-analyst.html',
  },
  {
    id: 'skeleton-14-dashboard',
    title: 'Dashboard Insights — Strategist Feature Announcement',
    skeleton: 'skeleton-14a',
    persona: 'strategist',
    golden: 'golden-14',
    duration: 124,
    tools: 8,
    baseline: 551,
    goldenPreview: 'html-to-pptx/screenshots/golden-14-reference.png',
    outputPreview: 'html-to-pptx/screenshots/skeleton-14-dashboard-insights-strategist.png',
    outputHtml: 'presentations/dashboard-insights-announcement-strategist.html',
  },
];

function statusBadge(variant) {
  if (variant._status === 'planned') return '<span class="skel-badge planned">Planned</span>';
  if (variant._status === 'draft') return '<span class="skel-badge draft">Draft</span>';
  return '<span class="skel-badge built">Built</span>';
}

function personaBadges(personas) {
  const ALL_FOUR = ['analyst', 'executive', 'consultant', 'strategist'];
  if (personas.length === ALL_FOUR.length && ALL_FOUR.every(p => personas.includes(p))) {
    return '<span class="skel-badge persona-all">all</span>';
  }
  return personas.map(p => `<span class="skel-badge persona-${p}">${p}</span>`).join('');
}

function goldenPreviewPath(goldenId, variant) {
  if (variant && variant.preview) return variant.preview;
  if (!goldenId) return null;
  return `html-to-pptx/screenshots/${goldenId}-reference.png`;
}

export function mount(root) {
  const families = SKELETONS_INDEX.families;
  const totalVariants = families.reduce((s, f) => s + f.variants.length, 0);
  const builtVariants = families.reduce((s, f) => s + f.variants.filter(v => !v._status).length, 0);
  const draftVariants = families.reduce((s, f) => s + f.variants.filter(v => v._status === 'draft').length, 0);
  const plannedVariants = totalVariants - builtVariants - draftVariants;

  root.innerHTML = `
    <main class="wrap" style="padding-top:52px">
      <header class="mast">
        <h1>Skeleton coverage</h1>
        <p style="color:var(--soft);max-width:72ch;margin-bottom:4px">Families group slides by argument type. Each family has emphasis variants — same data, different visual weight. Built variants are ready for the fast path; planned variants fall through to the full builder.</p>
        <div class="meta">
          <span>${families.length} families</span>
          <span>${builtVariants} built</span>
          <span>${draftVariants} draft</span>
          <span>${plannedVariants} planned</span>
          <span>${totalVariants} total variants</span>
        </div>
      </header>
      <div class="sticky-search">
        <div style="display:flex;gap:8px;max-width:540px;align-items:center">
          <div class="search-bar" style="flex:1">
            <input id="skelSearch" type="text" placeholder="Filter by ID or name… e.g. 3b">
          </div>
          <select id="skelPersona" style="height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;font:13px var(--body);color:var(--ink);background:var(--card);cursor:pointer">
            <option value="">All personas</option>
            <option value="executive">Executive</option>
            <option value="analyst">Analyst</option>
            <option value="consultant">Consultant</option>
            <option value="strategist">Strategist</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:4px;margin:8px 0 0">
          <button class="content-tab active" data-tab="coverage">Coverage Map</button>
          <button class="content-tab" data-tab="tests">Build Tests</button>
        </div>
      </div>

      <section id="tab-coverage">
        <div id="familyGrid"></div>
      </section>

      <section id="tab-tests" style="display:none">
        <div id="testGrid"></div>
      </section>
    </main>
    <div id="modal" class="modal" role="dialog" aria-modal="true" aria-label="Zoomed screenshot">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="modal-bar"><span id="modalTitle"></span></div>
      <div id="modalFormatToggle" class="modal-format-toggle" style="display:none">
        <button class="format-toggle-btn active" data-format="html">HTML</button>
        <button class="format-toggle-btn" data-format="pptx">PPTX</button>
      </div>
      <img id="modalImage" alt="Zoomed view">
      <div class="hint">ESC to close</div>
    </div>
    <footer class="foot"><div class="wrap foot-line"><span>Pepper · Skeleton Coverage</span></div></footer>`;

  const modal = createModal(root.querySelector('#modal'));

  let currentTab = 'coverage';
  root.querySelectorAll('.content-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      root.querySelectorAll('.content-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
      root.querySelector('#tab-coverage').style.display = currentTab === 'coverage' ? '' : 'none';
      root.querySelector('#tab-tests').style.display = currentTab === 'tests' ? '' : 'none';
    });
  });

  renderCoverage();
  renderTests();

  const skelSearchInput = root.querySelector('#skelSearch');
  const skelPersonaSelect = root.querySelector('#skelPersona');

  function applyFilter() {
    const q = skelSearchInput.value.trim().toLowerCase();
    const persona = skelPersonaSelect.value;
    const cards = root.querySelectorAll('#familyGrid .skel-card');

    if (currentTab !== 'coverage') {
      root.querySelector('.content-tab[data-tab="coverage"]').click();
    }

    cards.forEach((card, i) => {
      const family = families[i];
      const textMatch = !q || family.family.toLowerCase().includes(q)
        || family.description.toLowerCase().includes(q)
        || family.variants.some(v => v.id.toLowerCase().includes(q));
      const personaMatch = !persona
        || family.variants.some(v => v.personas.includes(persona));
      card.style.display = textMatch && personaMatch ? '' : 'none';
    });
  }

  skelSearchInput.addEventListener('input', applyFilter);
  skelPersonaSelect.addEventListener('change', applyFilter);

  function openZoom(title, htmlSrc, pptxSrc) {
    root.querySelector('#modalTitle').textContent = title;
    root.querySelector('#modalImage').src = htmlSrc;
    const toggleWrap = root.querySelector('#modalFormatToggle');
    if (pptxSrc) {
      toggleWrap.style.display = '';
      const btns = toggleWrap.querySelectorAll('.format-toggle-btn');
      btns.forEach(b => b.classList.toggle('active', b.dataset.format === 'html'));
      btns.forEach(b => {
        b.onclick = () => {
          btns.forEach(x => x.classList.toggle('active', x === b));
          root.querySelector('#modalImage').src = b.dataset.format === 'html' ? htmlSrc : pptxSrc;
        };
      });
    } else {
      toggleWrap.style.display = 'none';
    }
    root.querySelector('#modal').classList.add('open');
  }

  function renderCoverage() {
    const grid = root.querySelector('#familyGrid');
    grid.innerHTML = '';

    families.forEach(family => {
      const builtCount = family.variants.filter(v => !v._status).length;
      const totalCount = family.variants.length;

      const card = document.createElement('div');
      card.className = 'skel-card';
      card.innerHTML = `
        <div class="skel-header">
          <div>
            <div class="skel-title">${family.family}</div>
            <div style="font:12px/1.5 var(--body);color:var(--soft);margin-top:4px">${family.description}</div>
          </div>
          <div class="skel-badges">
            <span class="skel-badge built">${builtCount}/${totalCount} built</span>
          </div>
        </div>
        <div style="padding:0;overflow-x:auto">
          <table class="variant-table">
            <colgroup>
              <col style="width:160px">
              <col style="width:120px">
              <col style="width:100px">
              <col style="width:100px">
              <col style="width:140px">
              <col style="width:70px">
              <col style="width:80px">
              <col style="width:90px">
              <col style="width:180px">
            </colgroup>
            <thead>
              <tr>
                <th>Variant</th>
                <th>Preview</th>
                <th>Emphasis</th>
                <th>Personas</th>
                <th>Data shape</th>
                <th>Items</th>
                <th>Status</th>
                <th>PPTX</th>
                <th>Layout</th>
              </tr>
            </thead>
            <tbody>
              ${family.variants.map(v => {
                const preview = goldenPreviewPath(v.source_golden, v);
                const pptxPreview = v.pptx_preview || null;
                const isPlanned = v._status === 'planned';
                const hasBoth = preview && pptxPreview && !isPlanned;
                return `
                <tr class="${isPlanned ? 'row-planned' : 'row-built'}">
                  <td><strong>${v.id}</strong>${v.source_golden ? `<br><span style="color:var(--faint);font:10px var(--mono)">${v.source_golden}</span>` : ''}</td>
                  <td class="preview-cell">${preview && !isPlanned
                    ? `<img class="variant-thumb" src="${preview}" alt="${v.id}" data-title="${v.id} — ${v.name}" data-src="${preview}"${pptxPreview ? ` data-pptx-src="${pptxPreview}"` : ''}>${hasBoth ? `<div class="format-toggle-row"><button class="format-toggle-btn small active" data-format="html">HTML</button><button class="format-toggle-btn small" data-format="pptx">PPTX</button></div>` : ''}`
                    : `<span class="variant-empty-thumb">${isPlanned ? '—' : '?'}</span>`
                  }</td>
                  <td><span class="emphasis-chip">${v.emphasis}</span></td>
                  <td>${personaBadges(v.personas)}</td>
                  <td>${v.data_shape.map(d => `<span class="shape-chip">${d}</span>`).join(' ')}</td>
                  <td style="font:12px var(--mono);text-align:center">${v.item_count[0]}–${v.item_count[1]}</td>
                  <td>${statusBadge(v)}</td>
                  <td class="pptx-cell">${v.pptx
                    ? `<a class="pptx-link" href="${v.pptx}" download title="Download PPTX">⬇ .pptx</a>`
                    : `<span style="color:var(--faint)">—</span>`
                  }</td>
                  <td style="font:12px/1.4 var(--body);color:var(--soft)">${v.layout}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="padding:12px 24px;border-top:1px solid var(--line);background:var(--paper)">
          <details>
            <summary style="font:600 11px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--soft);cursor:pointer;padding:4px 0">Emphasis question</summary>
            <div style="margin-top:10px;font:13px/1.5 var(--body);color:var(--ink)">
              <strong>${family.emphasis_question.prompt}</strong>
              <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px">
                ${family.emphasis_question.options.map(o => `
                  <div style="flex:1;min-width:180px;padding:10px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card)">
                    <div style="font:600 13px/1.3 var(--display)">${o.label}${o.default ? ' *' : ''}</div>
                    <div style="font:12px/1.4 var(--body);color:var(--soft);margin-top:2px">${o.description}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </details>
        </div>`;

      card.querySelectorAll('.variant-thumb').forEach(img => {
        img.addEventListener('click', () => {
          openZoom(img.dataset.title, img.dataset.src, img.dataset.pptxSrc || null);
        });
      });

      card.querySelectorAll('.format-toggle-row').forEach(row => {
        const img = row.previousElementSibling;
        const htmlSrc = img.dataset.src;
        const pptxSrc = img.dataset.pptxSrc;
        row.querySelectorAll('.format-toggle-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            row.querySelectorAll('.format-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
            img.src = btn.dataset.format === 'html' ? htmlSrc : pptxSrc;
          });
        });
      });

      grid.appendChild(card);
    });
  }

  function renderTests() {
    const grid = root.querySelector('#testGrid');
    grid.innerHTML = '';

    if (!TESTS.length) {
      grid.innerHTML = '<p style="text-align:center;color:var(--faint);font:13px var(--mono);padding:48px">No test results yet</p>';
      return;
    }

    const avg = Math.round(TESTS.reduce((s, t) => s + t.duration, 0) / TESTS.length);
    grid.insertAdjacentHTML('beforeend', `<div class="meta" style="margin-bottom:20px"><span>${TESTS.length} tests</span><span>avg ${avg}s</span><span>baseline ${TESTS[0].baseline}s</span></div>`);

    TESTS.forEach(t => {
      const pctSaved = Math.round((1 - t.duration / t.baseline) * 100);
      const card = document.createElement('div');
      card.className = 'skel-card';
      card.innerHTML = `
        <div class="skel-header">
          <div class="skel-title">${t.title}</div>
          <div class="skel-badges">
            <span class="skel-badge time">${t.duration}s</span>
            <span class="skel-badge tools">${t.tools} tools</span>
            <span class="skel-badge delta">&minus;${pctSaved}% vs full</span>
          </div>
        </div>
        <div class="skel-body skel-body-3">
          <div class="skel-pane">
            <div class="skel-pane-label">Golden reference (${t.golden})</div>
            <img src="${t.goldenPreview}" alt="${t.golden} reference">
          </div>
          <div class="skel-pane">
            <div class="skel-pane-label">Skeleton output (${t.skeleton})</div>
            <img src="${t.outputPreview}" alt="${t.id} output">
          </div>
          <div class="skel-pane" style="display:flex;flex-direction:column;gap:12px">
            <div class="skel-pane-label">Build stats</div>
            <table style="font:12px/1.6 var(--mono);color:var(--ink);width:100%;border-collapse:collapse">
              <tr><td style="color:var(--faint)">Skeleton</td><td style="text-align:right;font-weight:700">${t.skeleton}</td></tr>
              <tr><td style="color:var(--faint)">Persona</td><td style="text-align:right;font-weight:700">${t.persona}</td></tr>
              <tr style="border-top:1px solid var(--line)"><td style="color:var(--faint)">Duration</td><td style="text-align:right;font-weight:700;color:#2e7d32">${t.duration}s</td></tr>
              <tr><td style="color:var(--faint)">Tool uses</td><td style="text-align:right;font-weight:700">${t.tools}</td></tr>
              <tr><td style="color:var(--faint)">Baseline</td><td style="text-align:right;font-weight:700;color:var(--soft)">${t.baseline}s / 19 tools</td></tr>
              <tr style="border-top:1px solid var(--line)"><td style="color:var(--faint)">Savings</td><td style="text-align:right;font-weight:700;color:#e65100">&minus;${pctSaved}% (${t.baseline - t.duration}s)</td></tr>
            </table>
            <a href="${t.outputHtml}" target="_blank" style="display:inline-block;margin-top:auto;padding:6px 14px;border:1px solid var(--line);border-radius:6px;font:600 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--accent);text-decoration:none;text-align:center">Open HTML &nearr;</a>
          </div>
        </div>`;

      card.querySelectorAll('.skel-pane img').forEach(img => {
        img.addEventListener('click', () => {
          root.querySelector('#modalTitle').textContent = t.title;
          root.querySelector('#modalImage').src = img.src;
          root.querySelector('#modal').classList.add('open');
        });
      });

      grid.appendChild(card);
    });
  }

  const keyHandler = (e) => {
    if (e.key === 'Escape') modal.close();
  };
  window.addEventListener('keydown', keyHandler);

  return () => {
    window.removeEventListener('keydown', keyHandler);
    root.innerHTML = '';
  };
}

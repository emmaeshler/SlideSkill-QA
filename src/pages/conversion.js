import MODEL from '../data/pptx-conversion.json';
import MODEL_B from '../data/pptx-conversion-v5.json';
import { createMatrix } from '../components/matrix.js';
import { createModal, createCompare } from '../components/modal.js';

function headerLabel(v) {
  if (v === 'html-source') return 'HTML Source';
  return v.replace('gen-', 'Gen ');
}

function colClass(v) {
  return v === 'html-source' ? 'html-col' : 'pptx-col';
}

export function mount(root) {
  root.innerHTML = `
    <main class="wrap" style="padding-top:52px">
      <header class="mast">
        <h1>PowerPoint conversion</h1>
        <p style="color:var(--soft);max-width:72ch;margin-bottom:4px">These slides are built with PptxGenJS, which renders native PowerPoint charts. think-cell is not available on Mac, so chart fidelity here reflects the PptxGenJS engine only.</p>
        <div style="display:flex;align-items:center;gap:4px;margin:18px 0 12px">
          <button class="content-tab active" data-tab="conversion">HTML&rarr;PPTX V4</button>
          <button class="content-tab" data-tab="new-skill">HTML&rarr;PPTX V5</button>
        </div>
        <div class="meta">
          <span id="tabMeta">${MODEL.cases.length} cases · ${MODEL.versions.length - 1} generations · all gen-2 complete</span>
          <button id="compareToggle" class="compare-toggle">Compare slides</button>
        </div>
        <div id="compareBar" class="compare-bar">
          <span id="compareStatus" class="compare-status">Click two slides to compare</span>
          <button id="compareClearBtn" class="compare-clear">Clear</button>
        </div>
      </header>
      <section id="tab-conversion" class="matrix-wrap" aria-label="HTML to PPTX conversion matrix">
        <div id="matrix" class="matrix"></div>
      </section>
      <section id="tab-new-skill" class="matrix-wrap" style="display:none" aria-label="New skill conversion matrix">
        <div id="matrix2" class="matrix"></div>
      </section>
    </main>
    <div id="modal" class="modal" role="dialog" aria-modal="true" aria-label="Zoomed screenshot">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="modal-bar"><span id="modalTitle"></span></div>
      <div id="modalPersonaTabs" style="display:none"></div>
      <img id="modalImage" alt="Zoomed view">
      <div class="hint">&larr; / &rarr; adjacent column</div>
      <div id="modalPromptWrap" style="display:none"><div id="modalPrompt"></div><button id="modalCopyBtn" style="display:none">Copy</button></div>
    </div>
    <div id="compareModal" class="compare-modal" role="dialog" aria-modal="true" aria-label="Side-by-side comparison">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="compare-modal-bar"><span id="compareTitle">Comparison</span><button id="compareCopyPng" class="compare-copy-png">Copy as PNG</button></div>
      <div class="compare-panes">
        <div class="compare-pane"><div id="compareLabel1" class="compare-pane-label"></div><img id="compareImg1" alt="Selection A"></div>
        <div class="compare-pane"><div id="compareLabel2" class="compare-pane-label"></div><img id="compareImg2" alt="Selection B"></div>
      </div>
    </div>
    <footer class="foot"><div class="wrap foot-line"><span>Pepper · PowerPoint Skill</span></div></footer>`;

  const matrixEl = root.querySelector('#matrix');
  const matrix2El = root.querySelector('#matrix2');
  const gridA = createMatrix(matrixEl, { cellWidth: 360 });
  const gridB = createMatrix(matrix2El, { cellWidth: 360 });
  const modal = createModal(root.querySelector('#modal'));
  const compare = createCompare(root.querySelector('#compareModal'));

  let currentTab = 'conversion';
  let compareMode = false;
  const activeSource = {};
  const activeSource2 = {};

  MODEL.cases.forEach((c, ci) => {
    const cell = c.cells['html-source'];
    if (cell && cell.sources) activeSource[ci] = cell.default || cell.sources.length - 1;
  });

  MODEL_B.cases.forEach((c, ci) => {
    const cell = c.cells && c.cells['html-source'];
    if (cell && cell.sources) activeSource2[ci] = cell.default || cell.sources.length - 1;
  });

  function getModel() { return currentTab === 'conversion' ? MODEL : MODEL_B; }

  function resolveCell(c, ci, v) {
    const cell = c.cells[v];
    if (v === 'html-source' && cell && cell.sources) {
      const src = currentTab === 'conversion' ? activeSource : activeSource2;
      const idx = src[ci] != null ? src[ci] : (cell.default != null ? cell.default : cell.sources.length - 1);
      return cell.sources[idx];
    }
    return cell;
  }

  function sourceSelector(c, ci) {
    const cell = c.cells['html-source'];
    if (cell && cell.sources) {
      const idx = activeSource[ci] != null ? activeSource[ci] : (cell.default != null ? cell.default : cell.sources.length - 1);
      let html = '<span class="source-select"><select data-ci="' + ci + '">';
      cell.sources.forEach((s, si) => {
        html += '<option value="' + si + '"' + (si === idx ? ' selected' : '') + '>HTML · ' + s.label + '</option>';
      });
      return html + '</select></span>';
    }
    return '';
  }

  function renderA() {
    gridA.updateGrid(MODEL.versions);
    matrixEl.innerHTML =
      '<div class="head corner">Case</div>' +
      MODEL.versions.map((v, vi) => {
        const label = headerLabel(v);
        return `<div class="head ${colClass(v)}${gridA.collapsed.has(vi) ? ' collapsed' : ''}" data-vi="${vi}"><button class="collapse-btn" title="Collapse column">«</button><span class="head-content">${label}</span><span class="head-vlabel">${label}</span></div>`;
      }).join('');

    matrixEl.querySelectorAll('.collapse-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        gridA.toggleColumn(parseInt(btn.closest('.head').dataset.vi), MODEL.versions);
      });
    });

    MODEL.cases.forEach((c, ci) => {
      const resolved = resolveCell(c, ci, 'html-source');
      const sourceLabel = c.cells['html-source']?.sources
        ? c.cells['html-source'].sources[activeSource[ci] != null ? activeSource[ci] : c.cells['html-source'].default].label
        : '';
      matrixEl.insertAdjacentHTML('beforeend',
        `<div class="case-head"><strong>${c.title}</strong><span class="case-id">${c.id}${sourceLabel ? ' · ' + sourceLabel : ''}</span>${c.source ? `<div class="case-source">${c.source}</div>` : ''}</div>`
      );

      MODEL.versions.forEach((v, vi) => {
        const cell = resolveCell(c, ci, v);
        const img = cell ? cell.preview : null;
        const el = document.createElement('div');
        el.className = 'cell' + (gridA.collapsed.has(vi) ? ' collapsed' : '');
        el.dataset.ci = ci;
        el.dataset.vi = vi;
        el.dataset.tab = 'conversion';
        el.innerHTML =
          (img
            ? `<button class="image-button"><img src="${img}" alt="${c.title} · ${headerLabel(v)}"></button>`
            : '<div class="image-button"><span class="empty">No artifact</span></div>') +
          '<span class="select-badge"></span>' +
          '<div class="cell-foot">' +
          (v === 'html-source' ? sourceSelector(c, ci) : '') +
          (cell?.pptx ? `<a href="${cell.pptx}" download>Download .pptx</a>` : cell?.html ? `<a href="${cell.html}" target="_blank">Open HTML ↗</a>` : '') +
          '</div>';

        if (img) {
          el.querySelector('.image-button').addEventListener('click', () => {
            if (compareMode) { handleCompareClick(ci, vi); return; }
            modal.open(ci, vi);
          });
        }
        matrixEl.append(el);
      });
    });

    matrixEl.querySelectorAll('.source-select select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        activeSource[+e.target.dataset.ci] = +e.target.value;
        renderA();
      });
    });
  }

  function renderB() {
    const m = MODEL_B;
    gridB.updateGrid(m.versions);
    matrix2El.innerHTML =
      '<div class="head corner">Case</div>' +
      m.versions.map((v, vi) => {
        const label = headerLabel(v);
        return `<div class="head ${colClass(v)}${gridB.collapsed.has(vi) ? ' collapsed' : ''}" data-vi="${vi}"><button class="collapse-btn" title="Collapse column">«</button><span class="head-content">${label}</span><span class="head-vlabel">${label}</span></div>`;
      }).join('');

    matrix2El.querySelectorAll('.collapse-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        gridB.toggleColumn(parseInt(btn.closest('.head').dataset.vi), m.versions);
      });
    });

    if (!m.cases.length) {
      matrix2El.insertAdjacentHTML('beforeend',
        '<div class="case-head" style="grid-column:1/-1;text-align:center;padding:48px;color:var(--faint);font:13px var(--mono)">No cases yet</div>'
      );
      return;
    }

    m.cases.forEach((c, ci) => {
      matrix2El.insertAdjacentHTML('beforeend',
        `<div class="case-head"><strong>${c.title}</strong><span class="case-id">${c.id}</span>${c.source ? `<div class="case-source">${c.source}</div>` : ''}</div>`
      );

      m.versions.forEach((v, vi) => {
        let cell = c.cells[v];
        if (v === 'html-source' && cell && cell.sources) {
          const idx = activeSource2[ci] != null ? activeSource2[ci] : (cell.default != null ? cell.default : cell.sources.length - 1);
          cell = cell.sources[idx];
        }
        const img = cell ? cell.preview : null;
        const el = document.createElement('div');
        el.className = 'cell' + (gridB.collapsed.has(vi) ? ' collapsed' : '');
        el.dataset.ci = ci;
        el.dataset.vi = vi;
        el.dataset.tab = 'new-skill';
        el.innerHTML =
          (img
            ? `<button class="image-button"><img src="${img}" alt="${c.title} · ${headerLabel(v)}"></button>`
            : '<div class="image-button"><span class="empty">No artifact</span></div>') +
          '<span class="select-badge"></span>' +
          '<div class="cell-foot">' +
          (cell?.pptx ? `<a href="${cell.pptx}" download>Download .pptx</a>` : cell?.html ? `<a href="${cell.html}" target="_blank">Open HTML ↗</a>` : '') +
          '</div>';

        if (img) {
          el.querySelector('.image-button').addEventListener('click', () => {
            if (compareMode) { handleCompareClick(ci, vi); return; }
            currentTab = 'new-skill';
            modal.open(ci, vi);
          });
        }
        matrix2El.append(el);
      });
    });
  }

  modal.setUpdateHandler((active, els) => {
    const m = getModel();
    const c = m.cases[active.ci];
    const v = m.versions[active.vi];
    const cell = resolveCell(c, active.ci, v);
    const img = cell ? cell.preview : null;
    els.titleEl.textContent = c.title + ' · ' + headerLabel(v);
    els.imageEl.src = img || '';
    els.imageEl.style.visibility = img ? 'visible' : 'hidden';
  });

  // Compare mode
  const toggleBtn = root.querySelector('#compareToggle');
  const compareBar = root.querySelector('#compareBar');
  const compareStatus = root.querySelector('#compareStatus');

  toggleBtn.addEventListener('click', () => {
    compareMode = !compareMode;
    toggleBtn.classList.toggle('active', compareMode);
    compareBar.classList.toggle('active', compareMode);
    if (!compareMode) { clearCompare(); updateCellStates(); }
  });

  root.querySelector('#compareClearBtn').addEventListener('click', () => { clearCompare(); updateCellStates(); });

  function clearCompare() {
    compare.selections = [];
    compareStatus.textContent = 'Click two slides to compare';
  }

  function updateCellStates() {
    const container = currentTab === 'conversion' ? matrixEl : matrix2El;
    container.querySelectorAll('.cell').forEach((el) => {
      const ci = +el.dataset.ci, vi = +el.dataset.vi;
      const m = getModel();
      const cell = resolveCell(m.cases[ci], ci, m.versions[vi]);
      el.classList.toggle('selectable', compareMode && !!cell?.preview);
      const sel = compare.selections.find((s) => s.ci === ci && s.vi === vi);
      el.classList.toggle('selected', !!sel);
      const badge = el.querySelector('.select-badge');
      if (badge) badge.textContent = sel ? sel.idx : '';
    });
  }

  function handleCompareClick(ci, vi) {
    const sels = compare.selections;
    const existing = sels.findIndex((s) => s.ci === ci && s.vi === vi);
    if (existing >= 0) {
      sels.splice(existing, 1);
      sels.forEach((s, i) => { s.idx = i + 1; });
      updateCellStates();
      compareStatus.textContent = sels.length === 1 ? 'Click one more slide' : 'Click two slides to compare';
      return;
    }
    if (sels.length >= 2) sels.shift();
    sels.push({ ci, vi, idx: sels.length + 1 });
    sels.forEach((s, i) => { s.idx = i + 1; });
    updateCellStates();
    if (sels.length === 2) {
      const m = getModel();
      const a = sels[0], b = sels[1];
      const ca = m.cases[a.ci], cb = m.cases[b.ci];
      const va = m.versions[a.vi], vb = m.versions[b.vi];
      const cellA = resolveCell(ca, a.ci, va);
      const cellB = resolveCell(cb, b.ci, vb);
      compare.openCompare(
        { label: ca.title + ' · ' + headerLabel(va), img: cellA?.preview },
        { label: cb.title + ' · ' + headerLabel(vb), img: cellB?.preview },
      );
      compareStatus.textContent = 'Click two slides to compare';
    } else {
      compareStatus.textContent = 'Click one more slide';
    }
  }

  // Tab switching
  const tabMeta = root.querySelector('#tabMeta');
  root.querySelectorAll('.content-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;
      currentTab = tab;
      root.querySelectorAll('.content-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
      root.querySelector('#tab-conversion').style.display = tab === 'conversion' ? '' : 'none';
      root.querySelector('#tab-new-skill').style.display = tab === 'new-skill' ? '' : 'none';
      tabMeta.textContent = tab === 'conversion'
        ? `${MODEL.cases.length} cases · ${MODEL.versions.length - 1} generations · all gen-2 complete`
        : `${MODEL_B.cases.length} cases · ${MODEL_B.versions.length - 1} generations`;
      if (compareMode) { compareMode = false; toggleBtn.classList.remove('active'); compareBar.classList.remove('active'); clearCompare(); }
    });
  });

  // Keyboard
  const keyHandler = (e) => {
    const compareModalEl = root.querySelector('#compareModal');
    if (compareModalEl.classList.contains('open')) {
      if (e.key === 'Escape') compare.closeCompare();
      return;
    }
    if (!modal.active) return;
    const m = getModel();
    if (e.key === 'Escape') modal.close();
    if (e.key === 'ArrowLeft') modal.navigate(-1, m.versions.length - 1);
    if (e.key === 'ArrowRight') modal.navigate(1, m.versions.length - 1);
  };

  window.addEventListener('keydown', keyHandler);
  renderA();
  renderB();

  return () => {
    window.removeEventListener('keydown', keyHandler);
    root.innerHTML = '';
  };
}

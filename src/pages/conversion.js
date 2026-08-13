import MODEL from '../data/pptx-conversion.json';
import { createMatrix } from '../components/matrix.js';
import { createModal, createCompare } from '../components/modal.js';

function headerLabel(v) {
  if (v === 'html-source') return 'HTML Source';
  return v.replace('gen-', 'Gen ');
}

function colClass(v) {
  return v === 'html-source' ? 'html-col' : 'pptx-col';
}

function versionChip(version) {
  if (!version) return '';
  const cls = version === 'V5' ? 'version-chip v5' : 'version-chip v4';
  return `<span class="${cls}">${version}</span>`;
}

export function mount(root) {
  root.innerHTML = `
    <main class="wrap" style="padding-top:52px">
      <header class="mast">
        <h1>PowerPoint conversion</h1>
        <p style="color:var(--soft);max-width:72ch;margin-bottom:4px">These slides are built with PptxGenJS, which renders native PowerPoint charts. think-cell is not available on Mac, so chart fidelity here reflects the PptxGenJS engine only.</p>
        <div class="meta">
          <button id="compareToggle" class="compare-toggle">Compare slides</button>
        </div>
        <div id="compareBar" class="compare-bar">
          <span id="compareStatus" class="compare-status">Click two slides to compare</span>
          <button id="compareClearBtn" class="compare-clear">Clear</button>
        </div>
      </header>
      <section class="matrix-wrap" aria-label="HTML to PPTX conversion matrix">
        <div id="matrix" class="matrix"></div>
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
      <div class="compare-modal-bar"><span id="compareTitle">Comparison</span></div>
      <div class="compare-panes">
        <div class="compare-pane"><div id="compareLabel1" class="compare-pane-label"></div><img id="compareImg1" alt="Selection A"></div>
        <div class="compare-pane"><div id="compareLabel2" class="compare-pane-label"></div><img id="compareImg2" alt="Selection B"></div>
      </div>
      <div class="compare-modal-foot"><button id="compareCopyPng" class="compare-copy-png">Copy as PNG</button></div>
    </div>
    <footer class="foot"><div class="wrap foot-line"><span>Pepper · PowerPoint Skill</span></div></footer>`;

  const matrixEl = root.querySelector('#matrix');
  const grid = createMatrix(matrixEl, { cellWidth: 360 });
  const modal = createModal(root.querySelector('#modal'));
  const compare = createCompare(root.querySelector('#compareModal'));

  let compareMode = false;
  const activeSource = {};

  MODEL.cases.forEach((c, ci) => {
    const cell = c.cells['html-source'];
    if (cell && cell.sources) activeSource[ci] = cell.default || cell.sources.length - 1;
  });

  function resolveCell(c, ci, v) {
    const cell = c.cells[v];
    if (v === 'html-source' && cell && cell.sources) {
      const idx = activeSource[ci] != null ? activeSource[ci] : (cell.default != null ? cell.default : cell.sources.length - 1);
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

  function render() {
    grid.updateGrid(MODEL.versions);
    matrixEl.innerHTML =
      '<div class="head corner">Case</div>' +
      MODEL.versions.map((v, vi) => {
        const label = headerLabel(v);
        return `<div class="head ${colClass(v)}${grid.collapsed.has(vi) ? ' collapsed' : ''}" data-vi="${vi}"><button class="collapse-btn" title="Collapse column">«</button><span class="head-content">${label}</span><span class="head-vlabel">${label}</span></div>`;
      }).join('');

    matrixEl.querySelectorAll('.collapse-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        grid.toggleColumn(parseInt(btn.closest('.head').dataset.vi), MODEL.versions);
      });
    });

    MODEL.cases.forEach((c, ci) => {
      const sourceLabel = c.cells['html-source']?.sources
        ? c.cells['html-source'].sources[activeSource[ci] != null ? activeSource[ci] : c.cells['html-source'].default].label
        : '';
      matrixEl.insertAdjacentHTML('beforeend',
        `<div class="case-head"><strong>${c.title}</strong><span class="case-id">${versionChip(c.version)}${c.id}${sourceLabel ? ' · ' + sourceLabel : ''}</span>${c.source ? `<div class="case-source">${c.source}</div>` : ''}</div>`
      );

      MODEL.versions.forEach((v, vi) => {
        const cell = resolveCell(c, ci, v);
        const img = cell ? cell.preview : null;
        const el = document.createElement('div');
        el.className = 'cell' + (grid.collapsed.has(vi) ? ' collapsed' : '');
        el.dataset.ci = ci;
        el.dataset.vi = vi;
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
        render();
      });
    });
  }

  modal.setUpdateHandler((active, els) => {
    const c = MODEL.cases[active.ci];
    const v = MODEL.versions[active.vi];
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
    matrixEl.querySelectorAll('.cell').forEach((el) => {
      const ci = +el.dataset.ci, vi = +el.dataset.vi;
      const cell = resolveCell(MODEL.cases[ci], ci, MODEL.versions[vi]);
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
      const a = sels[0], b = sels[1];
      const ca = MODEL.cases[a.ci], cb = MODEL.cases[b.ci];
      const va = MODEL.versions[a.vi], vb = MODEL.versions[b.vi];
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

  // Keyboard
  const keyHandler = (e) => {
    const compareModalEl = root.querySelector('#compareModal');
    if (compareModalEl.classList.contains('open')) {
      if (e.key === 'Escape') compare.closeCompare();
      return;
    }
    if (!modal.active) return;
    if (e.key === 'Escape') modal.close();
    if (e.key === 'ArrowLeft') modal.navigate(-1, MODEL.versions.length - 1);
    if (e.key === 'ArrowRight') modal.navigate(1, MODEL.versions.length - 1);
  };

  window.addEventListener('keydown', keyHandler);
  render();

  return () => {
    window.removeEventListener('keydown', keyHandler);
    root.innerHTML = '';
  };
}

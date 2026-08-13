import MODEL from '../data/skill-progression.json';
import VERSION_INFO from '../data/version-info.json';
import { createMatrix } from '../components/matrix.js';
import { createModal, createCompare } from '../components/modal.js';

const ABBREV = { Analyst: 'A', Executive: 'E', Consultant: 'C' };

export function mount(root) {
  root.innerHTML = `
    <main class="wrap" style="padding-top:52px">
      <header class="mast">
        <h1>HTML skill progression analysis</h1>
        <p class="lede">This skill is the design engine. See <strong>PPTX Conversion</strong> to see its conversion to PowerPoint.</p>
        <div class="meta">
          <span>${MODEL.cases.length} cases · ${MODEL.versions.length} versions · 3 personas per case</span>
          <button id="compareToggle" class="compare-toggle">Compare mode</button>
        </div>
        <div id="compareBar" class="compare-bar">
          <span id="compareStatus" class="compare-status">Select two slides to compare</span>
          <button class="compare-clear" id="compareClearBtn">Clear</button>
        </div>
      </header>
      <section class="matrix-wrap" aria-label="Version comparison matrix">
        <div id="matrix" class="matrix"></div>
      </section>
    </main>
    <div id="modal" class="modal" role="dialog" aria-modal="true" aria-label="Slide comparison zoom">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="modal-bar">
        <div><span id="modalTitle"></span><div id="modalPromptWrap" class="modal-prompt-wrap" style="display:none"><div id="modalPrompt" class="modal-prompt"></div><button class="copy-btn" id="modalCopyBtn">Copy</button></div></div>
      </div>
      <div id="modalPersonaTabs" class="modal-persona-tabs" style="display:none"></div>
      <img id="modalImage" alt="Selected slide render">
      <div class="hint">&larr; / &rarr; adjacent version</div>
    </div>
    <div id="compareModal" class="compare-modal" role="dialog" aria-modal="true" aria-label="Side-by-side comparison">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="compare-modal-bar"><span id="compareTitle"></span><button id="compareCopyPng" class="compare-copy-png">Copy as PNG</button></div>
      <div class="compare-panes">
        <div class="compare-pane"><div id="compareLabel1" class="compare-pane-label"></div><img id="compareImg1" alt="Compare slide A"></div>
        <div class="compare-pane"><div id="compareLabel2" class="compare-pane-label"></div><img id="compareImg2" alt="Compare slide B"></div>
      </div>
    </div>
    <div id="changesModal" class="changes-modal" role="dialog" aria-modal="true" aria-label="Version changes">
      <button class="close-x" aria-label="Close">&times;</button>
      <div class="changes-modal-bar"><span id="changesTitle"></span></div>
      <div id="changesBody" class="changes-modal-body"></div>
    </div>
    <footer class="foot"><div class="wrap foot-line">
      <span>SKILL LAB GALLERY</span>
      <span>source: skill-lab/versions/</span>
    </div></footer>`;

  const matrixEl = root.querySelector('#matrix');
  const grid = createMatrix(matrixEl);
  const modal = createModal(root.querySelector('#modal'));
  const compare = createCompare(root.querySelector('#compareModal'));

  let compareMode = false;

  function switchAllPersonas(vi, slot) {
    matrixEl.querySelectorAll(`.head-persona-tab[data-vi="${vi}"]`).forEach((t) => {
      t.classList.toggle('active', parseInt(t.dataset.slot) === slot);
    });
    matrixEl.querySelectorAll(`.cell[data-vi="${vi}"]`).forEach((cell) => {
      const tabs = cell.querySelectorAll('.persona-tab');
      const panes = cell.querySelectorAll('.persona-panes .image-button');
      if (!tabs.length) return;
      tabs.forEach((t) => t.classList.toggle('active', parseInt(t.dataset.tab) === slot));
      panes.forEach((p) => p.classList.toggle('active', parseInt(p.dataset.slot) === slot));
    });
  }

  function render() {
    grid.updateGrid(MODEL.versions);
    matrixEl.innerHTML =
      '<div class="head">Case</div>' +
      MODEL.versions.map((v, vi) => {
        const info = VERSION_INFO[v] || [v, ''];
        const hasPersonas = MODEL.cases.some((c) => c.cells[v]?.previews?.length > 1);
        let ptabs = '';
        if (hasPersonas) {
          const labels = new Set();
          MODEL.cases.forEach((c) => { (c.cells[v]?.previews || []).forEach((p) => labels.add(p.label)); });
          const labelsArr = [...labels];
          ptabs =
            '<div class="head-persona-tabs">' +
            labelsArr.map((l, i) =>
              `<button class="head-persona-tab${i === labelsArr.length - 1 ? ' active' : ''}" data-vi="${vi}" data-slot="${i}">${l}</button>`
            ).join('') +
            '</div>';
        }
        const cls = vi === 0 ? ' current' : v === 'baseline' ? ' baseline' : '';
        return `<div class="head${cls}${grid.collapsed.has(vi) ? ' collapsed' : ''}" data-vi="${vi}"><button class="collapse-btn" title="Collapse column">«</button><span class="head-content">${info[0]}${info[1] ? `<span class="head-sub">${info[1]}</span>` : ''}${ptabs}</span><span class="head-vlabel">${info[0]}</span></div>`;
      }).join('');

    matrixEl.querySelectorAll('.head-persona-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchAllPersonas(parseInt(btn.dataset.vi), parseInt(btn.dataset.slot)));
    });

    matrixEl.querySelectorAll('.collapse-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vi = parseInt(btn.closest('.head').dataset.vi);
        grid.toggleColumn(vi, MODEL.versions);
      });
    });

    MODEL.cases.forEach((c, ci) => {
      matrixEl.insertAdjacentHTML('beforeend',
        `<div class="case-head"><strong>${c.title}</strong><span class="case-id">${c.id}</span></div>`
      );

      MODEL.versions.forEach((v, vi) => {
        const cell = c.cells[v];
        const img = cell?.preview;
        const previews = cell?.previews;
        const changes = cell?.changes || [];
        const el = document.createElement('div');
        el.className = 'cell' + (grid.collapsed.has(vi) ? ' collapsed' : '');
        el.dataset.ci = ci;
        el.dataset.vi = vi;

        if (previews && previews.length) {
          el.innerHTML =
            '<span class="select-badge"></span>' +
            '<div class="persona-tabs">' +
            previews.map((p, pi) => `<button class="persona-tab${pi === previews.length - 1 ? ' active' : ''}" data-tab="${pi}">${ABBREV[p.label] || p.label}</button>`).join('') +
            '</div>' +
            '<div class="persona-panes">' +
            previews.map((p, pi) => `<button class="image-button${pi === previews.length - 1 ? ' active' : ''}" data-slot="${pi}"><img src="${p.src}" alt="${c.title} · ${v} · ${p.label}"></button>`).join('') +
            '</div>';
        } else {
          el.innerHTML =
            '<span class="select-badge"></span>' +
            (img
              ? `<button class="image-button"><img src="${img}" alt="${c.title} · ${v}"></button>`
              : '<div class="image-button"><span class="empty">No artifact</span></div>');
        }

        el.innerHTML +=
          '<div class="cell-foot">' +
          (cell?.pptx ? `<a href="${cell.pptx}" download>Download .pptx</a>` : cell?.html ? `<a href="${cell.html}" target="_blank">Open HTML ↗</a>` : '') +
          (changes.length ? `<button class="changes-chip" data-ci="${ci}" data-vi="${vi}">${changes.length} change${changes.length === 1 ? '' : 's'}</button>` : '') +
          '</div>';

        el.querySelectorAll('.persona-tab').forEach((tab) => {
          tab.addEventListener('click', () => {
            el.querySelectorAll('.persona-tab').forEach((t) => t.classList.remove('active'));
            el.querySelectorAll('.persona-panes .image-button').forEach((p) => p.classList.remove('active'));
            tab.classList.add('active');
            el.querySelector(`.persona-panes .image-button[data-slot="${tab.dataset.tab}"]`).classList.add('active');
          });
        });

        el.querySelectorAll('.image-button').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (compareMode) { handleCompareClick(ci, vi); return; }
            const slot = btn.dataset.slot;
            if (slot !== undefined && previews) modal.open(ci, vi, parseInt(slot));
            else modal.open(ci, vi);
          });
        });

        matrixEl.append(el);
      });
    });
  }

  modal.setUpdateHandler((active, els) => {
    const c = MODEL.cases[active.ci];
    const v = MODEL.versions[active.vi];
    const cell = c.cells[v];
    const previews = cell?.previews;
    let img = cell?.preview;
    let suffix = '';

    if (previews && previews.length) {
      const si = active.slot !== undefined ? active.slot : previews.length - 1;
      img = previews[si].src;
      suffix = ' · ' + previews[si].label;
      els.personaTabsEl.style.display = 'flex';
      els.personaTabsEl.innerHTML = previews.map((p, pi) =>
        `<button class="modal-persona-tab${pi === si ? ' active' : ''}" data-slot="${pi}">${p.label}</button>`
      ).join('');
      els.personaTabsEl.querySelectorAll('.modal-persona-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.active.slot = parseInt(btn.dataset.slot);
          modal.update();
        });
      });
    } else {
      els.personaTabsEl.style.display = 'none';
      els.personaTabsEl.innerHTML = '';
    }

    els.titleEl.textContent = c.title + ' · ' + v + suffix;
    els.promptWrapEl.style.display = 'none';
    els.imageEl.src = img || '';
    els.imageEl.style.visibility = img ? 'visible' : 'hidden';
  });

  // Compare mode
  const toggleBtn = root.querySelector('#compareToggle');
  const compareBar = root.querySelector('#compareBar');
  const compareStatus = root.querySelector('#compareStatus');

  toggleBtn.addEventListener('click', () => {
    compareMode = !compareMode;
    toggleBtn.classList.toggle('on', compareMode);
    toggleBtn.textContent = compareMode ? 'Exit compare' : 'Compare mode';
    compareBar.classList.toggle('active', compareMode);
    matrixEl.querySelectorAll('.cell').forEach((c) => c.classList.toggle('selectable', compareMode));
    if (!compareMode) clearCompare();
  });

  root.querySelector('#compareClearBtn').addEventListener('click', clearCompare);

  function clearCompare() {
    compare.selections = [];
    matrixEl.querySelectorAll('.cell.selected').forEach((c) => c.classList.remove('selected'));
    matrixEl.querySelectorAll('.select-badge').forEach((b) => { b.textContent = ''; });
    compareStatus.textContent = 'Select two slides to compare';
  }

  function handleCompareClick(ci, vi) {
    const sels = compare.selections;
    const existing = sels.findIndex((s) => s.ci === ci && s.vi === vi);
    if (existing >= 0) {
      sels.splice(existing, 1);
      const cell = matrixEl.querySelector(`.cell[data-ci="${ci}"][data-vi="${vi}"]`);
      cell?.classList.remove('selected');
      sels.forEach((s, i) => {
        const c = matrixEl.querySelector(`.cell[data-ci="${s.ci}"][data-vi="${s.vi}"]`);
        if (c) c.querySelector('.select-badge').textContent = i + 1;
      });
      compareStatus.textContent = sels.length === 1 ? '1 selected — pick one more' : 'Select two slides to compare';
      return;
    }
    if (sels.length >= 2) {
      const old = sels.shift();
      const oldCell = matrixEl.querySelector(`.cell[data-ci="${old.ci}"][data-vi="${old.vi}"]`);
      oldCell?.classList.remove('selected');
    }
    sels.push({ ci, vi });
    const cell = matrixEl.querySelector(`.cell[data-ci="${ci}"][data-vi="${vi}"]`);
    cell?.classList.add('selected');
    sels.forEach((s, i) => {
      const c = matrixEl.querySelector(`.cell[data-ci="${s.ci}"][data-vi="${s.vi}"]`);
      if (c) c.querySelector('.select-badge').textContent = i + 1;
    });
    if (sels.length === 2) {
      const s1 = sels[0], s2 = sels[1];
      const c1 = MODEL.cases[s1.ci], c2 = MODEL.cases[s2.ci];
      const v1 = MODEL.versions[s1.vi], v2 = MODEL.versions[s2.vi];
      const cell1 = c1.cells[v1];
      const cell2 = c2.cells[v2];
      const img1 = cell1?.preview || cell1?.previews?.[cell1.previews.length - 1]?.src;
      const img2 = cell2?.preview || cell2?.previews?.[cell2.previews.length - 1]?.src;
      compare.openCompare(
        { label: c1.title + ' · ' + v1, img: img1 },
        { label: c2.title + ' · ' + v2, img: img2 },
      );
      exitCompareMode();
    } else {
      compareStatus.textContent = '1 selected — pick one more';
    }
  }

  function exitCompareMode() {
    compareMode = false;
    toggleBtn.classList.remove('on');
    toggleBtn.textContent = 'Compare mode';
    compareBar.classList.remove('active');
    matrixEl.querySelectorAll('.cell').forEach((c) => { c.classList.remove('selectable', 'selected'); });
    matrixEl.querySelectorAll('.select-badge').forEach((b) => { b.textContent = ''; });
    compare.selections = [];
  }

  // Keyboard
  const keyHandler = (e) => {
    const compareModalEl = root.querySelector('#compareModal');
    if (changesModalEl.classList.contains('open')) {
      if (e.key === 'Escape') changesModalEl.classList.remove('open');
      return;
    }
    if (compareModalEl.classList.contains('open')) {
      if (e.key === 'Escape') compare.closeCompare();
      return;
    }
    if (!modal.active) return;
    if (e.key === 'Escape') modal.close();
    if (e.key === 'ArrowLeft') modal.navigate(-1, MODEL.versions.length - 1);
    if (e.key === 'ArrowRight') modal.navigate(1, MODEL.versions.length - 1);
  };

  const changesModalEl = root.querySelector('#changesModal');
  const changesTitle = root.querySelector('#changesTitle');
  const changesBody = root.querySelector('#changesBody');
  changesModalEl.querySelector('.close-x').addEventListener('click', () => changesModalEl.classList.remove('open'));
  changesModalEl.addEventListener('click', (e) => { if (e.target === changesModalEl) changesModalEl.classList.remove('open'); });

  matrixEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.changes-chip');
    if (!chip) return;
    const ci = parseInt(chip.dataset.ci);
    const vi = parseInt(chip.dataset.vi);
    const c = MODEL.cases[ci];
    const v = MODEL.versions[vi];
    const changes = c.cells[v]?.changes || [];
    const info = VERSION_INFO[v] || [v, ''];
    changesTitle.textContent = `${c.title} — ${info[0]} changes from previous version`;
    changesBody.innerHTML = changes.map((ch) => {
      const t = ch.tag.toLowerCase();
      const cls = t.startsWith('ban') ? 'ban' : { removed: 'removed', added: 'added', changed: 'changed', fix: 'fix' }[t] || 'note';
      return `<div class="change"><span class="change-tag ${cls}">${ch.tag}</span><span>${ch.note}</span></div>`;
    }).join('');
    changesModalEl.classList.add('open');
  });

  window.addEventListener('keydown', keyHandler);
  render();

  return () => {
    window.removeEventListener('keydown', keyHandler);
    root.innerHTML = '';
  };
}

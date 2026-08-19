import MODEL from '../data/skill-progression.json';
import VERSION_INFO from '../data/version-info.json';
import { createMatrix } from '../components/matrix.js';
import { createModal, createCompare } from '../components/modal.js';

const ABBREV = { Analyst: 'A', Executive: 'E', Consultant: 'C', Strategist: 'S' };

export function mount(root) {
  root.innerHTML = `
    <main class="wrap" style="padding-top:52px">
      <header class="mast">
        <h1>HTML skill progression analysis</h1>
        <p class="lede">This skill is the design engine. See <strong>PPTX Conversion</strong> to see its conversion to PowerPoint.</p>
        <div class="meta">
          <button id="compareToggle" class="compare-toggle">Compare slides</button>
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
      <div class="compare-modal-bar"><span id="compareTitle"></span></div>
      <div class="compare-panes">
        <div class="compare-pane"><div id="compareLabel1" class="compare-pane-label"></div><img id="compareImg1" alt="Compare slide A"></div>
        <div class="compare-pane"><div id="compareLabel2" class="compare-pane-label"></div><img id="compareImg2" alt="Compare slide B"></div>
      </div>
      <div class="compare-modal-foot"><button id="compareCopyPng" class="compare-copy-png">Copy as PNG</button></div>
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
      const panes = cell.querySelectorAll('.persona-panes .persona-pane');
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
          MODEL.cases.forEach((c) => { (c.cells[v]?.previews || []).forEach((p) => { if (ABBREV[p.label]) labels.add(p.label); }); });
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
        `<div class="case-head"><strong>${c.title}</strong><span class="case-id">${c.id}</span>${c.prompt ? `<button class="copy-prompt-btn" data-ci="${ci}">⧉ Copy prompt</button>` : ''}</div>`
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

        const variants = cell?.variants;
        if (variants && variants.length) {
          el.innerHTML =
            '<span class="select-badge"></span>' +
            `<button class="image-button active" data-variant="0"><img src="${variants[0].src}" alt="${c.title} · ${v} · ${variants[0].label}"></button>` +
            variants.slice(1).map((vr, i) =>
              `<button class="image-button" data-variant="${i + 1}" style="display:none"><img src="${vr.src}" alt="${c.title} · ${v} · ${vr.label}"></button>`
            ).join('');
        } else if (previews && previews.length) {
          el.innerHTML =
            '<span class="select-badge"></span>' +
            '<div class="persona-tabs">' +
            previews.map((p, pi) => `<button class="persona-tab${pi === previews.length - 1 ? ' active' : ''}" data-tab="${pi}">${ABBREV[p.label] || p.label}</button>`).join('') +
            '</div>' +
            '<div class="persona-panes">' +
            previews.map((p, pi) => {
              const isActive = pi === previews.length - 1;
              if (p.variants && p.variants.length > 1) {
                return `<div class="persona-pane${isActive ? ' active' : ''}" data-slot="${pi}">` +
                  p.variants.map((vr, vri) =>
                    `<button class="image-button${vri === 0 ? ' active' : ''}" data-subvar="${vri}"${vri > 0 ? ' style="display:none"' : ''}><img src="${vr.src}" alt="${c.title} · ${v} · ${vr.label}"></button>`
                  ).join('') +
                  `<div class="variant-wrap"><span class="variant-label">Layout</span><select class="sub-variant-select" data-slot="${pi}">` +
                  p.variants.map((vr, vri) => `<option value="${vri}">${vr.label}</option>`).join('') +
                  '</select></div></div>';
              }
              return `<div class="persona-pane${isActive ? ' active' : ''}" data-slot="${pi}"><button class="image-button"><img src="${p.src}" alt="${c.title} · ${v} · ${p.label}"></button></div>`;
            }).join('') +
            '</div>';
        } else {
          el.innerHTML =
            '<span class="select-badge"></span>' +
            (img
              ? `<button class="image-button"><img src="${img}" alt="${c.title} · ${v}"></button>`
              : '<div class="image-button"><span class="empty">No artifact</span></div>');
        }

        const defaultPreview = previews && previews.length ? previews[previews.length - 1] : null;
        const htmlLink = variants ? variants[0].html : defaultPreview ? defaultPreview.html : cell?.html;
        el.innerHTML +=
          '<div class="cell-foot">' +
          (cell?.pptx ? `<a href="${cell.pptx}" download>Download .pptx</a>` : htmlLink ? `<a class="html-link" href="${htmlLink}" target="_blank">Open HTML ↗</a>` : '') +
          '</div>';

        if (variants && variants.length > 1) {
          el.innerHTML +=
            '<div class="variant-wrap"><span class="variant-label">Layout</span>' +
            `<select class="variant-select" data-ci="${ci}" data-vi="${vi}">` +
            variants.map((vr, vri) => `<option value="${vri}">${vr.label}</option>`).join('') +
            '</select></div>';
        }

        const variantSelect = el.querySelector('.variant-select');
        if (variantSelect) {
          variantSelect.addEventListener('change', () => {
            const idx = parseInt(variantSelect.value);
            el.querySelectorAll('.image-button[data-variant]').forEach((btn) => {
              const show = parseInt(btn.dataset.variant) === idx;
              btn.style.display = show ? 'block' : 'none';
              btn.classList.toggle('active', show);
            });
            const link = el.querySelector('.html-link');
            if (link && variants[idx]?.html) link.href = variants[idx].html;
          });
        }

        el.querySelectorAll('.persona-tab').forEach((tab) => {
          tab.addEventListener('click', () => {
            el.querySelectorAll('.persona-tab').forEach((t) => t.classList.remove('active'));
            el.querySelectorAll('.persona-panes .persona-pane').forEach((p) => p.classList.remove('active'));
            tab.classList.add('active');
            el.querySelector(`.persona-panes .persona-pane[data-slot="${tab.dataset.tab}"]`).classList.add('active');
            const link = el.querySelector('.html-link');
            if (link && previews) {
              const p = previews[parseInt(tab.dataset.tab)];
              if (p) link.href = p.html;
            }
          });
        });

        el.querySelectorAll('.sub-variant-select').forEach((sel) => {
          sel.addEventListener('change', () => {
            const pane = sel.closest('.persona-pane');
            const idx = parseInt(sel.value);
            pane.querySelectorAll('.image-button[data-subvar]').forEach((btn) => {
              const show = parseInt(btn.dataset.subvar) === idx;
              btn.style.display = show ? 'block' : 'none';
              btn.classList.toggle('active', show);
            });
            const link = el.querySelector('.html-link');
            const slot = parseInt(pane.dataset.slot);
            const p = previews[slot];
            if (link && p?.variants?.[idx]?.html) link.href = p.variants[idx].html;
          });
        });

        el.querySelectorAll('.image-button').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (compareMode) { handleCompareClick(ci, vi); return; }
            const variantIdx = btn.dataset.variant;
            if (variantIdx !== undefined && variants) {
              modal.open(ci, vi, undefined, parseInt(variantIdx));
            } else {
              const pane = btn.closest('.persona-pane');
              if (pane && previews) {
                const slot = parseInt(pane.dataset.slot);
                const subvar = btn.dataset.subvar !== undefined ? parseInt(btn.dataset.subvar) : undefined;
                modal.open(ci, vi, slot, subvar);
              } else {
                modal.open(ci, vi);
              }
            }
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
    const variants = cell?.variants;
    const previews = cell?.previews;
    let img = cell?.preview;
    let suffix = '';

    if (variants && variants.length) {
      const vi2 = active.variantIdx !== undefined ? active.variantIdx : 0;
      img = variants[vi2].src;
      suffix = ' · ' + variants[vi2].label;
      els.personaTabsEl.style.display = 'flex';
      els.personaTabsEl.innerHTML = variants.map((vr, vri) =>
        `<button class="modal-persona-tab${vri === vi2 ? ' active' : ''}" data-slot="${vri}">${vr.label}</button>`
      ).join('');
      els.personaTabsEl.querySelectorAll('.modal-persona-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.active.variantIdx = parseInt(btn.dataset.slot);
          modal.update();
        });
      });
    } else if (previews && previews.length) {
      const si = active.slot !== undefined ? active.slot : previews.length - 1;
      const p = previews[si];
      const subVars = p.variants;
      const svi = active.variantIdx !== undefined ? active.variantIdx : 0;

      if (subVars && subVars.length > 1) {
        img = subVars[svi].src;
        suffix = ' · ' + p.label + ' · ' + subVars[svi].label;
      } else {
        img = p.src;
        suffix = ' · ' + p.label;
      }

      els.personaTabsEl.style.display = 'flex';
      let tabsHtml = previews.map((pr, pi) =>
        `<button class="modal-persona-tab${pi === si ? ' active' : ''}" data-slot="${pi}">${pr.label}</button>`
      ).join('');

      if (subVars && subVars.length > 1) {
        tabsHtml += '<select class="modal-variant-select">' +
          subVars.map((vr, vri) => `<option value="${vri}"${vri === svi ? ' selected' : ''}>${vr.label}</option>`).join('') +
          '</select>';
      }

      els.personaTabsEl.innerHTML = tabsHtml;
      els.personaTabsEl.querySelectorAll('.modal-persona-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.active.slot = parseInt(btn.dataset.slot);
          modal.active.variantIdx = 0;
          modal.update();
        });
      });
      const modalVarSelect = els.personaTabsEl.querySelector('.modal-variant-select');
      if (modalVarSelect) {
        modalVarSelect.addEventListener('change', (e) => {
          modal.active.variantIdx = parseInt(e.target.value);
          modal.update();
        });
      }
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
    if (compareModalEl.classList.contains('open')) {
      if (e.key === 'Escape') compare.closeCompare();
      return;
    }
    if (!modal.active) return;
    if (e.key === 'Escape') modal.close();
    if (e.key === 'ArrowLeft') modal.navigate(-1, MODEL.versions.length - 1);
    if (e.key === 'ArrowRight') modal.navigate(1, MODEL.versions.length - 1);
  };

  matrixEl.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-prompt-btn');
    if (copyBtn) {
      const ci = parseInt(copyBtn.dataset.ci);
      const text = MODEL.cases[ci]?.prompt;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓ Copied';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = '⧉ Copy prompt'; copyBtn.classList.remove('copied'); }, 1500);
      });
    }
  });

  window.addEventListener('keydown', keyHandler);
  render();

  return () => {
    window.removeEventListener('keydown', keyHandler);
    root.innerHTML = '';
  };
}

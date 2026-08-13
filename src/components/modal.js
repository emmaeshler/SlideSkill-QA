export function createModal(modalEl) {
  let active = null;
  let onUpdate = null;

  const titleEl = modalEl.querySelector('#modalTitle');
  const imageEl = modalEl.querySelector('#modalImage');
  const promptWrapEl = modalEl.querySelector('#modalPromptWrap');
  const promptEl = modalEl.querySelector('#modalPrompt');
  const personaTabsEl = modalEl.querySelector('#modalPersonaTabs');
  const copyBtn = modalEl.querySelector('#modalCopyBtn');

  function open(ci, vi, slot, variantIdx) {
    active = { ci, vi, slot, variantIdx };
    update();
    modalEl.classList.add('open');
  }

  function close() {
    modalEl.classList.remove('open');
    active = null;
  }

  function update() {
    if (!active || !onUpdate) return;
    onUpdate(active, { titleEl, imageEl, promptWrapEl, promptEl, personaTabsEl });
  }

  function navigate(dir, maxVi) {
    if (!active) return;
    active.vi = Math.max(0, Math.min(maxVi, active.vi + dir));
    update();
  }

  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) close();
  });

  const closeBtn = modalEl.querySelector('.close-x');
  if (closeBtn) closeBtn.addEventListener('click', close);

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!active || !onUpdate) return;
      const text = copyBtn.dataset.promptText;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
      });
    });
  }

  return {
    get active() { return active; },
    set active(v) { active = v; },
    open,
    close,
    update,
    navigate,
    setUpdateHandler(fn) { onUpdate = fn; },
  };
}

export function createCompare(compareModalEl) {
  let selections = [];

  const titleEl = compareModalEl.querySelector('#compareTitle');
  const label1 = compareModalEl.querySelector('#compareLabel1');
  const label2 = compareModalEl.querySelector('#compareLabel2');
  const img1 = compareModalEl.querySelector('#compareImg1');
  const img2 = compareModalEl.querySelector('#compareImg2');
  const copyBtn = compareModalEl.querySelector('#compareCopyPng');

  function openCompare(a, b) {
    label1.textContent = a.label;
    label2.textContent = b.label;
    img1.src = a.img || '';
    img2.src = b.img || '';
    titleEl.textContent = 'Comparing';
    compareModalEl.classList.add('open');
  }

  function closeCompare() {
    compareModalEl.classList.remove('open');
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copying…';
      try {
        const loadImg = (src) => new Promise((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = src;
        });
        const [a, b] = await Promise.all([loadImg(img1.src), loadImg(img2.src)]);
        const gap = 24;
        const maxH = Math.max(a.height, b.height);
        const canvas = document.createElement('canvas');
        canvas.width = a.width + b.width + gap;
        canvas.height = maxH + 48;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f3f6f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(a, 0, 24);
        ctx.drawImage(b, a.width + gap, 24);
        ctx.fillStyle = '#13222e';
        ctx.font = '600 16px system-ui, sans-serif';
        ctx.fillText(label1.textContent, 4, 18);
        ctx.fillText(label2.textContent, a.width + gap + 4, 18);
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
      } catch {
        copyBtn.textContent = 'Failed';
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
      }
    });
  }

  compareModalEl.addEventListener('click', (e) => {
    if (e.target === compareModalEl) closeCompare();
  });

  const closeBtn = compareModalEl.querySelector('.close-x');
  if (closeBtn) closeBtn.addEventListener('click', closeCompare);

  return {
    get selections() { return selections; },
    set selections(v) { selections = v; },
    openCompare,
    closeCompare,
  };
}

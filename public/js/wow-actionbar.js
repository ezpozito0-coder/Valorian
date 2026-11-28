(() => {
  const STORAGE_KEY = 'valoria_wow_bar_v1';
  const TOTAL_SLOTS = 8;
  const SKILL_SELECTORS = ['.skill-basic', '.skill-1', '.skill-2', '.skill-3'];

  const defaultSlots = () => [
    { type: 'skill', skillIndex: 0 },
    { type: 'skill', skillIndex: 1 },
    { type: 'skill', skillIndex: 2 },
    { type: 'skill', skillIndex: 3 },
    null,
    null,
    null,
    null
  ];

  let slots = defaultSlots();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === TOTAL_SLOTS) slots = saved;
  } catch (_) {}

  const saveSlots = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slots)); } catch (_) {}
  };

  let dragPayload = null;
  let droppedOnSlot = false;

  const bar = document.createElement('div');
  bar.id = 'wow-actionbar';
  bar.setAttribute('aria-label', 'Barra de habilidades');

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const cell = document.createElement('div');
    cell.className = 'wow-slot';
    cell.dataset.slotIndex = String(i);
    cell.innerHTML = `
      <span class="wow-slot-key">${i + 1}</span>
      <div class="wow-slot-icon"></div>
      <span class="wow-slot-qty"></span>
      <span class="wow-slot-cd"></span>
    `;

    cell.addEventListener('dragstart', (e) => {
      if (!slots[i]) { e.preventDefault(); return; }
      dragPayload = { source: 'bar', fromIndex: i, entry: slots[i] };
      droppedOnSlot = false;
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
      } catch (_) {}
    });

    cell.addEventListener('dragend', () => {
      if (dragPayload?.source === 'bar' && !droppedOnSlot) {
        slots[dragPayload.fromIndex] = null;
        saveSlots();
        renderBar();
      }
      dragPayload = null;
    });

    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      cell.classList.add('drag-over');
    });

    cell.addEventListener('dragleave', () => {
      cell.classList.remove('drag-over');
    });

    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      if (!dragPayload) return;
      droppedOnSlot = true;

      if (dragPayload.source === 'bar') {
        const temp = slots[i];
        slots[i] = slots[dragPayload.fromIndex];
        slots[dragPayload.fromIndex] = temp;
      } else if (dragPayload.source === 'external') {
        slots[i] = dragPayload.entry;
      }

      saveSlots();
      renderBar();
    });

    cell.addEventListener('click', () => triggerSlot(i));

    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (slots[i]) {
        slots[i] = null;
        saveSlots();
        renderBar();
      }
    });

    bar.appendChild(cell);
  }

  document.body.appendChild(bar);

  function getSkillBtn(idx) {
    return document.querySelector(`#touch-controls ${SKILL_SELECTORS[idx]}`);
  }

  function findBagSlotByName(name) {
    const bagBtns = document.querySelectorAll('.bag-slot.filled');
    for (const btn of bagBtns) {
      if (btn.title?.includes(name) || btn.innerText.includes(name) || btn.dataset.name === name) {
        return btn;
      }
    }
    return null;
  }

  function triggerSlot(index) {
    const entry = slots[index];
    if (!entry) return;

    if (entry.type === 'skill') {
      if (typeof window.__valoriaTriggerSkill === 'function') {
        window.__valoriaTriggerSkill(entry.skillIndex);
      } else {
        const btn = getSkillBtn(entry.skillIndex);
        if (btn) btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      }
    } else if (entry.type === 'item') {
      if (typeof window.__valoriaUseItemByName === 'function') {
        window.__valoriaUseItemByName(entry.name, entry.iconHtml);
        renderBar();
        return;
      }
      const bagBtn = findBagSlotByName(entry.name);
      if (bagBtn) {
        bagBtn.click();
        setTimeout(() => {
          const useBtn = document.getElementById('btn-char-use-equip') || document.querySelector('.bag-footer-bar .btn-gold');
          if (useBtn && !useBtn.disabled) {
            useBtn.click();
          }
        }, 20);
      }
    }
  }

  function renderBar() {
    const cells = bar.querySelectorAll('.wow-slot');
    cells.forEach((cell, i) => {
      const entry = slots[i];
      const iconBox = cell.querySelector('.wow-slot-icon');
      const qtyBox = cell.querySelector('.wow-slot-qty');
      const cdBox = cell.querySelector('.wow-slot-cd');

      if (!entry) {
        cell.classList.remove('has-item');
        cell.draggable = false;
        cell.title = `Casilla ${i + 1} (vacía — arrastra un ataque o poción aquí)`;
        iconBox.innerHTML = '';
        qtyBox.textContent = '';
        cdBox.textContent = '';
        return;
      }

      cell.classList.add('has-item');
      cell.draggable = true;

      if (entry.type === 'skill') {
        const btn = getSkillBtn(entry.skillIndex);
        const srcIcon = btn?.querySelector('.skill-icon');
        const srcName = btn?.querySelector('.skill-name')?.textContent || `Habilidad ${entry.skillIndex + 1}`;
        const srcCd = btn?.querySelector('.skill-cd')?.textContent || '';
        cell.title = `${srcName} (Tecla ${i + 1})`;
        if (srcIcon && (iconBox.dataset.skillIdx !== String(entry.skillIndex) || iconBox.innerHTML !== srcIcon.innerHTML)) {
          iconBox.innerHTML = srcIcon.innerHTML;
          iconBox.dataset.skillIdx = String(entry.skillIndex);
        }
        qtyBox.textContent = '';
        cdBox.textContent = srcCd;
      } else if (entry.type === 'item') {
        iconBox.dataset.skillIdx = '';
        iconBox.innerHTML = entry.iconHtml || '';
        const cleanLabel = String(entry.name || 'Objeto').split(' (x')[0].split(':')[0].trim();
        cell.title = `${cleanLabel} (Tecla ${i + 1})`;
        let qty = '';
        if (typeof window.__valoriaGetItemQtyByName === 'function') {
          const liveQty = window.__valoriaGetItemQtyByName(entry.name, entry.iconHtml);
          qty = liveQty > 0 ? String(liveQty) : '0';
        } else {
          const bagBtn = findBagSlotByName(entry.name);
          qty = bagBtn?.querySelector('.bag-slot-qty')?.textContent || '';
        }
        qtyBox.textContent = qty;
        cdBox.textContent = '';
      }
    });
  }

  function bindDraggableSources() {
    document.querySelectorAll('.bag-slot.filled').forEach((bagBtn) => {
      if (bagBtn.dataset.wowDragReady) return;
      bagBtn.dataset.wowDragReady = '1';
      bagBtn.draggable = true;
      bagBtn.addEventListener('dragstart', (e) => {
        const clone = bagBtn.cloneNode(true);
        clone.querySelector('.bag-slot-qty')?.remove();
        const name = (bagBtn.getAttribute('aria-label') || bagBtn.title || clone.textContent || 'Objeto').trim();
        const svgOrImg = bagBtn.querySelector('svg, img, .pixel-ico-wrap');
        dragPayload = {
          source: 'external',
          entry: {
            type: 'item',
            name,
            iconHtml: svgOrImg ? svgOrImg.outerHTML : `<span>${name.slice(0, 3)}</span>`
          }
        };
        droppedOnSlot = false;
        try { e.dataTransfer.setData('text/plain', name); } catch (_) {}
      });
    });

    SKILL_SELECTORS.forEach((sel, idx) => {
      const btn = document.querySelector(`#touch-controls ${sel}`);
      if (!btn || btn.dataset.wowDragReady) return;
      btn.dataset.wowDragReady = '1';
      btn.draggable = true;
      btn.addEventListener('dragstart', (e) => {
        dragPayload = { source: 'external', entry: { type: 'skill', skillIndex: idx } };
        droppedOnSlot = false;
        try { e.dataTransfer.setData('text/plain', sel); } catch (_) {}
      });
    });

    // Permitir arrastrar habilidades desde Características -> Habilidades ([data-skill-index])
    document.querySelectorAll('[data-skill-index]').forEach((el) => {
      if (el.dataset.wowDragReady) return;
      el.dataset.wowDragReady = '1';
      el.draggable = true;
      el.addEventListener('dragstart', (e) => {
        const skillIndex = Number(el.dataset.skillIndex);
        if (Number.isNaN(skillIndex)) return;
        dragPayload = { source: 'external', entry: { type: 'skill', skillIndex } };
        droppedOnSlot = false;
        try { e.dataTransfer.setData('text/plain', String(skillIndex)); } catch (_) {}
      });
    });
  }

const isPlaying = () =>
    location.hash === '#jugar' ||
    document.body.classList.contains('in-game') ||
    Boolean(document.querySelector('#hud-chat-panel')?.offsetParent);

  window.addEventListener('keydown', (e) => {
    if (!isPlaying()) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    let num = parseInt(e.key, 10);
    if ((Number.isNaN(num) || num < 1 || num > TOTAL_SLOTS) && e.code) {
      const m = e.code.match(/^(?:Digit|Numpad)([1-8])$/);
      if (m) num = parseInt(m[1], 10);
    }
    if (num >= 1 && num <= TOTAL_SLOTS) {
      e.preventDefault();
      triggerSlot(num - 1);
    }
  });

  setInterval(() => {
    const active = isPlaying();
    bar.classList.toggle('is-visible', active);
    if (!active) return;
    bindDraggableSources();
    renderBar();
  }, 150);
})();

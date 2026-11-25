/**
 * App Main Controller
 * Mengintegrasikan Canvas, Toolbar, Inspector, Presets, dan Office Word Connector
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvasEl = document.getElementById('circuit-canvas');
  if (!canvasEl) {
    console.error('Elemen canvas tidak ditemukan!');
    return;
  }

  // UI Elements
  const inspectorPanel = document.getElementById('inspector-panel');
  const propLabel = document.getElementById('prop-label');
  const propValue = document.getElementById('prop-value');
  const propLabelGroup = document.getElementById('prop-label-group');
  const propValueGroup = document.getElementById('prop-value-group');
  const propDirGroup = document.getElementById('prop-dir-group');
  const propDirection = document.getElementById('prop-direction');
  const propSignGroup = document.getElementById('prop-sign-group');
  const propSign = document.getElementById('prop-sign');
  const propCurveGroup = document.getElementById('prop-curve-group');
  const propCurve = document.getElementById('prop-curve');
  const propCurveVal = document.getElementById('prop-curve-val');
  const btnFlipCurve = document.getElementById('btn-flip-curve');
  const btnCurveUp = document.getElementById('btn-curve-up');
  const btnCurveDown = document.getElementById('btn-curve-down');

  const propTextGroup = document.getElementById('prop-text-group');
  const propTextContent = document.getElementById('prop-text-content');
  const propTextSize = document.getElementById('prop-text-size');
  const propTextColor = document.getElementById('prop-text-color');

  // Switch & Multimeter & Simulation UI Elements
  const btnToggleSim = document.getElementById('btn-toggle-sim');
  const simBtnIcon = document.getElementById('sim-btn-icon');
  const simBtnText = document.getElementById('sim-btn-text');

  const propSwitchGroup = document.getElementById('prop-switch-group');
  const btnToggleSwitchProp = document.getElementById('btn-toggle-switch-prop');
  const propSwitchIcon = document.getElementById('prop-switch-icon');
  const propSwitchStatus = document.getElementById('prop-switch-status');

  const propMultimeterGroup = document.getElementById('prop-multimeter-group');
  const propMultimeterMode = document.getElementById('prop-multimeter-mode');
  const propDmmDisplayBadge = document.getElementById('prop-dmm-display-badge');

  const propLabelPosGroup = document.getElementById('prop-label-pos-group');
  const propLabelRotBadge = document.getElementById('prop-label-rot-badge');
  const btnPosTop = document.getElementById('btn-pos-top');
  const btnPosBottom = document.getElementById('btn-pos-bottom');
  const btnPosLeft = document.getElementById('btn-pos-left');
  const btnPosRight = document.getElementById('btn-pos-right');
  const btnPosReset = document.getElementById('btn-pos-reset');
  const btnRotateLabel = document.getElementById('btn-rotate-label');
  const propLabelOffsetX = document.getElementById('prop-label-offset-x');
  const propLabelOffsetY = document.getElementById('prop-label-offset-y');

  const analysisPreview = document.getElementById('analysis-preview');
  const toastEl = document.getElementById('toast-msg');

  let circuit = null;

  // Handler callback saat seleksi komponen berubah
  function handleSelectionChange(selected) {
    if (!selected) {
      if (inspectorPanel) inspectorPanel.style.display = 'none';
      return;
    }

    if (inspectorPanel) inspectorPanel.style.display = 'block';

    // 1. Jika yang dipilih adalah Kawat Melengkung
    if (selected.type === 'wire') {
      const wire = selected.item;
      if (propLabelGroup) propLabelGroup.style.display = 'none';
      if (propValueGroup) propValueGroup.style.display = 'none';
      if (propDirGroup) propDirGroup.style.display = 'none';
      if (propSignGroup) propSignGroup.style.display = 'none';
      if (propTextGroup) propTextGroup.style.display = 'none';
      if (propSwitchGroup) propSwitchGroup.style.display = 'none';
      if (propMultimeterGroup) propMultimeterGroup.style.display = 'none';
      if (propLabelPosGroup) propLabelPosGroup.style.display = 'none';

      if (wire.curved && propCurveGroup && propCurve) {
        propCurveGroup.style.display = 'block';
        const offset = wire.curveOffset !== undefined ? wire.curveOffset : 35;
        propCurve.value = offset;
        if (propCurveVal) propCurveVal.textContent = (offset > 0 ? '+' : '') + offset + ' px';
      } else {
        if (propCurveGroup) propCurveGroup.style.display = 'none';
      }
      return;
    }

    // 2. Jika yang dipilih adalah Elemen Teks Bebas / LaTeX
    const el = selected.item;
    if (el.type === 'text') {
      if (propLabelGroup) propLabelGroup.style.display = 'none';
      if (propValueGroup) propValueGroup.style.display = 'none';
      if (propDirGroup) propDirGroup.style.display = 'none';
      if (propSignGroup) propSignGroup.style.display = 'none';
      if (propCurveGroup) propCurveGroup.style.display = 'none';
      if (propSwitchGroup) propSwitchGroup.style.display = 'none';
      if (propMultimeterGroup) propMultimeterGroup.style.display = 'none';
      if (propLabelPosGroup) propLabelPosGroup.style.display = 'none';

      if (propTextGroup) {
        propTextGroup.style.display = 'block';
        if (propTextContent) {
          propTextContent.value = el.text || '';
          setTimeout(() => propTextContent.select(), 50);
        }
        if (propTextSize) propTextSize.value = el.fontSize || 14;
        if (propTextColor) propTextColor.value = el.color || '#0f172a';
      }
      return;
    }

    // 3. Jika yang dipilih adalah Komponen / Elemen Rangkaian Lainnya
    if (propTextGroup) propTextGroup.style.display = 'none';
    if (propLabelGroup) propLabelGroup.style.display = 'flex';
    if (propLabel) propLabel.value = el.label || '';
    if (propCurveGroup) propCurveGroup.style.display = 'none';

    // Pengaturan Posisi & Rotasi Teks Label Komponen
    if (propLabelPosGroup) {
      if (['resistor', 'capacitor', 'inductor', 'vsource_dc', 'vsource_ac', 'isource_dc', 'ground', 'switch', 'multimeter'].includes(el.type)) {
        propLabelPosGroup.style.display = 'block';
        if (propLabelOffsetX) propLabelOffsetX.value = el.labelOffsetX || 0;
        if (propLabelOffsetY) propLabelOffsetY.value = el.labelOffsetY || 0;
        if (propLabelRotBadge) propLabelRotBadge.textContent = 'Rotasi: ' + (el.labelRotation || 0) + '°';
      } else {
        propLabelPosGroup.style.display = 'none';
      }
    }

    // Saklar (Switch)
    if (propSwitchGroup) {
      if (el.type === 'switch') {
        propSwitchGroup.style.display = 'block';
        const isClosed = el.closed || el.value === 'Closed';
        if (propSwitchIcon) propSwitchIcon.textContent = isClosed ? '⚡' : '🔌';
        if (propSwitchStatus) propSwitchStatus.textContent = isClosed ? 'Buka Saklar (OFF)' : 'Tutup Saklar (ON)';
        if (btnToggleSwitchProp) {
          btnToggleSwitchProp.style.background = isClosed ? '#dc2626' : 'var(--primary)';
        }
      } else {
        propSwitchGroup.style.display = 'none';
      }
    }

    // Multimeter Digital (DMM)
    if (propMultimeterGroup) {
      if (el.type === 'multimeter') {
        propMultimeterGroup.style.display = 'block';
        if (propMultimeterMode) propMultimeterMode.value = el.meterMode || 'voltage_dc';
        if (propDmmDisplayBadge) {
          propDmmDisplayBadge.textContent = el.displayReading || (circuit && circuit.isSimulating ? '0.00 V' : '--.--');
        }
      } else {
        propMultimeterGroup.style.display = 'none';
      }
    }

    // Field value komponen
    if (propValueGroup && propValue) {
      if (['resistor', 'capacitor', 'inductor', 'vsource_dc', 'vsource_ac', 'isource_dc'].includes(el.type)) {
        propValueGroup.style.display = 'flex';
        propValue.value = el.value || '';
      } else {
        propValueGroup.style.display = 'none';
      }
    }

    // Pilihan arah panah arus / loop
    if (propDirGroup && propDirection) {
      if (el.type === 'current_arrow') {
        propDirGroup.style.display = 'flex';
        propDirection.innerHTML = `
          <option value="right">Kanan (→)</option>
          <option value="down">Bawah (↓)</option>
          <option value="left">Kiri (←)</option>
          <option value="up">Atas (↑)</option>
        `;
        propDirection.value = el.direction || 'right';
      } else if (el.type === 'mesh_loop') {
        propDirGroup.style.display = 'flex';
        propDirection.innerHTML = `
          <option value="cw">Searah Jarum Jam (CW ↻)</option>
          <option value="ccw">Berlawanan Arah (CCW ↺)</option>
        `;
        propDirection.value = el.direction || 'cw';
      } else {
        propDirGroup.style.display = 'none';
      }
    }

    // Polaritas
    if (propSignGroup && propSign) {
      if (el.type === 'polarity') {
        propSignGroup.style.display = 'flex';
        propSign.value = el.sign || '+';
      } else {
        propSignGroup.style.display = 'none';
      }
    }
  }

  // Handler callback saat rangkaian berubah (update teks persamaan)
  function handleCircuitChange(instance) {
    const c = instance || circuit;
    if (!c) return;
    if (typeof EquationHelper !== 'undefined' && analysisPreview) {
      analysisPreview.textContent = EquationHelper.generateSummary(c);
    }
  }

  // Handler callback saat status simulasi berubah
  function handleSimulationChange(isSimulating, results) {
    if (btnToggleSim) {
      if (isSimulating) {
        btnToggleSim.style.background = '#fee2e2';
        btnToggleSim.style.borderColor = '#ef4444';
        btnToggleSim.style.color = '#991b1b';
        if (simBtnIcon) simBtnIcon.textContent = '⏹️';
        if (simBtnText) simBtnText.textContent = 'Mode Simulasi: ON';
      } else {
        btnToggleSim.style.background = '#ecfdf5';
        btnToggleSim.style.borderColor = '#10b981';
        btnToggleSim.style.color = '#065f46';
        if (simBtnIcon) simBtnIcon.textContent = '▶️';
        if (simBtnText) simBtnText.textContent = 'Mode Simulasi: OFF';
      }
    }

    if (circuit?.selectedItem?.type === 'element') {
      const el = circuit.selectedItem.item;
      if (el.type === 'multimeter' && propDmmDisplayBadge) {
        propDmmDisplayBadge.textContent = el.displayReading || (isSimulating ? '0.00 V' : '--.--');
      }
    }
  }

  // Inisialisasi Canvas Engine
  const zoomIndicator = document.getElementById('zoom-indicator');

  circuit = new CircuitCanvas(canvasEl, {
    gridSize: 20,
    onSelectionChange: handleSelectionChange,
    onCircuitChange: handleCircuitChange,
    onSimulationChange: handleSimulationChange,
    onCurveChange: (offset) => {
      if (propCurve) propCurve.value = offset;
      if (propCurveVal) propCurveVal.textContent = (offset > 0 ? '+' : '') + offset + ' px';
    },
    onToolChange: (tool) => {
      toolButtons.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tool') === tool);
      });
    },
    onZoomChange: (scale) => {
      if (zoomIndicator) {
        zoomIndicator.textContent = Math.round(scale * 100) + '%';
      }
    }
  });

  // Floating Zoom Buttons
  document.getElementById('btn-zoom-in')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.zoomIn();
  });

  document.getElementById('btn-zoom-out')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.zoomOut();
  });

  document.getElementById('btn-zoom-reset')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.resetView();
  });

  document.getElementById('btn-zoom-fit')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.fitToCircuit();
  });

  // Load Preset awal
  if (typeof CircuitPresets !== 'undefined' && CircuitPresets.twoLoopCircuit) {
    loadPreset('twoLoopCircuit');
  }

  // --- TOOLBAR BINDINGS ---
  const toolButtons = document.querySelectorAll('.btn-tool[data-tool]');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tool = btn.getAttribute('data-tool');
      circuit.setTool(tool);

      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Action Buttons
  document.getElementById('btn-rotate')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (circuit.selectedItem) {
      circuit.rotateSelected();
    } else {
      circuit.rotateActiveTool();
    }
  });

  document.getElementById('btn-delete')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.deleteSelected();
  });

  document.getElementById('btn-undo')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.undo();
  });

  document.getElementById('btn-redo')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.redo();
  });

  document.getElementById('btn-clear')?.addEventListener('click', (e) => {
    e.preventDefault();
    circuit.clear();
    if (presetSelect) presetSelect.value = '';
    handleCircuitChange(circuit);
    showToast('Kanvas dibersihkan! (Tekan Ctrl+Z untuk membatalkan)');
  });

  // Preset Selector
  const presetSelect = document.getElementById('preset-select');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const presetKey = e.target.value;
      if (!presetKey) {
        circuit.clear();
        handleCircuitChange(circuit);
        showToast('Kanvas dikosongkan');
      } else if (typeof CircuitPresets !== 'undefined' && CircuitPresets[presetKey]) {
        loadPreset(presetKey);
      }
    });
  }

  function loadPreset(key) {
    const preset = CircuitPresets[key];
    if (!preset) return;
    circuit.elements = JSON.parse(JSON.stringify(preset.elements));
    circuit.wires = JSON.parse(JSON.stringify(preset.wires));
    circuit.selectedItem = null;
    circuit.saveState(false);
    circuit.render();
    handleCircuitChange(circuit);
    showToast(`Memuat preset: ${preset.name}`);
  }

  // Inspector input listeners
  propLabel?.addEventListener('input', () => {
    if (circuit?.selectedItem?.type === 'element') {
      circuit.selectedItem.item.label = propLabel.value;
      circuit.saveState(false);
      circuit.render();
      handleCircuitChange(circuit);
    }
  });

  propValue?.addEventListener('input', () => {
    if (circuit?.selectedItem?.type === 'element') {
      circuit.selectedItem.item.value = propValue.value;
      circuit.saveState(false);
      circuit.render();
      handleCircuitChange(circuit);
    }
  });

  propDirection?.addEventListener('change', () => {
    if (circuit?.selectedItem?.type === 'element') {
      circuit.selectedItem.item.direction = propDirection.value;
      circuit.saveState(false);
      circuit.render();
      handleCircuitChange(circuit);
    }
  });

  propSign?.addEventListener('change', () => {
    if (circuit?.selectedItem?.type === 'element') {
      circuit.selectedItem.item.sign = propSign.value;
      circuit.selectedItem.item.label = propSign.value;
      circuit.saveState(false);
      circuit.render();
      handleCircuitChange(circuit);
    }
  });

  propCurve?.addEventListener('input', () => {
    if (circuit?.selectedItem?.type === 'wire' && circuit.selectedItem.item.curved) {
      const val = parseInt(propCurve.value, 10);
      circuit.selectedItem.item.curveOffset = val;
      if (propCurveVal) propCurveVal.textContent = (val > 0 ? '+' : '') + val + ' px';
      circuit.saveState(false);
      circuit.render();
    }
  });

  btnFlipCurve?.addEventListener('click', (e) => {
    e.preventDefault();
    if (circuit?.selectedItem?.type === 'wire' && circuit.selectedItem.item.curved) {
      circuit.selectedItem.item.curveOffset = -circuit.selectedItem.item.curveOffset;
      if (propCurve) propCurve.value = circuit.selectedItem.item.curveOffset;
      if (propCurveVal) propCurveVal.textContent = (circuit.selectedItem.item.curveOffset > 0 ? '+' : '') + circuit.selectedItem.item.curveOffset + ' px';
      circuit.saveState(false);
      circuit.render();
    }
  });

  btnCurveUp?.addEventListener('click', (e) => {
    e.preventDefault();
    if (circuit?.selectedItem?.type === 'wire' && circuit.selectedItem.item.curved) {
      circuit.selectedItem.item.curveOffset = -Math.abs(circuit.selectedItem.item.curveOffset || 45);
      if (propCurve) propCurve.value = circuit.selectedItem.item.curveOffset;
      if (propCurveVal) propCurveVal.textContent = circuit.selectedItem.item.curveOffset + ' px';
      circuit.saveState(false);
      circuit.render();
    }
  });

  btnCurveDown?.addEventListener('click', (e) => {
    e.preventDefault();
    if (circuit?.selectedItem?.type === 'wire' && circuit.selectedItem.item.curved) {
      circuit.selectedItem.item.curveOffset = Math.abs(circuit.selectedItem.item.curveOffset || 45);
      if (propCurve) propCurve.value = circuit.selectedItem.item.curveOffset;
      if (propCurveVal) propCurveVal.textContent = '+' + circuit.selectedItem.item.curveOffset + ' px';
      circuit.saveState(false);
      circuit.render();
    }
  });

  propTextContent?.addEventListener('input', () => {
    if (circuit?.selectedItem?.type === 'element' && circuit.selectedItem.item.type === 'text') {
      circuit.selectedItem.item.text = propTextContent.value;
      circuit.saveState(false);
      circuit.render();
    }
  });

  propTextSize?.addEventListener('change', () => {
    if (circuit?.selectedItem?.type === 'element' && circuit.selectedItem.item.type === 'text') {
      circuit.selectedItem.item.fontSize = parseInt(propTextSize.value, 10);
      circuit.saveState(false);
      circuit.render();
    }
  });

  propTextColor?.addEventListener('change', () => {
    if (circuit?.selectedItem?.type === 'element' && circuit.selectedItem.item.type === 'text') {
      circuit.selectedItem.item.color = propTextColor.value;
      circuit.saveState(false);
      circuit.render();
    }
  });

  // --- TOGGLE SIMULASI RANGKAIAN (MNA DC SOLVER) ---
  btnToggleSim?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!circuit) return;
    const isSim = circuit.toggleSimulation();
    showToast(isSim ? 'Mode Simulasi Aktif: Perhitungan DC Berjalan' : 'Mode Simulasi Non-Aktif: Mode Desain / Skema');
  });

  // --- SAKLAR TOGGLE LISTENER ---
  btnToggleSwitchProp?.addEventListener('click', (e) => {
    e.preventDefault();
    if (circuit?.selectedItem?.type === 'element' && circuit.selectedItem.item.type === 'switch') {
      circuit.toggleSwitch(circuit.selectedItem.item);
    }
  });

  // --- MULTIMETER MODE LISTENER ---
  propMultimeterMode?.addEventListener('change', () => {
    if (circuit?.selectedItem?.type === 'element' && circuit.selectedItem.item.type === 'multimeter') {
      circuit.selectedItem.item.meterMode = propMultimeterMode.value;
      circuit.saveState(false);
      if (circuit.isSimulating) {
        circuit.runSimulation();
      } else {
        circuit.render();
      }
      handleSelectionChange(circuit.selectedItem);
    }
  });

  // --- POSISI & ROTASI TEKS LABEL KOMPONEN ---
  function updateElementLabelPosition(dx, dy, rot) {
    if (!circuit?.selectedItem || circuit.selectedItem.type !== 'element') return;
    const el = circuit.selectedItem.item;
    if (dx !== null) el.labelOffsetX = dx;
    if (dy !== null) el.labelOffsetY = dy;
    if (rot !== null) el.labelRotation = rot;

    if (propLabelOffsetX) propLabelOffsetX.value = el.labelOffsetX || 0;
    if (propLabelOffsetY) propLabelOffsetY.value = el.labelOffsetY || 0;
    if (propLabelRotBadge) propLabelRotBadge.textContent = 'Rotasi: ' + (el.labelRotation || 0) + '°';

    circuit.saveState(false);
    circuit.render();
  }

  btnPosTop?.addEventListener('click', (e) => {
    e.preventDefault();
    updateElementLabelPosition(0, -24, null);
  });

  btnPosBottom?.addEventListener('click', (e) => {
    e.preventDefault();
    updateElementLabelPosition(0, 24, null);
  });

  btnPosLeft?.addEventListener('click', (e) => {
    e.preventDefault();
    updateElementLabelPosition(-32, 0, null);
  });

  btnPosRight?.addEventListener('click', (e) => {
    e.preventDefault();
    updateElementLabelPosition(32, 0, null);
  });

  btnPosReset?.addEventListener('click', (e) => {
    e.preventDefault();
    updateElementLabelPosition(0, 0, 0);
  });

  btnRotateLabel?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!circuit?.selectedItem || circuit.selectedItem.type !== 'element') return;
    const el = circuit.selectedItem.item;
    const nextRot = ((el.labelRotation || 0) + 90) % 360;
    updateElementLabelPosition(null, null, nextRot);
  });

  propLabelOffsetX?.addEventListener('input', () => {
    if (!circuit?.selectedItem || circuit.selectedItem.type !== 'element') return;
    const val = parseInt(propLabelOffsetX.value, 10) || 0;
    circuit.selectedItem.item.labelOffsetX = val;
    circuit.saveState(false);
    circuit.render();
  });

  propLabelOffsetY?.addEventListener('input', () => {
    if (!circuit?.selectedItem || circuit.selectedItem.type !== 'element') return;
    const val = parseInt(propLabelOffsetY.value, 10) || 0;
    circuit.selectedItem.item.labelOffsetY = val;
    circuit.saveState(false);
    circuit.render();
  });

  // --- ACTIONS: SALIN KE WORD (CLIPBOARD), SALIN ANALISIS, UNDUH PNG ---
  const btnCopyImage = document.getElementById('btn-copy-image') || document.getElementById('btn-insert-word');

  btnCopyImage?.addEventListener('click', async (e) => {
    e.preventDefault();
    const originalHtml = btnCopyImage.innerHTML;
    btnCopyImage.disabled = true;
    btnCopyImage.innerHTML = '<span>⏳ Menyalin gambar...</span>';

    try {
      const dataUrl = circuit.toDataURL(2);
      const result = await ClipboardHelper.copyImageToClipboard(dataUrl);
      showToast(result.message);
    } catch (err) {
      showToast('Gagal: ' + err.message);
    } finally {
      btnCopyImage.disabled = false;
      btnCopyImage.innerHTML = originalHtml;
    }
  });

  // Salin Teks Analisis
  document.getElementById('btn-copy-summary')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const summary = EquationHelper.generateSummary(circuit);
    const ok = await ClipboardHelper.copyTextToClipboard(summary);
    if (ok) {
      showToast('Teks analisis & rumus berhasil disalin ke clipboard!');
    } else {
      showToast('Gagal menyalin teks.');
    }
  });

  // Unduh Gambar PNG
  document.getElementById('btn-download-img')?.addEventListener('click', (e) => {
    e.preventDefault();
    const dataUrl = circuit.toDataURL(2);
    ClipboardHelper.downloadImage(dataUrl, 'rangkaian-listrik.png');
    showToast('Gambar rangkaian berhasil diunduh!');
  });

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    if (toastEl.classList) {
      toastEl.classList.add('show');
      setTimeout(() => {
        toastEl.classList.remove('show');
      }, 3200);
    }
  }
});

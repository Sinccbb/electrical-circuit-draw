/**
 * CircuitCanvas Engine
 * Canvas interaktif untuk menggambar rangkaian listrik & anotasi analisis
 * Dilengkapi Pan & Zoom (Geser Kanvas dengan Hold Mouse / Spacebar / Middle Click / Scroll Zoom)
 * Mendukung LaTeX, Kawat Lurus & Kawat Lengkung, Navigasi Panah Keyboard, Rotasi 'R' sebelum pasang, dan Klik Kanan Cancel
 */

class CircuitCanvas {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.gridSize = options.gridSize || 20;
    this.showGrid = true;
    
    // Transformasi Viewport (Pan & Zoom)
    this.scale = 1.0; // 0.25x - 4.0x
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.initialPan = { x: 0, y: 0 };
    this.spacePressed = false;

    // State Rangkaian (disimpan dalam koordinat World)
    this.elements = [];
    this.wires = [];
    this.selectedItem = null;
    this.currentTool = 'select'; // select, pan, wire, curved_wire, resistor, capacitor, inductor, vsource_dc, vsource_ac, isource_dc, ground, switch, node, current_arrow, mesh_loop, polarity, node_label
    
    // Rotasi & Orientasi Alat Sebelum Ditaruh
    this.placementRotation = 0; // 0, 90, 180, 270
    this.placementDirection = 'right'; // right, down, left, up untuk panah arus
    this.placementLoopDir = 'cw'; // cw, ccw untuk loop KVL
    this.placementSign = '+'; // + atau -
    this.placementCurvature = 35; // lengkungan default untuk curved_wire

    // State Kawat
    this.isDrawingWire = false;
    this.wireStart = null;
    this.currentMousePos = { x: 0, y: 0 }; // World pos
    this.currentScreenMousePos = { x: 0, y: 0 };
    this.isMouseInside = false;
    
    // Dragging Komponen
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    // History Undo/Redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 35;

    // Callbacks
    this.onSelectionChange = options.onSelectionChange || null;
    this.onCircuitChange = options.onCircuitChange || null;
    this.onToolChange = options.onToolChange || null;
    this.onZoomChange = options.onZoomChange || null;
    this.onCurveChange = options.onCurveChange || null;
    this.onSimulationChange = options.onSimulationChange || null;

    // Simulation Engine State (Default: Aktif Live seperti Proteus)
    this.isSimulating = true;
    this.simulationResults = null;
    this.simulationPaused = false;

    // Terminal Port Snapping & Wire Dynamic Binding (draw.io style)
    this.wireStartBinding = null;
    this.activeSnapTarget = null;
    this.isDraggingCurveHandle = false;

    // Sinkronisasi ukuran canvas internal dengan ukuran tampilan CSS agar tidak gepeng/terdistorsi
    this.handleResize();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', () => this.handleResize());
      if (window.ResizeObserver && this.canvas.parentElement) {
        new ResizeObserver(() => this.handleResize()).observe(this.canvas.parentElement);
      }
    }

    this.initEvents();
    this.saveState(false);
    this.render();
  }

  // --- SINKRONISASI UKURAN BUFFER PIXEL DENGAN LAYAR (ANTI-GEPENG) ---

  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w > 0 && h > 0 && (this.canvas.width !== w || this.canvas.height !== h)) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.render();
    }
  }

  // --- KOORDINAT & TRANSPLASI VIEWPORT ---

  snap(val) {
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.panX) / this.scale,
      y: (screenY - this.panY) / this.scale
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.scale + this.panX,
      y: worldY * this.scale + this.panY
    };
  }

  zoomAt(screenX, screenY, factor) {
    const newScale = Math.min(Math.max(0.25, this.scale * factor), 4.0);
    this.panX = screenX - (screenX - this.panX) * (newScale / this.scale);
    this.panY = screenY - (screenY - this.panY) * (newScale / this.scale);
    this.scale = newScale;
    this.render();
    if (this.onZoomChange) this.onZoomChange(this.scale);
  }

  zoomIn() {
    this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 1.25);
  }

  zoomOut() {
    this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 0.8);
  }

  resetView() {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.render();
    if (this.onZoomChange) this.onZoomChange(this.scale);
  }

  fitToCircuit() {
    if (this.elements.length === 0 && this.wires.length === 0) {
      this.resetView();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of this.elements) {
      minX = Math.min(minX, el.x - 40);
      maxX = Math.max(maxX, el.x + 40);
      minY = Math.min(minY, el.y - 40);
      maxY = Math.max(maxY, el.y + 40);
    }
    for (const w of this.wires) {
      minX = Math.min(minX, w.x1 - 20, w.x2 - 20);
      maxX = Math.max(maxX, w.x1 + 20, w.x2 + 20);
      minY = Math.min(minY, w.y1 - 20, w.y2 - 20);
      maxY = Math.max(maxY, w.y1 + 20, w.y2 + 20);
    }

    const cW = maxX - minX;
    const cH = maxY - minY;
    const pad = 60;

    const scaleX = (this.canvas.width - pad * 2) / cW;
    const scaleY = (this.canvas.height - pad * 2) / cH;
    this.scale = Math.min(Math.max(0.3, Math.min(scaleX, scaleY)), 2.0);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    this.panX = this.canvas.width / 2 - midX * this.scale;
    this.panY = this.canvas.height / 2 - midY * this.scale;

    this.render();
    if (this.onZoomChange) this.onZoomChange(this.scale);
  }

  updateCursor() {
    if (this.isPanning) {
      this.canvas.style.cursor = 'grabbing';
    } else if (this.spacePressed || this.currentTool === 'pan') {
      this.canvas.style.cursor = 'grab';
    } else if (this.currentTool === 'select') {
      this.canvas.style.cursor = 'default';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  // --- STATE HISTORY ---

  saveState(notify = true) {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    const state = JSON.stringify({
      elements: this.elements,
      wires: this.wires
    });
    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    if (notify && this.onCircuitChange) {
      this.onCircuitChange(this);
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = JSON.parse(this.history[this.historyIndex]);
      this.elements = state.elements;
      this.wires = state.wires;
      this.selectedItem = null;
      this.render();
      if (this.onSelectionChange) this.onSelectionChange(null);
      if (this.onCircuitChange) this.onCircuitChange(this);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = JSON.parse(this.history[this.historyIndex]);
      this.elements = state.elements;
      this.wires = state.wires;
      this.selectedItem = null;
      this.render();
      if (this.onSelectionChange) this.onSelectionChange(null);
      if (this.onCircuitChange) this.onCircuitChange(this);
    }
  }

  clear() {
    this.elements = [];
    this.wires = [];
    this.selectedItem = null;
    this.saveState();
    this.render();
    if (this.onSelectionChange) this.onSelectionChange(null);
  }

  // --- TERMINAL PORTS & DYNAMIC WIRE BINDING (DRAW.IO STYLE) ---

  getTerminals(el) {
    if (!el) return [];
    const rad = ((el.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const toWorld = (lx, ly, name = '') => ({
      id: `${el.id}_${name}`,
      elementId: el.id,
      x: Math.round(el.x + lx * cos - ly * sin),
      y: Math.round(el.y + lx * sin + ly * cos),
      name
    });

    switch (el.type) {
      case 'resistor':
      case 'capacitor':
      case 'inductor':
      case 'vsource_dc':
      case 'vsource_ac':
      case 'isource_dc':
      case 'switch':
      case 'dc_voltmeter':
      case 'ac_voltmeter':
      case 'dc_ammeter':
      case 'ac_ammeter':
      case 'vcvs':
      case 'vccs':
        return [
          toWorld(-30, 0, 't1'),
          toWorld(30, 0, 't2')
        ];
      case 'multimeter':
        return [
          toWorld(-30, 10, 'probe_red'),
          toWorld(30, 10, 'probe_black')
        ];
      case 'wattmeter':
        return [
          toWorld(-30, -10, 'i_in'),
          toWorld(30, -10, 'i_out'),
          toWorld(-30, 15, 'v_pos'),
          toWorld(30, 15, 'v_neg')
        ];
      case 'opamp':
        return [
          toWorld(-30, -12, 'inv'),
          toWorld(-30, 12, 'non_inv'),
          toWorld(30, 0, 'out')
        ];
      case 'ground':
        return [
          toWorld(0, -15, 't1')
        ];
      case 'node':
      case 'node_label':
        return [
          toWorld(0, 0, 't1')
        ];
      default:
        return [];
    }
  }

  findNearestTerminal(x, y, maxDist = 20, excludeElementId = null) {
    let nearest = null;
    let minDist = maxDist;

    for (const el of this.elements) {
      if (excludeElementId && el.id === excludeElementId) continue;
      const terms = this.getTerminals(el);
      for (const t of terms) {
        const d = Math.hypot(t.x - x, t.y - y);
        if (d < minDist) {
          minDist = d;
          nearest = t;
        }
      }
    }
    return nearest;
  }

  getSnapPos(worldPos, excludeElementId = null) {
    // 1. Prioritas Utama: Terminal komponen (magnet snap)
    const term = this.findNearestTerminal(worldPos.x, worldPos.y, 20, excludeElementId);
    if (term) {
      return { x: term.x, y: term.y, terminal: term };
    }

    // 2. Prioritas Kedua: Ujung kawat yang sudah ada
    for (const w of this.wires) {
      if (Math.hypot(w.x1 - worldPos.x, w.y1 - worldPos.y) <= 14) {
        return { x: w.x1, y: w.y1, wireEnd: true, terminal: null };
      }
      if (Math.hypot(w.x2 - worldPos.x, w.y2 - worldPos.y) <= 14) {
        return { x: w.x2, y: w.y2, wireEnd: true, terminal: null };
      }
    }

    // 3. Fallback: Grid standar
    return { x: this.snap(worldPos.x), y: this.snap(worldPos.y), terminal: null };
  }

  moveElement(el, newX, newY) {
    const oldTerms = this.getTerminals(el);
    el.x = newX;
    el.y = newY;
    const newTerms = this.getTerminals(el);

    for (const w of this.wires) {
      // Periksa titik awal kawat (x1, y1)
      let bound1 = false;
      if (w.startBinding && w.startBinding.elementId === el.id) {
        const t = newTerms[w.startBinding.terminalIndex || 0] || newTerms[0];
        if (t) {
          w.x1 = t.x;
          w.y1 = t.y;
          bound1 = true;
        }
      }
      if (!bound1) {
        for (let i = 0; i < oldTerms.length; i++) {
          if (w.x1 === oldTerms[i].x && w.y1 === oldTerms[i].y) {
            w.x1 = newTerms[i].x;
            w.y1 = newTerms[i].y;
            w.startBinding = { elementId: el.id, terminalIndex: i };
            break;
          }
        }
      }

      // Periksa titik akhir kawat (x2, y2)
      let bound2 = false;
      if (w.endBinding && w.endBinding.elementId === el.id) {
        const t = newTerms[w.endBinding.terminalIndex || 0] || newTerms[0];
        if (t) {
          w.x2 = t.x;
          w.y2 = t.y;
          bound2 = true;
        }
      }
      if (!bound2) {
        for (let i = 0; i < oldTerms.length; i++) {
          if (w.x2 === oldTerms[i].x && w.y2 === oldTerms[i].y) {
            w.x2 = newTerms[i].x;
            w.y2 = newTerms[i].y;
            w.endBinding = { elementId: el.id, terminalIndex: i };
            break;
          }
        }
      }
    }
  }

  rotateElement(el) {
    const oldTerms = this.getTerminals(el);
    el.rotation = ((el.rotation || 0) + 90) % 360;
    const newTerms = this.getTerminals(el);

    for (const w of this.wires) {
      let bound1 = false;
      if (w.startBinding && w.startBinding.elementId === el.id) {
        const t = newTerms[w.startBinding.terminalIndex || 0] || newTerms[0];
        if (t) { w.x1 = t.x; w.y1 = t.y; bound1 = true; }
      }
      if (!bound1) {
        for (let i = 0; i < oldTerms.length; i++) {
          if (w.x1 === oldTerms[i].x && w.y1 === oldTerms[i].y) {
            w.x1 = newTerms[i].x; w.y1 = newTerms[i].y;
            w.startBinding = { elementId: el.id, terminalIndex: i };
            break;
          }
        }
      }

      let bound2 = false;
      if (w.endBinding && w.endBinding.elementId === el.id) {
        const t = newTerms[w.endBinding.terminalIndex || 0] || newTerms[0];
        if (t) { w.x2 = t.x; w.y2 = t.y; bound2 = true; }
      }
      if (!bound2) {
        for (let i = 0; i < oldTerms.length; i++) {
          if (w.x2 === oldTerms[i].x && w.y2 === oldTerms[i].y) {
            w.x2 = newTerms[i].x; w.y2 = newTerms[i].y;
            w.endBinding = { elementId: el.id, terminalIndex: i };
            break;
          }
        }
      }
    }
  }

  drawTerminalPorts(ctx) {
    const shouldShow = (
      this.currentTool === 'wire' ||
      this.currentTool === 'curved_wire' ||
      this.isDrawingWire ||
      this.isDragging ||
      this.isMouseInside
    );
    if (!shouldShow) return;

    for (const el of this.elements) {
      if (['text', 'current_arrow', 'mesh_loop', 'polarity'].includes(el.type)) continue;
      const terms = this.getTerminals(el);
      for (const t of terms) {
        const isSnapped = (
          this.activeSnapTarget &&
          this.activeSnapTarget.terminal &&
          this.activeSnapTarget.terminal.elementId === t.elementId &&
          this.activeSnapTarget.terminal.name === t.name
        );

        ctx.save();
        if (isSnapped) {
          // Glow ring saat magnet aktif
          ctx.beginPath();
          ctx.arc(t.x, t.y, 9, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
          ctx.lineWidth = 5;
          ctx.stroke();

          // Port hijau aktif
          ctx.beginPath();
          ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Port biasa (titik biru halus draw.io)
          ctx.beginPath();
          ctx.arc(t.x, t.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  setTool(tool) {
    this.currentTool = tool;
    if (this.isDrawingWire) {
      this.isDrawingWire = false;
      this.wireStart = null;
    }
    this.updateCursor();
    this.render();
  }

  // --- EVENT LISTENERS ---

  initEvents() {
    const getScreenPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width ? (this.canvas.width / rect.width) : 1;
      const scaleY = rect.height ? (this.canvas.height / rect.height) : 1;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    // 1. Zoom dengan Scroll Mouse
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const screenPos = getScreenPos(e);
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      this.zoomAt(screenPos.x, screenPos.y, zoomFactor);
    }, { passive: false });

    this.canvas.addEventListener('mouseenter', () => {
      this.isMouseInside = true;
    });

    // 2. Klik Kanan: Batalkan / Berhenti Menggambar
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.isDrawingWire) {
        this.isDrawingWire = false;
        this.wireStart = null;
      } else {
        this.setTool('select');
        if (this.onToolChange) this.onToolChange('select');
      }
      this.render();
    });

    // 3. Mousedown: Mulai Pan, Drag Komponen, atau Tarik Kawat
    this.canvas.addEventListener('mousedown', (e) => {
      const screenPos = getScreenPos(e);
      const worldPos = this.screenToWorld(screenPos.x, screenPos.y);
      const snappedWorldPos = { x: this.snap(worldPos.x), y: this.snap(worldPos.y) };

      // A. Panning dengan Middle Click (Roda Mouse) atau Spacebar atau Tool 'pan'
      if (e.button === 1 || this.spacePressed || this.currentTool === 'pan') {
        e.preventDefault();
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.initialPan = { x: this.panX, y: this.panY };
        this.updateCursor();
        return;
      }

      // B. Klik Kiri
      if (e.button === 0) {
        if (this.currentTool === 'select') {
          const hit = this.hitTest(worldPos.x, worldPos.y);
          this.selectedItem = hit;

          if (hit) {
            this.isDragging = true;
            if (hit.type === 'wire_curve_handle') {
              this.isDraggingCurveHandle = true;
            } else if (hit.type === 'wire') {
              this.isDraggingCurveHandle = false;
              this.dragOffset = { x: worldPos.x - hit.item.x1, y: worldPos.y - hit.item.y1 };
            } else {
              this.isDraggingCurveHandle = false;
              this.dragOffset = { x: worldPos.x - hit.item.x, y: worldPos.y - hit.item.y };
            }
          } else {
            // Klik area kosong -> Mulai geser/pan kanvas!
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.initialPan = { x: this.panX, y: this.panY };
            this.updateCursor();
          }
          if (this.onSelectionChange) this.onSelectionChange(this.selectedItem);
        } else if (this.currentTool === 'wire' || this.currentTool === 'curved_wire') {
          const isCurved = (this.currentTool === 'curved_wire');
          const snap = this.getSnapPos(worldPos);

          if (!this.isDrawingWire) {
            this.isDrawingWire = true;
            this.wireStart = { x: snap.x, y: snap.y };
            this.wireStartBinding = snap.terminal ? {
              elementId: snap.terminal.elementId,
              terminalIndex: snap.terminal.name === 't2' ? 1 : 0
            } : null;
          } else {
            if (this.wireStart.x !== snap.x || this.wireStart.y !== snap.y) {
              const endBinding = snap.terminal ? {
                elementId: snap.terminal.elementId,
                terminalIndex: snap.terminal.name === 't2' ? 1 : 0
              } : null;

              const newWire = {
                id: 'wire_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                x1: this.wireStart.x,
                y1: this.wireStart.y,
                x2: snap.x,
                y2: snap.y,
                curved: isCurved,
                curveOffset: isCurved ? this.placementCurvature : 0,
                startBinding: this.wireStartBinding,
                endBinding: endBinding
              };
              this.wires.push(newWire);
              this.saveState();
              if (this.isSimulating) {
                this.runSimulation();
              }
              if (this.onCircuitChange) this.onCircuitChange(this);
              if (isCurved) {
                this.selectedItem = { type: 'wire', item: newWire };
                if (this.onSelectionChange) this.onSelectionChange(this.selectedItem);
              }
            }
            if (isCurved) {
              this.isDrawingWire = false;
              this.wireStart = null;
              this.wireStartBinding = null;
            } else {
              this.wireStart = { x: snap.x, y: snap.y };
              this.wireStartBinding = snap.terminal ? {
                elementId: snap.terminal.elementId,
                terminalIndex: snap.terminal.name === 't2' ? 1 : 0
              } : null;
            }
          }
        } else {
          // Letakkan komponen dengan magnet snap
          const snap = this.getSnapPos(worldPos);
          this.placeItem(this.currentTool, snap.x, snap.y);
        }
        this.render();
      }
    });

    // 4. Mousemove: Geser kanvas atau geser komponen
    this.canvas.addEventListener('mousemove', (e) => {
      const screenPos = getScreenPos(e);
      const worldPos = this.screenToWorld(screenPos.x, screenPos.y);
      this.currentMousePos = worldPos;
      this.currentScreenMousePos = screenPos;
      this.isMouseInside = true;

      // Update magnet terminal snap target untuk indikator visual
      this.activeSnapTarget = this.getSnapPos(worldPos, (this.selectedItem && this.selectedItem.type === 'element') ? this.selectedItem.item.id : null);

      if (this.isPanning) {
        // Menggeser posisi kanvas
        const dx = e.clientX - this.panStart.x;
        const dy = e.clientY - this.panStart.y;
        this.panX = this.initialPan.x + dx;
        this.panY = this.initialPan.y + dy;
        this.render();
      } else if (this.isDragging && this.selectedItem) {
        if (this.isDraggingCurveHandle || this.selectedItem.type === 'wire_curve_handle') {
          // Mengatur lengkungan kawat secara bebas (Atas, Bawah, dll.)
          const w = this.selectedItem.item;
          const mx = (w.x1 + w.x2) / 2;
          const my = (w.y1 + w.y2) / 2;
          const dx = w.x2 - w.x1;
          const dy = w.y2 - w.y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const offset = Math.round((worldPos.x - mx) * nx + (worldPos.y - my) * ny);
          w.curveOffset = Math.max(-250, Math.min(250, offset));
          if (this.onCurveChange) this.onCurveChange(w.curveOffset);
          this.render();
        } else if (this.selectedItem.type === 'element') {
          // Menggeser komponen DAN kawat otomatis mengikutinya (draw.io style)
          const el = this.selectedItem.item;
          const newX = this.snap(worldPos.x - this.dragOffset.x);
          const newY = this.snap(worldPos.y - this.dragOffset.y);
          if (el.x !== newX || el.y !== newY) {
            this.moveElement(el, newX, newY);
            this.render();
            if (this.onCircuitChange) this.onCircuitChange(this);
          }
        } else if (this.selectedItem.type === 'wire') {
          const w = this.selectedItem.item;
          const dx = (worldPos.x - this.dragOffset.x) - w.x1;
          const dy = (worldPos.y - this.dragOffset.y) - w.y1;
          const snapDx = this.snap(dx);
          const snapDy = this.snap(dy);
          if (snapDx !== 0 || snapDy !== 0) {
            w.x1 += snapDx;
            w.y1 += snapDy;
            w.x2 += snapDx;
            w.y2 += snapDy;
            this.dragOffset.x += snapDx;
            this.dragOffset.y += snapDy;
            this.render();
          }
        }
      } else {
        this.render();
      }
    });

    const endAction = () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.updateCursor();
      }
      if (this.isDragging) {
        this.isDragging = false;
        this.isDraggingCurveHandle = false;
        this.saveState();
        if (this.isSimulating) {
          this.runSimulation();
        }
        if (this.onCircuitChange) this.onCircuitChange(this);
      }
    };

    this.canvas.addEventListener('mouseup', endAction);
    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseInside = false;
      endAction();
      this.render();
    });

    this.canvas.addEventListener('dblclick', () => {
      if (this.isDrawingWire) {
        this.isDrawingWire = false;
        this.wireStart = null;
        this.render();
        return;
      }
      if (this.selectedItem && this.selectedItem.type === 'element') {
        if (this.selectedItem.item.type === 'switch') {
          this.toggleSwitch(this.selectedItem.item);
          return;
        }
        if (this.selectedItem.item.type === 'text') {
          const textInput = document.getElementById('prop-text-content');
          if (textInput) {
            textInput.focus();
            textInput.select();
          }
        }
      }
    });

    // 5. Keyboard Events
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        return;
      }

      // Spacebar: Toggle Saklar jika saklar sedang dipilih, atau hold untuk Pan kanvas
      if (e.code === 'Space') {
        if (this.selectedItem && this.selectedItem.type === 'element' && this.selectedItem.item.type === 'switch') {
          e.preventDefault();
          this.toggleSwitch(this.selectedItem.item);
          return;
        }
        if (!this.spacePressed) {
          e.preventDefault();
          this.spacePressed = true;
          this.updateCursor();
        }
      }

      // Tombol 'R': Rotasi 90 Derajat
      // Tombol 'R': Rotasi 90 Derajat atau Balik Lengkungan Kawat
      else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (this.isDrawingWire && this.currentTool === 'curved_wire') {
          this.placementCurvature = -this.placementCurvature;
          this.render();
        } else if (this.selectedItem) {
          this.rotateSelected();
        } else {
          this.rotateActiveTool();
        }
      }

      // Tombol Panah (ArrowLeft, ArrowRight, ArrowUp, ArrowDown) untuk Mengatur Posisi
      else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (this.selectedItem) {
          e.preventDefault();
          const step = e.shiftKey ? 5 : this.gridSize;
          let dx = 0, dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;

          if (this.selectedItem.type === 'element') {
            const el = this.selectedItem.item;
            this.moveElement(el, el.x + dx, el.y + dy);
          } else if (this.selectedItem.type === 'wire') {
            this.selectedItem.item.x1 += dx;
            this.selectedItem.item.y1 += dy;
            this.selectedItem.item.x2 += dx;
            this.selectedItem.item.y2 += dy;
          }
          this.saveState();
          this.render();
        }
      }

      // Shortcut Zoom: '+' / '=' untuk zoom in, '-' untuk zoom out, '0' untuk reset
      else if (e.key === '+' || e.key === '=') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.zoomIn();
        }
      } else if (e.key === '-' || e.key === '_') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.zoomOut();
        }
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.resetView();
      }

      // Delete / Backspace
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedItem) {
          e.preventDefault();
          this.deleteSelected();
        }
      }

      // Escape: batalkan aksi
      else if (e.key === 'Escape') {
        this.isDrawingWire = false;
        this.wireStart = null;
        this.selectedItem = null;
        this.setTool('select');
        if (this.onToolChange) this.onToolChange('select');
        if (this.onSelectionChange) this.onSelectionChange(null);
        this.render();
      }

      // Undo / Redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.redo();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
        this.updateCursor();
      }
    });
  }

  // Rotasi alat yang sedang aktif sebelum diletakkan
  rotateActiveTool() {
    if (this.currentTool === 'current_arrow') {
      const dirs = ['right', 'down', 'left', 'up'];
      const nextIdx = (dirs.indexOf(this.placementDirection) + 1) % 4;
      this.placementDirection = dirs[nextIdx];
    } else if (this.currentTool === 'mesh_loop') {
      this.placementLoopDir = (this.placementLoopDir === 'cw') ? 'ccw' : 'cw';
    } else if (this.currentTool === 'polarity') {
      this.placementSign = (this.placementSign === '+') ? '-' : '+';
    } else if (this.currentTool === 'curved_wire') {
      this.placementCurvature = -this.placementCurvature;
    } else {
      this.placementRotation = (this.placementRotation + 90) % 360;
    }
    this.render();
  }

  placeItem(type, x, y) {
    const id = type + '_' + Date.now();
    let newItem = null;

    switch (type) {
      case 'resistor':
        newItem = { id, type, x, y, rotation: this.placementRotation, label: '$R_' + (this.countType('resistor') + 1) + '$', value: '$10\\ \\Omega$', labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0 };
        break;
      case 'capacitor':
        newItem = { id, type, x, y, rotation: this.placementRotation, label: '$C_' + (this.countType('capacitor') + 1) + '$', value: '$100\\ \\mu\\text{F}$', labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0 };
        break;
      case 'inductor':
        newItem = { id, type, x, y, rotation: this.placementRotation, label: '$L_' + (this.countType('inductor') + 1) + '$', value: '$10\\ \\text{mH}$', labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0 };
        break;
      case 'vsource_dc':
        newItem = { id, type, x, y, rotation: this.placementRotation, label: '$V_' + (this.countType('vsource_dc') + 1) + '$', value: '$12\\ \\text{V}$', labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0 };
        break;
      case 'vsource_ac':
        newItem = { id, type, x, y, rotation: this.placementRotation, label: '$V_{s' + (this.countType('vsource_ac') + 1) + '}$', value: '$220\\ \\text{V}$', labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0 };
        break;
      case 'isource_dc':
        newItem = { id, type, x, y, rotation: this.placementRotation, label: '$I_' + (this.countType('isource_dc') + 1) + '$', value: '$2\\ \\text{A}$', labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0 };
        break;
      case 'ground':
        newItem = { id, type, x, y, rotation: this.placementRotation, label: 'GND', value: '', labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0 };
        break;
      case 'switch':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: '$S_' + (this.countType('switch') + 1) + '$',
          value: 'Open',
          closed: false,
          labelOffsetX: 0,
          labelOffsetY: 0,
          labelRotation: 0
        };
        break;
      case 'multimeter':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: 'DMM ' + (this.countType('multimeter') + 1),
          value: '',
          meterMode: 'voltage_dc',
          displayReading: this.isSimulating ? '0.00 V' : '--.--',
          labelOffsetX: 0,
          labelOffsetY: 0,
          labelRotation: 0
        };
        break;
      case 'dc_voltmeter':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: 'VM ' + (this.countType('dc_voltmeter') + 1),
          value: '',
          displayReading: this.isSimulating ? '0.00 V' : '--.--',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'dc_ammeter':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: 'AM ' + (this.countType('dc_ammeter') + 1),
          value: '',
          displayReading: this.isSimulating ? '0.00 A' : '--.--',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'ac_voltmeter':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: 'AC VM ' + (this.countType('ac_voltmeter') + 1),
          value: '',
          displayReading: this.isSimulating ? '0.00 V~' : '--.--',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'ac_ammeter':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: 'AC AM ' + (this.countType('ac_ammeter') + 1),
          value: '',
          displayReading: this.isSimulating ? '0.00 A~' : '--.--',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'wattmeter':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: 'WM ' + (this.countType('wattmeter') + 1),
          value: '',
          displayReading: this.isSimulating ? '0.00 W' : '--.--',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'opamp':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: 'U' + (this.countType('opamp') + 1),
          value: 'LM741',
          displayReading: '0.00 V',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'vcvs':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: '$E_' + (this.countType('vcvs') + 1) + '$',
          value: '$2\\ V_x$',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'vccs':
        newItem = {
          id, type, x, y,
          rotation: this.placementRotation,
          label: '$G_' + (this.countType('vccs') + 1) + '$',
          value: '$0.5\\ I_1$',
          labelOffsetX: 0, labelOffsetY: 0, labelRotation: 0
        };
        break;
      case 'node':
        newItem = { id, type, x, y, rotation: 0, label: '', value: '' };
        break;
      case 'current_arrow':
        newItem = { 
          id, type, x, y, rotation: 0, 
          label: '$I_' + (this.countType('current_arrow') + 1) + '$', 
          value: '', 
          direction: this.placementDirection 
        };
        break;
      case 'mesh_loop':
        newItem = { 
          id, type, x, y, rotation: 0, 
          label: 'Loop ' + (this.countType('mesh_loop') + 1), 
          direction: this.placementLoopDir, 
          radius: 28 
        };
        break;
      case 'polarity':
        newItem = { id, type, x, y, rotation: 0, label: this.placementSign, sign: this.placementSign };
        break;
      case 'node_label':
        newItem = { 
          id, type, x, y, rotation: 0, 
          label: '$V_' + String.fromCharCode(65 + this.countType('node_label')) + '$'
        };
        break;
      case 'text':
        newItem = {
          id,
          type,
          x,
          y,
          rotation: this.placementRotation,
          text: '$V_{th} = 10\\ \\text{V}$',
          fontSize: 14,
          color: '#0f172a'
        };
        break;
    }

    if (newItem) {
      this.elements.push(newItem);
      this.selectedItem = { type: 'element', item: newItem };
      this.saveState();
      if (this.isSimulating) {
        this.runSimulation();
      }
      if (this.onSelectionChange) this.onSelectionChange(this.selectedItem);
      if (this.onCircuitChange) this.onCircuitChange(this);
    }
  }

  countType(type) {
    return this.elements.filter(e => e.type === type).length;
  }

  rotateSelected() {
    if (!this.selectedItem) return;

    if (this.selectedItem.type === 'element') {
      const el = this.selectedItem.item;
      if (el.type === 'current_arrow') {
        const dirs = ['right', 'down', 'left', 'up'];
        const nextIdx = (dirs.indexOf(el.direction) + 1) % 4;
        el.direction = dirs[nextIdx];
      } else if (el.type === 'mesh_loop') {
        el.direction = el.direction === 'cw' ? 'ccw' : 'cw';
      } else if (el.type === 'polarity') {
        el.sign = el.sign === '+' ? '-' : '+';
        el.label = el.sign;
      } else {
        this.rotateElement(el);
      }
      this.saveState();
      if (this.isSimulating) {
        this.runSimulation();
      }
      this.render();
      if (this.onSelectionChange) this.onSelectionChange(this.selectedItem);
      if (this.onCircuitChange) this.onCircuitChange(this);
    } else if (this.selectedItem.type === 'wire' && this.selectedItem.item.curved) {
      this.selectedItem.item.curveOffset = -this.selectedItem.item.curveOffset;
      if (this.onCurveChange) this.onCurveChange(this.selectedItem.item.curveOffset);
      this.saveState();
      if (this.isSimulating) {
        this.runSimulation();
      }
      this.render();
    }
  }

  deleteSelected() {
    if (!this.selectedItem) return;
    if (this.selectedItem.type === 'element') {
      const elId = this.selectedItem.item.id;
      this.elements = this.elements.filter(e => e.id !== elId);
      for (const w of this.wires) {
        if (w.startBinding && w.startBinding.elementId === elId) w.startBinding = null;
        if (w.endBinding && w.endBinding.elementId === elId) w.endBinding = null;
      }
    } else if (this.selectedItem.type === 'wire') {
      this.wires = this.wires.filter(w => w.id !== this.selectedItem.item.id);
    }
    this.selectedItem = null;
    this.saveState();
    if (this.isSimulating) {
      this.runSimulation();
    }
    this.render();
    if (this.onSelectionChange) this.onSelectionChange(null);
    if (this.onCircuitChange) this.onCircuitChange(this);
  }

  hitTest(x, y) {
    // 0. Prioritas Utama: Handle Lengkungan Kawat (Control Point)
    if (this.selectedItem && this.selectedItem.type === 'wire' && this.selectedItem.item.curved) {
      const cp = this.getCurveControlPoint(this.selectedItem.item);
      if (Math.hypot(cp.x - x, cp.y - y) <= 14) {
        return { type: 'wire_curve_handle', item: this.selectedItem.item };
      }
    }
    for (let i = this.wires.length - 1; i >= 0; i--) {
      const w = this.wires[i];
      if (w.curved) {
        const cp = this.getCurveControlPoint(w);
        if (Math.hypot(cp.x - x, cp.y - y) <= 12) {
          return { type: 'wire_curve_handle', item: w };
        }
      }
    }

    // 1. Elemen
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el.type === 'text') {
        const fontSize = el.fontSize || 14;
        const cleanLen = (el.text || 'Teks').replace(/\$/g, '').length;
        const halfW = Math.max(20, cleanLen * (fontSize * 0.35) + 12);
        const halfH = fontSize * 0.9;
        if (Math.abs(x - el.x) <= halfW && Math.abs(y - el.y) <= halfH) {
          return { type: 'element', item: el };
        }
      } else if (['multimeter', 'wattmeter'].includes(el.type)) {
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);
        const dx = x - el.x;
        const dy = y - el.y;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= 36 && Math.abs(ly) <= 30) {
          return { type: 'element', item: el };
        }
      } else if (['dc_voltmeter', 'ac_voltmeter', 'dc_ammeter', 'ac_ammeter'].includes(el.type)) {
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);
        const dx = x - el.x;
        const dy = y - el.y;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= 32 && Math.abs(ly) <= 22) {
          return { type: 'element', item: el };
        }
      } else if (el.type === 'opamp') {
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);
        const dx = x - el.x;
        const dy = y - el.y;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= 26 && Math.abs(ly) <= 26) {
          return { type: 'element', item: el };
        }
      } else if (['vcvs', 'vccs'].includes(el.type)) {
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);
        const dx = x - el.x;
        const dy = y - el.y;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= 20 && Math.abs(ly) <= 20) {
          return { type: 'element', item: el };
        }
      } else {
        const dist = Math.hypot(el.x - x, el.y - y);
        const threshold = (el.type === 'mesh_loop') ? (el.radius || 28) + 10 : 25;
        if (dist <= threshold) {
          return { type: 'element', item: el };
        }
      }
    }

    // 2. Kawat
    for (let i = this.wires.length - 1; i >= 0; i--) {
      const w = this.wires[i];
      if (w.curved) {
        const cp = this.getCurveControlPoint(w);
        const dist = this.distToQuadraticBezier({ x, y }, { x: w.x1, y: w.y1 }, cp, { x: w.x2, y: w.y2 });
        if (dist <= 10) return { type: 'wire', item: w };
      } else {
        const dist = this.distToSegment({ x, y }, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
        if (dist <= 8) return { type: 'wire', item: w };
      }
    }
    return null;
  }

  getCurveControlPoint(w) {
    const mx = (w.x1 + w.x2) / 2;
    const my = (w.y1 + w.y2) / 2;
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = w.curveOffset || 35;
    return {
      x: mx + nx * offset,
      y: my + ny * offset
    };
  }

  distToQuadraticBezier(p, p0, p1, p2) {
    let minDist = Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const bx = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
      const by = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
      const d = Math.hypot(p.x - bx, p.y - by);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Bersihkan layar penuh
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Terapkan Transformasi Pan & Zoom
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // 1. Grid yang Menyesuaikan Viewport
    if (this.showGrid) {
      const startX = Math.floor((-this.panX / this.scale) / this.gridSize) * this.gridSize - this.gridSize;
      const endX = Math.ceil(((w - this.panX) / this.scale) / this.gridSize) * this.gridSize + this.gridSize;
      const startY = Math.floor((-this.panY / this.scale) / this.gridSize) * this.gridSize - this.gridSize;
      const endY = Math.ceil(((h - this.panY) / this.scale) / this.gridSize) * this.gridSize + this.gridSize;

      ctx.beginPath();
      ctx.fillStyle = '#cbd5e1';
      const dotSize = Math.max(1, 1.5 / Math.min(1, this.scale));
      for (let x = startX; x <= endX; x += this.gridSize) {
        for (let y = startY; y <= endY; y += this.gridSize) {
          ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
        }
      }
    }

    // 2. Kawat (Lurus & Melengkung)
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const wire of this.wires) {
      const isSel = this.selectedItem && this.selectedItem.type === 'wire' && this.selectedItem.item.id === wire.id;
      ctx.strokeStyle = isSel ? '#2563eb' : '#0f172a';
      ctx.beginPath();

      if (wire.curved) {
        const cp = this.getCurveControlPoint(wire);
        ctx.moveTo(wire.x1, wire.y1);
        ctx.quadraticCurveTo(cp.x, cp.y, wire.x2, wire.y2);
        ctx.stroke();

        if (isSel) {
          ctx.save();
          const mx = (wire.x1 + wire.x2) / 2;
          const my = (wire.y1 + wire.y2) / 2;
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(cp.x, cp.y);
          ctx.stroke();

          // Titik Handle Lengkungan (Bisa di-drag langsung di kanvas!)
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, 6.5, 0, Math.PI * 2);
          ctx.fillStyle = '#2563eb';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      } else {
        ctx.moveTo(wire.x1, wire.y1);
        ctx.lineTo(wire.x2, wire.y2);
        ctx.stroke();
      }

      if (isSel) {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(wire.x1, wire.y1, 4, 0, Math.PI * 2);
        ctx.arc(wire.x2, wire.y2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Kawat yang Sedang Ditarik
    if (this.isDrawingWire && this.wireStart) {
      const snap = this.getSnapPos(this.currentMousePos);
      const targetX = snap.x;
      const targetY = snap.y;
      const isCurved = (this.currentTool === 'curved_wire');
      ctx.strokeStyle = '#3b82f6';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();

      if (isCurved) {
        const tempWire = {
          x1: this.wireStart.x,
          y1: this.wireStart.y,
          x2: targetX,
          y2: targetY,
          curveOffset: this.placementCurvature
        };
        const cp = this.getCurveControlPoint(tempWire);
        ctx.moveTo(this.wireStart.x, this.wireStart.y);
        ctx.quadraticCurveTo(cp.x, cp.y, targetX, targetY);
      } else {
        ctx.moveTo(this.wireStart.x, this.wireStart.y);
        ctx.lineTo(targetX, targetY);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(this.wireStart.x, this.wireStart.y, 4, 0, Math.PI * 2);
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Komponen & Anotasi
    for (const el of this.elements) {
      ctx.save();
      ctx.translate(el.x, el.y);
      ctx.rotate((el.rotation * Math.PI) / 180);

      const isSel = this.selectedItem && this.selectedItem.type === 'element' && this.selectedItem.item.id === el.id;
      this.drawElement(ctx, el, isSel);

      ctx.restore();
    }

    // 5. Ghost Preview saat Hover dengan Tool Aktif
    if (this.isMouseInside && !this.isPanning && this.currentTool !== 'select' && this.currentTool !== 'pan' && this.currentTool !== 'wire' && this.currentTool !== 'curved_wire') {
      const snapX = this.snap(this.currentMousePos.x);
      const snapY = this.snap(this.currentMousePos.y);
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.translate(snapX, snapY);
      ctx.rotate((this.placementRotation * Math.PI) / 180);

      const ghostEl = {
        type: this.currentTool,
        label: '',
        value: '',
        text: 'Teks $LaTeX$',
        fontSize: 14,
        color: '#0f172a',
        direction: this.placementDirection,
        sign: this.placementSign,
        radius: 28
      };
      this.drawElement(ctx, ghostEl, false);
      ctx.restore();
    }

    // 6. Terminal Ports & Magnet Snap Visual Indicators (Draw.io style)
    this.drawTerminalPorts(ctx);

    // 7. Proteus Logic State Indicator Dots (Merah = Positif, Biru = Negatif, Hijau = Ground)
    if (this.isSimulating && this.simulationResults && this.simulationResults.nodeVoltages) {
      ctx.save();
      for (const el of this.elements) {
        if (['text', 'current_arrow', 'mesh_loop', 'polarity'].includes(el.type)) continue;
        const terms = this.getTerminals(el);
        const res = this.simulationResults.elements ? this.simulationResults.elements.get(el.id) : null;
        if (res && terms.length >= 2) {
          const v1 = res.v1 || 0;
          const v2 = res.v2 || 0;

          // Dot untuk terminal 1 (Proteus style logic indicator)
          ctx.fillStyle = v1 > 0.05 ? '#ef4444' : (v1 < -0.05 ? '#3b82f6' : '#10b981');
          ctx.fillRect(terms[0].x - 2.5, terms[0].y - 2.5, 5, 5);

          // Dot untuk terminal 2
          ctx.fillStyle = v2 > 0.05 ? '#ef4444' : (v2 < -0.05 ? '#3b82f6' : '#10b981');
          ctx.fillRect(terms[1].x - 2.5, terms[1].y - 2.5, 5, 5);
        }
      }
      ctx.restore();
    }

    ctx.restore();

    // 8. Status HUD Simulasi Proteus (di pojok kanvas dalam koordinat layar)
    if (this.isSimulating) {
      ctx.save();
      const isSolved = this.simulationResults && this.simulationResults.solved;
      const isPaused = this.simulationPaused;
      const statusText = isPaused ? '⏸ SIMULASI DI-PAUSE' : (isSolved ? '● SIMULASI AKTIF (LIVE PROTEUS)' : '▲ RANGKAIAN TERBUKA / BELUM LENGKAP');
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const textW = ctx.measureText(statusText).width;
      const boxW = textW + 20;
      const boxH = 24;

      ctx.fillStyle = isPaused ? 'rgba(254, 240, 138, 0.95)' : (isSolved ? 'rgba(236, 253, 245, 0.95)' : 'rgba(254, 243, 199, 0.95)');
      ctx.strokeStyle = isPaused ? '#eab308' : (isSolved ? '#10b981' : '#f59e0b');
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(12, 12, boxW, boxH, 6);
      } else {
        ctx.rect(12, 12, boxW, boxH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isPaused ? '#854d0e' : (isSolved ? '#065f46' : '#92400e');
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(statusText, 22, 12 + boxH / 2);
      ctx.restore();
    }
  }

  drawElement(ctx, el, isSelected) {
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = isSelected ? '#2563eb' : '#0f172a';
    ctx.fillStyle = isSelected ? '#2563eb' : '#0f172a';

    switch (el.type) {
      case 'resistor':
        this.drawResistor(ctx, el);
        break;
      case 'capacitor':
        this.drawCapacitor(ctx, el);
        break;
      case 'inductor':
        this.drawInductor(ctx, el);
        break;
      case 'vsource_dc':
        this.drawVSourceDC(ctx, el);
        break;
      case 'vsource_ac':
        this.drawVSourceAC(ctx, el);
        break;
      case 'isource_dc':
        this.drawISourceDC(ctx, el);
        break;
      case 'ground':
        this.drawGround(ctx, el);
        break;
      case 'switch':
        this.drawSwitch(ctx, el, isSelected);
        break;
      case 'multimeter':
        this.drawMultimeter(ctx, el, isSelected);
        break;
      case 'dc_voltmeter':
        this.drawDCVoltmeter(ctx, el, isSelected);
        break;
      case 'dc_ammeter':
        this.drawDCAmmeter(ctx, el, isSelected);
        break;
      case 'ac_voltmeter':
        this.drawACVoltmeter(ctx, el, isSelected);
        break;
      case 'ac_ammeter':
        this.drawACAmmeter(ctx, el, isSelected);
        break;
      case 'wattmeter':
        this.drawWattmeter(ctx, el, isSelected);
        break;
      case 'opamp':
        this.drawOpAmp(ctx, el, isSelected);
        break;
      case 'vcvs':
      case 'vccs':
        this.drawDependentSource(ctx, el, isSelected);
        break;
      case 'node':
        this.drawNode(ctx, el);
        break;
      case 'current_arrow':
        this.drawCurrentArrow(ctx, el, isSelected);
        break;
      case 'mesh_loop':
        this.drawMeshLoop(ctx, el, isSelected);
        break;
      case 'polarity':
        this.drawPolarity(ctx, el, isSelected);
        break;
      case 'node_label':
        this.drawNodeLabel(ctx, el, isSelected);
        break;
      case 'text':
        this.drawText(ctx, el, isSelected);
        break;
    }

    if (isSelected && el.type !== 'text') {
      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(-36, -26, 72, 52);
      ctx.restore();
    }
  }

  drawText(ctx, el, isSelected) {
    const fontSize = el.fontSize || 14;
    const color = el.color || '#0f172a';

    this.drawLabel(ctx, el.text || 'Teks', '', 0, 0, {
      fontSize: fontSize,
      color: color
    });

    if (isSelected) {
      ctx.save();
      const cleanLen = (el.text || 'Teks').replace(/\$/g, '').length;
      const boxW = Math.max(30, cleanLen * (fontSize * 0.58) + 16);
      const boxH = fontSize + 12;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
      ctx.restore();
    }
  }

  drawComponentLabel(ctx, el, defaultX, defaultY, customOpts = {}) {
    if (!el.label && !el.value) return;
    const ox = (el.labelOffsetX !== undefined) ? el.labelOffsetX : 0;
    const oy = (el.labelOffsetY !== undefined) ? el.labelOffsetY : 0;
    const rot = (el.labelRotation !== undefined) ? el.labelRotation : 0;
    const posX = defaultX + ox;
    const posY = defaultY + oy;

    if (rot !== 0) {
      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate((rot * Math.PI) / 180);
      this.drawLabel(ctx, el.label, el.value, 0, 0, customOpts);
      ctx.restore();
    } else {
      this.drawLabel(ctx, el.label, el.value, posX, posY, customOpts);
    }
  }

  drawResistor(ctx, el) {
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-13.5, -9);
    ctx.lineTo(-4.5, 9);
    ctx.lineTo(4.5, -9);
    ctx.lineTo(13.5, 9);
    ctx.lineTo(18, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    this.drawComponentLabel(ctx, el, 0, -16);
  }

  drawCapacitor(ctx, el) {
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-6, 0);
    ctx.moveTo(-6, -14);
    ctx.lineTo(-6, 14);

    ctx.moveTo(6, -14);
    ctx.lineTo(6, 14);
    ctx.moveTo(6, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    this.drawComponentLabel(ctx, el, 0, -18);
  }

  drawInductor(ctx, el) {
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-18, 0);
    ctx.stroke();

    const r = 6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const cx = -12 + i * 12;
      ctx.arc(cx, 0, r, Math.PI, 0, false);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    this.drawComponentLabel(ctx, el, 0, -15);
  }

  drawVSourceDC(ctx, el) {
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-5, 0);
    ctx.stroke();

    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-5, -16);
    ctx.lineTo(-5, 16);
    ctx.stroke();

    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(5, -10);
    ctx.lineTo(5, 10);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', -12, -10);
    ctx.fillText('-', 12, -8);

    this.drawComponentLabel(ctx, el, 0, -22);
  }

  drawVSourceAC(ctx, el) {
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-16, 0);
    ctx.moveTo(16, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.bezierCurveTo(-4, -8, -4, -8, 0, 0);
    ctx.bezierCurveTo(4, 8, 4, 8, 8, 0);
    ctx.stroke();

    this.drawComponentLabel(ctx, el, 0, -22);
  }

  drawISourceDC(ctx, el) {
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-16, 0);
    ctx.moveTo(16, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    this.drawArrowHead(ctx, -10, 0, 10, 0, 6);

    this.drawComponentLabel(ctx, el, 0, -22);
  }

  drawGround(ctx, el) {
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 0);
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(-9, 5);
    ctx.lineTo(9, 5);
    ctx.moveTo(-4, 10);
    ctx.lineTo(4, 10);
    ctx.stroke();

    this.drawComponentLabel(ctx, el, 0, 18);
  }

  drawSwitch(ctx, el, isSelected) {
    const isClosed = el.closed || el.value === 'Closed' || el.state === 'closed';

    ctx.save();
    // Terminal kabel kiri dan kanan
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = isSelected ? '#2563eb' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    // Kontak lingkaran kiri dan kanan
    ctx.lineWidth = 2.0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-12, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(12, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tuas Saklar Interaktif
    ctx.beginPath();
    if (isClosed) {
      // Tertutup (ON) - Tuas tebal mendatar menghubungkan kontak
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#16a34a';
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // Badge teks ON kecil
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ON', 0, 14);
    } else {
      // Terbuka (OFF) - Tuas terangkat miring 30 derajat
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = isSelected ? '#2563eb' : '#dc2626';
      ctx.moveTo(-12, 0);
      ctx.lineTo(10, -14);
      ctx.stroke();

      // Badge teks OFF kecil
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFF', 0, 14);
    }
    ctx.restore();

    this.drawComponentLabel(ctx, el, 0, -20);
  }

  drawMultimeter(ctx, el, isSelected) {
    ctx.save();

    const w = 62;
    const h = 50;
    const x = -w / 2;
    const y = -h / 2;
    const r = 8;

    // Bezel Bodi Kuning DMM
    ctx.fillStyle = isSelected ? '#fbbf24' : '#f59e0b';
    ctx.strokeStyle = isSelected ? '#2563eb' : '#b45309';
    ctx.lineWidth = isSelected ? 2.5 : 1.8;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fill();
    ctx.stroke();

    // Layar LCD Digital
    const lcdW = 50;
    const lcdH = 18;
    const lcdX = -lcdW / 2;
    const lcdY = y + 6;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(lcdX, lcdY, lcdW, lcdH, 3);
    } else {
      ctx.rect(lcdX, lcdY, lcdW, lcdH);
    }
    ctx.fill();
    ctx.stroke();

    // Mode LCD (Kiri atas)
    const mode = el.meterMode || 'voltage_dc';
    let modeBadge = 'DC V';
    if (mode === 'current_dc') modeBadge = 'DC A';
    else if (mode === 'resistance') modeBadge = 'OHM';
    else if (mode === 'voltage_ac') modeBadge = 'AC V';

    ctx.font = 'bold 7px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(modeBadge, lcdX + 3, lcdY + 2);

    // Nilai Angka LCD Digital (Digital Green)
    const reading = el.displayReading || (this.isSimulating ? '0.00 V' : '--.--');
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(reading, lcdX + lcdW - 3, lcdY + lcdH - 1);

    // Rotary Dial Knob di tengah bawah
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, y + 31, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    let dialAngle = -Math.PI / 4;
    if (mode === 'current_dc') dialAngle = 0;
    else if (mode === 'resistance') dialAngle = Math.PI / 4;
    else if (mode === 'voltage_ac') dialAngle = -3 * Math.PI / 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 31);
    ctx.lineTo(4 * Math.cos(dialAngle), y + 31 + 4 * Math.sin(dialAngle));
    ctx.stroke();

    // Socket Terminal Probe:
    // Probe Merah V/Ω (+) di kiri (-20), Probe Hitam COM (-) di kanan (+20)
    const probeRedX = -20;
    const probeBlackX = 20;
    const probeY = y + 41;

    // Terminal kiri ke world port (-30, 10)
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(probeRedX, probeY);
    ctx.lineTo(-30, 10);
    ctx.stroke();

    // Terminal kanan ke world port (30, 10)
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(probeBlackX, probeY);
    ctx.lineTo(30, 10);
    ctx.stroke();

    // Socket Jack Merah
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(probeRedX, probeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Socket Jack Hitam
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.arc(probeBlackX, probeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Teks '+' dan '-' kecil di atas socket
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    ctx.fillText('+', probeRedX, probeY - 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillText('−', probeBlackX, probeY - 4);

    ctx.restore();

    this.drawComponentLabel(ctx, el, 0, -32);
  }

  drawDCVoltmeter(ctx, el, isSelected) {
    ctx.save();
    const w = 58, h = 38, x = -w / 2, y = -h / 2;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
    ctx.lineWidth = isSelected ? 2.2 : 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 4);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    const lcdW = 50, lcdH = 18, lcdX = -lcdW / 2, lcdY = y + 14;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(lcdX, lcdY, lcdW, lcdH);

    ctx.font = 'bold 8px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('DC VOLTS', lcdX + 2, y + 10);

    const reading = el.displayReading || (this.isSimulating ? '0.00 V' : '--.--');
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(reading, lcdX + lcdW - 2, lcdY + lcdH / 2);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(x, 0);
    ctx.stroke();

    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x + w, 0); ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center'; ctx.fillText('+', x - 5, -5);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('−', x + w + 5, -5);

    ctx.restore();
    this.drawComponentLabel(ctx, el, 0, -26);
  }

  drawDCAmmeter(ctx, el, isSelected) {
    ctx.save();
    const w = 58, h = 38, x = -w / 2, y = -h / 2;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
    ctx.lineWidth = isSelected ? 2.2 : 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 4);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    const lcdW = 50, lcdH = 18, lcdX = -lcdW / 2, lcdY = y + 14;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(lcdX, lcdY, lcdW, lcdH);

    ctx.font = 'bold 8px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('DC AMPS', lcdX + 2, y + 10);

    const reading = el.displayReading || (this.isSimulating ? '0.00 A' : '--.--');
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(reading, lcdX + lcdW - 2, lcdY + lcdH / 2);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(x, 0);
    ctx.stroke();

    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x + w, 0); ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center'; ctx.fillText('+', x - 5, -5);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('−', x + w + 5, -5);

    ctx.restore();
    this.drawComponentLabel(ctx, el, 0, -26);
  }

  drawACVoltmeter(ctx, el, isSelected) {
    ctx.save();
    const w = 58, h = 38, x = -w / 2, y = -h / 2;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
    ctx.lineWidth = isSelected ? 2.2 : 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 4);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    const lcdW = 50, lcdH = 18, lcdX = -lcdW / 2, lcdY = y + 14;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(lcdX, lcdY, lcdW, lcdH);

    ctx.font = 'bold 8px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('AC VOLTS ~', lcdX + 2, y + 10);

    const reading = el.displayReading || (this.isSimulating ? '0.00 V~' : '--.--');
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(reading, lcdX + lcdW - 2, lcdY + lcdH / 2);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(x, 0);
    ctx.moveTo(x + w, 0); ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.restore();
    this.drawComponentLabel(ctx, el, 0, -26);
  }

  drawACAmmeter(ctx, el, isSelected) {
    ctx.save();
    const w = 58, h = 38, x = -w / 2, y = -h / 2;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
    ctx.lineWidth = isSelected ? 2.2 : 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 4);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    const lcdW = 50, lcdH = 18, lcdX = -lcdW / 2, lcdY = y + 14;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(lcdX, lcdY, lcdW, lcdH);

    ctx.font = 'bold 8px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('AC AMPS ~', lcdX + 2, y + 10);

    const reading = el.displayReading || (this.isSimulating ? '0.00 A~' : '--.--');
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(reading, lcdX + lcdW - 2, lcdY + lcdH / 2);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(x, 0);
    ctx.moveTo(x + w, 0); ctx.lineTo(30, 0);
    ctx.stroke();

    ctx.restore();
    this.drawComponentLabel(ctx, el, 0, -26);
  }

  drawWattmeter(ctx, el, isSelected) {
    ctx.save();
    const w = 62, h = 48, x = -w / 2, y = -h / 2;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSelected ? '#3b82f6' : '#475569';
    ctx.lineWidth = isSelected ? 2.2 : 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 4);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    const lcdW = 52, lcdH = 18, lcdX = -lcdW / 2, lcdY = y + 11;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(lcdX, lcdY, lcdW, lcdH);

    ctx.font = 'bold 8px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('WATTMETER (P)', lcdX + 2, y + 9);

    const reading = el.displayReading || (this.isSimulating ? '0.00 W' : '--.--');
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fb923c';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(reading, lcdX + lcdW - 2, lcdY + lcdH / 2);

    // Terminal Arus atas: I+ (-30, -10), I- (30, -10)
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-30, -10); ctx.lineTo(x, -10);
    ctx.moveTo(x + w, -10); ctx.lineTo(30, -10);
    ctx.stroke();

    // Terminal Tegangan bawah: V+ (-30, 15), V- (30, 15)
    ctx.strokeStyle = '#2563eb';
    ctx.beginPath();
    ctx.moveTo(-30, 15); ctx.lineTo(x, 15);
    ctx.moveTo(x + w, 15); ctx.lineTo(30, 15);
    ctx.stroke();

    ctx.font = 'bold 7px sans-serif';
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'right'; ctx.fillText('I+', x - 3, -10);
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'left'; ctx.fillText('I−', x + w + 3, -10);
    ctx.fillStyle = '#3b82f6'; ctx.textAlign = 'right'; ctx.fillText('V+', x - 3, 15);
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'left'; ctx.fillText('V−', x + w + 3, 15);

    ctx.restore();
    this.drawComponentLabel(ctx, el, 0, -32);
  }

  drawOpAmp(ctx, el, isSelected) {
    ctx.save();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = isSelected ? '#2563eb' : '#0f172a';
    ctx.fillStyle = '#f8fafc';

    // Segitiga Op-Amp menghadap kanan
    ctx.beginPath();
    ctx.moveTo(-20, -22);
    ctx.lineTo(20, 0);
    ctx.lineTo(-20, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Terminal Inverting (-): (-30, -12) ke (-20, -12)
    ctx.beginPath();
    ctx.moveTo(-30, -12); ctx.lineTo(-20, -12);
    // Terminal Non-Inverting (+): (-30, 12) ke (-20, 12)
    ctx.moveTo(-30, 12); ctx.lineTo(-20, 12);
    // Terminal Output: (20, 0) ke (30, 0)
    ctx.moveTo(20, 0); ctx.lineTo(30, 0);
    ctx.stroke();

    // Tanda − dan + di dalam segitiga
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('−', -12, -12);
    ctx.fillText('+', -12, 12);

    // Label model Op-Amp di tengah
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(el.value || 'LM741', 2, 0);

    ctx.restore();
    this.drawComponentLabel(ctx, el, 0, -28);
  }

  drawDependentSource(ctx, el, isSelected) {
    ctx.save();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = isSelected ? '#2563eb' : '#0f172a';
    ctx.fillStyle = '#ffffff';

    // Belah ketupat (Diamond)
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Terminal kiri dan kanan
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(-r, 0);
    ctx.moveTo(r, 0); ctx.lineTo(30, 0);
    ctx.stroke();

    if (el.type === 'vcvs') {
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('+', -7, 0);
      ctx.fillText('−', 7, 0);
    } else {
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
      ctx.stroke();
      this.drawArrowHead(ctx, -8, 0, 8, 0, 5);
    }

    ctx.restore();
    this.drawComponentLabel(ctx, el, 0, -24);
  }

  drawNode(ctx, el) {
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCurrentArrow(ctx, el, isSelected) {
    ctx.save();
    ctx.strokeStyle = isSelected ? '#1d4ed8' : '#2563eb';
    ctx.fillStyle = isSelected ? '#1d4ed8' : '#2563eb';
    ctx.lineWidth = 2.5;

    let dx = 0, dy = 0;
    if (el.direction === 'right') dx = 28;
    else if (el.direction === 'left') dx = -28;
    else if (el.direction === 'down') dy = 28;
    else if (el.direction === 'up') dy = -28;

    const startX = -dx / 2;
    const startY = -dy / 2;
    const endX = dx / 2;
    const endY = dy / 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    this.drawArrowHead(ctx, startX, startY, endX, endY, 8);

    if (el.label) {
      let textLabel = el.label;
      if (el.value) textLabel += ' = ' + el.value;

      const textOffsetY = (el.direction === 'left' || el.direction === 'right') ? -14 : 0;
      const textOffsetX = (el.direction === 'up' || el.direction === 'down') ? 16 : 0;

      ctx.font = 'bold 12px serif';
      const textWidth = Math.max(24, ctx.measureText(textLabel.replace(/\$/g, '')).width);
      ctx.fillStyle = 'rgba(239, 246, 255, 0.95)';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(textOffsetX - textWidth / 2 - 4, textOffsetY - 9, textWidth + 8, 18, 4);
      } else {
        ctx.rect(textOffsetX - textWidth / 2 - 4, textOffsetY - 9, textWidth + 8, 18);
      }
      ctx.fill();
      ctx.stroke();

      this.drawLabel(ctx, textLabel, '', textOffsetX, textOffsetY, { color: '#1e40af', fontSize: 12 });
    }

    ctx.restore();
  }

  drawMeshLoop(ctx, el, isSelected) {
    ctx.save();
    const r = el.radius || 26;
    ctx.strokeStyle = isSelected ? '#b91c1c' : '#dc2626';
    ctx.fillStyle = isSelected ? '#b91c1c' : '#dc2626';
    ctx.lineWidth = 2.0;

    const isCW = el.direction === 'cw';
    const startAngle = isCW ? 0.8 * Math.PI : 0.2 * Math.PI;
    const endAngle = isCW ? 2.3 * Math.PI : -1.3 * Math.PI;

    ctx.beginPath();
    ctx.arc(0, 0, r, startAngle, endAngle, !isCW);
    ctx.stroke();

    const endX = r * Math.cos(endAngle);
    const endY = r * Math.sin(endAngle);
    const tangentAngle = endAngle + (isCW ? Math.PI / 2 : -Math.PI / 2);
    const arrowTipX = endX + 8 * Math.cos(tangentAngle);
    const arrowTipY = endY + 8 * Math.sin(tangentAngle);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(arrowTipX, arrowTipY);
    ctx.stroke();
    this.drawArrowHead(ctx, endX, endY, arrowTipX, arrowTipY, 7);

    if (el.label) {
      this.drawLabel(ctx, el.label, '', 0, 0, { color: '#991b1b', fontSize: 11 });
    }

    ctx.restore();
  }

  drawPolarity(ctx, el, isSelected) {
    ctx.save();
    const isPlus = el.sign === '+';
    ctx.fillStyle = isPlus ? '#dc2626' : '#2563eb';
    ctx.strokeStyle = isPlus ? '#ef4444' : '#3b82f6';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = isPlus ? '#fee2e2' : '#dbeafe';
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isPlus ? '#b91c1c' : '#1d4ed8';
    ctx.fillText(el.sign || '+', 0, (el.sign === '+' ? 0 : -1));

    ctx.restore();
  }

  drawNodeLabel(ctx, el, isSelected) {
    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5;

    const labelClean = (el.label || 'A').replace(/\$/g, '');
    const radius = Math.max(11, labelClean.length * 5 + 4);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#d1fae5';
    ctx.fill();
    ctx.stroke();

    this.drawLabel(ctx, el.label || 'A', '', 0, 0, { color: '#065f46', fontSize: 11 });

    ctx.restore();
  }

  drawLabel(ctx, label, value, x, y, customOpts = {}) {
    if (!label && !value) return;

    let text = label || '';
    if (value) {
      text += (text ? ' = ' : '') + value;
    }

    if (window.LatexRenderer) {
      window.LatexRenderer.draw(ctx, text, x, y, {
        fontSize: customOpts.fontSize || 12,
        color: customOpts.color || '#1e293b'
      });
    } else {
      ctx.save();
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = customOpts.color || '#1e293b';
      ctx.fillText(text, x, y);
      ctx.restore();
    }
  }

  drawArrowHead(ctx, fromX, fromY, toX, toY, size) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - size * Math.cos(angle - Math.PI / 6),
      toY - size * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - size * Math.cos(angle + Math.PI / 6),
      toY - size * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Ekspor gambar beresolusi tinggi dengan auto-crop rapi ke dokumen Word
  toDataURL(scale = 2) {
    // 1. Hitung Bounding Box seluruh rangkaian
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const el of this.elements) {
      if (el.type === 'text') {
        const fontSize = el.fontSize || 14;
        const cleanLen = (el.text || 'Teks').replace(/\$/g, '').length;
        const halfW = Math.max(30, cleanLen * (fontSize * 0.4) + 15);
        const halfH = fontSize + 12;
        minX = Math.min(minX, el.x - halfW);
        maxX = Math.max(maxX, el.x + halfW);
        minY = Math.min(minY, el.y - halfH);
        maxY = Math.max(maxY, el.y + halfH);
      } else {
        minX = Math.min(minX, el.x - 45);
        maxX = Math.max(maxX, el.x + 45);
        minY = Math.min(minY, el.y - 45);
        maxY = Math.max(maxY, el.y + 45);
      }
    }

    for (const w of this.wires) {
      minX = Math.min(minX, w.x1 - 15, w.x2 - 15);
      maxX = Math.max(maxX, w.x1 + 15, w.x2 + 15);
      minY = Math.min(minY, w.y1 - 15, w.y2 - 15);
      maxY = Math.max(maxY, w.y1 + 15, w.y2 + 15);
      if (w.curved) {
        const cp = this.getCurveControlPoint(w);
        minX = Math.min(minX, cp.x - 15);
        maxX = Math.max(maxX, cp.x + 15);
        minY = Math.min(minY, cp.y - 15);
        maxY = Math.max(maxY, cp.y + 15);
      }
    }

    if (!isFinite(minX)) {
      minX = 0; minY = 0; maxX = 500; maxY = 300;
    }

    const padding = 35;
    const cropX = minX - padding;
    const cropY = minY - padding;
    const cropW = (maxX - minX) + padding * 2;
    const cropH = (maxY - minY) + padding * 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = cropW * scale;
    exportCanvas.height = cropH * scale;
    const expCtx = exportCanvas.getContext('2d');

    expCtx.scale(scale, scale);

    // Background putih bersih
    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, cropW, cropH);

    // Geser konteks agar bounding box berada di tengah
    expCtx.translate(-cropX, -cropY);

    // Render rangkaian
    for (const wire of this.wires) {
      expCtx.lineWidth = 2.5;
      expCtx.lineCap = 'round';
      expCtx.lineJoin = 'round';
      expCtx.strokeStyle = '#0f172a';
      expCtx.beginPath();
      if (wire.curved) {
        const cp = this.getCurveControlPoint(wire);
        expCtx.moveTo(wire.x1, wire.y1);
        expCtx.quadraticCurveTo(cp.x, cp.y, wire.x2, wire.y2);
      } else {
        expCtx.moveTo(wire.x1, wire.y1);
        expCtx.lineTo(wire.x2, wire.y2);
      }
      expCtx.stroke();
    }

    for (const el of this.elements) {
      expCtx.save();
      expCtx.translate(el.x, el.y);
      expCtx.rotate((el.rotation * Math.PI) / 180);
      this.drawElement(expCtx, el, false);
      expCtx.restore();
    }

    return exportCanvas.toDataURL('image/png');
  }

  // --- KONTROL SAKLAR INTERAKTIF (SWITCH) ---
  toggleSwitch(switchEl) {
    if (!switchEl) {
      if (this.selectedItem && this.selectedItem.type === 'element' && this.selectedItem.item.type === 'switch') {
        switchEl = this.selectedItem.item;
      } else {
        return;
      }
    }
    if (switchEl.type !== 'switch') return;

    switchEl.closed = !switchEl.closed;
    switchEl.value = switchEl.closed ? 'Closed' : 'Open';
    this.saveState();

    if (this.isSimulating) {
      this.runSimulation();
    } else {
      this.render();
      if (this.onCircuitChange) this.onCircuitChange(this);
    }

    if (this.onSelectionChange) this.onSelectionChange(this.selectedItem);
  }

  // --- KONTROL SIMULASI RANGKAIAN LISTRIK (PROTEUS STYLE) ---
  startSimulation() {
    this.isSimulating = true;
    this.simulationPaused = false;
    this.runSimulation();
    if (this.onSimulationChange) this.onSimulationChange(true, this.simulationResults);
    return true;
  }

  pauseSimulation() {
    this.simulationPaused = !this.simulationPaused;
    this.render();
    if (this.onSimulationChange) this.onSimulationChange(this.isSimulating, this.simulationResults, this.simulationPaused);
    return this.simulationPaused;
  }

  stopSimulation() {
    this.isSimulating = false;
    this.simulationPaused = false;
    this.simulationResults = null;
    for (const el of this.elements) {
      if (['multimeter', 'dc_voltmeter', 'ac_voltmeter', 'dc_ammeter', 'ac_ammeter', 'wattmeter'].includes(el.type)) {
        el.displayReading = '--.--';
      }
    }
    this.render();
    if (this.onCircuitChange) this.onCircuitChange(this);
    if (this.onSimulationChange) this.onSimulationChange(false, null);
    return false;
  }

  toggleSimulation(forceState) {
    if (forceState !== undefined) {
      return forceState ? this.startSimulation() : this.stopSimulation();
    }
    return this.isSimulating ? this.stopSimulation() : this.startSimulation();
  }

  runSimulation() {
    if (!this.isSimulating || this.simulationPaused) return;
    if (typeof CircuitSolver === 'undefined') {
      console.warn('CircuitSolver tidak ditemukan.');
      return;
    }

    try {
      this.simulationResults = CircuitSolver.solveCircuit(this);
    } catch (err) {
      console.warn('Gagal menghitung simulasi rangkaian:', err);
      this.simulationResults = { solved: false, message: err.message };
    }

    this.render();
    if (this.onCircuitChange) this.onCircuitChange(this);
    if (this.onSimulationChange) {
      this.onSimulationChange(this.isSimulating, this.simulationResults, this.simulationPaused);
    }
  }
}

window.CircuitCanvas = CircuitCanvas;

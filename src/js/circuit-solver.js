/**
 * CircuitSolver Engine
 * Mesin analisis & simulasi rangkaian listrik DC menggunakan metode Modified Nodal Analysis (MNA).
 * Menghitung tegangan simpul, arus cabang, status saklar, dan pembacaan multimeter digital.
 */

class CircuitSolver {
  /**
   * Mengurai teks nilai komponen (misal: "10 \Omega", "2.2 k\Omega", "12 V", "50 mA")
   * menjadi angka numerik murni.
   */
  static parseValue(valStr, defaultValue = 1) {
    if (typeof valStr === 'number') return valStr;
    if (!valStr || typeof valStr !== 'string') return defaultValue;

    // Bersihkan format LaTeX ($...$, \text{}, \Omega, dll.)
    let clean = valStr
      .replace(/\$/g, '')
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\Omega/g, 'ohm')
      .replace(/\\mu/g, 'u')
      .replace(/\\/g, '')
      .trim();

    // Regex ekstraksi angka dan satuan prefix
    const match = clean.match(/^([-+]?[0-9]*\.?[0-9]+)\s*([a-zA-Z]*)/);
    if (!match) return defaultValue;

    let num = parseFloat(match[1]);
    if (isNaN(num)) return defaultValue;

    const unit = match[2].toLowerCase();

    // Awalan SI
    if (unit.startsWith('p')) num *= 1e-12; // piko
    else if (unit.startsWith('n')) num *= 1e-9; // nano
    else if (unit.startsWith('u') || unit.startsWith('µ')) num *= 1e-6; // mikro
    else if (unit.startsWith('m') && !unit.startsWith('meg')) num *= 1e-3; // mili
    else if (unit.startsWith('k')) num *= 1e3; // kilo
    else if (unit.startsWith('meg') || unit.startsWith('m') && unit.includes('ohm') && num < 100) num *= 1e6; // mega
    else if (unit.startsWith('g')) num *= 1e9; // giga

    return num;
  }

  /**
   * Menjalankan simulasi DC rangkaian
   * @param {Object} circuitInstance - instance dari CircuitCanvas
   * @returns {Object} hasil simulasi { success, nodeVoltages, elementResults, message }
   */
  static solveCircuit(circuitInstance) {
    return this.solve(circuitInstance);
  }

  static solve(circuitInstance) {
    if (!circuitInstance) return { success: false, message: 'Tidak ada rangkaian.' };

    const elements = circuitInstance.elements || [];
    const wires = circuitInstance.wires || [];

    if (elements.length === 0) {
      return { success: false, message: 'Rangkaian kosong.' };
    }

    // 1. Ekstraksi semua terminal dari komponen
    const terminals = [];
    const terminalMap = new Map(); // key: elementId_termName -> terminal object

    for (const el of elements) {
      if (['text', 'current_arrow', 'mesh_loop', 'polarity'].includes(el.type)) continue;
      const terms = circuitInstance.getTerminals(el);
      for (const t of terms) {
        terminals.push(t);
        terminalMap.set(t.id, t);
      }
    }

    if (terminals.length === 0) {
      return { success: false, message: 'Tidak ada komponen listrik terpasang.' };
    }

    // 2. Union-Find (Disjoint Set) untuk mengelompokkan simpul listrik
    const parent = new Map();
    const find = (id) => {
      if (!parent.has(id)) parent.set(id, id);
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)));
      }
      return parent.get(id);
    };

    const union = (id1, id2) => {
      const root1 = find(id1);
      const root2 = find(id2);
      if (root1 !== root2) {
        parent.set(root1, root2);
      }
    };

    // Gabungkan terminal yang posisinya berdekatan (<= 6px)
    for (let i = 0; i < terminals.length; i++) {
      for (let j = i + 1; j < terminals.length; j++) {
        const t1 = terminals[i];
        const t2 = terminals[j];
        if (Math.hypot(t1.x - t2.x, t1.y - t2.y) <= 6) {
          union(t1.id, t2.id);
        }
      }
    }

    // Gabungkan kawat dan terminal (termasuk junction wire-to-wire dan draw.io binding)
    for (let idx = 0; idx < wires.length; idx++) {
      const w = wires[idx];
      const p1Id = `wire_${idx}_p1`;
      const p2Id = `wire_${idx}_p2`;
      union(p1Id, p2Id); // kedua ujung kawat adalah 1 simpul konduktor

      // Binding eksplisit ke terminal port
      if (w.startBinding && w.startBinding.elementId) {
        const targetEl = elements.find(e => e.id === w.startBinding.elementId);
        if (targetEl) {
          const terms = circuitInstance.getTerminals(targetEl);
          const tIndex = w.startBinding.terminalIndex || 0;
          if (terms[tIndex]) union(p1Id, terms[tIndex].id);
        }
      }
      if (w.endBinding && w.endBinding.elementId) {
        const targetEl = elements.find(e => e.id === w.endBinding.elementId);
        if (targetEl) {
          const terms = circuitInstance.getTerminals(targetEl);
          const tIndex = w.endBinding.terminalIndex || 0;
          if (terms[tIndex]) union(p2Id, terms[tIndex].id);
        }
      }

      // Hubungkan ujung kawat ke terminal terdekat jika <= 16px
      for (const t of terminals) {
        if (Math.hypot(t.x - w.x1, t.y - w.y1) <= 16) union(p1Id, t.id);
        if (Math.hypot(t.x - w.x2, t.y - w.y2) <= 16) union(p2Id, t.id);
      }

      // Hubungkan percabangan kawat dengan kawat lain (junction wire-to-wire <= 12px)
      for (let j = idx + 1; j < wires.length; j++) {
        const w2 = wires[j];
        const w2_p1 = `wire_${j}_p1`;
        const w2_p2 = `wire_${j}_p2`;

        if (Math.hypot(w.x1 - w2.x1, w.y1 - w2.y1) <= 12) union(p1Id, w2_p1);
        if (Math.hypot(w.x1 - w2.x2, w.y1 - w2.y2) <= 12) union(p1Id, w2_p2);
        if (Math.hypot(w.x2 - w2.x1, w.y2 - w2.y1) <= 12) union(p2Id, w2_p1);
        if (Math.hypot(w.x2 - w2.x2, w.y2 - w2.y2) <= 12) union(p2Id, w2_p2);
      }
    }

    // Buat pemetaan root ID -> nomor simpul terurut (0, 1, 2, ...)
    const rootToNodeIndex = new Map();
    let nodeCount = 0;

    // Cari terminal ground untuk dijadikan simpul acuan (0 V)
    let groundRoot = null;
    for (const el of elements) {
      if (el.type === 'ground') {
        const terms = circuitInstance.getTerminals(el);
        if (terms.length > 0) {
          groundRoot = find(terms[0].id);
          break;
        }
      }
    }

    // Jika ada ground, pastikan ia mendapatkan index 0
    if (groundRoot) {
      rootToNodeIndex.set(groundRoot, 0);
      nodeCount = 1;
    }

    for (const t of terminals) {
      const r = find(t.id);
      if (!rootToNodeIndex.has(r)) {
        rootToNodeIndex.set(r, nodeCount++);
      }
    }

    // Fungsi helper untuk mendapatkan nomor simpul terminal
    const getNodeOfTerminal = (termId) => {
      const r = find(termId);
      return rootToNodeIndex.get(r);
    };

    // 3. Susun Sistem Persamaan MNA: A * x = z
    // Non-reference nodes: 1 s.d nodeCount - 1 (jika ada ground), atau 1 s.d nodeCount - 1 (simpul 0 sbg acuan)
    const numNodes = nodeCount;
    if (numNodes <= 1) {
      return { success: false, message: 'Rangkaian belum tersambung lengkap.' };
    }

    // Identifikasi sumber tegangan mandiri & komponen yang memaksakan beda potensial
    // (termasuk saklar tertutup dan amperemeter)
    const vSources = [];
    const elementsResult = new Map();

    for (const el of elements) {
      const terms = circuitInstance.getTerminals(el);

      if (el.type === 'vsource_dc' || el.type === 'vsource_ac') {
        if (terms.length >= 2) {
          const val = this.parseValue(el.value, 12);
          vSources.push({
            el,
            nodePos: getNodeOfTerminal(terms[0].id), // kaki (+) kiri
            nodeNeg: getNodeOfTerminal(terms[1].id), // kaki (-) kanan
            value: val
          });
        }
      } else if (el.type === 'switch') {
        const isClosed = el.closed || el.state === 'closed' || el.value === 'Closed';
        if (isClosed && terms.length >= 2) {
          // Saklar tertutup = beda potensial 0 V
          vSources.push({
            el,
            nodePos: getNodeOfTerminal(terms[0].id),
            nodeNeg: getNodeOfTerminal(terms[1].id),
            value: 0
          });
        }
      } else if (el.type === 'dc_ammeter' || el.type === 'ac_ammeter') {
        if (terms.length >= 2) {
          // Ammeter Proteus ideal = drop 0 V (seri)
          vSources.push({
            el,
            nodePos: getNodeOfTerminal(terms[0].id),
            nodeNeg: getNodeOfTerminal(terms[1].id),
            value: 0
          });
        }
      } else if (el.type === 'wattmeter') {
        if (terms.length >= 2) {
          // Terminal 0 & 1 adalah sensor arus seri (0 V)
          vSources.push({
            el,
            nodePos: getNodeOfTerminal(terms[0].id),
            nodeNeg: getNodeOfTerminal(terms[1].id),
            value: 0
          });
        }
      } else if (el.type === 'vcvs') {
        // Sumber Tegangan Dependen
        if (terms.length >= 2) {
          const val = this.parseValue(el.value, 10);
          vSources.push({
            el,
            nodePos: getNodeOfTerminal(terms[0].id),
            nodeNeg: getNodeOfTerminal(terms[1].id),
            value: val
          });
        }
      } else if (el.type === 'opamp') {
        // Op-Amp Ideal: Output (terms[2]) ke ground acuan (0)
        if (terms.length >= 3) {
          vSources.push({
            el,
            isOpAmp: true,
            nodePos: getNodeOfTerminal(terms[2].id), // output
            nodeNeg: 0,
            nodeInverting: getNodeOfTerminal(terms[0].id),
            nodeNonInverting: getNodeOfTerminal(terms[1].id),
            value: 0
          });
        }
      }
    }

    // Jika tidak ada ground eksplisit dan ada sumber tegangan, jadikan kutub negatif sumber sbg acuan (0 V)
    // Di MNA standar, simpul acuan adalah simpul 0.
    const nonRefNodes = numNodes - 1; // simpul 1 s.d numNodes - 1
    const numVSources = vSources.length;
    const matrixSize = nonRefNodes + numVSources;

    if (matrixSize === 0) {
      return { success: false, message: 'Tidak ada komponen aktif dalam rangkaian.' };
    }

    // Buat matriks A dan vektor z
    const A = Array.from({ length: matrixSize }, () => new Array(matrixSize).fill(0));
    const z = new Array(matrixSize).fill(0);

    // Helper index: node n (1..numNodes-1) dipetakan ke baris n - 1
    const nIdx = (n) => n - 1;

    // Pasang konduktansi komponen pasif (Resistor, Kapasitor DC, Induktor DC, Voltmeter, dll.)
    for (const el of elements) {
      const terms = circuitInstance.getTerminals(el);
      if (terms.length < 2) continue;

      const n1 = getNodeOfTerminal(terms[0].id);
      const n2 = getNodeOfTerminal(terms[1].id);

      if (el.type === 'resistor') {
        const rVal = Math.max(1e-4, this.parseValue(el.value, 10));
        const g = 1.0 / rVal;
        this.addConductance(A, n1, n2, g);
      } else if (el.type === 'inductor') {
        // Induktor pada DC steady-state bertindak sebagai resistansi sangat kecil (hampir short)
        const g = 1.0 / 0.001;
        this.addConductance(A, n1, n2, g);
      } else if (el.type === 'capacitor') {
        // Kapasitor pada DC steady-state adalah open-circuit (kebocoran dielektrik sangat kecil)
        const g = 1e-12;
        this.addConductance(A, n1, n2, g);
      } else if (el.type === 'isource_dc') {
        // Sumber arus dari terminal 1 ke terminal 0
        const iVal = this.parseValue(el.value, 2);
        if (n1 !== 0) z[nIdx(n1)] += iVal;
        if (n2 !== 0) z[nIdx(n2)] -= iVal;
      } else if (el.type === 'dc_voltmeter' || el.type === 'ac_voltmeter') {
        const g = 1e-7; // 10 Megaohm (voltmeter paralel)
        this.addConductance(A, n1, n2, g);
      } else if (el.type === 'wattmeter') {
        if (terms.length >= 4) {
          const nv1 = getNodeOfTerminal(terms[2].id);
          const nv2 = getNodeOfTerminal(terms[3].id);
          this.addConductance(A, nv1, nv2, 1e-7);
        }
      } else if (el.type === 'multimeter') {
        const mode = el.meterMode || 'voltage_dc';
        if (mode === 'voltage_dc' || mode === 'voltage_ac') {
          // Voltmeter ideal resistansi sangat tinggi (10 Megaohm)
          const g = 1e-7;
          this.addConductance(A, n1, n2, g);
        } else if (mode === 'resistance') {
          // Mode Ohmmeter: injeksi arus uji kecil 1 mA jika rangkaian pasif
          const g = 1e-8;
          this.addConductance(A, n1, n2, g);
        }
      } else if (el.type === 'switch') {
        const isClosed = el.closed || el.state === 'closed' || el.value === 'Closed';
        if (!isClosed) {
          // Saklar terbuka: isolasi (kebocoran 10^-12)
          this.addConductance(A, n1, n2, 1e-12);
        }
      }
    }

    // Pasang baris MNA untuk Sumber Tegangan
    for (let k = 0; k < numVSources; k++) {
      const vs = vSources[k];
      const row = nonRefNodes + k;
      const nPos = vs.nodePos;
      const nNeg = vs.nodeNeg;

      if (vs.isOpAmp) {
        const nNonInv = vs.nodeNonInverting;
        const nInv = vs.nodeInverting;
        if (nNonInv !== 0) A[row][nIdx(nNonInv)] += 1;
        if (nInv !== 0) A[row][nIdx(nInv)] -= 1;
        if (nPos !== 0) A[nIdx(nPos)][row] += 1;
        z[row] = 0;
      } else {
        if (nPos !== 0) {
          A[nIdx(nPos)][row] += 1;
          A[row][nIdx(nPos)] += 1;
        }
        if (nNeg !== 0) {
          A[nIdx(nNeg)][row] -= 1;
          A[row][nIdx(nNeg)] -= 1;
        }
        z[row] = vs.value;
      }
    }

    // 4. Selesaikan SPL A * x = z dengan Eliminasi Gauss (Partial Pivoting)
    const sol = this.solveLinearSystem(A, z);
    if (!sol) {
      return { success: false, message: 'Rangkaian singular atau ada loop tegangan bersilangan.' };
    }

    // Ekstrak tegangan tiap simpul
    const nodeVoltages = new Array(numNodes).fill(0);
    nodeVoltages[0] = 0; // Acuan 0 V
    for (let n = 1; n < numNodes; n++) {
      nodeVoltages[n] = sol[nIdx(n)];
    }

    // Ekstrak arus sumber tegangan
    for (let k = 0; k < numVSources; k++) {
      const vs = vSources[k];
      const current = sol[nonRefNodes + k];
      vs.current = current;
    }

    // 5. Hitung pembacaan untuk setiap komponen & instrumen Proteus
    for (const el of elements) {
      const terms = circuitInstance.getTerminals(el);
      if (terms.length >= 2) {
        const n1 = getNodeOfTerminal(terms[0].id);
        const n2 = getNodeOfTerminal(terms[1].id);
        const v1 = nodeVoltages[n1] || 0;
        const v2 = nodeVoltages[n2] || 0;
        const vDrop = v1 - v2;

        let branchCurrent = 0;
        if (el.type === 'resistor') {
          const rVal = Math.max(1e-4, this.parseValue(el.value, 10));
          branchCurrent = vDrop / rVal;
        } else if (el.type === 'vsource_dc' || el.type === 'vcvs') {
          const matched = vSources.find(v => v.el.id === el.id);
          branchCurrent = matched ? matched.current : 0;
        } else if (el.type === 'switch') {
          const isClosed = el.closed || el.state === 'closed' || el.value === 'Closed';
          if (isClosed) {
            const matched = vSources.find(v => v.el.id === el.id);
            branchCurrent = matched ? matched.current : 0;
          } else {
            branchCurrent = 0;
          }
        } else if (el.type === 'dc_voltmeter') {
          el.displayReading = this.formatMeasurement(vDrop, 'V');
          branchCurrent = vDrop * 1e-7;
        } else if (el.type === 'ac_voltmeter') {
          el.displayReading = this.formatMeasurement(Math.abs(vDrop), 'V~');
          branchCurrent = Math.abs(vDrop) * 1e-7;
        } else if (el.type === 'dc_ammeter') {
          const matched = vSources.find(v => v.el.id === el.id);
          branchCurrent = matched ? matched.current : 0;
          el.displayReading = this.formatMeasurement(branchCurrent, 'A');
        } else if (el.type === 'ac_ammeter') {
          const matched = vSources.find(v => v.el.id === el.id);
          branchCurrent = matched ? Math.abs(matched.current) : 0;
          el.displayReading = this.formatMeasurement(branchCurrent, 'A~');
        } else if (el.type === 'wattmeter') {
          const matched = vSources.find(v => v.el.id === el.id);
          const iMeas = matched ? Math.abs(matched.current) : 0;
          let vMeas = 0;
          if (terms.length >= 4) {
            const nv1 = nodeVoltages[getNodeOfTerminal(terms[2].id)] || 0;
            const nv2 = nodeVoltages[getNodeOfTerminal(terms[3].id)] || 0;
            vMeas = nv1 - nv2;
          }
          const pVal = Math.abs(vMeas * iMeas);
          el.displayReading = this.formatMeasurement(pVal, 'W');
          branchCurrent = iMeas;
        } else if (el.type === 'opamp') {
          const nOut = terms[2] ? getNodeOfTerminal(terms[2].id) : null;
          const vOut = nOut !== null ? (nodeVoltages[nOut] || 0) : 0;
          el.displayReading = this.formatMeasurement(vOut, 'V');
        } else if (el.type === 'multimeter') {
          const mode = el.meterMode || 'voltage_dc';
          if (mode === 'voltage_dc') {
            el.displayReading = this.formatMeasurement(vDrop, 'V');
          } else if (mode === 'voltage_ac') {
            el.displayReading = this.formatMeasurement(Math.abs(vDrop), 'V~');
          } else if (mode === 'current_dc') {
            const matched = vSources.find(v => v.el.id === el.id);
            const cur = matched ? matched.current : 0;
            el.displayReading = this.formatMeasurement(cur, 'A');
          } else if (mode === 'resistance') {
            const rVal = Math.abs(branchCurrent) > 1e-9 ? Math.abs(vDrop / branchCurrent) : Infinity;
            el.displayReading = isFinite(rVal) ? this.formatMeasurement(rVal, 'Ω') : 'O.L';
          }
        }

        elementsResult.set(el.id, {
          v1,
          v2,
          vDrop,
          current: branchCurrent
        });
      }
    }

    return {
      success: true,
      solved: true,
      nodeVoltages,
      elementsResult,
      elements: elementsResult,
      message: 'Simulasi berhasil dihitung.'
    };
  }

  static addConductance(A, n1, n2, g) {
    const idx1 = n1 - 1;
    const idx2 = n2 - 1;
    if (n1 !== 0) A[idx1][idx1] += g;
    if (n2 !== 0) A[idx2][idx2] += g;
    if (n1 !== 0 && n2 !== 0) {
      A[idx1][idx2] -= g;
      A[idx2][idx1] -= g;
    }
  }

  static solveLinearSystem(A, b) {
    const n = b.length;
    // Salin agar tidak merusak matriks asli
    const M = A.map((row, i) => [...row, b[i]]);

    // Eliminasi maju dengan partial pivoting
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(M[i][i]);
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(M[r][i]) > maxVal) {
          maxVal = Math.abs(M[r][i]);
          maxRow = r;
        }
      }

      if (maxVal < 1e-12) {
        // Matriks singular
        continue;
      }

      if (maxRow !== i) {
        const tmp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = tmp;
      }

      const pivot = M[i][i];
      for (let j = i; j <= n; j++) {
        M[i][j] /= pivot;
      }

      for (let r = 0; r < n; r++) {
        if (r !== i) {
          const factor = M[r][i];
          if (Math.abs(factor) > 1e-15) {
            for (let c = i; c <= n; c++) {
              M[r][c] -= factor * M[i][c];
            }
          }
        }
      }
    }

    const result = new Array(n);
    for (let i = 0; i < n; i++) {
      result[i] = M[i][n];
      if (isNaN(result[i]) || !isFinite(result[i])) result[i] = 0;
    }
    return result;
  }

  static formatMeasurement(num, unit = '') {
    if (!isFinite(num) || isNaN(num)) return 'O.L';
    const abs = Math.abs(num);

    let prefix = '';
    let scaled = num;

    if (abs === 0) {
      return `0.00 ${unit}`.trim();
    } else if (abs >= 1e6) {
      scaled = num / 1e6;
      prefix = 'M';
    } else if (abs >= 1e3) {
      scaled = num / 1e3;
      prefix = 'k';
    } else if (abs < 1e-3) {
      scaled = num * 1e6;
      prefix = 'µ';
    } else if (abs < 1) {
      scaled = num * 1e3;
      prefix = 'm';
    }

    return `${scaled.toFixed(2)} ${prefix}${unit}`.trim();
  }
}

if (typeof window !== 'undefined') {
  window.CircuitSolver = CircuitSolver;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CircuitSolver;
}

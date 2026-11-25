/**
 * EquationHelper
 * Modul untuk menyusun catatan analisis rangkaian, asumsi arah arus,
 * hukum Kirchhoff (KCL & KVL), dan memformatnya untuk disisipkan ke MS Word.
 */

class EquationHelper {
  static generateSummary(canvas) {
    const elements = canvas.elements;
    const currentArrows = elements.filter(e => e.type === 'current_arrow');
    const meshLoops = elements.filter(e => e.type === 'mesh_loop');
    const nodes = elements.filter(e => e.type === 'node_label');
    const resistors = elements.filter(e => e.type === 'resistor');
    const vSources = elements.filter(e => e.type === 'vsource_dc' || e.type === 'vsource_ac');
    const iSources = elements.filter(e => e.type === 'isource_dc');

    let summaryText = `ANALISIS RANGKAIAN LISTRIK\n`;
    summaryText += `===========================\n\n`;

    // 1. Data Komponen
    summaryText += `1. DAFTAR KOMPONEN:\n`;
    if (vSources.length > 0) {
      summaryText += `   * Sumber Tegangan: ` + vSources.map(v => `${v.label} = ${v.value || '?'}`).join(', ') + `\n`;
    }
    if (iSources.length > 0) {
      summaryText += `   * Sumber Arus: ` + iSources.map(i => `${i.label} = ${i.value || '?'}`).join(', ') + `\n`;
    }
    if (resistors.length > 0) {
      summaryText += `   * Resistor: ` + resistors.map(r => `${r.label} = ${r.value || '?'}`).join(', ') + `\n`;
    }
    if (vSources.length === 0 && resistors.length === 0) {
      summaryText += `   * (Belum ada komponen resistor atau sumber tegangan)\n`;
    }
    summaryText += `\n`;

    // 2. Asumsi Arah Arus Cabang
    summaryText += `2. ASUMSI ARAH ARUS CABANG:\n`;
    if (currentArrows.length > 0) {
      currentArrows.forEach((arr, idx) => {
        const dirIndo = {
          right: 'ke Kanan (→)',
          left: 'ke Kiri (←)',
          up: 'ke Atas (↑)',
          down: 'ke Bawah (↓)'
        }[arr.direction] || arr.direction;
        const valStr = arr.value ? ` [Nilai: ${arr.value}]` : '';
        summaryText += `   * Arus ${arr.label || 'I' + (idx + 1)} diasumsikan mengalir ${dirIndo}${valStr}\n`;
      });
      summaryText += `   Catatan: Jika hasil perhitungan arus bernilai negatif (-), arah arus sebenarnya berlawanan dengan arah asumsi ini.\n\n`;
    } else {
      summaryText += `   * Belum ada panah arus cabang yang ditambahkan. Gunakan alat 'Panah Arus' pada toolbar.\n\n`;
    }

    // 3. Hukum Kirchhoff I (KCL - Kirchhoff's Current Law)
    summaryText += `3. ANALISIS SIMPUL (HUKUM KIRCHHOFF I - KCL):\n`;
    summaryText += `   Prinsip: Σ I_masuk = Σ I_keluar  (atau Σ I = 0 di setiap simpul/titik percabangan)\n`;
    if (nodes.length > 0 && currentArrows.length > 0) {
      nodes.forEach(node => {
        summaryText += `   * Simpul ${node.label}:\n`;
        summaryText += `     Σ I_masuk = Σ I_keluar\n`;
        summaryText += `     (Sesuaikan persamaan berdasarkan arus cabang yang bertemu di Simpul ${node.label})\n`;
      });
    } else if (currentArrows.length >= 2) {
      const arrNames = currentArrows.map(a => a.label);
      summaryText += `   * Contoh formulasi percabangan: ${arrNames[0]} = ` + arrNames.slice(1).join(' + ') + `\n`;
    } else {
      summaryText += `   * Masukkan minimal 2 panah arus dan label simpul untuk mempermudah perumusan KCL.\n`;
    }
    summaryText += `\n`;

    // 4. Hukum Kirchhoff II (KVL - Kirchhoff's Voltage Law)
    summaryText += `4. ANALISIS LOOP (HUKUM KIRCHHOFF II - KVL):\n`;
    summaryText += `   Prinsip: Σ V + Σ (I × R) = 0 dalam setiap lintasan tertutup (loop)\n`;
    if (meshLoops.length > 0) {
      meshLoops.forEach((loop, idx) => {
        const dirStr = loop.direction === 'cw' ? 'Searah Jarum Jam (Clockwise)' : 'Berlawanan Jarum Jam (Counter-Clockwise)';
        summaryText += `   * ${loop.label || 'Loop ' + (idx + 1)} (${dirStr}):\n`;
        summaryText += `     Lintasan KVL: Σ Tegangan Sumber + Σ Jatuh Tegangan (I × R) = 0\n`;
        
        // Buat contoh persamaan jika ada resistor dan sumber
        if (resistors.length > 0) {
          const rSample = resistors.slice(0, Math.min(2, resistors.length)).map(r => `(I × ${r.label})`).join(' + ');
          const vSample = vSources.length > 0 ? `${vSources[0].label} - ` : '';
          summaryText += `     Bentuk Persamaan: ${vSample}${rSample} = 0\n`;
        }
      });
    } else {
      summaryText += `   * Belum ada loop KVL yang ditambahkan. Gunakan alat 'Loop KVL' pada toolbar.\n`;
    }
    summaryText += `\n`;

    // 5. Tips Belajar Rangkaian
    summaryText += `5. PEDOMAN KONVENSI TANDA (Passive Sign Convention):\n`;
    summaryText += `   - Sumber Tegangan: Jika lintasan loop masuk ke kutub (-) dan keluar kutub (+), potensial naik (+V).\n`;
    summaryText += `                      Sebaliknya jika dari (+) ke (-), potensial turun (-V).\n`;
    summaryText += `   - Resistor: Jika arah loop searah dengan asumsi arah arus, terjadi jatuh tegangan (- I × R).\n`;
    summaryText += `               Jika arah loop berlawanan dengan arah arus, bertanda (+ I × R).\n`;

    // 6. HASIL SIMULASI RANGKAIAN (DC SIMULATION ENGINE)
    if (canvas && canvas.isSimulating) {
      summaryText += `\n6. HASIL SIMULASI RANGKAIAN DC INTERAKTIF:\n`;
      summaryText += `   Status: ${canvas.simulationResults && canvas.simulationResults.solved ? 'Sirkuit Terhitung Normal (Solved)' : 'Sirkuit Belum Lengkap / Terbuka'}\n`;

      const switches = elements.filter(e => e.type === 'switch');
      if (switches.length > 0) {
        summaryText += `   * Status Saklar: ` + switches.map(s => `${s.label}: ${s.closed ? 'TERTUTUP (ON / Closed)' : 'TERBUKA (OFF / Open)'}`).join(', ') + `\n`;
      }

      const multimeters = elements.filter(e => e.type === 'multimeter');
      if (multimeters.length > 0) {
        summaryText += `   * Pembacaan Multimeter Digital:\n`;
        multimeters.forEach(m => {
          const modeName = {
            voltage_dc: 'Voltmeter DC',
            current_dc: 'Amperemeter DC',
            resistance: 'Ohmmeter',
            voltage_ac: 'Voltmeter AC RMS'
          }[m.meterMode] || m.meterMode;
          summaryText += `     - ${m.label} [Mode: ${modeName}]: ${m.displayReading || '--.--'}\n`;
        });
      }

      // Pembacaan Instrumen Virtual Proteus
      const voltmeters = elements.filter(e => e.type === 'dc_voltmeter' || e.type === 'ac_voltmeter');
      if (voltmeters.length > 0) {
        summaryText += `   * Pembacaan Voltmeter Proteus:\n`;
        voltmeters.forEach(v => {
          summaryText += `     - ${v.label}: ${v.displayReading || '--.--'}\n`;
        });
      }

      const ammeters = elements.filter(e => e.type === 'dc_ammeter' || e.type === 'ac_ammeter');
      if (ammeters.length > 0) {
        summaryText += `   * Pembacaan Ammeter Proteus:\n`;
        ammeters.forEach(a => {
          summaryText += `     - ${a.label}: ${a.displayReading || '--.--'}\n`;
        });
      }

      const wattmeters = elements.filter(e => e.type === 'wattmeter');
      if (wattmeters.length > 0) {
        summaryText += `   * Pembacaan Wattmeter Proteus:\n`;
        wattmeters.forEach(w => {
          summaryText += `     - ${w.label}: ${w.displayReading || '--.--'}\n`;
        });
      }

      const opamps = elements.filter(e => e.type === 'opamp');
      if (opamps.length > 0) {
        summaryText += `   * Status Penguat Operasional (Op-Amp):\n`;
        opamps.forEach(op => {
          summaryText += `     - ${op.label} (${op.value || 'LM741'}): Vout = ${op.displayReading || '--.--'}\n`;
        });
      }

      const vcvsList = elements.filter(e => e.type === 'vcvs');
      if (vcvsList.length > 0) {
        summaryText += `   * Sumber Terkendali (VCVS):\n`;
        vcvsList.forEach(vc => {
          summaryText += `     - ${vc.label}: Penguatan μ = ${vc.gain !== undefined ? vc.gain : 2}, Vout = ${vc.displayReading || '--.--'}\n`;
        });
      }

      if (canvas.simulationResults && canvas.simulationResults.elements && typeof CircuitSolver !== 'undefined') {
        summaryText += `   * Tegangan & Arus per Komponen:\n`;
        for (const [id, res] of canvas.simulationResults.elements) {
          const comp = elements.find(e => e.id === id);
          if (comp && ['resistor', 'vsource_dc'].includes(comp.type)) {
            const vStr = CircuitSolver.formatMeasurement(res.vDrop, 'V');
            const iStr = CircuitSolver.formatMeasurement(res.current, 'A');
            summaryText += `     - ${comp.label} (${comp.value || ''}): V = ${vStr}, I = ${iStr}\n`;
          }
        }
      }
    }

    return summaryText;
  }
}

if (typeof window !== 'undefined') {
  window.EquationHelper = EquationHelper;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EquationHelper;
}

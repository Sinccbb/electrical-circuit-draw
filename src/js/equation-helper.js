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

    return summaryText;
  }
}

window.EquationHelper = EquationHelper;

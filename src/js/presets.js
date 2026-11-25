/**
 * Presets
 * Rangkaian contoh siap pakai untuk belajar analisis rangkaian listrik
 * Menggunakan notasi LaTeX ($...$) untuk rumus dan nama komponen
 */

const CircuitPresets = {
  // Preset 1: Rangkaian 2-Loop Klasik (Hukum Kirchhoff I & II)
  twoLoopCircuit: {
    name: 'Analisis 2-Loop (Hukum Kirchhoff)',
    description: 'Rangkaian 2 mesh klasik dengan 2 baterai, 3 resistor, arah arus cabang, dan 2 loop KVL.',
    elements: [
      // Sumber Tegangan 1 (Kiri)
      { id: 'v1', type: 'vsource_dc', x: 60, y: 160, rotation: 270, label: '$E_1$', value: '$12\\ \\text{V}$' },
      // Resistor 1 (Atas Kiri)
      { id: 'r1', type: 'resistor', x: 160, y: 80, rotation: 0, label: '$R_1$', value: '$4\\ \\Omega$' },
      // Resistor 2 (Tengah)
      { id: 'r2', type: 'resistor', x: 260, y: 160, rotation: 90, label: '$R_2$', value: '$2\\ \\Omega$' },
      // Resistor 3 (Atas Kanan)
      { id: 'r3', type: 'resistor', x: 360, y: 80, rotation: 0, label: '$R_3$', value: '$6\\ \\Omega$' },
      // Sumber Tegangan 2 (Kanan)
      { id: 'v2', type: 'vsource_dc', x: 460, y: 160, rotation: 270, label: '$E_2$', value: '$6\\ \\text{V}$' },
      // Simpul A dan B
      { id: 'nd_a', type: 'node', x: 260, y: 80, rotation: 0, label: '', value: '' },
      { id: 'lbl_a', type: 'node_label', x: 260, y: 55, rotation: 0, label: '$V_A$' },
      { id: 'nd_b', type: 'node', x: 260, y: 240, rotation: 0, label: '', value: '' },
      { id: 'lbl_b', type: 'node_label', x: 260, y: 265, rotation: 0, label: '$V_B$' },
      // Ground di bawah
      { id: 'gnd', type: 'ground', x: 260, y: 260, rotation: 0, label: 'GND', value: '' },
      // Asumsi Arah Arus Cabang
      { id: 'cur_1', type: 'current_arrow', x: 160, y: 58, rotation: 0, label: '$I_1$', value: '', direction: 'right' },
      { id: 'cur_2', type: 'current_arrow', x: 288, y: 160, rotation: 0, label: '$I_2$', value: '', direction: 'down' },
      { id: 'cur_3', type: 'current_arrow', x: 360, y: 58, rotation: 0, label: '$I_3$', value: '', direction: 'left' },
      // Loop KVL
      { id: 'loop_1', type: 'mesh_loop', x: 160, y: 160, rotation: 0, label: 'Loop 1', direction: 'cw', radius: 28 },
      { id: 'loop_2', type: 'mesh_loop', x: 360, y: 160, rotation: 0, label: 'Loop 2', direction: 'cw', radius: 28 },
      // Tanda Polaritas Asumsi
      { id: 'pol_1', type: 'polarity', x: 120, y: 60, rotation: 0, label: '+', sign: '+' },
      { id: 'pol_2', type: 'polarity', x: 200, y: 60, rotation: 0, label: '-', sign: '-' },
      { id: 'pol_3', type: 'polarity', x: 240, y: 120, rotation: 0, label: '+', sign: '+' },
      { id: 'pol_4', type: 'polarity', x: 240, y: 200, rotation: 0, label: '-', sign: '-' }
    ],
    wires: [
      { id: 'w1', x1: 60, y1: 130, x2: 60, y2: 80 },
      { id: 'w2', x1: 60, y1: 80, x2: 130, y2: 80 },
      { id: 'w3', x1: 190, y1: 80, x2: 260, y2: 80 },
      { id: 'w4', x1: 260, y1: 80, x2: 330, y2: 80 },
      { id: 'w5', x1: 390, y1: 80, x2: 460, y2: 80 },
      { id: 'w6', x1: 460, y1: 80, x2: 460, y2: 130 },
      { id: 'w7', x1: 260, y1: 80, x2: 260, y2: 130 },
      { id: 'w8', x1: 260, y1: 190, x2: 260, y2: 240 },
      { id: 'w9', x1: 60, y1: 190, x2: 60, y2: 240 },
      { id: 'w10', x1: 60, y1: 240, x2: 260, y2: 240 },
      { id: 'w11', x1: 260, y1: 240, x2: 460, y2: 240 },
      { id: 'w12', x1: 460, y1: 190, x2: 460, y2: 240 }
    ]
  },

  // Preset 2: Pembagi Tegangan dengan Jumper / Kawat Melengkung
  voltageDivider: {
    name: 'Pembagi Tegangan & Kawat Lengkung Jumper',
    description: 'Rangkaian seri 2 resistor pembagi tegangan dengan kawat melengkung menghubungkan simpul referensi.',
    elements: [
      { id: 'v_in', type: 'vsource_dc', x: 80, y: 160, rotation: 270, label: '$V_{in}$', value: '$10\\ \\text{V}$' },
      { id: 'r1', type: 'resistor', x: 220, y: 100, rotation: 90, label: '$R_1$', value: '$1\\ \\text{k}\\Omega$' },
      { id: 'r2', type: 'resistor', x: 220, y: 220, rotation: 90, label: '$R_2$', value: '$2\\ \\text{k}\\Omega$' },
      { id: 'nd_out', type: 'node', x: 220, y: 160, rotation: 0, label: '', value: '' },
      { id: 'lbl_out', type: 'node_label', x: 300, y: 160, rotation: 0, label: '$V_{out}$' },
      { id: 'cur_main', type: 'current_arrow', x: 150, y: 40, rotation: 0, label: '$I_{total}$', value: '', direction: 'right' },
      { id: 'gnd', type: 'ground', x: 220, y: 280, rotation: 0, label: 'GND', value: '' }
    ],
    wires: [
      { id: 'w1', x1: 80, y1: 130, x2: 80, y2: 40 },
      { id: 'w2', x1: 80, y1: 40, x2: 220, y2: 40 },
      { id: 'w3', x1: 220, y1: 40, x2: 220, y2: 70 },
      { id: 'w4', x1: 220, y1: 130, x2: 220, y2: 190 },
      { id: 'w5', x1: 220, y1: 160, x2: 270, y2: 160 },
      { id: 'w6', x1: 220, y1: 250, x2: 220, y2: 280 },
      // Kawat melengkung (curved jumper wire) dari ground bawah ke ground kiri
      { id: 'w_curved', x1: 80, y1: 190, x2: 220, y2: 280, curved: true, curveOffset: 45 }
    ]
  },

  // Preset 3: Jembatan Wheatstone
  wheatstoneBridge: {
    name: 'Jembatan Wheatstone (Bridge Circuit)',
    description: 'Rangkaian 4 resistor simetris untuk analisis tegangan jembatan.',
    elements: [
      { id: 'vs', type: 'vsource_dc', x: 60, y: 160, rotation: 270, label: '$V_s$', value: '$12\\ \\text{V}$' },
      { id: 'r1', type: 'resistor', x: 180, y: 80, rotation: 0, label: '$R_1$', value: '$100\\ \\Omega$' },
      { id: 'r2', type: 'resistor', x: 320, y: 80, rotation: 0, label: '$R_2$', value: '$100\\ \\Omega$' },
      { id: 'r3', type: 'resistor', x: 180, y: 240, rotation: 0, label: '$R_3$', value: '$100\\ \\Omega$' },
      { id: 'rx', type: 'resistor', x: 320, y: 240, rotation: 0, label: '$R_x$', value: '$100\\ \\Omega$' },
      { id: 'rg', type: 'resistor', x: 250, y: 160, rotation: 90, label: '$R_g$', value: '$50\\ \\Omega$' },
      { id: 'lbl_c', type: 'node_label', x: 250, y: 55, rotation: 0, label: '$V_C$' },
      { id: 'lbl_d', type: 'node_label', x: 250, y: 265, rotation: 0, label: '$V_D$' },
      { id: 'loop_a', type: 'mesh_loop', x: 180, y: 160, rotation: 0, label: 'Loop A', direction: 'cw', radius: 24 },
      { id: 'loop_b', type: 'mesh_loop', x: 320, y: 160, rotation: 0, label: 'Loop B', direction: 'cw', radius: 24 }
    ],
    wires: [
      { id: 'w1', x1: 60, y1: 130, x2: 60, y2: 40 },
      { id: 'w2', x1: 60, y1: 40, x2: 250, y2: 40 },
      { id: 'w3', x1: 250, y1: 40, x2: 180, y2: 40 },
      { id: 'w4', x1: 180, y1: 40, x2: 180, y2: 50 },
      { id: 'w6', x1: 60, y1: 190, x2: 60, y2: 280 },
      { id: 'w7', x1: 60, y1: 280, x2: 250, y2: 280 },
      { id: 'w8', x1: 250, y1: 80, x2: 250, y2: 130 },
      { id: 'w9', x1: 250, y1: 190, x2: 250, y2: 240 },
      { id: 'w10', x1: 150, y1: 80, x2: 250, y2: 80 },
      { id: 'w11', x1: 250, y1: 80, x2: 290, y2: 80 },
      { id: 'w12', x1: 150, y1: 240, x2: 250, y2: 240 },
      { id: 'w13', x1: 250, y1: 240, x2: 290, y2: 240 }
    ]
  }
};

window.CircuitPresets = CircuitPresets;

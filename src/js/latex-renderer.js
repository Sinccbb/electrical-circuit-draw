/**
 * LatexRenderer - Native Canvas Math Typesetting Engine
 * Merender rumus matematika / LaTeX secara instan langsung di HTML5 Canvas
 * 100% Native, cepat, tanpa dependensi eksternal, dan tidak akan hilang/kedip
 */

class LatexRenderer {
  constructor() {
    // Kamus simbol standar teknik elektro & fisika
    this.symbolMap = {
      '\\Omega': 'Ω',
      '\\omega': 'ω',
      '\\mu': 'μ',
      '\\pi': 'π',
      '\\theta': 'θ',
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\Delta': 'Δ',
      '\\delta': 'δ',
      '\\lambda': 'λ',
      '\\phi': 'φ',
      '\\times': '×',
      '\\cdot': '·',
      '\\pm': '±',
      '\\mp': '∓',
      '\\div': '÷',
      '\\parallel': '‖',
      '\\infty': '∞',
      '\\approx': '≈',
      '\\neq': '≠',
      '\\leq': '≤',
      '\\geq': '≥',
      '\\sum': 'Σ',
      '\\int': '∫',
      '\\partial': '∂',
      '\\to': '→',
      '\\rightarrow': '→',
      '\\leftarrow': '←',
      '\\angle': '∠',
      '\\degree': '°',
      '\\circ': '°'
    };
  }

  static isLatex(text) {
    if (!text || typeof text !== 'string') return false;
    return text.includes('$');
  }

  static extractLatex(text) {
    if (!text) return '';
    // Hapus semua simbol $ agar string bersih dan murni rumus matematika
    return text.replace(/\$/g, '').trim();
  }

  /**
   * Mengganti simbol LaTeX dengan karakter Unicode
   */
  preprocess(tex) {
    let s = tex;

    // Ganti simbol dari kamus
    for (const [cmd, sym] of Object.entries(this.symbolMap)) {
      s = s.split(cmd).join(sym);
    }

    // Bersihkan perintah font standar: \text{...}, \mathrm{...}, \mathbf{...}
    s = s.replace(/\\text\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathit\{([^}]+)\}/g, '$1');

    // Spasi LaTeX
    s = s.replace(/\\,/g, ' ');
    s = s.replace(/\\ /g, ' ');
    s = s.replace(/~/g, ' ');

    return s;
  }

  /**
   * Tokenize ekspresi menjadi elemen: text, sub, super, frac
   */
  tokenize(tex) {
    const clean = this.preprocess(tex);
    const tokens = [];
    let i = 0;

    while (i < clean.length) {
      // 1. Cek Fraction: \frac{num}{den}
      if (clean.substring(i, i + 6) === '\\frac{') {
        i += 6;
        let num = '';
        let depth = 1;
        while (i < clean.length && depth > 0) {
          if (clean[i] === '{') depth++;
          else if (clean[i] === '}') {
            depth--;
            if (depth === 0) break;
          }
          num += clean[i];
          i++;
        }
        i++; // skip '}'

        let den = '';
        if (clean[i] === '{') {
          i++;
          depth = 1;
          while (i < clean.length && depth > 0) {
            if (clean[i] === '{') depth++;
            else if (clean[i] === '}') {
              depth--;
              if (depth === 0) break;
            }
            den += clean[i];
            i++;
          }
          if (i < clean.length && clean[i] === '}') i++;
        }

        tokens.push({
          type: 'frac',
          num: this.preprocess(num),
          den: this.preprocess(den)
        });
        continue;
      }

      // 2. Cek Subscript (_) atau Superscript (^)
      if (clean[i] === '_' || clean[i] === '^') {
        const type = clean[i] === '_' ? 'sub' : 'super';
        i++;
        let val = '';
        if (clean[i] === '{') {
          i++;
          while (i < clean.length && clean[i] !== '}') {
            val += clean[i];
            i++;
          }
          if (i < clean.length && clean[i] === '}') i++;
        } else if (i < clean.length) {
          val = clean[i];
          i++;
        }
        tokens.push({ type, text: val });
        continue;
      }

      // 3. Karakter biasa / variabel / angka
      let text = '';
      while (i < clean.length && clean[i] !== '_' && clean[i] !== '^' && clean.substring(i, i + 6) !== '\\frac{') {
        text += clean[i];
        i++;
      }
      if (text.length > 0) {
        tokens.push({ type: 'normal', text });
      }
    }

    return tokens;
  }

  /**
   * Render rumus ke canvas pada koordinat (x, y)
   */
  draw(ctx, fullText, x, y, options = {}) {
    if (!fullText) return;

    const baseSize = options.fontSize || 12;
    const subSize = Math.max(9, Math.round(baseSize * 0.72));
    const color = options.color || '#1e293b';

    // Jika bukan LaTeX, render biasa
    if (!LatexRenderer.isLatex(fullText)) {
      ctx.save();
      ctx.font = `${baseSize}px "Segoe UI", sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fullText, x, y);
      ctx.restore();
      return;
    }

    // Ekstrak rumus di dalam $...$
    const cleanTex = LatexRenderer.extractLatex(fullText);
    const tokens = this.tokenize(cleanTex);

    ctx.save();

    // Font definitions
    const fontNormal = `italic ${baseSize}px "Times New Roman", "Cambria Math", serif`;
    const fontSub = `italic ${subSize}px "Times New Roman", "Cambria Math", serif`;
    const fontUpright = `${baseSize}px "Times New Roman", "Segoe UI", sans-serif`;
    const fontSubUpright = `${subSize}px "Times New Roman", "Segoe UI", sans-serif`;

    // 1. Hitung Dimensi / Bounding Box untuk Horisontal Centering
    let totalWidth = 0;
    const items = [];

    for (const tok of tokens) {
      if (tok.type === 'normal') {
        // Tentukan apakah karakter adalah angka/operator atau variabel
        const w = this.measureText(ctx, tok.text, baseSize);
        items.push({ tok, width: w });
        totalWidth += w;
      } else if (tok.type === 'sub' || tok.type === 'super') {
        const w = this.measureText(ctx, tok.text, subSize);
        items.push({ tok, width: w });
        totalWidth += w;
      } else if (tok.type === 'frac') {
        const numW = this.measureText(ctx, tok.num, subSize);
        const denW = this.measureText(ctx, tok.den, subSize);
        const fracW = Math.max(numW, denW) + 6;
        items.push({ tok, width: fracW, numW, denW });
        totalWidth += fracW;
      }
    }

    // 2. Gambar dari Kiri ke Kanan secara Terpusat di (x, y)
    let curX = x - totalWidth / 2;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.textAlign = 'left';

    for (const item of items) {
      const tok = item.tok;

      if (tok.type === 'normal') {
        ctx.font = fontNormal;
        ctx.textBaseline = 'middle';
        this.drawMixedText(ctx, tok.text, curX, y, baseSize, color);
        curX += item.width;
      } else if (tok.type === 'sub') {
        // Subscript: digeser ke bawah sedikit
        ctx.font = fontSub;
        ctx.textBaseline = 'middle';
        const subY = y + baseSize * 0.32;
        this.drawMixedText(ctx, tok.text, curX, subY, subSize, color);
        curX += item.width;
      } else if (tok.type === 'super') {
        // Superscript: digeser ke atas sedikit
        ctx.font = fontSub;
        ctx.textBaseline = 'middle';
        const supY = y - baseSize * 0.38;
        this.drawMixedText(ctx, tok.text, curX, supY, subSize, color);
        curX += item.width;
      } else if (tok.type === 'frac') {
        // Fraction: garis tengah di y
        const fracW = item.width;
        const lineY = y;

        // Garis pecahan
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(curX + 2, lineY);
        ctx.lineTo(curX + fracW - 2, lineY);
        ctx.stroke();

        // Pembilang (Numerator) di atas garis
        ctx.textBaseline = 'middle';
        const numX = curX + (fracW - item.numW) / 2;
        const numY = y - subSize * 0.75;
        this.drawMixedText(ctx, tok.num, numX, numY, subSize, color);

        // Penyebut (Denominator) di bawah garis
        const denX = curX + (fracW - item.denW) / 2;
        const denY = y + subSize * 0.75;
        this.drawMixedText(ctx, tok.den, denX, denY, subSize, color);

        curX += fracW;
      }
    }

    ctx.restore();
  }

  /**
   * Helper untuk mengukur lebar string dengan mempertimbangkan karakter
   */
  measureText(ctx, text, size) {
    ctx.font = `italic ${size}px "Times New Roman", "Cambria Math", serif`;
    return ctx.measureText(text).width;
  }

  /**
   * Menggambar string dengan pemisahan cerdas antara huruf variabel (italic)
   * dan angka/satuan/operator (upright)
   */
  drawMixedText(ctx, text, x, y, size, color) {
    let px = x;
    const fontItalic = `italic ${size}px "Times New Roman", "Cambria Math", serif`;
    const fontUpright = `${size}px "Times New Roman", "Segoe UI", sans-serif`;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      // Jika huruf alfabet biasa (a-z, A-Z), gunakan italic (variabel)
      const isVariable = /^[a-zA-Z]$/.test(ch);
      ctx.font = isVariable ? fontItalic : fontUpright;
      ctx.fillText(ch, px, y);
      px += ctx.measureText(ch).width;
    }
  }
}

if (typeof window !== 'undefined') {
  window.LatexRenderer = new LatexRenderer();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LatexRenderer;
}

/**
 * ClipboardHelper
 * Menyediakan integrasi 1-klik untuk menyalin diagram resolusi tinggi ke clipboard
 * dan menempelkannya (Ctrl+V) langsung ke Microsoft Word, Google Docs, atau aplikasi lainnya.
 */

class ClipboardHelper {
  /**
   * Menyalin gambar diagram ke clipboard sistem
   * @param {string} dataUrl - Base64 PNG data URL dari CircuitCanvas
   * @returns {Promise<{success: boolean, mode: string, message: string}>}
   */
  static async copyImageToClipboard(dataUrl) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Gunakan modern Clipboard API untuk menyalin blob gambar PNG
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          return {
            success: true,
            mode: 'clipboard',
            message: '✅ Diagram disalin ke Clipboard! Buka Word dan tekan Ctrl+V.'
          };
        } catch (clipErr) {
          console.warn('ClipboardItem dibatasi oleh browser, beralih ke unduh otomatis:', clipErr);
        }
      }

      // Fallback: Unduh file PNG jika browser tidak mengizinkan akses clipboard
      this.downloadImage(dataUrl, 'rangkaian-listrik.png');
      return {
        success: true,
        mode: 'download',
        message: '✅ Diagram berhasil diunduh sebagai PNG! Anda dapat menyisipkannya ke Word.'
      };
    } catch (err) {
      console.error('Gagal menyalin gambar:', err);
      this.downloadImage(dataUrl, 'rangkaian-listrik.png');
      return {
        success: true,
        mode: 'download',
        message: '✅ Gambar rangkaian diunduh (PNG).'
      };
    }
  }

  /**
   * Menyalin teks ringkasan analisis ke clipboard
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  static async copyTextToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      }
    } catch (err) {
      console.error('Gagal menyalin teks:', err);
      return false;
    }
  }

  /**
   * Mengunduh gambar diagram berformat PNG
   * @param {string} dataUrl
   * @param {string} filename
   */
  static downloadImage(dataUrl, filename = 'rangkaian-listrik.png') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.ClipboardHelper = ClipboardHelper;

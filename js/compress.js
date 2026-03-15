// ============================================================
//  COMPRESSÃO DE IMAGEM — canvas-based, sem dependências externas
// ============================================================

/**
 * Comprime um arquivo de imagem usando Canvas.
 * @param {File} file        Arquivo original
 * @param {number} maxWidth  Largura máxima em px (default 1280)
 * @param {number} quality   Qualidade JPEG 0-1 (default 0.75)
 * @returns {Promise<Blob>}  Blob comprimido
 */
function compressImage(file, maxWidth = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width  = maxWidth;
        }

        const canvas  = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem')),
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Gera um preview base64 de um arquivo de imagem.
 * @param {File} file
 * @returns {Promise<string>} data URL
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_INPUT = 5 * 1024 * 1024;
const MAX_DATA_URL = 650 * 1024;

export async function compressToBase64(file) {
  if (file.size > MAX_INPUT) throw new Error('Ukuran foto maksimal 5 MB.');
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar.');
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > MAX_DATA_URL && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > MAX_DATA_URL) throw new Error('Foto tidak dapat dipadatkan cukup kecil. Coba foto dengan resolusi lebih rendah.');
  return dataUrl;
}

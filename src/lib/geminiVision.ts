export interface TechPassportResult {
  carModel: string;
  vin: string;
  year: string;
  engine: string;
  plateNumber: string;
  ownerName: string;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  error?: string;
}

export interface ParsedPartItem {
  productName: string;
  partNumber: string;
  brand: string;
  quantity: number;
  estimatedPrice: number | null;
  notes?: string;
}

export interface PartsPhotoResult {
  items: ParsedPartItem[];
  rawSummary?: string;
  error?: string;
}

/**
 * Convert a File or Blob into base64 string and mimeType.
 * Automatically downscales large phone camera photos (max 2048px) and compresses to high-quality JPEG
 * to keep network requests ultra-fast and avoid payload limits.
 */
export async function fileToBase64(file: File | Blob): Promise<{ base64: string; mimeType: string }> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && file.type && file.type.startsWith('image/')) {
    try {
      return await compressImageFile(file, 2048, 0.88);
    } catch (err) {
      console.warn('Canvas image compression failed, falling back to raw FileReader:', err);
    }
  }

  return readAsRawBase64(file);
}

function compressImageFile(
  file: File | Blob,
  maxDimension: number = 2048,
  quality: number = 0.88
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          readAsRawBase64(file).then(resolve).catch(reject);
          return;
        }

        // Scale down proportionally if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          readAsRawBase64(file).then(resolve).catch(reject);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
        resolve({
          base64,
          mimeType: 'image/jpeg',
        });
      } catch {
        readAsRawBase64(file).then(resolve).catch(reject);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      readAsRawBase64(file).then(resolve).catch(reject);
    };

    img.src = url;
  });
}

function readAsRawBase64(file: File | Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.replace(/^data:[^;]+;base64,/, '');
      resolve({
        base64,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Send image to server to parse vehicle registration certificate (техпаспорт)
 * Returns structured result without throwing unhandled exceptions.
 */
export async function parseTechPassport(
  fileOrBase64: File | Blob | string,
  mimeType: string = 'image/jpeg'
): Promise<TechPassportResult> {
  const defaultPassport: TechPassportResult = {
    carModel: '',
    vin: '',
    year: '',
    engine: '',
    plateNumber: '',
    ownerName: '',
    confidence: 'medium',
    notes: '',
  };

  try {
    let base64 = '';
    let finalMimeType = mimeType;

    if (typeof fileOrBase64 === 'string') {
      base64 = fileOrBase64.replace(/^data:[^;]+;base64,/, '');
    } else {
      const converted = await fileToBase64(fileOrBase64);
      base64 = converted.base64;
      finalMimeType = converted.mimeType;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/ai/parse-techpassport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: finalMimeType,
        }),
      });

      clearTimeout(timeoutId);

      const result = await response.json().catch(() => null);
      if (!result || !result.success || !result.data) {
        return {
          ...defaultPassport,
          error: result?.error || 'Не вдалося розпізнати техпаспорт. Спробуйте чіткіше фото або введіть дані вручну.',
        };
      }

      return result.data as TechPassportResult;
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return {
        ...defaultPassport,
        error: fetchErr?.name === 'AbortError'
          ? 'Час очікування вичерпано. Спробуйте ще раз або введіть дані вручну.'
          : (fetchErr?.message || 'Не вдалося зʼєднатися з сервером розпізнавання.'),
      };
    }
  } catch (err: any) {
    return {
      ...defaultPassport,
      error: err?.message || 'Помилка завантаження фото техпаспорта',
    };
  }
}

/**
 * Send image to server to parse parts list from photo (handwritten list, invoice, receipt, screenshot)
 * Returns structured result without throwing unhandled exceptions.
 */
export async function parsePartsPhoto(
  fileOrBase64: File | Blob | string,
  mimeType: string = 'image/jpeg'
): Promise<PartsPhotoResult> {
  try {
    let base64 = '';
    let finalMimeType = mimeType;

    if (typeof fileOrBase64 === 'string') {
      base64 = fileOrBase64.replace(/^data:[^;]+;base64,/, '');
    } else {
      const converted = await fileToBase64(fileOrBase64);
      base64 = converted.base64;
      finalMimeType = converted.mimeType;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/ai/parse-parts-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: finalMimeType,
        }),
      });

      clearTimeout(timeoutId);

      const result = await response.json().catch(() => null);
      if (!result || !result.success || !result.data) {
        return {
          items: [],
          rawSummary: '',
          error: result?.error || 'Не вдалося розпізнати деталі з фото. Спробуйте інше фото або додайте деталі вручну.',
        };
      }

      return result.data as PartsPhotoResult;
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return {
        items: [],
        rawSummary: '',
        error: fetchErr?.name === 'AbortError'
          ? 'Час очікування вичерпано. Спробуйте ще раз або додайте деталі вручну.'
          : (fetchErr?.message || 'Не вдалося зʼєднатися з сервером розпізнавання.'),
      };
    }
  } catch (err: any) {
    return {
      items: [],
      rawSummary: '',
      error: err?.message || 'Помилка завантаження фото списку',
    };
  }
}

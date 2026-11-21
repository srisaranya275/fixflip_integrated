import { WarrantyHealth } from '../types/domain';

export interface WarrantyCalculation {
  expiryDate: string;
  daysRemaining: number;
  health: WarrantyHealth;
}

export function calculateWarrantyStatus(
  purchaseDateStr: string,
  durationMonths: number
): WarrantyCalculation {
  const purchase = new Date(`${purchaseDateStr}T00:00:00`);
  if (Number.isNaN(purchase.getTime())) {
    return { expiryDate: '—', daysRemaining: 0, health: 'EXPIRED' };
  }
  const expiry = new Date(purchase);
  expiry.setMonth(expiry.getMonth() + Math.max(1, Math.round(durationMonths)));

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let health: WarrantyHealth = 'ACTIVE';
  if (daysRemaining < 0) {
    health = 'EXPIRED';
  } else if (daysRemaining <= 45) {
    health = 'EXPIRING_SOON';
  }

  const expiryDate = expiry.toISOString().slice(0, 10);
  return { expiryDate, daysRemaining, health };
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Compresses a user-selected image file into a compact JPEG data URL (< 140KB)
 * so it complies cleanly with Firestore document limits and security rule bounds.
 */
export function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxDim = 720;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > 240000) {
          reject(new Error('Image is still too large after compression. Choose a smaller photo.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function generateShortCode(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${rand}`;
}

/**
 * Normalizes static local asset URLs against Vite's configured BASE_URL
 * so preset images work both in local dev ("/") and on GitHub Pages ("/fixflip_integrated/").
 */
export function resolveAssetUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const assetsMarker = 'src/assets/';
  const markerIdx = url.indexOf(assetsMarker);
  if (markerIdx !== -1) {
    return `${normalizedBase}${url.slice(markerIdx)}`;
  }
  return url;
}

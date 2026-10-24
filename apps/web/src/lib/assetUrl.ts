/**
 * Statik public dosyalar için (örn. kart görselleri) doğru base URL ile birleştirir.
 * GitHub Pages (/catankard/) ve yerel geliştirme (/) ortamlarında eksiksiz çalışır.
 */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const base = import.meta.env.BASE_URL || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${cleanPath}`;
}

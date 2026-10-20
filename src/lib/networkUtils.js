/**
 * Detecta si un error o el estado actual corresponde a una falta de conexión a la red.
 *
 * @param {Error|any} err
 * @returns {boolean}
 */
export function isNetworkError(err) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('abort')
  );
}

export const OFFLINE_WRITE_ERROR = 'Sin conexión: el cambio no se guardó';

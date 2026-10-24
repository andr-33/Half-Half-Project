/**
 * Convierte una fecha ISO a una cadena de tiempo relativo en español.
 * Ejemplos: "ahora mismo", "hace 5 min", "hace 1 h", "hace 2 d".
 *
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0 || diffInSeconds < 60) {
    return 'hace un momento';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? 'hace 1 h' : `hace ${diffInHours} h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return diffInDays === 1 ? 'hace 1 d' : `hace ${diffInDays} d`;
}

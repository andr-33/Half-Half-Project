/**
 * Normaliza una cadena de texto para comparaciones y búsquedas de nombres de categorías y artículos.
 * Realiza trim, conversión a minúsculas y eliminación de diacríticos/tildes (NFD).
 * Ejemplo: "  Léche  " -> "leche"
 *
 * @param {string} str
 * @returns {string}
 */
export function normalizeName(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

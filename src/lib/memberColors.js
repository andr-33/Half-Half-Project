/**
 * Definición única de la paleta de colores de miembros (v1.1)
 * IDs oficiales: orange, pink, sky, green, yellow, brown, red, purple, blue, mauve
 * Texto siempre negro (#1B1918) sobre fondos suaves y avatares.
 */
export const MEMBER_COLORS = {
  orange: {
    id: 'orange',
    label: 'Naranja',
    soft: '#FFEBD9',
    intense: '#FF800D',
    border: '#FF800D',
    text: '#1B1918',
  },
  pink: {
    id: 'pink',
    label: 'Rosa',
    soft: '#FFEAF5',
    intense: '#FF6BB5',
    border: '#FF6BB5',
    text: '#1B1918',
  },
  sky: {
    id: 'sky',
    label: 'Cielo',
    soft: '#E6F5FC',
    intense: '#89CFF0',
    border: '#89CFF0',
    text: '#1B1918',
  },
  green: {
    id: 'green',
    label: 'Verde',
    soft: '#CBFBD4',
    intense: '#10EA3A',
    border: '#10EA3A',
    text: '#1B1918',
  },
  yellow: {
    id: 'yellow',
    label: 'Amarillo',
    soft: '#FEFFCC',
    intense: '#FBFF00',
    border: '#BCBF00', // Borde con mayor contraste según especificación
    text: '#1B1918',
  },
  brown: {
    id: 'brown',
    label: 'Marrón',
    soft: '#F1E3D9',
    intense: '#A9714B',
    border: '#A9714B',
    text: '#1B1918',
  },
  red: {
    id: 'red',
    label: 'Rojo',
    soft: '#FCCBCB',
    intense: '#F33B3B',
    border: '#F33B3B',
    text: '#1B1918',
  },
  purple: {
    id: 'purple',
    label: 'Morado',
    soft: '#F6D7FD',
    intense: '#D646F5',
    border: '#D646F5',
    text: '#1B1918',
  },
  blue: {
    id: 'blue',
    label: 'Azul',
    soft: '#CEE0FE',
    intense: '#5F9AFA',
    border: '#5F9AFA',
    text: '#1B1918',
  },
  mauve: {
    id: 'mauve',
    label: 'Malva',
    soft: '#EFECEF',
    intense: '#B0A4B0',
    border: '#B0A4B0',
    text: '#1B1918',
  },
};

export const MEMBER_COLOR_KEYS = Object.keys(MEMBER_COLORS);

export const DEFAULT_NEUTRAL_COLOR = {
  id: 'neutral',
  label: 'Neutro',
  soft: '#F4F4F5',
  intense: '#A1A1AA',
  border: '#E4E4E7',
  text: '#1B1918',
};

/**
 * Obtiene la configuración de color de un miembro por su ID.
 * Si es nulo o desconocido, devuelve el color neutro gris para evitar roturas.
 *
 * @param {string|null} colorId
 * @returns {typeof DEFAULT_NEUTRAL_COLOR}
 */
export function getMemberColor(colorId) {
  if (!colorId || !MEMBER_COLORS[colorId]) {
    return DEFAULT_NEUTRAL_COLOR;
  }
  return MEMBER_COLORS[colorId];
}

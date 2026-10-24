const LIST_KEY = 'shopping_list_cache';
const LIST_META_KEY = 'shopping_list_meta_cache';
const MEMBERS_KEY = 'members_cache';
const CATEGORIES_KEY = 'categories_cache';
const ARTICLES_PREFIX = 'articles_cache_';

export function saveCachedMembers(members) {
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members || []));
  } catch (err) {
    console.error('Error guardando miembros en localStorage:', err);
  }
}

export function getCachedMembers() {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error leyendo miembros de localStorage:', err);
    return null;
  }
}

export function saveCachedListMeta(meta) {
  try {
    localStorage.setItem(LIST_META_KEY, JSON.stringify(meta || null));
  } catch (err) {
    console.error('Error guardando meta de lista en localStorage:', err);
  }
}

export function getCachedListMeta() {
  try {
    const raw = localStorage.getItem(LIST_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error leyendo meta de lista de localStorage:', err);
    return null;
  }
}

export function saveCachedList(items) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(items || []));
  } catch (err) {
    console.error('Error guardando lista en localStorage:', err);
  }
}

export function getCachedList() {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error leyendo lista de localStorage:', err);
    return null;
  }
}

export function saveCachedCategories(categories) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories || []));
  } catch (err) {
    console.error('Error guardando categorías en localStorage:', err);
  }
}

export function getCachedCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error leyendo categorías de localStorage:', err);
    return null;
  }
}

export function saveCachedArticles(categoryId, articles) {
  try {
    localStorage.setItem(`${ARTICLES_PREFIX}${categoryId}`, JSON.stringify(articles || []));
  } catch (err) {
    console.error('Error guardando artículos en localStorage:', err);
  }
}

export function getCachedArticles(categoryId) {
  try {
    const raw = localStorage.getItem(`${ARTICLES_PREFIX}${categoryId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error leyendo artículos de localStorage:', err);
    return null;
  }
}

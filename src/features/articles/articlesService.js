import { supabase } from '../../lib/supabaseClient';
import { normalizeName } from '../../lib/normalize';

export async function getArticlesByCategory(categoryId) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function checkArticleExistsGlobal(name, excludeArticleId = null) {
  const cleanName = (name || '').trim();
  const normalized = normalizeName(cleanName);

  if (!cleanName || !normalized) {
    return { isEmpty: true };
  }

  let query = supabase
    .from('articles')
    .select('id, name, category_id, categories ( id, name )')
    .eq('name_normalized', normalized);

  if (excludeArticleId) {
    query = query.neq('id', excludeArticleId);
  }

  const { data: existing, error } = await query.maybeSingle();
  if (error) throw error;

  if (existing) {
    return {
      exists: true,
      article: existing,
      categoryName: existing.categories?.name || 'otra categoría',
    };
  }

  return { exists: false, normalized, cleanName };
}

export async function createArticle(name, categoryId) {
  const cleanName = (name || '').trim();
  const normalized = normalizeName(cleanName);

  if (!cleanName || !normalized) {
    throw new Error('El nombre del artículo no puede estar vacío.');
  }

  // Comprobar unicidad global indicando categoría
  const check = await checkArticleExistsGlobal(cleanName);
  if (check.exists) {
    throw new Error(
      `El artículo "${check.article.name}" ya existe en la categoría "${check.categoryName}".`
    );
  }

  const { data, error } = await supabase
    .from('articles')
    .insert([
      {
        name: cleanName,
        name_normalized: normalized,
        category_id: categoryId,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un artículo con ese nombre en el catálogo.');
    }
    throw error;
  }

  return data;
}

export async function updateArticle(id, newName) {
  const cleanName = (newName || '').trim();
  const normalized = normalizeName(cleanName);

  if (!cleanName || !normalized) {
    throw new Error('El nombre del artículo no puede estar vacío.');
  }

  // Comprobar si existe en otra categoría u otro artículo
  const check = await checkArticleExistsGlobal(cleanName, id);
  if (check.exists) {
    throw new Error(
      `El artículo "${check.article.name}" ya existe en la categoría "${check.categoryName}".`
    );
  }

  const { data, error } = await supabase
    .from('articles')
    .update({ name: cleanName, name_normalized: normalized })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un artículo con ese nombre en el catálogo.');
    }
    throw error;
  }

  return data;
}

export async function isArticleInList(articleId) {
  const { data, error } = await supabase
    .from('list_items')
    .select('id')
    .eq('article_id', articleId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function deleteArticle(id) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

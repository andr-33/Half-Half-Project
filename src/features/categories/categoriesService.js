import { supabase } from '../../lib/supabaseClient';
import { normalizeName } from '../../lib/normalize';

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCategory(name) {
  const cleanName = (name || '').trim();
  const normalized = normalizeName(cleanName);

  if (!cleanName || !normalized) {
    throw new Error('El nombre de la categoría no puede estar vacío.');
  }

  // Comprobar si ya existe una categoría con ese nombre normalizado
  const { data: existing, error: checkError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('name_normalized', normalized)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) {
    throw new Error(`Ya existe una categoría llamada "${existing.name}".`);
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: cleanName, name_normalized: normalized }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe una categoría con este nombre.');
    }
    throw error;
  }

  return data;
}

export async function updateCategory(id, newName) {
  const cleanName = (newName || '').trim();
  const normalized = normalizeName(cleanName);

  if (!cleanName || !normalized) {
    throw new Error('El nombre de la categoría no puede estar vacío.');
  }

  // Comprobar si otra categoría ya tiene este nombre normalizado
  const { data: existing, error: checkError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('name_normalized', normalized)
    .neq('id', id)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) {
    throw new Error(`Ya existe otra categoría llamada "${existing.name}".`);
  }

  const { data, error } = await supabase
    .from('categories')
    .update({ name: cleanName, name_normalized: normalized })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe una categoría con este nombre.');
    }
    throw error;
  }

  return data;
}

export async function getCategoryDeleteStats(categoryId) {
  // Obtener artículos de la categoría
  const { data: articles, error: artError } = await supabase
    .from('articles')
    .select('id')
    .eq('category_id', categoryId);

  if (artError) throw artError;

  const totalArticles = articles ? articles.length : 0;
  if (totalArticles === 0) {
    return { totalArticles: 0, inListArticles: 0 };
  }

  const articleIds = articles.map((a) => a.id);

  // Obtener cuántos de ellos están en la lista actual
  const { count, error: listError } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .in('article_id', articleIds);

  if (listError) throw listError;

  return {
    totalArticles,
    inListArticles: count || 0,
  };
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

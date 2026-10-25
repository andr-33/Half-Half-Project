import { supabase } from '../../lib/supabaseClient';
import { createArticle, checkArticleExistsGlobal } from '../articles/articlesService';

export async function getListItems() {
  const { data, error } = await supabase
    .from('list_items')
    .select(`
      id,
      article_id,
      quantity,
      purchased,
      added_by,
      created_at,
      updated_at,
      articles (
        id,
        name,
        name_normalized,
        category_id,
        categories (
          id,
          name,
          name_normalized
        )
      ),
      members:added_by (
        id,
        alias,
        color
      )
    `)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getListMeta() {
  const { data, error } = await supabase
    .from('list_meta')
    .select(`
      id,
      updated_by,
      updated_at,
      members:updated_by (
        id,
        alias,
        color
      )
    `)
    .eq('id', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Añade un artículo a la lista continua mediante la RPC atómica v1.1.
 *
 * @param {string} articleId
 * @param {number} quantity
 * @param {boolean} force
 * @returns {Promise<'added' | 'exists_pending' | 'exists_purchased'>}
 */
export async function addToList(articleId, quantity = 1, force = false) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1) {
    throw new Error('La cantidad debe ser mayor o igual a 1');
  }

  const { data, error } = await supabase.rpc('add_to_list', {
    p_article_id: articleId,
    p_quantity: qty,
    p_force: force,
  });

  if (error) throw error;
  return data; // 'added' | 'exists_pending' | 'exists_purchased'
}

export async function updateItemQuantity(itemId, newQuantity) {
  const qty = parseInt(newQuantity, 10);
  if (isNaN(qty) || qty <= 0) {
    // Si baja a 0, se quita el elemento de la lista
    return removeItemFromList(itemId);
  }

  const { data, error } = await supabase
    .from('list_items')
    .update({ quantity: qty, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleItemPurchased(itemId, currentPurchased) {
  const { data, error } = await supabase
    .from('list_items')
    .update({
      purchased: !currentPurchased,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeItemFromList(itemId) {
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
  return true;
}

export async function closePurchase() {
  const { data, error } = await supabase.rpc('close_purchase');
  if (error) throw error;
  return data ?? 0;
}

export async function createAndAddToList(name, categoryId, quantity = 1, force = false) {
  // Comprobar si existe globalmente
  const check = await checkArticleExistsGlobal(name);
  let articleId;

  if (check.exists) {
    throw new Error(
      `El artículo "${check.article.name}" ya existe en la categoría "${check.categoryName}".`
    );
  } else {
    const newArticle = await createArticle(name, categoryId);
    articleId = newArticle.id;
  }

  return addToList(articleId, quantity, force);
}

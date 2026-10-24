import { supabase } from './supabaseClient';
import { addToList, updateItemQuantity, removeItemFromList, closePurchase } from '../features/list/listService';
import { createArticle } from '../features/articles/articlesService';

const QUEUE_STORAGE_KEY = 'shopping_list_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error leyendo cola offline:', err);
    return [];
  }
}

export function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue || []));
  } catch (err) {
    console.error('Error guardando cola offline:', err);
  }
}

export function enqueueOfflineAction(action) {
  const queue = getOfflineQueue();
  const newAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  queue.push(newAction);
  saveOfflineQueue(queue);
  return queue;
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (err) {
    console.error('Error limpiando cola offline:', err);
  }
}

/**
 * Procesa en orden FIFO todas las acciones acumuladas sin cobertura.
 * Devuelve el número de acciones sincronizadas.
 */
export async function processOfflineQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, processedCount: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, processedCount: 0 };
  }

  let processedCount = 0;
  const remainingQueue = [...queue];

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    try {
      switch (action.type) {
        case 'TOGGLE_PURCHASED': {
          // action: { itemId, purchased }
          await supabase
            .from('list_items')
            .update({
              purchased: action.purchased,
              updated_at: new Date().toISOString(),
            })
            .eq('id', action.itemId);
          break;
        }

        case 'UPDATE_QUANTITY': {
          // action: { itemId, quantity }
          if (action.quantity <= 0) {
            await removeItemFromList(action.itemId);
          } else {
            await updateItemQuantity(action.itemId, action.quantity);
          }
          break;
        }

        case 'REMOVE_ITEM': {
          // action: { itemId }
          await removeItemFromList(action.itemId);
          break;
        }

        case 'ADD_TO_LIST': {
          // action: { articleId, quantity, force }
          await addToList(action.articleId, action.quantity, action.force ?? true);
          break;
        }

        case 'CREATE_AND_ADD': {
          // action: { name, categoryId, quantity, force }
          const newArt = await createArticle(action.name, action.categoryId);
          await addToList(newArt.id, action.quantity, action.force ?? true);
          break;
        }

        case 'CLOSE_PURCHASE': {
          await closePurchase();
          break;
        }

        default:
          console.warn('Acción offline desconocida:', action.type);
      }

      processedCount++;
      remainingQueue.shift();
      saveOfflineQueue(remainingQueue);
    } catch (err) {
      console.error('Error procesando acción offline:', action, err);
      // Si falla por red nuevamente, nos detenemos para reintentar más tarde
      saveOfflineQueue(remainingQueue);
      return { success: false, processedCount, error: err };
    }
  }

  clearOfflineQueue();
  return { success: true, processedCount };
}

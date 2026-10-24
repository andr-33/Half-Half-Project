import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  ShoppingBag,
  CheckCircle2,
  Loader2,
  AlertCircle,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  getListItems,
  getListMeta,
  updateItemQuantity,
  toggleItemPurchased,
  removeItemFromList,
  closePurchase,
} from './listService';
import {
  saveCachedList,
  getCachedList,
  saveCachedListMeta,
  getCachedListMeta,
} from '../../lib/storage';
import {
  getOfflineQueue,
  enqueueOfflineAction,
  processOfflineQueue,
} from '../../lib/offlineQueue';
import { isNetworkError } from '../../lib/networkUtils';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import ListItemRow from './ListItemRow';
import AddToListModal from './AddToListModal';
import ClosePurchaseModal from './ClosePurchaseModal';

export default function ShoppingListView({ onGoToCategories }) {
  // Inicialización inmediata con caché local si existe
  const [items, setItems] = useState(() => getCachedList() || []);
  const [listMeta, setListMeta] = useState(() => getCachedListMeta());
  const [loading, setLoading] = useState(() => !getCachedList());
  const [notice, setNotice] = useState(null); // { type: 'info'|'success'|'error', text: '' }
  const [pendingQueueLength, setPendingQueueLength] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modales
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isClosePurchaseOpen, setIsClosePurchaseOpen] = useState(false);
  const [closingPurchase, setClosingPurchase] = useState(false);

  // Tick para actualizar el tiempo relativo dinámicamente cada 30 segundos
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const showNotice = (text, type = 'info', duration = 3500) => {
    setNotice({ text, type });
    setTimeout(() => {
      setNotice((curr) => (curr?.text === text ? null : curr));
    }, duration);
  };

  // Carga remota con actualización de caché
  const fetchItems = useCallback(async (isSilent = false) => {
    if (!isSilent && itemsRef.current.length === 0) {
      setLoading(true);
    }
    try {
      const data = await getListItems();
      setItems(data);
      saveCachedList(data);
    } catch (err) {
      if (!isNetworkError(err)) {
        showNotice(err.message || 'Error al actualizar la lista.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga remota de metadatos de lista (F14)
  const fetchMeta = useCallback(async () => {
    try {
      const meta = await getListMeta();
      if (meta) {
        setListMeta(meta);
        saveCachedListMeta(meta);
      }
    } catch (err) {
      console.error('Error al obtener metadatos de lista:', err);
    }
  }, []);

  // Función para procesar la cola de cambios locales pendientes
  const handleSyncQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const currentQueue = getOfflineQueue();
    if (currentQueue.length === 0) return;

    setIsSyncing(true);
    try {
      const result = await processOfflineQueue();
      setPendingQueueLength(getOfflineQueue().length);
      if (result.success && result.processedCount > 0) {
        showNotice(`Sincronizados ${result.processedCount} cambios locales con el servidor`, 'success');
        await fetchItems(true);
        await fetchMeta();
      }
    } catch (err) {
      console.error('Error al sincronizar cola offline:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchItems, fetchMeta]);

  // Carga inicial, eventos de red y Realtime
  useEffect(() => {
    fetchItems();
    fetchMeta();

    // Sincronizar cola pendiente si hay red al entrar
    if (navigator.onLine) {
      handleSyncQueue();
    }

    const onOnline = () => {
      showNotice('Conexión recuperada. Sincronizando cambios...', 'info', 2500);
      handleSyncQueue();
      fetchItems(true);
      fetchMeta();
    };

    const onOffline = () => {
      showNotice('Sin cobertura. Modo local activo: puedes seguir usando la lista.', 'info', 4000);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Suscripción Realtime a list_items, list_meta y members
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('public:shopping_list_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'list_items' },
          () => {
            // Si hay cola pendiente en este dispositivo, la prioridad es enviar primero los cambios locales
            if (getOfflineQueue().length === 0) {
              fetchItems(true);
              fetchMeta();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'list_meta' },
          () => {
            fetchMeta();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'members' },
          () => {
            fetchItems(true);
            fetchMeta();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchItems, fetchMeta, handleSyncQueue]);

  // Agrupación por categoría
  const categoryGroups = useMemo(() => {
    const groupMap = new Map();

    for (const item of items) {
      const cat = item.articles?.categories;
      const catId = cat?.id || 'sin-categoria';
      const catName = cat?.name || 'General';

      if (!groupMap.has(catId)) {
        groupMap.set(catId, {
          id: catId,
          name: catName,
          pending: [],
          purchased: [],
        });
      }

      if (item.purchased) {
        groupMap.get(catId).purchased.push(item);
      } else {
        groupMap.get(catId).pending.push(item);
      }
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [items]);

  const purchasedCount = useMemo(
    () => items.filter((i) => i.purchased).length,
    [items]
  );
  const pendingCount = useMemo(
    () => items.filter((i) => !i.purchased).length,
    [items]
  );

  // Línea discreta y única bajo el título de la lista (F14)
  const metaSubtitle = useMemo(() => {
    if (!listMeta?.updated_at) {
      return `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}${
        purchasedCount > 0 ? ` · ${purchasedCount} en el carrito` : ''
      }`;
    }
    const timeAgo = formatRelativeTime(listMeta.updated_at);
    if (listMeta.members?.alias) {
      return `Editado por ${listMeta.members.alias} · ${timeAgo}`;
    }
    return `Editado · ${timeAgo}`;
  }, [listMeta, pendingCount, purchasedCount]);

  // F5: Editar cantidad (soporta modo local en el supermercado)
  const handleUpdateQuantity = async (item, newQty) => {
    // Si está tachado/comprado, la edición de cantidad está bloqueada
    if (item.purchased) return;

    let nextItems;
    if (newQty <= 0) {
      nextItems = items.filter((i) => i.id !== item.id);
    } else {
      nextItems = items.map((i) =>
        i.id === item.id ? { ...i, quantity: newQty } : i
      );
    }

    // Actualización inmediata en estado y en caché local
    setItems(nextItems);
    saveCachedList(nextItems);

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'UPDATE_QUANTITY',
        itemId: item.id,
        quantity: newQty,
      });
      setPendingQueueLength(getOfflineQueue().length);
      return;
    }

    try {
      await updateItemQuantity(item.id, newQty);
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueOfflineAction({
          type: 'UPDATE_QUANTITY',
          itemId: item.id,
          quantity: newQty,
        });
        setPendingQueueLength(getOfflineQueue().length);
      } else {
        // Error del servidor no recuperable
        showNotice(err.message || 'Error al actualizar cantidad', 'error');
        await fetchItems(true);
      }
    }
  };

  // F6: Marcar / desmarcar comprado (soporta modo local en el supermercado)
  const handleTogglePurchased = async (item) => {
    const nextPurchased = !item.purchased;
    const nextItems = items.map((i) =>
      i.id === item.id ? { ...i, purchased: nextPurchased } : i
    );

    // Actualización inmediata en local para que el usuario pueda tachar sin demora
    setItems(nextItems);
    saveCachedList(nextItems);

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'TOGGLE_PURCHASED',
        itemId: item.id,
        purchased: nextPurchased,
      });
      setPendingQueueLength(getOfflineQueue().length);
      return;
    }

    try {
      await toggleItemPurchased(item.id, item.purchased);
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueOfflineAction({
          type: 'TOGGLE_PURCHASED',
          itemId: item.id,
          purchased: nextPurchased,
        });
        setPendingQueueLength(getOfflineQueue().length);
      } else {
        showNotice(err.message || 'Error al cambiar estado', 'error');
        await fetchItems(true);
      }
    }
  };

  // F7: Quitar elemento de la lista (soporta modo local)
  const handleRemoveItem = async (item) => {
    // Si está tachado/comprado, no se puede eliminar directamente
    if (item.purchased) return;

    const nextItems = items.filter((i) => i.id !== item.id);
    setItems(nextItems);
    saveCachedList(nextItems);

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'REMOVE_ITEM',
        itemId: item.id,
      });
      setPendingQueueLength(getOfflineQueue().length);
      return;
    }

    try {
      await removeItemFromList(item.id);
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueOfflineAction({
          type: 'REMOVE_ITEM',
          itemId: item.id,
        });
        setPendingQueueLength(getOfflineQueue().length);
      } else {
        showNotice(err.message || 'Error al quitar artículo', 'error');
        await fetchItems(true);
      }
    }
  };

  // F8: Cerrar compra (soporta modo local)
  const handleConfirmClosePurchase = async () => {
    const nextItems = items.filter((i) => !i.purchased);
    setItems(nextItems);
    saveCachedList(nextItems);
    setIsClosePurchaseOpen(false);

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'CLOSE_PURCHASE',
      });
      setPendingQueueLength(getOfflineQueue().length);
      showNotice('Compra archivada en local. Se sincronizará al recuperar cobertura.', 'info');
      return;
    }

    setClosingPurchase(true);
    try {
      await closePurchase();
      await fetchItems(true);
      showNotice('Compra finalizada y archivada con éxito.', 'success');
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueOfflineAction({
          type: 'CLOSE_PURCHASE',
        });
        setPendingQueueLength(getOfflineQueue().length);
        showNotice('Compra archivada en local (sin cobertura).', 'info');
      } else {
        showNotice(err.message || 'Error al cerrar compra.', 'error');
        await fetchItems(true);
      }
    } finally {
      setClosingPurchase(false);
    }
  };

  // Manejar adición de artículo (local o remoto)
  const handleItemAddedLocally = (addedItem) => {
    if (addedItem) {
      setItems((prev) => {
        const exists = prev.find((i) => i.article_id === addedItem.article_id);
        let updated;
        if (exists) {
          updated = prev.map((i) =>
            i.article_id === addedItem.article_id
              ? {
                  ...i,
                  quantity: exists.purchased ? addedItem.quantity : exists.quantity + addedItem.quantity,
                  purchased: false,
                }
              : i
          );
        } else {
          updated = [addedItem, ...prev];
        }
        saveCachedList(updated);
        return updated;
      });
    }
    setPendingQueueLength(getOfflineQueue().length);
    fetchItems(true);
  };

  return (
    <div className="flex flex-col min-h-full relative">
      {/* Notificación flotante superior */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-16 left-4 right-4 z-40 max-w-md mx-auto p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            notice.type === 'error'
              ? 'bg-red-600 text-white'
              : notice.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#1B1918] text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {notice.type === 'info' && <WifiOff className="w-4 h-4 flex-shrink-0" />}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Cabecera de la lista */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-[#1B1918]">
              Lista de la compra
            </h1>
            {pendingQueueLength > 0 && (
              <span
                title={`${pendingQueueLength} cambios locales pendientes de sincronizar`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold"
              >
                {isSyncing ? (
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <WifiOff className="w-2.5 h-2.5" />
                )}
                <span>{pendingQueueLength} pend.</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">
            {metaSubtitle}
          </p>
        </div>

        {/* Botón Cerrar compra (F8) */}
        <button
          type="button"
          onClick={() => setIsClosePurchaseOpen(true)}
          disabled={purchasedCount === 0}
          title={
            purchasedCount === 0
              ? 'No hay artículos marcados como comprados para cerrar'
              : 'Archivar y cerrar artículos comprados'
          }
          className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingBag className="w-4 h-4 text-neutral-700" />
          <span>Cerrar compra</span>
        </button>
      </div>

      <div className="p-4 flex-1">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Cargando lista...</p>
          </div>
        ) : items.length === 0 ? (
          /* Estado vacío F4: "Nada pendiente" */
          <div className="py-24 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-base font-semibold text-neutral-900">
              Nada pendiente
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Tu lista de la compra está vacía. Añade lo que falte en casa antes de ir al súper.
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B1918] hover:bg-neutral-800 active:bg-neutral-900 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir artículos</span>
            </button>
          </div>
        ) : (
          /* Grupos por categoría (F4) */
          <div className="space-y-6">
            {categoryGroups.map((group) => (
              <section key={group.id} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {group.name}
                  </h2>
                  <span className="text-xs text-neutral-400 font-medium">
                    {group.pending.length + group.purchased.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Pendientes */}
                  {group.pending.map((item) => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      onTogglePurchased={handleTogglePurchased}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                    />
                  ))}

                  {/* Comprados tachados */}
                  {group.purchased.map((item) => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      onTogglePurchased={handleTogglePurchased}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Botón flotante inferior (FAB) para captura rápida <= 3 toques */}
      <div className="fixed bottom-16 right-4 z-20 max-w-md">
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          aria-label="Añadir a la lista"
          className="w-14 h-14 min-h-[44px] min-w-[44px] rounded-2xl bg-[#1B1918] hover:bg-neutral-800 active:bg-neutral-900 text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Modal añadir a la lista (F3) con soporte para añadir offline */}
      <AddToListModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onItemAdded={handleItemAddedLocally}
        onGoToCategories={onGoToCategories}
      />

      {/* Modal confirmar cierre de compra (F8) */}
      <ClosePurchaseModal
        isOpen={isClosePurchaseOpen}
        onClose={() => setIsClosePurchaseOpen(false)}
        onConfirm={handleConfirmClosePurchase}
        purchasedCount={purchasedCount}
        pendingCount={pendingCount}
        closing={closingPurchase}
      />
    </div>
  );
}

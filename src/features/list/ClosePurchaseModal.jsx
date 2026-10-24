import Modal from '../../components/ui/Modal';
import { ShoppingBag } from 'lucide-react';

export default function ClosePurchaseModal({
  isOpen,
  onClose,
  onConfirm,
  purchasedCount = 0,
  pendingCount = 0,
  closing = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cerrar compra">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900 text-xs">
          <ShoppingBag className="w-5 h-5 flex-shrink-0 text-neutral-800 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">
              ¿Finalizar y archivar compra?
            </p>
            <p className="text-neutral-600">
              Se cerrarán <strong>{purchasedCount} {purchasedCount === 1 ? 'artículo comprado' : 'artículos comprados'}</strong>; {pendingCount} {pendingCount === 1 ? 'sigue pendiente' : 'siguen pendientes'}.
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Los artículos comprados se quitarán de la lista, pero permanecerán en tu catálogo para futuras compras.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={closing}
            className="px-4 h-11 min-h-[44px] text-xs font-semibold text-neutral-600 hover:text-[#1B1918] rounded-xl hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={closing}
            className="px-5 h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1918] hover:bg-neutral-800 active:bg-black text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {closing ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Cerrar compra'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

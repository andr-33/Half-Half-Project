import Modal from '../../components/ui/Modal';
import { AlertCircle, ShoppingCart } from 'lucide-react';

export default function ArticleExistsPromptModal({
  isOpen,
  promptType,
  articleName,
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen || !promptType) return null;

  const isPending = promptType === 'exists_pending';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={isPending ? 'Artículo ya en la lista' : 'Artículo ya comprado'}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
          {isPending ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
          ) : (
            <ShoppingCart className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
          )}

          <div className="space-y-1">
            {isPending ? (
              <p className="font-semibold text-sm leading-snug">
                ¿Seguro que quieres añadir «{articleName}»? Ya es parte de la lista.
              </p>
            ) : (
              <p className="font-semibold text-sm leading-snug">
                Parece que «{articleName}» ya está marcado como comprado.
              </p>
            )}

            <p className="text-[11px] text-amber-800">
              {isPending
                ? 'Si continúas, se sumará la cantidad especificada a la existente conservando su autor.'
                : 'Si lo añades de nuevo, volverá a pendientes con la nueva cantidad conservando su autor original.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 h-11 min-h-[44px] text-xs font-semibold text-neutral-600 hover:text-black rounded-xl hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            {isPending ? 'No' : 'Cancelar'}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1918] hover:bg-neutral-800 active:bg-black text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-xs"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPending ? (
              'Sí'
            ) : (
              'Añadir de nuevo'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

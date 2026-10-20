import Modal from '../../components/ui/Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDeleteArticleModal({
  isOpen,
  onClose,
  onConfirm,
  article,
  deleting = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar artículo">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">
              ¿Eliminar "{article?.name}"?
            </p>
            <p>
              Este artículo está actualmente en la lista de la compra y se quitará de ella.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 h-11 min-h-[44px] text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(article)}
            disabled={deleting}
            className="px-5 h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Eliminar'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

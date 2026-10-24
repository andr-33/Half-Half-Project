import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { getCategoryDeleteStats } from './categoriesService';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDeleteCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  category,
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && category) {
      setLoading(true);
      setError('');
      setDeleting(false);
      getCategoryDeleteStats(category.id)
        .then((data) => {
          setStats(data);
          setLoading(false);
        })
        .catch((err) => {
          setError('Error al calcular artículos asociados.');
          setLoading(false);
        });
    }
  }, [isOpen, category]);

  const handleConfirm = async () => {
    if (!category) return;
    setDeleting(true);
    try {
      await onConfirm(category.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al eliminar la categoría.');
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar categoría">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">
              ¿Eliminar "{category?.name}"?
            </p>
            {loading ? (
              <p className="text-neutral-500">
                Calculando artículos afectados...
              </p>
            ) : (
              <p>
                Se eliminarán <strong>{stats?.totalArticles ?? 0} artículos</strong> ({stats?.inListArticles ?? 0} están en la lista actual).
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 h-11 min-h-[44px] text-xs font-semibold text-neutral-600 hover:text-[#1B1918] rounded-xl hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || deleting}
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

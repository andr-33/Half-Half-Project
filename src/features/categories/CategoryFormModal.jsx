import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import { AlertCircle } from 'lucide-react';

export default function CategoryFormModal({ isOpen, onClose, onSave, initialCategory = null }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialCategory ? initialCategory.name : '');
      setError('');
      setSaving(false);
    }
  }, [isOpen, initialCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre de la categoría no puede estar vacío.');
      return;
    }

    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialCategory ? 'Renombrar categoría' : 'Nueva categoría'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="category-name"
            className="block text-xs font-semibold text-neutral-700 mb-1"
          >
            Nombre de la categoría
          </label>
          <input
            id="category-name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Frutería, Lácteos, Limpieza..."
            className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 bg-white text-[#1B1918] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-11 min-h-[44px] text-xs font-semibold text-neutral-600 hover:text-[#1B1918] rounded-xl hover:bg-neutral-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-5 h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1918] hover:bg-neutral-800 active:bg-black text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : initialCategory ? (
              'Guardar'
            ) : (
              'Crear'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

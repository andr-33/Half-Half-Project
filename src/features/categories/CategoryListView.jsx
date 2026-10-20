import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  FolderOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './categoriesService';
import { saveCachedCategories, getCachedCategories } from '../../lib/storage';
import { isNetworkError, OFFLINE_WRITE_ERROR } from '../../lib/networkUtils';
import CategoryFormModal from './CategoryFormModal';
import ConfirmDeleteCategoryModal from './ConfirmDeleteCategoryModal';
import CategoryDetailView from './CategoryDetailView';

export default function CategoryListView() {
  // Inicializar inmediatamente con caché si existe
  const [categories, setCategories] = useState(() => getCachedCategories() || []);
  const [loading, setLoading] = useState(() => !getCachedCategories());
  const [errorMsg, setErrorMsg] = useState('');

  // Navegación interna a detalle de categoría seleccionada
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState(null);

  const fetchCategories = async () => {
    try {
      if (categories.length === 0) setLoading(true);
      setErrorMsg('');
      const data = await getCategories();
      setCategories(data);
      saveCachedCategories(data);
    } catch (err) {
      if (!isNetworkError(err)) {
        setErrorMsg(err.message || 'Error al cargar las categorías.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateOrUpdate = async (name) => {
    if (!navigator.onLine) {
      throw new Error(OFFLINE_WRITE_ERROR);
    }
    try {
      if (editingCategory) {
        const updated = await updateCategory(editingCategory.id, name);
        if (selectedCategory?.id === updated.id) {
          setSelectedCategory(updated);
        }
      } else {
        await createCategory(name);
      }
      await fetchCategories();
    } catch (err) {
      throw new Error(isNetworkError(err) ? OFFLINE_WRITE_ERROR : err.message);
    }
  };

  const handleConfirmDelete = async (categoryId) => {
    if (!navigator.onLine) {
      setErrorMsg(OFFLINE_WRITE_ERROR);
      return;
    }
    try {
      await deleteCategory(categoryId);
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
      }
      await fetchCategories();
    } catch (err) {
      setErrorMsg(isNetworkError(err) ? OFFLINE_WRITE_ERROR : err.message);
    }
  };

  // Si hay una categoría seleccionada, renderizamos la vista de detalle
  if (selectedCategory) {
    return (
      <CategoryDetailView
        category={selectedCategory}
        onBack={() => {
          setSelectedCategory(null);
          fetchCategories();
        }}
        onCategoryUpdated={fetchCategories}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Cabecera de la sección Catálogo */}
      <div className="sticky top-0 z-20 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Catálogo
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCategory(null);
            setIsFormOpen(true);
          }}
          className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva categoría</span>
        </button>
      </div>

      <div className="p-4 flex-1">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Cargando categorías...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-20 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mb-3">
              <FolderOpen className="w-7 h-7" />
            </div>
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Crea tu primera categoría
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
              Organiza los artículos que sueles comprar por pasillos o tipos de producto (Frutería, Limpieza, etc.).
            </p>
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsFormOpen(true);
              }}
              className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Crear categoría</span>
            </button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs hover:border-emerald-500/40 transition-colors"
              >
                {/* Zona clicable principal que abre el detalle de la categoría */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="flex-1 flex items-center justify-between text-left pr-2 min-h-[44px]"
                >
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {cat.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                </button>

                {/* Acciones de gestión de categoría */}
                <div className="flex items-center gap-1 border-l border-neutral-100 dark:border-neutral-700/60 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(cat);
                      setIsFormOpen(true);
                    }}
                    aria-label={`Renombrar categoría ${cat.name}`}
                    className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/40 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmCategory(cat)}
                    aria-label={`Eliminar categoría ${cat.name}`}
                    className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal crear / renombrar categoría */}
      <CategoryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleCreateOrUpdate}
        initialCategory={editingCategory}
      />

      {/* Modal confirmar eliminación de categoría con recuentos */}
      <ConfirmDeleteCategoryModal
        isOpen={Boolean(deleteConfirmCategory)}
        onClose={() => setDeleteConfirmCategory(null)}
        onConfirm={handleConfirmDelete}
        category={deleteConfirmCategory}
      />
    </div>
  );
}

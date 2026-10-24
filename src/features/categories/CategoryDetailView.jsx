import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  PackageOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  getArticlesByCategory,
  createArticle,
  updateArticle,
  deleteArticle,
  isArticleInList,
} from '../articles/articlesService';
import { saveCachedArticles, getCachedArticles } from '../../lib/storage';
import { isNetworkError, OFFLINE_WRITE_ERROR } from '../../lib/networkUtils';
import ArticleFormModal from '../articles/ArticleFormModal';
import ConfirmDeleteArticleModal from '../articles/ConfirmDeleteArticleModal';

export default function CategoryDetailView({ category, onBack, onCategoryUpdated }) {
  // Inicialización con caché local de artículos para esta categoría
  const [articles, setArticles] = useState(() => getCachedArticles(category.id) || []);
  const [loading, setLoading] = useState(() => !getCachedArticles(category.id));
  const [errorMsg, setErrorMsg] = useState('');

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [deleteConfirmArticle, setDeleteConfirmArticle] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchArticles = async () => {
    try {
      if (articles.length === 0) setLoading(true);
      setErrorMsg('');
      const data = await getArticlesByCategory(category.id);
      setArticles(data);
      saveCachedArticles(category.id, data);
    } catch (err) {
      if (!isNetworkError(err)) {
        setErrorMsg(err.message || 'Error al cargar los artículos.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (category?.id) {
      fetchArticles();
    }
  }, [category?.id]);

  const handleCreateOrUpdate = async (name) => {
    if (!navigator.onLine) {
      throw new Error(OFFLINE_WRITE_ERROR);
    }
    try {
      if (editingArticle) {
        await updateArticle(editingArticle.id, name);
      } else {
        await createArticle(name, category.id);
      }
      await fetchArticles();
      onCategoryUpdated?.();
    } catch (err) {
      throw new Error(isNetworkError(err) ? OFFLINE_WRITE_ERROR : err.message);
    }
  };

  const handleDeleteClick = async (article) => {
    if (!navigator.onLine) {
      setErrorMsg(OFFLINE_WRITE_ERROR);
      return;
    }
    setErrorMsg('');
    try {
      const inList = await isArticleInList(article.id);
      if (inList) {
        setDeleteConfirmArticle(article);
      } else {
        await deleteArticle(article.id);
        await fetchArticles();
        onCategoryUpdated?.();
      }
    } catch (err) {
      setErrorMsg(isNetworkError(err) ? OFFLINE_WRITE_ERROR : err.message);
    }
  };

  const handleConfirmDelete = async (article) => {
    if (!navigator.onLine) {
      setErrorMsg(OFFLINE_WRITE_ERROR);
      setDeleteConfirmArticle(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteArticle(article.id);
      setDeleteConfirmArticle(null);
      await fetchArticles();
      onCategoryUpdated?.();
    } catch (err) {
      setErrorMsg(isNetworkError(err) ? OFFLINE_WRITE_ERROR : err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Barra de navegación secundaria de categoría */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 py-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-1 text-sm font-semibold text-neutral-700 hover:text-[#1B1918] transition-colors"
          aria-label="Volver a categorías"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Categorías</span>
        </button>

        <button
          onClick={() => {
            setEditingArticle(null);
            setIsFormOpen(true);
          }}
          className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl bg-[#1B1918] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo artículo</span>
        </button>
      </div>

      <div className="p-4 flex-1">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight text-[#1B1918]">
            {category.name}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {articles.length} {articles.length === 1 ? 'artículo en catálogo' : 'artículos en catálogo'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Cargando artículos...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
              <PackageOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-800">
              Añade el primer artículo
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Esta categoría aún no contiene artículos en el catálogo.
            </p>
            <button
              onClick={() => {
                setEditingArticle(null);
                setIsFormOpen(true);
              }}
              className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B1918] hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir artículo</span>
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {articles.map((art) => (
              <li
                key={art.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-xs"
              >
                <span className="text-sm font-medium text-[#1B1918]">
                  {art.name}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingArticle(art);
                      setIsFormOpen(true);
                    }}
                    aria-label={`Renombrar artículo ${art.name}`}
                    className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteClick(art)}
                    aria-label={`Eliminar artículo ${art.name}`}
                    className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal crear / editar artículo */}
      <ArticleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleCreateOrUpdate}
        categoryName={category.name}
        initialArticle={editingArticle}
      />

      {/* Modal confirmación eliminar artículo (si está en la lista) */}
      <ConfirmDeleteArticleModal
        isOpen={Boolean(deleteConfirmArticle)}
        onClose={() => setDeleteConfirmArticle(null)}
        onConfirm={handleConfirmDelete}
        article={deleteConfirmArticle}
        deleting={isDeleting}
      />
    </div>
  );
}

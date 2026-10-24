import { useState, useEffect, useMemo } from 'react';
import Modal from '../../components/ui/Modal';
import { getCategories } from '../categories/categoriesService';
import { getArticlesByCategory, checkArticleExistsGlobal } from '../articles/articlesService';
import { addToList, createAndAddToList } from './listService';
import { normalizeName } from '../../lib/normalize';
import { isNetworkError } from '../../lib/networkUtils';
import { getCachedCategories } from '../../lib/storage';
import { enqueueOfflineAction } from '../../lib/offlineQueue';
import ArticleExistsPromptModal from './ArticleExistsPromptModal';
import {
  Plus,
  Minus,
  Check,
  AlertCircle,
  FolderPlus,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function AddToListModal({
  isOpen,
  onClose,
  onItemAdded,
  onGoToCategories,
}) {
  const [categories, setCategories] = useState(() => getCachedCategories() || []);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalMatch, setGlobalMatch] = useState(null);
  const [checkingGlobal, setCheckingGlobal] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [addingArticleId, setAddingArticleId] = useState(null);
  const [isCreatingAndAdding, setIsCreatingAndAdding] = useState(false);
  const [addedSuccessId, setAddedSuccessId] = useState(null);

  // Estado para F15: Diálogos de advertencia de artículo ya en lista
  const [promptState, setPromptState] = useState({
    isOpen: false,
    promptType: null, // 'exists_pending' | 'exists_purchased'
    articleName: '',
    articleId: null,
    quantity: 1,
    isCreateOnFly: false,
    createName: '',
    createCategoryId: null,
  });
  const [confirmingPrompt, setConfirmingPrompt] = useState(false);

  // Cargar categorías al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSearchTerm('');
      setQuantity(1);
      setGlobalMatch(null);
      setAddedSuccessId(null);
      setPromptState({
        isOpen: false,
        promptType: null,
        articleName: '',
        articleId: null,
        quantity: 1,
        isCreateOnFly: false,
        createName: '',
        createCategoryId: null,
      });

      const cached = getCachedCategories();
      if (cached && cached.length > 0) {
        setCategories(cached);
        setSelectedCategoryId((prev) => (prev && cached.some((c) => c.id === prev) ? prev : cached[0].id));
        setLoadingCategories(false);
      } else {
        setLoadingCategories(true);
      }

      getCategories()
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0) {
            setSelectedCategoryId((prev) => (prev && cats.some((c) => c.id === prev) ? prev : cats[0].id));
          } else {
            setSelectedCategoryId(null);
          }
        })
        .catch((err) => {
          if (!cached || cached.length === 0) {
            setErrorMsg(err.message || 'Error al cargar categorías.');
          }
        })
        .finally(() => {
          setLoadingCategories(false);
        });
    }
  }, [isOpen]);

  // Cargar artículos de la categoría seleccionada
  useEffect(() => {
    if (selectedCategoryId) {
      setLoadingArticles(true);
      getArticlesByCategory(selectedCategoryId)
        .then((arts) => {
          setArticles(arts);
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Error al cargar artículos de la categoría.');
        })
        .finally(() => {
          setLoadingArticles(false);
        });
    } else {
      setArticles([]);
    }
  }, [selectedCategoryId]);

  // Comprobar coincidencia global cuando el usuario escribe algo
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setGlobalMatch(null);
      return;
    }

    const norm = normalizeName(trimmed);
    const existsInCurrent = articles.some((a) => a.name_normalized === norm);
    if (existsInCurrent) {
      setGlobalMatch(null);
      return;
    }

    let isMounted = true;
    setCheckingGlobal(true);
    checkArticleExistsGlobal(trimmed)
      .then((res) => {
        if (isMounted) {
          if (res.exists) {
            setGlobalMatch(res);
          } else {
            setGlobalMatch(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) setGlobalMatch(null);
      })
      .finally(() => {
        if (isMounted) setCheckingGlobal(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchTerm, articles]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Artículos filtrados por la búsqueda
  const filteredArticles = useMemo(() => {
    if (!searchTerm.trim()) return articles;
    const term = normalizeName(searchTerm);
    return articles.filter((a) => a.name_normalized.includes(term));
  }, [articles, searchTerm]);

  // Comprueba si el término exacto ya existe en la categoría seleccionada
  const exactMatchInCurrent = useMemo(() => {
    const term = normalizeName(searchTerm);
    return articles.find((a) => a.name_normalized === term);
  }, [articles, searchTerm]);

  // Añadir artículo existente con soporte F15
  const handleAddExisting = async (article, force = false) => {
    setErrorMsg('');
    setAddingArticleId(article.id);

    const localItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      article_id: article.id,
      quantity,
      purchased: false,
      updated_at: new Date().toISOString(),
      articles: {
        id: article.id,
        name: article.name,
        category_id: article.category_id,
        categories: selectedCategory,
      },
    };

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'ADD_TO_LIST',
        articleId: article.id,
        quantity,
        force: true,
      });
      setAddedSuccessId(article.id);
      onItemAdded?.(localItem);
      setTimeout(() => {
        onClose();
      }, 300);
      setAddingArticleId(null);
      return;
    }

    try {
      const status = await addToList(article.id, quantity, force);

      if (status === 'added') {
        setAddedSuccessId(article.id);
        onItemAdded?.(localItem);
        setTimeout(() => {
          onClose();
        }, 300);
      } else if (status === 'exists_pending' || status === 'exists_purchased') {
        // F15: Mostrar diálogo de confirmación según el caso
        setPromptState({
          isOpen: true,
          promptType: status,
          articleName: article.name,
          articleId: article.id,
          quantity,
          isCreateOnFly: false,
          createName: '',
          createCategoryId: null,
        });
      }
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueOfflineAction({
          type: 'ADD_TO_LIST',
          articleId: article.id,
          quantity,
          force: true,
        });
        setAddedSuccessId(article.id);
        onItemAdded?.(localItem);
        setTimeout(() => {
          onClose();
        }, 300);
      } else {
        setErrorMsg(err.message || 'Error al añadir a la lista.');
      }
    } finally {
      setAddingArticleId(null);
    }
  };

  // Crear y añadir sobre la marcha con soporte F15
  const handleCreateAndAdd = async (e, force = false) => {
    e?.preventDefault();
    const clean = searchTerm.trim();
    if (!clean || !selectedCategoryId) return;

    setErrorMsg('');
    setIsCreatingAndAdding(true);

    const tempArtId = `temp_${Date.now()}`;
    const localItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      article_id: tempArtId,
      quantity,
      purchased: false,
      updated_at: new Date().toISOString(),
      articles: {
        id: tempArtId,
        name: clean,
        category_id: selectedCategoryId,
        categories: selectedCategory,
      },
    };

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'CREATE_AND_ADD',
        name: clean,
        categoryId: selectedCategoryId,
        quantity,
        force: true,
      });
      onItemAdded?.(localItem);
      onClose();
      setIsCreatingAndAdding(false);
      return;
    }

    try {
      const status = await createAndAddToList(clean, selectedCategoryId, quantity, force);

      if (status === 'added') {
        onItemAdded?.(localItem);
        onClose();
      } else if (status === 'exists_pending' || status === 'exists_purchased') {
        setPromptState({
          isOpen: true,
          promptType: status,
          articleName: clean,
          articleId: null,
          quantity,
          isCreateOnFly: true,
          createName: clean,
          createCategoryId: selectedCategoryId,
        });
      }
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueOfflineAction({
          type: 'CREATE_AND_ADD',
          name: clean,
          categoryId: selectedCategoryId,
          quantity,
          force: true,
        });
        onItemAdded?.(localItem);
        onClose();
      } else {
        setErrorMsg(err.message || 'Error al crear y añadir a la lista.');
      }
    } finally {
      setIsCreatingAndAdding(false);
    }
  };

  // Añadir existente desde otra categoría con soporte F15
  const handleAddGlobalMatch = async (force = false) => {
    if (!globalMatch?.article) return;
    const art = globalMatch.article;

    setErrorMsg('');
    setAddingArticleId(art.id);

    const localItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      article_id: art.id,
      quantity,
      purchased: false,
      updated_at: new Date().toISOString(),
      articles: {
        id: art.id,
        name: art.name,
        category_id: art.category_id,
        categories: {
          id: art.category_id,
          name: globalMatch.categoryName,
        },
      },
    };

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'ADD_TO_LIST',
        articleId: art.id,
        quantity,
        force: true,
      });
      onItemAdded?.(localItem);
      onClose();
      setAddingArticleId(null);
      return;
    }

    try {
      const status = await addToList(art.id, quantity, force);

      if (status === 'added') {
        onItemAdded?.(localItem);
        onClose();
      } else if (status === 'exists_pending' || status === 'exists_purchased') {
        setPromptState({
          isOpen: true,
          promptType: status,
          articleName: art.name,
          articleId: art.id,
          quantity,
          isCreateOnFly: false,
          createName: '',
          createCategoryId: null,
        });
      }
    } catch (err) {
      if (isNetworkError(err)) {
        enqueueOfflineAction({
          type: 'ADD_TO_LIST',
          articleId: art.id,
          quantity,
          force: true,
        });
        onItemAdded?.(localItem);
        onClose();
      } else {
        setErrorMsg(err.message || 'Error al añadir el artículo.');
      }
    } finally {
      setAddingArticleId(null);
    }
  };

  // Confirmar reintento con p_force = true desde el diálogo F15
  const handleConfirmPrompt = async () => {
    setConfirmingPrompt(true);
    try {
      if (promptState.isCreateOnFly) {
        await createAndAddToList(
          promptState.createName,
          promptState.createCategoryId,
          promptState.quantity,
          true // p_force = true
        );
      } else if (promptState.articleId) {
        await addToList(promptState.articleId, promptState.quantity, true); // p_force = true
      }
      setPromptState((prev) => ({ ...prev, isOpen: false }));
      onItemAdded?.();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al actualizar artículo en la lista.');
      setPromptState((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setConfirmingPrompt(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Añadir a la lista">
        <div className="space-y-4 max-h-[75vh] flex flex-col">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loadingCategories ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-xs">Cargando...</p>
            </div>
          ) : categories.length === 0 ? (
            /* Estado sin categorías */
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
                <FolderPlus className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#1B1918]">
                No hay categorías creadas
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                Para añadir artículos a la lista necesitas al menos una categoría en el catálogo.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToCategories?.();
                }}
                className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B1918] hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Crear mi primera categoría</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* 1. Selector de Categorías (Pills / pestañas táctiles) */}
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Categoría
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                  {categories.map((cat) => {
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setSearchTerm('');
                        }}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#1B1918] text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Control de Cantidad (default 1) */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-xs font-medium text-neutral-700">
                  Cantidad a añadir:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Disminuir cantidad"
                    className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-[#1B1918]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Aumentar cantidad"
                    className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3. Input de búsqueda / creación al vuelo */}
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Buscar o nuevo artículo en ${selectedCategory?.name || ''}...`}
                  className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 bg-white text-[#1B1918] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                />
              </div>

              {/* Aviso si existe en otra categoría */}
              {globalMatch && !exactMatchInCurrent && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      «{globalMatch.article.name}» ya existe en «{globalMatch.categoryName}»
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      ¿Quieres usar ese artículo existente?
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddGlobalMatch(false)}
                    disabled={addingArticleId === globalMatch.article.id}
                    className="min-h-[44px] px-3.5 rounded-xl bg-[#1B1918] hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1 flex-shrink-0 transition-colors shadow-xs"
                  >
                    {addingArticleId === globalMatch.article.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Añadir</span>
                    )}
                  </button>
                </div>
              )}

              {/* Botón para crear sobre la marcha si no existe en ninguna parte */}
              {searchTerm.trim() && !exactMatchInCurrent && !globalMatch && !checkingGlobal && (
                <button
                  type="button"
                  onClick={(e) => handleCreateAndAdd(e, false)}
                  disabled={isCreatingAndAdding}
                  className="w-full min-h-[44px] p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 text-xs font-semibold flex items-center justify-between hover:bg-neutral-200 transition-colors"
                >
                  <span>Crear <strong>«{searchTerm.trim()}»</strong> y añadir a la lista</span>
                  {isCreatingAndAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
                  ) : (
                    <Plus className="w-4 h-4 text-neutral-700" />
                  )}
                </button>
              )}

              {/* 4. Lista de artículos existentes en la categoría */}
              <div className="flex-1 overflow-y-auto max-h-56 pr-1 space-y-1.5">
                {loadingArticles ? (
                  <div className="py-8 flex justify-center text-neutral-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : filteredArticles.length === 0 ? (
                  !searchTerm.trim() ? (
                    <div className="py-6 text-center text-neutral-400 text-xs">
                      No hay artículos en esta categoría aún.
                    </div>
                  ) : null
                ) : (
                  filteredArticles.map((art) => {
                    const isAdding = addingArticleId === art.id;
                    const isAdded = addedSuccessId === art.id;

                    return (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => handleAddExisting(art, false)}
                        disabled={isAdding}
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 flex items-center justify-between text-left transition-colors group"
                      >
                        <span className="text-xs font-semibold text-[#1B1918]">
                          {art.name}
                        </span>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 group-hover:text-black transition-colors">
                          {isAdding ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isAdded ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal F15: Confirmación de artículo ya existente (pending o purchased) */}
      <ArticleExistsPromptModal
        isOpen={promptState.isOpen}
        promptType={promptState.promptType}
        articleName={promptState.articleName}
        onConfirm={handleConfirmPrompt}
        onCancel={() => setPromptState((prev) => ({ ...prev, isOpen: false }))}
        loading={confirmingPrompt}
      />
    </>
  );
}

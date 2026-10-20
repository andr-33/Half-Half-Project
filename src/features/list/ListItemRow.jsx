import { Check, Plus, Minus, Trash2 } from 'lucide-react';

export default function ListItemRow({
  item,
  onTogglePurchased,
  onUpdateQuantity,
  onRemove,
  disabled = false,
}) {
  const isPurchased = item.purchased;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
        isPurchased
          ? 'bg-neutral-50/70 dark:bg-neutral-900/40 border-neutral-200/50 dark:border-neutral-800/60 opacity-60'
          : 'bg-white dark:bg-neutral-800/80 border-neutral-200/80 dark:border-neutral-700/60 shadow-xs'
      }`}
    >
      {/* 1. Botón de Marcar/Desmarcar y Nombre del Artículo */}
      <button
        type="button"
        onClick={() => onTogglePurchased(item)}
        disabled={disabled}
        className="flex items-center gap-3 flex-1 text-left min-h-[44px] pr-2 focus:outline-none"
        aria-label={
          isPurchased
            ? `Desmarcar ${item.articles?.name || 'artículo'} como comprado`
            : `Marcar ${item.articles?.name || 'artículo'} como comprado`
        }
      >
        {/* Checkbox circular táctil */}
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors flex-shrink-0 ${
            isPurchased
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
          }`}
        >
          {isPurchased && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>

        {/* Nombre del artículo */}
        <span
          className={`text-sm font-medium transition-colors ${
            isPurchased
              ? 'line-through text-neutral-400 dark:text-neutral-500'
              : 'text-neutral-900 dark:text-neutral-100'
          }`}
        >
          {item.articles?.name || 'Artículo'}
        </span>
      </button>

      {/* 2. Controles de cantidad (- / +) y Botón de quitar */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center rounded-xl bg-neutral-100 dark:bg-neutral-900/80 p-0.5 border border-neutral-200/60 dark:border-neutral-700/50">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item, item.quantity - 1)}
            disabled={disabled}
            aria-label={`Disminuir cantidad de ${item.articles?.name}`}
            className="w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="w-7 text-center text-xs font-bold text-neutral-900 dark:text-neutral-100">
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => onUpdateQuantity(item, item.quantity + 1)}
            disabled={disabled}
            aria-label={`Aumentar cantidad de ${item.articles?.name}`}
            className="w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Botón quitar de la lista */}
        <button
          type="button"
          onClick={() => onRemove(item)}
          disabled={disabled}
          aria-label={`Quitar ${item.articles?.name} de la lista`}
          className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

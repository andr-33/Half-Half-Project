import { Check, Plus, Minus, Trash2 } from 'lucide-react';
import { getMemberColor } from '../../lib/memberColors';

export default function ListItemRow({
  item,
  onTogglePurchased,
  onUpdateQuantity,
  onRemove,
  disabled = false,
}) {
  const isPurchased = item.purchased;
  const colorObj = getMemberColor(item.members?.color);
  const authorInitial = (item.members?.alias?.charAt(0) || '?').toUpperCase();

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-2xl transition-all shadow-xs ${
        isPurchased ? 'opacity-60' : 'opacity-100'
      }`}
      style={{
        backgroundColor: colorObj.soft,
        border: `2px solid ${colorObj.border}`,
      }}
    >
      {/* 1. Botón de Marcar/Desmarcar, Avatar de Autoría y Nombre del Artículo */}
      <button
        type="button"
        onClick={() => onTogglePurchased(item)}
        disabled={disabled}
        className="flex items-center gap-2.5 flex-1 text-left min-h-[44px] pr-2 focus:outline-none"
        aria-label={
          isPurchased
            ? `Desmarcar ${item.articles?.name || 'artículo'} como comprado`
            : `Marcar ${item.articles?.name || 'artículo'} como comprado`
        }
      >
        {/* Checkbox circular táctil */}
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
            isPurchased
              ? 'bg-[#1B1918] border-[#1B1918] text-white'
              : 'border-neutral-400 bg-white'
          }`}
        >
          {isPurchased && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>

        {/* Avatar de autoría (F14): Color intenso + inicial en mayúscula */}
        <div
          title={item.members?.alias ? `Añadido por ${item.members.alias}` : 'Autor sin identificar'}
          aria-label={item.members?.alias ? `Añadido por ${item.members.alias}` : 'Autor sin identificar'}
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs"
          style={{
            backgroundColor: colorObj.intense,
            color: '#1B1918',
            border: `1px solid ${colorObj.border}`,
          }}
        >
          {authorInitial}
        </div>

        {/* Nombre del artículo */}
        <span
          className={`text-sm font-semibold text-[#1B1918] transition-colors ${
            isPurchased ? 'line-through' : ''
          }`}
        >
          {item.articles?.name || 'Artículo'}
        </span>
      </button>

      {/* 2. Controles de cantidad (- / +) y Botón de quitar (Bloqueados si está comprado/tachado) */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className={`flex items-center rounded-xl bg-white/90 p-0.5 border border-neutral-300/80 shadow-2xs ${
          isPurchased ? 'opacity-40 pointer-events-none' : ''
        }`}>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item, item.quantity - 1)}
            disabled={disabled || isPurchased}
            aria-label={`Disminuir cantidad de ${item.articles?.name}`}
            className="w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-600 hover:text-black rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="w-7 text-center text-xs font-bold text-[#1B1918]">
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => onUpdateQuantity(item, item.quantity + 1)}
            disabled={disabled || isPurchased}
            aria-label={`Aumentar cantidad de ${item.articles?.name}`}
            className="w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-600 hover:text-black rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Botón quitar de la lista (Bloqueado si está comprado/tachado) */}
        <button
          type="button"
          onClick={() => onRemove(item)}
          disabled={disabled || isPurchased}
          aria-label={`Quitar ${item.articles?.name} de la lista`}
          className={`w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
            isPurchased
              ? 'opacity-20 cursor-not-allowed text-neutral-400'
              : 'text-neutral-400 hover:text-red-600 hover:bg-black/5'
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

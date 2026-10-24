import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getMembers,
  createMemberProfile,
  validateAlias,
  validateColor,
} from './membersService';
import { getCachedMembers } from '../../lib/storage';
import { MEMBER_COLORS, MEMBER_COLOR_KEYS, getMemberColor } from '../../lib/memberColors';
import { AlertCircle, Check, LogOut, Loader2 } from 'lucide-react';

export default function CreateProfileModal({ isOpen, onProfileCreated }) {
  const { signOut } = useAuth();
  const [alias, setAlias] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [usedColors, setUsedColors] = useState(() => {
    const cached = getCachedMembers();
    return cached ? cached.map((m) => m.color) : [];
  });
  const [loadingMembers, setLoadingMembers] = useState(() => !getCachedMembers());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadUsedColors = async () => {
    try {
      setLoadingMembers(true);
      const members = await getMembers();
      const taken = members.map((m) => m.color);
      setUsedColors(taken);

      // Si el color seleccionado ya está ocupado, deseleccionarlo
      setSelectedColor((current) => (taken.includes(current) ? '' : current));
    } catch (err) {
      console.error('Error al cargar miembros existentes:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsedColors();
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const aliasErr = validateAlias(alias);
    if (aliasErr) {
      setErrorMsg(aliasErr);
      return;
    }

    const colorErr = validateColor(selectedColor);
    if (colorErr) {
      setErrorMsg(colorErr);
      return;
    }

    setSaving(true);
    try {
      const newMember = await createMemberProfile(alias, selectedColor);
      onProfileCreated?.(newMember);
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear tu perfil.');
      // Refrescar colores por si hubo conflicto de concurrencia
      await loadUsedColors();
    } finally {
      setSaving(false);
    }
  };

  const activeColorObj = getMemberColor(selectedColor);
  const avatarLetter = alias.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-profile-title"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-neutral-200 overflow-hidden p-6">
        <div className="flex flex-col items-center mb-5 text-center">
          {/* Avatar Preview */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-sm mb-3 transition-all duration-200"
            style={{
              backgroundColor: selectedColor ? activeColorObj.intense : '#E4E4E7',
              color: '#1B1918',
              border: `2px solid ${selectedColor ? activeColorObj.border : '#D4D4D8'}`,
            }}
          >
            {avatarLetter}
          </div>

          <h2 id="create-profile-title" className="text-lg font-bold text-[#1B1918]">
            Configura tu Perfil
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Elige tu alias y color para que se distinga quién añade cada producto a la lista.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="profile-alias"
              className="block text-xs font-semibold text-neutral-700 mb-1"
            >
              Alias (1-10 caracteres)
            </label>
            <input
              id="profile-alias"
              type="text"
              required
              autoFocus
              maxLength={10}
              value={alias}
              onChange={(e) => {
                // Eliminar espacios de inmediato
                setAlias(e.target.value.replace(/\s+/g, ''));
              }}
              placeholder="Ej. Alex, María, Juan..."
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 bg-white text-[#1B1918] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Solo letras y números, sin espacios ni símbolos.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              Color de autoría (exclusivo para ti)
            </label>
            {loadingMembers ? (
              <div className="py-4 flex justify-center text-neutral-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2.5">
                {MEMBER_COLOR_KEYS.map((key) => {
                  const color = MEMBER_COLORS[key];
                  const isTaken = usedColors.includes(key);
                  const isSelected = selectedColor === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isTaken}
                      onClick={() => setSelectedColor(key)}
                      title={isTaken ? `${color.label} (no disponible)` : color.label}
                      aria-label={`Color ${color.label}${isTaken ? ' (no disponible)' : ''}`}
                      className={`relative h-11 w-full min-h-[44px] rounded-xl flex items-center justify-center transition-all overflow-hidden ${
                        isTaken
                          ? 'cursor-not-allowed'
                          : isSelected
                          ? 'ring-2 ring-offset-2 ring-[#1B1918] scale-105'
                          : 'hover:scale-102 active:scale-95'
                      }`}
                      style={{
                        backgroundColor: color.intense,
                        border: `1.5px solid ${color.border}`,
                      }}
                    >
                      {isSelected && !isTaken && (
                        <Check className="w-4 h-4 text-[#1B1918] stroke-[3]" />
                      )}
                      {isTaken && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[140%] h-[2px] bg-[#1B1918] -rotate-45" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={saving || !alias.trim() || !selectedColor}
              className="w-full h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1918] hover:bg-neutral-800 active:bg-black text-white font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {saving ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Guardar y comenzar'
              )}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full h-10 min-h-[44px] flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

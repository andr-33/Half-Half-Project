import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getMembers,
  updateMemberProfile,
  validateAlias,
  validateColor,
} from './membersService';
import { getCachedMembers } from '../../lib/storage';
import { MEMBER_COLORS, MEMBER_COLOR_KEYS, getMemberColor } from '../../lib/memberColors';
import {
  LogOut,
  Check,
  AlertCircle,
  Loader2,
  Users,
  Pencil,
  X,
} from 'lucide-react';

export default function ProfileView() {
  const { member, reloadMember, signOut } = useAuth();
  const [alias, setAlias] = useState(member?.alias || '');
  const [selectedColor, setSelectedColor] = useState(member?.color || '');
  const [isEditing, setIsEditing] = useState(false);
  const [allMembers, setAllMembers] = useState(() => getCachedMembers() || []);
  const [loadingMembers, setLoadingMembers] = useState(() => !getCachedMembers());
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  const fetchAllMembers = async () => {
    try {
      setLoadingMembers(true);
      const members = await getMembers();
      setAllMembers(members);
    } catch (err) {
      console.error('Error al cargar miembros:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchAllMembers();
  }, []);

  useEffect(() => {
    if (member) {
      setAlias(member.alias);
      setSelectedColor(member.color);
    }
  }, [member]);

  // Colores ocupados por otros miembros (excluyendo el mío actual)
  const colorsTakenByOthers = allMembers
    .filter((m) => m.id !== member?.id)
    .map((m) => m.color);

  const isDirty = alias.trim() !== member?.alias || selectedColor !== member?.color;

  const handleSave = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    const aliasErr = validateAlias(alias);
    if (aliasErr) {
      setStatusMsg({ type: 'error', text: aliasErr });
      return;
    }

    const colorErr = validateColor(selectedColor);
    if (colorErr) {
      setStatusMsg({ type: 'error', text: colorErr });
      return;
    }

    setSaving(true);
    try {
      await updateMemberProfile(member.id, alias, selectedColor);
      await reloadMember();
      await fetchAllMembers();
      setIsEditing(false);
      setStatusMsg({ type: 'success', text: 'Perfil actualizado con éxito.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al actualizar perfil.' });
      await fetchAllMembers();
    } finally {
      setSaving(false);
    }
  };

  const currentColorObj = getMemberColor(selectedColor);
  const avatarLetter = (alias.trim().charAt(0) || member?.alias?.charAt(0) || '?').toUpperCase();

  return (
    <div className="flex flex-col min-h-full">
      {/* Cabecera */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#1B1918]">Mi Perfil</h1>
          <p className="text-xs text-neutral-500">Configuración de identidad y miembros</p>
        </div>

        <button
          onClick={signOut}
          className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Mensaje de estado */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {statusMsg.type === 'success' && <Check className="w-4 h-4 flex-shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tarjeta de perfil con edición desplegable */}
        <section className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* Avatar actual */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-xs transition-all"
                style={{
                  backgroundColor: currentColorObj.intense,
                  color: '#1B1918',
                  border: `2px solid ${currentColorObj.border}`,
                }}
              >
                {avatarLetter}
              </div>

              <div>
                <p className="text-base font-bold text-[#1B1918]">{member?.alias}</p>
              </div>
            </div>

            {/* Botón desplegar edición */}
            <button
              type="button"
              onClick={() => {
                setIsEditing((prev) => !prev);
                setStatusMsg(null);
                if (isEditing) {
                  setAlias(member?.alias || '');
                  setSelectedColor(member?.color || '');
                }
              }}
              className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              {isEditing ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar perfil</span>
                </>
              )}
            </button>
          </div>

          {/* Formulario desplegable */}
          {isEditing && (
            <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-neutral-100 animate-in fade-in duration-150">
              <div>
                <label htmlFor="edit-alias" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Alias
                </label>
                <input
                  id="edit-alias"
                  type="text"
                  required
                  maxLength={10}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value.replace(/\s+/g, ''))}
                  className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 bg-white text-[#1B1918] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                />
                <p className="text-[11px] text-neutral-400 mt-1">1 a 10 letras o números, sin espacios.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2">
                  Color asignado
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {MEMBER_COLOR_KEYS.map((key) => {
                    const color = MEMBER_COLORS[key];
                    const isTaken = colorsTakenByOthers.includes(key);
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
                        {isSelected && !isTaken && <Check className="w-4 h-4 text-[#1B1918] stroke-[3]" />}
                        {isTaken && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[140%] h-[2px] bg-[#1B1918] -rotate-45" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !isDirty || !alias.trim()}
                className="w-full h-11 min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1918] hover:bg-neutral-800 active:bg-black text-white font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {saving ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </form>
          )}
        </section>

        {/* Sección de solo lectura: Miembros del hogar */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <Users className="w-4 h-4 text-neutral-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Miembros ({allMembers.length})
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden shadow-xs">
            {loadingMembers ? (
              <div className="py-8 flex justify-center text-neutral-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : allMembers.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-400">
                No hay miembros registrados aún.
              </div>
            ) : (
              allMembers.map((m) => {
                const c = getMemberColor(m.color);
                const isMe = m.id === member?.id;
                return (
                  <div key={m.id} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs"
                        style={{
                          backgroundColor: c.intense,
                          color: '#1B1918',
                          border: `1.5px solid ${c.border}`,
                        }}
                      >
                        {m.alias.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[#1B1918]">
                          {m.alias} {isMe && <span className="text-xs font-normal text-neutral-400">(Tú)</span>}
                        </span>
                        <p className="text-[11px] text-neutral-400">{c.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

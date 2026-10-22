import { ShoppingCart, Layers, User, WifiOff, LogOut } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../hooks/useAuth';
import { getMemberColor } from '../lib/memberColors';

export default function Layout({ activeTab, onTabChange, children }) {
  const isOnline = useOnlineStatus();
  const { member, signOut } = useAuth();
  const memberColor = member ? getMemberColor(member.color) : null;

  return (
    <div className="min-h-screen bg-neutral-100 text-[#1B1918] flex flex-col justify-between">
      {/* Contenedor centrado para experiencia móvil */}
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen bg-white shadow-sm relative">
        
        {/* Cabecera superior fija */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-[#1B1918]">Half &amp; Half</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador discreto de modo local sin conexión */}
            {!isOnline && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-medium"
                role="status"
                aria-live="polite"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>Modo local</span>
              </div>
            )}

            {/* Avatar del miembro actual con acceso directo a perfil */}
            {member && (
              <button
                onClick={() => onTabChange('profile')}
                title={`Perfil de ${member.alias}`}
                aria-label={`Perfil de ${member.alias}`}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-transform active:scale-95"
                style={{
                  backgroundColor: memberColor.intense,
                  color: '#1B1918',
                  border: `1.5px solid ${memberColor.border}`,
                }}
              >
                {member.alias.charAt(0).toUpperCase()}
              </button>
            )}

            <button
              onClick={signOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Contenido principal con padding inferior para no tapar el bottom nav */}
        <main className="flex-1 pb-20 overflow-y-auto">
          {children}
        </main>

        {/* Barra de navegación inferior de 3 pestañas: Lista, Catálogo, Perfil */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-neutral-200"
          aria-label="Navegación principal"
        >
          <div className="w-full max-w-md mx-auto grid grid-cols-3 px-2 py-1">
            <button
              type="button"
              onClick={() => onTabChange('list')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'list'
                  ? 'text-[#1B1918]'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
              aria-current={activeTab === 'list' ? 'page' : undefined}
            >
              <ShoppingCart className={`w-5 h-5 ${activeTab === 'list' ? 'stroke-[2.5]' : ''}`} />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('catalog')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'catalog'
                  ? 'text-[#1B1918]'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
              aria-current={activeTab === 'catalog' ? 'page' : undefined}
            >
              <Layers className={`w-5 h-5 ${activeTab === 'catalog' ? 'stroke-[2.5]' : ''}`} />
              <span>Catálogo</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('profile')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'profile'
                  ? 'text-[#1B1918]'
                  : 'text-neutral-400 hover:text-neutral-700'
              }`}
              aria-current={activeTab === 'profile' ? 'page' : undefined}
            >
              <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : ''}`} />
              <span>Perfil</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}

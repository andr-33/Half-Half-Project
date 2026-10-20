import { ShoppingCart, Layers, WifiOff, LogOut } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ activeTab, onTabChange, children }) {
  const isOnline = useOnlineStatus();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between">
      {/* Contenedor centrado para experiencia móvil */}
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen bg-white dark:bg-neutral-900 shadow-sm relative">
        
        {/* Cabecera superior fija */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="font-semibold text-base tracking-tight">Half &amp; Half</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador discreto de modo local sin conexión */}
            {!isOnline && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-medium"
                role="status"
                aria-live="polite"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>Modo local</span>
              </div>
            )}

            <button
              onClick={signOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Contenido principal con padding inferior para no tapar el bottom nav */}
        <main className="flex-1 pb-20 overflow-y-auto">
          {children}
        </main>

        {/* Barra de navegación inferior de 2 pestañas */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800"
          aria-label="Navegación principal"
        >
          <div className="w-full max-w-md mx-auto grid grid-cols-2 px-2 py-1">
            <button
              type="button"
              onClick={() => onTabChange('list')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'list'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              aria-current={activeTab === 'list' ? 'page' : undefined}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('catalog')}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'catalog'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              aria-current={activeTab === 'catalog' ? 'page' : undefined}
            >
              <Layers className="w-5 h-5" />
              <span>Catálogo</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}

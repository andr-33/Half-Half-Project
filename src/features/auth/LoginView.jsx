import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ShoppingCart, LogIn, AlertCircle, Wifi } from 'lucide-react';

export default function LoginView() {
  const { signIn, isConfigured, nfcError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Por favor introduce email y contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayedError = nfcError || errorMsg;

  return (
    <div className="min-h-screen bg-neutral-100 text-[#1B1918] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-[#1B1918] flex items-center justify-center mb-3">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1B1918]">Half &amp; Half</h1>
          <p className="text-xs text-neutral-500 mt-1 text-center">
            Inicia sesión con tu cuenta o acerca tu tag NFC
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Variables de entorno pendientes</p>
              <p className="mt-0.5">
                Copia <code className="font-mono">.env.example</code> a <code className="font-mono">.env</code> y añade tus credenciales de Supabase.
              </p>
            </div>
          </div>
        )}

        {displayedError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{displayedError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-neutral-700 mb-1"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 bg-white text-[#1B1918] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-neutral-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 bg-white text-[#1B1918] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !isConfigured}
            className="w-full h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#1B1918] hover:bg-neutral-800 active:bg-black text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {submitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Wifi className="w-3.5 h-3.5 rotate-90" />
          <span>Compatible con acceso rápido por Tag NFC</span>
        </div>
      </div>
    </div>
  );
}

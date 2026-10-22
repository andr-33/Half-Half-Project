import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getCurrentMember, loginWithNfcKey } from '../features/profile/membersService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMember, setLoadingMember] = useState(false);
  const [nfcError, setNfcError] = useState('');

  // Carga o refresca el miembro del usuario autenticado
  const reloadMember = useCallback(async () => {
    try {
      setLoadingMember(true);
      const data = await getCurrentMember();
      setMember(data);
      return data;
    } catch (err) {
      console.error('Error al cargar perfil de miembro:', err);
      return null;
    } finally {
      setLoadingMember(false);
    }
  }, []);

  // 1. Detectar tag NFC (#k=...) y autenticación inicial
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const checkNfcAndSession = async () => {
      // Comprobar si la URL contiene clave NFC en el fragmento (#k=...)
      const hash = window.location.hash;
      let nfcKey = null;

      if (hash && hash.startsWith('#k=')) {
        nfcKey = hash.substring(3);
        // Borrar de inmediato el fragmento para que la clave no quede expuesta
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      if (nfcKey) {
        try {
          setLoading(true);
          setNfcError('');
          await loginWithNfcKey(nfcKey);
          // La sesión se actualizará mediante onAuthStateChange
        } catch (err) {
          console.error('Fallo en login NFC:', err);
          setNfcError('Esta tag ya no es válida');
        }
      }

      // Obtener sesión actual (o la recién creada por NFC)
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      if (initialSession) {
        await reloadMember();
      }
      setLoading(false);
    };

    checkNfcAndSession();

    // 2. Suscribirse a cambios de sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        await reloadMember();
      } else {
        setMember(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [reloadMember]);

  // 3. Suscripción Realtime a cambios en members para reflejar actualizaciones de perfil
  useEffect(() => {
    if (!session?.user?.id || !supabase) return;

    const channel = supabase
      .channel('public:members_current_user')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        (payload) => {
          if (payload.new && payload.new.user_id === session.user.id) {
            setMember(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Revisa tu archivo .env');
    }
    setNfcError('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) return;
    setMember(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        member,
        loading,
        loadingMember,
        isConfigured: isSupabaseConfigured,
        nfcError,
        clearNfcError: () => setNfcError(''),
        reloadMember,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

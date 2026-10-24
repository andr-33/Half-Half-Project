import { supabase } from '../../lib/supabaseClient';
import { MEMBER_COLOR_KEYS } from '../../lib/memberColors';
import { saveCachedMembers, getCachedMembers } from '../../lib/storage';
import { isNetworkError, OFFLINE_WRITE_ERROR } from '../../lib/networkUtils';

export const ALIAS_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]{1,10}$/;

export function validateAlias(alias) {
  if (!alias || typeof alias !== 'string') {
    return 'El alias no puede estar vacío.';
  }
  const trimmed = alias.trim();
  if (trimmed.length < 1 || trimmed.length > 10) {
    return 'El alias debe tener entre 1 y 10 caracteres.';
  }
  if (!ALIAS_REGEX.test(trimmed)) {
    return 'Solo se permiten letras y números sin espacios ni símbolos.';
  }
  return null;
}

export function validateColor(color) {
  if (!color || !MEMBER_COLOR_KEYS.includes(color)) {
    return 'Por favor selecciona un color válido de la lista.';
  }
  return null;
}

export async function getCurrentMember() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMembers() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (data) {
      saveCachedMembers(data);
    }
    return data || [];
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = getCachedMembers();
      if (cached) return cached;
    }
    throw err;
  }
}

export async function createMemberProfile(alias, color) {
  if (!navigator.onLine) {
    throw new Error(OFFLINE_WRITE_ERROR);
  }

  const aliasErr = validateAlias(alias);
  if (aliasErr) throw new Error(aliasErr);

  const colorErr = validateColor(color);
  if (colorErr) throw new Error(colorErr);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión de usuario activa.');

  const cleanAlias = alias.trim();

  const { data, error } = await supabase
    .from('members')
    .insert([
      {
        user_id: user.id,
        alias: cleanAlias,
        color,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      if (error.message?.includes('color') || error.details?.includes('color')) {
        throw new Error('Ese color acaba de ser elegido');
      }
      throw new Error('Ya existe un perfil para este usuario.');
    }
    throw error;
  }

  return data;
}

export async function updateMemberProfile(memberId, alias, color) {
  if (!navigator.onLine) {
    throw new Error(OFFLINE_WRITE_ERROR);
  }

  const aliasErr = validateAlias(alias);
  if (aliasErr) throw new Error(aliasErr);

  const colorErr = validateColor(color);
  if (colorErr) throw new Error(colorErr);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión de usuario activa.');

  const cleanAlias = alias.trim();

  const { data, error } = await supabase
    .from('members')
    .update({
      alias: cleanAlias,
      color,
    })
    .eq('id', memberId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ese color acaba de ser elegido');
    }
    throw error;
  }

  return data;
}

/**
 * Autentica al miembro mediante la clave secreta leída del tag NFC.
 * Invoca la Edge Function `nfc-login` y verifica el token OTP devuelto.
 *
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function loginWithNfcKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Esta tag ya no es válida');
  }

  const { data, error } = await supabase.functions.invoke('nfc-login', {
    body: { key: key.trim() },
  });

  if (error || !data?.token_hash) {
    throw new Error('Esta tag ya no es válida');
  }

  // Verificar el token hash devuelto para establecer la sesión del miembro
  const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: 'magiclink',
  });

  if (verifyError) {
    throw new Error('Esta tag ya no es válida');
  }

  return authData;
}

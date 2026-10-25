import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Limitador de intentos fallidos simple en memoria (resetea cada 5 minutos)
const failedAttempts = new Map<string, { count: number; expiresAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) return false;
  if (now > record.expiresAt) {
    failedAttempts.delete(ip);
    return false;
  }
  return record.count >= 5;
}

function registerFailedAttempt(ip: string) {
  const now = Date.now();
  const record = failedAttempts.get(ip) || { count: 0, expiresAt: now + 5 * 60 * 1000 };
  record.count += 1;
  failedAttempts.set(ip, record);
}

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for") || "unknown-ip";

  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { key } = await req.json();

    if (!key || typeof key !== "string" || key.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Clave no proporcionada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Calcular hash SHA-256 de la clave recibida
    const msgBuffer = new TextEncoder().encode(key.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // 2. Conectar a Supabase con Service Role (bypass de RLS para consultar member_keys)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Error de configuración interna del servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 3. Buscar la key y obtener directamente el user_id de la cuenta
    const { data: memberKey, error: keyError } = await supabaseAdmin
      .from("member_keys")
      .select("user_id")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError || !memberKey?.user_id) {
      registerFailedAttempt(clientIp);
      // Respuesta 401 genérica sin detalles como exige la especificación
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = memberKey.user_id;

    // 4. Obtener el email del usuario para generar el link/token de autenticación
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      registerFailedAttempt(clientIp);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Generar magiclink de autenticación y devolver token_hash al cliente
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Error al generar enlace de autenticación:", linkError);
      return new Response(
        JSON.stringify({ error: "No se pudo generar la sesión para el miembro" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Éxito: devolver token_hash y email para que el cliente valide mediante verifyOtp
    return new Response(
      JSON.stringify({
        token_hash: linkData.properties.hashed_token,
        email: userData.user.email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error inesperado en nfc-login:", err);
    return new Response(
      JSON.stringify({ error: "Error en el procesamiento de la petición" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

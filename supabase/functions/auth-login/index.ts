import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Simple hash function using Web Crypto API (SHA-256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { login, password } = await req.json();

    if (!login || !password) {
      return new Response(
        JSON.stringify({ error: "Login et mot de passe requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("login", login)
      .eq("is_active", true)
      .maybeSingle();

    if (employeeError || !employee) {
      return new Response(
        JSON.stringify({ error: "Login ou mot de passe incorrect" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Hash the provided password and compare with stored hash
    const passwordHash = await hashPassword(password);
    if (passwordHash !== employee.password_hash) {
      return new Response(
        JSON.stringify({ error: "Login ou mot de passe incorrect" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    const { error: sessionError } = await supabase
      .from("user_sessions")
      .insert({
        employee_id: employee.id,
        token: token,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      return new Response(
        JSON.stringify({ error: "Session creation error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    await supabase
      .from("user_action_logs")
      .insert({
        employee_id: employee.id,
        action_type: "login",
        module: "auth",
        details: { login: login },
        ip_address: clientIP,
      });

    const { data: roleData } = await supabase
      .from("roles")
      .select("*")
      .eq("id", employee.role_id)
      .maybeSingle();

    const userData = {
      id: employee.id,
      login: employee.login,
      full_name: employee.full_name,
      role: employee.role,
      role_id: employee.role_id,
      email: employee.email,
      personal_offer_limit: employee.personal_offer_limit,
      allowed_product_families: employee.allowed_product_families,
      points_of_sale: employee.points_of_sale,
      roles: roleData,
    };

    return new Response(
      JSON.stringify({ user: userData, token: token }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

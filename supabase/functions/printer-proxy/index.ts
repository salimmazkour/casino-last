import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Récupérer l'URL du service d'impression depuis les headers
    const printerServiceUrl = req.headers.get('X-Printer-Service-URL') || 'http://localhost:3001';

    let targetUrl = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'printers':
        targetUrl = `${printerServiceUrl}/api/printers`;
        break;
      case 'mapping':
        targetUrl = `${printerServiceUrl}/mapping`;
        break;
      case 'health':
        targetUrl = `${printerServiceUrl}/health`;
        break;
      case 'print':
        targetUrl = `${printerServiceUrl}/print`;
        method = 'POST';
        body = await req.text();
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Action non valide. Utilisez: printers, mapping, health, ou print' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // Faire la requête vers le service local
    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Supabase-Edge-Function',
      },
      body,
    });

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Erreur proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur de connexion au service d\'impression',
        details: error.message 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
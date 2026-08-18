export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
        status: 204
      });
    }

    const ipAddress = request.headers.get("cf-connecting-ip") || "unknown-ip";

    // Rate Limiting
    const { success } = await env.RATE_LIMITER.limit({ key: ipAddress });
    if (!success) {
      return new Response(JSON.stringify({ error: "Daily scan limit reached. Come back tomorrow!" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Pass through to Supabase
    // We expect the client to send the request exactly as they would to Supabase
    const supabaseUrl = `${env.SUPABASE_URL}/functions/v1/scan-ingredients`;
    
    // Create new request based on the incoming one
    const newRequest = new Request(supabaseUrl, new Request(request));

    try {
      const response = await fetch(newRequest);
      
      // Clone response to add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      
      return newResponse;
    } catch (err) {
      return new Response(JSON.stringify({ error: `Gateway Error: ${err.message}` }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};

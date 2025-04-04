// Cloudflare Function to handle CORS preflight requests
export async function onRequest(context) {
  // Extract the request from the context
  const { request } = context;

  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Handle actual requests by passing through
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);
  
  // Add CORS headers to the response
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-info, apikey");
  
  return newResponse;
} 
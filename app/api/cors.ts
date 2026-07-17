const allowedOrigins = new Set([
  "https://ncheewee.github.io",
  "https://rentalguru-sg.ncheewee.chatgpt.site",
  "http://localhost:3000",
  "http://localhost:4173",
]);

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://ncheewee.github.io";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function optionsResponse(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

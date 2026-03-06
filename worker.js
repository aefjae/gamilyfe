/**
 * GAMESCEND — Cloudflare Worker API Proxy
 *
 * Stores ANTHROPIC_API_KEY as a Worker secret (never exposed to the browser).
 * Only accepts requests from your GitHub Pages domain.
 *
 * Setup:
 *   1. wrangler secret put ANTHROPIC_API_KEY
 *   2. Set ALLOWED_ORIGIN below to your GitHub Pages URL
 *   3. wrangler deploy
 */

const ALLOWED_ORIGIN = 'https://aefjae.github.io';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const originAllowed = origin === ALLOWED_ORIGIN || origin.startsWith(ALLOWED_ORIGIN + '/');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (!originAllowed) return new Response('Forbidden', { status: 403 });
      return new Response(null, {
        status: 204,
        headers: cors(origin),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!originAllowed) {
      return new Response('Forbidden', { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'content-type': 'application/json',
        ...cors(origin),
      },
    });
  },
};

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

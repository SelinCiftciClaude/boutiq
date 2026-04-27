import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { handle } = await req.json();
    if (!handle) return new Response(JSON.stringify({ error: 'handle required' }), { status: 400, headers: corsHeaders });
    const slug = handle.replace('@', '').trim();
    const res = await fetch(`https://www.instagram.com/${slug}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    const html = await res.text();
    const getMetaContent = (property: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
        ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
      return match?.[1] ?? null;
    };
    const name = getMetaContent('og:title')?.split(' \(@')[0]?.trim() ?? slug;
    const description = getMetaContent('og:description')?.trim() ?? null;
    const image = getMetaContent('og:image') ?? null;
    return new Response(JSON.stringify({ name, description, image, handle: slug, website: `https://www.instagram.com/${slug}/` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

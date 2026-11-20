import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawSetNumber = String(body?.setNumber || '').trim();
    const cleanNumber = rawSetNumber.replace(/-1$/, '');

    if (!cleanNumber) {
      return jsonResponse({ official_price: null, source: null });
    }

    const bricksetKey = Deno.env.get('BRICKSET_API_KEY');
    if (bricksetKey) {
      const params = new URLSearchParams({
        apiKey: bricksetKey,
        userHash: '',
        params: JSON.stringify({ setNumber: `${cleanNumber}-1` }),
      });

      const res = await fetch(
        `https://brickset.com/api/v3.asmx/getSets?${params.toString()}`
      );

      if (res.ok) {
        const json = await res.json();
        const firstSet = json?.sets?.[0];
        const price =
          firstSet?.LEGOCom?.FR?.retailPrice ??
          firstSet?.LEGOCom?.DE?.retailPrice ??
          firstSet?.LEGOCom?.BE?.retailPrice ??
          firstSet?.LEGOCom?.UK?.retailPrice ??
          null;

        const numericPrice = price !== null && price !== undefined ? Number(price) : NaN;
        if (!Number.isNaN(numericPrice) && numericPrice > 0) {
          return jsonResponse({
            official_price: numericPrice,
            source: 'brickset',
          });
        }
      }
    }

    return jsonResponse({ official_price: null, source: null });
  } catch {
    return jsonResponse({ official_price: null, source: null });
  }
});
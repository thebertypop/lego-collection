import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchedOffer {
  merchant_name: string;
  price: number;
  shipping_price: number;
  condition: string;
  url: string | null;
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function parseEuroPrice(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return !Number.isNaN(raw) && raw > 5 && raw <= 5000 ? Number(raw.toFixed(2)) : null;
  }

  const cleaned = String(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/[^\d,.\s]/g, '')
    .trim()
    .replace(/\s+/g, '');

  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  const val = Number(normalized);
  if (Number.isNaN(val) || val <= 5 || val > 5000) return null;
  return Number(val.toFixed(2));
}

function extractPriceFromHtml(html: string, setNum: string): number | null {
  // 1. JSON-LD Offer
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length > 0) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;
        if (node.offers) {
          const offersArr = Array.isArray(node.offers) ? node.offers : [node.offers];
          for (const off of offersArr) {
            const p = parseEuroPrice(off?.price);
            if (p !== null) return p;
          }
        }
        for (const v of Object.values(node)) {
          if (v && typeof v === 'object') queue.push(v);
        }
      }
    } catch {
      // JSON-LD ignoré
    }
  }

  // 2. Meta tags prix
  const metaPatterns = [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:data1["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of metaPatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const p = parseEuroPrice(m[1]);
      if (p !== null) return p;
    }
  }

  // 3. Prix proche de la référence du set
  const idx = html.indexOf(setNum);
  const windowText =
    idx !== -1 ? html.slice(Math.max(0, idx - 1500), idx + 3500) : html.slice(0, 6000);
  const priceMatches = [...windowText.matchAll(/(\d{1,3}(?:[\s\u00a0]?\d{3})*(?:[.,]\d{2}))\s*€/g)];
  for (const pm of priceMatches) {
    const p = parseEuroPrice(pm[1]);
    if (p !== null) return p;
  }

  return null;
}

async function fetchFromBrickset(setNumWithSuffix: string): Promise<{
  officialPrice: number | null;
  bricksetUrl: string | null;
}> {
  const apiKey = Deno.env.get('BRICKSET_API_KEY');
  if (!apiKey) return { officialPrice: null, bricksetUrl: null };

  const userHash = Deno.env.get('BRICKSET_USER_HASH') || '';
  const params = JSON.stringify({
    setNumber: setNumWithSuffix,
  });

  const url = `https://brickset.com/api/v3.asmx/getSets?apiKey=${encodeURIComponent(
    apiKey
  )}&userHash=${encodeURIComponent(userHash)}&params=${encodeURIComponent(params)}`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { officialPrice: null, bricksetUrl: null };

  const data = await res.json();
  const firstSet = data?.sets?.[0];
  if (!firstSet) return { officialPrice: null, bricksetUrl: null };

  const retailPrice =
    parseEuroPrice(firstSet?.LEGOCom?.FR?.retailPrice) ??
    parseEuroPrice(firstSet?.LEGOCom?.DE?.retailPrice) ??
    parseEuroPrice(firstSet?.LEGOCom?.US?.retailPrice) ??
    null;

  return {
    officialPrice: retailPrice,
    bricksetUrl: firstSet?.bricksetURL || null,
  };
}

async function tryDirectScrape(
  merchantName: string,
  urls: string[],
  setNum: string,
  shippingPrice: number
): Promise<FetchedOffer | null> {
  for (const targetUrl of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      const res = await fetch(targetUrl, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const html = await res.text();
      const price = extractPriceFromHtml(html, setNum);
      if (price !== null) {
        return {
          merchant_name: merchantName,
          price,
          shipping_price: shippingPrice,
          condition: 'Neuf',
          url: res.url || targetUrl,
        };
      }
    } catch {
      // Ignore les erreurs réseau/timeout
    }
  }
  return null;
}

async function tryApifyFallback(
  merchantName: string,
  targetUrl: string,
  setNum: string,
  shippingPrice: number
): Promise<FetchedOffer | null> {
  const token = Deno.env.get('APIFY_TOKEN');
  const actorId = Deno.env.get('APIFY_ACTOR_ID');
  if (!token || !actorId) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(
        actorId
      )}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: targetUrl }],
          maxCrawledRequestsPerCrawl: 1,
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (!runRes.ok) return null;
    const items = await runRes.json();
    if (!Array.isArray(items) || items.length === 0) return null;

    for (const row of items) {
      const directCandidate =
        parseEuroPrice(row?.price) ??
        parseEuroPrice(row?.currentPrice) ??
        parseEuroPrice(row?.offerPrice);
      if (directCandidate !== null) {
        return {
          merchant_name: merchantName,
          price: directCandidate,
          shipping_price: shippingPrice,
          condition: 'Neuf',
          url: row?.url || targetUrl,
        };
      }

      const rawHtmlOrText =
        typeof row?.html === 'string'
          ? row.html
          : typeof row?.text === 'string'
          ? row.text
          : '';
      if (rawHtmlOrText) {
        const extracted = extractPriceFromHtml(rawHtmlOrText, setNum);
        if (extracted !== null) {
          return {
            merchant_name: merchantName,
            price: extracted,
            shipping_price: shippingPrice,
            condition: 'Neuf',
            url: row?.url || targetUrl,
          };
        }
      }
    }
  } catch {
    // Fallback silencieux si Apify échoue ou dépasse le délai
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { setId, legoSetNumber, officialPrice } = await req.json();

    if (!setId || !legoSetNumber) {
      return new Response(
        JSON.stringify({ error: 'setId et legoSetNumber sont requis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawSetNum = String(legoSetNumber).trim();
    const cleanSetNum = rawSetNum.split('-')[0];
    const setNumWithSuffix = rawSetNum.includes('-') ? rawSetNum : `${cleanSetNum}-1`;

    // 1. Données de référence Brickset
    const bricksetInfo = await fetchFromBrickset(setNumWithSuffix);
    const resolvedOfficialPrice =
      parseEuroPrice(officialPrice) ?? bricksetInfo.officialPrice ?? null;

    if (resolvedOfficialPrice !== null) {
      await supabase
        .from('sets')
        .update({ official_price: resolvedOfficialPrice })
        .eq('id', setId);
    }

    // 2. Cibles marchandes directes (sans page de recherche)
    const merchantTargets: {
      name: string;
      urls: string[];
      shipping: number;
      useApifyIfBlocked?: boolean;
    }[] = [
      {
        name: 'BrickShop.eu',
        urls: [`https://www.brickshop.eu/lego/lego-${cleanSetNum}.html`],
        shipping: 4.95,
      },
      {
        name: 'Galaxus',
        urls: [`https://www.galaxus.fr/fr/product/${cleanSetNum}`],
        shipping: 0,
      },
      {
        name: 'Amazon',
        urls: [`https://www.amazon.fr/dp/${cleanSetNum}`],
        shipping: 0,
        useApifyIfBlocked: true,
      },
      {
        name: 'E.Leclerc',
        urls: [`https://www.e.leclerc/fp/lego-${cleanSetNum}`],
        shipping: 0,
      },
    ];

    const fetchedOffers: FetchedOffer[] = [];
    const unavailableMerchants: string[] = [];

    for (const target of merchantTargets) {
      let found = await tryDirectScrape(
        target.name,
        target.urls,
        cleanSetNum,
        target.shipping
      );

      if (!found && target.useApifyIfBlocked) {
        found = await tryApifyFallback(
          target.name,
          target.urls[0],
          cleanSetNum,
          target.shipping
        );
      }

      if (found) {
        fetchedOffers.push(found);
      } else {
        unavailableMerchants.push(target.name);
      }
    }

    // 3. Remplacer les anciennes offres automatiques non-manuelles de l'utilisateur
    await supabase
      .from('set_price_offers')
      .delete()
      .eq('set_id', setId)
      .eq('user_id', user.id)
      .eq('is_manual', false);

    if (fetchedOffers.length > 0) {
      const { error: insertErr } = await supabase.from('set_price_offers').insert(
        fetchedOffers.map((o) => ({
          user_id: user.id,
          set_id: setId,
          merchant_name: o.merchant_name,
          price: o.price,
          shipping_price: o.shipping_price,
          condition: o.condition,
          url: o.url,
          is_manual: false,
        }))
      );
      if (insertErr) throw insertErr;
    }

    // 4. Mettre à jour l'historique des prix
    const { data: allOffers } = await supabase
      .from('set_price_offers')
      .select('*')
      .eq('set_id', setId)
      .eq('user_id', user.id);

    const priceCandidates: number[] = [];
    const shipCandidates: number[] = [];

    for (const row of allOffers || []) {
      const p = Number(row.price);
      const s = Number(row.shipping_price || 0);
      if (!Number.isNaN(p) && p > 0) {
        priceCandidates.push(p);
        shipCandidates.push(p + (Number.isNaN(s) ? 0 : s));
      }
    }

    if (resolvedOfficialPrice !== null && resolvedOfficialPrice > 0) {
      priceCandidates.push(resolvedOfficialPrice);
      shipCandidates.push(resolvedOfficialPrice);
    }

    if (priceCandidates.length > 0) {
      await supabase.from('set_price_history').insert({
        set_id: setId,
        lowest_price: Math.min(...priceCandidates),
        lowest_price_with_shipping: Math.min(...shipCandidates),
      });
    }

    return new Response(
      JSON.stringify({
        offers: allOffers || [],
        fetchedCount: fetchedOffers.length,
        unavailableMerchants,
        officialPrice: resolvedOfficialPrice,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur lors de la récupération des prix.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
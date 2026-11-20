import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dictionnaire de termes courants LEGO pour affiner la traduction
const LEGO_TERMS_FR: Record<string, string> = {
  'Castle': 'Château',
  'Spaceship': 'Vaisseau spatial',
  'Fire Station': 'Caserne de pompiers',
  'Police Station': 'Commissariat de police',
  'Batmobile': 'Batmobile',
  'Millennium Falcon': 'Faucon Millenium',
  'Death Star': 'Étoile de la Mort',
  'Tower': 'Tour',
  'Temple': 'Temple',
  'Dragon': 'Dragon',
  'Knight': 'Chevalier',
  'Pirate Ship': 'Bateau pirate',
  'House': 'Maison',
  'Car': 'Voiture',
  'Truck': 'Camion',
  'Train': 'Train',
  'Battle': 'Bataille',
  'Attack': 'Attaque',
  'Rescue': 'Sauvetage',
  'Mystery Machine': 'La Mystery Machine',
  'Haunted Mansion': 'Manoir hanté',
};

async function translateSetNameToFrench(englishName: string): Promise<string> {
  try {
    // Appel gratuit à l'API MyMemory ou DeepL si configuré en secret
    const deeplKey = Deno.env.get('DEEPL_API_KEY');
    if (deeplKey) {
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${deeplKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [englishName],
          source_lang: 'EN',
          target_lang: 'FR',
        }),
      });
      const data = await res.json();
      if (data.translations?.[0]?.text) return data.translations[0].text;
    }

    // Fallback gratuit (MyMemory API)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishName)}&langpair=en|fr`;
    const response = await fetch(url);
    const data = await response.json();
    let translated = data?.responseData?.translatedText || englishName;

    // Nettoyage des majuscules/termes spécifiques
    Object.entries(LEGO_TERMS_FR).forEach(([en, fr]) => {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      translated = translated.replace(regex, fr);
    });

    return translated;
  } catch {
    return englishName;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const REBRICKABLE_API_KEY = Deno.env.get('REBRICKABLE_API_KEY');
    if (!REBRICKABLE_API_KEY) {
      throw new Error('Clé API Rebrickable manquante côté serveur.');
    }

    const { query, type = 'search' } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Si l'utilisateur tape un numéro sans "-1" (ex: "76178"), on interroge la recherche globale ou directe
    const cleanQuery = query.trim();
    const endpoint = `https://rebrickable.com/api/v3/lego/sets/?search=${encodeURIComponent(cleanQuery)}&page_size=15&ordering=-year`;

    const rbResponse = await fetch(endpoint, {
      headers: {
        'Authorization': `key ${REBRICKABLE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!rbResponse.ok) {
      throw new Error(`Erreur Rebrickable (${rbResponse.status})`);
    }

    const rbData = await rbResponse.json();

    // Récupération des thèmes en parallèle pour enrichir les résultats
    const enrichedResults = await Promise.all(
      (rbData.results || []).map(async (item: any) => {
        const cleanSetNum = item.set_num.replace(/-1$/, '');
        const nameFr = await translateSetNameToFrench(item.name);

        // Récupération du nom du thème
        let themeName = '';
        if (item.theme_id) {
          const themeRes = await fetch(`https://rebrickable.com/api/v3/lego/themes/${item.theme_id}/`, {
            headers: { 'Authorization': `key ${REBRICKABLE_API_KEY}` },
          });
          if (themeRes.ok) {
            const themeJson = await themeRes.json();
            themeName = themeJson.name;
          }
        }

        return {
          lego_set_number: cleanSetNum,
          full_set_num: item.set_num,
          name: item.name,
          name_fr: nameFr,
          year: item.year,
          pieces_count: item.num_parts,
          image_url: item.set_img_url,
          theme: themeName,
          rebrickable_url: item.set_url,
          external_url: `https://www.lego.com/fr-fr/product/${cleanSetNum}`,
        };
      })
    );

    return new Response(JSON.stringify({ results: enrichedResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
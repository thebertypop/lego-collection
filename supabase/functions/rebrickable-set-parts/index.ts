import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InventoryPartItem {
  id: string;
  part_num: string;
  name: string;
  color_id: number;
  color_name: string;
  color_rgb: string | null;
  quantity: number;
  image_url: string | null;
  category: 'PART' | 'MINIFIG' | 'DECAL';
  is_spare: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { setId, legoSetNumber, forceRefresh = false } = await req.json();

    if (!legoSetNumber) {
      return new Response(
        JSON.stringify({ error: 'Numéro du set LEGO manquant.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const rebrickableApiKey = Deno.env.get('REBRICKABLE_API_KEY');

    if (!rebrickableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Clé REBRICKABLE_API_KEY manquante dans les secrets Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Vérifier le cache en base si non forcé
    if (setId && !forceRefresh) {
      const { data: cachedSet } = await supabase
        .from('sets')
        .select('inventory_data')
        .eq('id', setId)
        .single();

      if (cachedSet?.inventory_data && Array.isArray(cachedSet.inventory_data) && cachedSet.inventory_data.length > 0) {
        return new Response(
          JSON.stringify({ items: cachedSet.inventory_data, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const cleanSetNum = String(legoSetNumber).trim().includes('-')
      ? String(legoSetNumber).trim()
      : `${String(legoSetNumber).trim()}-1`;

    const headers = {
      Authorization: `key ${rebrickableApiKey}`,
      Accept: 'application/json',
    };

    const items: InventoryPartItem[] = [];

    // 2. Récupérer les pièces (dont les stickers/decals)
    let nextPartsUrl: string | null =
      `https://rebrickable.com/api/v3/lego/sets/${encodeURIComponent(cleanSetNum)}/parts/?page_size=500&inc_part_details=1`;

    while (nextPartsUrl) {
      const partsRes = await fetch(nextPartsUrl, { headers });
      if (!partsRes.ok) {
        if (partsRes.status === 404) {
          return new Response(
            JSON.stringify({ error: `Inventaire introuvable sur Rebrickable pour le set #${cleanSetNum}.` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Erreur Rebrickable parts (${partsRes.status})`);
      }

      const partsJson = await partsRes.json();
      for (const row of partsJson.results || []) {
        if (row.is_spare) continue;
        const partName: string = row.part?.name || row.part?.part_num || 'Pièce';
        const isDecal =
          row.part?.part_cat_id === 58 ||
          /sticker|decal/i.test(partName);

        items.push({
          id: `part-${row.part?.part_num}-${row.color?.id ?? 0}`,
          part_num: row.part?.part_num || '',
          name: partName,
          color_id: row.color?.id ?? 0,
          color_name: row.color?.name || '',
          color_rgb: row.color?.rgb ? `#${row.color.rgb}` : null,
          quantity: Number(row.quantity || 1),
          image_url: row.part?.part_img_url || null,
          category: isDecal ? 'DECAL' : 'PART',
          is_spare: false,
        });
      }

      nextPartsUrl = partsJson.next || null;
    }

    // 3. Récupérer les minifigurines du set
    const figsRes = await fetch(
      `https://rebrickable.com/api/v3/lego/sets/${encodeURIComponent(cleanSetNum)}/minifigs/?page_size=200`,
      { headers }
    );

    if (figsRes.ok) {
      const figsJson = await figsRes.json();
      for (const fig of figsJson.results || []) {
        items.push({
          id: `fig-${fig.set_num}`,
          part_num: fig.set_num || '',
          name: fig.set_name || 'Minifigurine',
          color_id: -1,
          color_name: 'Minifigurine',
          color_rgb: null,
          quantity: Number(fig.quantity || 1),
          image_url: fig.set_img_url || null,
          category: 'MINIFIG',
          is_spare: false,
        });
      }
    }

    // 4. Mettre en cache dans la table `sets`
    if (setId && items.length > 0) {
      await supabase
        .from('sets')
        .update({
          inventory_data: items,
          inventory_updated_at: new Date().toISOString(),
        })
        .eq('id', setId);
    }

    return new Response(
      JSON.stringify({ items, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
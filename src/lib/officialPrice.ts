import { supabase } from './supabase';

export async function fetchOfficialLegoPrice(setNumber: string): Promise<number | null> {
  const cleanNumber = setNumber.trim().replace(/-1$/, '');
  if (!cleanNumber) return null;

  // 1. Vérifie d'abord si un set portant ce numéro a déjà un prix officiel en base
  const { data: existingSet } = await supabase
    .from('sets')
    .select('official_price')
    .eq('lego_set_number', cleanNumber)
    .not('official_price', 'is', null)
    .limit(1)
    .maybeSingle();

  if (
    existingSet?.official_price !== null &&
    existingSet?.official_price !== undefined &&
    !Number.isNaN(Number(existingSet.official_price))
  ) {
    return Number(existingSet.official_price);
  }

  // 2. Sinon interroge l'Edge Function Supabase dédiée (si déployée)
  try {
    const { data, error } = await supabase.functions.invoke('lego-official-price', {
      body: { setNumber: cleanNumber },
    });
    if (!error && data?.official_price !== null && data?.official_price !== undefined) {
      const parsed = Number(data.official_price);
      return Number.isNaN(parsed) ? null : parsed;
    }
  } catch {
    // Fallback silencieux si la fonction n'est pas encore déployée
  }

  return null;
}
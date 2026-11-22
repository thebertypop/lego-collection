import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  ExternalLink,
  Trash2,
  TrendingDown,
  Truck,
  Tag,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  BarChart3,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  SetPriceHistoryPoint,
  SetPriceOffer,
  UserCollectionItem,
} from '../../types/database';

interface SetPriceCompareModalProps {
  item: UserCollectionItem | null;
  userId: string;
  onClose: () => void;
}

type HistoryRange = '7d' | '30d' | '90d';

interface ComparableOffer {
  id: string;
  merchant_name: string;
  price: number;
  shipping_price: number;
  totalWithShipping: number;
  condition: string | null;
  url: string | null;
  is_manual: boolean;
  isOfficialRef?: boolean;
}

export const SetPriceCompareModal: React.FC<SetPriceCompareModalProps> = ({
  item,
  userId,
  onClose,
}) => {
  const [offers, setOffers] = useState<SetPriceOffer[]>([]);
  const [history, setHistory] = useState<SetPriceHistoryPoint[]>([]);
  const [includeShipping, setIncludeShipping] = useState(true);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('30d');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Formulaire d'ajout d'offre / lien (Leboncoin, Vinted, etc.)
  const [showAddForm, setShowAddForm] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [shippingInput, setShippingInput] = useState('0');
  const [conditionInput, setConditionInput] = useState('Neuf');
  const [urlInput, setUrlInput] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const recordHistorySnapshot = useCallback(
    async (setId: string, offerRows: SetPriceOffer[], officialPrice: number | null) => {
      const candidatesBase: number[] = offerRows.map((o) => Number(o.price));
      const candidatesShip: number[] = offerRows.map(
        (o) => Number(o.price) + Number(o.shipping_price || 0)
      );

      if (officialPrice !== null && !Number.isNaN(Number(officialPrice))) {
        candidatesBase.push(Number(officialPrice));
        candidatesShip.push(Number(officialPrice));
      }

      if (candidatesBase.length === 0) return;

      const lowestBase = Math.min(...candidatesBase);
      const lowestShip = Math.min(...candidatesShip);

      const { data: latestPoints } = await supabase
        .from('set_price_history')
        .select('*')
        .eq('set_id', setId)
        .order('recorded_at', { ascending: false })
        .limit(1);

      const latest = latestPoints?.[0];
      const now = Date.now();
      const twelveHoursMs = 12 * 60 * 60 * 1000;

      const priceChanged =
        !latest ||
        Number(latest.lowest_price) !== lowestBase ||
        Number(latest.lowest_price_with_shipping) !== lowestShip;

      const isStale =
        !latest || now - new Date(latest.recorded_at).getTime() > twelveHoursMs;

      if (priceChanged || isStale) {
        const { data: inserted } = await supabase
          .from('set_price_history')
          .insert({
            set_id: setId,
            lowest_price: lowestBase,
            lowest_price_with_shipping: lowestShip,
          })
          .select()
          .single();

        if (inserted) {
          setHistory((prev) => [...prev, inserted as SetPriceHistoryPoint]);
        }
      }
    },
    []
  );

  const loadComparisonData = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const [{ data: offerRows, error: offerErr }, { data: histRows, error: histErr }] =
        await Promise.all([
          supabase
            .from('set_price_offers')
            .select('*')
            .eq('set_id', item.sets.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('set_price_history')
            .select('*')
            .eq('set_id', item.sets.id)
            .order('recorded_at', { ascending: true }),
        ]);

      if (offerErr) throw offerErr;
      if (histErr) throw histErr;

      const cleanOffers = (offerRows || []) as SetPriceOffer[];
      const cleanHistory = (histRows || []) as SetPriceHistoryPoint[];

      setOffers(cleanOffers);
      setHistory(cleanHistory);

      await recordHistorySnapshot(
        item.sets.id,
        cleanOffers,
        item.sets.official_price ?? null
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de charger le comparateur de prix.');
    } finally {
      setLoading(false);
    }
  }, [item, recordHistorySnapshot]);

  useEffect(() => {
    if (!item) return;
    setShowAddForm(false);
    setMerchantName('');
    setPriceInput('');
    setShippingInput('0');
    setConditionInput('Neuf');
    setUrlInput('');
    setInfoMsg(null);
    void loadComparisonData();
  }, [item, loadComparisonData]);

  const officialPrice = useMemo(() => {
    if (!item?.sets.official_price && item?.sets.official_price !== 0) return null;
    const val = Number(item.sets.official_price);
    return Number.isNaN(val) ? null : val;
  }, [item]);

  const sortedOffers = useMemo<ComparableOffer[]>(() => {
    const list: ComparableOffer[] = offers.map((o) => {
      const base = Number(o.price);
      const ship = Number(o.shipping_price || 0);
      return {
        id: o.id,
        merchant_name: o.merchant_name,
        price: base,
        shipping_price: ship,
        totalWithShipping: base + ship,
        condition: o.condition,
        url: o.url,
        is_manual: o.is_manual,
      };
    });

    if (officialPrice !== null && item) {
      list.push({
        id: `official-${item.sets.id}`,
        merchant_name: 'LEGO Store (Prix catalogue)',
        price: officialPrice,
        shipping_price: 0,
        totalWithShipping: officialPrice,
        condition: 'Neuf officiel',
        url: item.sets.external_url || null,
        is_manual: false,
        isOfficialRef: true,
      });
    }

    return list.sort((a, b) => {
      const priceA = includeShipping ? a.totalWithShipping : a.price;
      const priceB = includeShipping ? b.totalWithShipping : b.price;
      return priceA - priceB;
    });
  }, [offers, officialPrice, item, includeShipping]);

  const allTimeLowest = useMemo(() => {
    const values: number[] = [];
    for (const h of history) {
      const val = includeShipping
        ? Number(h.lowest_price_with_shipping)
        : Number(h.lowest_price);
      if (!Number.isNaN(val)) values.push(val);
    }
    for (const o of sortedOffers) {
      const val = includeShipping ? o.totalWithShipping : o.price;
      if (!Number.isNaN(val)) values.push(val);
    }
    if (values.length === 0) return null;
    return Math.min(...values);
  }, [history, sortedOffers, includeShipping]);

  const filteredHistory = useMemo(() => {
    const daysMap: Record<HistoryRange, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    const cutoff = Date.now() - daysMap[historyRange] * 24 * 60 * 60 * 1000;
    const points = history
      .filter((pt) => new Date(pt.recorded_at).getTime() >= cutoff)
      .map((pt) => ({
        id: pt.id,
        dateLabel: new Date(pt.recorded_at).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        value: includeShipping
          ? Number(pt.lowest_price_with_shipping)
          : Number(pt.lowest_price),
      }));

    if (points.length === 0 && allTimeLowest !== null) {
      return [
        {
          id: 'current-snapshot',
          dateLabel: new Date().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
          }),
          value: allTimeLowest,
        },
      ];
    }

    return points;
  }, [history, historyRange, includeShipping, allTimeLowest]);

  if (!item) return null;

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(priceInput);
    const numericShipping = Number(shippingInput || 0);

    if (!merchantName.trim() || Number.isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMsg('Renseignez le nom du site/vendeur et un prix valide.');
      return;
    }

    setSubmittingOffer(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      let cleanUrl = urlInput.trim();
      if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const { data: insertedOffer, error } = await supabase
        .from('set_price_offers')
        .insert({
          user_id: userId,
          set_id: item.sets.id,
          merchant_name: merchantName.trim(),
          price: numericPrice,
          shipping_price: Number.isNaN(numericShipping) ? 0 : Math.max(0, numericShipping),
          condition: conditionInput.trim() || null,
          url: cleanUrl || null,
          is_manual: true,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedOffers = [insertedOffer as SetPriceOffer, ...offers];
      setOffers(updatedOffers);
      await recordHistorySnapshot(item.sets.id, updatedOffers, officialPrice);

      setMerchantName('');
      setPriceInput('');
      setShippingInput('0');
      setUrlInput('');
      setShowAddForm(false);
      setInfoMsg('Offre ajoutée au comparateur.');
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible d'ajouter l'offre.");
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('set_price_offers')
        .delete()
        .eq('id', offerId);
      if (error) throw error;
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de supprimer l'offre.");
    }
  };

  const formatDiffPercent = (offerPrice: number) => {
    if (!officialPrice || officialPrice <= 0) return null;
    const diff = ((offerPrice - officialPrice) / officialPrice) * 100;
    const rounded = diff.toFixed(1);
    if (diff < -0.05) {
      return {
        label: `${rounded} %`,
        className:
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
      };
    }
    if (diff > 0.05) {
      return {
        label: `+${rounded} %`,
        className: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300',
      };
    }
    return {
      label: '0.0 %',
      className:
        'bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    };
  };

  // Calcul coordonnées SVG du graphique d'historique
  const chartWidth = 520;
  const chartHeight = 140;
  const padX = 24;
  const padY = 18;

  const chartValues = filteredHistory.map((p) => p.value);
  const minVal = chartValues.length ? Math.min(...chartValues) : 0;
  const maxVal = chartValues.length ? Math.max(...chartValues) : 1;
  const span = maxVal - minVal || 1;

  const svgPoints = filteredHistory.map((pt, idx) => {
    const x =
      filteredHistory.length === 1
        ? chartWidth / 2
        : padX + (idx / (filteredHistory.length - 1)) * (chartWidth - padX * 2);
    const y =
      padY + (1 - (pt.value - minVal) / span) * (chartHeight - padY * 2);
    return { ...pt, x, y };
  });

  const polylinePoints = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="min-w-0">
            <span className="text-xs font-mono font-bold text-[#FE5000]">
              #{item.sets.lego_set_number}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Comparateur de prix — {item.sets.name_fr || item.sets.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Résumé : Référence LEGO + Plus bas jamais vu + Bascule livraison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60">
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Prix catalogue LEGO (réf.)
              </p>
              <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {officialPrice !== null ? `${officialPrice.toFixed(2)} €` : 'Non renseigné'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/30">
              <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Plus bas jamais vu</span>
              </p>
              <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {allTimeLowest !== null ? `${allTimeLowest.toFixed(2)} €` : '—'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Mode de calcul des prix
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 mt-1.5">
                <button
                  type="button"
                  onClick={() => setIncludeShipping(false)}
                  className={`py-1 rounded-md text-[11px] font-bold transition-colors ${
                    !includeShipping
                      ? 'bg-white dark:bg-zinc-900 text-[#FE5000] shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Sans livraison
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeShipping(true)}
                  className={`py-1 rounded-md text-[11px] font-bold transition-colors ${
                    includeShipping
                      ? 'bg-white dark:bg-zinc-900 text-[#FE5000] shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Avec livraison
                </button>
              </div>
            </div>
          </div>

          {/* Liste triée par ordre croissant + bouton ajouter un lien */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#FE5000]" />
                <span>Offres triées par prix croissant</span>
              </h3>

              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un lien / offre</span>
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleAddOffer}
                className="p-4 rounded-2xl border border-[#FE5000]/40 bg-zinc-50 dark:bg-zinc-950/70 space-y-3"
              >
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[#FE5000]" />
                  <span>Ajouter une offre (Leboncoin, Vinted, eBay, boutique...)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Site / Vendeur *
                    </label>
                    <input
                      type="text"
                      required
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      placeholder="Ex. : Leboncoin, Vinted..."
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Prix de l&apos;offre (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="Ex. : 115.00"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Livraison (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={shippingInput}
                      onChange={(e) => setShippingInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Lien vers l&apos;annonce
                    </label>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://www.leboncoin.fr/..."
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">État</label>
                    <input
                      type="text"
                      value={conditionInput}
                      onChange={(e) => setConditionInput(e.target.value)}
                      placeholder="Neuf scellé, Occasion..."
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOffer}
                    className="px-4 py-1.5 rounded-lg bg-[#FE5000] hover:bg-[#e04600] text-white text-xs font-bold disabled:opacity-50"
                  >
                    {submittingOffer ? 'Ajout...' : "Enregistrer l'offre"}
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Chargement des offres...
              </div>
            ) : sortedOffers.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-500">
                Aucune offre enregistrée pour ce set. Ajoutez un lien Leboncoin, Vinted ou marchand.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedOffers.map((offer, index) => {
                  const displayedPrice = includeShipping
                    ? offer.totalWithShipping
                    : offer.price;
                  const diffBadge = formatDiffPercent(displayedPrice);

                  return (
                    <div
                      key={offer.id}
                      className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border ${
                        index === 0
                          ? 'border-emerald-400/70 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {offer.merchant_name}
                          </span>
                          {index === 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                              Meilleur prix
                            </span>
                          )}
                          {offer.condition && (
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              · {offer.condition}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-2">
                          <span>Hors fdp : {offer.price.toFixed(2)} €</span>
                          <span className="inline-flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            Fdp : {offer.shipping_price.toFixed(2)} €
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {diffBadge && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${diffBadge.className}`}
                          >
                            {diffBadge.label} vs LEGO
                          </span>
                        )}

                        <span className="text-base font-extrabold text-[#FE5000]">
                          {displayedPrice.toFixed(2)} €
                        </span>

                        {offer.url && (
                          <a
                            href={offer.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Ouvrir l'offre"
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-[#FE5000] text-zinc-700 dark:text-zinc-200 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {!offer.isOfficialRef && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteOffer(offer.id)}
                            title="Supprimer cette offre"
                            className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Graphique historique des prix recensés (1 sem / 1 mois / 3 mois) */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#FE5000]" />
                <span>Historique des meilleurs prix recensés</span>
              </h3>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-200/70 dark:bg-zinc-800">
                {(
                  [
                    { id: '7d', label: '1 semaine' },
                    { id: '30d', label: '1 mois' },
                    { id: '90d', label: '3 mois' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryRange(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      historyRange === tab.id
                        ? 'bg-white dark:bg-zinc-900 text-[#FE5000] shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {svgPoints.length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Min : {minVal.toFixed(2)} €</span>
                  <span>Max : {maxVal.toFixed(2)} €</span>
                </div>

                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-36 overflow-visible"
                >
                  <line
                    x1={padX}
                    y1={chartHeight - padY}
                    x2={chartWidth - padX}
                    y2={chartHeight - padY}
                    stroke="currentColor"
                    strokeOpacity={0.15}
                  />
                  {svgPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#FE5000"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylinePoints}
                    />
                  )}
                  {svgPoints.map((pt) => (
                    <g key={pt.id}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill="#FE5000"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 8}
                        textAnchor="middle"
                        className="fill-zinc-700 dark:fill-zinc-300 text-[10px] font-bold"
                      >
                        {pt.value.toFixed(0)}€
                      </text>
                      <text
                        x={pt.x}
                        y={chartHeight - 2}
                        textAnchor="middle"
                        className="fill-zinc-500 text-[10px]"
                      >
                        {pt.dateLabel}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-zinc-500">
                Pas encore assez de points d&apos;historique sur cette période.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
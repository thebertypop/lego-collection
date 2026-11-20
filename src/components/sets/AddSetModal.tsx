import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  PlusCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchOfficialLegoPrice } from '../../lib/officialPrice';
import { BrandLogo } from '../ui/BrandLogo';
import type {
  Category,
  RebrickableSearchResult,
  SetCondition,
  SetStatus,
} from '../../types/database';

interface AddSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  categories: Category[];
  defaultCategoryId?: string | null;
  onSetAdded: () => Promise<void> | void;
}

export const AddSetModal: React.FC<AddSetModalProps> = ({
  isOpen,
  onClose,
  userId,
  categories,
  defaultCategoryId = null,
  onSetAdded,
}) => {
  const [mode, setMode] = useState<'api' | 'manual'>('api');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RebrickableSearchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Données du set (issues de l'API ou saisies manuellement)
  const [legoSetNumber, setLegoSetNumber] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [year, setYear] = useState('');
  const [piecesCount, setPiecesCount] = useState('');
  const [minifiguresCount, setMinifiguresCount] = useState('');
  const [theme, setTheme] = useState('');
  const [subtheme, setSubtheme] = useState('');
  const [officialPrice, setOfficialPrice] = useState('');
  const [retired, setRetired] = useState(false);
  const [rebrickableUrl, setRebrickableUrl] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'preview'>('search');

  // Données personnelles dans la collection
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<SetStatus>('OWNED');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [condition, setCondition] = useState<SetCondition | ''>('NEW_SEALED');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setMode('api');
    setSearchQuery('');
    setSearching(false);
    setResults([]);
    setErrorMsg(null);
    setFetchingPrice(false);

    setLegoSetNumber('');
    setNameEn('');
    setNameFr('');
    setImageUrl('');
    setYear('');
    setPiecesCount('');
    setMinifiguresCount('');
    setTheme('');
    setSubtheme('');
    setOfficialPrice('');
    setRetired(false);
    setRebrickableUrl(null);
    setExternalUrl(null);
    setStep('search');

    setCategoryId(defaultCategoryId || categories[0]?.id || '');
    setStatus('OWNED');
    setPurchasePrice('');
    setPurchaseDate('');
    setCondition('NEW_SEALED');
    setNotes('');
    setSaving(false);
  }, [defaultCategoryId, categories]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFetchOfficialPrice = async (
    targetSetNumber?: string,
    silentIfNotFound = false
  ) => {
    const rawNum = (targetSetNumber ?? legoSetNumber).trim();
    if (!rawNum) {
      if (!silentIfNotFound) {
        setErrorMsg("Renseignez d'abord le numéro LEGO du set.");
      }
      return;
    }

    setFetchingPrice(true);
    if (!silentIfNotFound) {
      setErrorMsg(null);
    }

    try {
      const foundPrice = await fetchOfficialLegoPrice(rawNum);
      if (foundPrice !== null) {
        setOfficialPrice(String(foundPrice));
      } else if (!silentIfNotFound) {
        setErrorMsg(
          'Prix officiel introuvable automatiquement pour ce set : vous pouvez le saisir à la main.'
        );
      }
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke('rebrickable-search', {
        body: { query: searchQuery.trim() },
      });
      if (error) throw error;
      setResults(data?.results || []);
      if (!data?.results?.length) {
        setErrorMsg(
          'Aucun set trouvé sur Rebrickable. Vous pouvez passer en saisie manuelle.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la recherche via Rebrickable.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectApiResult = (item: RebrickableSearchResult) => {
    setLegoSetNumber(item.lego_set_number);
    setNameEn(item.name);
    setNameFr(item.name_fr || item.name);
    setImageUrl(item.image_url || '');
    setYear(item.year ? String(item.year) : '');
    setPiecesCount(item.pieces_count ? String(item.pieces_count) : '');
    setTheme(item.theme || '');
    setOfficialPrice('');
    setRebrickableUrl(item.rebrickable_url);
    setExternalUrl(item.external_url);
    setErrorMsg(null);
    setStep('preview');

    void handleFetchOfficialPrice(item.lego_set_number, true);
  };

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legoSetNumber.trim() || (!nameFr.trim() && !nameEn.trim())) {
      setErrorMsg('Le numéro du set et son nom sont obligatoires.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const cleanNumber = legoSetNumber.trim().replace(/-1$/, '');
      const finalName = nameEn.trim() || nameFr.trim();
      const finalNameFr = nameFr.trim() || nameEn.trim();

      const { data: setRow, error: setError } = await supabase
        .from('sets')
        .upsert(
          {
            lego_set_number: cleanNumber,
            name: finalName,
            name_fr: finalNameFr,
            image_url: imageUrl.trim() || null,
            year: year ? Number(year) : null,
            pieces_count: piecesCount ? Number(piecesCount) : null,
            minifigures_count: minifiguresCount ? Number(minifiguresCount) : null,
            theme: theme.trim() || null,
            subtheme: subtheme.trim() || null,
            official_price: officialPrice ? Number(officialPrice) : null,
            retired,
            rebrickable_url: rebrickableUrl,
            external_url: externalUrl,
            api_source: mode === 'api' ? 'rebrickable' : 'manual',
            last_api_update: new Date().toISOString(),
          },
          { onConflict: 'lego_set_number' }
        )
        .select()
        .single();

      if (setError) throw setError;

      const { error: colError } = await supabase.from('user_collection').insert({
        user_id: userId,
        set_id: setRow.id,
        category_id: categoryId || null,
        status,
        previous_status: status === 'OWNED' ? 'WISHLIST' : null,
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        purchase_date: purchaseDate || null,
        condition: status === 'OWNED' && condition ? condition : null,
        notes: notes.trim() || null,
      });

      if (colError) {
        if (colError.code === '23505') {
          throw new Error('Ce set est déjà présent dans votre collection.');
        }
        throw colError;
      }

      await onSetAdded();
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible d'enregistrer le set.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <BrandLogo
              alt="BRICKbyBRICK"
              className="h-7 w-auto object-contain"
            />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Ajouter un set LEGO
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-6 pt-3 gap-5">
          <button
            type="button"
            onClick={() => {
              setMode('api');
              setStep('search');
              setErrorMsg(null);
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              mode === 'api'
                ? 'border-[#FE5000] text-[#FE5000]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Search className="w-4 h-4" />
            Recherche Rebrickable (Traduction FR)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              setStep('preview');
              setErrorMsg(null);
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              mode === 'manual'
                ? 'border-[#FE5000] text-[#FE5000]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Pencil className="w-4 h-4" />
            Saisie manuelle
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'api' && step === 'search' ? (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Numéro (ex: 76178), nom ou thème..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FE5000]"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-5 py-2.5 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white font-semibold text-sm disabled:opacity-50"
                >
                  {searching ? 'Recherche...' : 'Rechercher'}
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((r) => (
                  <button
                    key={r.full_set_num}
                    type="button"
                    onClick={() => handleSelectApiResult(r)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#FE5000] text-left transition-all bg-zinc-50/50 dark:bg-zinc-800/40"
                  >
                    <img
                      src={r.image_url || ''}
                      alt={r.name_fr}
                      className="w-16 h-16 object-contain bg-white rounded-lg p-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono font-bold text-[#FE5000]">
                        #{r.lego_set_number} · {r.year}
                      </span>
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {r.name_fr}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        EN : {r.name} · {r.pieces_count} pcs
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveSet} className="space-y-4">
              {mode === 'api' && (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Données récupérées et traduites — vérifiez avant validation
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('search')}
                    className="underline font-semibold shrink-0 ml-2"
                  >
                    Changer de set
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Numéro LEGO *
                  </label>
                  <input
                    type="text"
                    required
                    value={legoSetNumber}
                    onChange={(e) => setLegoSetNumber(e.target.value)}
                    placeholder="76178"
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5">
                    Nom en français *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
              </div>

              {/* URL d'image personnalisée (sans stockage lourd en BDD) */}
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  URL d&apos;image du set (facultatif — remplace ou ajoute l&apos;image via lien)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                  <div className="w-14 h-14 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                    {imageUrl.trim() ? (
                      <img
                        src={imageUrl.trim()}
                        alt="Aperçu du set"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Année</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Nombre de pièces
                  </label>
                  <input
                    type="number"
                    value={piecesCount}
                    onChange={(e) => setPiecesCount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-semibold">Prix officiel (€)</label>
                    <button
                      type="button"
                      onClick={() => void handleFetchOfficialPrice()}
                      disabled={fetchingPrice}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FE5000] hover:underline disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      {fetchingPrice ? 'Recherche...' : 'Auto'}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={officialPrice}
                    onChange={(e) => setOfficialPrice(e.target.value)}
                    placeholder="Ex. : 49.99"
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Catégorie</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="">Sans catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Statut dans la collection
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SetStatus)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="OWNED">Possédé</option>
                    <option value="WISHLIST">Souhaité</option>
                    <option value="TO_BUY">À acheter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Prix payé (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Date d&apos;achat
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    État du set
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as SetCondition)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="NEW_SEALED">Neuf scellé</option>
                    <option value="NEW_OPENED">Neuf ouvert</option>
                    <option value="USED_COMPLETE">Occasion complet</option>
                    <option value="USED_INCOMPLETE">Occasion incomplet</option>
                    <option value="TO_VERIFY">À vérifier</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={retired}
                  onChange={(e) => setRetired(e.target.checked)}
                  className="rounded border-zinc-300 text-[#FE5000] focus:ring-[#FE5000]"
                />
                <span>
                  Marquer ce set comme retiré du catalogue LEGO (badge « RETIRÉ »)
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Notes personnelles
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex. : Acheté en promo, boîte en parfait état..."
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Ajouter à ma collection'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
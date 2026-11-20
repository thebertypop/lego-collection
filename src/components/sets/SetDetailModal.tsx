import React, { useEffect, useState } from 'react';
import {
  X,
  Save,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchOfficialLegoPrice } from '../../lib/officialPrice';
import type {
  Category,
  SetCondition,
  SetStatus,
  UserCollectionItem,
} from '../../types/database';

interface SetDetailModalProps {
  item: UserCollectionItem | null;
  categories: Category[];
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
  onDelete: (collectionItemId: string) => Promise<void>;
}

export const SetDetailModal: React.FC<SetDetailModalProps> = ({
  item,
  categories,
  onClose,
  onUpdated,
  onDelete,
}) => {
  // Champs du set (table `sets`)
  const [legoSetNumber, setLegoSetNumber] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [year, setYear] = useState('');
  const [piecesCount, setPiecesCount] = useState('');
  const [theme, setTheme] = useState('');
  const [officialPrice, setOfficialPrice] = useState('');
  const [retired, setRetired] = useState(false);

  // Champs personnels (table `user_collection`)
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<SetStatus>('OWNED');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [condition, setCondition] = useState<SetCondition | ''>('NEW_SEALED');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!item) return;
    setLegoSetNumber(item.sets.lego_set_number || '');
    setNameFr(item.sets.name_fr || item.sets.name || '');
    setNameEn(item.sets.name || '');
    setImageUrl(item.sets.image_url || '');
    setYear(item.sets.year ? String(item.sets.year) : '');
    setPiecesCount(
      item.sets.pieces_count !== null && item.sets.pieces_count !== undefined
        ? String(item.sets.pieces_count)
        : ''
    );
    setTheme(item.sets.theme || '');
    setOfficialPrice(
      item.sets.official_price !== null && item.sets.official_price !== undefined
        ? String(item.sets.official_price)
        : ''
    );
    setRetired(Boolean(item.sets.retired));

    setCategoryId(item.category_id || '');
    setStatus(item.status);
    setPurchasePrice(
      item.purchase_price !== null && item.purchase_price !== undefined
        ? String(item.purchase_price)
        : ''
    );
    setPurchaseDate(item.purchase_date || '');
    setCondition(item.condition || 'NEW_SEALED');
    setNotes(item.notes || '');
    setFetchingPrice(false);
    setErrorMsg(null);
    setSavedNotice(false);
  }, [item]);

  if (!item) return null;

  const handleFetchOfficialPrice = async () => {
    if (!legoSetNumber.trim()) {
      setErrorMsg("Renseignez d'abord le numéro LEGO du set.");
      return;
    }

    setFetchingPrice(true);
    setErrorMsg(null);

    try {
      const foundPrice = await fetchOfficialLegoPrice(legoSetNumber);
      if (foundPrice !== null) {
        setOfficialPrice(String(foundPrice));
      } else {
        setErrorMsg(
          'Prix officiel introuvable automatiquement pour ce set : vous pouvez le saisir à la main.'
        );
      }
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legoSetNumber.trim() || (!nameFr.trim() && !nameEn.trim())) {
      setErrorMsg('Le numéro du set et son nom sont obligatoires.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSavedNotice(false);

    try {
      const cleanNumber = legoSetNumber.trim().replace(/-1$/, '');
      const finalEn = nameEn.trim() || nameFr.trim();
      const finalFr = nameFr.trim() || nameEn.trim();

      const { error: setError } = await supabase
        .from('sets')
        .update({
          lego_set_number: cleanNumber,
          name: finalEn,
          name_fr: finalFr,
          image_url: imageUrl.trim() || null,
          year: year ? Number(year) : null,
          pieces_count: piecesCount ? Number(piecesCount) : null,
          theme: theme.trim() || null,
          official_price: officialPrice ? Number(officialPrice) : null,
          retired,
        })
        .eq('id', item.sets.id);

      if (setError) throw setError;

      const { error: colError } = await supabase
        .from('user_collection')
        .update({
          category_id: categoryId || null,
          status,
          previous_status: status !== item.status ? item.status : item.previous_status,
          purchase_price: purchasePrice ? Number(purchasePrice) : null,
          purchase_date: purchaseDate || null,
          condition: status === 'OWNED' && condition ? condition : null,
          notes: notes.trim() || null,
        })
        .eq('id', item.id);

      if (colError) throw colError;

      await onUpdated();
      setSavedNotice(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la mise à jour du set.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Retirer « ${nameFr || nameEn} » (#${legoSetNumber}) de votre collection ?`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(item.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de supprimer ce set.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="text-xs font-mono font-bold text-[#FE5000]">
              #{legoSetNumber}
            </span>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Modifier les informations du set
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveAll} className="p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedNotice && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Modifications enregistrées !</span>
            </div>
          )}

          {/* Aperçu & URL de photo */}
          <div className="flex flex-col sm:flex-row gap-4 items-start bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-full sm:w-36 h-32 rounded-xl bg-white border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-2 shrink-0 overflow-hidden">
              {imageUrl.trim() ? (
                <img
                  src={imageUrl.trim()}
                  alt={nameFr || nameEn}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-zinc-400" />
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="block text-xs font-semibold">
                URL de la photo du set (modifiable à tout moment)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              {item.sets.rebrickable_url && (
                <a
                  href={item.sets.rebrickable_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#FE5000] hover:underline"
                >
                  <span>Voir sur Rebrickable</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Fiche officielle / générale du set */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Informations générales du set
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Numéro LEGO *</label>
                <input
                  type="text"
                  required
                  value={legoSetNumber}
                  onChange={(e) => setLegoSetNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1.5">Nom français *</label>
                <input
                  type="text"
                  required
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Nom anglais</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Thème</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Année de sortie</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Nombre de pièces</label>
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

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={retired}
                onChange={(e) => setRetired(e.target.checked)}
                className="rounded border-zinc-300 text-[#FE5000]"
              />
              <span>Set retiré du catalogue LEGO (badge « RETIRÉ »)</span>
            </label>
          </div>

          {/* Données personnelles de collection */}
          <div className="space-y-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Suivi dans votre collection
            </h3>

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
                <label className="block text-xs font-semibold mb-1.5">Statut</label>
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
                <label className="block text-xs font-semibold mb-1.5">Prix payé (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Date d&apos;achat</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">État</label>
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

            <div>
              <label className="block text-xs font-semibold mb-1.5">Notes personnelles</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Suppression...' : 'Supprimer de la collection'}
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-xs font-bold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer tout'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
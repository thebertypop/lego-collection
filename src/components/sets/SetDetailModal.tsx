import React, { useState } from 'react';
import { X, ExternalLink, Trash2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {  Category, SetCondition, SetStatus, UserCollectionItem  } from '../../types/database';

interface SetDetailModalProps {
  item: UserCollectionItem | null;
  categories: Category[];
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const SetDetailModal: React.FC<SetDetailModalProps> = ({
  item,
  categories,
  onClose,
  onUpdated,
  onDelete,
}) => {
  if (!item) return null;
  const { sets: set } = item;

  const [categoryId, setCategoryId] = useState(item.category_id || '');
  const [status, setStatus] = useState<SetStatus>(item.status);
  const [purchasePrice, setPurchasePrice] = useState(
    item.purchase_price !== null ? String(item.purchase_price) : ''
  );
  const [purchaseDate, setPurchaseDate] = useState(item.purchase_date || '');
  const [condition, setCondition] = useState<SetCondition | ''>(item.condition || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [retired, setRetired] = useState(set.retired);
  const [officialPrice, setOfficialPrice] = useState(
    set.official_price !== null ? String(set.official_price) : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase
        .from('user_collection')
        .update({
          category_id: categoryId || null,
          status,
          purchase_price: purchasePrice ? Number(purchasePrice) : null,
          purchase_date: purchaseDate || null,
          condition: condition || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase
        .from('sets')
        .update({
          retired,
          official_price: officialPrice ? Number(officialPrice) : null,
        })
        .eq('id', set.id);

      await onUpdated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Supprimer le set #${set.lego_set_number} de votre collection ?`)) {
      await onDelete(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-[#FE5000] text-white">
              #{set.lego_set_number}
            </span>
            <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 truncate">
              {set.name_fr || set.name}
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

        <form onSubmit={handleSave} className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="bg-white rounded-xl p-4 border border-zinc-200 flex items-center justify-center aspect-[4/3]">
              {set.image_url ? (
                <img
                  src={set.image_url}
                  alt={set.name_fr || set.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-sm text-zinc-400">Aucune image disponible</span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Nom officiel (EN)</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{set.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-zinc-500">Année</p>
                  <p className="font-semibold">{set.year || 'N/C'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Pièces</p>
                  <p className="font-semibold">
                    {set.pieces_count ? set.pieces_count.toLocaleString('fr-FR') : 'N/C'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Thème</p>
                  <p className="font-semibold">{set.theme || 'N/C'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Ajouté le</p>
                  <p className="font-semibold">
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {set.external_url && (
                  <a
                    href={set.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                  >
                    Fiche LEGO.com <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {set.rebrickable_url && (
                  <a
                    href={set.rebrickable_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"
                  >
                    Fiche Rebrickable <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-semibold mb-1">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SetStatus)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              >
                <option value="OWNED">Possédé</option>
                <option value="WISHLIST">Souhaité</option>
                <option value="TO_BUY">À acheter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Catégorie</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              >
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">État du set</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as SetCondition)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              >
                <option value="">Non précisé</option>
                <option value="NEW_SEALED">Neuf scellé</option>
                <option value="NEW_OPENED">Neuf ouvert</option>
                <option value="USED_COMPLETE">Occasion complet</option>
                <option value="USED_INCOMPLETE">Occasion incomplet</option>
                <option value="TO_VERIFY">À vérifier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Prix officiel (€)</label>
              <input
                type="number"
                step="0.01"
                value={officialPrice}
                onChange={(e) => setOfficialPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Prix payé (€)</label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Date d'achat</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={retired}
              onChange={(e) => setRetired(e.target.checked)}
              className="rounded border-zinc-300 text-[#FE5000]"
            />
            <span>Set retiré du catalogue LEGO (badge « RETIRÉ »)</span>
          </label>

          <div>
            <label className="block text-xs font-semibold mb-1">Notes personnelles</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer de la collection
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
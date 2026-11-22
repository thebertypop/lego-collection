import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  Package,
  Save,
  Minus,
  Plus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  InventoryItemCategory,
  InventoryPartItem,
  MissingPartEntry,
  UserCollectionItem,
} from '../../types/database';

interface SetContentModalProps {
  item: UserCollectionItem | null;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

export const SetContentModal: React.FC<SetContentModalProps> = ({
  item,
  onClose,
  onUpdated,
}) => {
  const [inventory, setInventory] = useState<InventoryPartItem[]>([]);
  const [missingMap, setMissingMap] = useState<Record<string, MissingPartEntry>>({});
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MISSING' | InventoryItemCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const loadInventory = async (forceRefresh = false) => {
    if (!item) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!forceRefresh && Array.isArray(item.sets.inventory_data) && item.sets.inventory_data.length > 0) {
        setInventory(item.sets.inventory_data);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('rebrickable-set-parts', {
        body: {
          setId: item.sets.id,
          legoSetNumber: item.sets.lego_set_number,
          forceRefresh,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInventory(data?.items || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de récupérer l'inventaire de ce set.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!item) return;
    const initialMap: Record<string, MissingPartEntry> = {};
    for (const m of item.missing_items || []) {
      initialMap[m.id] = m;
    }
    setMissingMap(initialMap);
    setActiveFilter('ALL');
    setSearchQuery('');
    setSavedNotice(false);
    void loadInventory(false);
  }, [item]);

  const counts = useMemo(() => {
    let parts = 0;
    let figs = 0;
    let decals = 0;
    for (const el of inventory) {
      if (el.category === 'MINIFIG') figs += el.quantity;
      else if (el.category === 'DECAL') decals += el.quantity;
      else parts += el.quantity;
    }
    const missingEntries = Object.values(missingMap);
    const missingTotalQty = missingEntries.reduce((acc, m) => acc + m.quantity_missing, 0);
    return { parts, figs, decals, missingTotalQty, missingRefsCount: missingEntries.length };
  }, [inventory, missingMap]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((el) => {
      const isMissing = Boolean(missingMap[el.id]);
      if (activeFilter === 'MISSING' && !isMissing) return false;
      if (
        activeFilter !== 'ALL' &&
        activeFilter !== 'MISSING' &&
        el.category !== activeFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = el.name.toLowerCase().includes(q);
        const matchNum = el.part_num.toLowerCase().includes(q);
        const matchColor = el.color_name.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchColor) return false;
      }
      return true;
    });
  }, [inventory, missingMap, activeFilter, searchQuery]);

  if (!item) return null;

  const isIncompleteCondition = item.condition === 'USED_INCOMPLETE';

  const togglePartPresent = (el: InventoryPartItem) => {
    setMissingMap((prev) => {
      const next = { ...prev };
      if (next[el.id]) {
        delete next[el.id];
      } else {
        next[el.id] = {
          id: el.id,
          part_num: el.part_num,
          name: el.name,
          color_name: el.color_name,
          category: el.category,
          image_url: el.image_url,
          quantity_total: el.quantity,
          quantity_missing: el.quantity,
        };
      }
      return next;
    });
  };

  const updateMissingQty = (el: InventoryPartItem, delta: number) => {
    setMissingMap((prev) => {
      const current = prev[el.id];
      if (!current) return prev;
      const newQty = current.quantity_missing + delta;
      const next = { ...prev };
      if (newQty <= 0) {
        delete next[el.id];
      } else {
        next[el.id] = {
          ...current,
          quantity_missing: Math.min(el.quantity, newQty),
        };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSavedNotice(false);

    try {
      const missingArray = Object.values(missingMap);
      const hasMissing = missingArray.length > 0;

      // Si des éléments sont manquants, passer automatiquement l'état en USED_INCOMPLETE
      const nextCondition = hasMissing
        ? 'USED_INCOMPLETE'
        : item.condition === 'USED_INCOMPLETE'
        ? 'USED_COMPLETE'
        : item.condition;

      const { error } = await supabase
        .from('user_collection')
        .update({
          missing_items: missingArray,
          condition: nextCondition,
        })
        .eq('id', item.id);

      if (error) throw error;

      await onUpdated();
      setSavedNotice(true);
      setTimeout(() => onClose(), 450);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement du contenu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[88vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#FE5000]">
                #{item.sets.lego_set_number}
              </span>
              {counts.missingTotalQty > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 text-[11px] font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  {counts.missingTotalQty} élément{counts.missingTotalQty > 1 ? 's' : ''} manquant{counts.missingTotalQty > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Complet
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
              Contenu du set : {item.sets.name_fr || item.sets.name}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void loadInventory(true)}
              disabled={loading}
              title="Actualiser l'inventaire depuis Rebrickable"
              className="p-2 rounded-lg text-zinc-500 hover:text-[#FE5000] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bandeau info mode incomplet / pointage */}
        <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <span className="text-zinc-600 dark:text-zinc-400">
            {isIncompleteCondition || counts.missingTotalQty > 0
              ? 'Décochez les pièces, minifigurines ou stickers manquants :'
              : 'Décochez un élément pour le signaler comme manquant (passera le set en incomplet).'}
          </span>
        </div>

        {/* Filtres et recherche */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par nom de pièce, référence ou couleur..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `Tout (${inventory.length})` },
              { id: 'PART', label: `Pièces (${counts.parts})` },
              { id: 'MINIFIG', label: `Minifigs (${counts.figs})` },
              { id: 'DECAL', label: `Stickers (${counts.decals})` },
              { id: 'MISSING', label: `Manquants (${counts.missingRefsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeFilter === tab.id
                    ? 'bg-[#FE5000] text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des éléments */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              Inventaire enregistré !
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Récupération des pièces, minifigurines et stickers...
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              Aucun élément trouvé pour ce filtre.
            </div>
          ) : (
            filteredInventory.map((el) => {
              const missingEntry = missingMap[el.id];
              const isPresent = !missingEntry;

              return (
                <div
                  key={el.id}
                  onClick={() => togglePartPresent(el)}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isPresent
                      ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                      : 'border-red-300 dark:border-red-800/80 bg-red-50/60 dark:bg-red-950/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePartPresent(el);
                      }}
                      className="shrink-0 text-[#FE5000]"
                    >
                      {isPresent ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-red-500" />
                      )}
                    </button>

                    <div className="w-11 h-11 rounded-lg bg-white border border-zinc-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      {el.image_url ? (
                        <img
                          src={el.image_url}
                          alt={el.name}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-zinc-500">
                          {el.part_num}
                        </span>
                        {el.category === 'MINIFIG' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            Minifig
                          </span>
                        )}
                        {el.category === 'DECAL' && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-bold">
                            Sticker / Decal
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs font-semibold truncate ${
                          isPresent
                            ? 'text-zinc-900 dark:text-zinc-100'
                            : 'text-red-700 dark:text-red-300 line-through'
                        }`}
                      >
                        {el.name}
                      </p>
                      {el.color_name && el.category !== 'MINIFIG' && (
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                          {el.color_rgb && (
                            <span
                              style={{ backgroundColor: el.color_rgb }}
                              className="w-2.5 h-2.5 rounded-full border border-zinc-300 inline-block"
                            />
                          )}
                          <span>{el.color_name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantité totale / manquante */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 shrink-0"
                  >
                    {!isPresent && el.quantity > 1 ? (
                      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-800 rounded-lg px-1.5 py-1 text-xs font-bold text-red-600 dark:text-red-300">
                        <button
                          type="button"
                          onClick={() => updateMissingQty(el, -1)}
                          className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span>
                          -{missingEntry.quantity_missing}/{el.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateMissingQty(el, 1)}
                          className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          isPresent
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {isPresent ? `×${el.quantity}` : `Manque ${missingEntry.quantity_missing}/${el.quantity}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de modale */}
        <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-zinc-50 dark:bg-zinc-950">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {counts.missingTotalQty === 0
              ? 'Tous les éléments sont cochés.'
              : `${counts.missingTotalQty} élément(s) manquant(s) sélectionné(s)`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-xs font-bold disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
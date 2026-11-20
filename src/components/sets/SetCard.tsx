import React from 'react';
import { Check, Package, Calendar, Layers, Euro, ExternalLink } from 'lucide-react';
import type { SetStatus, UserCollectionItem } from '../../types/database';

interface SetCardProps {
  item: UserCollectionItem;
  onSelectSet: (item: UserCollectionItem) => void;
  onToggleOwned: (item: UserCollectionItem) => void;
  onChangeStatus: (item: UserCollectionItem, newStatus: SetStatus) => void;
}

const STATUS_CONFIG: Record<
  SetStatus,
  { label: string; badgeClass: string; borderClass: string }
> = {
  OWNED: {
    label: 'Possédé',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-500/40',
  },
  WISHLIST: {
    label: 'Souhaité',
    badgeClass:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-500/40',
  },
  TO_BUY: {
    label: 'À acheter',
    badgeClass:
      'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800',
    borderClass: 'border-sky-500/40',
  },
};

export const SetCard: React.FC<SetCardProps> = ({
  item,
  onSelectSet,
  onToggleOwned,
  onChangeStatus,
}) => {
  const { sets: legoSet, categories: category, status } = item;
  const isOwned = status === 'OWNED';
  const statusStyle = STATUS_CONFIG[status];

  const displayNameFr = legoSet.name_fr || legoSet.name;
  const displayNameEn = legoSet.name;
  const priceToDisplay = item.purchase_price ?? legoSet.official_price;
  const priceLabel =
    item.purchase_price !== null && item.purchase_price !== undefined
      ? 'Payé'
      : 'Prix off.';

  return (
    <article
      onClick={() => onSelectSet(item)}
      className={`group bg-white dark:bg-zinc-900 rounded-2xl border ${statusStyle.borderClass} hover:border-[#FE5000] shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer`}
    >
      {/* Visuel & badges */}
      <div className="relative h-44 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 border-b border-zinc-100 dark:border-zinc-800">
        {legoSet.image_url ? (
          <img
            src={legoSet.image_url}
            alt={displayNameFr}
            loading="lazy"
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5">
            <Package className="w-8 h-8" />
            <span className="text-[11px]">Aucune image</span>
          </div>
        )}

        {/* Numéro de set */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-zinc-900/85 text-white text-xs font-mono font-bold">
          #{legoSet.lego_set_number}
        </span>

        {/* Badge RETIRÉ */}
        {legoSet.retired && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
            Retiré
          </span>
        )}
      </div>

      {/* Corps de la carte */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          {/* Catégorie & badge de statut */}
          <div className="flex items-center justify-between gap-2">
            {category ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 truncate">
                <span
                  style={{ backgroundColor: category.color }}
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                />
                <span className="truncate">{category.name}</span>
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400">Sans catégorie</span>
            )}

            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${statusStyle.badgeClass}`}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Titre FR + titre EN */}
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
              {displayNameFr}
            </h3>
            {displayNameEn && displayNameEn !== displayNameFr && (
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                {displayNameEn}
              </p>
            )}
          </div>

          {/* Métadonnées techniques */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 pt-1">
            {legoSet.year && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {legoSet.year}
              </span>
            )}
            {legoSet.pieces_count !== null && legoSet.pieces_count !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {legoSet.pieces_count.toLocaleString('fr-FR')} pcs
              </span>
            )}
            {priceToDisplay !== null && priceToDisplay !== undefined && (
              <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                <Euro className="w-3 h-3 text-[#FE5000]" />
                {priceLabel} : {Number(priceToDisplay).toFixed(2)} €
              </span>
            )}
          </div>
        </div>

        {/* Actions rapides (arrêt de propagation pour ne pas ouvrir la fiche détaillée) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2"
        >
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold">
            <button
              type="button"
              role="checkbox"
              aria-checked={isOwned}
              onClick={() => onToggleOwned(item)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                isOwned
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-emerald-500'
              }`}
            >
              {isOwned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
            <span>Possédé</span>
          </label>

          <div className="flex items-center gap-1.5">
            <select
              aria-label="Changer le statut du set"
              value={status}
              onChange={(e) => onChangeStatus(item, e.target.value as SetStatus)}
              className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-[#FE5000]"
            >
              <option value="OWNED">Possédé</option>
              <option value="WISHLIST">Souhaité</option>
              <option value="TO_BUY">À acheter</option>
            </select>

            <button
              type="button"
              onClick={() => onSelectSet(item)}
              title="Voir les détails"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-[#FE5000] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
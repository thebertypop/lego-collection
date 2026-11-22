import React from 'react';
import {
  Check,
  Package,
  Calendar,
  Layers,
  Euro,
  ExternalLink,
  Sparkles,
  ShoppingCart,
  Gift,
} from 'lucide-react';
import type { SetStatus, UserCollectionItem } from '../../types/database';

interface SetCardProps {
  item: UserCollectionItem;
  onSelectSet: (item: UserCollectionItem) => void;
  onToggleOwned: (item: UserCollectionItem) => void;
  onChangeStatus: (item: UserCollectionItem, newStatus: SetStatus) => void;
}

const STATUS_CONFIG: Record<
  SetStatus,
  {
    label: string;
    badgeClass: string;
    borderClass: string;
    activeBtnClass: string;
  }
> = {
  OWNED: {
    label: 'Possédé',
    badgeClass:
      'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-500/40',
    activeBtnClass:
      'bg-emerald-600 text-white border-emerald-600 shadow-2xs',
  },
  WISHLIST: {
    label: 'Souhaité',
    badgeClass:
      'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-500/40',
    activeBtnClass:
      'bg-amber-500 text-white border-amber-500 shadow-2xs',
  },
  TO_BUY: {
    label: 'À acheter',
    badgeClass:
      'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800',
    borderClass: 'border-sky-500/40',
    activeBtnClass:
      'bg-sky-600 text-white border-sky-600 shadow-2xs',
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
  const isGift = Boolean(item.is_gift);

  const displayNameFr = legoSet.name_fr || legoSet.name;
  const displayNameEn = legoSet.name;

  const hasPurchasePrice =
    item.purchase_price !== null &&
    item.purchase_price !== undefined &&
    !Number.isNaN(Number(item.purchase_price));
  const hasOfficialPrice =
    legoSet.official_price !== null &&
    legoSet.official_price !== undefined &&
    !Number.isNaN(Number(legoSet.official_price));

  return (
    <article
      onClick={() => onSelectSet(item)}
      className={`group bg-white dark:bg-zinc-900 rounded-2xl border ${statusStyle.borderClass} hover:border-[#FE5000] shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer`}
    >
      {/* Visuel sur fond blanc pour garder un bon contraste même en mode nuit */}
      <div className="relative h-44 bg-white flex items-center justify-center p-4 border-b border-zinc-200 dark:border-zinc-800">
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

        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-mono font-bold">
          #{legoSet.lego_set_number}
        </span>

        {legoSet.retired && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
            Retiré
          </span>
        )}
      </div>

      {/* Corps de la carte */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            {category ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                <span
                  style={{ backgroundColor: category.color }}
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                />
                <span className="truncate">{category.name}</span>
              </span>
            ) : (
              <span className="text-xs text-zinc-400">Sans catégorie</span>
            )}

            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-bold shrink-0 ${statusStyle.badgeClass}`}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Titre FR + titre EN multi-lignes */}
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
              {displayNameFr}
            </h3>
            {displayNameEn && displayNameEn !== displayNameFr && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                {displayNameEn}
              </p>
            )}
          </div>

          {/* Métadonnées */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
            {legoSet.year && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {legoSet.year}
              </span>
            )}
            {legoSet.pieces_count !== null && legoSet.pieces_count !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                {legoSet.pieces_count.toLocaleString('fr-FR')} pcs
              </span>
            )}
          </div>

          {/* Prix : prix payé (avec icône cadeau si cadeau) + prix officiel */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-0.5">
            {hasPurchasePrice && (
              <span
                title={
                  isGift
                    ? item.gift_from
                      ? `Cadeau offert par ${item.gift_from}`
                      : 'Cadeau'
                    : undefined
                }
                className={`inline-flex items-center gap-1 ${
                  isOwned ? 'font-bold text-[#FE5000]' : 'font-semibold text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {isOwned && <Euro className="w-3.5 h-3.5" />}
                <span>Payé : {Number(item.purchase_price).toFixed(2)} €</span>
                {isGift && (
                  <Gift className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                )}
              </span>
            )}
            {!hasPurchasePrice && isGift && (
              <span
                title={item.gift_from ? `Cadeau offert par ${item.gift_from}` : 'Cadeau'}
                className="inline-flex items-center gap-1 font-semibold text-pink-600 dark:text-pink-400"
              >
                <Gift className="w-3.5 h-3.5 shrink-0" />
                <span>Cadeau{item.gift_from ? ` · ${item.gift_from}` : ''}</span>
              </span>
            )}
            {hasOfficialPrice && (
              <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                {!isOwned && !hasPurchasePrice && (
                  <Euro className="w-3.5 h-3.5 text-[#FE5000]" />
                )}
                Prix off. : {Number(legoSet.official_price).toFixed(2)} €
              </span>
            )}
          </div>
        </div>

        {/* Boutons de statut complets sans coupure */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleOwned(item)}
              className={`flex-1 min-w-[92px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                isOwned
                  ? STATUS_CONFIG.OWNED.activeBtnClass
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500'
              }`}
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Possédé</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeStatus(item, 'WISHLIST')}
              className={`flex-1 min-w-[92px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                status === 'WISHLIST'
                  ? STATUS_CONFIG.WISHLIST.activeBtnClass
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 hover:border-amber-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Souhaité</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeStatus(item, 'TO_BUY')}
              className={`flex-1 min-w-[92px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                status === 'TO_BUY'
                  ? STATUS_CONFIG.TO_BUY.activeBtnClass
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 hover:border-sky-500'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>À acheter</span>
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onSelectSet(item)}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#FE5000] transition-colors"
            >
              <span>Modifier / Fiche détaillée</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
import React, { useMemo } from 'react';
import type { Category, UserCollectionItem } from '../../types/database';

interface StatsSectionProps {
  items: UserCollectionItem[];
  categories: Category[];
}

export const StatsSection: React.FC<StatsSectionProps> = ({ items, categories }) => {
  const analytics = useMemo(() => {
    const ownedItems = items.filter((i) => i.status === 'OWNED');
    const wishlistItems = items.filter((i) => i.status === 'WISHLIST');
    const toBuyItems = items.filter((i) => i.status === 'TO_BUY');

    const totalPieces = ownedItems.reduce((acc, i) => acc + (i.sets?.pieces_count || 0), 0);

    // Exclut les sets sans prix renseigné des calculs financiers
    const itemsWithPaidPrice = items.filter(
      (i) => i.purchase_price !== null && i.purchase_price !== undefined && !Number.isNaN(Number(i.purchase_price))
    );
    const totalSpent = itemsWithPaidPrice.reduce(
      (acc, i) => (i.is_gift ? acc : acc + Number(i.purchase_price)),
      0
    );
    const averagePrice = itemsWithPaidPrice.length > 0 ? totalSpent / itemsWithPaidPrice.length : 0;

    // Dépenses par catégorie (uniquement les sets avec prix payé renseigné)
    const spendByCategory = categories
      .map((cat) => {
        const catPaid = itemsWithPaidPrice.filter((i) => i.category_id === cat.id);
        const amount = catPaid.reduce((sum, i) => sum + Number(i.purchase_price), 0);
        return {
          id: cat.id,
          name: cat.name,
          color: cat.color || '#FE5000',
          amount,
          count: catPaid.length,
        };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const uncategorizedPaid = itemsWithPaidPrice.filter((i) => !i.category_id);
    const uncategorizedAmount = uncategorizedPaid.reduce(
      (sum, i) => sum + Number(i.purchase_price),
      0
    );
    if (uncategorizedAmount > 0) {
      spendByCategory.push({
        id: 'uncategorized',
        name: 'Sans catégorie',
        color: '#A0A5A9',
        amount: uncategorizedAmount,
        count: uncategorizedPaid.length,
      });
    }

    const maxCategorySpend = Math.max(...spendByCategory.map((c) => c.amount), 1);

    // Nombre de sets par année de sortie
    const yearMap = new Map<number, number>();
    for (const item of items) {
      if (item.sets?.year) {
        yearMap.set(item.sets.year, (yearMap.get(item.sets.year) || 0) + 1);
      }
    }
    const setsByYear = Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);
    const maxYearCount = Math.max(...setsByYear.map((y) => y.count), 1);

    // Évolution des achats dans le temps (par mois YYYY-MM quand purchase_date + purchase_price sont présents)
    const timelineMap = new Map<string, { label: string; amount: number; count: number }>();
    const datedPaidItems = items
      .filter((i) => i.purchase_date && i.purchase_price !== null && !Number.isNaN(Number(i.purchase_price)))
      .sort((a, b) => (a.purchase_date! > b.purchase_date! ? 1 : -1));

    for (const item of datedPaidItems) {
      const key = item.purchase_date!.slice(0, 7); // YYYY-MM
      const [y, m] = key.split('-');
      const label = `${m}/${y}`;
      const existing = timelineMap.get(key) || { label, amount: 0, count: 0 };
      existing.amount += Number(item.purchase_price);
      existing.count += 1;
      timelineMap.set(key, existing);
    }

    let cumulative = 0;
    const purchaseTimeline = Array.from(timelineMap.values()).map((entry) => {
      cumulative += entry.amount;
      return {
        ...entry,
        cumulative,
      };
    });
    const maxCumulative = Math.max(...purchaseTimeline.map((p) => p.cumulative), 1);

    // Répartition entre les statuts
    const totalAll = Math.max(items.length, 1);
    const statusBreakdown = [
      {
        label: 'Possédés',
        count: ownedItems.length,
        pct: Math.round((ownedItems.length / totalAll) * 100),
        color: '#059669',
      },
      {
        label: 'Souhaités',
        count: wishlistItems.length,
        pct: Math.round((wishlistItems.length / totalAll) * 100),
        color: '#D97706',
      },
      {
        label: 'À acheter',
        count: toBuyItems.length,
        pct: Math.round((toBuyItems.length / totalAll) * 100),
        color: '#0284C7',
      },
    ];

    return {
      ownedCount: ownedItems.length,
      totalPieces,
      totalSpent,
      averagePrice,
      paidCount: itemsWithPaidPrice.length,
      spendByCategory,
      maxCategorySpend,
      setsByYear,
      maxYearCount,
      purchaseTimeline,
      maxCumulative,
      statusBreakdown,
    };
  }, [items, categories]);

  return (
    <div className="space-y-6">
      {/* Cartes récapitulatives dédiées aux statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Sets possédés</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{analytics.ownedCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {analytics.totalPieces.toLocaleString('fr-FR')} pièces au total
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Total des dépenses (EUR)</p>
          <p className="text-2xl font-extrabold text-[#FE5000] mt-1">
            {analytics.totalSpent.toFixed(2)} €
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Basé sur {analytics.paidCount} set{analytics.paidCount > 1 ? 's' : ''} avec prix payé
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Prix moyen d&apos;achat</p>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">
            {analytics.averagePrice.toFixed(2)} €
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Sets sans prix exclus du calcul
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Répartition des statuts</p>
          <div className="mt-2 space-y-1.5">
            {analytics.statusBreakdown.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
                <span className="font-bold">
                  {s.count} ({s.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grille des graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dépenses par catégorie */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold">Dépenses par catégorie (€)</h3>
            <p className="text-xs text-zinc-500">
              Uniquement les sets disposant d&apos;un prix payé renseigné
            </p>
          </div>

          {analytics.spendByCategory.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              Aucun prix payé renseigné pour le moment.
            </p>
          ) : (
            <div className="space-y-3.5">
              {analytics.spendByCategory.map((cat) => {
                const widthPct = Math.max(4, Math.round((cat.amount / analytics.maxCategorySpend) * 100));
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                        <span className="text-zinc-400 font-normal">({cat.count})</span>
                      </span>
                      <span className="font-bold">{cat.amount.toFixed(2)} €</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${widthPct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nombre de sets par année de sortie */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold">Sets par année de sortie</h3>
            <p className="text-xs text-zinc-500">Répartition selon l&apos;année officielle du set</p>
          </div>

          {analytics.setsByYear.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              Aucune année de sortie renseignée.
            </p>
          ) : (
            <div className="h-56 flex items-end gap-2 pt-6 overflow-x-auto pb-2">
              {analytics.setsByYear.map((entry) => {
                const heightPct = Math.max(8, Math.round((entry.count / analytics.maxYearCount) * 100));
                return (
                  <div
                    key={entry.year}
                    className="flex-1 min-w-10 flex flex-col items-center gap-1.5 group"
                  >
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      {entry.count}
                    </span>
                    <div className="w-full h-36 flex items-end justify-center">
                      <div
                        title={`${entry.year} : ${entry.count} set(s)`}
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-8 rounded-t-lg bg-[#FE5000] hover:bg-[#e04600] transition-all"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">{entry.year}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Évolution des achats dans le temps */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div>
          <h3 className="text-base font-bold">Évolution des achats dans le temps (€)</h3>
          <p className="text-xs text-zinc-500">
            Cumul mensuel des dépenses basées sur la date d&apos;achat et le prix payé
          </p>
        </div>

        {analytics.purchaseTimeline.length === 0 ? (
          <p className="text-xs text-zinc-400 py-8 text-center">
            Renseignez une date d&apos;achat et un prix payé sur vos sets pour visualiser l&apos;évolution.
          </p>
        ) : (
          <div className="space-y-3">
            {analytics.purchaseTimeline.map((pt) => {
              const pct = Math.max(5, Math.round((pt.cumulative / analytics.maxCumulative) * 100));
              return (
                <div key={pt.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold">
                      {pt.label}{' '}
                      <span className="font-sans font-normal text-zinc-500">
                        (+{pt.amount.toFixed(2)} € sur {pt.count} set{pt.count > 1 ? 's' : ''})
                      </span>
                    </span>
                    <span className="font-bold text-[#FE5000]">
                      Cumul : {pt.cumulative.toFixed(2)} €
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FE5000] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
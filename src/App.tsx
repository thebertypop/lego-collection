import { useMemo, useState } from 'react';
import {
  Blocks,
  Plus,
  Search,
  LogOut,
  Moon,
  Sun,
  RotateCcw,
  Trash2,
  FolderPlus,
  LayoutGrid,
  Pencil,
  BarChart3,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useCollection } from './hooks/useCollection';
import { AuthPage } from './pages/AuthPage';
import { SetCard } from './components/sets/SetCard';
import { AddSetModal } from './components/sets/AddSetModal';
import { SetDetailModal } from './components/sets/SetDetailModal';
import { AddCategoryModal } from './components/ui/AddCategoryModal';
import { StatsSection } from './components/stats/StatsSection';
import type { Category, SetStatus, UserCollectionItem } from './types/database';

export function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    items,
    categories,
    loading,
    error,
    stats,
    refresh,
    toggleOwned,
    changeStatus,
    removeItem,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCollection(user?.id);

  const [activeTab, setActiveTab] = useState<'collection' | 'stats'>('collection');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'ALL'>('ALL');
  const [darkMode, setDarkMode] = useState(false);

  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeItem, setActiveItem] = useState<UserCollectionItem | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MISSING' | SetStatus>('ALL');
  const [hideOwned, setHideOwned] = useState(false);
  const [hideWishlist, setHideWishlist] = useState(false);
  const [hideToBuy, setHideToBuy] = useState(false);
  const [retiredFilter, setRetiredFilter] = useState<'ALL' | 'ACTIVE' | 'RETIRED'>('ALL');
  const [sortBy, setSortBy] = useState<string>('created_desc');

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setHideOwned(false);
    setHideWishlist(false);
    setHideToBuy(false);
    setRetiredFilter('ALL');
    setSortBy('created_desc');
  };

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (selectedCategoryId !== 'ALL' && item.category_id !== selectedCategoryId) return false;
        if (statusFilter === 'MISSING' && item.status === 'OWNED') return false;
        if (statusFilter !== 'ALL' && statusFilter !== 'MISSING' && item.status !== statusFilter)
          return false;

        if (hideOwned && item.status === 'OWNED') return false;
        if (hideWishlist && item.status === 'WISHLIST') return false;
        if (hideToBuy && item.status === 'TO_BUY') return false;

        if (retiredFilter === 'RETIRED' && !item.sets.retired) return false;
        if (retiredFilter === 'ACTIVE' && item.sets.retired) return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNum = item.sets.lego_set_number.toLowerCase().includes(q);
          const matchName = (item.sets.name_fr || item.sets.name).toLowerCase().includes(q);
          const matchEn = item.sets.name.toLowerCase().includes(q);
          const matchTheme = (item.sets.theme || '').toLowerCase().includes(q);
          const matchCat = (item.categories?.name || '').toLowerCase().includes(q);
          if (!matchNum && !matchName && !matchEn && !matchTheme && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name_asc':
            return (a.sets.name_fr || a.sets.name).localeCompare(b.sets.name_fr || b.sets.name);
          case 'number_asc':
            return a.sets.lego_set_number.localeCompare(b.sets.lego_set_number, undefined, {
              numeric: true,
            });
          case 'price_asc':
            return (
              (a.purchase_price ?? a.sets.official_price ?? 0) -
              (b.purchase_price ?? b.sets.official_price ?? 0)
            );
          case 'price_desc':
            return (
              (b.purchase_price ?? b.sets.official_price ?? 0) -
              (a.purchase_price ?? a.sets.official_price ?? 0)
            );
          case 'year_desc':
            return (b.sets.year || 0) - (a.sets.year || 0);
          case 'pieces_desc':
            return (b.sets.pieces_count || 0) - (a.sets.pieces_count || 0);
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [
    items,
    selectedCategoryId,
    statusFilter,
    hideOwned,
    hideWishlist,
    hideToBuy,
    retiredFilter,
    searchTerm,
    sortBy,
  ]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 text-zinc-600">
        Chargement de votre espace LEGO...
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  const openCreateCategory = () => {
    setEditingCategory(null);
    setIsCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setIsCatModalOpen(true);
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (
      window.confirm(
        `Supprimer la catégorie « ${catName} » ? Les sets associés seront conservés sans catégorie.`
      )
    ) {
      await deleteCategory(catId, null);
      if (selectedCategoryId === catId) setSelectedCategoryId('ALL');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('collection');
              setSelectedCategoryId('ALL');
            }}
            className="flex items-center gap-3 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FE5000] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Blocks className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-tight">
                My LEGO Collection
              </span>
              <span className="text-xs text-zinc-500">{user.email}</span>
            </div>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openCreateCategory}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-[#FE5000] text-xs font-semibold transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-[#FE5000]" />
              Ajouter une catégorie
            </button>

            <button
              type="button"
              onClick={() => setIsAddSetOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter un set
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title="Changer de thème"
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={signOut}
              title="Déconnexion"
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Bannière d'accueil + Navigation Collection / Statistiques */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FE5000]/10 text-[#FE5000] mb-2">
              Tableau de bord personnel
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Bienvenue dans votre collection LEGO
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Suivez vos sets possédés, vos envies, vos budgets et vos catégories personnalisées.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setActiveTab('collection')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'collection'
                    ? 'bg-white dark:bg-zinc-900 text-[#FE5000] shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Collection
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-white dark:bg-zinc-900 text-[#FE5000] shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Statistiques
              </button>
            </div>

            <button
              type="button"
              onClick={openCreateCategory}
              className="sm:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
            >
              <FolderPlus className="w-4 h-4 text-[#FE5000]" />
              Catégorie
            </button>
          </div>
        </section>

        {/* Statistiques principales */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Sets possédés', value: stats.ownedCount, accent: 'text-emerald-600' },
            { label: 'Sets souhaités', value: stats.wishlistCount, accent: 'text-amber-600' },
            { label: 'À acheter', value: stats.toBuyCount, accent: 'text-sky-600' },
            { label: 'Catégories', value: stats.categoriesCount, accent: 'text-[#FE5000]' },
            {
              label: 'Pièces possédées',
              value: stats.totalPieces.toLocaleString('fr-FR'),
              accent: 'text-zinc-900 dark:text-white',
            },
            {
              label: 'Total dépensé',
              value: `${stats.totalSpent.toFixed(2)} €`,
              accent: 'text-[#FE5000]',
            },
            {
              label: 'Valeur officielle',
              value: `${stats.officialValue.toFixed(2)} €`,
              accent: 'text-zinc-900 dark:text-white',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
              <p className={`text-xl font-extrabold mt-1.5 ${stat.accent}`}>{stat.value}</p>
            </div>
          ))}
        </section>

        {activeTab === 'stats' ? (
          <StatsSection items={items} categories={categories} />
        ) : (
          <>
            {/* Cartes de Catégories avec miniature et édition */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Mes Catégories
                </h2>
                <button
                  type="button"
                  onClick={openCreateCategory}
                  className="text-xs font-semibold text-[#FE5000] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nouvelle catégorie
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('ALL')}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-32 ${
                    selectedCategoryId === 'ALL'
                      ? 'bg-[#FE5000] text-white border-[#FE5000] shadow-md'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-[#FE5000]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base">Toute la collection</span>
                    <LayoutGrid className="w-4 h-4 opacity-85" />
                  </div>
                  <p className="text-xs opacity-90 mt-4">{items.length} sets au total</p>
                </button>

                {categories.map((cat) => {
                  const catItems = items.filter((i) => i.category_id === cat.id);
                  const owned = catItems.filter((i) => i.status === 'OWNED').length;
                  const wish = catItems.filter((i) => i.status === 'WISHLIST').length;
                  const buy = catItems.filter((i) => i.status === 'TO_BUY').length;
                  const isSelected = selectedCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      style={{ borderColor: isSelected ? cat.color : undefined }}
                      className={`group relative rounded-2xl border-2 bg-white dark:bg-zinc-900 cursor-pointer transition-all overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'shadow-md'
                          : 'border-zinc-200 dark:border-zinc-800 hover:shadow-xs'
                      }`}
                    >
                      {cat.image_url && (
                        <div className="h-24 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="flex items-center gap-2 font-bold text-sm">
                              <span
                                style={{ backgroundColor: cat.color }}
                                className="w-3 h-3 rounded-full shrink-0"
                              />
                              <span className="truncate">{cat.name}</span>
                            </span>
                            {cat.description && (
                              <p className="text-xs text-zinc-500 line-clamp-1 mt-1">
                                {cat.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCategory(cat);
                              }}
                              title="Modifier cette catégorie"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-[#FE5000] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(cat.id, cat.name);
                              }}
                              title="Supprimer cette catégorie"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <span className="text-emerald-600 font-semibold">{owned} pos.</span>
                          <span>·</span>
                          <span className="text-amber-600">{wish} souh.</span>
                          <span>·</span>
                          <span className="text-sky-600">{buy} ach.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Barre de Filtres Combinables & Recherche */}
            <section className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par nom, numéro LEGO, thème ou catégorie..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FE5000]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="OWNED">Possédés uniquement</option>
                  <option value="WISHLIST">Souhaités uniquement</option>
                  <option value="TO_BUY">À acheter uniquement</option>
                  <option value="MISSING">Sets manquants (non possédés)</option>
                </select>

                <select
                  value={retiredFilter}
                  onChange={(e) => setRetiredFilter(e.target.value as any)}
                  className="px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold"
                >
                  <option value="ALL">Catalogue : Tous</option>
                  <option value="ACTIVE">Encore commercialisés</option>
                  <option value="RETIRED">Retirés uniquement</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold"
                >
                  <option value="created_desc">Tri : Ajout récent</option>
                  <option value="name_asc">Tri : Nom (A-Z)</option>
                  <option value="number_asc">Tri : Numéro LEGO</option>
                  <option value="price_asc">Tri : Prix croissant</option>
                  <option value="price_desc">Tri : Prix décroissant</option>
                  <option value="year_desc">Tri : Année de sortie</option>
                  <option value="pieces_desc">Tri : Nombre de pièces</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideOwned}
                      onChange={(e) => setHideOwned(e.target.checked)}
                      className="rounded text-[#FE5000]"
                    />
                    <span>Masquer possédés</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideWishlist}
                      onChange={(e) => setHideWishlist(e.target.checked)}
                      className="rounded text-[#FE5000]"
                    />
                    <span>Masquer souhaités</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideToBuy}
                      onChange={(e) => setHideToBuy(e.target.checked)}
                      className="rounded text-[#FE5000]"
                    />
                    <span>Masquer à acheter</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-[#FE5000] font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réinitialiser les filtres ({filteredItems.length} affiché
                  {filteredItems.length > 1 ? 's' : ''})
                </button>
              </div>
            </section>

            {/* Grille des Sets */}
            <section className="space-y-4">
              {activeCategory && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {activeCategory.image_url ? (
                      <img
                        src={activeCategory.image_url}
                        alt={activeCategory.name}
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                    ) : (
                      <span
                        style={{ backgroundColor: activeCategory.color }}
                        className="w-4 h-4 rounded-full shrink-0"
                      />
                    )}
                    <div>
                      <h2 className="text-lg font-extrabold">{activeCategory.name}</h2>
                      {activeCategory.description && (
                        <p className="text-xs text-zinc-500">{activeCategory.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditCategory(activeCategory)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:border-[#FE5000]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modifier la catégorie
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-16 text-sm text-zinc-500">
                  Chargement de vos sets LEGO...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center space-y-3">
                  <p className="font-bold text-zinc-700 dark:text-zinc-300">
                    Aucun set ne correspond à votre sélection.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddSetOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FE5000] text-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" /> Ajouter votre premier set
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredItems.map((item) => (
                    <SetCard
                      key={item.id}
                      item={item}
                      onSelectSet={setActiveItem}
                      onToggleOwned={toggleOwned}
                      onChangeStatus={changeStatus}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <AddSetModal
        isOpen={isAddSetOpen}
        onClose={() => setIsAddSetOpen(false)}
        userId={user.id}
        categories={categories}
        defaultCategoryId={selectedCategoryId !== 'ALL' ? selectedCategoryId : null}
        onSetAdded={refresh}
      />

      <SetDetailModal
        item={activeItem}
        categories={categories}
        onClose={() => setActiveItem(null)}
        onUpdated={refresh}
        onDelete={removeItem}
      />

      <AddCategoryModal
        isOpen={isCatModalOpen}
        editingCategory={editingCategory}
        onClose={() => {
          setIsCatModalOpen(false);
          setEditingCategory(null);
        }}
        onCreate={createCategory}
        onUpdate={updateCategory}
      />
    </div>
  );
}

export default App;
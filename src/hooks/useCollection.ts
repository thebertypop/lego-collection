import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, SetStatus, UserCollectionItem } from '../types/database';

export function useCollection(userId: string | undefined) {
  const [items, setItems] = useState<UserCollectionItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const [catRes, colRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('user_collection')
          .select('*, sets(*), categories(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (catRes.error) throw catRes.error;
      if (colRes.error) throw colRes.error;

      setCategories(catRes.data || []);
      setItems((colRes.data as unknown as UserCollectionItem[]) || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la collection.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Case à cocher "Possédé" avec mémorisation du statut précédent
  const toggleOwned = async (item: UserCollectionItem) => {
    const isCurrentlyOwned = item.status === 'OWNED';
    const nextStatus: SetStatus = isCurrentlyOwned
      ? item.previous_status && item.previous_status !== 'OWNED'
        ? item.previous_status
        : 'WISHLIST'
      : 'OWNED';
    const nextPrevious: SetStatus | null = isCurrentlyOwned ? null : item.status;

    // Mise à jour optimiste immédiate
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: nextStatus, previous_status: nextPrevious } : i
      )
    );

    const { error: updError } = await supabase
      .from('user_collection')
      .update({
        status: nextStatus,
        previous_status: nextPrevious,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (updError) {
      await fetchAll(); // Rollback en cas d'erreur réseau
    }
  };

  // Changement direct entre OWNED / WISHLIST / TO_BUY
  const changeStatus = async (item: UserCollectionItem, newStatus: SetStatus) => {
    const prevStatus = item.status !== newStatus ? item.status : item.previous_status;

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: newStatus, previous_status: prevStatus } : i
      )
    );

    const { error: updError } = await supabase
      .from('user_collection')
      .update({
        status: newStatus,
        previous_status: prevStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (updError) await fetchAll();
  };

  // Suppression d'un set de la collection
  const removeItem = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await supabase.from('user_collection').delete().eq('id', itemId);
  };

  // Création / modification / suppression de catégorie
  const createCategory = async (payload: {
    name: string;
    color: string;
    description?: string;
    image_url?: string;
  }) => {
    if (!userId) return;
    const { error: insError } = await supabase.from('categories').insert({
      user_id: userId,
      name: payload.name.trim(),
      color: payload.color,
      description: payload.description?.trim() || null,
      image_url: payload.image_url?.trim() || null,
      sort_order: categories.length + 1,
    });
    if (insError) throw insError;
    await fetchAll();
  };

  const deleteCategory = async (categoryId: string, targetCategoryId: string | null) => {
    // Déplace les sets vers la catégorie cible (ou null si sans catégorie) avant de supprimer
    await supabase
      .from('user_collection')
      .update({ category_id: targetCategoryId })
      .eq('category_id', categoryId);

    await supabase.from('categories').delete().eq('id', categoryId);
    await fetchAll();
  };

  // Statistiques globales calculées en temps réel
  const stats = useMemo(() => {
    const owned = items.filter((i) => i.status === 'OWNED');
    const wishlist = items.filter((i) => i.status === 'WISHLIST');
    const toBuy = items.filter((i) => i.status === 'TO_BUY');

    const totalPieces = owned.reduce((acc, i) => acc + (i.sets?.pieces_count || 0), 0);
    const totalSpent = items
      .filter((item) => item.status === 'OWNED' && !item.is_gift)
      .reduce((sum, item) => {
        const price =
          item.purchase_price !== null && item.purchase_price !== undefined
          ? Number(item.purchase_price)
          : 0;
        return sum + (Number.isNaN(price) ? 0 : price);
      }, 0);
    const officialValue = owned.reduce(
      (acc, i) => (i.sets?.official_price !== null ? acc + Number(i.sets.official_price) : acc),
      0
    );
    const paidSetsCount = owned.filter((i) => i.purchase_price !== null).length;

    return {
      ownedCount: owned.length,
      wishlistCount: wishlist.length,
      toBuyCount: toBuy.length,
      categoriesCount: categories.length,
      totalPieces,
      totalSpent,
      officialValue,
      averagePrice: paidSetsCount > 0 ? totalSpent / paidSetsCount : 0,
    };
  }, [items, categories]);

  const updateCategory = async (
    categoryId: string,
    payload: {
      name: string;
      color: string;
      description?: string;
      image_url?: string;
    }
  ) => {
    if (!userId) return;
    const { error: updError } = await supabase
      .from('categories')
      .update({
        name: payload.name.trim(),
        color: payload.color,
        description: payload.description?.trim() || null,
        image_url: payload.image_url?.trim() || null,
      })
      .eq('id', categoryId)
      .eq('user_id', userId);
    if (updError) throw updError;
    await fetchAll();
  };

  return {
    items,
    categories,
    loading,
    error,
    stats,
    refresh: fetchAll,
    toggleOwned,
    changeStatus,
    removeItem,
    createCategory,
    deleteCategory,
    updateCategory,
  };
}
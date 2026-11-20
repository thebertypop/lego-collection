import React, { useEffect, useState } from 'react';
import { X, Plus, Save, Image as ImageIcon } from 'lucide-react';
import { LEGO_GOBRICKS_PALETTE } from '../../constants/legoColors';
import type { Category } from '../../types/database';

export interface CategoryFormPayload {
  name: string;
  color: string;
  description?: string;
  image_url?: string;
}

interface AddCategoryModalProps {
  isOpen: boolean;
  editingCategory?: Category | null;
  onClose: () => void;
  onCreate: (payload: CategoryFormPayload) => Promise<void>;
  onUpdate: (categoryId: string, payload: CategoryFormPayload) => Promise<void>;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  editingCategory = null,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#FE5000');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingCategory) {
      setName(editingCategory.name);
      setColor(editingCategory.color || '#FE5000');
      setDescription(editingCategory.description || '');
      setImageUrl(editingCategory.image_url || '');
    } else {
      setName('');
      setColor('#FE5000');
      setDescription('');
      setImageUrl('');
    }
  }, [isOpen, editingCategory]);

  if (!isOpen) return null;

  const isEditing = Boolean(editingCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: CategoryFormPayload = {
        name,
        color,
        description,
        image_url: imageUrl,
      };
      if (editingCategory) {
        await onUpdate(editingCategory.id, payload);
      } else {
        await onCreate(payload);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span
              style={{ backgroundColor: color }}
              className="w-3.5 h-3.5 rounded-full shrink-0"
            />
            <h2 className="font-bold text-lg">
              {isEditing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Nom de la catégorie *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. : Star Wars, Modulars, Harry Potter..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FE5000]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold">Couleur LEGO / GoBricks</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500">{color.toUpperCase()}</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  title="Sélecteur HEX personnalisé"
                />
              </div>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 max-h-44 overflow-y-auto p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              {LEGO_GOBRICKS_PALETTE.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={`${c.nameFr} (${c.name} - ${c.gobricksCode})`}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded-lg border transition-transform ${
                    color.toLowerCase() === c.hex.toLowerCase()
                      ? 'scale-110 ring-2 ring-offset-2 ring-[#FE5000] border-white'
                      : 'border-black/15 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Description (facultatif)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte note ou thème de regroupement..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FE5000]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              URL de la miniature / illustration (facultatif)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FE5000]"
              />
              <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                {imageUrl.trim() ? (
                  <img
                    src={imageUrl.trim()}
                    alt="Aperçu miniature"
                    className="w-full h-full object-cover"
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

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FE5000] hover:bg-[#e04600] text-white text-sm font-semibold disabled:opacity-50"
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {saving
                ? 'Enregistrement...'
                : isEditing
                ? 'Enregistrer les modifications'
                : 'Créer la catégorie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
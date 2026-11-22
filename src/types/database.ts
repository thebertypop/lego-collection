export type SetStatus = 'OWNED' | 'WISHLIST' | 'TO_BUY';

export type SetCondition =
  | 'NEW_SEALED'
  | 'NEW_OPENED'
  | 'USED_COMPLETE'
  | 'USED_INCOMPLETE'
  | 'TO_VERIFY';

export type InventoryItemCategory = 'PART' | 'MINIFIG' | 'DECAL';

export interface InventoryPartItem {
  id: string;
  part_num: string;
  name: string;
  color_id: number;
  color_name: string;
  color_rgb: string | null;
  quantity: number;
  image_url: string | null;
  category: InventoryItemCategory;
  is_spare?: boolean;
}

export interface MissingPartEntry {
  id: string;
  part_num: string;
  name: string;
  color_name: string;
  category: InventoryItemCategory;
  image_url: string | null;
  quantity_total: number;
  quantity_missing: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  image_url: string | null;
  created_at: string;
}

export interface LegoSet {
  id: string;
  lego_set_number: string;
  name: string;
  name_fr: string | null;
  image_url: string | null;
  year: number | null;
  pieces_count: number | null;
  minifigures_count: number | null;
  theme: string | null;
  subtheme: string | null;
  official_price: number | null;
  retired: boolean;
  rebrickable_url: string | null;
  external_url: string | null;
  api_source: string | null;
  last_api_update: string | null;
  inventory_data?: InventoryPartItem[] | null;
  inventory_updated_at?: string | null;
}

export interface UserCollectionItem {
  id: string;
  user_id: string;
  set_id: string;
  category_id: string | null;
  status: SetStatus;
  previous_status: SetStatus | null;
  purchase_price: number | null;
  purchase_date: string | null;
  condition: SetCondition | null;
  is_gift?: boolean;
  gift_from?: string | null;
  missing_items?: MissingPartEntry[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  sets: LegoSet;
  categories: Category | null;
}

export interface RebrickableSearchResult {
  full_set_num: string;
  lego_set_number: string;
  name: string;
  name_fr: string;
  year: number | null;
  pieces_count: number;
  image_url: string | null;
  rebrickable_url: string | null;
  external_url: string | null;
  theme: string | null;
}

export interface SetPriceOffer {
  id: string;
  user_id: string;
  set_id: string;
  merchant_name: string;
  price: number;
  shipping_price: number;
  condition: string | null;
  url: string | null;
  is_manual: boolean;
  created_at: string;
}

export interface SetPriceHistoryPoint {
  id: string;
  set_id: string;
  lowest_price: number;
  lowest_price_with_shipping: number;
  recorded_at: string;
}
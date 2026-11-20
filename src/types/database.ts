export type SetStatus = 'OWNED' | 'WISHLIST' | 'TO_BUY';

export type SetCondition =
  | 'NEW_SEALED'
  | 'NEW_OPENED'
  | 'USED_COMPLETE'
  | 'USED_INCOMPLETE'
  | 'TO_VERIFY';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  image_url: string | null;
  sort_order: number;
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
  estimated_price: number | null;
  retired: boolean;
  external_url: string | null;
  rebrickable_url: string | null;
  api_source: string;
  last_api_update: string;
  created_at: string;
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
  notes: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  sets: LegoSet;
  categories: Category | null;
}

export interface RebrickableSearchResult {
  lego_set_number: string;
  full_set_num: string;
  name: string;
  name_fr: string;
  year: number;
  pieces_count: number;
  image_url: string | null;
  theme: string;
  rebrickable_url: string;
  external_url: string;
}
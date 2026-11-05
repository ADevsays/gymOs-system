export type ProductCategory = 
  | 'bebidas' 
  | 'proteinas' 
  | 'snacks' 
  | 'suplementos' 
  | 'accesorios' 
  | 'otros';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
  isActive?: boolean | null;
  productCount?: number;
}

export interface Product {
  id: number;
  name: string;
  categoryId?: number | null;
  category: ProductCategory | string;
  categoryName?: string;
  price: number;
  cost?: number;
  stock: number;
  minStock: number;
  photoPath?: string | null;
  barcode?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockUnits: number;
  totalValue: number;
  lowStockCount: number;
}

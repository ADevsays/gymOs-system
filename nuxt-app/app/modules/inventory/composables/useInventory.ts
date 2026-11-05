import { ref, computed } from 'vue';
import type { Product, InventoryStats } from '../types';

export const useInventory = () => {
  const products = ref<Product[]>([]);
  const stats = ref<InventoryStats>({
    totalProducts: 0,
    totalStockUnits: 0,
    totalValue: 0,
    lowStockCount: 0,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  const selectedCategory = ref<string>('all');
  const searchQuery = ref<string>('');
  const onlyLowStock = ref<boolean>(false);

  const fetchProducts = async () => {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (selectedCategory.value !== 'all') params.append('category', selectedCategory.value);
      if (searchQuery.value.trim()) params.append('search', searchQuery.value.trim());
      if (onlyLowStock.value) params.append('lowStock', 'true');

      const url = `/api/products${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await $fetch<any>(url);

      if (res.success) {
        products.value = res.data;
      } else {
        error.value = res.error;
      }
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Error al cargar productos';
    } finally {
      loading.value = false;
    }
  };

  const fetchStats = async () => {
    try {
      const res = await $fetch<any>('/api/products/stats');
      if (res.success) {
        stats.value = res.data;
      }
    } catch (err) {
      console.error('Error fetching inventory stats:', err);
    }
  };

  const createProduct = async (payload: any) => {
    try {
      const res = await $fetch<any>('/api/products', {
        method: 'POST',
        body: payload,
      });
      if (res.success) {
        await fetchProducts();
        await fetchStats();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Error al crear producto' };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const updateProduct = async (id: number, payload: any) => {
    try {
      const res = await $fetch<any>(`/api/products/${id}`, {
        method: 'PUT',
        body: payload,
      });
      if (res.success) {
        await fetchProducts();
        await fetchStats();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Error al actualizar producto' };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const adjustStock = async (id: number, delta: number) => {
    try {
      const res = await $fetch<any>(`/api/products/${id}/stock`, {
        method: 'POST',
        body: { delta },
      });
      if (res.success) {
        // Optimistic update in list
        const idx = products.value.findIndex((p) => p.id === id);
        if (idx !== -1) {
          products.value[idx] = res.data;
        }
        await fetchStats();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al ajustar stock' };
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      const res = await $fetch<any>(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await fetchProducts();
        await fetchStats();
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al eliminar producto' };
    }
  };

  const categories = ref<CategoryItem[]>([]);
  const categoriesLoading = ref(false);

  const fetchCategories = async () => {
    categoriesLoading.value = true;
    try {
      const res = await $fetch<any>('/api/categories');
      if (res.success) {
        categories.value = res.data;
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      categoriesLoading.value = false;
    }
  };

  const createCategory = async (name: string) => {
    try {
      const res = await $fetch<any>('/api/categories', {
        method: 'POST',
        body: { name },
      });
      if (res.success) {
        await fetchCategories();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Error al crear categoría' };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const updateCategory = async (id: number, name: string) => {
    try {
      const res = await $fetch<any>(`/api/categories/${id}`, {
        method: 'PUT',
        body: { name },
      });
      if (res.success) {
        await fetchCategories();
        await fetchProducts();
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Error al actualizar categoría' };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      const res = await $fetch<any>(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await fetchCategories();
        await fetchProducts();
        return { success: true };
      }
      return { success: false, error: res.error || 'Error al eliminar categoría' };
    } catch (err: any) {
      return { success: false, error: err?.data?.message || err?.message || 'Error del servidor' };
    }
  };

  return {
    products,
    stats,
    loading,
    error,
    selectedCategory,
    searchQuery,
    onlyLowStock,
    categories,
    categoriesLoading,
    fetchProducts,
    fetchStats,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    adjustStock,
    deleteProduct,
  };
};

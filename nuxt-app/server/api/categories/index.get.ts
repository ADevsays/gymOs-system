import { defineEventHandler } from 'h3';
import { getCategories } from '../../services/categoryService';

export default defineEventHandler(async () => {
  try {
    const categories = await getCategories();
    return {
      success: true,
      data: categories,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al obtener categorías',
    };
  }
});

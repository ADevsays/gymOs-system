import { defineEventHandler } from 'h3';
import { deleteCategory } from '../../services/categoryService';

export default defineEventHandler(async (event) => {
  try {
    const id = Number(event.context.params?.id);
    if (isNaN(id)) {
      return {
        success: false,
        error: 'ID de categoría inválido',
      };
    }

    const result = await deleteCategory(id);
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al eliminar la categoría',
    };
  }
});

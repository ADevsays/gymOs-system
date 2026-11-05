import { defineEventHandler, readBody } from 'h3';
import { createCategory } from '../../services/categoryService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    if (!body || !body.name) {
      return {
        success: false,
        error: 'El nombre de la categoría es requerido',
      };
    }

    const category = await createCategory({
      name: body.name,
      color: body.color,
    });

    return {
      success: true,
      data: category,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al crear la categoría',
    };
  }
});

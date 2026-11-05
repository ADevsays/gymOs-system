import { defineEventHandler, readBody } from 'h3';
import { updateCategory } from '../../services/categoryService';

export default defineEventHandler(async (event) => {
  try {
    const id = Number(event.context.params?.id);
    if (isNaN(id)) {
      return {
        success: false,
        error: 'ID de categoría inválido',
      };
    }

    const body = await readBody(event);
    if (!body || !body.name) {
      return {
        success: false,
        error: 'El nombre de la categoría es requerido',
      };
    }

    const updated = await updateCategory(id, {
      name: body.name,
      color: body.color,
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al actualizar la categoría',
    };
  }
});

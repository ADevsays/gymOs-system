import { defineEventHandler, readBody } from 'h3';
import { createProduct } from '../../services/productService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    if (!body.name || body.price === undefined) {
      return { success: false, error: 'El nombre y el precio son obligatorios' };
    }

    const newProduct = await createProduct(body);
    return { success: true, data: newProduct };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

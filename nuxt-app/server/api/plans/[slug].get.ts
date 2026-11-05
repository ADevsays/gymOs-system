import { defineEventHandler, getRouterParam } from 'h3';
import { getPlanDetailWithMembers } from '../../services/planService';

export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug') || getRouterParam(event, 'id') || event.context.params?.slug || event.context.params?.id;
    if (!slug) {
      return { success: false, error: 'Identificador de plan no especificado' };
    }

    const planDetail = await getPlanDetailWithMembers(slug);
    if (!planDetail) {
      return { success: false, error: 'Plan no encontrado' };
    }

    return { success: true, data: planDetail };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

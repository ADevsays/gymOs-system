import { defineEventHandler, readBody } from 'h3';
import { previewMemberCsv, executeMemberCsvImport } from '../../services/memberImportService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { action, csvContent } = body || {};

    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, error: 'No se ha proporcionado contenido CSV válido' };
    }

    if (action === 'preview') {
      const preview = await previewMemberCsv(csvContent);
      return { success: true, data: preview };
    }

    if (action === 'execute') {
      const result = await executeMemberCsvImport(csvContent);
      return { success: true, data: result };
    }

    return { success: false, error: 'Acción no reconocida (debe ser preview o execute)' };
  } catch (error: any) {
    console.error('[IMPORT-API-ERROR]:', error);
    return { success: false, error: error.message || 'Error al procesar la importación' };
  }
});

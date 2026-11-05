import { defineEventHandler, readBody } from 'h3';
import { db } from '../../../lib/db';
import { members } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export default defineEventHandler(async (event) => {
  const idStr = event.context.params?.id;
  const id = idStr ? parseInt(idStr, 10) : null;

  if (!id) {
    return { success: false, error: 'ID de miembro inválido' };
  }

  const body = await readBody(event);
  if (!body.photo) {
    return { success: false, error: 'No se envió ninguna foto' };
  }

  try {
    // La imagen viene en base64: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    const base64Data = body.photo.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Directorio de uploads (public/uploads/avatars)
    const uploadsBase = process.env.GYMOS_DATA_PATH
      ? path.join(process.env.GYMOS_DATA_PATH, 'uploads')
      : path.join(process.cwd(), 'public', 'uploads');
    const avatarsDir = path.join(uploadsBase, 'avatars');

    // Asegurarse de que el directorio existe
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    // Nombre de archivo con hash para evitar problemas de caché en el navegador
    const hash = crypto.randomBytes(4).toString('hex');
    const fileName = `member_${id}_${hash}.jpg`;
    const filePath = path.join(avatarsDir, fileName);

    // Guardar archivo físico
    fs.writeFileSync(filePath, buffer);

    const relativePath = `/uploads/avatars/${fileName}`;

    // Actualizar base de datos
    db.update(members)
      .set({ photoPath: relativePath, updatedAt: new Date().toISOString() })
      .where(eq(members.id, id))
      .run();

    return { success: true, photoUrl: relativePath };
  } catch (e: any) {
    console.error('Error al guardar foto:', e);
    return { success: false, error: e.message };
  }
});

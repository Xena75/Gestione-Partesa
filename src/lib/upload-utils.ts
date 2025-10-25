import { put, del } from '@vercel/blob';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface UploadResult {
  url: string;
  success: boolean;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Determina se siamo in ambiente di produzione Vercel
 */
function isVercelProduction(): boolean {
  return process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';
}

/**
 * Carica un file utilizzando Vercel Blob Storage o filesystem locale
 */
export async function uploadProfileImage(
  file: File,
  employeeId: string
): Promise<UploadResult> {
  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fileName = `employee-${employeeId}-${Date.now()}.${fileExtension}`;
    
    if (isVercelProduction()) {
      // Ambiente di produzione: usa Vercel Blob
      const blob = await put(`profile-images/${fileName}`, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      
      return {
        url: blob.url,
        success: true
      };
    } else {
      // Ambiente locale: usa filesystem
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile-images');
      
      // Crea la directory se non esiste
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      
      await writeFile(filePath, buffer);
      
      return {
        url: `/uploads/profile-images/${fileName}`,
        success: true
      };
    }
  } catch (error) {
    console.error('Errore durante l\'upload:', error);
    return {
      url: '',
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    };
  }
}

/**
 * Elimina un file utilizzando Vercel Blob Storage o filesystem locale
 */
export async function deleteProfileImage(imageUrl: string): Promise<DeleteResult> {
  try {
    if (isVercelProduction()) {
      // Ambiente di produzione: elimina da Vercel Blob
      if (imageUrl.includes('vercel-storage.com')) {
        await del(imageUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      }
    } else {
      // Ambiente locale: elimina dal filesystem
      if (imageUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Errore durante l\'eliminazione:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    };
  }
}

/**
 * Valida il tipo e la dimensione del file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo di file non supportato. Usa JPG, PNG o WebP.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Il file è troppo grande. Dimensione massima: 5MB.'
    };
  }
  
  return { valid: true };
}
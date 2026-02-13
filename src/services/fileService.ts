import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { MessageFile } from '../types';

// ============================================================================
// HELPERS
// ============================================================================

export const getFileType = (file: File): MessageFile['type'] => {
  const mimeType = file.type.toLowerCase();
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  const documentTypes = [
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv'
  ];
  
  if (documentTypes.includes(mimeType)) return 'document';
  return 'other';
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Strict 2MB limit for Base64 storage to prevent Firestore bloat
  const MAX_SIZE = 2 * 1024 * 1024; 
  
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(file.size/1024/1024).toFixed(1)}MB). Max 2MB allowed in free mode.`
    };
  }
  
  return { valid: true };
};

// ============================================================================
// COMPRESSION & CONVERSION
// ============================================================================

export const compressImage = async (file: File, maxWidth: number = 800, quality: number = 0.6): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize logic
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas error')); return; }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression failed'));
        }, 'image/jpeg', quality);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ============================================================================
// UPLOAD FUNCTIONS (Simulated for Zero Config)
// ============================================================================

export const uploadFile = async (
  file: File,
  _path: string, // Prefixed with underscore to fix unused variable lint error
  onProgress?: (progress: number) => void
): Promise<string> => {
  
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const fileType = getFileType(file);

  // Simulate progress
  if (onProgress) {
      onProgress(10);
      await new Promise(r => setTimeout(r, 100));
      onProgress(50);
  }

  // 1. IMAGES: Compress and convert to Base64
  if (fileType === 'image') {
      try {
          const compressedBlob = await compressImage(file);
          const base64String = await blobToBase64(compressedBlob);
          if (onProgress) onProgress(100);
          return base64String;
      } catch (e) {
          console.error("Compression error, trying original", e);
          const base64String = await blobToBase64(file);
          if (onProgress) onProgress(100);
          return base64String;
      }
  } 
  
  // 2. VIDEOS: Too large for Base64 in Firestore typically. Return mock for demo.
  if (fileType === 'video') {
      if (onProgress) onProgress(100);
      return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; 
  }

  // 3. OTHERS: Try to convert, might fail size limit
  const base64String = await blobToBase64(file);
  if (onProgress) onProgress(100);
  return base64String;
};

// ============================================================================
// PROFILE PICTURE
// ============================================================================

export const uploadProfilePicture = async (
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!db) throw new Error("Database not initialized");
  
  if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file');
  }
    
  // Aggressive compression for avatars
  const compressed = await compressImage(file, 300, 0.6);
  const base64Url = await blobToBase64(compressed);
  
  if (onProgress) onProgress(100);

  // Save directly to User document
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
      avatarUrl: base64Url,
      lastStatusUpdate: Date.now()
  });
    
  return base64Url;
};

// ============================================================================
// HELPER FOR CHAT
// ============================================================================

export const createFileMessageData = async (
  chatId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<MessageFile> => {
    const fileType = getFileType(file);
    const url = await uploadFile(file, `chats/${chatId}`, onProgress);
    
    return {
      type: fileType,
      name: file.name,
      size: file.size,
      url: url,
      thumbnailUrl: url, 
      mimeType: file.type,
      uploadedAt: Date.now()
    };
};

export const downloadFile = async (url: string, fileName: string): Promise<void> => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
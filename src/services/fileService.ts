import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { MessageFile } from '../types';

// ============================================================================
// IndexedDB — local file cache
// ============================================================================
const DB_NAME = 'BBM_FileStorage';
const DB_VERSION = 3;
const FILES_STORE = 'files';

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains(FILES_STORE)) {
        const store = idb.createObjectStore(FILES_STORE, { keyPath: 'id' });
        store.createIndex('chatId', 'chatId', { unique: false });
      }
    };
  });
  return dbPromise;
};

// ============================================================================
// Types
// ============================================================================
export interface StoredFile {
  id: string;
  name: string;
  type: MessageFile['type'];
  size: number;
  mimeType: string;
  data: ArrayBuffer;
  localUrl?: string;
  cloudUrl?: string;
  chatId?: string;
  uploadedAt: number;
  synced: boolean;
}

// ============================================================================
// Helpers
// ============================================================================
export const getFileType = (file: File): MessageFile['type'] => {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime === 'text/plain' ||
    mime === 'text/csv'
  )
    return 'document';
  return 'other';
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`,
    };
  }
  return { valid: true };
};

// Single canonical compressImage — 1200px max, 0.7 quality
export const compressImage = async (
  file: File,
  maxWidth = 1200,
  quality = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// ============================================================================
// Local IndexedDB operations
// ============================================================================
export const saveFileLocally = async (file: File, chatId?: string): Promise<StoredFile> => {
  const idb = await initDB();
  const fileType = getFileType(file);
  let fileToStore = file;

  if (fileType === 'image') {
    try {
      const compressed = await compressImage(file);
      fileToStore = new File([compressed], file.name, { type: 'image/jpeg' });
    } catch {
      console.warn('[BBM] Compression failed, using original');
    }
  }

  const arrayBuffer = await fileToStore.arrayBuffer();
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const storedFile: StoredFile = {
    id,
    name: file.name,
    type: fileType,
    size: fileToStore.size,
    mimeType: fileToStore.type,
    data: arrayBuffer,
    localUrl: URL.createObjectURL(new Blob([arrayBuffer], { type: fileToStore.type })),
    chatId,
    uploadedAt: Date.now(),
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = idb.transaction([FILES_STORE], 'readwrite');
    tx.objectStore(FILES_STORE).add(storedFile);
    tx.oncomplete = () => resolve(storedFile);
    tx.onerror = () => reject(tx.error);
  });
};

export const getFile = async (fileId: string): Promise<StoredFile | null> => {
  const idb = await initDB();
  return new Promise((resolve) => {
    const req = idb
      .transaction([FILES_STORE], 'readonly')
      .objectStore(FILES_STORE)
      .get(fileId);
    req.onsuccess = () => {
      const file = req.result as StoredFile;
      if (file) {
        file.localUrl = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
        resolve(file);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
};

// ============================================================================
// Upload — Firebase Storage preferred, Base64 fallback
// ============================================================================
export const uploadFile = async (
  file: File,
  chatId: string,
  onProgress?: (p: number) => void
): Promise<MessageFile> => {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const stored = await saveFileLocally(file, chatId);
  if (onProgress) onProgress(30);

  let url = stored.localUrl!;

  if (navigator.onLine && storage) {
    try {
      const blob = new Blob([stored.data], { type: stored.mimeType });
      const storageRef = ref(storage, `chats/${chatId}/${stored.id}_${file.name}`);
      await uploadBytes(storageRef, blob);
      url = await getDownloadURL(storageRef);
      if (onProgress) onProgress(90);

      // Update IndexedDB with cloud URL
      const idb = await initDB();
      const tx = idb.transaction([FILES_STORE], 'readwrite');
      const store = tx.objectStore(FILES_STORE);
      const req = store.get(stored.id);
      req.onsuccess = () => {
        const data = req.result as StoredFile;
        if (data) { data.cloudUrl = url; data.synced = true; store.put(data); }
      };
    } catch (e) {
      console.warn('[BBM] Cloud upload failed, using Base64 fallback', e);
      if (stored.type === 'image') {
        const compressed = await compressImage(file, 800, 0.6);
        url = await blobToBase64(compressed);
      }
    }
  } else if (stored.type === 'image') {
    const compressed = await compressImage(file, 800, 0.6);
    url = await blobToBase64(compressed);
  }

  if (onProgress) onProgress(100);

  return {
    type: stored.type,
    name: file.name,
    size: file.size,
    url,
    thumbnailUrl: url,
    mimeType: file.type,
    uploadedAt: Date.now(),
  };
};

// ============================================================================
// Profile picture
// ============================================================================
export const uploadProfilePicture = async (
  file: File,
  userId: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file');

  const compressed = await compressImage(file, 400, 0.7);
  let url: string;

  if (navigator.onLine && storage) {
    try {
      const storageRef = ref(storage, `avatars/${userId}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, compressed);
      url = await getDownloadURL(storageRef);
    } catch {
      url = await blobToBase64(compressed);
    }
  } else {
    url = await blobToBase64(compressed);
  }

  if (onProgress) onProgress(80);

  if (db) {
    await updateDoc(doc(db, 'users', userId), {
      avatarUrl: url,
      lastStatusUpdate: Date.now(),
    });
  }

  if (onProgress) onProgress(100);
  return url;
};

// ============================================================================
// Utilities
// ============================================================================
export const downloadFile = (url: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

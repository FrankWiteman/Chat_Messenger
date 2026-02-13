import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'BBM_HybridStorage';
const DB_VERSION = 3;
const FILES_STORE = 'files';

let dbPromise: Promise<IDBDatabase> | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const fileStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        fileStore.createIndex('chatId', 'chatId', { unique: false });
      }
    };
  });
  return dbPromise;
};

export interface HybridFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  size: number;
  mimeType: string;
  data: ArrayBuffer;
  localUrl?: string;
  cloudUrl?: string;
  chatId?: string;
  uploadedAt: number;
  synced: boolean;
}

export const getFileType = (file: File): HybridFile['type'] => {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf') || mime.includes('document')) return 'document';
  return 'other';
};

export const compressImage = async (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Compression failed')), file.type, quality);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const saveFileLocally = async (file: File, chatId?: string): Promise<HybridFile> => {
  const db = await initDB();
  const fileType = getFileType(file);
  let fileToStore = file;
  
  if (fileType === 'image') {
    try {
      const compressed = await compressImage(file);
      fileToStore = new File([compressed], file.name, { type: file.type });
    } catch (e) { console.warn("Compression failed, using original"); }
  }

  const arrayBuffer = await fileToStore.arrayBuffer();
  const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const hybridFile: HybridFile = {
    id,
    name: file.name,
    type: fileType,
    size: fileToStore.size,
    mimeType: fileToStore.type,
    data: arrayBuffer,
    localUrl: URL.createObjectURL(new Blob([arrayBuffer], { type: fileToStore.type })),
    chatId,
    uploadedAt: Date.now(),
    synced: false
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([FILES_STORE], 'readwrite');
    tx.objectStore(FILES_STORE).add(hybridFile);
    tx.oncomplete = () => resolve(hybridFile);
    tx.onerror = () => reject(tx.error);
  });
};

export const getFile = async (fileId: string): Promise<HybridFile | null> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const req = db.transaction([FILES_STORE], 'readonly').objectStore(FILES_STORE).get(fileId);
    req.onsuccess = () => {
      const file = req.result as HybridFile;
      if (file) {
        file.localUrl = URL.createObjectURL(new Blob([file.data], { type: file.mimeType }));
        resolve(file);
      } else resolve(null);
    };
    req.onerror = () => resolve(null);
  });
};

export const handleFileUpload = async (file: File, chatId: string): Promise<HybridFile> => {
  const hybridFile = await saveFileLocally(file, chatId);
  if (navigator.onLine && storage) {
    try {
      const blob = new Blob([hybridFile.data], { type: hybridFile.mimeType });
      const storageRef = ref(storage, `chats/${chatId}/${hybridFile.id}_${file.name}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      
      const db = await initDB();
      const tx = db.transaction([FILES_STORE], 'readwrite');
      const store = tx.objectStore(FILES_STORE);
      const req = store.get(hybridFile.id);
      req.onsuccess = () => {
        const data = req.result as HybridFile;
        if (data) {
          data.cloudUrl = url;
          data.synced = true;
          store.put(data);
        }
      };
    } catch (e) { console.error("Cloud sync failed", e); }
  }
  return hybridFile;
};

export const handleProfileUpload = async (file: File, userId: string): Promise<string> => {
  const compressed = await compressImage(file, 400, 0.7);
  const blob = new Blob([await compressed.arrayBuffer()], { type: file.type });
  
  if (storage) {
    try {
      const storageRef = ref(storage, `avatars/${userId}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (e) { console.error("Profile upload failed", e); }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};
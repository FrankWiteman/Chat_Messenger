
import React, { useState, useEffect } from 'react';
import { Download, FileText, Video, Loader } from 'lucide-react';
import { getFile } from '../services/fileService';

export const FileBubble: React.FC<{ 
  url?: string; 
  type: 'image' | 'video' | 'document' | 'text'; 
  name?: string;
  isMe: boolean;
  fileId?: string; // Add fileId prop
}> = ({ url, type, name, isMe, fileId }) => {
  const [loading, setLoading] = useState(true);
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(url);

  useEffect(() => {
    const loadFile = async () => {
      // If we have a fileId, try to fetch from IndexedDB first
      // This is crucial for instant loading and offline support
      if (fileId) {
         const cachedFile = await getFile(fileId);
         if (cachedFile && cachedFile.localUrl) {
             setDisplayUrl(cachedFile.localUrl);
             setLoading(false);
             return;
         }
      }
      
      // Fallback to provided URL (Cloud URL) if local lookup fails or fileId missing
      if (url) {
          setDisplayUrl(url);
          setLoading(false);
      }
    };

    loadFile();
  }, [fileId, url]);

  if (!displayUrl) return null;

  if (type === 'image') {
    return (
      <div className="relative rounded-lg overflow-hidden my-1 min-w-[150px] min-h-[150px] bg-black/10">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Loader size={20} className="animate-spin" />
          </div>
        )}
        <img 
          src={displayUrl} 
          alt="attachment" 
          className="w-full h-auto max-h-[300px] object-cover transition-opacity duration-300"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)} 
          style={{ opacity: loading ? 0 : 1 }}
          onClick={() => window.open(displayUrl, '_blank')}
        />
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="rounded-lg overflow-hidden my-1 max-w-[280px]">
        <video src={displayUrl} controls className="w-full h-auto max-h-[300px] bg-black" />
      </div>
    );
  }

  // Document / Generic
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl my-1 ${isMe ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
      <div className="p-2 bg-white/20 rounded-lg">
        <FileText size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate max-w-[160px]">{name || 'Document'}</p>
        <p className="text-[10px] opacity-70 uppercase">File</p>
      </div>
      <a 
        href={displayUrl} 
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full hover:bg-black/10 transition-colors"
      >
        <Download size={18} />
      </a>
    </div>
  );
};

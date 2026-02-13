
import React from 'react';
import type { FeedItem } from '../types';
import { Music, Camera, MessageCircle, Zap } from 'lucide-react';

interface FeedsProps {
  feeds: FeedItem[];
}

const Feeds: React.FC<FeedsProps> = ({ feeds }) => {
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const getIcon = (type: FeedItem['type']) => {
    switch(type) {
      case 'music': return <Music size={14} className="text-purple-500" />;
      case 'photo': return <Camera size={14} className="text-blue-500" />;
      case 'status': return <MessageCircle size={14} className="text-green-500" />;
      default: return <Zap size={14} className="text-orange-500" />;
    }
  };

  const getLabel = (type: FeedItem['type']) => {
      switch(type) {
          case 'music': return 'is listening to';
          case 'photo': return 'updated their profile picture';
          case 'status': return 'updated their status';
          case 'post': return 'posted an update';
          default: return 'updated';
      }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 bg-bbm-light dark:bg-bbm-darker transition-colors duration-300">
      
      {feeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ActivityIcon />
          <p className="font-bold text-lg mt-4">No recent updates</p>
          <p className="text-xs">Updates from your contacts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-4">
          <div className="flex items-center space-x-2 px-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Updates</span>
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
          </div>

          {feeds.map((feed) => (
            <div key={feed.id} className="bg-white dark:bg-bbm-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-start space-x-4 animate-slide-up">
              <div className="relative shrink-0">
                 <img src={feed.userAvatar} className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-gray-700 bg-gray-100" alt={feed.userName} />
                 <div className="absolute -bottom-1 -right-1 bg-white dark:bg-bbm-card p-1 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                    {getIcon(feed.type)}
                 </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                   <div>
                       <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{feed.userName}</h3>
                       <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{getLabel(feed.type)}</p>
                   </div>
                   <span className="text-[10px] text-gray-400 whitespace-nowrap bg-gray-50 dark:bg-black/20 px-2 py-1 rounded-lg">{formatTime(feed.timestamp)}</span>
                </div>
                
                <div className="mt-2 bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-50 dark:border-white/5">
                   {feed.type === 'music' ? (
                     <div className="flex items-center space-x-2 text-xs font-medium text-slate-700 dark:text-gray-300">
                        <Music size={12} className="text-purple-500 animate-pulse" />
                        <span className="italic truncate">{feed.content}</span>
                     </div>
                   ) : (
                     <p className="text-sm text-slate-700 dark:text-gray-300 leading-snug">"{feed.content.replace(/^Updated status to: "/, '').replace(/"$/, '')}"</p>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActivityIcon = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export default Feeds;

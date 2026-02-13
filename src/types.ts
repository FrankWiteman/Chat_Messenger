
export const UserStatus = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  DND: 'Do Not Disturb',
  AWAY: 'Away',
  OFFLINE: 'Offline'
} as const;
export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export interface User {
  id: string;
  name: string;
  pin: string;
  avatarUrl: string;
  status: UserStatus;
  statusMessage: string;
  musicStatus?: string; 
  mood?: string; 
  lastActive?: number; 
  lastStatusUpdate?: number;
  isAi?: boolean;
  email?: string; 
  showActivity?: boolean; 
  showLastSeen?: boolean; 
  enableReadReceipts?: boolean;
  fcmTokens?: string[]; 
  notificationsEnabled?: boolean; 
}

export interface FriendRequest {
    id: string;
    fromUser: User;
    toUserId: string;
    status: 'pending' | 'accepted' | 'ignored';
    timestamp: number;
    type: 'incoming' | 'outgoing';
}

export interface MessageFile {
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  name: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  uploadedAt: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId?: string; 
  timestamp: number;
  isPing: boolean;
  status: 'sent' | 'delivered' | 'read';
  senderName?: string; 
  type?: 'text' | 'image' | 'video' | 'document' | 'file';
  mediaUrl?: string; 
  fileName?: string; 
  fileId?: string; // ID for IndexedDB lookup
  file?: MessageFile;
}

export interface Chat {
  id: string; 
  contact: User;
  messages: Message[];
  unreadCount: number;
  lastMessageTime: number;
  isMuted?: boolean;
  isBlocked?: boolean;
  isGroup?: boolean;
  participants?: User[];
  isPinned?: boolean; 
  isArchived?: boolean;
  isLocked?: boolean;
  labels?: string[]; 
  typing?: { [userId: string]: boolean };
  participantDetails?: any;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageStatus?: string;
}

export interface CallSession {
    isActive: boolean;
    type: 'voice' | 'video';
    contact: User;
    status: 'ringing' | 'connected';
    startTime: number;
}

export const NavTab = {
  CHATS: 'chats',
  CONTACTS: 'contacts',
  GROUPS: 'groups'
} as const;
export type NavTab = typeof NavTab[keyof typeof NavTab];

export const Screen = {
  SPLASH: 'splash',
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot_password',
  TWO_FA: 'two_fa',
  MAIN: 'main',
  CHAT: 'chat',
  PROFILE: 'profile',
  CONTACT_PROFILE: 'contact_profile',
  NOTIFICATIONS: 'notifications',
  PRIVACY: 'privacy',
  SETTINGS: 'settings',
  HELP: 'help'
} as const;
export type Screen = typeof Screen[keyof typeof Screen];

export interface FeedItem {
  id: string;
  userId: string;
  userAvatar: string;
  userName: string;
  type: 'status' | 'photo' | 'music' | 'post';
  content: string;
  timestamp: number;
}

export interface CustomList {
    id: string;
    name: string;
    chatIds: string[];
}

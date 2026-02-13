
import { db } from './firebase';
import { 
  collection, addDoc, query, where, getDocs, 
  onSnapshot, orderBy, serverTimestamp, doc, updateDoc, 
  deleteDoc, increment, writeBatch, getDoc 
} from 'firebase/firestore';
import type { Message, User, Chat } from '../types';
import { UserStatus } from '../types';

const CHATS_COLLECTION = 'chats';
const MESSAGES_COLLECTION = 'messages';

// -----------------------------------------------------------------------------
// Subscribe to ALL chats for the current user (Global Listener)
// -----------------------------------------------------------------------------
export const subscribeToChatList = (
  currentUserId: string,
  contacts: User[], // Need contacts to resolve names/avatars if not embedded
  callback: (chats: Chat[]) => void,
  onTypingChange?: (user: { name: string, chatId: string } | null) => void
) => {
  if (!db) {
    console.error('Database not initialized');
    return () => {};
  }

  const q = query(
    collection(db, CHATS_COLLECTION),
    where("participants", "array-contains", currentUserId)
  );

  return onSnapshot(q, (snapshot) => {
    const loadedChats: Chat[] = [];
    let currentTypingUser = null;

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // 1. GLOBAL DELIVERED SYNC (Receiver Side - App Open / Background)
        // If I am the recipient (not the sender) and status is 'sent', trigger delivery mark.
        // We do not rely solely on 'lastMessageStatus' for the logic execution, but we use it as a trigger hint.
        if (data.lastMessageSenderId && 
            data.lastMessageSenderId !== currentUserId && 
            data.lastMessageStatus === 'sent') {
            
            // Call async function without blocking the snapshot processing
            markMessageAsDelivered(docSnap.id, currentUserId).catch(e => 
                console.error("Error marking delivered:", e)
            );
        }

        const otherUserId = data.participants.find((id: string) => id !== currentUserId);
        
        // Resolve Contact Details
        const embeddedDetails = data.participantDetails?.[otherUserId];
        let contactName = embeddedDetails?.name || 'Unknown';
        let contactAvatar = embeddedDetails?.avatarUrl || 'https://via.placeholder.com/150';
        let contactPin = embeddedDetails?.pin || '??????';

        const knownContact = contacts.find(c => c.id === otherUserId);
        if (knownContact) {
            contactName = knownContact.name;
            contactAvatar = knownContact.avatarUrl;
            contactPin = knownContact.pin;
        }

        const contact: User = knownContact || {
            id: otherUserId,
            name: contactName,
            avatarUrl: contactAvatar,
            pin: contactPin,
            status: UserStatus.AVAILABLE,
            statusMessage: ''
        } as User;

        // Check Typing
        const isOtherUserTyping = data.typing && data.typing[otherUserId] === true;
        if (isOtherUserTyping) {
            currentTypingUser = { name: contactName, chatId: docSnap.id };
        }

        // Unread Count
        const myUnreadCount = data.unreadCount && data.unreadCount[currentUserId] 
            ? data.unreadCount[currentUserId] 
            : 0;

        // Robust timestamp conversion
        let lastMsgTime = Date.now();
        if (data.lastMessageTime) {
            if (typeof data.lastMessageTime === 'number') {
                lastMsgTime = data.lastMessageTime;
            } else if (data.lastMessageTime?.toMillis) {
                lastMsgTime = data.lastMessageTime.toMillis();
            } else if (data.lastMessageTime?.toDate) {
                lastMsgTime = data.lastMessageTime.toDate().getTime();
            }
        }

        // --- CONSTRUCT SYNTHETIC PREVIEW MESSAGE ---
        const messagesPreview: Message[] = [];
        if (data.lastMessageText) {
            messagesPreview.push({
                id: 'preview_' + docSnap.id,
                text: data.lastMessageText,
                senderId: data.lastMessageSenderId || 'unknown',
                timestamp: lastMsgTime,
                isPing: data.lastMessageText === 'PING!!!',
                status: data.lastMessageStatus || 'sent',
                type: 'text' // Simplified for preview
            });
        }

        const chatObj: Chat = {
            id: docSnap.id,
            contact: contact,
            messages: messagesPreview, 
            unreadCount: myUnreadCount,
            lastMessageTime: lastMsgTime,
            isGroup: data.isGroup,
            labels: [],
            typing: data.typing,
            isPinned: data.isPinned || false,
            isMuted: data.isMuted || false,
            isArchived: data.isArchived || false
        };

        loadedChats.push(chatObj);
    });
    
    // Sort by timestamp descending
    const sortedChats = loadedChats.sort((a,b) => b.lastMessageTime - a.lastMessageTime);
    
    callback(sortedChats);
    if (onTypingChange) onTypingChange(currentTypingUser);
  });
};

// -----------------------------------------------------------------------------
// Find existing chat between two users
// -----------------------------------------------------------------------------
export const findExistingChat = async (currentUserId: string, otherUserId: string) => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, CHATS_COLLECTION), 
      where("participants", "array-contains", currentUserId)
    );
    const querySnapshot = await getDocs(q);
    
    const found = querySnapshot.docs.find(docSnap => {
      const data = docSnap.data();
      return data.participants &&
             data.participants.includes(otherUserId) &&
             data.participants.length === 2 &&
             !data.isGroup;
    });

    return found ? { id: found.id, ...found.data() } : null;
  } catch (e) {
    console.error("Error finding chat:", e);
    return null;
  }
};

// -----------------------------------------------------------------------------
// Create a new chat
// -----------------------------------------------------------------------------
export const createChat = async (currentUser: User, otherUser: User) => {
  if (!db) return null;
  try {
    const existing = await findExistingChat(currentUser.id, otherUser.id);
    if (existing) return existing.id;

    const chatData = {
      participants: [currentUser.id, otherUser.id],
      participantDetails: {
        [currentUser.id]: { name: currentUser.name, avatarUrl: currentUser.avatarUrl, pin: currentUser.pin || '' },
        [otherUser.id]: { name: otherUser.name, avatarUrl: otherUser.avatarUrl, pin: otherUser.pin || '' }
      },
      isGroup: false,
      lastMessageTime: serverTimestamp(),
      lastMessageText: '',
      lastMessageSenderId: '',
      lastMessageStatus: '',
      unreadCount: { [currentUser.id]: 0, [otherUser.id]: 0 },
      typing: { [currentUser.id]: false, [otherUser.id]: false },
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, CHATS_COLLECTION), chatData);
    return docRef.id;
  } catch (e) {
    console.error("Error creating chat:", e);
    return null;
  }
};

// -----------------------------------------------------------------------------
// Send a message (Sender sets status: 'sent')
// -----------------------------------------------------------------------------
export const sendMessage = async (chatId: string, message: Message, recipientId?: string) => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  try {
    const msgData = {
      senderId: message.senderId,
      receiverId: recipientId || null, // Store receiverId for robust logic
      text: message.text || '',
      type: message.type || 'text',
      isPing: message.isPing || false,
      timestamp: serverTimestamp(),
      status: 'sent', // 🚀 1. Sender sets status: 'sent'
      mediaUrl: message.mediaUrl || null,
      fileName: message.fileName || null
    };
    
    // 1. Add to messages subcollection
    const messageRef = await addDoc(
      collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION), 
      msgData
    );

    // 2. Update parent chat document
    const updateData: any = {
      lastMessageTime: serverTimestamp(),
      lastMessageText: message.isPing 
        ? 'PING!!!' 
        : (message.type === 'text' ? (message.text || '') : 'Attachment'),
      lastMessageSenderId: message.senderId,
      lastMessageStatus: 'sent',
      [`typing.${message.senderId}`]: false
    };

    if (recipientId) {
      updateData[`unreadCount.${recipientId}`] = increment(1);
    }

    await updateDoc(doc(db, CHATS_COLLECTION, chatId), updateData);
    
    console.log('✅ Message sent:', messageRef.id);
    return messageRef.id;
  } catch (e) {
    console.error("❌ Error sending message:", e);
    throw e;
  }
};

// -----------------------------------------------------------------------------
// Subscribe to messages (Real-time update)
// -----------------------------------------------------------------------------
export const subscribeToMessages = (
  chatId: string, 
  currentUserId: string, // Needed for receiver logic
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void
) => {
  if (!db) {
    console.error('Database not initialized');
    return () => {};
  }
  
  const q = query(
    collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    q, 
    (snapshot) => {
      // 🚀 2. DELIVERED SYNC (Active Chat - Realtime)
      // Check for changes and mark as delivered if I am the receiver
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
            const msg = change.doc.data() as Message;
            // Check if I'm the receiver and status is 'sent'
            const isReceiver = (msg.receiverId === currentUserId) || 
                              (msg.senderId !== currentUserId && !msg.receiverId);
            
            if (isReceiver && msg.status === 'sent') {
                const batch = writeBatch(db);
                
                // Mark message as delivered
                batch.update(change.doc.ref, {
                    status: 'delivered'
                });

                // 🔥 CRITICAL: Update chat summary to reflect delivery
                // Only if not already read
                batch.update(doc(db, CHATS_COLLECTION, chatId), {
                    lastMessageStatus: 'delivered'
                });

                batch.commit().then(() => {
                    console.log(`✅ Marked message ${change.doc.id} as delivered`);
                }).catch(e => console.error("Error marking delivered:", e));
            }
        }
      });

      const messages = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let timestamp = Date.now();
        if (data.timestamp) {
          if (typeof data.timestamp === 'number') {
            timestamp = data.timestamp;
          } else if (data.timestamp?.toMillis) {
            timestamp = data.timestamp.toMillis();
          } else if (data.timestamp?.toDate) {
            timestamp = data.timestamp.toDate().getTime();
          }
        }

        return {
          id: docSnap.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text || '',
          type: data.type || 'text',
          isPing: data.isPing || false,
          status: data.status || 'sent',
          timestamp: timestamp,
          mediaUrl: data.mediaUrl,
          fileName: data.fileName
        } as Message;
      });
      callback(messages);
    },
    (error) => {
      console.error('❌ Error in message subscription:', error);
      if (onError) onError(error);
    }
  );
};

// -----------------------------------------------------------------------------
// Subscribe to chat document
// -----------------------------------------------------------------------------
export const subscribeToChatUpdates = (
  chatId: string,
  callback: (chatData: any) => void,
  onError?: (error: Error) => void
) => {
  if (!db) {
    console.error('Database not initialized');
    return () => {};
  }

  return onSnapshot(
    doc(db, CHATS_COLLECTION, chatId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    },
    (error) => {
      console.error('❌ Error in chat subscription:', error);
      if (onError) onError(error);
    }
  );
};

// -----------------------------------------------------------------------------
// Mark message as delivered (Atomic Batch Update for Global Sync)
// -----------------------------------------------------------------------------
export const markMessageAsDelivered = async (chatId: string, userId: string) => {
  if (!db) return;
  try {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return;
    const chatData = chatSnap.data();

    const batch = writeBatch(db);
    
    // Get all 'sent' messages in this chat
    const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
    const q = query(
      messagesRef, 
      where('status', '==', 'sent')
    );
    
    const snapshot = await getDocs(q);
    let updatedCount = 0;
    let shouldUpdateChatStatus = false;
    
    snapshot.docs.forEach(docSnap => {
      const msg = docSnap.data();
      // Only mark as delivered if I'm the receiver
      // We check if receiverId is explicitly me, or if senderId is NOT me (fallback)
      const isReceiver = (msg.receiverId === userId) || 
                        (msg.senderId !== userId && !msg.receiverId);
      
      if (isReceiver) {
        batch.update(docSnap.ref, { status: 'delivered' });
        updatedCount++;
        shouldUpdateChatStatus = true;
      }
    });
    
    // Update chat summary if we marked any messages as delivered
    // FIX 2: Protect against overwriting READ
    if (shouldUpdateChatStatus) {
      if (chatData.lastMessageStatus !== 'read') {
          batch.update(chatRef, { lastMessageStatus: 'delivered' });
      }
    }
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Marked ${updatedCount} message(s) in chat ${chatId} as delivered`);
    }
  } catch (e) {
    console.error("❌ Error marking delivered:", e);
  }
};

// -----------------------------------------------------------------------------
// Mark chat as read (Atomic Batch Update)
// -----------------------------------------------------------------------------
export const markChatRead = async (chatId: string, userId: string, sendReceipt: boolean = true) => {
  if (!db) return;
  try {
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return;
    const chatData = chatSnap.data();

    const batch = writeBatch(db);
    
    // 1. ALWAYS Reset unread count for current user (Local UI benefit)
    batch.update(chatRef, { 
        [`unreadCount.${userId}`]: 0 
    });

    // 2. Only Send Read Receipts if enabled
    if (sendReceipt) {
        // 🚀 3. READ SYNC (Chat Open)
        // Mark all sent/delivered messages from others as 'read'
        const messagesRef = collection(db, CHATS_COLLECTION, chatId, MESSAGES_COLLECTION);
        const q = query(
          messagesRef, 
          where('status', 'in', ['sent', 'delivered'])
        );
        
        const snapshot = await getDocs(q);
        let updatedCount = 0;
        
        snapshot.docs.forEach(docSnap => {
          const msg = docSnap.data();
          // Only mark as read if I'm the receiver
          const isReceiver = (msg.receiverId === userId) || 
                            (msg.senderId !== userId && !msg.receiverId);
          
          if (isReceiver) {
            batch.update(docSnap.ref, { status: 'read' });
            updatedCount++;
          }
        });
        
        // FIX 3: Update Chat Summary only if the last sender isn't me
        if (updatedCount > 0) {
          if (chatData.lastMessageSenderId !== userId) {
              batch.update(chatRef, { lastMessageStatus: 'read' });
          }
        }
    }
    
    await batch.commit();
    
    if (sendReceipt) {
        console.log(`✅ Marked message(s) in chat ${chatId} as read`);
    } else {
        console.log(`✅ Cleared unread count locally for chat ${chatId} (Receipts Disabled)`);
    }
  } catch (e) {
    console.error("❌ Error marking chat as read:", e);
  }
};

// -----------------------------------------------------------------------------
// Typing indicator
// -----------------------------------------------------------------------------
export const setTypingStatus = async (chatId: string, userId: string, isTyping: boolean) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
      [`typing.${userId}`]: isTyping
    });
  } catch (e) {
    // Silent fail
  }
};

// -----------------------------------------------------------------------------
// Delete chat
// -----------------------------------------------------------------------------
export const deleteChat = async (chatId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, CHATS_COLLECTION, chatId));
    console.log('✅ Chat deleted');
  } catch (e) {
    console.error("❌ Error deleting chat:", e);
  }
};

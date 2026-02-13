
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToMessages,
  subscribeToChatUpdates,
  sendMessage,
  markChatRead,
  setTypingStatus
} from '../services/chatService';
import type { Message } from '../types';

interface UseChatOptions {
  chatId: string;
  currentUserId: string;
  recipientId: string;
  onError?: (error: Error) => void;
}

export const useChat = ({ chatId, currentUserId, recipientId, onError }: UseChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatData, setChatData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const typingTimeoutRef = useRef<any>(null);
  const messagesUnsubscribeRef = useRef<(() => void) | null>(null);
  const chatUnsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId || chatId === 'ai_bot') {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to messages
    const unsubscribeMessages = subscribeToMessages(
      chatId,
      currentUserId, // Passed for Receiver Logic
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
        // Delivery logic is now handled inside subscribeToMessages via docChanges
      },
      (error) => {
        console.error('❌ Message subscription error:', error);
        setLoading(false);
        if (onError) onError(error);
      }
    );

    messagesUnsubscribeRef.current = unsubscribeMessages;

    // Subscribe to chat updates (typing indicators, etc.)
    const unsubscribeChat = subscribeToChatUpdates(
      chatId,
      (data) => {
        setChatData(data);
        
        // Check if other user is typing
        if (data.typing && data.typing[recipientId]) {
          setIsTyping(true);
        } else {
          setIsTyping(false);
        }
      },
      (error) => {
        console.error('❌ Chat subscription error:', error);
        if (onError) onError(error);
      }
    );

    chatUnsubscribeRef.current = unsubscribeChat;

    // Cleanup function
    return () => {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
      }
      if (chatUnsubscribeRef.current) {
        chatUnsubscribeRef.current();
      }
    };
  }, [chatId, currentUserId, recipientId, onError]);

  // Send a message
  const send = useCallback(async (text: string, isPing: boolean = false, media?: any) => {
    if (!chatId || (!text.trim() && !isPing && !media)) return;

    // Local Optimistic Update (Optional, better to wait for listener in this architecture)
    const message: Message = {
      id: '', // Will be set by Firestore
      senderId: currentUserId,
      receiverId: recipientId,
      text: text.trim(),
      type: media ? media.type : 'text',
      isPing,
      timestamp: Date.now(),
      status: 'sent',
      mediaUrl: media?.url,
      fileName: media?.name
    };

    try {
      await sendMessage(chatId, message, recipientId);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      if (onError) onError(error as Error);
    }
  }, [chatId, currentUserId, recipientId, onError]);

  // Handle typing indicator
  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (!chatId || chatId === 'ai_bot') return;

    if (typing) {
      await setTypingStatus(chatId, currentUserId, true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing status after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(chatId, currentUserId, false);
      }, 3000);
    } else {
      await setTypingStatus(chatId, currentUserId, false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [chatId, currentUserId]);

  // Mark chat as read when user views it (Explicitly called in useEffect of UI)
  const markAsRead = useCallback(async () => {
    if (!chatId || chatId === 'ai_bot') return;
    
    // We access local storage for user preference if prop drill is too deep for hook, 
    // OR we default to true. Best approach is to pass it in via options, 
    // but here we will fetch fresh user object from local storage to check preference.
    let sendReceipt = true;
    try {
        const u = localStorage.getItem('bbm_user');
        if (u) {
            const user = JSON.parse(u);
            if (user.enableReadReceipts === false) sendReceipt = false;
        }
    } catch(e) {}

    await markChatRead(chatId, currentUserId, sendReceipt);
  }, [chatId, currentUserId]);

  return {
    messages,
    isTyping,
    chatData,
    loading,
    send,
    updateTypingStatus,
    markAsRead
  };
};

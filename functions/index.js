
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Send notification when new message is created
exports.sendMessageNotification = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const chatId = context.params.chatId;
    
    // Get chat document to find recipient
    const chatDoc = await admin.firestore()
      .collection('chats')
      .doc(chatId)
      .get();
    
    const chat = chatDoc.data();
    
    if (!chat) return;

    // Find recipient (the user who didn't send the message)
    // Assuming 1:1 chat for simplicity in this demo function
    const recipientId = chat.participants.find(id => id !== message.senderId);
    
    if (!recipientId) return;
    
    // Get recipient's user document
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(recipientId)
      .get();
    
    const user = userDoc.data();
    
    // Check if user has FCM tokens and notifications enabled
    if (!user.fcmTokens || user.fcmTokens.length === 0 || !user.notificationsEnabled) {
      return;
    }
    
    // Get sender's name
    const senderName = chat.participantDetails[message.senderId]?.name || 'BBM User';
    
    // Prepare notification payload
    const payload = {
      notification: {
        title: message.isPing ? `${senderName} sent you a PING!` : senderName,
        body: message.isPing ? 'PING!!!' : (message.text || 'Sent an attachment'),
        icon: '/icon.svg',
        clickAction: '/'
      },
      data: {
        chatId: chatId,
        senderId: message.senderId,
        type: 'message'
      }
    };
    
    // Send to all recipient's devices
    try {
      const response = await admin.messaging().sendToDevice(user.fcmTokens, payload);
      
      // Clean up invalid tokens
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Failure sending notification to', user.fcmTokens[index], error);
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(user.fcmTokens[index]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
          await admin.firestore().collection('users').doc(recipientId).update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
          });
      }

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });

// Send notification for friend requests
exports.sendFriendRequestNotification = functions.firestore
  .document('friend_requests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    
    // Get recipient's user document
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(request.toUserId)
      .get();
    
    const user = userDoc.data();
    
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0 || !user.notificationsEnabled) {
      return;
    }
    
    const payload = {
      notification: {
        title: 'New Friend Request',
        body: `${request.fromUser.name} wants to add you on BBM`,
        icon: '/icon.svg',
        clickAction: '/'
      },
      data: {
        type: 'friend_request',
        requestId: context.params.requestId
      }
    };
    
    try {
      await admin.messaging().sendToDevice(user.fcmTokens, payload);
    } catch (error) {
      console.error('Error sending friend request notification:', error);
    }
  });

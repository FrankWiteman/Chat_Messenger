
import { db } from './firebase';
import { collection, doc, onSnapshot, deleteDoc, addDoc, query, where, getDocs, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User, FriendRequest } from '../types';

export const subscribeToRoster = (currentUserId: string, callback: (contacts: User[]) => void) => {
    if (!db) return () => {};
    
    // 1. Listen to the roster subcollection to get the list of friend IDs
    const rosterRef = collection(db, 'users', currentUserId, 'roster');
    
    // Store unsubscribers for individual user listeners
    let userUnsubscribes: (() => void)[] = [];
    
    const unsubscribeRoster = onSnapshot(rosterRef, (snapshot) => {
        // Clear previous listeners to avoid duplicates/memory leaks when roster changes
        userUnsubscribes.forEach(unsub => unsub());
        userUnsubscribes = [];

        const friendIds = snapshot.docs.map(doc => doc.id);
        
        if (friendIds.length === 0) {
            callback([]);
            return;
        }

        const contactsMap = new Map<string, User>();
        // Initialize map with basic data from roster to prevent empty flash
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            // Convert timestamps if they exist
            let lastActive = data.lastActive;
            if (lastActive && typeof lastActive === 'object' && 'toMillis' in lastActive) {
                lastActive = lastActive.toMillis();
            }

            contactsMap.set(docSnap.id, { id: docSnap.id, ...data, lastActive } as User);
        });

        // 2. Set up a real-time listener for EACH friend's user document
        // This ensures status, music, and avatar changes are reflected instantly
        friendIds.forEach(friendId => {
            const userRef = doc(db, 'users', friendId);
            const unsub = onSnapshot(userRef, (userSnap) => {
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    let lastActive = data.lastActive;
                    if (lastActive && typeof lastActive === 'object' && 'toMillis' in lastActive) {
                        lastActive = lastActive.toMillis();
                    }

                    const userData = { ...data, id: userSnap.id, lastActive } as User;
                    contactsMap.set(friendId, userData);
                }
                
                // Emit updated list
                callback(Array.from(contactsMap.values()));
            });
            userUnsubscribes.push(unsub);
        });
    });

    return () => {
        unsubscribeRoster();
        userUnsubscribes.forEach(unsub => unsub());
    };
};

export const updateUserPresence = async (userId: string, isOnline: boolean) => {
    if (!db) return;
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            isOnline: isOnline,
            lastActive: serverTimestamp() // Use server timestamp for accuracy
        });
    } catch (e) {
        console.error("Error updating presence:", e);
    }
};

export const sendFriendRequest = async (currentUser: User, targetPin: string): Promise<{success: boolean, message: string}> => {
    if (!db) return { success: false, message: "Server connection lost" };

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('pin', '==', targetPin));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: false, message: "PIN not found in Global Directory" };
        }

        const targetUser = snapshot.docs[0].data() as User;

        if (targetUser.id === currentUser.id) {
            return { success: false, message: "You cannot add yourself" };
        }

        const requestsRef = collection(db, 'friend_requests');
        const q2 = query(
            requestsRef, 
            where('fromUser.id', '==', currentUser.id),
            where('toUserId', '==', targetUser.id)
        );
        const existing = await getDocs(q2);
        if (!existing.empty) {
            return { success: false, message: "Request already pending" };
        }

        await addDoc(collection(db, 'friend_requests'), {
            fromUser: currentUser,
            toUserId: targetUser.id,
            toUserName: targetUser.name, 
            toUserPin: targetUser.pin,
            status: 'pending',
            timestamp: Date.now()
        });

        return { success: true, message: `Request sent to ${targetUser.name}` };

    } catch (e: any) {
        console.error("sendFriendRequest Error:", e);
        return { success: false, message: e.message || "Error sending request" };
    }
};

export const respondToFriendRequest = async (request: FriendRequest, action: 'accepted' | 'ignored', currentUser: User) => {
    if (!db) return;

    try {
        if (action === 'accepted') {
            const batch = writeBatch(db);

            // 1. Add friend to MY roster (The person accepting the request)
            const myRosterRef = doc(db, 'users', currentUser.id, 'roster', request.fromUser.id);
            batch.set(myRosterRef, request.fromUser);

            // 2. Update the request status to 'accepted' and attach MY profile.
            const reqRef = doc(db, 'friend_requests', request.id);
            batch.update(reqRef, { 
                status: 'accepted',
                acceptedBy: currentUser 
            });

            await batch.commit();
        } else {
            await deleteDoc(doc(db, 'friend_requests', request.id));
        }
    } catch (e) {
        console.error("Error responding to request:", e);
    }
};

export const cancelFriendRequest = async (requestId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'friend_requests', requestId));
    } catch (e) {
        console.error("Error cancelling request:", e);
    }
};

export const subscribeToFriendRequests = (currentUserId: string, callback: (incoming: FriendRequest[], outgoing: FriendRequest[]) => void) => {
    if (!db) return () => {};

    const requestsRef = collection(db, 'friend_requests');
    
    // Incoming: Requests sent TO me
    const incomingQ = query(requestsRef, where('toUserId', '==', currentUserId));
    
    // Outgoing: Requests sent BY me
    const outgoingQ = query(requestsRef, where('fromUser.id', '==', currentUserId));

    let incoming: FriendRequest[] = [];
    let outgoing: FriendRequest[] = [];

    const unsubIncoming = onSnapshot(incomingQ, (snapshot) => {
        // Filter out 'accepted' requests from the UI immediately.
        // They will be deleted eventually by the sender's client logic (see below),
        // but we don't want to see them as pending in the meantime.
        incoming = snapshot.docs
            .map(d => ({ id: d.id, ...d.data(), type: 'incoming' } as FriendRequest))
            .filter(req => req.status === 'pending');
            
        callback(incoming, outgoing);
    });

    const unsubOutgoing = onSnapshot(outgoingQ, (snapshot) => {
        outgoing = snapshot.docs.map(d => {
            const data = d.data();
            
            // --- HANDSHAKE COMPLETION LOGIC ---
            // If I sent a request and the other person accepted it:
            if (data.status === 'accepted' && data.acceptedBy) {
                const completeHandshake = async () => {
                    try {
                        const batch = writeBatch(db);
                        
                        // 1. Add them to MY roster (The sender of the request)
                        const myRosterRef = doc(db, 'users', currentUserId, 'roster', data.acceptedBy.id);
                        batch.set(myRosterRef, data.acceptedBy);
                        
                        // 2. Delete the request document as the transaction is complete
                        const reqRef = doc(db, 'friend_requests', d.id);
                        batch.delete(reqRef);
                        
                        await batch.commit();
                    } catch (e) {
                        console.error("Error completing friend handshake:", e);
                    }
                };
                // Execute handshake
                completeHandshake();
            }

            return { 
                id: d.id, 
                fromUser: data.fromUser, 
                toUserId: data.toUserName || data.toUserPin,
                status: data.status,
                timestamp: data.timestamp,
                type: 'outgoing' 
            } as FriendRequest;
        });
        callback(incoming, outgoing);
    });

    return () => {
        unsubIncoming();
        unsubOutgoing();
    };
};

export const removeContactFromRoster = async (currentUserId: string, contactId: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'users', currentUserId, 'roster', contactId));
    } catch (e) {
        console.error("Error removing contact:", e);
    }
};

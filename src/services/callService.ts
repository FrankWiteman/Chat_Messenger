import SimplePeer from 'simple-peer';
import { ref, set, onValue, push, off, remove } from 'firebase/database';
import { database } from './firebase';

if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

export interface CallData {
  from: string;
  fromName?: string;
  fromAvatar?: string;
  to: string;
  type: 'voice' | 'video';
  signal?: any;
  answer?: any;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'busy';
  timestamp: number;
}

class CallService {
  public peer: SimplePeer.Instance | null = null;
  public localStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private recipientId: string | null = null;

  private dispatchError(msg: string) {
    console.error(`[BBM CALL ERROR] ${msg}`);
    window.dispatchEvent(new CustomEvent('bbm-call-error', { detail: msg }));
  }

  async startCall(
    fromUserId: string,
    fromUserName: string,
    fromUserAvatar: string,
    toUserId: string,
    callType: 'voice' | 'video',
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<{ stream: MediaStream, callId: string } | null> {
    
    // 1. Signaling Check
    if (!database) {
        this.dispatchError("Realtime Database not initialized. Call signaling requires RTDB.");
        return null;
    }

    // 2. Security Check
    if (!window.isSecureContext) {
        this.dispatchError("Insecure Context: WebRTC (Calls) requires HTTPS or localhost.");
        return null;
    }

    try {
      // 3. Media Permissions
      console.log("[BBM CALL] Requesting hardware access...");
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? { facingMode: 'user' } : false
      };

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("[BBM CALL] Hardware access granted.");
      } catch (mediaError: any) {
        this.dispatchError(`Permission Denied: ${mediaError.message}`);
        return null;
      }

      this.recipientId = toUserId;
      const callsRef = ref(database, `calls/${toUserId}`);
      const newCallRef = push(callsRef);
      this.currentCallId = newCallRef.key;

      // 4. Peer Initialization
      this.peer = new SimplePeer({
        initiator: true,
        stream: this.localStream,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('signal', async (signal: any) => {
        if (this.currentCallId) {
          try {
            console.log("[BBM CALL] Generating signal, writing to DB...");
            await set(ref(database, `calls/${toUserId}/${this.currentCallId}`), {
                from: fromUserId,
                fromName: fromUserName,
                fromAvatar: fromUserAvatar,
                to: toUserId,
                type: callType,
                status: 'ringing',
                signal: JSON.stringify(signal),
                timestamp: Date.now()
              });
            console.log("[BBM CALL] Signal written successfully.");
          } catch (dbErr: any) {
              this.dispatchError(`Signaling Failed: ${dbErr.message}. Verify Database Rules and URL.`);
          }
        }
      });

      this.peer.on('stream', (stream: MediaStream) => {
        console.log("[BBM CALL] Remote stream received.");
        onRemoteStream(stream);
      });

      this.peer.on('error', (err: Error) => {
        this.dispatchError(`Connection Error: ${err.message}`);
        this.cleanup();
      });

      // 5. Remote Handshake Listeners
      const answerPath = `calls/${toUserId}/${this.currentCallId}/answer`;
      onValue(ref(database, answerPath), (snapshot) => {
        const answer = snapshot.val();
        if (answer && this.peer && !this.peer.destroyed) {
          try {
            this.peer.signal(JSON.parse(answer));
          } catch (e) {
            console.error("Signal parse error", e);
          }
        }
      });

      const statusPath = `calls/${toUserId}/${this.currentCallId}/status`;
      onValue(ref(database, statusPath), (snapshot) => {
        const status = snapshot.val();
        if (status === 'rejected' || status === 'ended') {
          this.cleanup();
        }
      });

      return { stream: this.localStream, callId: this.currentCallId! };
    } catch (e: any) {
      this.dispatchError(e.message || "Failed to initialize call service.");
      return null;
    }
  }

  async answerCall(
    callId: string,
    myUserId: string,
    callData: CallData,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<MediaStream | null> {
    if (!database) return null;

    try {
      const constraints = {
        video: callData.type === 'video' ? { facingMode: 'user' } : false,
        audio: true
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentCallId = callId;
      this.recipientId = callData.from;

      this.peer = new SimplePeer({
        initiator: false,
        stream: this.localStream,
        trickle: false
      });

      if (callData.signal) {
        this.peer.signal(JSON.parse(callData.signal));
      }

      this.peer.on('signal', async (signal: any) => {
        await set(ref(database, `calls/${myUserId}/${callId}/answer`), JSON.stringify(signal));
        await set(ref(database, `calls/${myUserId}/${callId}/status`), 'accepted');
      });

      this.peer.on('stream', (stream: MediaStream) => {
        onRemoteStream(stream);
      });

      return this.localStream;
    } catch (e: any) {
      console.error("[BBM CALL] Answer Failed:", e);
      return null;
    }
  }

  listenForCalls(userId: string, onIncomingCall: (call: CallData, callId: string) => void) {
    if (!database) return () => {};
    const callsRef = ref(database, `calls/${userId}`);
    const unsubscribe = onValue(callsRef, (snapshot) => {
      snapshot.forEach((child) => {
        const call = child.val();
        const callId = child.key;
        // Only notify for fresh ringing calls (within last 60 seconds)
        if (call.status === 'ringing' && (Date.now() - call.timestamp < 60000)) {
          onIncomingCall(call, callId!);
        }
      });
    });
    return () => off(callsRef, 'value', unsubscribe);
  }

  async rejectCall(userId: string, callId: string) {
    if (!database) return;
    await set(ref(database, `calls/${userId}/${callId}/status`), 'rejected');
    // Auto-clean after 5s
    setTimeout(() => remove(ref(database, `calls/${userId}/${callId}`)), 5000);
  }

  endCall(userId: string, callId?: string) {
    const id = callId || this.currentCallId;
    if (database && id) {
      set(ref(database, `calls/${userId}/${id}/status`), 'ended').catch(() => {});
      if (this.recipientId) {
        set(ref(database, `calls/${this.recipientId}/${id}/status`), 'ended').catch(() => {});
      }
      setTimeout(() => remove(ref(database, `calls/${userId}/${id}`)), 5000);
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.currentCallId = null;
    this.recipientId = null;
    window.dispatchEvent(new CustomEvent('bbm-call-ended'));
  }

  toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !muted);
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = enabled);
    }
  }
}

export const callService = new CallService();
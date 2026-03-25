/**
 * BBM Call Service — Native WebRTC (no simple-peer)
 *
 * Why native WebRTC instead of simple-peer:
 * - simple-peer requires Node.js globals (process, Buffer) that break in PWA/iOS Safari
 * - Native RTCPeerConnection works in all browsers including iOS Safari 11+
 * - Full control over ICE restart, trickle ICE, and TURN fallback
 *
 * Architecture:
 * - Firebase Realtime Database is the signaling channel
 * - Trickle ICE for fast connection (candidates sent as they arrive)
 * - Free TURN servers as fallback for symmetric NAT
 */

import { ref, set, onValue, push, off, remove, get } from 'firebase/database';
import { database } from './firebase';

// ============================================================================
// Types
// ============================================================================
export interface CallData {
  from: string;
  fromName?: string;
  fromAvatar?: string;
  to: string;
  type: 'voice' | 'video';
  offer?: string;        // JSON-stringified RTCSessionDescriptionInit
  answer?: string;       // JSON-stringified RTCSessionDescriptionInit
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'busy';
  timestamp: number;
}

type CallEventHandler = (event: string, detail?: any) => void;

// ============================================================================
// ICE Server config — STUN + free TURN fallback
// Open relay TURN servers work for most NAT scenarios
// For production replace with your own Twilio/Xirsys TURN credentials
// ============================================================================
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  {
    urls: 'turn:a.relay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:a.relay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:a.relay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// ============================================================================
// CallService
// ============================================================================
class CallService {
  public localStream: MediaStream | null = null;
  private pc: RTCPeerConnection | null = null;
  private currentCallId: string | null = null;
  private myUserId: string | null = null;
  private recipientId: string | null = null;
  private onEventHandler: CallEventHandler | null = null;
  private iceCandidatesBuffer: RTCIceCandidate[] = [];
  private remoteDescriptionSet = false;
  private callListenerUnsubscribe: (() => void) | null = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Outgoing call — caller side
   */
  async startCall(
    fromUserId: string,
    fromUserName: string,
    fromUserAvatar: string,
    toUserId: string,
    callType: 'voice' | 'video',
    onRemoteStream: (stream: MediaStream) => void,
    onEvent?: CallEventHandler
  ): Promise<{ stream: MediaStream; callId: string } | null> {
    this.onEventHandler = onEvent || null;

    if (!database) {
      this._emit('error', 'Realtime Database not configured. Check your Firebase setup.');
      return null;
    }

    if (!window.isSecureContext) {
      this._emit('error', 'HTTPS required for calls. Make sure you\'re on https://');
      return null;
    }

    try {
      // Get media
      this.localStream = await this._getMedia(callType);
      if (!this.localStream) return null;

      this.myUserId = fromUserId;
      this.recipientId = toUserId;

      // Create call record in RTDB
      const callsRef = ref(database, `calls/${toUserId}`);
      const newCallRef = push(callsRef);
      this.currentCallId = newCallRef.key!;

      // Set up PeerConnection
      this.pc = this._createPC(onRemoteStream);

      // Add local tracks
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));

      // Create offer
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await this.pc.setLocalDescription(offer);

      // Write initial call record
      await set(newCallRef, {
        from: fromUserId,
        fromName: fromUserName,
        fromAvatar: fromUserAvatar,
        to: toUserId,
        type: callType,
        offer: JSON.stringify(offer),
        status: 'ringing',
        timestamp: Date.now(),
      } as CallData);

      // Listen for answer
      const answerRef = ref(database, `calls/${toUserId}/${this.currentCallId}/answer`);
      onValue(answerRef, async (snap) => {
        const answerStr = snap.val();
        if (answerStr && this.pc && this.pc.signalingState !== 'stable') {
          try {
            const answer = JSON.parse(answerStr);
            await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
            this.remoteDescriptionSet = true;
            this._flushIceCandidates(toUserId, this.currentCallId!);
          } catch (e) {
            console.error('[BBM Call] Answer parse error', e);
          }
        }
      });

      // Listen for status changes
      const statusRef = ref(database, `calls/${toUserId}/${this.currentCallId}/status`);
      onValue(statusRef, (snap) => {
        const status = snap.val();
        if (status === 'rejected') { this._emit('rejected'); this.cleanup(); }
        if (status === 'ended') { this._emit('ended'); this.cleanup(); }
      });

      // Listen for remote ICE candidates
      this._listenForRemoteICE(toUserId, this.currentCallId, 'callee');

      return { stream: this.localStream, callId: this.currentCallId };
    } catch (e: any) {
      this._emit('error', e.message || 'Failed to start call');
      this.cleanup();
      return null;
    }
  }

  /**
   * Answer incoming call — callee side
   */
  async answerCall(
    callId: string,
    myUserId: string,
    callData: CallData,
    onRemoteStream: (stream: MediaStream) => void,
    onEvent?: CallEventHandler
  ): Promise<MediaStream | null> {
    this.onEventHandler = onEvent || null;

    if (!database) return null;

    try {
      this.localStream = await this._getMedia(callData.type);
      if (!this.localStream) return null;

      this.myUserId = myUserId;
      this.currentCallId = callId;
      this.recipientId = callData.from;

      this.pc = this._createPC(onRemoteStream);
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));

      // Set remote description (the offer)
      const offer = JSON.parse(callData.offer!);
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      this.remoteDescriptionSet = true;

      // Create answer
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      // Write answer + accepted status
      await set(ref(database, `calls/${myUserId}/${callId}/answer`), JSON.stringify(answer));
      await set(ref(database, `calls/${myUserId}/${callId}/status`), 'accepted');

      // Flush any buffered ICE candidates
      this._flushIceCandidates(myUserId, callId);

      // Listen for remote ICE candidates (from caller)
      this._listenForRemoteICE(myUserId, callId, 'caller');

      // Listen for call end
      const statusRef = ref(database, `calls/${myUserId}/${callId}/status`);
      onValue(statusRef, (snap) => {
        const status = snap.val();
        if (status === 'ended') { this._emit('ended'); this.cleanup(); }
      });

      return this.localStream;
    } catch (e: any) {
      console.error('[BBM Call] Answer failed:', e);
      this._emit('error', e.message);
      this.cleanup();
      return null;
    }
  }

  /**
   * Listen for incoming calls
   */
  listenForCalls(
    userId: string,
    onIncomingCall: (call: CallData, callId: string) => void
  ): () => void {
    if (!database) return () => {};

    const callsRef = ref(database, `calls/${userId}`);
    const handler = onValue(callsRef, (snapshot) => {
      snapshot.forEach((child) => {
        const call = child.val() as CallData;
        const callId = child.key!;
        // Fresh ringing calls only (within last 60s)
        if (call.status === 'ringing' && Date.now() - call.timestamp < 60000) {
          onIncomingCall(call, callId);
        }
      });
    });

    this.callListenerUnsubscribe = () => off(callsRef, 'value', handler);
    return this.callListenerUnsubscribe;
  }

  async rejectCall(userId: string, callId: string) {
    if (!database) return;
    await set(ref(database, `calls/${userId}/${callId}/status`), 'rejected');
    setTimeout(() => remove(ref(database, `calls/${userId}/${callId}`)), 5000);
  }

  endCall(userId?: string, callId?: string) {
    const uid = userId || this.myUserId;
    const cid = callId || this.currentCallId;
    if (database && uid && cid) {
      set(ref(database, `calls/${uid}/${cid}/status`), 'ended').catch(() => {});
      if (this.recipientId) {
        set(ref(database, `calls/${this.recipientId}/${cid}/status`), 'ended').catch(() => {});
      }
      setTimeout(() => {
        if (uid) remove(ref(database, `calls/${uid}/${cid}`)).catch(() => {});
      }, 5000);
    }
    this.cleanup();
  }

  toggleMute(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _getMedia(callType: 'voice' | 'video'): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video'
          ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e: any) {
      let msg = 'Microphone/camera access denied.';
      if (e.name === 'NotFoundError') msg = 'No microphone or camera found on this device.';
      if (e.name === 'NotAllowedError') msg = 'Permission denied. Please allow mic/camera in your browser settings.';
      if (e.name === 'NotReadableError') msg = 'Camera/mic is in use by another app.';
      this._emit('error', msg);
      return null;
    }
  }

  private _createPC(onRemoteStream: (stream: MediaStream) => void): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Send local ICE candidates to remote via RTDB
    pc.onicecandidate = (event) => {
      if (!event.candidate || !database || !this.currentCallId) return;

      if (this.remoteDescriptionSet && this.recipientId) {
        // Send directly
        const candidatesRef = ref(
          database,
          `calls/${this.recipientId}/${this.currentCallId}/candidates/${this.myUserId}`
        );
        push(candidatesRef, JSON.stringify(event.candidate)).catch(() => {});
      } else {
        // Buffer until remote description is set
        this.iceCandidatesBuffer.push(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[BBM Call] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') this._emit('connected');
      if (pc.connectionState === 'failed') {
        this._emit('error', 'Connection failed. Check network or try again.');
        this.cleanup();
      }
      if (pc.connectionState === 'disconnected') {
        // Give it 5s to reconnect before giving up
        setTimeout(() => {
          if (this.pc?.connectionState === 'disconnected') {
            this._emit('error', 'Call disconnected.');
            this.cleanup();
          }
        }, 5000);
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) onRemoteStream(stream);
    };

    return pc;
  }

  private async _flushIceCandidates(recipientId: string, callId: string) {
    if (!database || this.iceCandidatesBuffer.length === 0) return;
    const candidatesRef = ref(
      database,
      `calls/${recipientId}/${callId}/candidates/${this.myUserId}`
    );
    for (const candidate of this.iceCandidatesBuffer) {
      await push(candidatesRef, JSON.stringify(candidate)).catch(() => {});
    }
    this.iceCandidatesBuffer = [];
  }

  private _listenForRemoteICE(
    userId: string,
    callId: string,
    remoteRole: 'caller' | 'callee'
  ) {
    if (!database) return;
    // The remote side writes candidates under their own userId key
    // We listen under the path of the OTHER user's candidates
    const remoteUserId = remoteRole === 'caller' ? this.recipientId : this.myUserId;
    if (!remoteUserId) return;

    // Actually we need to listen to the sender's side
    // Caller writes to calls/${toUserId}/${callId}/candidates/${fromUserId}
    // Callee reads from calls/${myUserId}/${callId}/candidates/${callData.from}
    const senderKey = remoteRole === 'callee' ? this.recipientId : this.myUserId;
    const candidatesRef = ref(database, `calls/${userId}/${callId}/candidates/${senderKey}`);

    onValue(candidatesRef, async (snapshot) => {
      if (!this.pc) return;
      snapshot.forEach((child) => {
        const candidateStr = child.val();
        if (candidateStr) {
          try {
            const candidate = JSON.parse(candidateStr);
            this.pc!.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          } catch {}
        }
      });
    });
  }

  private _emit(event: string, detail?: any) {
    if (this.onEventHandler) this.onEventHandler(event, detail);
    if (event === 'error') {
      console.error('[BBM Call Error]', detail);
      window.dispatchEvent(new CustomEvent('bbm-call-error', { detail }));
    }
    if (event === 'ended' || event === 'rejected') {
      window.dispatchEvent(new CustomEvent('bbm-call-ended'));
    }
  }

  cleanup() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;

    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    this.currentCallId = null;
    this.recipientId = null;
    this.myUserId = null;
    this.remoteDescriptionSet = false;
    this.iceCandidatesBuffer = [];
    window.dispatchEvent(new CustomEvent('bbm-call-ended'));
  }
}

export const callService = new CallService();

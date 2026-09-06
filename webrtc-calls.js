import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, onValue, push, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';

const app = getApps()[0];
if (!app) throw new Error('Firebase doit être initialisé avant webrtc-calls.js');

const auth = getAuth(app);
const db = getDatabase(app, 'https://vibe-749e5-default-rtdb.firebaseio.com');
let user = null;
let pc = null;
let localStream = null;
let callId = null;
let stopCall = null;
let stopCallCandidates = null;
let stopIncoming = null;
let remoteUid = null;
let remoteDescriptionReady = false;
const pendingCandidates = [];

const $ = selector => document.querySelector(selector);

function activeChatId() {
  return document.querySelector('.conversation.active')?.dataset.chat || null;
}

function toast(text) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = text;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2800);
}

function peerUid(id) {
  return get(ref(db, `chatMembers/${id}`)).then(snapshot => {
    const members = snapshot.val() || {};
    return Object.keys(members).find(uid => uid !== user?.uid) || null;
  });
}

function ensurePanel(video) {
  let panel = document.querySelector('#vibeCallPanel');
  if (panel) {
    const remote = $('#vibeRemoteVideo');
    if (remote) remote.style.display = video ? 'block' : 'none';
    return panel;
  }
  panel = document.createElement('div');
  panel.id = 'vibeCallPanel';
  panel.style = 'position:fixed;inset:18px;z-index:10000;background:rgba(12,12,16,.96);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:12px;color:#fff;font-family:inherit;box-shadow:0 25px 80px rgba(0,0,0,.5)';
  panel.innerHTML = `<div id="vibeCallState">Connexion…</div><video id="vibeRemoteVideo" autoplay playsinline style="width:100%;height:100%;max-height:70vh;object-fit:contain;border-radius:14px;background:#08080a"></video><div style="display:flex;justify-content:center;gap:10px"><button id="vibeHangup" type="button">Raccrocher</button></div>`;
  document.body.appendChild(panel);
  if (!video) $('#vibeRemoteVideo').style.display = 'none';
  $('#vibeHangup').addEventListener('click', () => endCall());
  return panel;
}

function setState(text) {
  const element = $('#vibeCallState');
  if (element) element.textContent = text;
}

async function flushPendingCandidates() {
  if (!pc || !remoteDescriptionReady) return;
  while (pendingCandidates.length) {
    const candidate = pendingCandidates.shift();
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      console.warn('ICE candidate ignoré:', error);
    }
  }
}

function watchCandidates(id, remoteUidToWatch) {
  return onValue(ref(db, `calls/${id}/candidates/${remoteUidToWatch}`), snapshot => {
    const candidates = snapshot.val() || {};
    for (const candidate of Object.values(candidates)) {
      if (!candidate || !pc) continue;
      const rtcCandidate = new RTCIceCandidate(candidate);
      if (remoteDescriptionReady) {
        pc.addIceCandidate(rtcCandidate).catch(error => console.warn('ICE:', error));
      } else {
        pendingCandidates.push(rtcCandidate);
      }
    }
  });
}

async function setupPeer(id, isCaller, kind) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('La caméra et le microphone ne sont pas disponibles dans ce navigateur.');
  }

  pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  pc.onconnectionstatechange = () => {
    if (!pc) return;
    if (pc.connectionState === 'connected') setState('Appel connecté.');
    if (pc.connectionState === 'disconnected') setState('Connexion interrompue…');
    if (pc.connectionState === 'failed') {
      setState('Connexion échouée.');
      toast('La connexion WebRTC a échoué.');
      endCall();
    }
    if (pc.connectionState === 'closed') endCall();
  };

  pc.oniceconnectionstatechange = () => {
    if (!pc) return;
    if (pc.iceConnectionState === 'failed') toast('Connexion réseau de l’appel impossible.');
  };

  pc.ontrack = event => {
    const remote = $('#vibeRemoteVideo');
    if (!remote) return;
    remote.style.display = kind === 'video' ? 'block' : 'none';
    if (event.streams?.[0]) remote.srcObject = event.streams[0];
  };

  pc.onicecandidate = event => {
    if (!event.candidate || !callId || !user) return;
    const candidateRef = push(ref(db, `calls/${callId}/candidates/${user.uid}`));
    set(candidateRef, event.candidate.toJSON()).catch(error => console.warn('Publication ICE:', error));
  };

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  if (isCaller) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await update(ref(db, `calls/${id}`), {
      offer: { type: offer.type, sdp: offer.sdp }
    });
  } else {
    const snapshot = await get(ref(db, `calls/${id}`));
    const call = snapshot.val();
    if (!call?.offer) throw new Error('Offre WebRTC absente.');
    await pc.setRemoteDescription(call.offer);
    remoteDescriptionReady = true;
    await flushPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await update(ref(db, `calls/${id}`), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'accepted'
    });
  }

  return pc;
}

async function startCall(kind) {
  if (!user) return toast('Connexion requise.');
  if (callId || pc) return toast('Un appel est déjà en cours.');

  const id = activeChatId();
  if (!id || id.startsWith('demo-')) return toast('Ouvrez une discussion synchronisée.');

  const callee = await peerUid(id);
  if (!callee) return toast('Aucun autre membre dans cette discussion.');

  callId = push(ref(db, 'calls')).key;
  remoteUid = callee;
  remoteDescriptionReady = false;
  pendingCandidates.length = 0;
  ensurePanel(kind === 'video');
  setState(`Appel ${kind === 'video' ? 'vidéo' : 'audio'} vers le contact…`);

  try {
    await set(ref(db, `calls/${callId}`), {
      callerUid: user.uid,
      calleeUid: callee,
      chatId: id,
      kind,
      status: 'ringing',
      createdAt: serverTimestamp()
    });

    await setupPeer(callId, true, kind);

    await set(ref(db, `incomingCalls/${callee}/${callId}`), {
      callerUid: user.uid,
      chatId: id,
      kind,
      createdAt: serverTimestamp()
    });

    stopCall = onValue(ref(db, `calls/${callId}`), async snapshot => {
      const call = snapshot.val() || {};
      if (call.status === 'ended' || call.status === 'rejected') {
        await endCall(false);
        return;
      }
      if (call.answer && pc && !pc.currentRemoteDescription) {
        try {
          await pc.setRemoteDescription(call.answer);
          remoteDescriptionReady = true;
          await flushPendingCandidates();
          setState('Appel connecté.');
        } catch (error) {
          console.warn('Réponse WebRTC:', error);
        }
      }
    });

    stopCallCandidates = watchCandidates(callId, callee);
    setState('Appel en attente…');
  } catch (error) {
    toast(`Appel impossible : ${error.message}`);
    await endCall();
  }
}

async function acceptIncoming(id, kind) {
  if (!user || callId || pc) return;

  callId = id;
  remoteDescriptionReady = false;
  pendingCandidates.length = 0;
  ensurePanel(kind === 'video');
  setState('Connexion à l’appel…');

  try {
    const snapshot = await get(ref(db, `calls/${id}`));
    const call = snapshot.val();
    if (!call || call.calleeUid !== user.uid || call.status === 'ended') {
      await endCall(false);
      return;
    }

    remoteUid = call.callerUid;
    await setupPeer(id, false, kind);
    stopCallCandidates = watchCandidates(id, call.callerUid);

    stopCall = onValue(ref(db, `calls/${id}`), snapshot2 => {
      const updated = snapshot2.val();
      if (!updated || updated.status === 'ended' || updated.status === 'rejected') endCall(false);
    });

    await remove(ref(db, `incomingCalls/${user.uid}/${id}`));
    setState('Appel connecté.');
  } catch (error) {
    toast(`Appel impossible : ${error.message}`);
    await endCall();
  }
}

async function endCall(writeEnded = true) {
  const currentCallId = callId;
  const currentUser = user;

  if (stopCall) stopCall();
  if (stopCallCandidates) stopCallCandidates();
  stopCall = null;
  stopCallCandidates = null;

  if (writeEnded && currentCallId && currentUser) {
    try {
      await update(ref(db, `calls/${currentCallId}`), {
        status: 'ended',
        endedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('Fin d’appel:', error);
    }
    try {
      await remove(ref(db, `incomingCalls/${currentUser.uid}/${currentCallId}`));
    } catch {}
    if (remoteUid) {
      try {
        await remove(ref(db, `incomingCalls/${remoteUid}/${currentCallId}`));
      } catch {}
    }
  }

  if (localStream) localStream.getTracks().forEach(track => track.stop());
  if (pc) pc.close();
  pc = null;
  localStream = null;
  callId = null;
  remoteUid = null;
  remoteDescriptionReady = false;
  pendingCandidates.length = 0;
  document.querySelector('#vibeCallPanel')?.remove();
}

function watchIncoming() {
  if (!user) return;
  if (stopIncoming) stopIncoming();
  stopIncoming = onValue(ref(db, `incomingCalls/${user.uid}`), async snapshot => {
    for (const [id, call] of Object.entries(snapshot.val() || {})) {
      if (!call || document.querySelector('#vibeCallPanel') || callId) continue;
      const accepted = confirm(`Appel ${call.kind === 'video' ? 'vidéo' : 'audio'} entrant. Accepter ?`);
      if (accepted) await acceptIncoming(id, call.kind);
      else await remove(ref(db, `incomingCalls/${user.uid}/${id}`));
    }
  });
}

onAuthStateChanged(auth, current => {
  user = current;
  if (!user) {
    if (stopIncoming) stopIncoming();
    stopIncoming = null;
    endCall(false);
    return;
  }
  watchIncoming();
});

document.addEventListener('click', event => {
  const button = event.target.closest('.chat-actions .glass-btn');
  if (!button || button.id === 'chatMenuBtn') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  startCall(button.title === 'Appel vidéo' ? 'video' : 'audio');
}, true);

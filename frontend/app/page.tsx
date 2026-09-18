"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { User } from "firebase/auth";
import {
  completeGoogleRedirect,
  firebaseErrorMessage,
  getIdToken,
  logout,
  subscribeToAuth,
  signInWithGoogle,
} from "../services/firebase";
import { syncFirebaseUser } from "../services/auth-sync";
import { uploadMedia, type UploadedMedia } from "../services/cloudinary";
import { VibeRealtime, type RealtimeEvent } from "../services/realtime";
import { registerPushDevice } from "../services/push";

type Contact = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  photo_url?: string | null;
  about?: string | null;
};

type Conversation = {
  id: string;
  type: "direct" | "group" | "channel" | string;
  created_at?: string;
  updated_at?: string;
};

type Attachment = {
  id: string;
  url: string;
  resource_type: "image" | "video" | "raw";
  mime_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
};

type Message = {
  id: string;
  sender_id: string;
  type: string;
  text?: string | null;
  created_at?: string;
  client_message_id?: string | null;
  attachments?: Attachment[];
};

type Status = {
  id: string;
  user_id: string;
  text?: string | null;
  media_id?: string | null;
  created_at?: string;
  expires_at?: string;
};

type Group = {
  conversation_id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  photo_url?: string | null;
};

type Channel = {
  conversation_id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  photo_url?: string | null;
  is_public: boolean;
  subscribed?: boolean;
};

type Settings = {
  user_id: string;
  theme: "light" | "dark" | "system" | string;
  notifications_enabled: boolean;
  read_receipts_enabled: boolean;
  last_seen_visibility: "contacts" | "everyone" | string;
  status_visibility: "contacts" | "everyone" | string;
};

type ApiError = Error & { status?: number };

const API_URL =\n  process.env.NEXT_PUBLIC_API_URL?.replace(/\\/$/, "") ||\n  (typeof window !== "undefined" && window.location.hostname === "localhost"\n    ? "http://localhost:8000/api/v1"\n    : "");

async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) throw new Error("Serveur VIBE non configuré pour cette version Web.");
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: "Bearer " + token,
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = "Erreur API";
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {}
    const error = new Error(detail) as ApiError;
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

function nameOf(contact?: Contact | null) {
  return contact?.display_name ?? contact?.username ?? "Utilisateur VIBE";
}

function initials(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "V";
}

function timeOf(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTypeFromFile(file: File): "image" | "video" | "audio" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function attachmentElement(attachment: Attachment) {
  if (attachment.resource_type === "image") {
    return (
      <img
        src={attachment.url}
        alt="Média VIBE"
        className="message-media-image"
        loading="lazy"
      />
    );
  }
  if (attachment.resource_type === "video") {
    return (
      <video
        src={attachment.url}
        controls
        playsInline
        preload="metadata"
        className="message-media-video"
      />
    );
  }
  return (
    <a
      className="message-media-file"
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
    >
      📎 Ouvrir le fichier
    </a>
  );
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");
  const [backendError, setBackendError] = useState("");
  const [busy, setBusy] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"chat" | "statuses" | "groups" | "channels" | "settings">("chat");
  const [statusText, setStatusText] = useState("");
  const [groupName, setGroupName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [realtimeState, setRealtimeState] = useState<"connecting" | "connected" | "closed">("closed");

  const messageFileRef = useRef<HTMLInputElement | null>(null);
  const statusFileRef = useRef<HTMLInputElement | null>(null);
  const realtimeRef = useRef<VibeRealtime | null>(null);

  const runWithToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>) => {
      const token = await getIdToken();
      if (!token) throw new Error("Session Firebase introuvable.");
      return fn(token);
    },
    [],
  );

  const loadAll = useCallback(async () => {
    if (!user || !API_URL) {\n      if (user) setBackendError("Serveur VIBE non configuré. Définis NEXT_PUBLIC_API_URL pour cette version.");\n      return;\n    }
    try {
      setBackendError("");
      const token = await getIdToken();
      if (!token) return;

      await syncFirebaseUser(token);

      const results = await Promise.allSettled([
        apiRequest<{ contacts: Contact[] }>("/contacts", token),
        apiRequest<{ conversations: Conversation[] }>("/conversations", token),
        apiRequest<{ statuses: Status[] }>("/statuses", token),
        apiRequest<{ groups: Group[] }>("/groups", token),
        apiRequest<{ channels: Channel[] }>("/channels", token),
        apiRequest<{ settings: Settings }>("/settings", token),
      ]);

      const [contactResult, conversationResult, statusResult, groupResult, channelResult, settingsResult] =
        results;

      if (contactResult.status === "fulfilled") setContacts(contactResult.value.contacts);
      if (conversationResult.status === "fulfilled") setConversations(conversationResult.value.conversations);
      if (statusResult.status === "fulfilled") setStatuses(statusResult.value.statuses);
      if (groupResult.status === "fulfilled") setGroups(groupResult.value.groups);
      if (channelResult.status === "fulfilled") setChannels(channelResult.value.channels);
      if (settingsResult.status === "fulfilled") setSettings(settingsResult.value.settings);

      const rejected = results.find(
        (item): item is PromiseRejectedResult => item.status === "rejected",
      );
      if (rejected) {
        setBackendError(
          rejected.reason instanceof Error
            ? rejected.reason.message
            : "Une partie des données VIBE n'a pas pu être chargée.",
        );
      }
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Serveur VIBE indisponible.");
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      const data = await runWithToken((token) =>
        apiRequest<{ messages: Message[] }>(
          "/conversations/" + conversationId + "/messages?limit=100",
          token,
        ),
      );
      setMessages(data.messages);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Messages indisponibles.");
    }
  }, [runWithToken, user]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuth((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setAuthReady(true);
      setAuthError("");
    });

    completeGoogleRedirect().catch((error) => {
      if (active) {
        setAuthError(firebaseErrorMessage(error));
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadAll();
    if (API_URL) {
      void runWithToken((token) =>
        registerPushDevice(token).catch(() => null),
      );
    }
  }, [loadAll, runWithToken, user]);

  useEffect(() => {
    if (!selectedConversation) {
      realtimeRef.current?.stop();
      realtimeRef.current = null;
      setRealtimeState("closed");
      setMessages([]);
      return;
    }

    void loadMessages(selectedConversation);
    let cancelled = false;

    void (async () => {
      const token = await getIdToken();
      if (!token || !API_URL || cancelled) return;

      realtimeRef.current?.stop();
      const realtime = new VibeRealtime(
        API_URL,
        token,
        selectedConversation,
        (event: RealtimeEvent) => {
          if (event.type === "message.created" && event.message) {
            setMessages((current) => {
              const message = event.message as Message;
              if (current.some((item) => item.id === message.id)) return current;
              return [...current, message];
            });
          } else if (event.type === "message.updated" && event.message) {
            const message = event.message as Message;
            setMessages((current) =>
              current.map((item) => (item.id === message.id ? message : item)),
            );
          } else if (event.type === "message.deleted" && event.message_id) {
            setMessages((current) =>
              current.filter((item) => item.id !== event.message_id),
            );
          }
        },
        setRealtimeState,
      );
      realtimeRef.current = realtime;
      realtime.connect();
    })();

    return () => {
      cancelled = true;
      realtimeRef.current?.stop();
      realtimeRef.current = null;
    };
  }, [selectedConversation, loadMessages]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) =>
      nameOf(contact).toLowerCase().includes(term) ||
      String(contact.username ?? "").toLowerCase().includes(term),
    );
  }, [contacts, search]);

  async function handleGoogleLogin() {
    setBusy(true);
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(firebaseErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      realtimeRef.current?.stop();
      await logout();
      setContacts([]);
      setConversations([]);
      setMessages([]);
      setStatuses([]);
      setGroups([]);
      setChannels([]);
      setSelectedConversation(null);
      setSelectedContact(null);
    } finally {
      setBusy(false);
    }
  }

  async function openContact(contact: Contact) {
    setView("chat");
    setSelectedContact(contact);
    try {
      const data = await runWithToken((token) =>
        apiRequest<{ conversation: Conversation }>("/conversations/direct", token, {
          method: "POST",
          body: JSON.stringify({ user_id: contact.id }),
        }),
      );
      setSelectedConversation(data.conversation.id);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Conversation indisponible.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = messageText.trim();
    if (!value || !selectedConversation) return;
    setBusy(true);
    try {
      await runWithToken((token) =>
        apiRequest("/conversations/" + selectedConversation + "/messages", token, {
          method: "POST",
          body: JSON.stringify({
            type: "text",
            text: value,
            client_message_id: crypto.randomUUID(),
          }),
        }),
      );
      setMessageText("");
      await loadMessages(selectedConversation);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Message non envoyé.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMedia(file: File) {
    if (!selectedConversation) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Session Firebase introuvable.");
      const uploaded = await uploadMedia(file, token);
      const type = statusTypeFromFile(file);
      await apiRequest("/conversations/" + selectedConversation + "/messages", token, {
        method: "POST",
        body: JSON.stringify({
          type,
          text: null,
          media_ids: [uploaded.id],
          client_message_id: crypto.randomUUID(),
        }),
      });
      await loadMessages(selectedConversation);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Média non envoyé.");
    } finally {
      setBusy(false);
    }
  }

  async function createStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Session Firebase introuvable.");
      const file = statusFileRef.current?.files?.[0];
      let media: UploadedMedia | null = null;
      if (file) media = await uploadMedia(file, token);
      await apiRequest("/statuses", token, {
        method: "POST",
        body: JSON.stringify({ text: statusText.trim() || null, media_id: media?.id ?? null }),
      });
      setStatusText("");
      if (statusFileRef.current) statusFileRef.current.value = "";
      const refreshed = await apiRequest<{ statuses: Status[] }>("/statuses", token);
      setStatuses(refreshed.statuses);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Statut non publié.");
    } finally {
      setBusy(false);
    }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupName.trim()) return;
    setBusy(true);
    try {
      const data = await runWithToken((token) =>
        apiRequest<{ conversation_id: string }>("/groups", token, {
          method: "POST",
          body: JSON.stringify({ name: groupName.trim() }),
        }),
      );
      setGroupName("");
      setSelectedConversation(data.conversation_id);
      setView("chat");
      await loadAll();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Groupe non créé.");
    } finally {
      setBusy(false);
    }
  }

  async function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelName.trim()) return;
    setBusy(true);
    try {
      await runWithToken((token) =>
        apiRequest("/channels", token, {
          method: "POST",
          body: JSON.stringify({ name: channelName.trim(), is_public: true }),
        }),
      );
      setChannelName("");
      await loadAll();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Chaîne non créée.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleChannel(channel: Channel) {
    try {
      const method = channel.subscribed ? "DELETE" : "POST";
      await runWithToken((token) =>
        apiRequest(
          "/channels/" + channel.conversation_id + "/subscribe",
          token,
          { method },
        ),
      );
      await loadAll();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Impossible de modifier le suivi.");
    }
  }

  async function updateSettings(event: ChangeEvent<HTMLSelectElement>) {
    const theme = event.target.value;
    try {
      const data = await runWithToken((token) =>
        apiRequest<{ settings: Settings }>("/settings", token, {
          method: "PATCH",
          body: JSON.stringify({ theme }),
        }),
      );
      setSettings(data.settings);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Paramètres non enregistrés.");
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Supprimer définitivement le compte VIBE ?")) return;
    try {
      await runWithToken((token) =>
        apiRequest("/account/me", token, { method: "DELETE" }),
      );
      await handleSignOut();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Suppression du compte impossible.");
    }
  }

  if (!authReady) {
    return (
      <main className="vibe-app">
        <div className="auth-card">
          <div className="brand-mark">V</div>
          <h1>VIBE</h1>
          <p>Vérification de la session…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="vibe-app">
        <div className="auth-card">
          <div className="brand-mark">V</div>
          <div className="auth-kicker">MESSAGERIE</div>
          <h1>Bienvenue sur VIBE</h1>
          <p>Connecte-toi avec ton compte Google pour accéder à VIBE.</p>
          <button className="google-button" onClick={handleGoogleLogin} disabled={busy}>
            {busy ? "Connexion…" : "Continuer avec Google"}
          </button>
          {authError && <div className="error-box">{authError}</div>}
          <small>Les conversations, statuts et chaînes affichés après connexion proviennent des données VIBE réelles.</small>
        </div>
      </main>
    );
  }

  const selectedName = nameOf(selectedContact);

  return (
    <main className="vibe-app">
      <div className="vibe-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">V</div>
            <div>
              <div className="brand-name">VIBE</div>
              <div className="account-line">{user.displayName ?? user.email ?? "Compte connecté"}</div>
            </div>
          </div>

          <div className="search open">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher un contact"
            />
          </div>

          <div className="section-label">Conversations</div>
          <div className="contact-list">
            {filteredContacts.length === 0 ? (
              <div className="empty-sidebar">
                {API_URL ? "Aucun contact disponible." : "Serveur VIBE non configuré pour charger les contacts."}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  className={"contact" + (selectedContact?.id === contact.id ? " active" : "")}
                  key={contact.id}
                  onClick={() => void openContact(contact)}
                >
                  <div className="avatar">
                    {contact.photo_url ? (
                      <img src={contact.photo_url} alt="" className="avatar-image" />
                    ) : initials(nameOf(contact))}
                  </div>
                  <div className="contact-meta">
                    <div className="contact-name">{nameOf(contact)}</div>
                    <div className="contact-last">{contact.username ?? contact.about ?? "Compte VIBE"}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="section-label">VIBE</div>
          <button className={"contact" + (view === "statuses" ? " active" : "")} onClick={() => setView("statuses")}>
            <div className="avatar">◌</div>
            <div className="contact-meta"><div className="contact-name">Statuts</div><div className="contact-last">{statuses.length} statut(s)</div></div>
          </button>
          <button className={"contact" + (view === "groups" ? " active" : "")} onClick={() => setView("groups")}>
            <div className="avatar">G</div>
            <div className="contact-meta"><div className="contact-name">Groupes</div><div className="contact-last">{groups.length} groupe(s)</div></div>
          </button>
          <button className={"contact" + (view === "channels" ? " active" : "")} onClick={() => setView("channels")}>
            <div className="avatar">#</div>
            <div className="contact-meta"><div className="contact-name">Chaînes</div><div className="contact-last">{channels.length} chaîne(s)</div></div>
          </button>
          <button className={"contact" + (view === "settings" ? " active" : "")} onClick={() => setView("settings")}>
            <div className="avatar">⚙</div>
            <div className="contact-meta"><div className="contact-name">Paramètres</div><div className="contact-last">Compte et confidentialité</div></div>
          </button>
          <button className="logout-button" onClick={() => void handleSignOut()} disabled={busy}>Se déconnecter</button>
        </aside>

        <section className="main">
          {backendError && <div className="backend-banner">{backendError}</div>}

          {view === "chat" && (
            <div className="chat">
              <header className="chat-header">
                <div className="chat-person">
                  <div className="avatar">
                    {selectedContact?.photo_url ? <img src={selectedContact.photo_url} alt="" className="avatar-image" /> : initials(selectedConversation ? selectedName : "VIBE")}
                  </div>
                  <div>
                    <div className="chat-title">{selectedConversation ? selectedName : "VIBE"}</div>
                    <div className="chat-status">
                      {selectedConversation ? "Conversation VIBE" : "Sélectionne un contact"}
                      {selectedConversation && <> · temps réel {realtimeState}</>}
                    </div>
                  </div>
                </div>
                <div className="icon-row"><button className="icon-btn" onClick={() => setView("statuses")} aria-label="Statuts">◌</button><button className="icon-btn" onClick={() => setView("channels")} aria-label="Chaînes">#</button><button className="icon-btn" onClick={() => setView("settings")} aria-label="Paramètres">⚙</button></div>
              </header>

              <div className="messages">
                {!selectedConversation ? (
                  <div className="empty-state">
                    <div className="empty-symbol">V</div>
                    <h2>Ton espace VIBE</h2>
                    <p>Les contacts, conversations et messages sont chargés depuis le serveur après authentification.</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-symbol">◌</div>
                    <h2>Conversation vide</h2>
                    <p>Envoie le premier message.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div className={"message-row" + (message.sender_id === user.uid ? " me" : "")} key={message.id}>
                      <div className="bubble">
                        {message.attachments?.map((attachment) => (
                          <div className="message-attachment" key={attachment.id}>
                            {attachmentElement(attachment)}
                          </div>
                        ))}
                        {message.text && <div>{message.text}</div>}
                        <div className="bubble-meta">{timeOf(message.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="composer-wrap">
                <form className="composer" onSubmit={sendMessage}>
                  <button type="button" className="icon-btn" onClick={() => messageFileRef.current?.click()} aria-label="Joindre un média">＋</button>
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder={selectedConversation ? "Écrire un message…" : "Ouvre une conversation"}
                    disabled={!selectedConversation || busy}
                  />
                  <button className="send" disabled={!selectedConversation || !messageText.trim() || busy}>➤</button>
                </form>
                <input
                  ref={messageFileRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void sendMedia(file);
                  }}
                />
              </div>
            </div>
          )}

          {view === "statuses" && (
            <section className="feature-panel">
              <div className="feature-title"><div><div className="section-label">VIBE</div><h1>Statuts</h1><p>Les statuts réels de VIBE, avec expiration après 24 h.</p></div></div>
              <form className="feature-form" onSubmit={createStatus}>
                <textarea value={statusText} onChange={(event) => setStatusText(event.target.value)} placeholder="Écrire un statut…" />
                <input ref={statusFileRef} type="file" accept="image/*,video/*" />
                <button className="google-button" disabled={busy}>Publier le statut</button>
              </form>
              <div className="feature-list">
                {statuses.length === 0 ? <div className="empty-state">Aucun statut réel disponible.</div> : statuses.map((status) => (
                  <article className="feature-card" key={status.id}>
                    <strong>{status.text || "Statut média"}</strong>
                    <span>{timeOf(status.created_at)} · expire {status.expires_at ? new Date(status.expires_at).toLocaleString("fr-FR") : "—"}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === "groups" && (
            <section className="feature-panel">
              <div className="feature-title"><div><div className="section-label">VIBE</div><h1>Groupes</h1><p>Crée et gère les groupes réellement enregistrés dans PostgreSQL.</p></div></div>
              <form className="feature-form" onSubmit={createGroup}>
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Nom du groupe" />
                <button className="google-button" disabled={busy}>Créer le groupe</button>
              </form>
              <div className="feature-list">
                {groups.length === 0 ? <div className="empty-state">Aucun groupe réel.</div> : groups.map((group) => (
                  <button className="feature-card action-card" key={group.conversation_id} onClick={() => { setSelectedConversation(group.conversation_id); setView("chat"); }}>
                    <strong>{group.name}</strong><span>{group.description || "Groupe VIBE"}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {view === "channels" && (
            <section className="feature-panel">
              <div className="feature-title"><div><div className="section-label">Explorer</div><h1>Chaînes</h1><p>Création et suivi de chaînes réelles.</p></div></div>
              <form className="feature-form" onSubmit={createChannel}>
                <input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Nom de la chaîne" />
                <button className="google-button" disabled={busy}>Créer la chaîne</button>
              </form>
              <div className="feature-list">
                {channels.length === 0 ? <div className="empty-state">Aucune chaîne réelle.</div> : channels.map((channel) => (
                  <article className="feature-card" key={channel.conversation_id}>
                    <strong>{channel.name}</strong>
                    <span>{channel.description || "Chaîne VIBE"} · {channel.is_public ? "publique" : "privée"}</span>
                    <button className="logout-button" onClick={() => void toggleChannel(channel)}>{channel.subscribed ? "Ne plus suivre" : "Suivre"}</button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === "settings" && (
            <section className="feature-panel">
              <div className="feature-title"><div><div className="section-label">Compte</div><h1>Paramètres</h1><p>Préférences enregistrées dans VIBE.</p></div></div>
              <div className="settings-grid">
                <label>Thème<select value={settings?.theme ?? "light"} onChange={(event) => void updateSettings(event)}><option value="light">Clair</option><option value="dark">Sombre</option><option value="system">Système</option></select></label>
                <div className="feature-card"><strong>Notifications</strong><span>{settings?.notifications_enabled ? "Activées" : "Désactivées"}</span></div>
                <div className="feature-card"><strong>Accusés de lecture</strong><span>{settings?.read_receipts_enabled ? "Activés" : "Désactivés"}</span></div>
                <div className="feature-card"><strong>Visibilité du statut</strong><span>{settings?.status_visibility ?? "contacts"}</span></div>
              </div>
              <button className="danger-button" onClick={() => void deleteAccount()}>Supprimer mon compte</button>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

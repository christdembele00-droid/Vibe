"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  completeGoogleRedirect,
  firebaseErrorMessage,
  getIdToken,
  logout,
  subscribeToAuth,
  signInWithGoogle,
} from "../services/firebase";

type Contact = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  photo_url?: string | null;
};

type Conversation = {
  id: string;
  type: "direct" | "group" | "channel" | string;
  created_at?: string;
  updated_at?: string;
};

type Message = {
  id: string;
  sender_id: string;
  type: string;
  text?: string | null;
  created_at?: string;
  client_message_id?: string | null;
};

type ApiError = Error & { status?: number };

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("Serveur VIBE non configuré pour le Web public.");
  }

  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "V";
}

function formatTime(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<import("firebase/auth").User | null>(null);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [backendError, setBackendError] = useState("");
  const [menu, setMenu] = useState<"chat" | "settings" | "channels" | "statuses">("chat");

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

  const loadBackend = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken();
    if (!token || !API_URL) {
      setBackendError(
        "Connexion Firebase active. Le serveur VIBE n’est pas encore raccordé au Web public.",
      );
      return;
    }

    setBackendError("");
    try {
      const [contactData, conversationData] = await Promise.all([
        apiRequest<{ contacts: Contact[] }>("/contacts", token),
        apiRequest<{ conversations: Conversation[] }>("/conversations", token),
      ]);
      setContacts(contactData.contacts);
      setConversations(conversationData.conversations);
    } catch (error) {
      setBackendError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les données VIBE.",
      );
    }
  }, [user]);

  useEffect(() => {
    void loadBackend();
  }, [loadBackend]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const token = await getIdToken();
      if (!token || !API_URL) {
        setMessages([]);
        return;
      }
      try {
        const data = await apiRequest<{ messages: Message[] }>(
          "/conversations/" + conversationId + "/messages?limit=100",
          token,
        );
        setMessages(data.messages);
      } catch (error) {
        setBackendError(
          error instanceof Error ? error.message : "Impossible de charger les messages.",
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedConversation) void loadMessages(selectedConversation);
    else setMessages([]);
  }, [selectedConversation, loadMessages]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      (contact.display_name ?? contact.username ?? "").toLowerCase().includes(query),
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
      await logout();
      setContacts([]);
      setConversations([]);
      setMessages([]);
      setSelectedConversation(null);
      setSelectedContact(null);
    } finally {
      setBusy(false);
    }
  }

  async function openContact(contact: Contact) {
    setSelectedContact(contact);
    setMenu("chat");

    if (!user) return;
    const token = await getIdToken();
    if (!token || !API_URL) {
      setBackendError("Le serveur VIBE n’est pas configuré pour ouvrir une conversation réelle.");
      return;
    }

    try {
      const data = await apiRequest<{ conversation: Conversation }>("/conversations/direct", token, {
        method: "POST",
        body: JSON.stringify({ user_id: contact.id }),
      });
      setSelectedConversation(data.conversation.id);
      await loadBackend();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Conversation indisponible.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = messageText.trim();
    if (!value || !selectedConversation || !user) return;

    const token = await getIdToken();
    if (!token || !API_URL) {
      setBackendError("Le serveur VIBE n’est pas configuré : le message n’est pas envoyé.");
      return;
    }

    setBusy(true);
    try {
      await apiRequest(
        "/conversations/" + selectedConversation + "/messages",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            type: "text",
            text: value,
            client_message_id: crypto.randomUUID(),
          }),
        },
      );
      setMessageText("");
      await loadMessages(selectedConversation);
      await loadBackend();
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Message non envoyé.");
    } finally {
      setBusy(false);
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
          <p>Connecte-toi avec ton compte Google pour accéder à ton espace.</p>
          <button className="google-button" onClick={handleGoogleLogin} disabled={busy}>
            {busy ? "Connexion…" : "Continuer avec Google"}
          </button>
          {authError && <div className="error-box">{authError}</div>}
          <small>
            Aucun contact, message ou chaîne fictive n’est affiché avant la connexion.
          </small>
        </div>
      </main>
    );
  }

  const selectedName =
    selectedContact?.display_name ??
    selectedContact?.username ??
    (selectedConversation ? "Conversation" : "VIBE");

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
              aria-label="Rechercher"
            />
          </div>

          <div className="section-label">Conversations</div>
          <div className="contact-list">
            {filteredContacts.length === 0 ? (
              <div className="empty-sidebar">
                {API_URL
                  ? "Aucun contact disponible."
                  : "Aucun contact chargé : serveur VIBE non raccordé."}
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const name = contact.display_name ?? contact.username ?? "Utilisateur";
                return (
                  <button
                    className="contact"
                    key={contact.id}
                    onClick={() => void openContact(contact)}
                  >
                    <div className="avatar">
                      {contact.photo_url ? (
                        <img src={contact.photo_url} alt="" className="avatar-image" />
                      ) : (
                        initials(name)
                      )}
                    </div>
                    <div className="contact-meta">
                      <div className="contact-name">{name}</div>
                      <div className="contact-last">{contact.username ?? "Compte VIBE"}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="section-label">Espace VIBE</div>
          <button className="contact" onClick={() => setMenu("statuses")}>
            <div className="avatar">◌</div>
            <div className="contact-meta">
              <div className="contact-name">Statuts</div>
              <div className="contact-last">Vos statuts réels</div>
            </div>
          </button>
          <button className="contact" onClick={() => setMenu("channels")}>
            <div className="avatar">#</div>
            <div className="contact-meta">
              <div className="contact-name">Chaînes</div>
              <div className="contact-last">Vos chaînes réelles</div>
            </div>
          </button>
          <button className="contact" onClick={() => setMenu("settings")}>
            <div className="avatar">⚙</div>
            <div className="contact-meta">
              <div className="contact-name">Paramètres</div>
              <div className="contact-last">Compte et confidentialité</div>
            </div>
          </button>

          <button className="logout-button" onClick={() => void handleSignOut()} disabled={busy}>
            Se déconnecter
          </button>
        </aside>

        <section className="main">
          {backendError && <div className="backend-banner">{backendError}</div>}

          {menu === "chat" ? (
            <div className="chat">
              <header className="chat-header">
                <div className="chat-person">
                  <div className="avatar">
                    {selectedContact?.photo_url ? (
                      <img src={selectedContact.photo_url} alt="" className="avatar-image" />
                    ) : (
                      initials(selectedName)
                    )}
                  </div>
                  <div>
                    <div className="chat-title">{selectedConversation ? selectedName : "VIBE"}</div>
                    <div className="chat-status">
                      {selectedConversation ? "Conversation VIBE" : "Sélectionne un contact"}
                    </div>
                  </div>
                </div>
              </header>

              <div className="messages">
                {!selectedConversation ? (
                  <div className="empty-state">
                    <div className="empty-symbol">V</div>
                    <h2>Ton espace VIBE</h2>
                    <p>
                      Choisis un contact réel pour ouvrir une conversation.
                      Aucun nom ou message de démonstration n’est utilisé.
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-symbol">◌</div>
                    <h2>Conversation vide</h2>
                    <p>Le prochain message enregistré apparaîtra ici.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      className={"message-row" + (message.sender_id === user.uid ? " me" : "")}
                      key={message.id}
                    >
                      <div className="bubble">
                        {message.text ?? ""}
                        <div className="bubble-meta">{formatTime(message.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="composer-wrap">
                <form className="composer" onSubmit={sendMessage}>
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder={
                      selectedConversation
                        ? "Écrire un message…"
                        : "Ouvre d’abord une conversation"
                    }
                    disabled={!selectedConversation || busy}
                  />
                  <button className="send" disabled={!selectedConversation || !messageText.trim() || busy}>
                    {busy ? "…" : "➤"}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="empty-state full">
              <div className="empty-symbol">
                {menu === "settings" ? "⚙" : menu === "channels" ? "#" : "◌"}
              </div>
              <h2>
                {menu === "settings" ? "Paramètres" : menu === "channels" ? "Chaînes" : "Statuts"}
              </h2>
              <p>
                Cette vue attend les données réelles du serveur VIBE. Elle n’affiche volontairement
                aucun contenu fictif.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

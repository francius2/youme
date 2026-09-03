"use client";

import { Search, Settings, ShieldCheck, Sparkles, Video, Phone, MoreHorizontal, Send, Paperclip, Smile, X, UserPlus } from "lucide-react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

type Conversation = {
  id: string;
  participantId?: string;
  name: string;
  email: string;
  handle: string;
  preview: string;
  time: string;
  initials: string;
  color: string;
  lastMessageAt?: string;
  unread?: number;
};

export type HomeConversation = Conversation;
export type HomeMessage = { id: string; conversationId: string; from: "them" | "me"; text: string; time: string; createdAt: string };
type ProfileResult = { id: string; display_name: string | null; username: string | null; email: string | null };
type DatabaseMessage = { id: number; conversation_id: string; sender_id: string; body: string; created_at: string };
type Appearance = "light" | "dark";

function subscribeToAppearance(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getAppearance(): Appearance {
  return window.localStorage.getItem("youme-appearance") === "dark" ? "dark" : "light";
}

function Avatar({ conversation, large = false }: { conversation: Conversation; large?: boolean }) {
  return <div className={`avatar ${large ? "avatar-large" : ""}`} style={{ backgroundColor: conversation.color }} aria-hidden="true">{conversation.initials}</div>;
}

export default function HomeExperience({ email, userId, conversations, messages }: { email: string; userId: string; conversations: HomeConversation[]; messages: HomeMessage[] }) {
  const router = useRouter();
  const [conversationList, setConversationList] = useState(conversations);
  const [messageList, setMessageList] = useState(messages);
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [realtimeError, setRealtimeError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const appearance = useSyncExternalStore(subscribeToAppearance, getAppearance, () => "light" as Appearance);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [profileResults, setProfileResults] = useState<ProfileResult[]>([]);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileResult | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const chatContentRef = useRef<HTMLDivElement>(null);
  const selected = conversationList.find((conversation) => conversation.id === selectedId) ?? conversationList[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = conversationList.filter((conversation) =>
    conversation.name.toLowerCase().includes(normalizedQuery) ||
    conversation.email.toLowerCase().includes(normalizedQuery),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", appearance === "dark");
  }, [appearance]);

  function changeAppearance(nextAppearance: Appearance) {
    window.localStorage.setItem("youme-appearance", nextAppearance);
    window.dispatchEvent(new StorageEvent("storage", { key: "youme-appearance", newValue: nextAppearance }));
  }

  function updateConversationPreview(message: DatabaseMessage) {
    setConversationList((current) => current
      .map((conversation) => conversation.id === message.conversation_id ? {
        ...conversation,
        preview: message.body,
        time: new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        lastMessageAt: message.created_at,
      } : conversation)
      .sort((first, second) => (second.lastMessageAt ?? "").localeCompare(first.lastMessageAt ?? "")));
  }

  useEffect(() => {
    chatContentRef.current?.scrollTo({ top: chatContentRef.current.scrollHeight, behavior: "smooth" });
  }, [messageList, selectedId]);

  useEffect(() => {
    const searchTerm = participantEmail.trim();
    if (searchTerm.length < 2 || selectedProfile) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearchingProfiles(true);
      const { data, error } = await createClient()
        .from("profiles")
        .select("id, display_name, username, email")
        .ilike("email", `${searchTerm}%`)
        .neq("id", userId)
        .limit(6);

      if (!cancelled) {
        setProfileResults((data as ProfileResult[]) ?? []);
        setProfileSearchError(error?.message ?? "");
        setIsSearchingProfiles(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [participantEmail, selectedProfile, userId]);

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    let cancelled = false;

    async function syncMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (error) {
        setRealtimeError("Messages could not be synchronized. Check your Supabase message policies.");
        return;
      }

      setMessageList((current) => {
        const otherMessages = current.filter((message) => message.conversationId !== selectedId);
        const selectedMessages = ((data ?? []) as DatabaseMessage[]).map((message) => ({
          id: String(message.id),
          conversationId: message.conversation_id,
          from: message.sender_id === userId ? "me" as const : "them" as const,
          text: message.body,
          time: new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          createdAt: message.created_at,
        }));
        const latestMessage = (data as DatabaseMessage[] | null)?.at(-1);
        if (latestMessage) updateConversationPreview(latestMessage);
        return [...otherMessages, ...selectedMessages];
      });
    }

    void syncMessages();
    const syncInterval = window.setInterval(() => void syncMessages(), 3000);

    const channel = supabase
      .channel(`conversation-messages:${selectedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const message = payload.new as DatabaseMessage;
        setMessageList((current) => current.some((item) => item.id === String(message.id)) ? current : [...current, {
          id: String(message.id),
          conversationId: message.conversation_id,
          from: message.sender_id === userId ? "me" : "them",
          text: message.body,
          time: new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          createdAt: message.created_at,
        }]);
        updateConversationPreview(message);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeError("");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeError("Live updates are unavailable. Check that Realtime is enabled for messages.");
        }
      });

    return () => {
      cancelled = true;
      window.clearInterval(syncInterval);
      void supabase.removeChannel(channel);
    };
  }, [selectedId, userId]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selected) return;

    setIsSending(true);
    setSendError("");
    setDraft("");
    setShowEmojiPicker(false);
    const { data, error } = await createClient().from("messages").insert({
      conversation_id: selected.id,
      sender_id: userId,
      body,
    }).select("id, conversation_id, sender_id, body, created_at").single();

    if (error) {
      setDraft(body);
      setSendError(error.message);
      setIsSending(false);
      return;
    }

    const message = data as DatabaseMessage;
    setMessageList((current) => current.some((item) => item.id === String(message.id)) ? current : [...current, {
      id: String(message.id),
      conversationId: message.conversation_id,
      from: "me",
      text: message.body,
      time: new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      createdAt: message.created_at,
    }]);
    updateConversationPreview(message);
    setIsSending(false);
  }

  function closeNewConversation() {
    setShowNewConversation(false);
    setParticipantEmail("");
    setProfileResults([]);
    setProfileSearchError("");
    setSelectedProfile(null);
    setDialogError("");
  }

  async function createConversation() {
    if (!selectedProfile) return;
    setIsCreatingConversation(true);
    setDialogError("");
    const supabase = createClient();
    const existingConversation = conversationList.find((conversation) => conversation.participantId === selectedProfile.id);
    if (existingConversation) {
      setSelectedId(existingConversation.id);
      setIsCreatingConversation(false);
      closeNewConversation();
      return;
    }

    const { data: conversationId, error: conversationError } = await supabase.rpc("create_conversation", {
      target_user_id: selectedProfile.id,
    });

    if (conversationError || !conversationId) {
      setDialogError(conversationError?.message ?? "Could not create the conversation.");
      setIsCreatingConversation(false);
      return;
    }

    const name = selectedProfile.display_name ?? selectedProfile.email ?? "YouMe member";
    setConversationList((current) => [...current, {
      id: conversationId,
      participantId: selectedProfile.id,
      name,
      email: selectedProfile.email ?? "",
      handle: selectedProfile.username ? `@${selectedProfile.username}` : "youme member",
      preview: "No messages yet",
      time: "New",
      initials: name.slice(0, 2).toUpperCase(),
      color: "#a3b18a",
    }]);
    setSelectedId(conversationId);
    setRealtimeError("");
    setIsCreatingConversation(false);
    closeNewConversation();
  }

  function selectProfile(profile: ProfileResult) {
    setSelectedProfile(profile);
    setParticipantEmail(profile.email ?? "");
    setProfileResults([]);
    setProfileSearchError("");
  }

  function addEmoji(emojiData: EmojiClickData) {
    setDraft((currentDraft) => `${currentDraft}${emojiData.emoji}`);
    setShowEmojiPicker(false);
  }

  function selectConversation(conversation: HomeConversation) {
    setSelectedId(conversation.id);
    setQuery("");
    setRealtimeError("");
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && filteredConversations[0]) {
      event.preventDefault();
      selectConversation(filteredConversations[0]);
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <main className="app-shell home-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <nav className="landing-nav home-nav" aria-label="YouMe navigation">
        <Link className="nav-brand" href="/"><span className="brand-mark">y</span><span>youme</span></Link>
        <div className="home-user"><span className="home-user-dot" />{email}<button type="button" className={`icon-button settings-trigger ${showSettings ? "settings-trigger-active" : ""}`} aria-label="Open settings" aria-expanded={showSettings} onClick={() => setShowSettings((isOpen) => !isOpen)}><Settings size={15} /></button>{showSettings && <div className="settings-popover" role="dialog" aria-label="Account settings"><div className="settings-heading"><span className="profile-avatar">BL</span><div><strong>Benj Ligeralde</strong><span>{email}</span></div></div><div className="settings-divider" /><p><span className="home-user-dot" /> Online and ready to connect</p><div className="appearance-control"><span>Appearance</span><div className="appearance-options" role="group" aria-label="Appearance"><button type="button" className={appearance === "light" ? "appearance-active" : ""} onClick={() => changeAppearance("light")}>Light</button><button type="button" className={appearance === "dark" ? "appearance-active" : ""} onClick={() => changeAppearance("dark")}>Dark</button></div></div><button type="button" className="settings-signout" onClick={signOut}>Sign out</button></div>}</div>
      </nav>
      <section className="home-intro">
        <div><p className="eyebrow"><span /> Your quiet corner</p><h1>Good to see you, <em>Benj.</em></h1></div>
        <p>Conversations with room to breathe.</p>
      </section>
      <div className="messenger home-messenger" aria-label="YouMe messaging app">
        <aside className="sidebar">
          <div className="brand-row"><div className="brand-mark">y</div><span className="brand-name">youme</span><button className="icon-button menu-button" aria-label="Open menu"><MoreHorizontal size={17} /></button></div>
          <div className="profile-row"><div className="profile-avatar">BL</div><div className="profile-copy"><strong>Benj Ligeralde</strong><span className="muted-text">@benj.ligeralde</span></div><span className="status-dot" /></div>
          <div className="sidebar-heading"><span>Messages</span><button type="button" className="new-message" aria-label="Start a new conversation" onClick={() => setShowNewConversation(true)}><UserPlus size={14} /></button></div>
          <label className="search-box"><Search size={14} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Search messages" aria-label="Search conversations by name or email" aria-autocomplete="list" /><kbd>⌘ K</kbd></label>
          <div className="conversation-list">{filteredConversations.length ? filteredConversations.map((conversation) => <button className={`conversation ${selected?.id === conversation.id ? "conversation-active" : ""}`} key={conversation.id} onClick={() => selectConversation(conversation)}><Avatar conversation={conversation} /><span className="conversation-copy"><span className="conversation-top"><strong>{conversation.name}</strong><time>{conversation.time}</time></span><span className="conversation-bottom"><span>{conversation.preview}</span>{conversation.unread && <b>{conversation.unread}</b>}</span></span></button>) : <p className="search-empty">No conversations found</p>}</div>
          <div className="sidebar-footer"><ShieldCheck className="lock" size={12} /> Your messages are private</div>
        </aside>
        <section className="chat-panel">
          <header className="chat-header"><div className="mobile-brand"><span className="brand-mark">y</span> youme</div>{selected ? <><div className="chat-person"><Avatar conversation={selected} large /><div><h1>{selected.name}</h1><span>{selected.handle}</span></div></div><div className="chat-actions"><button className="icon-button" aria-label="Start video call"><Video size={16} /></button><button className="icon-button" aria-label="Start audio call"><Phone size={15} /></button><button className="icon-button" aria-label="More options"><MoreHorizontal size={17} /></button></div></> : <span className="chat-empty-label">Choose a conversation</span>}</header>
          <div className="chat-content" ref={chatContentRef}>{selected ? <><div className="day-divider"><span>Today</span></div><div className="message-intro"><Avatar conversation={selected} large /><h2>{selected.name}</h2><p>{selected.handle} · youme member</p></div>{realtimeError && <p className="realtime-error" role="status">{realtimeError}</p>}<div className="messages">{messageList.filter((message) => message.conversationId === selected.id).map((message) => <div className={`message-row ${message.from === "me" ? "message-mine" : ""}`} key={message.id}><div className="bubble">{message.text}<time>{message.time}</time></div></div>)}</div></> : <div className="empty-chat"><div className="empty-chat-mark"><Sparkles size={20} /></div><p className="empty-chat-eyebrow">A little room to breathe</p><h2>Your conversations will appear here.</h2><p>Start a conversation to make this space yours.</p></div>}</div>
          {selected && <><form className="composer" onSubmit={sendMessage}><button type="button" className="add-button" aria-label="Add attachment"><Paperclip size={16} /></button><input value={draft} onChange={(event) => { setDraft(event.target.value); setSendError(""); }} placeholder="Write a message..." aria-label="Message" /><span className="emoji-picker-wrap"><button type="button" className="icon-button composer-icon" aria-label="Add emoji" aria-expanded={showEmojiPicker} onClick={() => setShowEmojiPicker((isOpen) => !isOpen)}><Smile size={16} /></button>{showEmojiPicker && <span className="emoji-picker" role="dialog" aria-label="Choose an emoji"><EmojiPicker onEmojiClick={addEmoji} width={300} height={350} /></span>}</span><button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim() || isSending}><Send size={14} /></button></form>{sendError && <p className="send-error" role="status">Could not send message. Check your Supabase message insert policy.</p>}</>}
        </section>
      </div>
      <footer className="page-footer"><span>Conversations with room to breathe.</span><span>Made for your people.</span></footer>
      {showNewConversation && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNewConversation(); }}><section className="glass-dialog" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title"><button type="button" className="dialog-close" aria-label="Close new conversation dialog" onClick={closeNewConversation}><X size={16} /></button><div className="dialog-icon"><UserPlus size={18} /></div><p className="eyebrow"><span /> Make room for someone new</p><h2 id="new-conversation-title">Start a conversation.</h2><p className="dialog-description">Search by email to find someone you know on YouMe.</p><label className="dialog-label" htmlFor="participant-email">Their email address</label><div className="dialog-search-field"><input id="participant-email" className="dialog-input" type="email" value={participantEmail} onChange={(event) => { setParticipantEmail(event.target.value); setSelectedProfile(null); setProfileResults([]); setProfileSearchError(""); setDialogError(""); setIsSearchingProfiles(false); }} placeholder="friend@example.com" autoFocus />{(isSearchingProfiles || profileResults.length > 0 || profileSearchError) && <div className="profile-results" role="listbox" aria-label="Matching users">{isSearchingProfiles ? <p className="profile-result-status">Searching...</p> : profileSearchError ? <p className="profile-result-status">Search unavailable. Run the updated Supabase schema.</p> : profileResults.length ? profileResults.map((profile) => <button type="button" className="profile-result" key={profile.id} onClick={() => selectProfile(profile)}><span className="profile-result-avatar">{(profile.display_name ?? profile.email ?? "?").slice(0, 1).toUpperCase()}</span><span><strong>{profile.display_name ?? "YouMe member"}</strong><small>{profile.email}</small></span></button>) : <p className="profile-result-status">No matching users</p>}</div>}</div>{dialogError && <p className="profile-result-status dialog-error">{dialogError}</p>}<div className="dialog-actions"><button type="button" className="dialog-cancel" onClick={closeNewConversation}>Cancel</button><button type="button" className="dialog-submit" disabled={!selectedProfile || isCreatingConversation} onClick={createConversation}>{isCreatingConversation ? "Opening..." : "Continue"} <Send size={13} /></button></div></section></div>}
    </main>
  );
}
"use client";

import { Search, Settings, ShieldCheck, Sparkles, Video, Phone, MoreHorizontal, Send, Paperclip, Smile, X, UserPlus, Image as ImageIcon, FileText, FileQuestion, Bell, BellOff, Trash2, GripVertical } from "lucide-react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  avatarUrl?: string;
  lastMessageAt?: string;
  unread?: number;
};

export type HomeConversation = Conversation;
export type HomeMessage = { id: string; conversationId: string; from: "them" | "me"; text: string; time: string; createdAt: string; attachmentUrl?: string; attachmentName?: string; attachmentType?: string };
type ProfileResult = { id: string; display_name: string | null; username: string | null; email: string | null };
type UserProfile = { display_name: string | null; username: string | null; email: string | null; avatar_url: string | null };
type DatabaseMessage = { id: number; conversation_id: string; sender_id: string; body: string; attachment_url: string | null; attachment_name: string | null; attachment_type: string | null; created_at: string };
type Appearance = "light" | "dark";
type AttachmentKind = "image" | "video" | "document" | "other";

function subscribeToAppearance(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getAppearance(): Appearance {
  return window.localStorage.getItem("youme-appearance") === "dark" ? "dark" : "light";
}

function formatMessageDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Avatar({ conversation, large = false }: { conversation: Conversation; large?: boolean }) {
  return <div className={`avatar ${large ? "avatar-large" : ""}`} style={{ backgroundColor: conversation.color, ...(conversation.avatarUrl ? { backgroundImage: `url(${conversation.avatarUrl})`, backgroundPosition: "center", backgroundSize: "cover" } : {}) }} aria-hidden="true">{conversation.avatarUrl ? null : conversation.initials}</div>;
}

function AttachmentPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const previewUrl = useMemo(() => file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : "", [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  return <div className="attachment-preview"><button type="button" className="reply-preview-close" aria-label="Remove attachment" onClick={onRemove}><X size={12} /></button>{previewUrl && isImage ? <NextImage src={previewUrl} alt={`Preview of ${file.name}`} width={174} height={105} unoptimized /> : previewUrl && isVideo ? <video src={previewUrl} controls preload="metadata" aria-label={`Preview of ${file.name}`} /> : <span className="attachment-file-icon"><FileText size={15} /></span>}<div className="attachment-preview-copy"><span>{isImage ? "Image" : isVideo ? "Video" : "Attachment"}</span><p>{file.name}</p></div></div>;
}

function EmptyConversationState({ onStart }: { onStart: (prompt: string) => void }) {
  const prompts = ["Send a little hello", "Share something good", "Ask how they are"];

  return <div className="empty-chat empty-chat-enhanced">
    <div className="empty-chat-orbit" aria-hidden="true"><span /><span /><span /></div>
    <div className="empty-chat-mark"><Sparkles size={20} /></div>
    <p className="empty-chat-eyebrow">A little room for something real</p>
    <h2>Your next favorite conversation starts here.</h2>
    <p className="empty-chat-copy">No inbox noise. Just a blank canvas for the people you actually want to hear from.</p>
    <button type="button" className="empty-chat-primary" onClick={() => onStart("")}><UserPlus size={15} /> Find someone to message</button>
    <div className="empty-chat-prompts" aria-label="Conversation starters">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => onStart(prompt)}>{prompt}<span>+</span></button>)}</div>
  </div>;
}

export default function HomeExperience({ email, userId, conversations, messages }: { email: string; userId: string; conversations: HomeConversation[]; messages: HomeMessage[] }) {
  const router = useRouter();
  const [conversationList, setConversationList] = useState(conversations);
  const [messageList, setMessageList] = useState(messages);
  const [selectedId, setSelectedId] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [, setAttachmentName] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentAccept, setAttachmentAccept] = useState("");
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [replyingToMessageText, setReplyingToMessageText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [realtimeError, setRealtimeError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileName, setProfileName] = useState("Benj Ligeralde");
  const [profileUsername, setProfileUsername] = useState("benj.ligeralde");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showConversationActions, setShowConversationActions] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isConversationMuted, setIsConversationMuted] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [conversationActionError, setConversationActionError] = useState("");
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
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const selected = conversationList.find((conversation) => conversation.id === selectedId);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = conversationList.filter((conversation) =>
    conversation.name.toLowerCase().includes(normalizedQuery) ||
    conversation.email.toLowerCase().includes(normalizedQuery),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", appearance === "dark");
  }, [appearance]);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await createClient().from("profiles").select("display_name, username, email, avatar_url").eq("id", userId).single<UserProfile>();
      if (data) {
        setProfileName(data.display_name ?? data.email ?? "YouMe member");
        setProfileUsername(data.username ?? "");
        setProfileAvatarUrl(data.avatar_url ?? "");
      }
    }

    loadProfile();
  }, [userId]);

  function changeAppearance(nextAppearance: Appearance) {
    window.localStorage.setItem("youme-appearance", nextAppearance);
    window.dispatchEvent(new StorageEvent("storage", { key: "youme-appearance", newValue: nextAppearance }));
  }

  function openProfileEditor() {
    setProfileError("");
    setShowSettings(false);
    setShowProfileEditor(true);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = profileName.trim();
    const username = profileUsername.trim().replace(/^@/, "");
    if (!displayName) {
      setProfileError("Please enter a display name.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    const supabase = createClient();
    let avatarUrl = profileAvatarUrl || null;
    if (profilePhoto) {
      if (!profilePhoto.type.startsWith("image/")) {
        setProfileError("Please choose an image file.");
        setIsSavingProfile(false);
        return;
      }
      if (profilePhoto.size > 5 * 1024 * 1024) {
        setProfileError("Profile photos must be 5 MB or smaller.");
        setIsSavingProfile(false);
        return;
      }
      const filePath = `${userId}/${Date.now()}-${profilePhoto.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, profilePhoto, { contentType: profilePhoto.type, upsert: false });
      if (uploadError) {
        setProfileError(uploadError.message);
        setIsSavingProfile(false);
        return;
      }
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
    }
    const { error } = await supabase.from("profiles").update({ display_name: displayName, username: username || null, avatar_url: avatarUrl }).eq("id", userId);
    if (error) {
      setProfileError(error.message);
      setIsSavingProfile(false);
      return;
    }

    setProfileName(displayName);
    setProfileUsername(username);
    setProfileAvatarUrl(avatarUrl ?? "");
    setProfilePhoto(null);
    setShowProfileEditor(false);
    setIsSavingProfile(false);
  }

  function updateConversationPreview(message: DatabaseMessage) {
    setConversationList((current) => current
      .map((conversation) => conversation.id === message.conversation_id ? {
        ...conversation,
        preview: message.body || (message.attachment_name ? `Attachment: ${message.attachment_name}` : "No messages yet"),
        time: new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        lastMessageAt: message.created_at,
      } : conversation)
      .sort((first, second) => (second.lastMessageAt ?? "").localeCompare(first.lastMessageAt ?? "")));
  }

  useEffect(() => {
    chatContentRef.current?.scrollTo({ top: chatContentRef.current.scrollHeight, behavior: "smooth" });
  }, [messageList, selectedId]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setReactionMessageId(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    if (!reactionMessageId) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const picker = document.querySelector(".message-reaction-picker");
      const bubble = target.closest(".bubble");
      if (!picker || (!picker.contains(target) && !bubble)) {
        setReactionMessageId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [reactionMessageId]);

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
        .select("id, conversation_id, sender_id, body, attachment_url, attachment_name, attachment_type, created_at")
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
          text: message.body || (message.attachment_name ? `Attachment: ${message.attachment_name}` : "Attachment"),
          attachmentUrl: message.attachment_url ?? undefined,
          attachmentName: message.attachment_name ?? undefined,
          attachmentType: message.attachment_type ?? undefined,
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
          text: message.body || (message.attachment_name ? `Attachment: ${message.attachment_name}` : "Attachment"),
          attachmentUrl: message.attachment_url ?? undefined,
          attachmentName: message.attachment_name ?? undefined,
          attachmentType: message.attachment_type ?? undefined,
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
    if ((!body && !attachmentFile) || !selected) return;

    if (editingMessageId) {
      const { data, error } = await createClient().from("messages").update({ body }).eq("id", Number(editingMessageId)).select("id, conversation_id, sender_id, body, attachment_url, attachment_name, attachment_type, created_at").single();
      if (error) {
        setSendError(error.message);
        return;
      }

      const updatedMessage = data as DatabaseMessage;
      setMessageList((current) => current.map((message) => message.id === editingMessageId ? {
        ...message,
        text: updatedMessage.body,
        time: new Date(updatedMessage.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        createdAt: updatedMessage.created_at,
      } : message));
      updateConversationPreview(updatedMessage);
      setEditingMessageId(null);
      setDraft("");
      setSendError("");
      setShowEmojiPicker(false);
      setExpandedMessageId(editingMessageId);
      return;
    }

    setIsSending(true);
    setSendError("");
    setDraft("");
    setShowEmojiPicker(false);
    const supabase = createClient();
    let attachmentUrl: string | null = null;
    let attachmentPath = "";
    if (attachmentFile) {
      const safeFileName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      attachmentPath = `${selected.id}/${userId}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("attachments").upload(attachmentPath, attachmentFile, { contentType: attachmentFile.type || undefined });
      if (uploadError) {
        setDraft(body);
        setSendError("Could not upload the attachment. Check your Supabase storage policies.");
        setIsSending(false);
        return;
      }
      attachmentUrl = supabase.storage.from("attachments").getPublicUrl(attachmentPath).data.publicUrl;
    }

    const { data, error } = await supabase.from("messages").insert({
      conversation_id: selected.id,
      sender_id: userId,
      body,
      attachment_url: attachmentUrl,
      attachment_name: attachmentFile?.name ?? null,
      attachment_type: attachmentFile?.type ?? null,
    }).select("id, conversation_id, sender_id, body, attachment_url, attachment_name, attachment_type, created_at").single();

    if (error) {
      if (attachmentPath) await supabase.storage.from("attachments").remove([attachmentPath]);
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
      text: message.body || (message.attachment_name ? `Attachment: ${message.attachment_name}` : "Attachment"),
      attachmentUrl: message.attachment_url ?? undefined,
      attachmentName: message.attachment_name ?? undefined,
      attachmentType: message.attachment_type ?? undefined,
      time: new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      createdAt: message.created_at,
    }]);
    updateConversationPreview(message);
    setAttachmentFile(null);
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
  }

  function closeEmojiPicker() {
    setShowEmojiPicker(false);
  }

  function openAttachmentPicker(kind: AttachmentKind) {
    const acceptByKind: Record<AttachmentKind, string> = {
      image: "image/*",
      video: "video/*",
      document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv",
      other: "",
    };
    setAttachmentAccept(acceptByKind[kind]);
    setShowAttachmentPicker(false);
    window.setTimeout(() => attachmentInputRef.current?.click(), 0);
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAttachmentFile(file);
    event.target.value = "";
    window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Message"]')?.focus(), 0);
  }

  function startLongPress(messageId: string) {
    cancelLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      setReactionMessageId(messageId);
      longPressTriggeredRef.current = true;
    }, 420);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleBubbleClick(messageId: string, event?: React.MouseEvent<HTMLButtonElement>) {
    if (event && event.detail === 2) {
      setMessageReactions((current) => {
        const existing = current[messageId];
        if (existing === "❤️") {
          const next = { ...current };
          delete next[messageId];
          return next;
        }

        return { ...current, [messageId]: "❤️" };
      });
      setReactionMessageId(null);
      return;
    }

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    setExpandedMessageId((current) => current === messageId ? null : messageId);
  }

  function handleReactionSelect(messageId: string, emoji: string) {
    setMessageReactions((current) => {
      const existing = current[messageId];
      if (existing === emoji) {
        const next = { ...current };
        delete next[messageId];
        return next;
      }

      return { ...current, [messageId]: emoji };
    });
    setReactionMessageId(null);
    cancelLongPress();
  }

  async function handleMessageAction(messageId: string, action: "edit" | "delete") {
    if (action === "edit") {
      const target = messageList.find((message) => message.id === messageId);
      if (target) {
        setDraft(target.text);
        setEditingMessageId(messageId);
      }
    }

    if (action === "delete") {
      const { error } = await createClient().from("messages").delete().eq("id", Number(messageId));
      if (error) {
        setSendError(error.message);
        setReactionMessageId(null);
        return;
      }

      setMessageList((current) => {
        const nextMessages = current.filter((message) => message.id !== messageId);
        const latestMessage = [...nextMessages].filter((message) => message.conversationId === selected?.id).at(-1);
        setConversationList((currentConversations) => currentConversations.map((conversation) => conversation.id === selected?.id ? {
          ...conversation,
          preview: latestMessage?.text ?? "No messages yet",
          time: latestMessage ? latestMessage.time : "New",
          lastMessageAt: latestMessage?.createdAt,
        } : conversation));
        return nextMessages;
      });
    }

    setReactionMessageId(null);
    setExpandedMessageId(null);
  }

  function handleSwipeReplyStart(message: HomeMessage, event: React.PointerEvent<HTMLButtonElement>) {
    if (message.from !== "them") return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleSwipeReplyEnd(message: HomeMessage, event: React.PointerEvent<HTMLButtonElement>) {
    if (message.from !== "them" || !swipeStartRef.current) return;

    const deltaX = event.clientX - swipeStartRef.current.x;
    const deltaY = Math.abs(event.clientY - swipeStartRef.current.y);
    if (deltaX > 60 && deltaX > deltaY * 1.3) {
      setReplyingToMessageText(message.text);
      setExpandedMessageId(message.id);
      setDraft("");
    }
    swipeStartRef.current = null;
  }

  function clearReply() {
    setReplyingToMessageText("");
  }

  function selectConversation(conversation: HomeConversation) {
    setSelectedId(conversation.id);
    setQuery("");
    setRealtimeError("");
    setShowConversationActions(false);
    setShowDeleteConfirmation(false);
    setConversationActionError("");
  }

  function startEmptyConversation(prompt: string) {
    setDraft(prompt);
    setShowNewConversation(true);
  }

  function openConversationActions() {
    setConversationActionError("");
    setShowConversationActions(true);
  }

  async function deleteConversation() {
    if (!selected) return;
    setIsDeletingConversation(true);
    setConversationActionError("");
    const { error } = await createClient().from("conversations").delete().eq("id", selected.id);
    if (error) {
      setConversationActionError(error.message);
      setIsDeletingConversation(false);
      return;
    }

    const remainingConversations = conversationList.filter((conversation) => conversation.id !== selected.id);
    setConversationList(remainingConversations);
    setMessageList((current) => current.filter((message) => message.conversationId !== selected.id));
    setSelectedId(remainingConversations[0]?.id ?? "");
    setShowConversationActions(false);
    setShowDeleteConfirmation(false);
    setIsDeletingConversation(false);
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
        <Link className="nav-brand" href="/"><span className="brand-mark">y</span><span className="brand-wordmark">youme</span></Link>
        <div className="home-user"><span className="home-user-dot" />{email}<button type="button" className={`icon-button settings-trigger ${showSettings ? "settings-trigger-active" : ""}`} aria-label="Open settings" aria-expanded={showSettings} onClick={() => setShowSettings((isOpen) => !isOpen)}><Settings size={15} /></button>{showSettings && <div className="settings-popover" role="dialog" aria-label="Account settings"><div className="settings-heading"><span className="profile-avatar">{profileName.slice(0, 2).toUpperCase()}</span><div><strong>{profileName}</strong><span>{email}</span></div></div><div className="settings-divider" /><button type="button" className="settings-profile-button" onClick={openProfileEditor}>Profile</button><p><span className="home-user-dot" /> Online and ready to connect</p><div className="appearance-control"><span>Appearance</span><div className="appearance-options" role="group" aria-label="Appearance"><button type="button" className={appearance === "light" ? "appearance-active" : ""} onClick={() => changeAppearance("light")}>Light</button><button type="button" className={appearance === "dark" ? "appearance-active" : ""} onClick={() => changeAppearance("dark")}>Dark</button></div></div><button type="button" className="settings-signout" onClick={signOut}>Sign out</button></div>}</div>
      </nav>
      <section className="home-intro">
        <div><p className="eyebrow"><span /> Your quiet corner</p><h1>Good to see you, <em>Benj.</em></h1></div>
        <p>Conversations with room to breathe.</p>
      </section>
      <div className="messenger home-messenger" aria-label="YouMe messaging app">
        <button type="button" className="sidebar-toggle" aria-label={isSidebarOpen ? "Collapse messages sidebar" : "Expand messages sidebar"} aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}><GripVertical size={15} /></button>
        <aside className={`sidebar ${isSidebarOpen ? "" : "sidebar-collapsed"}`}>
          <div className="sidebar-heading"><span>Messages</span></div>
          <label className="search-box"><Search size={14} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Search messages" aria-label="Search conversations by name or email" aria-autocomplete="list" /><kbd>⌘ K</kbd></label>
          <div className="conversation-list">{filteredConversations.length ? filteredConversations.map((conversation) => <button className={`conversation ${selected?.id === conversation.id ? "conversation-active" : ""}`} key={conversation.id} onClick={() => selectConversation(conversation)}><Avatar conversation={conversation} /><span className="conversation-copy"><span className="conversation-top"><strong>{conversation.name}</strong><time>{conversation.time}</time></span><span className="conversation-bottom"><span>{conversation.preview}</span>{conversation.unread && <b>{conversation.unread}</b>}</span></span></button>) : <p className="search-empty">No conversations found</p>}</div>
          <div className="sidebar-footer"><ShieldCheck className="lock" size={12} /> Your messages are private</div>
        </aside>
        <section className="chat-panel">
          <header className="chat-header">{selected ? <><div className="chat-person"><Avatar conversation={selected} large /><div><h1>{selected.name}</h1><span>{selected.handle}</span></div></div><div className="chat-actions"><button className="icon-button" aria-label="Start video call"><Video size={16} /></button><button className="icon-button" aria-label="Start audio call"><Phone size={15} /></button><button type="button" className="icon-button" aria-label="More conversation options" aria-expanded={showConversationActions} onClick={openConversationActions}><MoreHorizontal size={17} /></button></div></> : <div className="empty-header-copy"><span className="chat-empty-label">Your inbox</span><span>Make the first move</span></div>}</header>
          <div className="chat-content" ref={chatContentRef}>{selected ? <><div className="day-divider"><span>Today</span></div><div className="message-intro"><Avatar conversation={selected} large /><h2>{selected.name}</h2><p>{selected.handle} · youme member</p></div>{realtimeError && <p className="realtime-error" role="status">{realtimeError}</p>}<div className="messages">{messageList.filter((message) => message.conversationId === selected.id).map((message) => { const isExpanded = expandedMessageId === message.id; const selectedReaction = messageReactions[message.id]; const messageDateTime = formatMessageDateTime(message.createdAt); const tooltipId = `message-time-${message.id}`; return <div className={`message-row ${message.from === "me" ? "message-mine" : ""} ${isExpanded ? "message-expanded" : ""}`} key={message.id}>{reactionMessageId === message.id && <div className="message-reaction-picker" role="menu" aria-label="Message actions"><div className="message-reaction-grid"><button type="button" onClick={() => handleReactionSelect(message.id, "👍")} aria-label="React with thumbs up">👍</button><button type="button" onClick={() => handleReactionSelect(message.id, "❤️")} aria-label="React with heart">❤️</button><button type="button" onClick={() => handleReactionSelect(message.id, "😂")} aria-label="React with laugh">😂</button><button type="button" onClick={() => handleReactionSelect(message.id, "🔥")} aria-label="React with fire">🔥</button></div>{message.from === "me" && <div className="message-action-row"><button type="button" onClick={() => handleMessageAction(message.id, "edit")}>Edit</button><button type="button" onClick={() => handleMessageAction(message.id, "delete")}>Delete</button></div>}</div>}<button type="button" className="bubble" aria-expanded={isExpanded} onPointerDown={(event) => { handleSwipeReplyStart(message, event); startLongPress(message.id); }} onPointerUp={(event) => { handleSwipeReplyEnd(message, event); cancelLongPress(); }} onPointerLeave={cancelLongPress} onPointerCancel={(event) => { handleSwipeReplyEnd(message, event); cancelLongPress(); }} onClick={(event) => handleBubbleClick(message.id, event)}><span className="bubble-text">{message.text}</span>{selectedReaction && <span className="bubble-reaction" aria-label={`Reaction: ${selectedReaction}`}>{selectedReaction}</span>}<span className="message-time-tooltip" tabIndex={0} aria-describedby={tooltipId}><time dateTime={message.createdAt} aria-label={`Sent ${messageDateTime}`}>{message.time}</time><span id={tooltipId} className="message-time-tooltip-content" role="tooltip">{messageDateTime}</span></span></button></div>; })}</div></> : <div className="empty-chat"><div className="empty-chat-mark"><Sparkles size={20} /></div><p className="empty-chat-eyebrow">A little room to breathe</p><h2>Your conversations will appear here.</h2><p>Start a conversation to make this space yours.</p></div>}</div>
          {selected && <><form className="composer" onSubmit={sendMessage}>{replyingToMessageText && <div className="reply-preview"><button type="button" className="reply-preview-close" aria-label="Clear reply" onClick={clearReply}><X size={12} /></button><span>Replying to</span><p>{replyingToMessageText}</p></div>}{editingMessageId && <div className="reply-preview"><button type="button" className="reply-preview-close" aria-label="Cancel edit" onClick={() => { setEditingMessageId(null); setDraft(""); }}><X size={12} /></button><span>Editing message</span><p>Update your note below.</p></div>}{attachmentFile && <AttachmentPreview file={attachmentFile} onRemove={() => { setAttachmentFile(null); setAttachmentName(""); }} />}<button type="button" className="add-button" aria-label="Add attachment" aria-expanded={showAttachmentPicker} onClick={() => setShowAttachmentPicker(true)}><Paperclip size={16} /></button><input ref={attachmentInputRef} className="attachment-input" type="file" accept={attachmentAccept} onChange={handleAttachmentChange} tabIndex={-1} /><input value={draft} onChange={(event) => { setDraft(event.target.value); setSendError(""); }} placeholder={replyingToMessageText ? "Write a reply..." : "Write a message..."} aria-label="Message" /><span className="emoji-picker-wrap"><button type="button" className="icon-button composer-icon" aria-label="Add emoji" aria-expanded={showEmojiPicker} onClick={() => setShowEmojiPicker(true)}><Smile size={16} /></button>{showEmojiPicker && <span className="emoji-picker" role="dialog" aria-label="Choose an emoji" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="emoji-picker-close" aria-label="Close emoji picker" onClick={closeEmojiPicker}><X size={14} /></button><EmojiPicker onEmojiClick={addEmoji} width={260} height={300} skinTonesDisabled previewConfig={{ showPreview: false }} /></span>}</span><button type="submit" className="send-button" aria-label={editingMessageId ? "Save edited message" : "Send message"} disabled={(!draft.trim() && !attachmentFile) || isSending}><Send size={14} /></button></form>{sendError && <p className="send-error" role="status">Could not send message. Check your Supabase message insert policy.</p>}</>}
          {!selected && <div className="empty-chat-overlay"><EmptyConversationState onStart={startEmptyConversation} /></div>}
        </section>
      </div>
      <footer className="page-footer"><span>Conversations with room to breathe.</span><span>Made for your people.</span></footer>
      {showProfileEditor && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingProfile) setShowProfileEditor(false); }}><section className="glass-dialog profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button type="button" className="dialog-close" aria-label="Close profile editor" onClick={() => { if (!isSavingProfile) setShowProfileEditor(false); }}><X size={16} /></button><div className="dialog-icon"><Settings size={18} /></div><p className="eyebrow"><span /> Your profile</p><h2 id="profile-title">Update your information.</h2><form className="profile-form" onSubmit={saveProfile}><label className="profile-photo-label" htmlFor="profile-photo">Profile photo</label><input id="profile-photo" className="profile-photo-input" type="file" accept="image/*" onChange={(event) => setProfilePhoto(event.target.files?.[0] ?? null)} /><label htmlFor="profile-name">Display name</label><input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} autoFocus /><label htmlFor="profile-username">Username</label><input id="profile-username" value={profileUsername} onChange={(event) => setProfileUsername(event.target.value)} placeholder="your.username" />{profileError && <p className="dialog-error" role="alert">{profileError}</p>}{profilePhoto && <p className="profile-photo-name">Selected: {profilePhoto.name}</p>}<div className="dialog-actions"><button type="button" className="dialog-cancel" onClick={() => setShowProfileEditor(false)} disabled={isSavingProfile}>Cancel</button><button type="submit" className="dialog-submit" disabled={isSavingProfile}>{isSavingProfile ? "Saving..." : "Save changes"}</button></div></form></section></div>}
      {showConversationActions && selected && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowConversationActions(false); }}><section className="glass-dialog conversation-actions-dialog" role="dialog" aria-modal="true" aria-labelledby="conversation-actions-title"><button type="button" className="dialog-close" aria-label="Close conversation options" onClick={() => setShowConversationActions(false)}><X size={16} /></button><div className="dialog-icon"><MoreHorizontal size={18} /></div><p className="eyebrow"><span /> Conversation options</p><h2 id="conversation-actions-title">{selected.name}</h2><p className="dialog-description">Choose what you would like to do with this conversation.</p><div className="conversation-action-list"><button type="button" onClick={() => setIsConversationMuted((isMuted) => !isMuted)}><span className="conversation-action-icon">{isConversationMuted ? <Bell size={16} /> : <BellOff size={16} />}</span><span><strong>{isConversationMuted ? "Unmute notifications" : "Mute notifications"}</strong><small>{isConversationMuted ? "You will receive conversation alerts" : "Pause alerts for this conversation"}</small></span></button><button type="button" className="conversation-action-danger" onClick={() => { setConversationActionError(""); setShowConversationActions(false); setShowDeleteConfirmation(true); }}><span className="conversation-action-icon"><Trash2 size={16} /></span><span><strong>Delete conversation</strong><small>This removes the conversation and its messages</small></span></button></div>{conversationActionError && <p className="dialog-error" role="alert">{conversationActionError}</p>}</section></div>}
      {showDeleteConfirmation && selected && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletingConversation) setShowDeleteConfirmation(false); }}><section className="glass-dialog conversation-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-conversation-title" aria-describedby="delete-conversation-description"><button type="button" className="dialog-close" aria-label="Close delete confirmation" onClick={() => { if (!isDeletingConversation) setShowDeleteConfirmation(false); }}><X size={16} /></button><div className="dialog-icon conversation-delete-icon"><Trash2 size={18} /></div><p className="eyebrow"><span /> This cannot be undone</p><h2 id="delete-conversation-title">Delete conversation?</h2><p id="delete-conversation-description" className="dialog-description">This will permanently remove your conversation with {selected.name} and all of its messages.</p><div className="dialog-actions"><button type="button" className="dialog-cancel" onClick={() => setShowDeleteConfirmation(false)} disabled={isDeletingConversation}>Keep conversation</button><button type="button" className="dialog-submit conversation-delete-submit" onClick={deleteConversation} disabled={isDeletingConversation}><Trash2 size={14} />{isDeletingConversation ? "Deleting..." : "Delete"}</button></div>{conversationActionError && <p className="dialog-error" role="alert">{conversationActionError}</p>}</section></div>}
      {showAttachmentPicker && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAttachmentPicker(false); }}><section className="glass-dialog attachment-dialog" role="dialog" aria-modal="true" aria-labelledby="attachment-title"><button type="button" className="dialog-close" aria-label="Close attachment picker" onClick={() => setShowAttachmentPicker(false)}><X size={16} /></button><div className="dialog-icon"><Paperclip size={18} /></div><p className="eyebrow"><span /> Add something to share</p><h2 id="attachment-title">Choose a file.</h2><p className="dialog-description">Pick the kind of file you want to attach to this conversation.</p><div className="attachment-options"><button type="button" onClick={() => openAttachmentPicker("image")}><span className="attachment-option-icon attachment-image"><ImageIcon size={18} /></span><span><strong>Image</strong><small>JPG, PNG, GIF and more</small></span></button><button type="button" onClick={() => openAttachmentPicker("video")}><span className="attachment-option-icon attachment-video"><Video size={18} /></span><span><strong>Video</strong><small>MP4, MOV, WEBM and more</small></span></button><button type="button" onClick={() => openAttachmentPicker("document")}><span className="attachment-option-icon attachment-document"><FileText size={18} /></span><span><strong>Document</strong><small>PDF, DOCX, XLSX and more</small></span></button><button type="button" onClick={() => openAttachmentPicker("other")}><span className="attachment-option-icon attachment-other"><FileQuestion size={18} /></span><span><strong>Others</strong><small>Any other file format</small></span></button></div></section></div>}
      {showNewConversation && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNewConversation(); }}><section className="glass-dialog" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title"><button type="button" className="dialog-close" aria-label="Close new conversation dialog" onClick={closeNewConversation}><X size={16} /></button><div className="dialog-icon"><UserPlus size={18} /></div><p className="eyebrow"><span /> Make room for someone new</p><h2 id="new-conversation-title">Start a conversation.</h2><p className="dialog-description">Search by email to find someone you know on YouMe.</p><label className="dialog-label" htmlFor="participant-email">Their email address</label><div className="dialog-search-field"><input id="participant-email" className="dialog-input" type="email" value={participantEmail} onChange={(event) => { setParticipantEmail(event.target.value); setSelectedProfile(null); setProfileResults([]); setProfileSearchError(""); setDialogError(""); setIsSearchingProfiles(false); }} placeholder="friend@example.com" autoFocus />{(isSearchingProfiles || profileResults.length > 0 || profileSearchError) && <div className="profile-results" role="listbox" aria-label="Matching users">{isSearchingProfiles ? <p className="profile-result-status">Searching...</p> : profileSearchError ? <p className="profile-result-status">Search unavailable. Run the updated Supabase schema.</p> : profileResults.length ? profileResults.map((profile) => <button type="button" className="profile-result" key={profile.id} onClick={() => selectProfile(profile)}><span className="profile-result-avatar">{(profile.display_name ?? profile.email ?? "?").slice(0, 1).toUpperCase()}</span><span><strong>{profile.display_name ?? "YouMe member"}</strong><small>{profile.email}</small></span></button>) : <p className="profile-result-status">No matching users</p>}</div>}</div>{dialogError && <p className="profile-result-status dialog-error">{dialogError}</p>}<div className="dialog-actions"><button type="button" className="dialog-cancel" onClick={closeNewConversation}>Cancel</button><button type="button" className="dialog-submit" disabled={!selectedProfile || isCreatingConversation} onClick={createConversation}>{isCreatingConversation ? "Opening..." : "Continue"} <Send size={13} /></button></div></section></div>}
    </main>
  );
}
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useState } from "react";
import ForgotPassword from "@/components/partials/forgotPassword";
import LoginForm from "@/components/partials/loginForm";
import SignUp from "@/components/partials/signUp";

type Conversation = {
  id: string;
  name: string;
  handle: string;
  preview: string;
  time: string;
  color: string;
  initials: string;
  online?: boolean;
  unread?: number;
};

const conversations: Conversation[] = [
  {
    id: "benj",
    name: "Benj Ligeralde",
    handle: "benj.ligeralde",
    preview: "The little things matter most.",
    time: "9:41 AM",
    color: "#e48a67",
    initials: "BL",
    online: true,
  },
  {
    id: "studio",
    name: "Weekend studio",
    handle: "4 members",
    preview: "Noah: I added a few references",
    time: "Yesterday",
    color: "#a3b18a",
    initials: "WS",
    unread: 3,
  },
  {
    id: "leo",
    name: "Leo Park",
    handle: "leo.park",
    preview: "Voice note · 0:38",
    time: "Mon",
    color: "#8d9ec6",
    initials: "LP",
  },
  {
    id: "jules",
    name: "Jules Martin",
    handle: "jules.m",
    preview: "See you at the market?",
    time: "Sun",
    color: "#d4a373",
    initials: "JM",
  },
];

const messages = [
  { from: "them", text: "I found that tiny bookstore you were talking about.", time: "9:34 AM" },
  { from: "me", text: "The one with the blue door?", time: "9:36 AM" },
  { from: "them", text: "Yes! It is even better in person. I took a photo for you.", time: "9:38 AM" },
  { from: "me", text: "This is exactly my kind of Saturday plan.", time: "9:41 AM" },
];

function Avatar({ conversation, large = false }: { conversation: Conversation; large?: boolean }) {
  return (
    <div
      className={`avatar ${large ? "avatar-large" : ""}`}
      style={{ backgroundColor: conversation.color }}
      aria-hidden="true"
    >
      {conversation.initials}
    </div>
  );
}

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [selectedId, setSelectedId] = useState("benj");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];
  const filteredConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(query.toLowerCase()),
  );

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDraft("");
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="nav-brand" href="#top"><span className="brand-mark">y</span><span>youme</span></a>
        <div className="nav-links"><a className="nav-link-active" href="#why-youme">Why youme</a><a href="#privacy">Privacy</a><button className="login-link" onClick={() => setShowLogin(true)}>Log in <span>↗</span></button></div>
      </nav>
      <motion.section
        className="hero"
        id="top"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
      >
        <div className="hero-copy">
          <p className="eyebrow"><span /> A softer way to stay close</p>
          <AnimatePresence initial={false} mode="wait">
            {showLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <LoginForm onBack={() => setShowLogin(false)} onCreateAccount={() => { setShowLogin(false); setShowSignUp(true); }} onForgotPassword={() => { setShowLogin(false); setShowForgotPassword(true); }} />
              </motion.div>
              ) : showForgotPassword ? (
                <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                >
                <ForgotPassword onBack={() => { setShowForgotPassword(false); setShowLogin(true); }} />
                </motion.div>
              ) : showSignUp ? (
                <motion.div
                key="signup"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                >
                <SignUp onBack={() => setShowSignUp(false)} />
                </motion.div>
            ) : (
              <motion.div
                key="landing"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <h1>Make space for the <em>moments</em> that matter.</h1>
                <p className="hero-description">YouMe is a quieter place for your people. Share the everyday stuff, stay close from anywhere, and keep your conversations truly yours.</p>
                <div className="hero-actions" id="start"><button className="primary-button" onClick={() => setShowLogin(true)}>Get started <span>↗</span></button><a className="text-button" href="#preview">See how it feels <span>↓</span></a></div>
                <div className="hero-proof"><div className="proof-avatars"><span>MC</span><span>LP</span><span>JM</span></div><span>Made for the people<br />you actually talk to.</span></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.div
          className="hero-art"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.28 }}
        >
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-note note-one">a little<br /><strong>hello</strong></div><div className="hero-note note-two">sunday<br /><strong>plans</strong></div><div className="hero-spark">✦</div><div className="hero-sticker">no pressure,<br />just presence</div>
        </motion.div>
      </motion.section>
      <motion.section
        className="preview-section"
        id="preview"
        animate={{ y: showLogin ? 72 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="preview-heading"><p className="eyebrow"><span /> Inside youme</p><h2>A home for your <em>real</em> conversations.</h2><p>Simple by design. Personal by nature.</p></div>
        <div className="messenger" aria-label="YouMe messaging app preview">
        <aside className="sidebar">
          <div className="brand-row">
            <div className="brand-mark">y</div>
            <span className="brand-name">youme</span>
            <button className="icon-button menu-button" aria-label="Open menu">•••</button>
          </div>

          <div className="profile-row">
            <div className="profile-avatar">AM</div>
            <div>
              <strong>Alex Morgan</strong>
              <span className="muted-text">@alexmorgan</span>
            </div>
            <span className="status-dot" />
          </div>

          <div className="sidebar-heading">
            <span>Messages</span>
            <button className="new-message" aria-label="Start a new message">+</button>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="conversation-list">
            {filteredConversations.map((conversation) => (
              <button
                className={`conversation ${selectedId === conversation.id ? "conversation-active" : ""}`}
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
              >
                <Avatar conversation={conversation} />
                <span className="conversation-copy">
                  <span className="conversation-top"><strong>{conversation.name}</strong><time>{conversation.time}</time></span>
                  <span className="conversation-bottom"><span>{conversation.preview}</span>{conversation.unread && <b>{conversation.unread}</b>}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="sidebar-footer"><span className="lock">▣</span> Your messages are private</div>
        </aside>

        <section className="chat-panel">
          <header className="chat-header">
            <div className="mobile-brand"><span className="brand-mark">y</span> youme</div>
            <div className="chat-person"><Avatar conversation={selected} large /><div><h1>{selected.name}</h1><span>{selected.online ? "Active now" : selected.handle}</span></div></div>
            <div className="chat-actions"><button className="icon-button" aria-label="Start audio call">◡</button><button className="icon-button" aria-label="More options">•••</button></div>
          </header>
          <div className="chat-content">
            <div className="day-divider"><span>Today</span></div>
            <div className="message-intro"><Avatar conversation={selected} large /><h2>{selected.name}</h2><p>{selected.handle} · youme member</p></div>
            <div className="messages">
              {messages.map((message, index) => <div className={`message-row ${message.from === "me" ? "message-mine" : ""}`} key={index}><div className="bubble">{message.text}<time>{message.time}</time></div></div>)}
            </div>
            <div className="photo-note"><div className="photo-placeholder"><span>✦</span><small>blue door<br />bookstore</small></div><span>sent you a little moment</span></div>
          </div>
          <form className="composer" onSubmit={sendMessage}>
            <button type="button" className="add-button" aria-label="Add attachment">+</button>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." aria-label="Message" />
            <button type="button" className="icon-button composer-icon" aria-label="Add emoji">☺</button>
            <button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim()}>↑</button>
          </form>
        </section>
        </div>
      </motion.section>
      <footer className="page-footer"><span>Conversations with room to breathe.</span><span><a href="#privacy">Privacy first</a><a href="#about">About youme</a></span></footer>
    </main>
  );
}

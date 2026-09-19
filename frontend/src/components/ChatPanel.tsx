import { useState } from "react";
import type { FormEvent } from "react";
import { sendChatMessage } from "../api/chat";
import styles from "./ChatPanel.module.css";

interface ChatMessage {
  id: string;
  author: "user" | "assistant" | "error";
  text: string;
}

function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), author: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const reply = await sendChatMessage(trimmed);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), author: "assistant", text: reply }]);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Erreur inconnue";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), author: "error", text }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.log}>
        {messages.length === 0 && <span className={styles.empty}>Pose une question, elle part directement au LLM (GPT-4.1).</span>}
        {messages.map((message) => (
          <div className={styles.message} data-author={message.author} key={message.id}>
            <span className={styles.author}>
              {message.author === "user" ? "Vous" : message.author === "assistant" ? "Assistant" : "Erreur"}
            </span>
            <span className={styles.text}>{message.text}</span>
          </div>
        ))}
        {sending && (
          <div className={styles.message} data-author="assistant">
            <span className={styles.author}>Assistant</span>
            <span className={styles.text}>…</span>
          </div>
        )}
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrire un message…"
          disabled={sending}
        />
        <button className={styles.submit} type="submit" disabled={sending || !input.trim()}>
          Envoyer
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;

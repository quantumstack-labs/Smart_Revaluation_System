// src/components/RevalAssistantWidget.jsx

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ROLES,
  QUICK_REPLIES,
  getAssistantReplyByPayload,
} from "../revalAssistant/revalAssistantConfig";
import { classifyIntent } from "../revalAssistant/revalIntentClassifier";
import { useAuth } from "../context/AuthContext";
import { revaluationService } from "../services/revaluationService";

const RevalAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState(null); // student / teacher
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        "Hi! 👋 I’m RevalAssistant.\n\n" +
        "I can help students and teachers with login, dashboards, and the revaluation workflow.\n" +
        "Are you a *Student* or *Teacher*?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const { user } = useAuth();

  // Auto-detect role if user is logged in
  useEffect(() => {
    if (user && user.role && !role) {
      setRole(user.role);
      // Optionally welcome them by name
      addMessage({
        from: 'bot',
        text: `Welcome back, ${user.name}! How can I help you today?`
      });
    }
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isBotTyping, isOpen]);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleQuickReply = async (payload) => {
    const allQuickReplies = [
      ...QUICK_REPLIES.INITIAL,
      ...QUICK_REPLIES.STUDENT,
      ...QUICK_REPLIES.TEACHER,
    ];
    const quickText =
      allQuickReplies.find((q) => q.payload === payload)?.label || payload;

    addMessage({ from: "user", text: quickText });
    await handleBotResponse(payload);
  };

  const handleUserSend = async () => {
    const text = input.trim();
    if (!text) return;

    addMessage({ from: "user", text });
    setInput("");

    const payload = await classifyIntent(text, role);
    await handleBotResponse(payload);
  };

  const handleBotResponse = async (payload) => {
    setIsBotTyping(true);

    // Simulate network delay
    setTimeout(async () => {
      const reply = getAssistantReplyByPayload(payload, role);

      // Handle Dynamic Data Requirements
      if (reply.requiresAuth) {
        if (!user) {
          addMessage({
            from: "bot",
            text: "You need to be logged in to check this. Please login first! 🔒"
          });
          setIsBotTyping(false);
          return;
        }

        // Fetch real data based on payload
        if (payload === 'student_check_status_dynamic') {
          try {
            const requests = await revaluationService.getRequests(); // Fixed: Use available method
            if (requests.length === 0) {
              addMessage({
                from: "bot",
                text: "You haven't applied for any revaluations yet."
              });
            } else {
              const statusMsg = requests.map(r =>
                `• **${r.subject_name || r.subject}**: ${r.status}`
              ).join('\n');
              addMessage({
                from: "bot",
                text: `Here are your applications:\n\n${statusMsg}`
              });
            }
          } catch (error) {
            addMessage({
              from: "bot",
              text: "Sorry, I couldn't fetch your data right now. Please try again later."
            });
          }
          setIsBotTyping(false);
          return;
        }
      }

      // Standard Static Response
      addMessage({ from: "bot", text: reply.text });

      if (reply.role) {
        setRole(reply.role);
      }

      setIsBotTyping(false);
    }, 600);
  };

  const currentQuickReplies =
    !role
      ? QUICK_REPLIES.INITIAL
      : role === ROLES.STUDENT
        ? QUICK_REPLIES.STUDENT
        : QUICK_REPLIES.TEACHER;

  return (
    <motion.div
      drag
      dragMomentum={false}
      whileHover={{ scale: 1.05 }}
      className="fixed z-[9999]"
      style={{ 
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1rem, env(safe-area-inset-bottom))'
      }}
    >
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-full right-0 mb-4 w-80 sm:w-96 h-[32rem] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">🤖</div>
                <div>
                  <div className="text-sm font-bold tracking-wide text-white">Reval Assistant</div>
                  <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">
                    AI Support Bot
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 dark:bg-slate-950 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.from === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${m.from === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                      }`}
                  >
                    <div className="whitespace-pre-line">{m.text}</div>
                  </div>
                </div>
              ))}

              {isBotTyping && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex flex-wrap gap-2 mb-3">
                {currentQuickReplies.map((qr) => (
                  <button
                    key={qr.payload}
                    onClick={() => handleQuickReply(qr.payload)}
                    className="text-xs font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full hover:bg-blue-50 hover:dark:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-900"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 text-sm outline-none border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  placeholder="Type your question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUserSend()}
                />
                <button
                  onClick={handleUserSend}
                  className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 flex items-center gap-3 hover:shadow-2xl transition-all duration-300 group"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
        <span className="hidden sm:inline font-medium tracking-wide">Reval Assistant</span>
      </button>
    </motion.div>
  );
};

export default RevalAssistantWidget;

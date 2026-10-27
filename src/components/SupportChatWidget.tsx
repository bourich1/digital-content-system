import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Send, CheckCheck, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface SupportMessage {
  id: string;
  user_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export const SupportChatWidget = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || profile?.role === 'admin') return;

    fetchMessages();

    const channel = supabase
      .channel('public:support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages(prev => [...prev, newMsg]);
          
          if (isOpen) {
            markUnreadAsRead();
          } else if (newMsg.sender_id !== user.id) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen, profile?.role]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      markUnreadAsRead();
      setUnreadCount(0);
    }
  }, [isOpen, messages]);

  const fetchMessages = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      if (!isOpen) {
        const unread = data.filter(m => !m.is_read && m.sender_id !== user.id).length;
        setUnreadCount(unread);
      }
    }
  };

  const markUnreadAsRead = async () => {
    if (!user) return;
    const unreadIds = messages
      .filter(m => !m.is_read && m.sender_id !== user.id)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .in('id', unreadIds);
        
      setMessages(prev => prev.map(m => 
        unreadIds.includes(m.id) ? { ...m, is_read: true } : m
      ));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    const { error } = await supabase
      .from('support_messages')
      .insert([
        {
          user_id: user.id,
          sender_id: user.id,
          content: newMessage.trim(),
          is_read: true
        }
      ]);

    if (!error) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  if (!user || profile?.role === 'admin') return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center justify-center ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        } bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]`}
      >
        <div className="relative">
          <img src="/icon white.png" alt="Support" className="w-8 h-8 object-contain " />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-black">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[350px] sm:w-[400px] h-[500px] max-h-[calc(100vh-3rem)] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black/40 p-1 flex items-center justify-center">
                  <img src="/icon white.png" alt="Support" className="w-full h-full object-contain " />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Support Chat</h3>
                  <p className="text-xs text-orange-400">We usually reply in a few minutes</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                    <img src="/icon white.png" alt="Support" className="w-6 h-6 object-contain opacity-50 " />
                  </div>
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs text-center px-4">
                    Send us a message and we'll get back to you as soon as possible.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.sender_id === user.id;
                  const showAvatar = !isUser && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 shrink-0 flex items-end">
                          {showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-black/40 p-1 flex items-center justify-center">
                              <img src="/icon white.png" alt="Support" className="w-full h-full object-contain " />
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        <div
                          className={`p-3 rounded-2xl text-sm ${
                            isUser
                              ? 'bg-orange-600 text-white rounded-br-sm'
                              : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[10px] text-zinc-500">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                          {isUser && (
                            <span className="text-zinc-500">
                              {msg.is_read ? (
                                <CheckCheck className="w-3 h-3 text-orange-500" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900 border-t border-white/10">
              <div className="relative flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 resize-none max-h-32"
                  rows={1}
                  style={{
                    minHeight: '44px',
                    height: Math.max(44, Math.min(120, newMessage.split('\n').length * 20 + 24)) + 'px'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="shrink-0 p-3 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 rounded-xl transition-colors h-[44px] w-[44px] flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

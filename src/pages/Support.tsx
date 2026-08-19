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

export const Support = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    fetchMessages();
    markUnreadAsRead();

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
          markUnreadAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
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

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-hidden relative">
      <div className="relative z-10 p-6 bg-black border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative shrink-0 w-12 h-12 rounded-full bg-black/40 p-1 ring-2 ring-transparent group-hover:ring-orange-500/50 transition-all flex items-center justify-center">
            <img src="/icon.png" alt="Bourich Support" className="w-full h-full object-contain brightness-0 invert" />
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black bg-green-500"></div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white group-hover:text-orange-400 transition-colors">Bourich Support</h3>
            <p className="text-sm text-gray-400">We typically reply within a few minutes.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#111] via-black to-[#1a1a1a] animate-pulse opacity-50 z-0 pointer-events-none"></div>
        
        {/* Messages Container */}
        <div className="absolute inset-0 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 px-4">
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">No messages yet.</p>
              <p className="text-sm mt-2">Send us a message and we'll get back to you!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              const showTime = index === 0 || 
                new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 5 * 60000;

              return (
                <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {showTime && (
                    <span className="text-xs text-gray-500 mb-2 mx-2">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  )}
                  <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} w-full`}>
                    {!isOwn && (
                      <div className="relative shrink-0 w-8 h-8 rounded-full bg-gray-900 p-1 flex items-center justify-center">
                        <img src="/icon.png" alt="Support" className="w-full h-full object-contain brightness-0 invert" />
                      </div>
                    )}
                    <div 
                      className={`max-w-[85%] sm:max-w-[70%] px-5 py-3 rounded-2xl ${
                        isOwn 
                          ? 'bg-orange-600 text-white rounded-tr-sm' 
                          : 'bg-[#18181b] text-gray-200 rounded-tl-sm border border-gray-800'
                      }`}
                    >
                    <div className="flex flex-col gap-1">
                      <p className="whitespace-pre-wrap text-[15px]">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 shrink-0 mt-1">
                        <span className="text-xs text-white/70">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && (
                          msg.is_read 
                            ? <CheckCheck className="w-4 h-4 text-[#34B7F1]" /> 
                            : <Check className="w-4 h-4 text-white/70" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 bg-black border-t border-gray-800 w-full">
        <form onSubmit={handleSendMessage} className="relative flex items-center max-w-5xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message here..."
            className="w-full bg-gray-900 border border-gray-800 rounded-full pl-6 pr-14 py-4 text-[15px] text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="absolute right-3 p-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-full transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

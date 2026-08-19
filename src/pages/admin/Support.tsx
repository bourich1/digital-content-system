import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, Send, Search, User, CheckCheck, Check, 
  Paperclip, Smile, Settings, MoreHorizontal 
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface SupportMessage {
  id: string;
  user_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface UserChat {
  user_id: string;
  profile: Profile;
  lastMessage: SupportMessage;
  unreadCount: number;
}

export function Support() {
  const { user: adminUser, profile: adminProfile } = useAuth();
  const [chats, setChats] = useState<UserChat[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState(true); // Default to active on entry
  const isActiveRef = useRef(isActive);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state to ref for the event listener
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    fetchChats();

    const channel = supabase
      .channel('admin_support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages'
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          fetchChats();
          
          setSelectedUserId((currentSelectedUserId) => {
            if (currentSelectedUserId === newMsg.user_id) {
              setMessages(prev => [...prev, newMsg]);
              if (newMsg.sender_id !== adminUser?.id) {
                markAsRead(newMsg.id);
              }
            }
            return currentSelectedUserId;
          });

          // AI Auto-Reply Logic
          // If a new message comes in from a user, and admin is NOT active
          if (newMsg.sender_id !== adminUser?.id && adminUser && !isActiveRef.current) {
            handleAutoReply(newMsg.user_id, adminUser.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminUser]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
    } else {
      setMessages([]);
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markAsRead = async (messageId: string) => {
    await supabase.from('support_messages').update({ is_read: true }).eq('id', messageId);
  };

  const handleAutoReply = (userId: string, senderId: string) => {
    // Simulate thinking/typing time (1.5s)
    setTimeout(async () => {
      const autoResponses = [
        "Thank you for reaching out! I'm currently away, but I'll review this as soon as I'm back.",
        "Hi there, our team is currently offline but we've received your message and will respond shortly.",
        "Thanks for your message! This is an automated reply. An admin will get back to you soon."
      ];
      const randomResponse = autoResponses[Math.floor(Math.random() * autoResponses.length)];
      
      await supabase.from('support_messages').insert({
        user_id: userId,
        sender_id: senderId,
        content: randomResponse,
        is_read: false
      });
    }, 1500);
  };

  const fetchChats = async () => {
    const { data: allMessages, error: msgsError } = await supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (msgsError || !allMessages) return;

    const userIds = Array.from(new Set(allMessages.map(m => m.user_id)));
    if (userIds.length === 0) {
      setChats([]);
      return;
    }

    const { data: profiles, error: profsError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds);

    if (profsError || !profiles) return;

    const chatMap = new Map<string, UserChat>();
    
    for (const msg of allMessages) {
      if (!chatMap.has(msg.user_id)) {
        const profile = profiles.find(p => p.id === msg.user_id);
        if (profile) {
          chatMap.set(msg.user_id, {
            user_id: msg.user_id,
            profile,
            lastMessage: msg,
            unreadCount: (!msg.is_read && msg.sender_id === msg.user_id) ? 1 : 0
          });
        }
      } else {
        const chat = chatMap.get(msg.user_id)!;
        if (!msg.is_read && msg.sender_id === msg.user_id) {
          chat.unreadCount++;
        }
      }
    }

    setChats(Array.from(chatMap.values()));
  };

  const fetchMessages = async (userId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      const unreadIds = data
        .filter(m => !m.is_read && m.sender_id === userId)
        .map(m => m.id);
        
      if (unreadIds.length > 0) {
        await supabase.from('support_messages').update({ is_read: true }).in('id', unreadIds);
        fetchChats();
      }
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !replyText.trim() || !adminUser || isReplying) return;

    setIsReplying(true);
    const { error } = await supabase
      .from('support_messages')
      .insert({
        user_id: selectedUserId,
        sender_id: adminUser.id,
        content: replyText.trim(),
        is_read: false
      });

    if (!error) {
      setReplyText('');
    } else {
      console.error('Failed to send message:', error);
    }
    setIsReplying(false);
  };

  const filteredChats = chats.filter(chat => 
    chat.profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
    chat.profile.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedChat = chats.find(c => c.user_id === selectedUserId);

  // Generates avatar URL
  const getAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <div className="h-full w-full flex bg-[#0a0a0a] overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-[340px] flex flex-col bg-[#050505] border-r border-gray-800 shrink-0">
        
        {/* Admin Profile Header */}
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img src={adminProfile?.avatar_url || getAvatar(adminProfile?.full_name || 'Admin')} alt="Admin" className="w-12 h-12 rounded-full bg-gray-800 object-cover" />
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111] ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">{adminProfile?.full_name || 'Admin'}</h2>
              <p className="text-xs text-gray-500">Lead UX/UI Designer</p>
              
              <div className="flex items-center gap-2 mt-1">
                {/* Custom Toggle */}
                <button 
                  onClick={() => setIsActive(!isActive)}
                  className={`w-7 h-3.5 rounded-full relative transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-transform ${isActive ? 'left-[14px]' : 'left-0.5'}`}></div>
                </button>
                <span className="text-[10px] text-gray-400">{isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 px-6 pt-2">
          <div className="relative bg-[#111] border border-gray-800 rounded flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-white text-sm w-full ml-2 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-6 py-2 flex items-center justify-between">
            <h3 className="text-white font-semibold text-[15px]">Recent Message</h3>
            <button className="text-gray-400 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
          
          <div className="mt-2 space-y-1 px-4">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div 
                  key={chat.user_id}
                  onClick={() => setSelectedUserId(chat.user_id)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-colors ${
                    selectedUserId === chat.user_id ? 'bg-orange-600/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={chat.profile.avatar_url || getAvatar(chat.profile.full_name)} alt={chat.profile.full_name} className="w-10 h-10 rounded-full bg-gray-800 object-cover" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black bg-green-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">{chat.profile.full_name}</h4>
                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                      {chat.lastMessage.sender_id === adminUser?.id ? 'You: ' : ''}{chat.lastMessage.content}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#111]">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-800 flex items-center gap-3 bg-[#111] shrink-0">
              <div className="relative shrink-0">
                 <img src={selectedChat.profile.avatar_url || getAvatar(selectedChat.profile.full_name)} alt="User" className="w-12 h-12 rounded-full bg-gray-800 object-cover" />
                 <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111] bg-green-500"></div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">{selectedChat.profile.full_name}</h3>
                <p className="text-sm text-gray-400">Hi, Did you check the file?</p>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white/5">
              {messages.map((msg, index) => {
                const isAdmin = msg.sender_id === adminUser?.id;
                const showTime = index === 0 || 
                  new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 10 * 60000;

                return (
                  <React.Fragment key={msg.id}>
                    {showTime && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs text-gray-500">
                          {format(new Date(msg.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    )}
                    <div className={`flex w-full ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      {!isAdmin && (
                        <img src={selectedChat.profile.avatar_url || getAvatar(selectedChat.profile.full_name)} className="w-8 h-8 rounded-full mr-3 shrink-0 self-end mb-1 object-cover" alt="" />
                      )}
                      
                      <div className={`max-w-[65%] px-5 py-3 ${
                        isAdmin 
                          ? 'bg-[#4338ca] text-white rounded-t-2xl rounded-bl-2xl rounded-br-sm' 
                          : 'bg-[#18181b] text-gray-200 rounded-t-2xl rounded-br-2xl rounded-bl-sm border border-gray-800'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {isAdmin && (
                        <img src={adminProfile?.avatar_url || getAvatar(adminProfile?.full_name || 'Admin')} className="w-8 h-8 rounded-full ml-3 shrink-0 self-end mb-1 object-cover" alt="" />
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              
              {/* Optional: Typing Indicator Mock (can be integrated if needed) */}
              {/*
              <div className="flex w-full justify-start items-center">
                 <img src={getAvatar(selectedChat.profile.full_name)} className="w-8 h-8 rounded-full mr-3 shrink-0" alt="" />
                 <span className="text-xs text-gray-500 flex items-center gap-1">Typing <span className="animate-bounce">.</span><span className="animate-bounce" style={{animationDelay: '100ms'}}>.</span><span className="animate-bounce" style={{animationDelay: '200ms'}}>.</span></span>
              </div>
              */}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-[#111]">
              <form onSubmit={handleReply} className="relative flex items-center border border-gray-700 bg-black rounded-lg px-4 py-2 shadow-sm focus-within:border-orange-500 transition-colors">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Can you send me the png without background. Than|"
                  className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-gray-500 focus:outline-none py-2"
                />
                
                <div className="flex items-center gap-3 pr-2 shrink-0">
                  <button type="button" className="text-gray-500 hover:text-white transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button type="button" className="text-gray-500 hover:text-white transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <button 
                    type="submit"
                    disabled={!replyText.trim() || isReplying}
                    className="flex items-center gap-2 bg-[#4338ca] hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-md text-sm font-medium transition-colors ml-2"
                  >
                    Sent <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#111]">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">Select a Conversation</h2>
            <p className="text-sm">Choose a user from the list on the left to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}

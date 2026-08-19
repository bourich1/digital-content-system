import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  placement?: 'top' | 'bottom';
}

export const NotificationBell = ({ placement = 'bottom' }: NotificationBellProps = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'All' | 'Unread'>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const displayedNotifications = filterTab === 'Unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('public:in_app_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          playNotificationSound();
          toast.success(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // Slide to A6
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log('AudioContext not supported or blocked');
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    }
  };

  // Define position classes based on placement prop
  const positionClasses = placement === 'top' 
    ? 'bottom-full left-0 mb-2 origin-bottom-left' 
    : 'top-full right-0 mt-2 origin-top-right';

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'top' ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute ${positionClasses} w-[360px] sm:w-[400px] bg-[#242526] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-white flex flex-col z-[100]`}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight">Notifications</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="px-4 pb-2 flex gap-2">
              <button 
                onClick={() => setFilterTab('All')} 
                className={`px-3 py-1.5 rounded-full text-[15px] font-semibold transition-colors ${filterTab === 'All' ? 'bg-[#23354E] text-[#2e89ff]' : 'hover:bg-white/10 text-white'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterTab('Unread')} 
                className={`px-3 py-1.5 rounded-full text-[15px] font-semibold transition-colors ${filterTab === 'Unread' ? 'bg-[#23354E] text-[#2e89ff]' : 'hover:bg-white/10 text-white'}`}
              >
                Unread
              </button>
            </div>

            {/* Subheader */}
            <div className="px-4 py-2 flex items-center justify-between">
              <h4 className="font-semibold text-white">New</h4>
              <button 
                onClick={markAllAsRead}
                className="text-sm text-[#2e89ff] hover:underline"
              >
                Mark all read
              </button>
            </div>
            
            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
              {displayedNotifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 px-2">
                  {displayedNotifications.map((notification) => (
                    <div 
                      key={notification.id}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                        if (notification.title === 'New Support Reply') {
                          window.dispatchEvent(new CustomEvent('open-support-chat'));
                          setIsOpen(false);
                        } else if (notification.title.includes('Collaboration')) {
                          navigate('/collaborations');
                          setIsOpen(false);
                        }
                      }}
                      className={`p-2 flex gap-3 rounded-lg transition-colors cursor-pointer items-center group ${
                        notification.is_read ? 'hover:bg-white/5' : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Avatar with Bell Icon overlay */}
                      <div className="relative shrink-0">
                        <img src="/icon.png" alt="" className="w-14 h-14 rounded-full object-cover bg-black/40 p-1" />
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#2e89ff] rounded-full border-[3px] border-[#242526] flex items-center justify-center">
                          <Bell className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p className={`text-[15px] leading-snug ${notification.is_read ? 'text-zinc-300' : 'text-white font-medium'}`}>
                          <span className="font-semibold text-white">{notification.title}</span> {notification.message}
                        </p>
                        <p className={`text-[13px] mt-1 ${notification.is_read ? 'text-zinc-500' : 'text-[#2e89ff] font-semibold'}`}>
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {/* Unread Dot */}
                      {!notification.is_read && (
                        <div className="w-3 h-3 bg-[#2e89ff] rounded-full shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


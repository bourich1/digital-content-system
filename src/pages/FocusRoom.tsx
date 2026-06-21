import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Play, Pause, RotateCcw, Plus, Check, Circle, CheckCircle2, Trash2, ListTodo, Timer, GripVertical, VolumeX, BookOpen, Music, Volume2, CloudRain, Settings as SettingsIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

type WidgetId = 'timer' | 'tasks';

const PRESETS = [15, 25, 45];

const DEFAULT_SOUNDS = {
  quran: 'https://backup.qurango.net/radio/mishary_alafasi',
  instru: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
  nature: 'https://cdn.pixabay.com/audio/2021/09/06/audio_3f76906a64.mp3',
};

export default function FocusRoom() {
  // Timer
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [sessionsCompleted, setSessions] = useState(0);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Widget Order (drag & drop)
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem('focus_widget_order');
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter((w: string) => w !== 'sounds');
      if (filtered.length === 0) return ['timer', 'tasks'];
      return filtered;
    }
    return ['timer', 'tasks'];
  });
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<WidgetId | null>(null);

  const bellRef = useRef<HTMLAudioElement>(null);
  
  // Ambient Sound
  const [customSounds, setCustomSounds] = useState(() => {
    const saved = localStorage.getItem('focus_custom_sounds');
    return saved ? JSON.parse(saved) : DEFAULT_SOUNDS;
  });
  const [isEditingSounds, setIsEditingSounds] = useState(false);
  const [activeSound, setActiveSound] = useState<string>('none');
  const [volume, setVolume] = useState<number>(0.5);

  const AMBIENT_SOUNDS = [
    { id: 'none', label: 'None', icon: VolumeX, src: '' },
    { id: 'quran', label: 'Quran', icon: BookOpen, src: customSounds.quran },
    { id: 'instru', label: 'Instrumental', icon: Music, src: customSounds.instru },
    { id: 'nature', label: 'Nature', icon: CloudRain, src: customSounds.nature },
  ];

  // ── Persist widget order ──
  useEffect(() => {
    localStorage.setItem('focus_widget_order', JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  // ── Fetch Tasks ──
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();
      
      if (!isSupabaseConfigured()) {
        const mockTasks = localStorage.getItem('mock_tasks');
        if (mockTasks) {
          const parsed = JSON.parse(mockTasks);
          const validTasks = parsed.filter((t: Task) => new Date(t.created_at).getTime() > twentyFourHoursAgo);
          
          if (validTasks.length !== parsed.length) {
            localStorage.setItem('mock_tasks', JSON.stringify(validTasks));
          }
          setTasks(validTasks);
        } else {
          const initial = [
            { id: '1', title: 'Record vlog intro', is_completed: false, created_at: new Date().toISOString() },
            { id: '2', title: 'Reply to sponsor email', is_completed: true, created_at: new Date().toISOString() }
          ];
          setTasks(initial);
          localStorage.setItem('mock_tasks', JSON.stringify(initial));
        }
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        // Filter out tasks older than 24 hours in the UI just in case
        const validData = (data || []).filter(t => new Date(t.created_at).getTime() > twentyFourHoursAgo);
        setTasks(validData);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error('Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // ── Timer Tick ──
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleTimerComplete = () => {
    if (bellRef.current) bellRef.current.play();
    setSessions(s => s + 1);
    toast.success('Focus session completed! Great job. 🎉');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus Session Complete!', { body: 'Great work! Time to take a break.' });
    }
  };

  const setPreset = (minutes: number) => {
    setInitialTime(minutes * 60);
    setTimeLeft(minutes * 60);
    setIsActive(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      setPreset(mins);
      setCustomMinutes('');
    }
  };

  const resetTimer = () => {
    setTimeLeft(initialTime);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = initialTime > 0 ? (timeLeft / initialTime) : 1;
  const circumference = 2 * Math.PI * 140;

  // ── Task CRUD ──
  const saveMockTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('mock_tasks', JSON.stringify(newTasks));
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    setNewTaskTitle('');
    if (!isSupabaseConfigured()) {
      const newTask: Task = { id: Date.now().toString(), title, is_completed: false, created_at: new Date().toISOString() };
      saveMockTasks([newTask, ...tasks]);
      toast.success('Task added');
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { toast.error('You must be logged in'); return; }
      const { data, error } = await supabase.from('tasks').insert([{ title, user_id: userData.user.id }]).select().single();
      if (error) throw error;
      if (data) { setTasks([data, ...tasks]); toast.success('Task added'); }
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const toggleTask = async (task: Task) => {
    const newStatus = !task.is_completed;
    if (!isSupabaseConfigured()) {
      saveMockTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));
      return;
    }
    setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));
    try {
      const { error } = await supabase.from('tasks').update({ is_completed: newStatus }).eq('id', task.id);
      if (error) { setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: !newStatus } : t)); throw error; }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    if (!isSupabaseConfigured()) {
      saveMockTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted');
      return;
    }
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const activeTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);

  // ── Drag & Drop Handlers ──
  const handleDragStart = (widgetId: WidgetId) => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent, widgetId: WidgetId) => {
    e.preventDefault();
    if (draggedWidget && draggedWidget !== widgetId) {
      setDragOverWidget(widgetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverWidget(null);
  };

  const handleDrop = (targetWidgetId: WidgetId) => {
    if (draggedWidget && draggedWidget !== targetWidgetId) {
      const newOrder = [...widgetOrder];
      const draggedIndex = newOrder.indexOf(draggedWidget);
      const targetIndex = newOrder.indexOf(targetWidgetId);
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedWidget);
      setWidgetOrder(newOrder);
      toast.success('Layout updated');
    }
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  // ── Widget Renderers ──
  const renderTimerWidget = () => (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col items-center">

      {/* Top Header Row (Label + Sounds) */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Label */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-sm text-zinc-300 font-medium">Pomodoro Focus</span>
        </div>

        {/* Ambient Sounds Small Toggles */}
        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
          <div className="flex items-center justify-end gap-1.5 p-1.5 rounded-full bg-white/5 border border-white/10 w-full sm:w-auto">
            {AMBIENT_SOUNDS.map(sound => {
              const Icon = sound.icon;
              const isActive = activeSound === sound.id;
              return (
                <button
                  key={sound.id}
                  onClick={() => setActiveSound(sound.id)}
                  title={sound.label}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    isActive 
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25" 
                      : "text-zinc-500 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              )
            })}
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            <button
              onClick={() => setIsEditingSounds(true)}
              title="Customize Sounds"
              className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
          {activeSound !== 'none' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 w-full sm:w-48 self-end transition-all">
              <VolumeX className="w-3 h-3 text-zinc-500 flex-shrink-0" />
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
              />
              <Volume2 className="w-3 h-3 text-zinc-400 flex-shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Circular Timer */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" className="fill-none stroke-white/5" strokeWidth="6" />
          <circle
            cx="150" cy="150" r="140"
            className="fill-none stroke-orange-500 transition-all duration-1000 ease-linear"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
          <circle
            cx="150" cy="150" r="140"
            className="fill-none stroke-orange-400/30 transition-all duration-1000 ease-linear"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ filter: 'blur(6px)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl sm:text-7xl font-bold text-white tabular-nums tracking-tighter">
            {formatTime(timeLeft)}
          </span>
          <span className="text-xs text-zinc-500 uppercase tracking-[0.25em] mt-2 font-medium">minutes left</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5 mb-8">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={resetTimer}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setIsActive(!isActive)}
          className={cn(
            "h-14 px-10 rounded-full flex items-center gap-3 font-semibold text-base transition-all shadow-lg",
            isActive
              ? "bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10"
              : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/25"
          )}
        >
          {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isActive ? 'Pause' : 'Start Focus'}
        </motion.button>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-3 mb-6">
        {PRESETS.map(mins => (
          <button
            key={mins}
            onClick={() => setPreset(mins)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all border",
              initialTime === mins * 60
                ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                : "bg-transparent border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
            )}
          >
            {mins} min
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full mb-5 max-w-[300px]">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">or</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Custom Duration */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2 w-full max-w-[240px]">
        <div className="relative flex-1">
          <input
            type="number"
            placeholder="Custom"
            value={customMinutes}
            onChange={e => setCustomMinutes(e.target.value)}
            min={1}
            max={180}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-sm font-medium focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-medium">min</span>
        </div>
        <button
          type="submit"
          className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Check className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  const renderTasksWidget = () => (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <ListTodo className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Focus Tasks</h3>
          <p className="text-xs text-zinc-500">What do you want to accomplish?</p>
        </div>
      </div>

      {/* Add Task */}
      <form onSubmit={addTask} className="flex gap-3 mb-8">
        <input
          placeholder="Add a new task..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40 transition-colors"
        />
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="w-14 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:hover:bg-orange-500 flex items-center justify-center text-white transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </form>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-600">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-zinc-700">
            <ListTodo className="w-8 h-8" />
          </div>
          <p className="text-zinc-500 font-medium">No tasks yet — add one above</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] text-zinc-600 uppercase tracking-widest font-bold mb-3 px-1">
                To Do · {activeTasks.length}
              </h4>
              <AnimatePresence>
                {activeTasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-center gap-4 px-4 py-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.06] transition-all"
                  >
                    <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                      <Circle className="w-[22px] h-[22px] text-zinc-600 hover:text-orange-400 transition-colors" />
                    </button>
                    <span className="flex-1 text-[15px] text-zinc-200 leading-relaxed">{task.title}</span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] text-zinc-600 uppercase tracking-widest font-bold mb-3 px-1 pt-4 border-t border-white/5">
                Completed · {completedTasks.length}
              </h4>
              <AnimatePresence>
                {completedTasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-center gap-4 px-4 py-4 rounded-xl bg-transparent border border-white/[0.03] opacity-50 hover:opacity-80 transition-all"
                  >
                    <button onClick={() => toggleTask(task)} className="flex-shrink-0">
                      <CheckCircle2 className="w-[22px] h-[22px] text-green-500/70" />
                    </button>
                    <span className="flex-1 text-[15px] text-zinc-500 line-through">{task.title}</span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const widgetMap: Record<WidgetId, { render: () => React.ReactNode; label: string }> = {
    timer: { render: renderTimerWidget, label: 'Focus Timer' },
    tasks: { render: renderTasksWidget, label: 'Focus Tasks' },
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      {isEditingSounds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Customize Sounds</h3>
              <button onClick={() => setIsEditingSounds(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Quran Audio URL</label>
                <input 
                  type="text"
                  value={customSounds.quran}
                  onChange={(e) => setCustomSounds({...customSounds, quran: e.target.value})}
                  placeholder="https://..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Instrumental Audio URL</label>
                <input 
                  type="text"
                  value={customSounds.instru}
                  onChange={(e) => setCustomSounds({...customSounds, instru: e.target.value})}
                  placeholder="https://..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Nature Audio URL</label>
                <input 
                  type="text"
                  value={customSounds.nature}
                  onChange={(e) => setCustomSounds({...customSounds, nature: e.target.value})}
                  placeholder="https://..."
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
              <button 
                onClick={() => {
                  setCustomSounds(DEFAULT_SOUNDS);
                  localStorage.removeItem('focus_custom_sounds');
                  toast.success('Reset to default sounds');
                }}
                className="text-sm text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
              >
                Reset to default
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('focus_custom_sounds', JSON.stringify(customSounds));
                  setIsEditingSounds(false);
                  toast.success('Sound preferences saved!');
                }}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={bellRef} src="https://cdn.pixabay.com/audio/2021/08/09/audio_a16175eab3.mp3" />
      {activeSound !== 'none' && (
        <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
          <ReactPlayer 
            url={AMBIENT_SOUNDS.find(s => s.id === activeSound)?.src} 
            playing={true}
            loop={true}
            volume={volume}
            width="10"
            height="10"
            config={{
              youtube: {
                playerVars: { showinfo: 0, autoplay: 1 }
              }
            }}
          />
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Timer className="w-8 h-8 text-orange-400" />
            Focus Room
          </h2>
          <p className="text-zinc-400 mt-1">Deep work timer with your daily tasks. <span className="text-zinc-600">Drag to reorder.</span></p>
        </div>
        {sessionsCompleted > 0 && (
          <div className="px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
            🔥 {sessionsCompleted} session{sessionsCompleted > 1 ? 's' : ''} completed
          </div>
        )}
      </div>

      {/* Draggable Widgets */}
      <div className="space-y-6">
        {widgetOrder.map((widgetId) => (
          <div
            key={widgetId}
            draggable
            onDragStart={() => handleDragStart(widgetId)}
            onDragOver={(e) => handleDragOver(e, widgetId)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(widgetId)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative transition-all duration-300",
              draggedWidget === widgetId && "opacity-40 scale-[0.98]",
              dragOverWidget === widgetId && "translate-y-2"
            )}
          >
            {/* Drop Indicator */}
            {dragOverWidget === widgetId && draggedWidget !== widgetId && (
              <div className="absolute -top-3 left-0 right-0 h-1 bg-orange-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.6)] z-20" />
            )}

            {/* Drag Handle */}
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all shadow-lg">
                <GripVertical className="w-4 h-4" />
                <span className="text-[11px] font-medium uppercase tracking-wider">{widgetMap[widgetId].label}</span>
              </div>
            </div>

            {widgetMap[widgetId].render()}
          </div>
        ))}
      </div>
    </div>
  );
}

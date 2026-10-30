import { useAuth } from '@/contexts/AuthContext';
import { workspaceRows } from '@/lib/workspaceData';
import './FocusRoom.css';
import { FocusClock, ZenBackdrop, type ClockStyle } from '@/components/focus/FocusClock';
import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Play, Pause, RotateCcw, Plus, Check, Circle, CheckCircle2, Trash2, ListTodo, Timer, VolumeX, BookOpen, Volume2, Wind, X, Maximize2, Minimize2, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

const PRESETS = [15, 25, 45];

const DEFAULT_SOUNDS = {
  calm: '/sounds/calm-humming.wav',
  quran: 'https://server8.mp3quran.net/afs/002.mp3', // Surah Al-Baqarah (stable MP3)
};

export default function FocusRoom() {
  const { user } = useAuth();
  const [clockStyle, setClockStyle] = useState<ClockStyle>(() => {
    try {
      const saved = localStorage.getItem('focus_clock_style');
      return saved === 'classic' || saved === 'dial' ? saved : 'flip';
    } catch { return 'flip'; }
  });
  useEffect(() => {
    try { localStorage.setItem('focus_clock_style', clockStyle); } catch { /* Keep the in-session choice. */ }
  }, [clockStyle]);
  const [zenMode, setZenMode] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const tasksToggleRef = useRef<HTMLButtonElement>(null);
  const taskPanelRef = useRef<HTMLElement>(null);
  const closeTasks = () => { setTasksOpen(false); requestAnimationFrame(() => tasksToggleRef.current?.focus()); };
  const chooseTask = (id: string) => { setFocusedTaskId(id); closeTasks(); };
  const zenToggleRef = useRef<HTMLButtonElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);

  const exitZenMode = () => {
    setZenMode(false);
    if (document.fullscreenElement === roomRef.current) document.exitFullscreen().catch(() => {});
    requestAnimationFrame(() => zenToggleRef.current?.focus());
  };

  useEffect(() => {
    if (!zenMode && !tasksOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (tasksOpen) closeTasks();
        else exitZenMode();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [zenMode, tasksOpen]);

  const enterZenMode = () => {
    setZenMode(true);
    roomRef.current?.requestFullscreen?.().catch(() => { /* The full-window Zen view remains available. */ });
  };
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setZenMode(false);
        zenToggleRef.current?.focus();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Timer
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customDurationOpen, setCustomDurationOpen] = useState(false);
  const [sessionsCompleted, setSessions] = useState(0);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const bellRef = useRef<HTMLAudioElement>(null);
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  
  // Ambient Sound
  const [activeSound, setActiveSound] = useState<string>('none');
  const [volume, setVolume] = useState<number>(0.5);
  const [soundStatus, setSoundStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');


  const AMBIENT_SOUNDS = [
    { id: 'none', label: 'Silence', icon: VolumeX, src: '' },
    { id: 'quran', label: 'Quran', icon: BookOpen, src: DEFAULT_SOUNDS.quran },
    { id: 'calm', label: 'Calm humming', icon: Wind, src: DEFAULT_SOUNDS.calm },
  ];

  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = ambientAudioRef.current;
    let current = true;
    if (audio) {
      if (activeSound !== 'none') {
        setSoundStatus('loading');
        audio.play().then(() => { if (current) setSoundStatus('playing'); }).catch(() => {
          if (current) { setSoundStatus('error'); toast.error('Unable to play this sound. Please select it again to retry.'); }
        });
      } else {
        audio.pause();
        setSoundStatus('idle');
      }
    }
    return () => { current = false; };
  }, [activeSound]);

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
        const { data, error } = await workspaceRows('tasks', user?.id).order('created_at', { ascending: false });
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
  }, [user?.id]);

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
  const focusedTask = activeTasks.find(task => task.id === focusedTaskId);
  const matchesTaskSearch = (task: Task) => task.title.toLowerCase().includes(taskSearch.trim().toLowerCase());
  const visibleActiveTasks = taskFilter === 'completed' ? [] : activeTasks.filter(matchesTaskSearch);
  const visibleCompletedTasks = taskFilter === 'active' ? [] : completedTasks.filter(matchesTaskSearch);

  // ── Widget Renderers ──
  const renderTimerWidget = () => (
    <div className="focus-timer-panel bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col items-center">

      <div className="focus-current-task">
        <span className="focus-work-label"><span className={isActive ? 'running' : ''} />{isActive ? 'FOCUS IN PROGRESS' : 'A MOMENT FOR DEEP WORK'}</span>
        <h3 className="focus-task-headline" data-selected={focusedTask ? 'true' : 'false'}>{focusedTask?.title || 'What will you create today?'}</h3>
        <button className="focus-change-task" onClick={() => setTasksOpen(true)}><ListTodo size={13} />{focusedTask ? 'Change task' : 'Choose your task'}</button>
      </div>
      <div className="focus-clock-styles" role="group" aria-label="Clock style">
        {([{ id: 'flip', label: 'Flip clock' }, { id: 'dial', label: 'Dial' }, { id: 'classic', label: 'Classic' }] as const).map(option => (
          <button key={option.id} type="button" aria-pressed={clockStyle === option.id} onClick={() => setClockStyle(option.id)}>{option.label}</button>
        ))}
      </div>
      <FocusClock style={clockStyle} timeLeft={timeLeft} initialTime={initialTime} />

      <div className="focus-duration-picker">
        <div className="focus-duration-segments" role="group" aria-label="Focus duration">
          {PRESETS.map(mins => <button key={mins} type="button" aria-pressed={!customDurationOpen && initialTime === mins * 60} onClick={() => { setCustomDurationOpen(false); setPreset(mins); }}>{mins}<span> min</span></button>)}
          <button type="button" aria-expanded={customDurationOpen} aria-controls="focus-custom-duration" aria-pressed={customDurationOpen || !PRESETS.includes(initialTime / 60)} onClick={() => setCustomDurationOpen(open => !open)}>{!PRESETS.includes(initialTime / 60) ? `${initialTime / 60} min` : 'Custom'}</button>
        </div>
        {customDurationOpen && <form id="focus-custom-duration" className="focus-custom-duration" onSubmit={event => {
          handleCustomSubmit(event);
          const minutes = parseInt(customMinutes);
          if (!isNaN(minutes) && minutes > 0 && minutes <= 180) setCustomDurationOpen(false);
        }}>
          <label htmlFor="focus-custom-minutes">Your focus time</label>
          <div><input id="focus-custom-minutes" type="number" min={1} max={180} required autoFocus placeholder="Minutes" value={customMinutes} onChange={event => setCustomMinutes(event.target.value)} /><span>min</span><button type="submit">Apply</button></div>
        </form>}
      </div>
      {/* Controls */}
      <div className="focus-timer-controls flex items-center gap-5 mb-8">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={resetTimer}
          aria-label="Reset timer"
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


    </div>
  );

  const renderTasksWidget = () => (
    <div className="focus-tasks-panel bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <ListTodo className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Focus Tasks</h3>
          <p className="text-xs text-zinc-500">{activeTasks.length} active · {completedTasks.length} completed · {tasks.length} total</p>
        </div>
      </div>

      {/* Add Task */}
      <form onSubmit={addTask} className="flex gap-3 mb-8">
        <input
          placeholder="Add a new task..."
          aria-label="New focus task"
          autoFocus={tasksOpen}
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40 transition-colors"
        />
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!newTaskTitle.trim()}
          aria-label="Add task"
          className="w-14 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:hover:bg-orange-500 flex items-center justify-center text-white transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </form>

      <div className="focus-task-tools">
        <div role="group" aria-label="Filter tasks">{(['all', 'active', 'completed'] as const).map(filter => <button key={filter} onClick={() => setTaskFilter(filter)} aria-pressed={taskFilter === filter}>{filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Completed'}</button>)}</div>
        <input type="search" placeholder="Search tasks…" aria-label="Search tasks" value={taskSearch} onChange={event => setTaskSearch(event.target.value)} />
      </div>
      {isLoading ? (
        <div className="text-center py-12 text-zinc-600">Loading tasks...</div>
      ) : visibleActiveTasks.length + visibleCompletedTasks.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-zinc-700">
            <ListTodo className="w-8 h-8" />
          </div>
          <p className="text-zinc-500 font-medium">{tasks.length ? 'No tasks match your filters.' : 'No tasks yet — add one above'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleActiveTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] text-zinc-600 uppercase tracking-widest font-bold mb-3 px-1">
                To Do · {activeTasks.length}
              </h4>
              <AnimatePresence>
                {visibleActiveTasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    className={cn("focus-task-row group flex items-center gap-4 px-4 py-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.06] transition-all", focusedTask?.id === task.id && "focus-task-selected")}
                  >
                    <button onClick={() => toggleTask(task)} aria-label={`Mark ${task.title} as ${task.is_completed ? 'incomplete' : 'complete'}`} className="flex-shrink-0">
                      <Circle className="w-[22px] h-[22px] text-zinc-600 hover:text-orange-400 transition-colors" />
                    </button>
                    <button className="focus-task-title" onClick={() => chooseTask(task.id)}>{task.title}</button>
                    <button className="focus-select-task" onClick={() => chooseTask(task.id)} aria-label={`Focus on ${task.title}`} aria-pressed={focusedTask?.id === task.id} title="Focus on this task"><Crosshair size={16} /></button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      aria-label={`Delete ${task.title}`}
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {visibleCompletedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] text-zinc-600 uppercase tracking-widest font-bold mb-3 px-1 pt-4 border-t border-white/5">
                Completed · {completedTasks.length}
              </h4>
              <AnimatePresence>
                {visibleCompletedTasks.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-center gap-4 px-4 py-4 rounded-xl bg-transparent border border-white/[0.03] opacity-50 hover:opacity-80 transition-all"
                  >
                    <button onClick={() => toggleTask(task)} aria-label={`Mark ${task.title} as ${task.is_completed ? 'incomplete' : 'complete'}`} className="flex-shrink-0">
                      <CheckCircle2 className="w-[22px] h-[22px] text-green-500/70" />
                    </button>
                    <span className="flex-1 text-[15px] text-zinc-500 line-through">{task.title}</span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      aria-label={`Delete ${task.title}`}
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

  return (
    <div ref={roomRef} className="focus-room mx-auto" data-zen={zenMode ? 'true' : 'false'} data-sound={activeSound} data-clock={clockStyle} data-running={isActive ? 'true' : 'false'} role={zenMode ? 'dialog' : undefined} aria-modal={zenMode ? true : undefined} aria-label={zenMode ? 'Focus Room Zen Mode' : undefined} onKeyDown={event => {
      if ((!zenMode && !tasksOpen) || event.key !== 'Tab') return;
      const controls = Array.from((tasksOpen ? taskPanelRef.current : roomRef.current)?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
    }}>
      <ZenBackdrop sound={activeSound} />
      <audio ref={bellRef} src="https://cdn.pixabay.com/audio/2021/08/09/audio_a16175eab3.mp3" />
      <audio 
        ref={ambientAudioRef} 
        src={activeSound !== 'none' ? AMBIENT_SOUNDS.find(sound => sound.id === activeSound)?.src : undefined} 
        loop
        onError={() => { if (activeSound !== 'none') { toast.error('This audio is unavailable. Please try another sound.'); setSoundStatus('error'); } }}
      />

      <header className="focus-page-header">
        <div className="focus-page-name"><Timer size={18} /><h2>Focus Room</h2></div>
        <div className="focus-header-actions">
          <button ref={tasksToggleRef} className="focus-tasks-toggle" onClick={() => setTasksOpen(true)} aria-haspopup="dialog" aria-expanded={tasksOpen}><ListTodo size={16} />Tasks<span>{activeTasks.length}</span></button>
          <button ref={zenToggleRef} className="focus-zen-toggle" onClick={() => zenMode ? exitZenMode() : enterZenMode()} aria-pressed={zenMode}>
            {zenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{zenMode ? 'Exit Zen' : 'Zen Mode'}{zenMode && <kbd>Esc</kbd>}
          </button>
        </div>
      </header>
      <div className="focus-stage">{renderTimerWidget()}</div>
      <footer className="focus-audio-dock" aria-label="Ambient sounds">
        <div className="focus-audio-description"><span className="focus-audio-icon">{activeSound === 'quran' ? <BookOpen size={18} /> : activeSound === 'calm' ? <Wind size={18} /> : <VolumeX size={18} />}</span><div><strong>{activeSound === 'quran' ? 'Quran' : activeSound === 'calm' ? 'Calm humming' : 'Your quiet space'}</strong><span>{activeSound === 'none' ? 'Choose an atmosphere' : soundStatus === 'error' ? 'Audio unavailable · select again to retry' : soundStatus === 'loading' ? 'Loading your atmosphere…' : 'Take a breath. Settle into your flow.'}</span></div></div>
        <div className="focus-audio-choices" role="group" aria-label="Choose sound">
          {AMBIENT_SOUNDS.map(sound => <button key={sound.id} aria-label={sound.label} aria-pressed={activeSound === sound.id} onClick={() => { if (activeSound === sound.id && soundStatus === 'error') { setSoundStatus('loading'); ambientAudioRef.current?.load(); ambientAudioRef.current?.play().then(() => setSoundStatus('playing')).catch(() => setSoundStatus('error')); } else setActiveSound(sound.id); }}><sound.icon size={16} /><span>{sound.label}</span></button>)}
        </div>
        <label className="focus-audio-volume"><Volume2 size={15} /><span className="sr-only">Ambient sound volume</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={event => setVolume(Number(event.target.value))} aria-label="Ambient sound volume" /></label>
      </footer>
      {sessionsCompleted > 0 && <p className="focus-session-summary">{sessionsCompleted} focus session{sessionsCompleted === 1 ? '' : 's'} completed. A little progress, every day.</p>}
      {tasksOpen && <div className="focus-tasks-overlay">
        <button className="focus-tasks-scrim" onClick={closeTasks} aria-label="Close tasks" tabIndex={-1} />
        <aside ref={taskPanelRef} className="focus-task-drawer" role="dialog" aria-modal="true" aria-label="Focus tasks">
          <button className="focus-close-tasks" onClick={closeTasks} aria-label="Close tasks"><X size={19} /></button>
          {renderTasksWidget()}
        </aside>
      </div>}
    </div>
  );
}

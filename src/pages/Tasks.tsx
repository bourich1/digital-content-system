import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CheckCircle2, Circle, Trash2, ListTodo, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured()) {
      // Mock data if Supabase isn't configured
      const mockTasks = localStorage.getItem('mock_tasks');
      if (mockTasks) {
        setTasks(JSON.parse(mockTasks));
      } else {
        const initialTasks = [
          { id: '1', title: 'Record vlog intro', is_completed: false, created_at: new Date().toISOString() },
          { id: '2', title: 'Reply to sponsor email', is_completed: true, created_at: new Date().toISOString() }
        ];
        setTasks(initialTasks);
        localStorage.setItem('mock_tasks', JSON.stringify(initialTasks));
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

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
      const newTask: Task = {
        id: Date.now().toString(),
        title,
        is_completed: false,
        created_at: new Date().toISOString()
      };
      saveMockTasks([newTask, ...tasks]);
      toast.success('Task added');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('You must be logged in to add tasks');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title, user_id: userData.user.id }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks([data, ...tasks]);
        toast.success('Task added');
      }
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

    // Optimistic update
    setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: newStatus })
        .eq('id', task.id);

      if (error) {
        // Revert optimistic update
        setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: !newStatus } : t));
        throw error;
      }
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
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-orange-400" />
            Daily Tasks
          </h2>
          <p className="text-zinc-400 mt-1">Manage your day and check off completed items.</p>
        </div>
      </div>

      <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
        <CardContent className="p-6">
          <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-3 mb-8">
            <Input
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 text-lg h-14 bg-black/50 border-white/10"
            />
            <Button type="submit" disabled={!newTaskTitle.trim()} className="h-14 px-8 w-full sm:w-auto" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </Button>
          </form>

          {isLoading ? (
            <div className="text-center py-12 text-zinc-500">Loading your tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                <ListTodo className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No tasks yet</h3>
              <p className="text-zinc-400">Add a task above to get started.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active Tasks */}
              {activeTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                    To Do ({activeTasks.length})
                  </h3>
                  <AnimatePresence>
                    {activeTasks.map(task => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-all"
                      >
                        <button 
                          onClick={() => toggleTask(task)}
                          className="flex-shrink-0 focus:outline-none"
                        >
                          <Circle className="w-6 h-6 text-zinc-500 hover:text-white transition-colors" />
                        </button>
                        
                        <span className="flex-1 text-lg text-white">
                          {task.title}
                        </span>

                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          aria-label="Delete task"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4 border-t border-white/5 pt-6">
                    Completed ({completedTasks.length})
                  </h3>
                  <AnimatePresence>
                    {completedTasks.map(task => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-900/30 border border-white/5 opacity-70 transition-all hover:opacity-100"
                      >
                        <button 
                          onClick={() => toggleTask(task)}
                          className="flex-shrink-0 focus:outline-none"
                        >
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </button>
                        
                        <span className="flex-1 text-lg text-zinc-500 line-through">
                          {task.title}
                        </span>

                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          aria-label="Delete task"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

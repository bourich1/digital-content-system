import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Collaboration } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flag, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

const FIXED_HOLIDAYS = [
  { month: 1, date: 1, name: 'رأس السنة الميلادية' },
  { month: 1, date: 11, name: 'ذكرى تقديم وثيقة الاستقلال' },
  { month: 1, date: 14, name: 'رأس السنة الأمازيغية' },
  { month: 5, date: 1, name: 'عيد الشغل' },
  { month: 7, date: 30, name: 'عيد العرش' },
  { month: 8, date: 14, name: 'ذكرى استرجاع وادي الذهب' },
  { month: 8, date: 20, name: 'ذكرى ثورة الملك والشعب' },
  { month: 8, date: 21, name: 'عيد الشباب' },
  { month: 11, date: 6, name: 'ذكرى المسيرة الخضراء' },
  { month: 11, date: 18, name: 'عيد الاستقلال' },
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborations();
  }, [currentDate]);

  const fetchCollaborations = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .gte('posting_date', startOfMonth.toISOString().split('T')[0])
        .lte('posting_date', endOfMonth.toISOString().split('T')[0]);

      if (error) throw error;
      setCollaborations(data || []);
    } catch (err) {
      console.error('Failed to load collaborations for calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0 (Sun) to 6 (Sat)
  
  // Adjust so Monday is the first day of the week
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-orange-400" />
            Calendar
          </h2>
          <p className="text-zinc-400 mt-1">View your upcoming collaborations and holidays.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleToday}>Today</Button>
          <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-white/10">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-5 h-5" /></Button>
            <span className="min-w-[140px] text-center font-semibold text-white">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="w-5 h-5" /></Button>
          </div>
        </div>
      </div>

      <Card className="bg-zinc-900/40 border border-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-white/10">
            {dayNames.map(day => (
              <div key={day} className="py-4 text-center text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-32 border-b border-r border-white/5 bg-black/10" />;
              }

              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              const dayCollabs = collaborations.filter(c => c.posting_date === dateStr);
              const holiday = FIXED_HOLIDAYS.find(h => h.month === month + 1 && h.date === day);

              return (
                <div 
                  key={`day-${day}`} 
                  className={`h-32 border-b border-r border-white/5 p-2 flex flex-col gap-1 transition-colors hover:bg-white/[0.02] ${isToday ? 'bg-orange-500/5' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400'}`}>
                      {day}
                    </span>
                    {holiday && (
                      <Flag className="w-3 h-3 text-blue-400/70" />
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {holiday && (
                      <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 font-medium truncate leading-tight">
                        {holiday.name}
                      </div>
                    )}
                    {dayCollabs.map(collab => (
                      <div key={collab.id} className="px-2 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex flex-col gap-1 cursor-default group">
                        <div className="flex items-center gap-1.5 truncate">
                          {collab.brand_image ? (
                            <img src={collab.brand_image} alt="" className="w-3.5 h-3.5 rounded-sm object-cover shrink-0" />
                          ) : (
                            <Briefcase className="w-3 h-3 text-orange-400 shrink-0" />
                          )}
                          <span className="text-[11px] text-orange-200 font-semibold truncate leading-tight">
                            {collab.brand_name}
                          </span>
                        </div>
                        <span className="text-[9px] text-orange-400/80 uppercase font-bold tracking-wider opacity-80 group-hover:opacity-100 transition-opacity">
                          {collab.platform} {collab.content_type} {collab.videos_count > 1 ? `x${collab.videos_count}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

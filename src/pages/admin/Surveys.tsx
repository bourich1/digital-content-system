import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ClipboardList, Target, Navigation, Users } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export default function Surveys() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [acquisitionData, setAcquisitionData] = useState<{name: string, value: number}[]>([]);
  const [goalsData, setGoalsData] = useState<{name: string, value: number}[]>([]);
  const [experienceData, setExperienceData] = useState<{name: string, value: number}[]>([]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchSurveyData();
    }
  }, [profile]);

  const fetchSurveyData = async () => {
    setLoading(true);
    try {
      // Fetch Onboarding Surveys
      const { data: surveys, error: surveyError } = await supabase
        .from('onboarding_surveys')
        .select('source, primary_goal');
        
      if (surveyError) throw surveyError;

      // Fetch Profiles for occupations/domain
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('occupation, domain_industry');
        
      if (profileError) throw profileError;

      // Process Acquisition Data (Source)
      const sources: Record<string, number> = {};
      surveys?.forEach(s => {
        if (s.source) {
          sources[s.source] = (sources[s.source] || 0) + 1;
        }
      });
      const acqData = Object.keys(sources)
        .map(key => ({ name: key, value: sources[key] }))
        .sort((a, b) => b.value - a.value);

      // Process Goals Data
      const goals: Record<string, number> = {};
      surveys?.forEach(s => {
        if (s.primary_goal) {
          goals[s.primary_goal] = (goals[s.primary_goal] || 0) + 1;
        }
      });
      const glsData = Object.keys(goals)
        .map(key => ({ name: key.substring(0, 20) + (key.length > 20 ? '...' : ''), value: goals[key], fullName: key }))
        .sort((a, b) => b.value - a.value);

      // Process Occupations (Experience proxy)
      const occupations: Record<string, number> = {};
      profiles?.forEach(p => {
        if (p.occupation) {
          occupations[p.occupation] = (occupations[p.occupation] || 0) + 1;
        }
      });
      const expData = Object.keys(occupations)
        .map(key => ({ name: key, value: occupations[key] }))
        .sort((a, b) => b.value - a.value);

      setAcquisitionData(acqData);
      setGoalsData(glsData);
      setExperienceData(expData);

    } catch (error) {
      console.error('Error fetching survey data:', error);
      toast.error('Failed to load survey analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return <div className="text-white p-8">Unauthorized access.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Survey Analytics</h1>
        <p className="text-gray-400">Insights from user onboarding surveys and feedback forms.</p>
      </div>

      {loading ? (
        <div className="text-center p-12 text-gray-400">Loading analytics...</div>
      ) : (
        <>
          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Acquisition Channels */}
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <Navigation className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Acquisition Channels</h3>
              </div>
              <div className="h-80 w-full flex items-center justify-center">
                {acquisitionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={acquisitionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {acquisitionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500">No acquisition data available</div>
                )}
              </div>
            </div>

            {/* User Goals */}
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-pink-400" />
                <h3 className="text-xl font-semibold text-white">Primary User Goals</h3>
              </div>
              <div className="h-80 w-full flex items-center justify-center">
                {goalsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={goalsData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#ccc" tick={{fill: '#ccc', fontSize: 12}} axisLine={false} tickLine={false} width={100} />
                      <Tooltip cursor={{fill: '#222'}} contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} />
                      <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={24}>
                        {goalsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500">No goals data available</div>
                )}
              </div>
            </div>

            {/* Occupations */}
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-orange-400" />
                <h3 className="text-xl font-semibold text-white">Occupations</h3>
              </div>
              <div className="h-80 w-full flex items-center justify-center">
                {experienceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={experienceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {experienceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500">No occupation data available</div>
                )}
              </div>
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}

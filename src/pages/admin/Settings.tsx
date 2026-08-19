import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ToggleLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureFlag {
  feature_name: string;
  enabled: boolean;
  description: string;
  updated_at: string;
}

export default function Settings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchFlags();
    }
  }, [profile]);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_name');
        
      if (error) throw error;
      if (data) setFlags(data);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      toast.error('Failed to load feature flags. Make sure the table exists.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureName: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled: newStatus, updated_at: new Date().toISOString() })
        .eq('feature_name', featureName);

      if (error) throw error;
      
      setFlags(prev => prev.map(f => f.feature_name === featureName ? { ...f, enabled: newStatus } : f));
      toast.success(`${featureName} globally ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating feature flag:', error);
      toast.error('Failed to update feature flag');
    }
  };

  if (profile?.role !== 'admin') {
    return <div className="text-white p-8">Unauthorized access.</div>;
  }

  const enabledCount = flags.filter(f => f.enabled).length;
  const disabledCount = flags.length - enabledCount;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Feature Flags</h1>
        <p className="text-gray-400">Enable or disable features globally across the entire platform.</p>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
          <h3 className="font-medium text-gray-400 mb-2">Total Features</h3>
          <p className="text-3xl font-bold text-white">{flags.length}</p>
        </div>
        <div className="bg-[#111] p-6 rounded-xl border border-green-500/30">
          <h3 className="font-medium text-green-400 mb-2">Enabled</h3>
          <p className="text-3xl font-bold text-white">{enabledCount}</p>
        </div>
        <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
          <h3 className="font-medium text-gray-400 mb-2">Disabled</h3>
          <p className="text-3xl font-bold text-white">{disabledCount}</p>
        </div>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <ToggleLeft className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Platform Features</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading features...</div>
        ) : flags.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No feature flags found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="p-4 font-medium">Feature</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Last Updated</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {flags.map((flag) => (
                  <tr key={flag.feature_name} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white capitalize">
                        {flag.feature_name.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{flag.description}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        flag.enabled ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(flag.updated_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => toggleFeature(flag.feature_name, flag.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flag.enabled ? 'bg-orange-600' : 'bg-gray-600'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

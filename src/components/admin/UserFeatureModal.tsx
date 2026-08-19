import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface UserFeatureModalProps {
  userId: string;
  userName: string;
  initialBlockedFeatures: string[];
  onClose: () => void;
  onUpdate: () => void;
}

export function UserFeatureModal({ 
  userId, 
  userName, 
  initialBlockedFeatures, 
  onClose,
  onUpdate
}: UserFeatureModalProps) {
  const [blockedFeatures, setBlockedFeatures] = useState<string[]>(initialBlockedFeatures || []);
  const [saving, setSaving] = useState(false);
  const ALLOWED_FEATURES = [
    { key: 'creators', label: 'Creators', description: 'Creator network and directory' },
    { key: 'ideas', label: 'Content Ideas', description: 'Content Ideas generator and management' },
    { key: 'collaboration', label: 'Collaborations', description: 'Brand collaboration and deals management' },
    { key: 'calendar', label: 'Calendar', description: 'Content planning calendar' },
    { key: 'focus_room', label: 'Focus Room', description: 'Pomodoro timer and focus environment' },
    { key: 'ai_assistant', label: 'Tools', description: 'AI writing and brainstorming tools' }
  ];

  const handleToggle = (featureName: string) => {
    setBlockedFeatures(prev => {
      if (prev.includes(featureName)) {
        return prev.filter(f => f !== featureName); // Enable it (remove from blocked)
      } else {
        return [...prev, featureName]; // Block it
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ blocked_features: blockedFeatures })
        .eq('id', userId);
        
      if (error) throw error;
      
      toast.success(`Access updated for ${userName}`);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error saving user features', err);
      toast.error('Failed to update user access');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-gray-800 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
          <div>
            <h2 className="text-xl font-bold text-white">Manage User Access</h2>
            <p className="text-sm text-gray-400">For {userName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 text-yellow-200/80 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 text-yellow-500" />
                <p>
                  Disabling a feature here overrides the global settings for this user only.
                  If a feature is globally disabled, they still won't be able to access it even if enabled here.
                </p>
              </div>

              {ALLOWED_FEATURES.map((feature) => {
                const isBlocked = blockedFeatures.includes(feature.key);
                
                return (
                  <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg bg-black/50 border border-gray-800">
                    <div>
                      <div className="font-medium text-white">{feature.label}</div>
                      <div className="text-xs text-gray-400">{feature.description}</div>
                    </div>
                    
                    <button
                      onClick={() => handleToggle(feature.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        !isBlocked ? 'bg-orange-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          !isBlocked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-black/40 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

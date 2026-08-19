import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface FeatureContextType {
  features: Record<string, boolean>;
  loading: boolean;
}

const FeatureContext = createContext<FeatureContextType>({
  features: {},
  loading: true,
});

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatures();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('feature-flags-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feature_flags' },
        (payload) => {
          const { feature_name, enabled } = payload.new as { feature_name: string, enabled: boolean };
          setFeatures(prev => ({ ...prev, [feature_name]: enabled }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase.from('feature_flags').select('feature_name, enabled');
      if (error) throw error;
      
      const featureMap: Record<string, boolean> = {};
      data?.forEach(flag => {
        featureMap[flag.feature_name] = flag.enabled;
      });
      
      setFeatures(featureMap);
    } catch (error) {
      console.error('Error fetching features:', error);
      // Fallback defaults if table doesn't exist yet
      setFeatures({
        ideas: true, calendar: true, focus_room: true, ai_assistant: true, 
        collaboration: true, tasks: true, notifications: true, survey: true, onboarding: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureContext.Provider value={{ features, loading }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => useContext(FeatureContext);

// Feature Guard Component
export const FeatureGuard: React.FC<{ feature: string; children: React.ReactNode }> = ({ feature, children }) => {
  const { features, loading: featuresLoading } = useFeatures();
  const { profile, loading: authLoading, user } = useAuth();
  
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (featuresLoading || authLoading) {
    return <div className="p-8 text-center text-zinc-400">Loading feature status...</div>;
  }
  
  const globalEnabled = features[feature] !== false; // default to true if undefined
  const userBlocked = profile?.blocked_features?.includes(feature) || false;
  const isEnabled = globalEnabled && !userBlocked;
  
  useEffect(() => {
    if (userBlocked) {
      window.dispatchEvent(new CustomEvent('highlight-chat'));
      return () => {
        window.dispatchEvent(new CustomEvent('unhighlight-chat'));
      };
    }
  }, [userBlocked]);

  if (!isEnabled) {
    if (userBlocked) {
      return (
        <div className="flex flex-col items-center justify-center p-6 md:p-12 text-center min-h-[50vh]">
          <div className="flex items-center justify-center mb-6">
            {/* @ts-ignore - Lordicon web component */}
            <lord-icon
                src="https://cdn.lordicon.com/wdbwxkvh.json"
                trigger="hover"
                stroke="bold"
                style={{ width: '250px', height: '250px' }}>
            </lord-icon>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Access Suspended</h2>
          <p className="text-zinc-400 max-w-lg text-lg mb-8">
            This page has been disabled for you by the administrators. Please contact support via the chat icon below to resolve this issue.
          </p>
        </div>
      );
    }
    
    // Global block
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[40vh]">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Feature Temporarily Disabled</h2>
        <p className="text-zinc-400 max-w-md">
          This feature is currently disabled by the platform administrator. 
          Please check back later or contact support if you have questions.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

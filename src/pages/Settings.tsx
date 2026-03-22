import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

export default function Settings() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  useEffect(() => {
    const url = localStorage.getItem('supabase_url') || '';
    const key = localStorage.getItem('supabase_key') || '';
    setSupabaseUrl(url);
    setSupabaseKey(key);
  }, []);

  const handleSave = () => {
    localStorage.setItem('supabase_url', supabaseUrl);
    localStorage.setItem('supabase_key', supabaseKey);
    setIsSaved(true);
    toast.success('Configuration saved successfully');
    setTimeout(() => setIsSaved(false), 2000);
    // Force reload to update supabase client
    window.location.reload();
  };

  const handleClear = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    setSupabaseUrl('');
    setSupabaseKey('');
    toast.success('Configuration cleared');
    window.location.reload();
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support desktop notifications");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      toast.success("Notifications enabled!");
      new Notification("Content Circle", {
        body: "Notifications are now active.",
        icon: "/vite.svg"
      });
    } else {
      toast.error("Notification permission denied");
    }
  };

  const sendTestNotification = () => {
    if (notificationPermission === "granted") {
      new Notification("Test Notification", {
        body: "This is a test notification from Content Circle.",
        icon: "/vite.svg"
      });
      toast.success("Test notification sent");
    } else {
      toast.error("Please enable notifications first");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold text-white">Settings</h2>
        <p className="text-zinc-400 mt-1">Configure your application.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-white">Browser Notifications</h4>
                <p className="text-sm text-zinc-400">
                  {notificationPermission === 'granted' 
                    ? 'Notifications are enabled.' 
                    : 'Enable notifications to stay updated.'}
                </p>
              </div>
            </div>
            {notificationPermission !== 'granted' ? (
              <Button onClick={requestNotificationPermission}>
                Enable
              </Button>
            ) : (
              <Button variant="outline" onClick={sendTestNotification}>
                Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supabase Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Enter your Supabase project credentials to enable real backend integration.
            Without these, the app runs in Demo Mode.
          </p>
          
          <Input 
            label="Project URL" 
            placeholder="https://your-project.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
          />
          
          <Input 
            label="Anon Public Key" 
            placeholder="eyJh..."
            type="password"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave}>
              {isSaved ? 'Saved!' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Version</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Environment</span>
            <span className="text-white">{import.meta.env.MODE}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-zinc-400">Tech Stack</span>
            <span className="text-white">React, Vite, Tailwind, Supabase</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

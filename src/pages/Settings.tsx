import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { Bell, Volume2, Monitor } from 'lucide-react';

export default function Settings() {
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState('dark');
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
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-white">App Sounds</h4>
                <p className="text-sm text-zinc-400">
                  {soundEnabled ? 'Sound effects are on.' : 'Sound effects are muted.'}
                </p>
              </div>
            </div>
            <Button variant={soundEnabled ? "default" : "outline"} onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.success(!soundEnabled ? 'Sounds enabled' : 'Sounds disabled');
            }}>
              {soundEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-white">System Theme</h4>
                <p className="text-sm text-zinc-400">
                  Match your system appearance.
                </p>
              </div>
            </div>
            <select 
              className="flex h-10 w-32 rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                toast.success('Theme updated to ' + e.target.value);
              }}
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
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

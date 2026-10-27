import React from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter,Routes,Route} from 'react-router-dom';
import {Layout} from '../../src/components/Layout';
import Dashboard from '../../src/pages/Dashboard';
import Landing from '../../src/pages/Landing';
import WorkspaceDemo from '../../src/components/WorkspaceDemo';
import ContentIdeas from '../../src/pages/ContentIdeas';
import Calendar from '../../src/pages/Calendar';
import Creators from '../../src/pages/Creators';
import Tasks from '../../src/pages/Tasks';
import Tools from '../../src/pages/Tools';
import Settings from '../../src/pages/Settings';
import SettingsShell from '../../src/components/SettingsShell';
import AccountSettings from '../../src/pages/AccountSettings';
import SecuritySettings from '../../src/pages/SecuritySettings';
import {Toaster} from 'sonner';
import FocusRoom from '../../src/pages/FocusRoom';
import Collaborations from '../../src/pages/Collaborations';
import {creators,tasks} from './fixtures';
import '../../src/index.css';
// This separate origin has no real credentials, and every backend import is
// redirected by the recording-only Vite configuration to the fixtures above.
localStorage.setItem('content_circle_creators',JSON.stringify(creators));
localStorage.setItem('mock_tasks',JSON.stringify(tasks));
localStorage.setItem('focus_clock_style','flip');
localStorage.setItem('boostd-sidebar-hidden','false');
class QuietNotification {static permission='denied';static async requestPermission(){return 'denied';}}
Object.defineProperty(window,'Notification',{value:QuietNotification,configurable:true});
createRoot(document.getElementById('root')!).render(<HashRouter>{location.hash.startsWith('#/tour-preview') ? <main className="landing-page" data-theme="dark" style={{paddingTop:35,background:'#09090b',minHeight:'100vh',color:'white'}}><WorkspaceDemo/></main> : location.hash.startsWith('#/landing') ? <Landing/> : <Layout><Routes><Route path="/" element={<Dashboard/>}/><Route path="/ideas" element={<ContentIdeas/>}/><Route path="/creators" element={<Creators/>}/><Route path="/tasks" element={<Tasks/>}/><Route path="/tools" element={<Tools/>}/><Route path="/settings" element={<SettingsShell><Settings/></SettingsShell>}/><Route path="/settings/account" element={<SettingsShell><AccountSettings/></SettingsShell>}/><Route path="/settings/security" element={<SettingsShell><SecuritySettings/></SettingsShell>}/><Route path="/calendar" element={<Calendar/>}/><Route path="/focus" element={<FocusRoom/>}/><Route path="/collaborations" element={<Collaborations/>}/></Routes></Layout>}<Toaster theme="dark"/></HashRouter>);




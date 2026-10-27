import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({root:process.cwd(),cacheDir:path.resolve("node_modules/.vite-recording"),optimizeDeps:{entries:["scripts/workspace-recording/index.html"]},plugins:[react(),tailwindcss()],resolve:{alias:[{find:'@/lib/supabase',replacement:path.resolve('scripts/workspace-recording/mock-supabase.ts')},{find:'@/contexts/AuthContext',replacement:path.resolve('scripts/workspace-recording/mock-auth.tsx')},{find:'@/contexts/FeatureContext',replacement:path.resolve('scripts/workspace-recording/mock-features.tsx')},{find:'@',replacement:path.resolve('src')}]},server:{host:'127.0.0.1',port:3001,strictPort:true},publicDir:path.resolve('public')});

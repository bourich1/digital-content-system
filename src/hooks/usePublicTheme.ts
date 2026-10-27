import { useEffect, useState } from 'react';
export function usePublicTheme() {
 const [theme,setTheme]=useState<'dark'|'light'>(()=>{try{return localStorage.getItem('landing-theme')==='light'?'light':'dark';}catch{return 'dark';}});
 useEffect(()=>{try{localStorage.setItem('landing-theme',theme);}catch{/* Theme remains available without storage. */}},[theme]);
 return {theme,toggleTheme:()=>setTheme(value=>value==='dark'?'light':'dark')};
}

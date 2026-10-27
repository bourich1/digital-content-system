import React from 'react';
import { profile } from './fixtures';
// Preserve identity across renders: notification effects depend on `user`.
// Returning a new object on every render causes fetch -> setState -> fetch loops.
const user={id:profile.id,email:profile.email,identities:[{provider:'google'}],app_metadata:{provider:'google',providers:['google']}};
const auth={user,profile,session:{user},loading:false,isDemoMode:false,refreshProfile:async()=>{},startDemoMode:async()=>{},exitDemoMode:()=>{}};
export const useAuth=()=>auth;
export const AuthProvider=({children}:{children:React.ReactNode})=><>{children}</>;

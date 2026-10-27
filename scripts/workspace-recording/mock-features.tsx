import React from 'react';
const state={features:{ideas:true,creators:true,calendar:true,focus_room:true,ai_assistant:true,collaboration:true,tasks:true},loading:false};
export const useFeatures=()=>state;
export const FeatureGuard=({children}:{children:React.ReactNode})=><>{children}</>;
export const FeatureProvider=FeatureGuard;

export type Platform = 'YouTube' | 'Instagram' | 'TikTok' | 'X' | 'Other';

export interface Creator {
  id: string;
  name: string;
  profile_url: string;
  platform: Platform;
  description: string;
  created_at?: string;
}

export type IdeaStatus = 'Idea' | 'Script' | 'Filmed' | 'Edited' | 'Ready' | 'Posted';

export interface ContentIdea {
  id: string;
  title: string;
  status: IdeaStatus;
  source_url?: string;
  notes?: string;
  created_at?: string;
}

export interface AnalyticsData {
  id: string;
  video_title: string;
  views: number;
  likes: number;
  comments: number;
  date: string;
}

export interface UserProfile {
  id: string;
  email: string;
}

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

export interface UserProfile {
  id: string;
  email: string;
}

// Collaboration Types
export type DealType = 'paid' | 'creator' | 'affiliate' | 'services';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type CollaborationStatus = 'new' | 'negotiation' | 'accepted' | 'filming' | 'editing' | 'scheduled' | 'posted' | 'completed';
export type CollabPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | 'x';
export type CollabContentType = 'reel' | 'story' | 'post' | 'carousel' | 'video' | 'short';

export interface CollaborationTimeline {
  status: CollaborationStatus;
  date: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Collaboration {
  id: string;
  brand_name: string;
  brand_image: string;
  website: string;

  videos_count: number;
  social_links: SocialLink[];

  contact_name: string;
  contact_email: string;
  contact_phone: string;

  deal_type: DealType;
  budget: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;

  // Affiliate Partnership fields
  affiliate_link: string;
  commission_percentage: number;
  expected_commission: number;
  affiliate_notes: string;

  // Services fields
  service_name: string;
  service_description: string;
  service_delivery_date: string;
  service_status: string;

  // Creator Collaboration fields
  creator_name: string;
  creator_platform: string;
  creator_profile_link: string;
  collaboration_goal: string;
  shared_content_type: string;

  platform: CollabPlatform;
  content_type: CollabContentType;

  filming_date: string;
  posting_date: string;

  status: CollaborationStatus;

  content_ideas: string;
  inspiration_links: string;
  notes: string;

  timeline: CollaborationTimeline[];

  created_at: string;
  updated_at: string;
}

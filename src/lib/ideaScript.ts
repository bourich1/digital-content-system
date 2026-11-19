import type { IdeaStatus } from '@/types';

export const scriptSections = [
  { key: 'script_hook', title: 'HOOK', description: 'Grab attention with a strong opening.', placeholder: 'What makes your viewer stop scrolling?', tone: 'hook' },
  { key: 'script_body', title: 'BODY', description: 'Your main points, examples and explanations.', placeholder: '1. First point and explanation…\n\n2. Next point and example…', tone: 'body' },
  { key: 'script_cta', title: 'CTA', description: 'Give your viewer a clear next step.', placeholder: 'Save this video, leave a comment or follow for more…', tone: 'cta' },
] as const;

export const ideaStatuses: IdeaStatus[] = ['Idea', 'Script', 'Filmed', 'Edited', 'Ready', 'Posted'];

// Fictional, local-only data used to record the real workspace UI. Never sent to Supabase.
const stamp = new Date().toISOString();
const day = (offset: number) => { const date=new Date();date.setDate(date.getDate()+offset);return date.toISOString().split('T')[0]; };
export const profile = {id:'demo-creator',role:'user',status:'active',full_name:'Alex Morgan',username:'alexcreates',email:'creator@example.test',bio:'Turning fresh ideas into thoughtful content.',avatar_url:'',occupation:'Content Creator',domain_industry:'Design & productivity',day_streak:12,work_hours:28,focus_sessions:34,points:840,cover_gradient:'linear-gradient(135deg,#f97316,#ef4444,#ec4899)',survey_completed:true,theme_preference:'dark',notifications_enabled:false,created_at:stamp};
export const creators = [{id:'inspiration-1',name:'Creative inspiration',platform:'YouTube',profile_url:'https://www.youtube.com/',description:'Storytelling, creative routines and thoughtful production.'},{id:'inspiration-2',name:'Design journal',platform:'Instagram',profile_url:'https://www.instagram.com/',description:'A little inspiration for the next project.'},{id:'inspiration-3',name:'The creator notebook',platform:'X',profile_url:'https://x.com/',description:'Ideas worth keeping.'}];
export const ideas = [
 ['The creative tools I use every day','Idea','A practical tour of the tools behind a calmer creative workflow.'],
 ['Build a content system that works for you','Script','Hook, outline and script ready for the next recording session.'],
 ['Behind the scenes: a week of creating','Filmed','Footage captured. Time to turn the best moments into a story.'],
 ['My desk setup for deeper focus','Edited','Final cut ready. Review captions and thumbnail options.'],
 ['Five small habits for better ideas','Ready','Everything is ready for this week’s publishing slot.'],
 ['From a blank page to a published story','Posted','A little consistency makes a big difference.'],
].map(([title,status,notes],index)=>({id:`idea-${index}`,user_id:profile.id,title,status,notes,source_url:'',created_at:stamp}));
export const tasks = [
 ['Write the next video script',false],['Design this week’s thumbnails',false],['Plan the next content batch',false],['Organize the inspiration board',true],['Review the latest edit',true],
].map(([title,is_completed],index)=>({id:`task-${index}`,user_id:profile.id,title,is_completed,created_at:stamp}));
export const collaborations = [
 {id:'collab-1',brand_name:'Studio North',status:'filming',platform:'youtube',content_type:'video',posting_date:day(3),filming_date:day(0),budget:1200,paid_amount:600,notes:'A behind-the-scenes story about finding your creative rhythm.',collaboration_goal:'Introduce the studio through a thoughtful creator-led story.'},
 {id:'collab-2',brand_name:'Everyday Goods',status:'editing',platform:'instagram',content_type:'reel',posting_date:day(6),filming_date:day(-1),budget:850,paid_amount:0,notes:'A simple, useful routine. Final edit and captions in progress.'},
 {id:'collab-3',brand_name:'Frame Collective',status:'scheduled',platform:'tiktok',content_type:'short',posting_date:day(9),filming_date:day(-2),budget:600,paid_amount:600,notes:'A short creative challenge, ready to share with the community.'},
].map(collab=>({...collab,user_id:profile.id,brand_image:'',deal_type:'paid',videos_count:1,payment_status:collab.paid_amount===collab.budget?'paid':collab.paid_amount?'partial':'unpaid',remaining_amount:collab.budget-collab.paid_amount,created_at:stamp,updated_at:stamp,social_links:[],timeline:[]}));
export const tools = [
 {id:'tool-1',name:'DaVinci Resolve',category:'Video Editing',description:'Edit your next story, refine the colors and bring the final cut together.',url:'https://www.blackmagicdesign.com/products/davinciresolve',logo_url:''},
 {id:'tool-2',name:'Figma',category:'Design',description:'Plan visual ideas, design thumbnails and keep your creative direction clear.',url:'https://www.figma.com',logo_url:''},
 {id:'tool-3',name:'Notion',category:'Other',description:'Keep research, notes and creative references in one organized place.',url:'https://www.notion.so',logo_url:''},
 {id:'tool-4',name:'Visual Studio Code',category:'Development',description:'A flexible workspace for building your next creative project.',url:'https://code.visualstudio.com',logo_url:''},
];
export const tables: Record<string, any[]> = {profiles:[profile],tools,content_ideas:ideas,tasks,collaborations,creators,calendar_events:[],focus_sessions:[],in_app_notifications:[],support_messages:[],platform_settings:[],feature_flags:[]};


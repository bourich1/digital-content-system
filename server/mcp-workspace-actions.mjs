import {createHmac, timingSafeEqual} from 'node:crypto';
const text={type:'string',minLength:1,maxLength:200};
const notes={type:'string',maxLength:2000,allowEmpty:true};
const id={type:'string',format:'uuid',maxLength:36};
const date={type:'string',format:'date',maxLength:10};
const due={type:'string',format:'date-time',nullable:true};
const url={type:'string',format:'https-url',maxLength:512};
const enums=values=>({type:'string',enum:values});
const specs={
 tasks:{select:'id,title,is_completed,due_date,created_at',fields:{title:text,is_completed:{type:'boolean'},due_date:due}},
 content_ideas:{select:'id,title,notes,source_url,status,created_at',fields:{title:text,notes,source_url:{...url,nullable:true},status:enums(['Idea','Script','Filmed','Edited','Ready','Posted'])}},
 creators:{select:'id,name,platform,profile_url,description,avatar_url,created_at',fields:{name:text,platform:enums(['Instagram','YouTube','TikTok','X','Other']),profile_url:url,description:notes}},
 collaborations:{select:'id,brand_name,status,posting_date,deal_type,platform,content_type,notes,created_at',fields:{brand_name:text,status:enums(['new','negotiation','accepted','filming','editing','scheduled','posted','completed']),posting_date:{...date,nullable:true},deal_type:enums(['paid','creator','affiliate','services']),platform:enums(['instagram','tiktok','youtube','facebook','linkedin','x']),content_type:enums(['post','reel','story','video','short','carousel']),notes}},
};
const routes={update_task:['tasks','PATCH'],update_content_idea:['content_ideas','PATCH'],update_creator:['creators','PATCH'],create_creator:['creators','POST'],create_collaboration:['collaborations','POST'],update_collaboration:['collaborations','PATCH']};
const tool=(name,description,properties,required,destructive=false)=>({name,description,annotations:{readOnlyHint:false,destructiveHint:destructive,idempotentHint:false,openWorldHint:false},inputSchema:{type:'object',properties,required,additionalProperties:false}});
export const actionTools=Object.entries(routes).map(([name,[table,method]])=>tool(name,`${method==='POST'?'Create':'Update'} an owned ${table.replaceAll('_',' ')} record. Only supplied fields change.`,{...(method==='PATCH'?{id}:{}),...specs[table].fields},method==='PATCH'?['id']:table==='creators'?['name','platform','profile_url']:['brand_name','deal_type','platform','content_type']));
for(const [singular,table] of [['task','tasks'],['content_idea','content_ideas'],['creator','creators'],['collaboration','collaborations']]){
 routes[`delete_${singular}`]=[table,'DELETE'];
 actionTools.push(tool(`delete_${singular}`,`Delete one owned ${singular}. First call without confirmation_token to get a preview, show it to the user and ask for confirmation, then call with the returned token.`,{id,confirmation_token:{type:'string',maxLength:4096}},['id'],true));
}
export const creatorReadTool={name:'list_creators',description:'List or search creators saved by the signed-in user. Does not search the internet.',annotations:{readOnlyHint:true,openWorldHint:false},inputSchema:{type:'object',properties:{query:{type:'string',maxLength:100}},additionalProperties:false}};
export const focusStartTool=tool('start_focus_session','Return a link that starts a focus timer with the requested duration when the user opens it. Does not control an already open tab.',{minutes:{type:'integer',minimum:1,maximum:180}},['minutes']);
export async function workspaceAction(name,args,identity,base){
 const route=routes[name]; if(!route)return null;
 const [table,method]=route;const spec=specs[table];
 const params=new URLSearchParams({select:spec.select});
 if(method!=='POST'){params.set('id',`eq.${args.id}`);params.set('user_id',`eq.${identity.user.id}`);}
 const target=`${base}/rest/v1/${table}?${params}`;
 const payload=Object.fromEntries(Object.entries(args).filter(([key])=>key in spec.fields).map(([key,v])=>[key,typeof v==='string'?v.trim():v]));
 if(method==='PATCH'&&!Object.keys(payload).length)return {error:'Supply at least one field to update.'};
 if(method==='POST')payload.user_id=identity.user.id;
 try{
  if(method==='DELETE'){
   const secret=process.env.BOOSTD_MCP_DELETE_CONFIRMATION_SECRET;
   if(!secret)return {error:'Deletion is not enabled on this server.'};
   const preview=await fetch(target,{headers:identity.headers,redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!preview.ok)return {error:'Could not load this owned record.'};
   const [row]=await preview.json();if(!row)return {error:'Owned record not found.'};
   const signature=value=>createHmac('sha256',secret).update(value).digest('base64url');
   if(!args.confirmation_token){
    const message=Buffer.from(JSON.stringify({sub:identity.user.id,session:identity.sessionId,table,id:args.id,row,exp:Date.now()+300000})).toString('base64url');
    return {confirmation_required:true,record:row,confirmation_token:message+'.'+signature(message),expires_in_seconds:300,instruction:'Show the record to the user. Only submit this token after they explicitly confirm deletion.'};
   }
   const [message,mac,...extra]=args.confirmation_token.split('.');const expected=signature(message||'');
   if(extra.length||!mac||mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return {error:'Invalid deletion confirmation.'};
   const grant=JSON.parse(Buffer.from(message,'base64url'));
   if(grant.sub!==identity.user.id||grant.session!==identity.sessionId||grant.table!==table||grant.id!==args.id||grant.exp<Date.now()||JSON.stringify(grant.row)!==JSON.stringify(row))return {error:'Confirmation expired or the record changed. Request a new preview.'};
   // Compare the reviewed fields atomically so concurrent changes cannot be deleted unseen.
   for(const [key,value] of Object.entries(row)) if(key!=='id')params.set(key,value===null?'is.null':`eq.${value}`);
  }
  const response=await fetch(`${base}/rest/v1/${table}?${params}`,{method,headers:{...identity.headers,'Content-Type':'application/json',Prefer:'return=representation'},...(method==='DELETE'?{}:{body:JSON.stringify(payload)}),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return {error:'Boostd rejected this change. Check the values and your permissions.'};
  const rows=await response.json();if(!rows.length)return {error:'No owned record changed. Refresh the list before retrying.'};
  return method==='DELETE'?{deleted:true,id:rows[0].id}:{record:rows[0]};
 }catch{return {error:'The change could not be confirmed. Check your records before retrying.'};}
}

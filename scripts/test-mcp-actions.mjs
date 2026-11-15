import {createClient} from '@supabase/supabase-js';
import {randomUUID,createHash,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const base='https://vqmdsohqsspxbvrvsvxj.supabase.co';
const resource='https://boostd-mcp-staging-tamashop848-3253s-projects.vercel.app/api/mcp';
const keys=JSON.parse(process.env.BOOSTD_STAGE_KEYS);
const key=keys.find(k=>k.name==='anon').api_key;
const admin=createClient(base,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false,autoRefreshToken:false}});
Object.assign(process.env,{BOOSTD_SUPABASE_URL:base,BOOSTD_SUPABASE_PUBLIC_KEY:key,BOOSTD_MCP_RESOURCE_URL:resource,BOOSTD_MCP_OAUTH_CLIENT_ID:'162c67ca-d294-4657-8667-3eca089f870b',BOOSTD_MCP_DYNAMIC_OAUTH:'true',BOOSTD_MCP_DELETE_CONFIRMATION_SECRET:randomBytes(32).toString('hex')});
const {handleMcpHttp}=await import('../server/boostd-mcp.mjs');
const users=[],grants=[];let stage='setup',otherAccount;
const unwrap=r=>{if(r.error)throw Error(r.error.code||'Supabase failure');return r.data};
const claims=t=>JSON.parse(Buffer.from(t.access_token.split('.')[1],'base64url'));
const meta=await (await fetch(base+'/auth/v1/.well-known/oauth-authorization-server')).json();
async function makeUser(){const email=`mcp-actions-${randomUUID()}@example.test`,password=randomUUID()+randomUUID();const {user}=unwrap(await admin.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);unwrap(await admin.from("profiles").upsert({id:user.id}));const c=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});unwrap(await c.auth.signInWithPassword({email,password}));return c;}
async function exchange(c,write=false,target=resource){
 const redirect='http://127.0.0.1:19877/callback';const reg=await fetch(meta.registration_endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_name:'Boostd actions regression',redirect_uris:[redirect],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'})});assert.equal(reg.status,201);const {client_id}=await reg.json();grants.push([c,client_id]);
 const verifier=randomUUID()+randomUUID();const params=new URLSearchParams({client_id,redirect_uri:redirect,response_type:'code',scope:'openid',state:randomUUID(),code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url'),resource:target});
 const response=await fetch(meta.authorization_endpoint+'?'+params,{redirect:'manual'});const authId=new URL(response.headers.get('location')).searchParams.get('authorization_id');assert.ok(authId);
 unwrap(await c.auth.oauth.getAuthorizationDetails(authId));
 if(write&&otherAccount)assert.ok((await otherAccount.rpc('approve_mcp_workspace_actions',{request_id:authId})).error);
 if(write)unwrap(await c.rpc('approve_mcp_workspace_actions',{request_id:authId}));
 const approved=unwrap(await c.auth.oauth.approveAuthorization(authId,{skipBrowserRedirect:true}));const code=new URL(approved.redirect_url).searchParams.get('code');
 const tokens=await (await fetch(meta.token_endpoint,{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id,redirect_uri:redirect,code,code_verifier:verifier,resource:target})})).json();assert.ok(tokens.access_token);return {...tokens,client_id};
}
async function rpc(t,method,params){const response=await handleMcpHttp(new Request(resource,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+t.access_token},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),{requireWorkspaceRole:true});assert.equal(response.status,200);return response.json();}
async function call(t,name,args={}){const r=await rpc(t,'tools/call',{name,arguments:args});assert.ok(!r.error&&!r.result?.isError,JSON.stringify(r));return r.result.structuredContent;}
try{
 const a=await makeUser(),b=await makeUser();otherAccount=b;const aId=unwrap(await a.auth.getUser()).user.id,bId=unwrap(await b.auth.getUser()).user.id;
 stage='read_only';const reader=await exchange(a);assert.equal(claims(reader).role,'boostd_mcp_reader');assert.ok((await rpc(reader,'tools/call',{name:'create_task',arguments:{title:'denied'}})).error);
 stage='explicit_consent';const writer=await exchange(a,true);assert.equal(claims(writer).role,'boostd_mcp_actions');
 const advertised=(await rpc(writer,'tools/list',{})).result.tools.map(t=>t.name);assert.ok(advertised.includes('update_task')&&advertised.includes('delete_creator')&&advertised.includes('create_collaboration'));
 stage='task_crud';const task=(await call(writer,'create_task',{title:'MCP fixture task'})).task;await call(writer,'update_task',{id:task.id,is_completed:true,title:'Updated fixture',due_date:null});
 stage='idea_crud';const idea=(await call(writer,'create_content_idea',{title:'MCP fixture idea',notes:'draft'})).idea;await call(writer,'update_content_idea',{id:idea.id,notes:'revised',status:'Script'});
 stage='creator_crud';const creator=(await call(writer,'create_creator',{name:'Fixture creator',platform:'YouTube',profile_url:'https://www.youtube.com/@fixture'})).record;await call(writer,'update_creator',{id:creator.id,description:'Updated'});assert.ok((await call(writer,'list_creators',{query:'Fixture'})).creators.some(x=>x.id===creator.id));
 stage='collaboration_crud';const collab=(await call(writer,'create_collaboration',{brand_name:'Fixture brand',deal_type:'paid',platform:'instagram',content_type:'reel',status:'new'})).record;await call(writer,'update_collaboration',{id:collab.id,notes:'updated',status:'accepted'});await call(writer,'schedule_collaboration',{id:collab.id,posting_date:'2026-12-01'});
 stage='focus';assert.equal((await call(writer,'start_focus_session',{minutes:50})).focus_room_url,'https://www.boostd.app/focus?minutes=50&start=1');
 stage='account_isolation';const other=unwrap(await admin.from('tasks').insert({user_id:bId,title:'Other account fixture'}).select('id').single());const cross=await rpc(writer,'tools/call',{name:'update_task',arguments:{id:other.id,title:'must not change'}});assert.equal(cross.result.isError,true);const rows=await fetch(base+'/rest/v1/tasks?select=id&user_id=eq.'+bId,{headers:{apikey:key,authorization:'Bearer '+writer.access_token}});assert.deepEqual(await rows.json(),[]);
 const reassignment=await fetch(base+'/rest/v1/tasks?id=eq.'+task.id,{method:'PATCH',headers:{apikey:key,authorization:'Bearer '+writer.access_token,'content-type':'application/json'},body:JSON.stringify({user_id:bId})});assert.ok([401,403].includes(reassignment.status));
 stage='stale_confirmation';const stale=await call(writer,'delete_task',{id:task.id});await call(writer,'update_task',{id:task.id,title:'Changed after preview'});assert.equal((await rpc(writer,'tools/call',{name:'delete_task',arguments:{id:task.id,confirmation_token:stale.confirmation_token}})).result.isError,true);
 stage='delete_confirmation';for(const [name,record] of [['task',task],['content_idea',idea],['creator',creator],['collaboration',collab]]){const preview=await call(writer,'delete_'+name,{id:record.id});assert.equal(preview.confirmation_required,true);const forged=await rpc(writer,'tools/call',{name:'delete_'+name,arguments:{id:record.id,confirmation_token:'bad.token'}});assert.equal(forged.result.isError,true);assert.equal((await call(writer,'delete_'+name,{id:record.id,confirmation_token:preview.confirmation_token})).deleted,true);}
 stage='refresh_roles';for(const t of [reader,writer]){const refreshed=await (await fetch(meta.token_endpoint,{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id:t.client_id,refresh_token:t.refresh_token})})).json();assert.equal(claims(refreshed).role,claims(t).role);}
 stage='invalid_consent';assert.ok((await a.rpc('approve_mcp_workspace_actions',{request_id:randomUUID()})).error);
 console.log(JSON.stringify({passed:true,checks:['explicit_write_consent','existing_reader_unchanged','task_CRUD','idea_CRUD','creator_CRUD','collaboration_CRUD','focus_duration','account_isolation','ownership_immutable','delete_preview_confirmation','forged_confirmation_denied','refresh_preserves_roles','invalid_consent_denied','other_account_consent_denied','stale_delete_confirmation_denied']}));
}catch(e){console.error('Failed at '+stage+': '+e.message);process.exitCode=1;}
finally{for(const [c,clientId] of grants)await c.auth.oauth.revokeGrant({clientId});for(const uid of users){for(const table of ['tasks','content_ideas','creators','collaborations'])await admin.from(table).delete().eq('user_id',uid);await admin.auth.admin.deleteUser(uid);}}


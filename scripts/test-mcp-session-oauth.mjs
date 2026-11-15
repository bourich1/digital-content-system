import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

// Staging-only fixture credentials are read locally, never logged or committed.
const base='https://vqmdsohqsspxbvrvsvxj.supabase.co';
const resource='https://boostd-mcp-staging-tamashop848-3253s-projects.vercel.app/api/mcp';
const dir=process.env.BOOSTD_TEST_CREDENTIAL_DIR;
if(!dir) throw Error('Set BOOSTD_TEST_CREDENTIAL_DIR to the staging fixture directory');
const key=readFileSync(join(dir,'staging-anon.txt'),'utf8').trim();
const password=readFileSync(join(dir,'flow-test-pass.txt'),'utf8').trim();
const client=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await client.auth.signInWithPassword({email:'mcp-flow-test@boostd.test',password});
if(login.error) throw Error('Staging fixture login failed');
const meta=await (await fetch(base+'/auth/v1/.well-known/oauth-authorization-server')).json();
const redirect='http://127.0.0.1:19877/callback';
const registration=await fetch(meta.registration_endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_name:'Boostd session regression',redirect_uris:[redirect],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'})});
if(!registration.ok) throw Error('Test client registration failed: '+registration.status);
const {client_id}=await registration.json();

async function exchange(target) {
  const verifier=randomUUID()+randomUUID();
  const params=new URLSearchParams({client_id,redirect_uri:redirect,response_type:'code',scope:'openid',state:randomUUID(),code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url')});
  if(target!==null) params.set('resource',target);
  const start=await fetch(meta.authorization_endpoint+'?'+params,{redirect:'manual'});
  const location=start.headers.get('location');
  if(!location) throw Error('Authorize redirect missing: '+start.status);
  let url=new URL(location);
  const id=url.searchParams.get('authorization_id');
  if(id){
    const details=await client.auth.oauth.getAuthorizationDetails(id);
    if(details.error) throw Error('Authorization details failed');
    if(details.data.redirect_url) url=new URL(details.data.redirect_url);
    else {
      const approval=await client.auth.oauth.approveAuthorization(id,{skipBrowserRedirect:true});
      if(approval.error) throw Error('Test account approval failed');
      url=new URL(approval.data.redirect_url);
    }
  }
  const code=url.searchParams.get('code');
  if(!code) throw Error('Authorization code missing');
  const body=new URLSearchParams({grant_type:'authorization_code',client_id,redirect_uri:redirect,code,code_verifier:verifier});
  if(target!==null) body.set('resource',target);
  const response=await fetch(meta.token_endpoint,{method:'POST',body});
  const tokens=await response.json();
  if(!tokens.access_token) throw Error('Token exchange failed: '+response.status);
  return tokens;
}
const claims=t=>JSON.parse(Buffer.from(t.access_token.split('.')[1],'base64url'));
async function rpc(token,method,params){
  const response=await fetch(resource,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  return {status:response.status,payload:response.status===200?await response.json():null};
}
const init={protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'regression',version:'1'}};
let step='first_exchange';
try {
  const good=await exchange(resource);
  console.log(JSON.stringify({stage:'first_exchange',audienceMatches:claims(good).aud===resource,role:claims(good).role}));
  assert.equal(claims(good).aud,resource); assert.equal(claims(good).role,'boostd_mcp_reader');
  step='initialize';
  const initialized=await rpc(good.access_token,'initialize',init);
  console.log(JSON.stringify({stage:'initialize',status:initialized.status}));
  assert.equal(initialized.status,200);
  step='list_tasks';
  const tasks=await rpc(good.access_token,'tools/call',{name:'list_tasks',arguments:{}});
  assert.equal(tasks.status,200); assert.equal(tasks.payload.result.isError,undefined);
  assert.equal(tasks.payload.result.structuredContent.demo,false);
  step='wrong_resource';
  const wrong=await exchange('https://other-resource.example/api/mcp');
  assert.equal(claims(wrong).role,'authenticated');
  assert.equal((await rpc(wrong.access_token,'initialize',init)).status,401);
  step='missing_resource';
  const missing=await exchange(null);
  assert.equal(claims(missing).role,'authenticated');
  assert.equal((await rpc(missing.access_token,'initialize',init)).status,401);
  step='refresh';
  const refreshed=await (await fetch(meta.token_endpoint,{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id,refresh_token:good.refresh_token})})).json();
  assert.equal(claims(refreshed).aud,resource);
  assert.equal((await rpc(refreshed.access_token,'tools/call',{name:'list_tasks',arguments:{}})).status,200);
  assert.equal((await rpc(null,'initialize',init)).status,401);
  assert.equal((await rpc(login.data.session.access_token,'initialize',init)).status,401);
  step='write_denial';
  const write=await fetch(base+'/rest/v1/tasks',{method:'POST',headers:{apikey:key,authorization:'Bearer '+good.access_token,'content-type':'application/json'},body:JSON.stringify({user_id:login.data.user.id,title:'must be denied'})});
  assert.ok([401,403].includes(write.status));
  step='account_isolation';
  const others=await fetch(base+'/rest/v1/tasks?select=id&user_id=neq.'+login.data.user.id,{headers:{apikey:key,authorization:'Bearer '+good.access_token}});
  assert.equal(others.status,200); assert.deepEqual(await others.json(),[]);
  step='revocation';
  const revoked=await client.auth.oauth.revokeGrant({clientId:client_id});
  assert.equal(revoked.error,null);
  const afterRevoke=await (await fetch(meta.token_endpoint,{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id,refresh_token:refreshed.refresh_token})})).json();
  if(afterRevoke.access_token) assert.equal(claims(afterRevoke).role,'authenticated');
  console.log(JSON.stringify({passed:true,checks:['first_exchange','initialize','list_tasks','wrong_resource','missing_resource','independent_session_refresh','no_token','ordinary_login','direct_write_denied','other_account_hidden','revoked_consent'],probeClient:client_id}));
} catch (error) {
  // Assertion values may contain credentials; never print the raw error.
  console.error('Staging OAuth regression failed at '+step+': '+(error.code??error.name));
  process.exitCode=1;
}


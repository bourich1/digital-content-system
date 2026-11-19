import {useState, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft, ArrowRight, Check, LockKeyhole, Plug, ShieldCheck, X, LoaderCircle, Link2} from 'lucide-react';
import '@/pages/Mcp.css';

export function AgentLogo({name='Your agent',logo}:{name?:string;logo?:string}) {
  const [failed,setFailed]=useState(false);
  const known=/codex/i.test(name)?'/images/brands/codex-dark.svg':/claude/i.test(name)?'/images/brands/claude.svg':/cursor/i.test(name)?'/images/brands/cursor-dark.svg':/openai|chatgpt/i.test(name)?'/images/brands/openai.svg':/opencode/i.test(name)?'/images/brands/opencode-dark.png':undefined;
  let safe:string|undefined;
  try {const u=new URL(logo??'');if(u.protocol==='https:'&&!u.username&&!u.password)safe=u.href;} catch { /* use local identity */ }
  const source=safe??known;
  return <span className={`mcp-agent-symbol ${known?.endsWith('openai.svg')&&!safe?'mcp-openai':''}`}>
    {source&&!failed?<img src={source} alt={`${name} logo`} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<Plug size={28} aria-label={`${name} icon`}/>}
  </span>;
}

export function ConnectionMarks({name,logo}:{name?:string;logo?:string}) {
  return <div className="mcp-connection-marks"><div><span className="mcp-boost-symbol"><img src="/icon white.png" alt="Boostd logo"/></span><small>Boostd</small></div><span className="mcp-connection-line"><Link2 size={17}/></span><div><AgentLogo key={`${name}-${logo}`} name={name} logo={logo}/><small>{name||'Your agent'}</small></div></div>;
}

export function McpFooter(){return <footer className="mcp-footer"><span>© {new Date().getFullYear()} Boostd</span><div><Link to="/mcp">MCP guide</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></footer>;}

export function McpAuthFrame({children}:{children:ReactNode}) {
 return <div className="mcp-page mcp-auth-page"><header className="mcp-topbar"><Link to="/" aria-label="Boostd home"><img src="/logo white.png" alt="Boostd"/></Link><span className="mcp-top-note"><LockKeyhole size={13}/>Secure connection</span></header><div className="mcp-auth-layout"><aside className="mcp-auth-story"><Link to="/mcp" className="mcp-back"><ArrowLeft size={15}/> Explore Boostd MCP</Link><div><span className="mcp-eyebrow">YOUR WORKSPACE. YOUR WAY.</span><h2>A little context.<br/>A lot more<br/><em>possibility.</em></h2><p>Bring your ideas, tasks, and plans into the conversation. Keep your creative flow going.</p><div className="mcp-story-note"><ShieldCheck size={20}/><span>Your account.<br/><strong>Your permission, every connection.</strong></span></div></div><span className="mcp-story-bottom">MADE FOR YOUR NEXT GREAT IDEA <span>↗</span></span></aside><main className="mcp-auth-main">{children}</main></div><McpFooter/></div>;
}

type ConsentProps={name?:string;logo?:string;email?:string;scopes?:string;ready?:boolean;busy?:boolean;error?:string;writes?:boolean;onDecide?:(allow:boolean)=>void};
export function McpConsentView({name,logo,email,scopes,ready=false,busy=false,error,writes=false,onDecide}:ConsentProps){
 return <McpAuthFrame><section className="mcp-auth-card" aria-labelledby="mcp-title"><ConnectionMarks name={name} logo={logo}/><div className="mcp-auth-heading"><span className="mcp-eyebrow">ONE CONNECTION. MORE CONTEXT.</span><h1 id="mcp-title">{error?'Let’s try that again.':'Connect to Boostd'}</h1><p>{error?'This connection request needs a fresh start.':ready?<><strong>{name}</strong> would like to access your Boostd workspace.</>:'Checking the connection request…'}</p></div>
 {error?<div className="mcp-error" role="alert"><X size={18}/><p>{error}</p></div>:ready?<><div className="mcp-account"><span>{email?.slice(0,1).toUpperCase()||'B'}</span><div><small>CONNECTING AS</small><strong>{email||'Your Boostd account'}</strong></div><ShieldCheck size={17}/></div><div className="mcp-permission-title"><h2>{name} will be able to</h2><span>{writes?'Workspace access':'Read-only access'}</span></div><ul className="mcp-permissions"><li><Check size={17}/><div><strong>Read your tasks and content ideas</strong><p>Get context for what you’re working on.</p></div></li><li><Check size={17}/><div><strong>View collaborations and your calendar</strong><p>See the plans and partnerships you have access to.</p></div></li><li><Check size={17}/><div><strong>Browse your available tools</strong><p>Find resources from your Boostd catalog.</p></div></li>{writes&&<li><Check size={17}/><div><strong>Create, update and delete workspace records</strong><p>Manage your tasks, ideas, saved creators and owned collaborations. Deletion requires a separate confirmation in your agent.</p></div></li>}</ul>{!writes&&<div className="mcp-no-write"><LockKeyhole size={14}/>This connection cannot edit or delete your content.</div>}{scopes&&<details className="mcp-scopes"><summary>Account permissions</summary><p>{scopes}</p><p>The agent also receives the account information covered by these requested scopes.</p></details>}<div className="mcp-decision"><button className="mcp-button mcp-secondary" disabled={busy} onClick={()=>onDecide?.(false)}>Cancel</button><button className="mcp-button mcp-primary" disabled={busy} onClick={()=>onDecide?.(true)}>{busy?<LoaderCircle className="mcp-spin" size={16}/>:<>Authorize connection <ArrowRight size={16}/></>}</button></div><p className="mcp-auth-fine">Only authorize an app you intended to connect. Your password is never shared with the agent.</p></>:<div className="mcp-loading" role="status"><LoaderCircle className="mcp-spin" size={22}/>Loading request details</div>}
 {error&&<><Link to="/mcp#connect" className="mcp-button mcp-primary mcp-full">Back to connection guide <ArrowRight size={16}/></Link><p className="mcp-auth-fine">Start a new connection from your agent to get a fresh request.</p></>}
 </section></McpAuthFrame>;
}

export function McpApprovedView({name, logo, seconds, popupStatus, onContinue}: {
  name?: string;
  logo?: string;
  seconds: number;
  popupStatus?: 'waiting' | 'connected' | 'unconfirmed';
  onContinue: () => void;
}) {
  const agent = name || 'your agent';
  return <McpAuthFrame>
    <section className="mcp-auth-card mcp-approved" aria-labelledby="mcp-approved-title">
      <ConnectionMarks name={name} logo={logo}/>
      <div className="mcp-approved-check"><Check size={27}/></div>
      <div className="mcp-auth-heading">
        <h1 id="mcp-approved-title">{popupStatus === 'connected' ? 'Connected' : 'Access approved'}</h1>
        <p role="status">
          {popupStatus === 'connected' ? `You can return to ${agent}.`
            : popupStatus === 'waiting' ? `Waiting for ${agent} to finish connecting…`
            : popupStatus === 'unconfirmed' ? 'Boostd could not confirm the connection. Check your agent before retrying.'
            : `Returning to ${agent} in ${seconds} seconds…`}
        </p>
      </div>
      {(!popupStatus || popupStatus === 'unconfirmed') &&
        <button className="mcp-button mcp-primary mcp-full" onClick={onContinue}>
          Continue to {agent} <ArrowRight size={16}/>
        </button>}
    </section>
  </McpAuthFrame>;
}

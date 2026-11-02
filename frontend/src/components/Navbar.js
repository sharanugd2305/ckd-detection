import React from 'react';
import {Link,useLocation} from 'react-router-dom';
import {SignInButton,SignUpButton,SignedIn,SignedOut,UserButton} from '@clerk/clerk-react';

const clerkConfigured=Boolean(process.env.REACT_APP_CLERK_PUBLISHABLE_KEY);

export default function Navbar(){
  const {pathname}=useLocation();

  const links=[['/', 'Home'],['/predict','Predict'],['/models','Models'],['/about','About']];

  return(
    <nav className="site-navbar" style={{
      position:'sticky',top:0,zIndex:300,height:64,padding:'0 2rem',
      display:'flex',alignItems:'center',justifyContent:'space-between',
      background:'#E8F0E8',
      backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
      borderBottom:'1px solid #D1E0D6',
      transition:'all .3s ease',
    }}>
      <Link className="site-brand" to="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#21675D"/>
              <stop offset="100%" stopColor="#72C8B5"/>
            </linearGradient>
          </defs>
          <ellipse cx="17" cy="17" rx="14" ry="16" fill="url(#lg1)" opacity="0.15"/>
          <ellipse cx="17" cy="17" rx="14" ry="16" stroke="url(#lg1)" strokeWidth="1.5" fill="none"/>
          <circle cx="17" cy="12" r="4" fill="url(#lg1)" opacity="0.8"/>
          <path d="M10 20 Q17 26 24 20" stroke="url(#lg1)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
        <div>
          <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.05rem',fontWeight:700,color:'#26363D',letterSpacing:'-.02em',lineHeight:1.1}}>NephroScan</div>
          <div style={{fontSize:'.6rem',color:'#74858B',letterSpacing:'.08em',textTransform:'uppercase'}}>CKD Detection System</div>
        </div>
      </Link>

      <div className="site-nav-links" style={{display:'flex',alignItems:'center',gap:4}}>
        {links.map(([p,l])=>{
          const active=pathname===p;
          return(
            <Link key={p} to={p} style={{
              textDecoration:'none',padding:'7px 14px',borderRadius:8,
              fontSize:'.875rem',fontWeight:active?600:400,
              color:active?'#18594F':'#50636B',
              background:active?'#E8F0EF':'transparent',
              border:`1px solid ${active?'#C6D4D3':'transparent'}`,
              transition:'all .2s',
            }}
              onMouseOver={e=>{if(!active){e.currentTarget.style.color='#18594F';e.currentTarget.style.background='#E8F0EF';}}}
              onMouseOut={e=>{if(!active){e.currentTarget.style.color='#50636B';e.currentTarget.style.background='transparent';}}}
            >{l}</Link>
          );
        })}
        {clerkConfigured&&(
          <>
            <SignedIn>
              <Link to="/dashboard" style={{textDecoration:'none',padding:'7px 14px',borderRadius:8,fontSize:'.875rem',fontWeight:pathname==='/dashboard'?600:400,color:pathname==='/dashboard'?'#18594F':'#50636B',background:pathname==='/dashboard'?'#E8F0EF':'transparent',border:`1px solid ${pathname==='/dashboard'?'#C6D4D3':'transparent'}`}}>Dashboard</Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button type="button" style={{padding:'7px 12px',border:'1px solid #B9D0C3',borderRadius:8,background:'#F5F8F2',color:'#26363D',fontSize:'.82rem',cursor:'pointer'}}>Sign in</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button type="button" style={{padding:'7px 12px',border:'1px solid #9CC8BD',borderRadius:8,background:'#E8F0EF',color:'#18594F',fontSize:'.82rem',cursor:'pointer'}}>Sign up</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </>
        )}

      </div>
    </nav>
  );
}

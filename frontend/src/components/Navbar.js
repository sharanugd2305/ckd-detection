import React,{useState,useEffect} from 'react';
import {Link,useLocation} from 'react-router-dom';

export default function Navbar(){
  const {pathname}=useLocation();
  const [solid,setSolid]=useState(false);

  useEffect(()=>{
    const h=()=>setSolid(window.scrollY>30);
    window.addEventListener('scroll',h);
    return()=>window.removeEventListener('scroll',h);
  },[]);

  const s={
    nav:{
      position:'sticky',top:0,zIndex:300,
      height:64,padding:'0 2rem',
      display:'flex',alignItems:'center',justifyContent:'space-between',
      background:solid?'rgba(6,11,24,0.95)':'rgba(6,11,24,0.6)',
      backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
      borderBottom:`1px solid ${solid?'#172240':'transparent'}`,
      transition:'all .3s ease',
    },
    logo:{
      display:'flex',alignItems:'center',gap:10,
      textDecoration:'none',
    },
    logoMark:{
      width:34,height:34,position:'relative',flexShrink:0,
    },
    links:{display:'flex',alignItems:'center',gap:4},
    link:(a)=>({
      textDecoration:'none',
      padding:'7px 14px',borderRadius:8,
      fontSize:'0.875rem',fontWeight:a?600:400,
      color:a?'#DCE8FF':'#7A92BC',
      background:a?'rgba(45,106,255,0.12)':'transparent',
      border:`1px solid ${a?'rgba(45,106,255,0.25)':'transparent'}`,
      transition:'all .2s',
    }),
    cta:{
      textDecoration:'none',
      marginLeft:8,padding:'8px 20px',
      borderRadius:8,
      background:'linear-gradient(135deg,#2D6AFF,#00E5B4)',
      color:'#fff',fontSize:'0.875rem',fontWeight:600,
      boxShadow:'0 4px 20px rgba(45,106,255,0.3)',
      transition:'opacity .2s,transform .2s',
      display:'inline-block',
    },
  };

  return(
    <nav style={s.nav}>
      {/* Logo */}
      <Link to="/" style={s.logo}>
        <div style={s.logoMark}>
          {/* Kidney shape SVG */}
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2D6AFF"/>
                <stop offset="100%" stopColor="#00E5B4"/>
              </linearGradient>
            </defs>
            <ellipse cx="17" cy="17" rx="14" ry="16" fill="url(#lg1)" opacity="0.15"/>
            <ellipse cx="17" cy="17" rx="14" ry="16" stroke="url(#lg1)" strokeWidth="1.5" fill="none"/>
            <circle cx="17" cy="12" r="4" fill="url(#lg1)" opacity="0.8"/>
            <path d="M10 20 Q17 26 24 20" stroke="url(#lg1)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.05rem',fontWeight:700,color:'#DCE8FF',letterSpacing:'-0.02em',lineHeight:1.1}}>
            NephroScan
          </div>
          <div style={{fontSize:'0.6rem',color:'#3A506A',letterSpacing:'0.08em',textTransform:'uppercase'}}>
            CKD Detection System
          </div>
        </div>
      </Link>

      {/* Nav links */}
      <div style={s.links}>
        {[['/', 'Home'],['/predict','Predict'],['/about','About']].map(([p,l])=>(
          <Link key={p} to={p} style={s.link(pathname===p)}
            onMouseOver={e=>{if(pathname!==p){e.currentTarget.style.color='#DCE8FF';e.currentTarget.style.background='rgba(255,255,255,0.04)';}}}
            onMouseOut={e=>{if(pathname!==p){e.currentTarget.style.color='#7A92BC';e.currentTarget.style.background='transparent';}}}
          >{l}</Link>
        ))}
        <Link to="/predict" style={s.cta}
          onMouseOver={e=>{e.currentTarget.style.opacity='.85';e.currentTarget.style.transform='translateY(-1px)';}}
          onMouseOut={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)';}}
        >Run Analysis →</Link>
      </div>
    </nav>
  );
}

import React,{useState,useEffect,useRef} from 'react';
import {useNavigate} from 'react-router-dom';

/* ── Animated counter ── */
function Counter({to,suffix='',duration=1800}){
  const [v,setV]=useState(0);
  const ref=useRef(null);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting){
        let s=0,step=to/(duration/16);
        const t=setInterval(()=>{
          s+=step;
          if(s>=to){setV(to);clearInterval(t);}
          else setV(Math.floor(s));
        },16);
        obs.disconnect();
      }
    },{threshold:.3});
    if(ref.current)obs.observe(ref.current);
    return()=>obs.disconnect();
  },[to,duration]);
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}

/* ── Feature card ── */
function FCard({icon,title,body,accent='#2D6AFF',delay=0}){
  const [hov,setHov]=useState(false);
  return(
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background:hov?'#111D33':'#0D1526',
        border:`1px solid ${hov?'#1F2F50':'#172240'}`,
        borderRadius:16,padding:'1.6rem',
        transition:'all .25s ease',
        transform:hov?'translateY(-5px)':'none',
        boxShadow:hov?'0 20px 40px rgba(0,0,0,.4)':'none',
        animation:`fadeUp .5s ease ${delay}ms both`,
        cursor:'default',
      }}
    >
      <div style={{
        width:44,height:44,borderRadius:10,marginBottom:'1.1rem',
        background:`${accent}18`,border:`1px solid ${accent}30`,
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:'1.4rem',transition:'transform .25s',
        transform:hov?'scale(1.1)':'scale(1)',
      }}>{icon}</div>
      <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'.95rem',fontWeight:600,color:'#DCE8FF',marginBottom:6}}>{title}</div>
      <div style={{color:'#7A92BC',fontSize:'.83rem',lineHeight:1.65}}>{body}</div>
    </div>
  );
}

/* ── Age badge ── */
function AgeBadge({emoji,label,color}){
  const [hov,setHov]=useState(false);
  return(
    <span
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        display:'inline-flex',alignItems:'center',gap:6,
        padding:'6px 14px',borderRadius:999,
        background:hov?`${color}22`:`${color}12`,
        border:`1px solid ${color}${hov?'55':'28'}`,
        color:hov?color:'#7A92BC',
        fontSize:'.8rem',fontWeight:500,
        transition:'all .2s',cursor:'default',
      }}
    >{emoji} {label}</span>
  );
}

export default function Home(){
  const nav=useNavigate();

  const features=[
    {icon:'🧬',title:'Age-Aware Thresholds',    body:'Creatinine, GFR, and hemoglobin norms auto-adjust for infants, children, teens, and adults using pediatric nephrological standards.',accent:'#2D6AFF',delay:0},
    {icon:'⚡',title:'Instant Risk Scoring',     body:'Trained ML models deliver a precise CKD probability score with confidence metrics in under a second.',accent:'#00E5B4',delay:80},
    {icon:'📊',title:'CKD Stage Estimation',     body:'GFR-based staging maps every result to Stage 1–5 following KDIGO international clinical guidelines.',accent:'#9B6DFF',delay:160},
    {icon:'🚦',title:'Early Detection Alerts',   body:'Specialized warning system for high-risk groups — children, young adults, and patients with family history.',accent:'#FFAA2C',delay:240},
    {icon:'💊',title:'Personalized Guidance',    body:'Evidence-based health recommendations tailored to each patient\'s specific lab values, age group, and identified risk factors.',accent:'#00E5B4',delay:320},
    {icon:'🔬',title:'Multi-Model Ensemble',     body:'Logistic Regression, Random Forest, SVM, and XGBoost — all trained with SMOTE balancing on clinically validated data.',accent:'#2D6AFF',delay:400},
  ];

  const ages=[
    {emoji:'👶',label:'Infant',   color:'#9B6DFF'},
    {emoji:'👧',label:'Child',    color:'#2D6AFF'},
    {emoji:'🧑',label:'Teen',     color:'#00BFFF'},
    {emoji:'👨',label:'Young Adult',color:'#00E5B4'},
    {emoji:'🧔',label:'Adult',    color:'#FFAA2C'},
    {emoji:'👴',label:'Senior',   color:'#FF3D57'},
  ];

  const stages=[
    {label:'Stage 1–2',range:'GFR ≥ 60',desc:'Mild',color:'#00E5B4',w:'32%'},
    {label:'Stage 3a', range:'GFR 45–59',desc:'Mild–Moderate',color:'#FFAA2C',w:'20%'},
    {label:'Stage 3b', range:'GFR 30–44',desc:'Moderate',color:'#FF8C42',w:'18%'},
    {label:'Stage 4',  range:'GFR 15–29',desc:'Severe',color:'#FF5E5B',w:'18%'},
    {label:'Stage 5',  range:'GFR < 15', desc:'Kidney Failure',color:'#FF3D57',w:'12%'},
  ];

  return(
    <div style={{maxWidth:1120,margin:'0 auto',padding:'0 2rem 6rem'}}>

      {/* ── Hero ── */}
      <div style={{paddingTop:'5rem',paddingBottom:'4rem',textAlign:'center',position:'relative'}}>
        {/* Background glows */}
        <div style={{position:'absolute',top:0,left:'20%',width:500,height:400,background:'radial-gradient(circle,rgba(45,106,255,.07) 0%,transparent 70%)',pointerEvents:'none',borderRadius:'50%'}}/>
        <div style={{position:'absolute',top:'15%',right:'10%',width:350,height:350,background:'radial-gradient(circle,rgba(0,229,180,.05) 0%,transparent 70%)',pointerEvents:'none',borderRadius:'50%'}}/>

        <div style={{
          display:'inline-flex',alignItems:'center',gap:8,
          padding:'5px 14px',borderRadius:999,marginBottom:'1.2rem',
          background:'rgba(45,106,255,.08)',
          border:'1px solid rgba(45,106,255,.2)',
          animation:'fadeUp .4s ease',
        }}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#00E5B4',display:'inline-block',animation:'blink 1.5s ease infinite'}}/>
          <span style={{fontSize:'.78rem',color:'#00E5B4',fontWeight:500,letterSpacing:'.04em'}}>LIVE</span>
        </div>

        <h1 style={{
          fontFamily:'Space Grotesk,sans-serif',
          fontSize:'clamp(2.2rem,5.5vw,3.8rem)',
          fontWeight:800,lineHeight:1.08,letterSpacing:'-.035em',
          marginBottom:'1.4rem',
          animation:'fadeUp .5s ease .08s both',
        }}>
          <span style={{
            backgroundImage:'linear-gradient(135deg,#2D6AFF 20%,#00E5B4 80%)',
            backgroundSize:'200% 200%',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            animation:'gradShift 4s ease infinite',
          }}>Detect Kidney Disease</span>
        </h1>

        <p style={{
          color:'#7A92BC',fontSize:'1.05rem',maxWidth:520,margin:'0 auto 2.4rem',
          lineHeight:1.75,animation:'fadeUp .5s ease .16s both',
        }}>
          AI-powered CKD risk assessment for every age group — from newborns to seniors. Clinical values in, instant diagnosis out.
        </p>

        <div style={{display:'flex',gap:'1rem',justifyContent:'center',flexWrap:'wrap',animation:'fadeUp .5s ease .24s both'}}>
          <button onClick={()=>nav('/predict')} style={{
            padding:'13px 32px',borderRadius:10,border:'none',cursor:'pointer',
            background:'linear-gradient(135deg,#2D6AFF,#00E5B4)',
            color:'#fff',fontFamily:'Space Grotesk,sans-serif',
            fontSize:'.95rem',fontWeight:700,letterSpacing:'-.01em',
            boxShadow:'0 8px 28px rgba(45,106,255,.35)',
            transition:'all .2s',
          }}
            onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 14px 36px rgba(45,106,255,.5)';}}
            onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 28px rgba(45,106,255,.35)';}}
          >Start Analysis →</button>
          <button onClick={()=>nav('/about')} style={{
            padding:'13px 28px',borderRadius:10,border:'1px solid #172240',
            background:'transparent',color:'#7A92BC',fontSize:'.95rem',cursor:'pointer',
            transition:'all .2s',
          }}
            onMouseOver={e=>{e.currentTarget.style.color='#DCE8FF';e.currentTarget.style.borderColor='#1F2F50';}}
            onMouseOut={e=>{e.currentTarget.style.color='#7A92BC';e.currentTarget.style.borderColor='#172240';}}
          >View Methodology</button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{
        display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',
        marginBottom:'4rem',
      }}>
        {[
          {v:11,s:'',label:'Clinical Features',color:'#2D6AFF'},
          {v:4, s:'',label:'ML Models',color:'#00E5B4'},
          {v:6, s:'',label:'Age Groups Covered',color:'#9B6DFF'},
          {v:90,s:'%+',label:'Detection Accuracy',color:'#FFAA2C'},
        ].map((st,i)=>(
          <div key={i} style={{
            background:'#0D1526',border:'1px solid #172240',borderRadius:14,
            padding:'1.4rem',textAlign:'center',
            transition:'transform .2s,border-color .2s',
          }}
            onMouseOver={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.borderColor=st.color;}}
            onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='#172240';}}
          >
            <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'2.2rem',fontWeight:800,color:st.color,lineHeight:1,marginBottom:6}}>
              <Counter to={st.v} suffix={st.s}/>
            </div>
            <div style={{color:'#7A92BC',fontSize:'.78rem',letterSpacing:'.04em'}}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* ── All-age banner ── */}
      <div style={{
        background:'#0D1526',border:'1px solid #172240',borderRadius:18,
        padding:'1.8rem 2rem',marginBottom:'4rem',
        animation:'fadeUp .5s ease .1s both',
      }}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'2rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:240}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#00E5B4',display:'inline-block',animation:'blink 2s ease infinite'}}/>
              <span style={{fontSize:'.72rem',color:'#00E5B4',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase'}}>All-Age Detection</span>
            </div>
            <h3 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.05rem',fontWeight:700,color:'#DCE8FF',marginBottom:6}}>
              CKD doesn't only affect adults
            </h3>
            <p style={{color:'#7A92BC',fontSize:'.85rem',lineHeight:1.65,maxWidth:380}}>
              Children are increasingly diagnosed with chronic kidney disease. Our system applies age-adjusted clinical reference ranges for every patient.
            </p>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,alignContent:'flex-start'}}>
            {ages.map((a,i)=><AgeBadge key={i} {...a}/>)}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{marginBottom:'4rem'}}>
        <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
          <div style={{color:'#2D6AFF',fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:8}}>Capabilities</div>
          <h2 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.75rem',fontWeight:800,color:'#DCE8FF',letterSpacing:'-.025em'}}>
            What makes NephroScan different
          </h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
          {features.map((f,i)=><FCard key={i} {...f}/>)}
        </div>
      </div>

      {/* ── CKD Stage reference ── */}
      <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:18,padding:'2rem',marginBottom:'4rem'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'2rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:260}}>
            <div style={{color:'#7A92BC',fontSize:'.7rem',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>KDIGO International Guidelines</div>
            <h3 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.1rem',fontWeight:700,color:'#DCE8FF',marginBottom:8}}>GFR-based CKD staging</h3>
            <p style={{color:'#7A92BC',fontSize:'.85rem',lineHeight:1.65,marginBottom:'1.2rem',maxWidth:380}}>
              Glomerular Filtration Rate is the gold standard for measuring kidney function. NephroScan maps every result directly onto the clinical staging framework.
            </p>
            {/* Stage color bar */}
            <div style={{display:'flex',borderRadius:6,overflow:'hidden',height:8,marginBottom:8}}>
              {stages.map((s,i)=><div key={i} style={{width:s.w,background:s.color}}/>)}
            </div>
            <div style={{display:'flex',gap:'2px'}}>
              {stages.map((s,i)=><div key={i} style={{width:s.w,fontSize:'.62rem',color:s.color,overflow:'hidden',whiteSpace:'nowrap',paddingRight:4}}>{s.label}</div>)}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6,minWidth:260}}>
            {stages.map((s,i)=>(
              <div key={i} style={{
                display:'flex',alignItems:'center',gap:10,
                padding:'9px 12px',borderRadius:8,
                background:`${s.color}0C`,border:`1px solid ${s.color}22`,
                transition:'transform .2s',cursor:'default',
              }}
                onMouseOver={e=>e.currentTarget.style.transform='translateX(4px)'}
                onMouseOut={e=>e.currentTarget.style.transform='translateX(0)'}
              >
                <div style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                <span style={{color:s.color,fontWeight:600,fontSize:'.8rem',minWidth:72}}>{s.label}</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',color:'#3A506A',fontSize:'.72rem'}}>{s.range}</span>
                <span style={{color:'#7A92BC',fontSize:'.75rem',marginLeft:'auto'}}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{
        background:'linear-gradient(135deg,rgba(45,106,255,.1),rgba(0,229,180,.07))',
        border:'1px solid rgba(45,106,255,.2)',
        borderRadius:20,padding:'3rem',textAlign:'center',
      }}>
        <h2 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.9rem',fontWeight:800,color:'#DCE8FF',letterSpacing:'-.025em',marginBottom:'1rem'}}>
          Ready to run an analysis?
        </h2>
        <p style={{color:'#7A92BC',fontSize:'.95rem',marginBottom:'2rem',lineHeight:1.65}}>
          Enter any patient's clinical values and receive an instant, stage-aware CKD risk report.
        </p>
        <button onClick={()=>nav('/predict')} style={{
          padding:'14px 40px',borderRadius:10,border:'none',cursor:'pointer',
          background:'linear-gradient(135deg,#2D6AFF,#00E5B4)',
          color:'#fff',fontFamily:'Space Grotesk,sans-serif',
          fontSize:'1rem',fontWeight:700,letterSpacing:'-.01em',
          boxShadow:'0 8px 28px rgba(45,106,255,.3)',
          transition:'all .2s',
        }}
          onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 16px 40px rgba(45,106,255,.45)';}}
          onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 28px rgba(45,106,255,.3)';}}
        >Start CKD Analysis →</button>
      </div>
    </div>
  );
}

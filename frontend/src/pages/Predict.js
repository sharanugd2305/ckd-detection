import React,{useState,useMemo} from 'react';
import axios from 'axios';

/* ── Field definitions by group ───────────────────────────── */
const GROUPS=[
  {
    label:'Kidney Function',icon:'🫘',
    fields:[
      {key:'SerumCreatinine',label:'Serum Creatinine',unit:'mg/dL',min:0,max:20,step:.01,normal:'0.6–1.2',desc:'Primary marker of kidney filtration'},
      {key:'BUNLevels',label:'BUN Levels',unit:'mg/dL',min:0,max:150,step:.1,normal:'8–25',desc:'Blood urea nitrogen — waste product filtered by kidneys'},
      {key:'GFR',label:'GFR (eGFR)',unit:'mL/min',min:0,max:150,step:.1,normal:'≥ 90',desc:'Gold standard for kidney function measurement'},
      {key:'ProteinInUrine',label:'Protein in Urine',unit:'g/day',min:0,max:20,step:.01,normal:'< 0.15',desc:'Protein leakage indicates kidney damage'},
    ],
  },
  {
    label:'Blood Markers',icon:'🩸',
    fields:[
      {key:'HbA1c',label:'HbA1c',unit:'%',min:0,max:20,step:.1,normal:'4.0–5.6',desc:'3-month blood sugar average — diabetic risk indicator'},
      {key:'HemoglobinLevels',label:'Hemoglobin',unit:'g/dL',min:0,max:25,step:.1,normal:'12–17',desc:'Low levels indicate anemia common in CKD'},
      {key:'CholesterolTotal',label:'Total Cholesterol',unit:'mg/dL',min:0,max:400,step:1,normal:'< 200',desc:'Cardiovascular risk linked to kidney disease progression'},
    ],
  },
  {
    label:'Patient Profile',icon:'👤',
    fields:[
      {key:'Age',label:'Age',unit:'years',min:0,max:120,step:1,normal:'Any age',desc:'Age-adjusted thresholds applied automatically'},
      {key:'BMI',label:'BMI',unit:'kg/m²',min:5,max:60,step:.1,normal:'18.5–24.9',desc:'Body mass index — obesity increases CKD risk'},
      {key:'UrinaryTractInfections',label:'UTI Count',unit:'count',min:0,max:20,step:1,normal:'0',desc:'Recurrent UTIs can cause kidney scarring'},
      {key:'FamilyHistoryKidneyDisease',label:'Family History',unit:'0 or 1',min:0,max:1,step:1,normal:'0',desc:'Genetic risk factor for CKD'},
    ],
  },
];

const ALL_FIELDS=GROUPS.flatMap(g=>g.fields);
const ALL_KEYS=ALL_FIELDS.map(f=>f.key);
const init=Object.fromEntries(ALL_KEYS.map(k=>[k,'']));

/* ── Radar component ── */
function KidneyRadar({values}){
  const axes=[
    {key:'GFR',label:'GFR',invert:true,max:150},
    {key:'SerumCreatinine',label:'Creatinine',invert:false,max:10},
    {key:'BUNLevels',label:'BUN',invert:false,max:80},
    {key:'HemoglobinLevels',label:'Hemoglobin',invert:true,max:18},
    {key:'HbA1c',label:'HbA1c',invert:false,max:12},
    {key:'ProteinInUrine',label:'Protein',invert:false,max:5},
  ];
  const cx=110,cy=110,r=80,n=axes.length;
  const pts=axes.map((ax,i)=>{
    const angle=(i/n)*2*Math.PI-Math.PI/2;
    const raw=parseFloat(values[ax.key]||0);
    const norm=Math.min(raw/ax.max,1);
    const val=ax.invert?(1-norm):norm;
    return {x:cx+r*val*Math.cos(angle),y:cy+r*val*Math.sin(angle),lx:cx+(r+22)*Math.cos(angle),ly:cy+(r+22)*Math.sin(angle),label:ax.label,val};
  });
  const filled=pts.every(p=>p.val>0);
  const poly=pts.map(p=>`${p.x},${p.y}`).join(' ');
  const gridLevels=[.25,.5,.75,1];

  return(
    <svg width="220" height="220" viewBox="0 0 220 220" style={{overflow:'visible'}}>
      {/* Grid */}
      {gridLevels.map(lv=>(
        <polygon key={lv} points={axes.map((_,i)=>{
          const angle=(i/n)*2*Math.PI-Math.PI/2;
          return `${cx+r*lv*Math.cos(angle)},${cy+r*lv*Math.sin(angle)}`;
        }).join(' ')} fill="none" stroke="#172240" strokeWidth="1"/>
      ))}
      {/* Spokes */}
      {axes.map((_,i)=>{
        const angle=(i/n)*2*Math.PI-Math.PI/2;
        return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(angle)} y2={cy+r*Math.sin(angle)} stroke="#172240" strokeWidth="1"/>;
      })}
      {/* Filled area */}
      {filled&&(
        <polygon points={poly}
          fill="rgba(45,106,255,.15)" stroke="url(#rg)" strokeWidth="2"
          style={{filter:'drop-shadow(0 0 8px rgba(45,106,255,.3))'}}
        />
      )}
      {/* Data points */}
      {pts.map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r={3}
          fill={p.val>0?'#2D6AFF':'#172240'}
          style={{transition:'all .4s ease'}}
        />
      ))}
      {/* Labels */}
      {pts.map((p,i)=>(
        <text key={i} x={p.lx} y={p.ly+4}
          textAnchor="middle" fontSize="9"
          fill={p.val>0?'#7A92BC':'#3A506A'}
          fontFamily="JetBrains Mono,monospace"
          style={{transition:'fill .3s'}}
        >{p.label}</text>
      ))}
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2D6AFF"/>
          <stop offset="100%" stopColor="#00E5B4"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Progress bar ── */
function Bar({pct,color='#2D6AFF',animate=false}){
  return(
    <div style={{background:'#060B18',borderRadius:999,height:8,overflow:'hidden'}}>
      <div style={{
        height:'100%',borderRadius:999,
        background:color,
        width:`${pct}%`,
        transition:'width 1s ease',
        boxShadow:`0 0 12px ${color}80`,
      }}/>
    </div>
  );
}

/* ── Recommendation card ── */
const RC={
  success:{bg:'rgba(0,229,180,.07)',border:'rgba(0,229,180,.25)',text:'#00E5B4'},
  warning:{bg:'rgba(255,170,44,.07)',border:'rgba(255,170,44,.25)',text:'#FFAA2C'},
  danger: {bg:'rgba(255,61,87,.07)', border:'rgba(255,61,87,.25)', text:'#FF3D57'},
  info:   {bg:'rgba(45,106,255,.07)',border:'rgba(45,106,255,.25)',text:'#2D6AFF'},
};

function RecCard({rec,delay=0}){
  const c=RC[rec.type]||RC.info;
  return(
    <div style={{
      background:c.bg,border:`1px solid ${c.border}`,
      borderRadius:10,padding:'12px 16px',
      display:'flex',gap:12,alignItems:'flex-start',
      animation:`fadeUp .4s ease ${delay}ms both`,
    }}>
      <span style={{fontSize:'1.2rem',lineHeight:1,flexShrink:0}}>{rec.icon}</span>
      <div>
        <div style={{color:c.text,fontWeight:600,fontSize:'.88rem',marginBottom:3}}>{rec.title}</div>
        <div style={{color:'#7A92BC',fontSize:'.82rem',lineHeight:1.55}}>{rec.desc}</div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function Predict(){
  const [form,setForm]=useState(init);
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  const progress=useMemo(()=>{
    const filled=ALL_KEYS.filter(k=>form[k]!=='').length;
    return Math.round((filled/ALL_KEYS.length)*100);
  },[form]);

  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const submit=async()=>{
    const empty=ALL_KEYS.filter(k=>form[k]==='');
    if(empty.length){setError(`Fill in all fields (${empty.length} remaining)`);return;}
    setError('');setLoading(true);setResult(null);
    try{
      const res=await axios.post('http://localhost:5000/predict',form);
      setResult(res.data);
      setTimeout(()=>document.getElementById('result-section')?.scrollIntoView({behavior:'smooth'}),100);
    }catch{
      setError('Cannot reach backend. Make sure Flask is running on port 5000.');
    }
    setLoading(false);
  };

  const reset=()=>{setForm(init);setResult(null);setError('');};

  const iStyle={
    width:'100%',padding:'10px 12px',
    background:'#060B18',border:'1px solid #172240',
    borderRadius:8,color:'#DCE8FF',fontSize:'.93rem',
    outline:'none',fontFamily:'JetBrains Mono,monospace',
    transition:'border .2s',
  };

  return(
    <div style={{maxWidth:1100,margin:'0 auto',padding:'2.5rem 2rem 6rem'}}>

      {/* Header */}
      <div style={{marginBottom:'2.5rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#2D6AFF',display:'inline-block',animation:'blink 1.5s ease infinite'}}/>
          <span style={{fontSize:'.72rem',color:'#2D6AFF',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase'}}>Real-Time Analysis</span>
        </div>
        <h1 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'2rem',fontWeight:800,color:'#DCE8FF',letterSpacing:'-.03em',marginBottom:6}}>
          CKD Risk Assessment
        </h1>
        <p style={{color:'#7A92BC',fontSize:'.9rem'}}>
          Enter all clinical values in a single form below. The radar chart updates live as you type.
        </p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:'1.5rem',alignItems:'start'}}>

        {/* ── Left: form ── */}
        <div>
          {/* Progress bar */}
          <div style={{
            background:'#0D1526',border:'1px solid #172240',
            borderRadius:12,padding:'1rem 1.4rem',marginBottom:'1.2rem',
            display:'flex',alignItems:'center',gap:'1rem',
          }}>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:'.78rem',color:'#7A92BC',fontWeight:500}}>Form completion</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.78rem',color:progress===100?'#00E5B4':'#2D6AFF',fontWeight:600}}>{progress}%</span>
              </div>
              <Bar pct={progress} color={progress===100?'#00E5B4':'#2D6AFF'}/>
            </div>
            {progress===100&&(
              <span style={{fontSize:'.8rem',color:'#00E5B4',fontWeight:600,whiteSpace:'nowrap',animation:'fadeIn .3s ease'}}>✓ Ready</span>
            )}
          </div>

          {/* Fields */}
          <div style={{
            background:'#0D1526',border:'1px solid #172240',
            borderRadius:14,padding:'1.4rem',marginBottom:'1.2rem',
          }}>
            <div style={{marginBottom:'1rem'}}>
              <span style={{fontSize:'.72rem',color:'#3A506A',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase'}}>
                Clinical Details
              </span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
              {ALL_FIELDS.map(f=>(
                <div key={f.key} style={{
                  background:'#060B18',border:`1px solid ${form[f.key]?'#1F2F50':'#172240'}`,
                  borderRadius:10,padding:'1rem',
                  transition:'border-color .2s',
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                    <label style={{fontSize:'.8rem',color:'#7A92BC',fontWeight:500,lineHeight:1.3}}>{f.label}</label>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.68rem',color:'#3A506A',flexShrink:0,marginLeft:8}}>{f.unit}</span>
                  </div>
                  <input
                    type="number" min={f.min} max={f.max} step={f.step}
                    value={form[f.key]} placeholder="—"
                    onChange={e=>set(f.key,e.target.value)}
                    style={iStyle}
                    onFocus={e=>e.target.style.borderColor='#2D6AFF'}
                    onBlur={e=>e.target.style.borderColor=form[f.key]?'#1F2F50':'#172240'}
                  />
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
                    <span style={{fontSize:'.68rem',color:'#3A506A'}}>{f.desc}</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.65rem',color:'#2D6AFF',flexShrink:0,marginLeft:4}}>Normal: {f.normal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error&&(
            <div style={{background:'rgba(255,61,87,.08)',border:'1px solid rgba(255,61,87,.3)',borderRadius:8,padding:'11px 14px',color:'#FF3D57',fontSize:'.85rem',marginBottom:'1rem',animation:'fadeIn .3s ease'}}>
              ⚠️ {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{display:'flex',gap:'1rem'}}>
            <button onClick={submit} disabled={loading} style={{
              flex:1,padding:'14px',borderRadius:10,border:'none',cursor:loading?'not-allowed':'pointer',
              background:loading?'#172240':'linear-gradient(135deg,#2D6AFF,#00E5B4)',
              color:'#fff',fontFamily:'Space Grotesk,sans-serif',
              fontSize:'1rem',fontWeight:700,letterSpacing:'-.01em',
              boxShadow:loading?'none':'0 8px 24px rgba(45,106,255,.35)',
              transition:'all .2s',
            }}
              onMouseOver={e=>{if(!loading){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 14px 32px rgba(45,106,255,.5)';}}}
              onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=loading?'none':'0 8px 24px rgba(45,106,255,.35)';}}
            >
              {loading?(
                <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin .8s linear infinite'}}/>
                  Analysing...
                </span>
              ):'Run CKD Analysis →'}
            </button>
            <button onClick={reset} style={{
              padding:'14px 24px',borderRadius:10,border:'1px solid #172240',
              background:'transparent',color:'#7A92BC',fontSize:'1rem',cursor:'pointer',transition:'all .2s',
            }}
              onMouseOver={e=>{e.currentTarget.style.color='#DCE8FF';e.currentTarget.style.borderColor='#1F2F50';}}
              onMouseOut={e=>{e.currentTarget.style.color='#7A92BC';e.currentTarget.style.borderColor='#172240';}}
            >Reset</button>
          </div>
        </div>

        {/* ── Right: live radar ── */}
        <div style={{position:'sticky',top:80}}>
          <div style={{
            background:'#0D1526',border:'1px solid #172240',
            borderRadius:16,padding:'1.4rem',textAlign:'center',
          }}>
            <div style={{fontSize:'.7rem',color:'#3A506A',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1rem'}}>
              Live Input Radar
            </div>
            <KidneyRadar values={form}/>
            <div style={{marginTop:'1rem',fontSize:'.75rem',color:'#3A506A',lineHeight:1.6}}>
              Chart updates as you<br/>enter values above
            </div>
            {/* Completion dots */}
            <div style={{display:'flex',flexWrap:'wrap',gap:4,justifyContent:'center',marginTop:'1rem'}}>
              {ALL_KEYS.map((k,i)=>(
                <div key={i} style={{
                  width:6,height:6,borderRadius:'50%',
                  background:form[k]?'#2D6AFF':'#172240',
                  transition:'background .3s',
                }}/>
              ))}
            </div>
            <div style={{marginTop:6,fontSize:'.68rem',color:'#3A506A'}}>
              {ALL_KEYS.filter(k=>form[k]).length}/{ALL_KEYS.length} fields filled
            </div>
          </div>
        </div>
      </div>

      {/* ── RESULT ── */}
      {result&&(
        <div id="result-section" style={{marginTop:'2.5rem',animation:'fadeUp .5s ease'}}>

          {/* Pediatric banner */}
          {result.is_pediatric&&(
            <div style={{
              background:'rgba(155,109,255,.08)',border:'1px solid rgba(155,109,255,.25)',
              borderRadius:12,padding:'12px 18px',marginBottom:'1rem',
              display:'flex',alignItems:'center',gap:12,
            }}>
              <span style={{fontSize:'1.5rem'}}>👶</span>
              <div>
                <div style={{color:'#9B6DFF',fontWeight:700,fontSize:'.9rem',marginBottom:2}}>Pediatric Patient — Specialized Analysis Applied</div>
                <div style={{color:'#7A92BC',fontSize:'.82rem'}}>{result.age_label} · Age-adjusted clinical reference ranges used throughout this report.</div>
              </div>
            </div>
          )}

          {/* Main verdict */}
          <div style={{
            background:result.prediction===1?'rgba(255,61,87,.06)':'rgba(0,229,180,.06)',
            border:`1.5px solid ${result.prediction===1?'rgba(255,61,87,.35)':'rgba(0,229,180,.35)'}`,
            borderRadius:20,padding:'2rem',textAlign:'center',marginBottom:'1.2rem',
            position:'relative',overflow:'hidden',
          }}>
            {/* Background glow */}
            <div style={{
              position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              width:300,height:300,borderRadius:'50%',pointerEvents:'none',
              background:result.prediction===1
                ?'radial-gradient(circle,rgba(255,61,87,.06) 0%,transparent 70%)'
                :'radial-gradient(circle,rgba(0,229,180,.06) 0%,transparent 70%)',
            }}/>
            <div style={{fontSize:'3.5rem',marginBottom:'0.6rem'}}>
              {result.prediction===1?'🔴':'🟢'}
            </div>
            <h2 style={{
              fontFamily:'Space Grotesk,sans-serif',
              fontSize:'2rem',fontWeight:800,marginBottom:4,letterSpacing:'-.025em',
              color:result.prediction===1?'#FF3D57':'#00E5B4',
            }}>{result.label}</h2>
            <div style={{color:'#7A92BC',fontSize:'.9rem',marginBottom:'1.6rem'}}>
              Risk Classification:{' '}
              <span style={{fontWeight:700,color:result.risk_color}}>{result.risk_level}</span>
              {result.age_label&&<><span style={{color:'#3A506A',margin:'0 6px'}}>·</span><span style={{color:ageBadgeColor[result.age_group]||'#7A92BC'}}>{result.age_label}</span></>}
            </div>

            {/* Probability bar */}
            <div style={{maxWidth:480,margin:'0 auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:'.82rem',color:'#7A92BC'}}>
                <span>CKD Probability</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:600,color:'#DCE8FF'}}>{result.probability}%</span>
              </div>
              <div style={{background:'#060B18',borderRadius:999,height:10,overflow:'hidden'}}>
                <div style={{
                  height:'100%',borderRadius:999,
                  background:result.prediction===1
                    ?'linear-gradient(90deg,#FF8C42,#FF3D57)'
                    :'linear-gradient(90deg,#00E5B4,#2D6AFF)',
                  width:`${result.probability}%`,
                  transition:'width 1.4s cubic-bezier(.4,0,.2,1)',
                  boxShadow:`0 0 16px ${result.prediction===1?'rgba(255,61,87,.4)':'rgba(0,229,180,.4)'}`,
                }}/>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{
            display:'grid',
            gridTemplateColumns:result.ckd_stage?'repeat(3,1fr)':'repeat(2,1fr)',
            gap:'1rem',marginBottom:'1.2rem',
          }}>
            {[
              {label:'PROBABILITY',val:`${result.probability}%`,sub:'Model confidence',color:'#2D6AFF'},
              ...(result.ckd_stage?[{label:'CKD STAGE',val:result.ckd_stage,sub:result.stage_desc,color:'#FF3D57'}]:[]),
              {label:'RISK LEVEL',val:result.risk_level,sub:'Based on probability',color:result.risk_color},
            ].map((s,i)=>(
              <div key={i} style={{background:'#0D1526',border:'1px solid #172240',borderRadius:12,padding:'1.4rem',textAlign:'center'}}>
                <div style={{fontSize:'.68rem',color:'#3A506A',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6}}>{s.label}</div>
                <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.6rem',fontWeight:800,color:s.color,marginBottom:4}}>{s.val}</div>
                <div style={{color:'#7A92BC',fontSize:'.75rem'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Stage scale */}
          {result.prediction===1&&(
            <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:14,padding:'1.4rem',marginBottom:'1.2rem'}}>
              <div style={{fontSize:'.7rem',color:'#3A506A',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1rem'}}>CKD Stage Scale · GFR-Based</div>
              <div style={{display:'flex',gap:6}}>
                {[
                  {label:'Stage 1–2',range:'GFR ≥60', color:'#00E5B4'},
                  {label:'Stage 3a', range:'GFR 45–59',color:'#FFAA2C'},
                  {label:'Stage 3b', range:'GFR 30–44',color:'#FF8C42'},
                  {label:'Stage 4',  range:'GFR 15–29',color:'#FF5E5B'},
                  {label:'Stage 5',  range:'GFR <15',  color:'#FF3D57'},
                ].map((s,i)=>{
                  const active=result.ckd_stage===s.label||(result.ckd_stage==='Stage 1-2'&&s.label==='Stage 1–2');
                  return(
                    <div key={i} style={{
                      flex:1,borderRadius:8,padding:'10px 6px',textAlign:'center',
                      background:active?s.color:'rgba(255,255,255,.03)',
                      border:`1px solid ${active?s.color:'#172240'}`,
                      transition:'all .3s',
                    }}>
                      <div style={{fontWeight:700,fontSize:'.78rem',color:active?'#fff':s.color}}>{s.label}</div>
                      <div style={{fontSize:'.65rem',marginTop:3,color:active?'rgba(255,255,255,.7)':'#3A506A'}}>{s.range}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Early warnings */}
          {result.early_warnings?.length>0&&(
            <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:14,padding:'1.4rem',marginBottom:'1.2rem'}}>
              <div style={{fontSize:'.7rem',color:'#FFAA2C',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1rem'}}>
                🚦 Early Detection Alerts
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {result.early_warnings.map((w,i)=>{
                  const wc={alert:{bg:'rgba(45,106,255,.07)',border:'rgba(45,106,255,.25)',c:'#2D6AFF'},warning:{bg:'rgba(255,170,44,.07)',border:'rgba(255,170,44,.25)',c:'#FFAA2C'},danger:{bg:'rgba(255,61,87,.07)',border:'rgba(255,61,87,.25)',c:'#FF3D57'}};
                  const t=wc[w.level]||wc.alert;
                  return(
                    <div key={i} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,padding:'10px 14px',animation:`fadeUp .4s ease ${i*80}ms both`}}>
                      <span style={{color:t.c,fontSize:'.84rem',lineHeight:1.55}}>{w.msg}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:14,padding:'1.4rem',marginBottom:'1.2rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem'}}>
              <span style={{fontSize:'.7rem',color:'#7A92BC',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase'}}>💡 Health Recommendations</span>
              {result.is_pediatric&&<span style={{fontSize:'.68rem',background:'rgba(155,109,255,.15)',color:'#9B6DFF',padding:'2px 10px',borderRadius:999,border:'1px solid rgba(155,109,255,.3)'}}>Pediatric</span>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {result.recommendations.map((r,i)=><RecCard key={i} rec={r} delay={i*70}/>)}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{textAlign:'center',color:'#3A506A',fontSize:'.76rem',padding:'0.5rem',lineHeight:1.6}}>
            ⚠️ NephroScan is a research and educational tool only. Always consult a qualified nephrologist or pediatric nephrologist before making any medical decisions.
          </div>
        </div>
      )}
    </div>
  );
}

const ageBadgeColor={infant:'#9B6DFF',child:'#2D6AFF',teen:'#00BFFF',youngadult:'#00E5B4',adult:'#FFAA2C',senior:'#FF3D57'};

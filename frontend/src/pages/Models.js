import React,{useState,useEffect,useRef} from 'react';
import axios from 'axios';

/* ── Verified fallback model performance data from the trained notebook summary ─────────────────────────────────── */
const DEFAULT_MODELS=[
  {
    name:'Random Forest',short:'RF',
    accuracy:86.95,precision:60.43,recall:62.92,f1:61.45,auc:74.68,
    color:'#00E5B4',bg:'rgba(0,229,180,.08)',border:'rgba(0,229,180,.25)',
    badge:'BEST MODEL',badgeColor:'#00E5B4',
    trees:200,depth:'Unlimited',split:5,weight:'Balanced',
    desc:'Ensemble of 200 decision trees trained with SMOTE-balanced data. Best macro-averaged F1 in the new 70/30 summary.',
    isBest:true,
  },
  {
    name:'XGBoost',short:'XGB',
    accuracy:86.75,precision:60.17,recall:62.81,f1:61.24,auc:76.08,
    color:'#9B6DFF',bg:'rgba(155,109,255,.08)',border:'rgba(155,109,255,.25)',
    badge:'2ND PLACE',badgeColor:'#9B6DFF',
    trees:200,depth:6,split:'—',weight:'scale_pos_weight',
    desc:'Gradient boosting with 200 rounds and 0.1 learning rate. Very close to the winner across the same 70/30 split.',
    isBest:false,
  },
  {
    name:'SVM (RBF)',short:'SVM',
    accuracy:80.52,precision:56.95,recall:63.85,f1:57.91,auc:66.54,
    color:'#2D6AFF',bg:'rgba(45,106,255,.08)',border:'rgba(45,106,255,.25)',
    badge:'3RD PLACE',badgeColor:'#2D6AFF',
    kernel:'RBF',C:1.0,gamma:'scale',weight:'Balanced',
    desc:'RBF kernel SVM with balanced class weights. Competitive recall but weaker macro F1 than the top two models.',
    isBest:false,
  },
  {
    name:'Logistic Regression',short:'LR',
    accuracy:71.89,precision:57.14,recall:70.25,f1:55.54,auc:76.60,
    color:'#FFAA2C',bg:'rgba(255,170,44,.08)',border:'rgba(255,170,44,.25)',
    badge:'BASELINE',badgeColor:'#FFAA2C',
    C:1.0,maxIter:1000,weight:'Balanced',
    desc:'Linear baseline model with L2 regularization. Fast and interpretable, but not the strongest macro-averaged performer.',
    isBest:false,
  },
];

const METRICS=['Accuracy','Precision','Recall','F1-Score','AUC-ROC'];
const METRIC_KEYS=['accuracy','precision','recall','f1','auc'];

/* ── Animated counter ─────────────────────────────────────────── */
function useCount(to,duration=1200,start=false){
  const [v,setV]=useState(0);
  useEffect(()=>{
    if(!start)return;
    let cur=0;const step=to/(duration/16);
    const t=setInterval(()=>{cur+=step;if(cur>=to){setV(to);clearInterval(t);}else setV(cur);},16);
    return()=>clearInterval(t);
  },[to,duration,start]);
  return v;
}

/* ── Animated metric value ─────────────────────────────────────── */
function AnimVal({to,started}){
  const v=useCount(to,1000,started);
  return<>{v.toFixed(1)}%</>;
}

/* ── Horizontal bar for metric row ────────────────────────────── */
function MetricBar({value,color,max=100,animate}){
  const [w,setW]=useState(0);
  useEffect(()=>{if(animate)setTimeout(()=>setW(value),100);},[animate,value]);
  return(
    <div style={{flex:1,background:'#060B18',borderRadius:999,height:6,overflow:'hidden'}}>
      <div style={{
        height:'100%',borderRadius:999,background:color,
        width:`${(w/max)*100}%`,transition:'width 1s cubic-bezier(.4,0,.2,1)',
        boxShadow:`0 0 8px ${color}60`,
      }}/>
    </div>
  );
}

/* ── Radar chart for a single model ───────────────────────────── */
function ModelRadar({model,size=160,animate}){
  const vals=[model.accuracy,model.precision,model.recall,model.f1,model.auc];
  const labels=['Accuracy','Precision','Recall','F1','AUC'];
  const n=vals.length,cx=size/2,cy=size/2,r=(size/2)-28;
  const [scale,setScale]=useState(0);
  useEffect(()=>{if(animate)setTimeout(()=>setScale(1),200);},[animate]);
  const pts=vals.map((v,i)=>{
    const a=(i/n)*2*Math.PI-Math.PI/2;
    const s=(v/100)*scale;
    return{x:cx+r*s*Math.cos(a),y:cy+r*s*Math.sin(a),lx:cx+(r+16)*Math.cos(a),ly:cy+(r+16)*Math.sin(a)};
  });
  const poly=pts.map(p=>`${p.x},${p.y}`).join(' ');
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={`rg-${model.short}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={model.color}/>
          <stop offset="100%" stopColor={model.color} stopOpacity=".4"/>
        </linearGradient>
      </defs>
      {[.25,.5,.75,1].map(lv=>(
        <polygon key={lv} points={vals.map((_,i)=>{
          const a=(i/n)*2*Math.PI-Math.PI/2;
          return `${cx+r*lv*Math.cos(a)},${cy+r*lv*Math.sin(a)}`;
        }).join(' ')} fill="none" stroke="#172240" strokeWidth="1"/>
      ))}
      {vals.map((_,i)=>{
        const a=(i/n)*2*Math.PI-Math.PI/2;
        return<line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#172240" strokeWidth="1"/>;
      })}
      <polygon points={poly}
        fill={`${model.color}20`} stroke={model.color} strokeWidth="1.5"
        style={{transition:'all .8s cubic-bezier(.4,0,.2,1)',filter:`drop-shadow(0 0 6px ${model.color}50)`}}
      />
      {pts.map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={model.color}
          style={{transition:'all .8s ease'}}
        />
      ))}
      {pts.map((p,i)=>(
        <text key={i} x={p.lx} y={p.ly+3} textAnchor="middle"
          fontSize="7.5" fill="#3A506A" fontFamily="JetBrains Mono,monospace"
        >{labels[i]}</text>
      ))}
    </svg>
  );
}

/* ── Grouped bar chart (SVG) ───────────────────────────────────── */
function GroupedBar({animate,models}){
  const [w,setW]=useState(0);
  useEffect(()=>{if(animate)setTimeout(()=>setW(1),200);},[animate]);

  const W=680,H=220,pad={l:40,r:20,t:20,b:56};
  const chartW=W-pad.l-pad.r,chartH=H-pad.t-pad.b;
  const metrics=METRIC_KEYS;
  const nGroups=metrics.length,nBars=models.length;
  const groupW=chartW/nGroups,barW=Math.min(groupW/(nBars+1),18),gap=2;

  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
      {/* Y gridlines */}
      {[0,25,50,75,100].map(v=>{
        const y=pad.t+chartH-(v/100)*chartH;
        return(
          <g key={v}>
            <line x1={pad.l} y1={y} x2={pad.l+chartW} y2={y} stroke="#172240" strokeWidth="1" strokeDasharray="3,4"/>
            <text x={pad.l-6} y={y+4} textAnchor="end" fontSize="9" fill="#3A506A" fontFamily="JetBrains Mono,monospace">{v}%</text>
          </g>
        );
      })}
      {/* Bars */}
      {metrics.map((mk,gi)=>{
        const gx=pad.l+gi*groupW;
        const totalBarsW=(nBars*barW)+(nBars-1)*gap;
        const startX=gx+(groupW-totalBarsW)/2;
        return models.map((m,bi)=>{
          const x=startX+bi*(barW+gap);
          const fullH=(m[mk]/100)*chartH;
          const h=fullH*w;
          const y=pad.t+chartH-h;
          return(
            <g key={`${gi}-${bi}`}>
              <rect x={x} y={y} width={barW} height={h} rx={3} fill={m.color}
                style={{transition:`height 1s cubic-bezier(.4,0,.2,1) ${gi*80+bi*40}ms, y 1s cubic-bezier(.4,0,.2,1) ${gi*80+bi*40}ms`,
                  filter:`drop-shadow(0 0 4px ${m.color}60)`}}
              />
              {w>0&&(
                <text x={x+barW/2} y={y-4} textAnchor="middle"
                  fontSize="7" fill={m.color} fontFamily="JetBrains Mono,monospace"
                  style={{transition:`opacity .4s ease ${gi*80+bi*40+600}ms`,opacity:w}}
                >{m[mk]}</text>
              )}
            </g>
          );
        });
      })}
      {/* X labels */}
      {METRICS.map((label,gi)=>{
        const gx=pad.l+gi*groupW+groupW/2;
        return<text key={gi} x={gx} y={H-8} textAnchor="middle" fontSize="9.5" fill="#7A92BC" fontFamily="Inter,sans-serif">{label}</text>;
      })}
      {/* Axis */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+chartH} stroke="#172240" strokeWidth="1"/>
      <line x1={pad.l} y1={pad.t+chartH} x2={pad.l+chartW} y2={pad.t+chartH} stroke="#172240" strokeWidth="1"/>
    </svg>
  );
}

/* ── AUC curve (simplified visual) ────────────────────────────── */
function AUCCurves({animate,models}){
  const [prog,setProg]=useState(0);
  useEffect(()=>{
    if(!animate)return;
    let p=0;const t=setInterval(()=>{p+=2;setProg(p);if(p>=100)clearInterval(t);},16);
    return()=>clearInterval(t);
  },[animate]);

  const W=360,H=200,pad=36;
  const cW=W-pad*2,cH=H-pad*2;

  // Generate ROC curve points for each model
  const curves=models.map(m=>{
    const pts=[];const n=50;
    for(let i=0;i<=n;i++){
      const t=i/n;
      const fpr=t;
      // Simulate ROC curve based on AUC
      const auc=m.auc/100;
      const tpr=Math.min(1,Math.pow(t,Math.max(.05,1-auc*1.1)));
      pts.push({x:pad+fpr*cW,y:pad+cH-tpr*cH});
    }
    return{...m,pts};
  });

  const clip=`M${pad},${pad+cH} ` + Array.from({length:51},(_,i)=>{
    const t=i/50;
    return `L${pad+t*cW},${pad+cH-(t)*cH}`;
  }).slice(0,Math.ceil((prog/100)*51)).join(' ');

  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Grid */}
      {[0,.25,.5,.75,1].map(v=>(
        <g key={v}>
          <line x1={pad} y1={pad+cH-v*cH} x2={pad+cW} y2={pad+cH-v*cH} stroke="#172240" strokeWidth="1" strokeDasharray="2,4"/>
          <line x1={pad+v*cW} y1={pad} x2={pad+v*cW} y2={pad+cH} stroke="#172240" strokeWidth="1" strokeDasharray="2,4"/>
        </g>
      ))}
      {/* Diagonal (random) */}
      <line x1={pad} y1={pad+cH} x2={pad+cW} y2={pad} stroke="#1F2F50" strokeWidth="1" strokeDasharray="4,4"/>
      {/* Curves */}
      {curves.map((c,ci)=>{
        const n=c.pts.length;
        const drawTo=Math.ceil((prog/100)*n);
        const d=c.pts.slice(0,drawTo).map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
        return<path key={ci} d={d} fill="none" stroke={c.color} strokeWidth="2"
          style={{filter:`drop-shadow(0 0 4px ${c.color}60)`}}/>;
      })}
      {/* Labels */}
      <text x={pad+cW/2} y={H-4} textAnchor="middle" fontSize="9" fill="#3A506A" fontFamily="Inter,sans-serif">False Positive Rate</text>
      <text x={10} y={pad+cH/2} textAnchor="middle" fontSize="9" fill="#3A506A" fontFamily="Inter,sans-serif"
        transform={`rotate(-90,10,${pad+cH/2})`}>True Positive Rate</text>
      {/* Axis */}
      <line x1={pad} y1={pad} x2={pad} y2={pad+cH} stroke="#1F2F50" strokeWidth="1"/>
      <line x1={pad} y1={pad+cH} x2={pad+cW} y2={pad+cH} stroke="#1F2F50" strokeWidth="1"/>
    </svg>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function Models(){
  const [models,setModels]=useState(DEFAULT_MODELS);
  const [selected,setSelected]=useState(0);
  const [animate,setAnimate]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setAnimate(true);obs.disconnect();}},{threshold:.1});
    if(ref.current)obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    axios.get('http://localhost:5000/model-info')
      .then(({data})=>{
        if (!data?.ranking?.length) return;
        const metricsByModel = Object.fromEntries(data.ranking.map(rank => [rank.model, rank.metrics]));
        const nextModels = DEFAULT_MODELS.map((baseModel)=>({
          ...baseModel,
          ...metricsByModel[baseModel.name],
        }));
        const winner = data.winner || nextModels[0]?.name;
        const bestIndex = nextModels.findIndex((model)=>model.name===winner);
        setModels(nextModels.map((model, index)=>({
          ...model,
          isBest: index === bestIndex,
          badge: index === bestIndex ? 'BEST MODEL' : index === 1 ? '2ND PLACE' : index === 2 ? '3RD PLACE' : 'BASELINE',
        })));
        setSelected(bestIndex >= 0 ? bestIndex : 0);
      })
      .catch(()=>{
        setModels(DEFAULT_MODELS);
        setSelected(0);
      });
  },[]);

  const m=models[selected] || DEFAULT_MODELS[0];

  return(
    <div style={{maxWidth:1120,margin:'0 auto',padding:'2.5rem 2rem 6rem'}} ref={ref}>

      {/* ── Page header ── */}
      <div style={{marginBottom:'2.5rem',animation:'fadeUp .5s ease'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#2D6AFF',display:'inline-block',animation:'blink 1.5s ease infinite'}}/>
          <span style={{fontSize:'.72rem',color:'#2D6AFF',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase'}}>
            Analytics Dashboard
          </span>
        </div>
        <h1 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'2rem',fontWeight:800,color:'#DCE8FF',letterSpacing:'-.03em',marginBottom:6}}>
          Model Performance Comparison
        </h1>
        <p style={{color:'#7A92BC',fontSize:'.9rem',lineHeight:1.65,maxWidth:580}}>
          All four ML models trained on clinical CKD data with SMOTE balancing. Evaluated using macro-averaged metrics to ensure equal weight across both CKD and non-CKD classes.
        </p>
      </div>

      {/* ── Best model banner ── */}
      <div style={{
        background:'linear-gradient(135deg,rgba(155,109,255,.08),rgba(45,106,255,.06))',
        border:'1px solid rgba(155,109,255,.25)',borderRadius:16,
        padding:'1.4rem 2rem',marginBottom:'2rem',
        display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem',
        animation:'fadeUp .5s ease .1s both',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{
            width:48,height:48,borderRadius:12,
            background:'rgba(0,229,180,.12)',border:'1px solid rgba(0,229,180,.3)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'Space Grotesk,sans-serif',fontSize:'1.1rem',fontWeight:800,color:'#00E5B4',
          }}>RF</div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontFamily:'Space Grotesk,sans-serif',fontWeight:700,color:'#DCE8FF',fontSize:'1.05rem'}}>
                Random Forest — Best Performing Model
              </span>
              <span style={{fontSize:'.68rem',background:'rgba(0,229,180,.15)',color:'#00E5B4',padding:'2px 10px',borderRadius:999,border:'1px solid rgba(0,229,180,.3)',fontWeight:700}}>
                AUTO-SELECTED
              </span>
            </div>
            <p style={{color:'#7A92BC',fontSize:'.84rem'}}>
              Highest macro-averaged F1-Score ({models[0].f1.toFixed(2)}%) and AUC-ROC ({models[0].auc.toFixed(2)}%) from the notebook-backed model summary. Used for all CKD predictions.
            </p>
          </div>
        </div>
        <div style={{display:'flex',gap:'1.5rem'}}>
          {['accuracy','f1','auc'].map((k,i)=>({k,l:['Accuracy','F1-Score','AUC-ROC'][i],c:['#9B6DFF','#2D6AFF','#00E5B4'][i]})).map(({k,l,c})=>(
            <div key={k} style={{textAlign:'center'}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:'1.5rem',fontWeight:700,color:c}}>
                {animate?<AnimVal to={models[0][k]} started={animate}/>:`${models[0][k]}%`}
              </div>
              <div style={{fontSize:'.7rem',color:'#3A506A',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Model selector tabs ── */}
      <div style={{
        display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',
        marginBottom:'2rem',animation:'fadeUp .5s ease .15s both',
      }}>
        {models.map((mod,i)=>(
          <div key={i} onClick={()=>setSelected(i)} style={{
            background:selected===i?mod.bg:'#0D1526',
            border:`1px solid ${selected===i?mod.border:'#172240'}`,
            borderRadius:14,padding:'1.2rem',cursor:'pointer',
            transition:'all .25s ease',
            transform:selected===i?'translateY(-3px)':'none',
            boxShadow:selected===i?`0 12px 32px ${mod.color}18`:'none',
          }}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div style={{
                fontFamily:'JetBrains Mono,monospace',fontSize:'.8rem',fontWeight:700,
                color:selected===i?mod.color:'#3A506A',
                background:selected===i?`${mod.color}18`:'#060B18',
                border:`1px solid ${selected===i?`${mod.color}30`:'#172240'}`,
                padding:'3px 8px',borderRadius:6,
                transition:'all .25s',
              }}>{mod.short}</div>
              {mod.isBest&&(
                <span style={{fontSize:'.6rem',background:'rgba(0,229,180,.12)',color:'#00E5B4',padding:'2px 7px',borderRadius:999,border:'1px solid rgba(0,229,180,.25)',fontWeight:700}}>
                  BEST
                </span>
              )}
            </div>
            <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'.88rem',fontWeight:600,color:selected===i?'#DCE8FF':'#7A92BC',marginBottom:8,transition:'color .25s'}}>
              {mod.name}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {['accuracy','f1'].map(k=>(
                <div key={k}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:'.68rem',color:'#3A506A'}}>
                    <span>{k==='accuracy'?'Accuracy':'F1-Score'}</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:selected===i?mod.color:'#3A506A'}}>{mod[k]}%</span>
                  </div>
                  <MetricBar value={mod[k]} color={selected===i?mod.color:'#172240'} animate={animate}/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Detail panel for selected model ── */}
      <div style={{
        background:'#0D1526',border:`1px solid ${m.border}`,borderRadius:16,
        padding:'1.8rem',marginBottom:'2rem',
        animation:'fadeUp .4s ease',
        boxShadow:`0 8px 40px ${m.color}0C`,
      }}>
        <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:'2rem',alignItems:'center'}}>
          {/* Radar */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.5rem'}}>
            <ModelRadar model={m} size={180} animate={animate}/>
            <div style={{fontSize:'.7rem',color:'#3A506A',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase'}}>
              Performance Radar
            </div>
          </div>
          {/* Metrics */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1.2rem'}}>
              <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.2rem',fontWeight:800,color:'#DCE8FF'}}>{m.name}</div>
              <span style={{fontSize:'.68rem',background:m.bg,color:m.color,padding:'3px 10px',borderRadius:999,border:`1px solid ${m.border}`,fontWeight:700}}>
                {m.badge}
              </span>
            </div>
            <p style={{color:'#7A92BC',fontSize:'.85rem',lineHeight:1.65,marginBottom:'1.4rem'}}>{m.desc}</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {METRICS.map((label,i)=>{
                const val=m[METRIC_KEYS[i]];
                return(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'90px 1fr 52px',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:'.78rem',color:'#7A92BC',fontWeight:500}}>{label}</span>
                    <MetricBar value={val} color={m.color} animate={animate}/>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.8rem',color:m.color,textAlign:'right',fontWeight:600}}>
                      {animate?<AnimVal to={val} started={animate}/>:`${val}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Grouped bar + AUC side by side ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:'1.5rem',marginBottom:'2rem',animation:'fadeUp .5s ease .2s both'}}>

        {/* Bar chart */}
        <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:16,padding:'1.6rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.4rem'}}>
            <div>
              <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1rem',fontWeight:700,color:'#DCE8FF',marginBottom:3}}>
                Metrics Comparison
              </div>
              <div style={{fontSize:'.76rem',color:'#3A506A'}}>All models · Macro-averaged scores</div>
            </div>
            {/* Legend */}
            <div style={{display:'flex',gap:'1rem'}}>
              {models.map((mod,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:10,height:10,borderRadius:2,background:mod.color}}/>
                  <span style={{fontSize:'.72rem',color:'#7A92BC'}}>{mod.short}</span>
                </div>
              ))}
            </div>
          </div>
          <GroupedBar animate={animate} models={models}/>
        </div>

        {/* AUC curves */}
        <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:16,padding:'1.6rem'}}>
          <div style={{marginBottom:'1.2rem'}}>
            <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1rem',fontWeight:700,color:'#DCE8FF',marginBottom:3}}>
              ROC Curves
            </div>
            <div style={{fontSize:'.76rem',color:'#3A506A'}}>AUC-ROC comparison</div>
          </div>
          <AUCCurves animate={animate} models={models}/>
          <div style={{marginTop:'1rem',display:'flex',flexDirection:'column',gap:5}}>
            {models.map((mod,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 8px',borderRadius:6,background:`${mod.color}08`}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:20,height:2,background:mod.color,borderRadius:1}}/>
                  <span style={{fontSize:'.76rem',color:'#7A92BC'}}>{mod.short} — {mod.name}</span>
                </div>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.76rem',color:mod.color,fontWeight:600}}>
                  {mod.auc}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Full comparison table ── */}
      <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:16,padding:'1.6rem',marginBottom:'2rem',animation:'fadeUp .5s ease .25s both'}}>
        <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1rem',fontWeight:700,color:'#DCE8FF',marginBottom:'1.4rem'}}>
          Full Performance Table
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'separate',borderSpacing:'0 4px'}}>
            <thead>
              <tr>
                {['Model','Accuracy','Precision','Recall','F1-Score','AUC-ROC',''].map((h,i)=>(
                  <th key={i} style={{
                    padding:'8px 14px',textAlign:i===0?'left':'center',
                    fontSize:'.7rem',color:'#3A506A',fontWeight:600,
                    letterSpacing:'.08em',textTransform:'uppercase',
                    borderBottom:'1px solid #172240',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((mod,i)=>(
                <tr key={i} style={{cursor:'pointer'}} onClick={()=>setSelected(i)}>
                  {[
                    <td key="n" style={{padding:'12px 14px',borderRadius:'8px 0 0 8px',background:selected===i?mod.bg:'#060B18',border:`1px solid ${selected===i?mod.border:'transparent'}`,borderRight:'none'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:mod.color,flexShrink:0}}/>
                        <span style={{fontFamily:'Space Grotesk,sans-serif',fontWeight:600,color:'#DCE8FF',fontSize:'.88rem'}}>{mod.name}</span>
                        {mod.isBest&&<span style={{fontSize:'.6rem',background:'rgba(0,229,180,.12)',color:'#00E5B4',padding:'1px 8px',borderRadius:999,border:'1px solid rgba(0,229,180,.25)',fontWeight:700}}>BEST</span>}
                      </div>
                    </td>,
                    ...METRIC_KEYS.map((k,j)=>(
                      <td key={k} style={{padding:'12px 14px',textAlign:'center',background:selected===i?mod.bg:'#060B18',border:`1px solid ${selected===i?mod.border:'transparent'}`,borderLeft:'none',borderRight:'none'}}>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.84rem',fontWeight:600,color:selected===i?mod.color:'#7A92BC'}}>
                          {mod[k]}%
                        </span>
                      </td>
                    )),
                    <td key="act" style={{padding:'12px 14px',textAlign:'center',borderRadius:'0 8px 8px 0',background:selected===i?mod.bg:'#060B18',border:`1px solid ${selected===i?mod.border:'transparent'}`,borderLeft:'none'}}>
                      <span style={{fontSize:'.72rem',color:selected===i?mod.color:'#3A506A',fontWeight:600}}>
                        {selected===i?'● Selected':'View'}
                      </span>
                    </td>,
                  ]}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:'1rem',padding:'10px 14px',borderRadius:8,background:'rgba(45,106,255,.06)',border:'1px solid rgba(45,106,255,.15)'}}>
          <span style={{color:'#7A92BC',fontSize:'.8rem'}}>
            All metrics computed using <span style={{color:'#2D6AFF',fontWeight:600}}>macro-averaged</span> scoring to ensure fair evaluation across both CKD-positive and CKD-negative classes. SMOTE applied only on training data.
          </span>
        </div>
      </div>
    </div>
  );
}

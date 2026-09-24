import React,{useState,useMemo,useEffect} from 'react';
import axios from 'axios';
import {SignedIn,SignedOut,useAuth} from '@clerk/clerk-react';
import { jsPDF } from 'jspdf';

const FIELDS=[
  {key:'Age',                        label:'Age',                           unit:'years',  min:0,  max:120,step:1,   normal:'Any age',         desc:'Age-adjusted thresholds applied automatically'},
  {key:'BMI',                        label:'BMI',                           unit:'kg/m²',  min:5,  max:60, step:.1,  normal:'18.5–24.9',        desc:'Obesity significantly increases CKD risk'},
  {key:'HbA1c',                      label:'HbA1c',                         unit:'%',      min:0,  max:20, step:.1,  normal:'4.0–5.6',           desc:'3-month blood sugar — diabetic risk indicator'},
  {key:'SerumCreatinine',            label:'Serum Creatinine',              unit:'mg/dL',  min:0,  max:20, step:.01, normal:'0.6–1.2',           desc:'Primary marker of kidney filtration capacity'},
  {key:'BUNLevels',                  label:'BUN Levels',                    unit:'mg/dL',  min:0,  max:150,step:.1,  normal:'8–25',              desc:'Blood urea nitrogen — waste filtered by kidneys'},
  {key:'GFR',                        label:'GFR (eGFR)',                    unit:'mL/min', min:0,  max:150,step:.1,  normal:'≥ 90',              desc:'Gold standard for measuring kidney function'},
  {key:'HemoglobinLevels',           label:'Hemoglobin',                    unit:'g/dL',   min:0,  max:25, step:.1,  normal:'12–17',             desc:'Low levels indicate anemia — common in CKD'},
  {key:'CholesterolTotal',           label:'Total Cholesterol',             unit:'mg/dL',  min:0,  max:400,step:1,   normal:'< 200',             desc:'Cardiovascular risk linked to CKD progression'},
  {key:'ProteinInUrine',             label:'Protein in Urine',              unit:'g/day',  min:0,  max:20, step:.01, normal:'< 0.15',            desc:'Protein leakage is a direct sign of kidney damage'},
  {key:'UrinaryTractInfections',     label:'UTI Count',                     unit:'count',  min:0,  max:20, step:1,   normal:'0',                 desc:'Recurrent UTIs can cause kidney scarring'},
  {key:'FamilyHistoryKidneyDisease', label:'Family History',                unit:'0 or 1', min:0,  max:1,  step:1,   normal:'0 = No, 1 = Yes',  desc:'Genetic predisposition is a key CKD risk factor'},
];

const BMI_EXTRA_FIELDS=[
  {key:'HeightCm', label:'Height', unit:'cm', min:50, max:250, step:.1, normal:'150–180 cm', desc:'Used to calculate BMI if BMI is unknown'},
  {key:'WeightKg', label:'Weight', unit:'kg', min:20, max:250, step:.1, normal:'40–100 kg', desc:'Used with height to calculate BMI automatically'},
];

const ALL_KEYS=FIELDS.map(f=>f.key);
const BMI_EXTRA_KEYS=BMI_EXTRA_FIELDS.map(f=>f.key);
const SIMULATOR_FIELDS=[
  {key:'GFR',label:'GFR',unit:'mL/min',min:0,max:150,step:1,default:90},
  {key:'SerumCreatinine',label:'Serum Creatinine',unit:'mg/dL',min:0,max:10,step:.01,default:1.1},
  {key:'HbA1c',label:'HbA1c',unit:'%',min:0,max:15,step:.1,default:5.8},
  {key:'HemoglobinLevels',label:'Hemoglobin',unit:'g/dL',min:0,max:20,step:.1,default:12.5},
  {key:'ProteinInUrine',label:'Protein in Urine',unit:'g/day',min:0,max:5,step:.01,default:.15},
];
const init={
  ...Object.fromEntries(ALL_KEYS.map(k=>[k,''])),
  ...Object.fromEntries(BMI_EXTRA_KEYS.map(k=>[k,''])),
};

const SECTION_FIELDS=[
  {title:'Personal Details', subtitle:'Patient profile and background', keys:['Age','BMI','FamilyHistoryKidneyDisease']},
  {title:'Blood & Lab Markers', subtitle:'Core blood chemistry and kidney function', keys:['HbA1c','SerumCreatinine','BUNLevels','GFR','HemoglobinLevels','CholesterolTotal']},
  {title:'Urine & Infection Profile', subtitle:'Urinary findings and infection history', keys:['ProteinInUrine','UrinaryTractInfections']},
];

const RC={
  success:{bg:'rgba(0,212,168,.08)',  border:'rgba(0,212,168,.22)',  text:'#00D4A8'},
  warning:{bg:'rgba(245,166,35,.08)', border:'rgba(245,166,35,.22)', text:'#F5A623'},
  danger: {bg:'rgba(255,77,106,.08)', border:'rgba(255,77,106,.22)', text:'#FF4D6A'},
  info:   {bg:'rgba(91,127,255,.08)', border:'rgba(91,127,255,.22)', text:'#5B7FFF'},
};

const ageBadgeColor={under_20:'#A97FFF',youngadult:'#00D4A8',adult:'#F5A623',senior:'#FF4D6A'};

/* ── Radar ──────────────────────────────────────────────────── */
function KidneyRadar({values}){
  const axes=[
    {key:'GFR',invert:true,max:150,label:'GFR'},
    {key:'SerumCreatinine',invert:false,max:10,label:'Creatinine'},
    {key:'BUNLevels',invert:false,max:80,label:'BUN'},
    {key:'HemoglobinLevels',invert:true,max:18,label:'Hemoglobin'},
    {key:'HbA1c',invert:false,max:12,label:'HbA1c'},
    {key:'ProteinInUrine',invert:false,max:5,label:'Protein'},
  ];
  const cx=110,cy=110,r=80,n=axes.length;
  const pts=axes.map((ax,i)=>{
    const a=(i/n)*2*Math.PI-Math.PI/2;
    const raw=parseFloat(values[ax.key]||0);
    const norm=Math.min(raw/ax.max,1);
    const val=ax.invert?(1-norm):norm;
    return{x:cx+r*val*Math.cos(a),y:cy+r*val*Math.sin(a),lx:cx+(r+24)*Math.cos(a),ly:cy+(r+24)*Math.sin(a),val,label:ax.label};
  });
  const filled=pts.some(p=>p.val>0);
  return(
    <svg width="220" height="220" viewBox="0 0 220 220" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B7FFF"/><stop offset="100%" stopColor="#00D4A8"/>
        </linearGradient>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {[.25,.5,.75,1].map(lv=>(
        <polygon key={lv} points={axes.map((_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return `${cx+r*lv*Math.cos(a)},${cy+r*lv*Math.sin(a)}`;}).join(' ')} fill="none" stroke="#1E2247" strokeWidth="1"/>
      ))}
      {axes.map((_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return<line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#1E2247" strokeWidth="1"/>;  })}
      {filled&&<polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(91,127,255,.15)" stroke="url(#rg)" strokeWidth="2" filter="url(#radarGlow)" style={{transition:'all .4s ease'}}/>}
      {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3.5} fill={p.val>0?'#5B7FFF':'#1E2247'} style={{transition:'all .4s ease'}}/>)}
      {pts.map((p,i)=><text key={i} x={p.lx} y={p.ly+4} textAnchor="middle" fontSize="9" fill={p.val>0?'#8BA0C8':'#4A5E80'} fontFamily="JetBrains Mono,monospace">{p.label}</text>)}
    </svg>
  );
}

/* ── Bar ─────────────────────────────────────────────────────── */
function Bar({pct,color='#5B7FFF'}){
  return(
    <div style={{background:'#07081A',borderRadius:999,height:8,overflow:'hidden',border:'1px solid #1E2247'}}>
      <div style={{height:'100%',borderRadius:999,background:color,width:`${pct}%`,transition:'width .6s ease',boxShadow:`0 0 12px ${color}80`}}/>
    </div>
  );
}

export default function Predict(){
  const MIN_REQUIRED_FIELDS=5;
  const {getToken,isSignedIn}=useAuth();
  const [form,setForm]=useState(init);
  const [result,setResult]=useState(null);
  const [simValues,setSimValues]=useState(Object.fromEntries(SIMULATOR_FIELDS.map(field=>[field.key,field.default])));
  const [simResult,setSimResult]=useState(null);
  const [simLoading,setSimLoading]=useState(false);
  const [simError,setSimError]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [modelInfo,setModelInfo]=useState(null);

  useEffect(()=>{
    axios.get('http://localhost:5000/model-info')
      .then(({data})=>setModelInfo(data))
      .catch(()=>setModelInfo(null));
  },[]);

  const progress=useMemo(()=>Math.round((ALL_KEYS.filter(k=>form[k]!=='').length/ALL_KEYS.length)*100),[form]);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const buildPayload=(values,overrides={})=>{
    const payload=Object.fromEntries(
      ALL_KEYS.map((key)=>{
        const value=overrides[key] ?? values[key];
        return [key,value===''||value===undefined?null:Number(value)];
      })
    );

    const height=values.HeightCm;
    const weight=values.WeightKg;
    if(payload.BMI===null&&height!==''&&weight!==''){
      const heightM=Number(height)/100;
      if(heightM>0) payload.BMI=Number(weight)/(heightM*heightM);
    }

    payload.HeightCm=values.HeightCm===''?null:Number(values.HeightCm);
    payload.WeightKg=values.WeightKg===''?null:Number(values.WeightKg);
    return payload;
  };

  const submit=async()=>{
    setError('');
    if(ALL_KEYS.filter((key)=>form[key]!=='').length<MIN_REQUIRED_FIELDS){
      setError(`Enter at least ${MIN_REQUIRED_FIELDS} clinical values before running the analysis.`);
      return;
    }
    setLoading(true);
    setResult(null);
    try{
      const token=isSignedIn?await getToken():null;
      const headers=token?{Authorization:`Bearer ${token}`}:{};
      const res = await axios.post('http://localhost:5000/predict',buildPayload(form),{headers});
      setResult(res.data);
      setSimResult(null);
      setSimValues(Object.fromEntries(SIMULATOR_FIELDS.map(field=>[
        field.key,form[field.key]===''?field.default:Number(form[field.key])
      ])));
      setTimeout(()=>document.getElementById('result-section')?.scrollIntoView({behavior:'smooth'}),150);
    }catch(error){
      setError(error.response?.status===401?'Your Clerk session is invalid or expired. Please sign in again.':'Cannot reach backend. Make sure Flask is running on port 5000.');
    }
    setLoading(false);
  };

  const runSimulation=async()=>{
    if(!result) return;
    setSimLoading(true);
    setSimError('');
    try{
      const token=isSignedIn?await getToken():null;
      const headers=token?{Authorization:`Bearer ${token}`}:{};
      const scenarioPayload=buildPayload(form,simValues);
      scenarioPayload._save_history=false;
      const res=await axios.post('http://localhost:5000/predict',scenarioPayload,{headers});
      setSimResult(res.data);
    }catch(error){
      setSimError(error.response?.status===401?'Your Clerk session is invalid or expired. Please sign in again.':'Simulation unavailable. Make sure Flask is running on port 5000.');
    }
    setSimLoading(false);
  };

  const reset=()=>{
    setForm(init);
    setResult(null);
    setSimResult(null);
    setSimError('');
    setError('');
  };

  const normalizeStageName = (value='') => String(value)
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const downloadReport = () => {
    if (!result) return;

    const doc = new jsPDF();
    const dateText = new Date().toLocaleString();
    const patientName = form.Age ? `Patient (Age ${form.Age})` : 'Patient';

    doc.setFillColor(18, 23, 36);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('CKD Risk Assessment Report', 14, 18);

    doc.setTextColor(40, 60, 80);
    doc.setFontSize(10);
    doc.text(`Generated: ${dateText}`, 14, 36);
    doc.text(`Report for: ${patientName}`, 14, 42);

    let y = 58;
    const addSection = (title, lines) => {
      doc.setFontSize(12);
      doc.setTextColor(45, 106, 255);
      doc.text(title, 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(40, 60, 80);
      const wrapped = doc.splitTextToSize(lines.join('\n'), 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 7 + 8;
    };

    const summaryLines = [
      `Prediction: ${result.label}`,
      `Probability: ${result.probability}%`,
      `Risk Level: ${result.risk_level}`,
      `Age Group: ${result.age_label || 'Not available'}`,
      result.ckd_stage ? `CKD Stage: ${result.ckd_stage} (${result.stage_desc})` : 'CKD Stage: Not available',
      `Model: ${result.model_name || modelInfo?.winner || 'Random Forest'}`,
    ];

    addSection('Overview', summaryLines);

    const interpretationText = result.interpretation || 'No interpretation available.';
    addSection('Clinical Interpretation', [interpretationText]);

    const riskFactorLines = result.risk_factors && result.risk_factors.length
      ? result.risk_factors
      : ['No major risk factors were identified.'];
    addSection('Key Risk Factors', riskFactorLines.map((factor) => `• ${factor}`));

    const warningLines = result.early_warnings && result.early_warnings.length
      ? result.early_warnings.map((warning) => `• ${warning.msg}`)
      : ['No early warnings recorded.'];
    addSection('Early Detection Alerts', warningLines);

    const recommendationLines = result.recommendations && result.recommendations.length
      ? result.recommendations.map((item) => `• ${item.title}: ${item.desc}`)
      : ['No recommendations available.'];
    addSection('Recommendations', recommendationLines);

    const fileName = result.prediction === 1 ? 'ckd-risk-report.pdf' : 'ckd-low-risk-report.pdf';
    doc.save(fileName);
  };

  const iStyle={
    width:'100%',padding:'10px 12px',
    background:'rgba(7,8,26,0.7)',
    border:'1px solid #1E2247',borderRadius:8,color:'#E8EEFF',
    fontSize:'.93rem',outline:'none',fontFamily:'JetBrains Mono,monospace',
    transition:'border-color .2s, box-shadow .2s',
  };

  return(
    <div style={{maxWidth:1100,margin:'0 auto',padding:'2.5rem 2rem 6rem'}}>

      {/* Header */}
      <div style={{marginBottom:'2rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#5B7FFF',display:'inline-block',animation:'blink 1.5s ease infinite',boxShadow:'0 0 8px #5B7FFF'}}/>
          <span style={{fontSize:'.72rem',color:'#5B7FFF',fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase'}}>Real-Time Analysis</span>
        </div>
        <h1 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'2.1rem',fontWeight:800,letterSpacing:'-.035em',marginBottom:6,background:'linear-gradient(135deg,#E8EEFF 0%,#A97FFF 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          CKD Risk Assessment
        </h1>
        <p style={{color:'#8BA0C8',fontSize:'.9rem',lineHeight:1.65}}>
          Enter all patient clinical values below. Predictions use the <span style={{color:'#A97FFF',fontWeight:600}}>{modelInfo?.winner || 'Random Forest'}</span> model.
        </p>
        <div style={{marginTop:'1rem'}}>
          <SignedIn>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(0,212,168,.08)',border:'1px solid rgba(0,212,168,.25)',borderRadius:999,padding:'7px 12px',color:'#00D4A8',fontSize:'.75rem'}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#00D4A8'}}/> Signed-in mode · linked to your account
            </div>
          </SignedIn>
          <SignedOut>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(245,166,35,.08)',border:'1px solid rgba(245,166,35,.25)',borderRadius:999,padding:'7px 12px',color:'#F5A623',fontSize:'.75rem'}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#F5A623'}}/> Guest mode · one-time prediction, not stored
            </div>
          </SignedOut>
        </div>
      </div>



      <div style={{display:'grid',gridTemplateColumns:'1fr 268px',gap:'1.5rem',alignItems:'start'}}>

        {/* ── LEFT: form ── */}
        <div>
          {/* Progress */}
          <div style={{background:'linear-gradient(135deg,#10122A,#141730)',border:'1px solid #1E2247',borderRadius:12,padding:'1rem 1.4rem',marginBottom:'1.2rem',display:'flex',alignItems:'center',gap:'1rem'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                <span style={{fontSize:'.78rem',color:'#8BA0C8',fontWeight:500}}>Form completion</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.78rem',color:progress===100?'#00D4A8':'#5B7FFF',fontWeight:700}}>{progress}%</span>
              </div>
              <Bar pct={progress} color={progress===100?'#00D4A8':'#5B7FFF'}/>
            </div>
            {progress===100&&<span style={{fontSize:'.8rem',color:'#00D4A8',fontWeight:700,whiteSpace:'nowrap',animation:'fadeIn .3s ease'}}>✓ Ready</span>}
          </div>

          {/* Grouped input sections */}
          <div style={{display:'grid',gap:'1.2rem',marginBottom:'1.2rem'}}>
            {SECTION_FIELDS.map((section)=>(
              <div key={section.title} style={{background:'linear-gradient(160deg,#10122A 0%,#0C0E22 100%)',border:'1px solid #1E2247',borderRadius:16,padding:'1.4rem',boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:'1rem'}}>
                  <div>
                    <div style={{fontSize:'.68rem',color:'#5B7FFF',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase'}}>
                      {section.title}
                    </div>
                    <div style={{fontSize:'.72rem',color:'#8BA0C8',marginTop:4}}>{section.subtitle}</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  {section.keys.map((key)=>{
                    const f = FIELDS.find(field => field.key === key);
                    if (!f) return null;

                    if (f.key === 'BMI') {
                      const isFilled = form[f.key]!=='' || form.HeightCm!=='' || form.WeightKg!=='';
                      return (
                        <div key={f.key} style={{
                          background:'rgba(7,8,26,0.6)',
                          border:`1px solid ${isFilled?'#2A3060':'#1E2247'}`,
                          borderRadius:10,padding:'1rem',transition:'border-color .2s, box-shadow .2s',
                          boxShadow:isFilled?'0 4px 16px rgba(91,127,255,.08)':'none',
                        }}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                            <label style={{fontSize:'.8rem',color:'#8BA0C8',fontWeight:500}}>{f.label}</label>
                            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.68rem',color:'#4A5E80',background:'#0C0E22',padding:'2px 7px',borderRadius:4,border:'1px solid #1E2247'}}>{f.unit}</span>
                          </div>
                          <input
                            type="number" min={f.min} max={f.max} step={f.step}
                            value={form[f.key]} placeholder="—"
                            onChange={e=>set(f.key,e.target.value)}
                            style={iStyle}
                            onFocus={e=>{e.target.style.borderColor='#5B7FFF';e.target.style.boxShadow='0 0 0 3px rgba(91,127,255,.15)';}}
                            onBlur={e=>{e.target.style.borderColor=isFilled?'#2A3060':'#1E2247';e.target.style.boxShadow='none';}}
                          />

                          <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                            {BMI_EXTRA_FIELDS.map((extra) => (
                              <div key={extra.key} style={{background:'rgba(7,8,26,0.8)',border:'1px solid #1E2247',borderRadius:8,padding:'8px 10px'}}>
                                <div style={{fontSize:'.66rem',color:'#8BA0C8',marginBottom:4}}>{extra.label}</div>
                                <input
                                  type="number" min={extra.min} max={extra.max} step={extra.step}
                                  value={form[extra.key]} placeholder={extra.unit}
                                  onChange={e=>set(extra.key,e.target.value)}
                                  style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#E8EEFF',fontFamily:'JetBrains Mono,monospace',fontSize:'.82rem'}}
                                />
                              </div>
                            ))}
                          </div>

                          <div style={{display:'flex',justifyContent:'space-between',marginTop:8,gap:6}}>
                            <span style={{fontSize:'.67rem',color:'#4A5E80',lineHeight:1.4,flex:1}}>
                              {form[f.key] === '' ? 'If BMI is unknown, height and weight will be used to calculate it automatically.' : f.desc}
                            </span>
                            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.65rem',color:'#5B7FFF',flexShrink:0,whiteSpace:'nowrap'}}>↔ {f.normal}</span>
                          </div>
                        </div>
                      );
                    }

                    const isFilled=form[f.key]!=='';
                    return (
                      <div key={f.key} style={{
                        background:'rgba(7,8,26,0.6)',
                        border:`1px solid ${isFilled?'#2A3060':'#1E2247'}`,
                        borderRadius:10,padding:'1rem',transition:'border-color .2s, box-shadow .2s',
                        boxShadow:isFilled?'0 4px 16px rgba(91,127,255,.08)':'none',
                      }}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <label style={{fontSize:'.8rem',color:'#8BA0C8',fontWeight:500}}>{f.label}</label>
                          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.68rem',color:'#4A5E80',background:'#0C0E22',padding:'2px 7px',borderRadius:4,border:'1px solid #1E2247'}}>{f.unit}</span>
                        </div>
                        <input
                          type="number" min={f.min} max={f.max} step={f.step}
                          value={form[f.key]} placeholder="—"
                          onChange={e=>set(f.key,e.target.value)}
                          style={iStyle}
                          onFocus={e=>{e.target.style.borderColor='#5B7FFF';e.target.style.boxShadow='0 0 0 3px rgba(91,127,255,.15)';}}
                          onBlur={e=>{e.target.style.borderColor=isFilled?'#2A3060':'#1E2247';e.target.style.boxShadow='none';}}
                        />
                        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,gap:6}}>
                          <span style={{fontSize:'.67rem',color:'#4A5E80',lineHeight:1.4,flex:1}}>{f.desc}</span>
                          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.65rem',color:'#5B7FFF',flexShrink:0,whiteSpace:'nowrap'}}>↔ {f.normal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error&&(
            <div style={{background:'rgba(255,77,106,.09)',border:'1px solid rgba(255,77,106,.3)',borderRadius:10,padding:'11px 14px',color:'#FF4D6A',fontSize:'.85rem',marginBottom:'1rem',animation:'fadeIn .3s ease',boxShadow:'0 4px 16px rgba(255,77,106,.08)'}}>
              ⚠️ {error}
            </div>
          )}

          <div style={{display:'flex',gap:'1rem'}}>
            <button onClick={submit} disabled={loading} style={{
              flex:1,padding:'14px',borderRadius:12,border:'none',
              cursor:loading?'not-allowed':'pointer',
              background:loading?'#10122A':'linear-gradient(135deg,#5B7FFF 0%,#A97FFF 100%)',
              color:'#fff',fontFamily:'Space Grotesk,sans-serif',
              fontSize:'1rem',fontWeight:700,letterSpacing:'-.01em',
              boxShadow:loading?'none':'0 8px 28px rgba(91,127,255,.38)',
              transition:'all .2s',
            }}
              onMouseOver={e=>{if(!loading){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(91,127,255,.52)';}}}
              onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=loading?'none':'0 8px 28px rgba(91,127,255,.38)';}}
            >
              {loading?(
                <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin .8s linear infinite'}}/>
                  Analysing with {modelInfo?.winner || 'Random Forest'}...
                </span>
              ):`Run CKD Analysis →`}
            </button>
            <button onClick={reset} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #2A3060',background:'rgba(30,34,71,.5)',color:'#8BA0C8',fontSize:'1rem',cursor:'pointer',transition:'all .2s'}}
              onMouseOver={e=>{e.currentTarget.style.color='#E8EEFF';e.currentTarget.style.borderColor='#5B7FFF';e.currentTarget.style.background='rgba(91,127,255,.1)';}}
              onMouseOut={e=>{e.currentTarget.style.color='#8BA0C8';e.currentTarget.style.borderColor='#2A3060';e.currentTarget.style.background='rgba(30,34,71,.5)';}}
            >Reset</button>
          </div>
        </div>

        {/* ── RIGHT: radar + quick ref ── */}
        <div style={{position:'sticky',top:80,display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{background:'linear-gradient(160deg,#10122A,#0C0E22)',border:'1px solid #1E2247',borderRadius:16,padding:'1.4rem',textAlign:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>
            <div style={{fontSize:'.68rem',color:'#5B7FFF',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'1rem'}}>Live Input Radar</div>
            <KidneyRadar values={form}/>
            <div style={{marginTop:'1rem',fontSize:'.74rem',color:'#4A5E80',lineHeight:1.6}}>Updates as you enter values</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,justifyContent:'center',marginTop:'1rem'}}>
              {ALL_KEYS.map((k,i)=>(
                <div key={i} style={{width:7,height:7,borderRadius:'50%',background:form[k]!==''?'#5B7FFF':'#1E2247',transition:'background .3s ease',boxShadow:form[k]!==''?'0 0 6px rgba(91,127,255,.6)':'none'}}/>
              ))}
            </div>
            <div style={{marginTop:8,fontFamily:'JetBrains Mono,monospace',fontSize:'.7rem',color:'#4A5E80'}}>
              {ALL_KEYS.filter(k=>form[k]!=='').length} / {ALL_KEYS.length} filled
            </div>
          </div>
          <div style={{background:'linear-gradient(160deg,#10122A,#0C0E22)',border:'1px solid #1E2247',borderRadius:14,padding:'1.2rem',boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>
            <div style={{fontSize:'.68rem',color:'#5B7FFF',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'1rem'}}>Quick Reference</div>
            {[
              {label:'GFR',       normal:'≥ 90',    color:'#00D4A8'},
              {label:'Creatinine',normal:'0.6–1.2', color:'#5B7FFF'},
              {label:'BUN',       normal:'8–25',     color:'#A97FFF'},
              {label:'Hemoglobin',normal:'12–17',    color:'#F5A623'},
              {label:'HbA1c',     normal:'< 5.7',    color:'#38BDF8'},
              {label:'Protein',   normal:'< 0.15',   color:'#FF4D6A'},
            ].map((r,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<5?'1px solid #1E2247':'none'}}>
                <span style={{color:r.color,fontSize:'.75rem',fontWeight:600}}>{r.label}</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',color:'#4A5E80',fontSize:'.72rem'}}>{r.normal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RESULT ── */}
      {result&&(
        <div id="result-section" style={{marginTop:'2.5rem',animation:'fadeUp .5s ease'}}>

          {/* Model used banner */}
          <div style={{
            background:'linear-gradient(135deg,rgba(0,212,168,.07),rgba(91,127,255,.07))',
            border:'1px solid rgba(0,212,168,.22)',
            borderRadius:12,padding:'10px 16px',marginBottom:'1rem',
            display:'flex',alignItems:'center',gap:10,
            boxShadow:'0 4px 20px rgba(0,212,168,.06)',
          }}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#00D4A8',display:'inline-block',boxShadow:'0 0 8px #00D4A8'}}/>
            <span style={{fontSize:'.8rem',color:'#8BA0C8'}}>
              Prediction by{' '}<span style={{color:'#A97FFF',fontWeight:700}}>{result.model_name || modelInfo?.winner || 'Random Forest'}</span>
              {' '}(Best Model · F1-Score {(modelInfo?.models?.[modelInfo?.winner]?.['F1-Score'] ?? 0.6145) * 100}% · AUC {(modelInfo?.models?.[modelInfo?.winner]?.['AUC-ROC'] ?? 0.7468) * 100}%)
            </span>
          </div>

          {(result.interpretation || result.risk_factors?.length || result.filled_defaults) && (
            <div style={{background:'linear-gradient(135deg,rgba(91,127,255,.07),rgba(169,127,255,.07))',border:'1px solid rgba(91,127,255,.22)',borderRadius:14,padding:'1rem 1.2rem',marginBottom:'1rem',boxShadow:'0 4px 20px rgba(91,127,255,.06)'}}>
              <div style={{fontSize:'.68rem',color:'#5B7FFF',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:8}}>Live interpretation</div>
              <div style={{color:'#E8EEFF',lineHeight:1.7,fontSize:'.9rem'}}>{result.interpretation}</div>
              {result.risk_factors?.length > 0 && (
                <div style={{marginTop:10,display:'flex',flexWrap:'wrap',gap:8}}>
                  {result.risk_factors.map((factor, idx) => (
                    <span key={idx} style={{background:'rgba(245,166,35,.1)',border:'1px solid rgba(245,166,35,.22)',color:'#F5A623',borderRadius:999,padding:'5px 11px',fontSize:'.72rem',fontWeight:500}}>
                      {factor}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pediatric banner */}
          {result.is_pediatric&&(
            <div style={{background:'rgba(169,127,255,.09)',border:'1px solid rgba(169,127,255,.28)',borderRadius:12,padding:'12px 18px',marginBottom:'1rem',display:'flex',alignItems:'center',gap:12,boxShadow:'0 4px 20px rgba(169,127,255,.08)'}}>
              <span style={{fontSize:'1.5rem'}}>👶</span>
              <div>
                <div style={{color:'#A97FFF',fontWeight:700,fontSize:'.9rem',marginBottom:2}}>Pediatric Patient — Specialized Analysis Applied</div>
                <div style={{color:'#8BA0C8',fontSize:'.82rem'}}>{result.age_label} · Age-adjusted clinical reference ranges used throughout this report.</div>
              </div>
            </div>
          )}

          {/* Verdict */}
          <div style={{
            background:result.prediction===1
              ?'linear-gradient(160deg,rgba(255,77,106,.07) 0%,rgba(7,8,26,0) 60%)'
              :'linear-gradient(160deg,rgba(0,212,168,.07) 0%,rgba(7,8,26,0) 60%)',
            border:`1.5px solid ${result.prediction===1?'rgba(255,77,106,.28)':'rgba(0,212,168,.28)'}`,
            borderRadius:24,padding:'2.4rem',textAlign:'center',marginBottom:'1.2rem',
            position:'relative',overflow:'hidden',
            boxShadow:result.prediction===1?'0 16px 48px rgba(255,77,106,.1)':'0 16px 48px rgba(0,212,168,.1)',
          }}>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:340,height:340,borderRadius:'50%',pointerEvents:'none',
              background:result.prediction===1?'radial-gradient(circle,rgba(255,77,106,.07) 0%,transparent 68%)':'radial-gradient(circle,rgba(0,212,168,.07) 0%,transparent 68%)'}}/>
            <div style={{fontSize:'3.5rem',marginBottom:'.6rem'}}>{result.prediction===1?'🔴':'🟢'}</div>
            <h2 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'2.1rem',fontWeight:800,marginBottom:4,letterSpacing:'-.03em',color:result.prediction===1?'#FF4D6A':'#00D4A8'}}>
              {result.label}
            </h2>
            <div style={{color:'#8BA0C8',fontSize:'.9rem',marginBottom:'1.8rem'}}>
              Risk Classification: <span style={{fontWeight:700,color:result.risk_color}}>{result.risk_level}</span>
              {result.age_label&&<><span style={{color:'#4A5E80',margin:'0 8px'}}>·</span><span style={{color:ageBadgeColor[result.age_group]||'#8BA0C8'}}>{result.age_label}</span></>}
            </div>
            <div style={{maxWidth:500,margin:'0 auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:7,fontSize:'.82rem',color:'#8BA0C8'}}>
                <span>CKD Probability</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'#E8EEFF'}}>{result.probability}%</span>
              </div>
              <div style={{background:'#07081A',borderRadius:999,height:10,overflow:'hidden',border:'1px solid #1E2247'}}>
                <div style={{
                  height:'100%',borderRadius:999,
                  background:result.prediction===1?'linear-gradient(90deg,#F5A623,#FF4D6A)':'linear-gradient(90deg,#00D4A8,#5B7FFF)',
                  width:`${result.probability}%`,transition:'width 1.4s cubic-bezier(.4,0,.2,1)',
                  boxShadow:`0 0 18px ${result.prediction===1?'rgba(255,77,106,.45)':'rgba(0,212,168,.45)'}`,
                }}/>
              </div>
            </div>
          </div>

          {/* What-if simulator */}
          <div style={{background:'linear-gradient(160deg,#10122A,#0C0E22)',border:'1px solid rgba(169,127,255,.25)',borderRadius:16,padding:'1.5rem',marginBottom:'1.2rem',boxShadow:'0 8px 32px rgba(169,127,255,.08)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap',marginBottom:'1.2rem'}}>
              <div>
                <div style={{fontSize:'.68rem',color:'#A97FFF',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:6}}>What-If Simulator</div>
                <h3 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.15rem',color:'#E8EEFF',marginBottom:5}}>Explore a different clinical profile</h3>
                <p style={{color:'#8BA0C8',fontSize:'.8rem',lineHeight:1.6,maxWidth:590}}>
                  Adjust selected values to see how the prediction model responds. This creates a temporary scenario and does not change the original report.
                </p>
              </div>
              <span style={{fontSize:'.7rem',color:'#A97FFF',background:'rgba(169,127,255,.12)',border:'1px solid rgba(169,127,255,.25)',borderRadius:999,padding:'5px 11px',whiteSpace:'nowrap',fontWeight:600}}>Model exploration</span>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem 1.5rem'}}>
              {SIMULATOR_FIELDS.map((field)=>{
                const value=simValues[field.key];
                return(
                  <label key={field.key} style={{display:'block'}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:7}}>
                      <span style={{fontSize:'.78rem',color:'#8BA0C8'}}>{field.label}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.75rem',color:'#E8EEFF'}}>{Number(value).toFixed(field.step<.1?2:field.step<1?1:0)} <span style={{color:'#4A5E80'}}>{field.unit}</span></span>
                    </div>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value}
                      onChange={e=>setSimValues(previous=>({...previous,[field.key]:Number(e.target.value)}))}
                      style={{width:'100%',accentColor:'#A97FFF',cursor:'pointer'}}
                    />
                  </label>
                );
              })}
            </div>

            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:'1.4rem'}}>
              <button onClick={runSimulation} disabled={simLoading} style={{padding:'11px 20px',border:'none',borderRadius:10,background:simLoading?'#1E2247':'linear-gradient(135deg,#A97FFF,#5B7FFF)',color:'#fff',fontWeight:700,fontSize:'.85rem',cursor:simLoading?'not-allowed':'pointer',boxShadow:simLoading?'none':'0 8px 24px rgba(169,127,255,.3)',transition:'all .2s'}}>
                {simLoading?'Running scenario...':'Run Scenario →'}
              </button>
              <span style={{color:'#4A5E80',fontSize:'.72rem'}}>Original report: {result.probability}% risk</span>
            </div>

            {simError&&<div style={{marginTop:'1rem',color:'#FF4D6A',fontSize:'.8rem'}}>{simError}</div>}

            {simResult&&(
              <div style={{marginTop:'1.3rem',paddingTop:'1.2rem',borderTop:'1px solid #1E2247'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.75rem'}}>
                  {[
                    {label:'Original risk',value:`${result.probability}%`,color:'#8BA0C8'},
                    {label:'Scenario risk',value:`${simResult.probability}%`,color:simResult.risk_color||'#A97FFF'},
                    {label:'Change',value:`${simResult.probability-result.probability>0?'+':''}${(simResult.probability-result.probability).toFixed(1)} pts`,color:simResult.probability>result.probability?'#FF4D6A':'#00D4A8'},
                  ].map((item)=>(
                    <div key={item.label} style={{background:'rgba(7,8,26,.7)',border:'1px solid #1E2247',borderRadius:10,padding:'11px',textAlign:'center'}}>
                      <div style={{fontSize:'.66rem',color:'#4A5E80',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>{item.label}</div>
                      <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.25rem',fontWeight:800,color:item.color}}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:'.9rem',flexWrap:'wrap'}}>
                  <span style={{color:'#8BA0C8',fontSize:'.8rem'}}>Scenario classification: <strong style={{color:simResult.risk_color||'#E8EEFF'}}>{simResult.risk_level}</strong></span>
                  <span style={{color:'#8BA0C8',fontSize:'.8rem'}}>Estimated stage: <strong style={{color:'#E8EEFF'}}>{simResult.ckd_stage||simResult.stage_desc||'Normal range'}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:result.ckd_stage?'repeat(3,1fr)':'repeat(2,1fr)',gap:'1rem',marginBottom:'1.2rem'}}>
            {[
              {label:'CKD PROBABILITY',val:`${result.probability}%`,sub:'Model confidence score',color:'#5B7FFF'},
              ...(result.ckd_stage?[{label:'ESTIMATED CKD STAGE',val:result.ckd_stage,sub:result.stage_desc,color:'#FF4D6A'}]:[]),
              {label:'RISK LEVEL',val:result.risk_level,sub:'Based on probability',color:result.risk_color},
            ].map((s,i)=>(
              <div key={i} style={{background:'linear-gradient(160deg,#10122A,#0C0E22)',border:'1px solid #1E2247',borderRadius:14,padding:'1.4rem',textAlign:'center',boxShadow:'0 8px 24px rgba(0,0,0,0.3)'}}>
                <div style={{fontSize:'.66rem',color:'#4A5E80',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>{s.label}</div>
                <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1.65rem',fontWeight:800,color:s.color,marginBottom:4}}>{s.val}</div>
                <div style={{color:'#8BA0C8',fontSize:'.75rem'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Stage scale */}
          {result.prediction===1&&(
            <div style={{background:'linear-gradient(160deg,#10122A,#0C0E22)',border:'1px solid #1E2247',borderRadius:14,padding:'1.4rem',marginBottom:'1.2rem',boxShadow:'0 8px 24px rgba(0,0,0,0.3)'}}>
              <div style={{fontSize:'.68rem',color:'#4A5E80',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'1rem'}}>
                CKD Stage Scale · GFR-Based (KDIGO Guidelines)
              </div>
              <div style={{display:'flex',gap:6}}>
                {[
                  {label:'Stage 1–2',range:'GFR ≥ 60', color:'#00D4A8'},
                  {label:'Stage 3a', range:'GFR 45–59',color:'#F5A623'},
                  {label:'Stage 3b', range:'GFR 30–44',color:'#F97316'},
                  {label:'Stage 4',  range:'GFR 15–29',color:'#EF4444'},
                  {label:'Stage 5',  range:'GFR < 15', color:'#FF4D6A'},
                ].map((s,i)=>{
                  const active = normalizeStageName(result.ckd_stage) === normalizeStageName(s.label);
                  return(
                    <div key={i} style={{flex:1,borderRadius:10,padding:'10px 6px',textAlign:'center',background:active?s.color:'rgba(255,255,255,.02)',border:`1px solid ${active?s.color:'#1E2247'}`,transition:'all .35s ease',boxShadow:active?`0 6px 20px ${s.color}50`:'none'}}>
                      <div style={{fontWeight:700,fontSize:'.78rem',color:active?'#fff':s.color}}>{s.label}</div>
                      <div style={{fontSize:'.65rem',marginTop:3,color:active?'rgba(255,255,255,.75)':'#4A5E80'}}>{s.range}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Early warnings */}
          {result.early_warnings?.length>0&&(
            <div style={{background:'linear-gradient(160deg,#10122A,#0C0E22)',border:'1px solid rgba(245,166,35,.2)',borderRadius:14,padding:'1.4rem',marginBottom:'1.2rem',boxShadow:'0 8px 24px rgba(245,166,35,.05)'}}>
              <div style={{fontSize:'.68rem',color:'#F5A623',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'1rem'}}>🚦 Early Detection Alerts</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {result.early_warnings.map((w,i)=>{
                  const wc={
                    alert:  {bg:'rgba(91,127,255,.08)',  border:'rgba(91,127,255,.22)',  c:'#5B7FFF'},
                    warning:{bg:'rgba(245,166,35,.08)',  border:'rgba(245,166,35,.22)',  c:'#F5A623'},
                    danger: {bg:'rgba(255,77,106,.08)',  border:'rgba(255,77,106,.22)',  c:'#FF4D6A'},
                  };
                  const t=wc[w.level]||wc.alert;
                  return<div key={i} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:9,padding:'10px 14px',animation:`fadeUp .4s ease ${i*80}ms both`}}><span style={{color:t.c,fontSize:'.84rem',lineHeight:1.6}}>{w.msg}</span></div>;
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div style={{background:'linear-gradient(160deg,#10122A,#0C0E22)',border:'1px solid #1E2247',borderRadius:14,padding:'1.4rem',marginBottom:'1.2rem',boxShadow:'0 8px 24px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1rem'}}>
              <span style={{fontSize:'.68rem',color:'#8BA0C8',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase'}}>💡 Health Recommendations</span>
              {result.is_pediatric&&<span style={{fontSize:'.68rem',background:'rgba(169,127,255,.12)',color:'#A97FFF',padding:'2px 10px',borderRadius:999,border:'1px solid rgba(169,127,255,.25)',fontWeight:600}}>Pediatric</span>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {result.recommendations.map((r,i)=>{
                const c=RC[r.type]||RC.info;
                return(
                  <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:10,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start',animation:`fadeUp .4s ease ${i*70}ms both`}}>
                    <span style={{fontSize:'1.2rem',lineHeight:1,flexShrink:0}}>{r.icon}</span>
                    <div>
                      <div style={{color:c.text,fontWeight:600,fontSize:'.88rem',marginBottom:3}}>{r.title}</div>
                      <div style={{color:'#8BA0C8',fontSize:'.82rem',lineHeight:1.55}}>{r.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:'flex',justifyContent:'center',marginBottom:'1rem'}}>
            <button onClick={downloadReport} style={{
              background:'linear-gradient(135deg,#5B7FFF 0%,#A97FFF 100%)',
              border:'none',borderRadius:12,padding:'13px 28px',
              color:'#fff',fontWeight:700,fontSize:'.95rem',cursor:'pointer',
              boxShadow:'0 10px 28px rgba(91,127,255,.35)',
              transition:'all .2s',
            }}
              onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(91,127,255,.5)';}}
              onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 10px 28px rgba(91,127,255,.35)';}}
            >
              ⬇ Download PDF Report
            </button>
          </div>

          <div style={{textAlign:'center',color:'#4A5E80',fontSize:'.75rem',padding:'.5rem',lineHeight:1.7}}>
            ⚠️ NephroScan is a research and educational tool only. Always consult a qualified nephrologist or pediatric specialist before making any medical decisions.
          </div>
        </div>
      )}
    </div>
  );
}
import React,{useState} from 'react';

function Section({title,children,accent='#2D6AFF'}){
  return(
    <div style={{background:'#0D1526',border:'1px solid #172240',borderRadius:16,padding:'1.8rem',marginBottom:'1.2rem'}}>
      <h3 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1rem',fontWeight:700,color:accent,marginBottom:'1.2rem',display:'flex',alignItems:'center',gap:8}}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Tag({label,color='#2D6AFF'}){
  return(
    <span style={{
      display:'inline-block',padding:'4px 12px',borderRadius:999,
      background:`${color}14`,border:`1px solid ${color}30`,
      color,fontSize:'.78rem',fontWeight:500,margin:'3px',
    }}>{label}</span>
  );
}

function ModelRow({name,desc,isBest=false}){
  const [hov,setHov]=useState(false);
  return(
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'11px 14px',borderRadius:10,
        background:hov?'#111D33':'transparent',
        border:`1px solid ${hov?'#1F2F50':'transparent'}`,
        transition:'all .2s',cursor:'default',
        marginBottom:4,
      }}
    >
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        {isBest&&(
          <span style={{fontSize:'.68rem',background:'rgba(0,229,180,.15)',color:'#00E5B4',padding:'2px 10px',borderRadius:999,border:'1px solid rgba(0,229,180,.3)',fontWeight:700,flexShrink:0}}>
            BEST
          </span>
        )}
        <span style={{color:'#DCE8FF',fontWeight:600,fontSize:'.9rem'}}>{name}</span>
      </div>
      <span style={{color:'#7A92BC',fontSize:'.82rem'}}>{desc}</span>
    </div>
  );
}

export default function About(){
  const features=[
    'Age','BMI','HbA1c','Serum Creatinine','BUN Levels','GFR (eGFR)',
    'Hemoglobin','Total Cholesterol','Protein in Urine',
    'Urinary Tract Infections','Family History of Kidney Disease',
  ];

  const pipeline=[
    {step:'Data Collection',  desc:'Clinical patient dataset with real diagnostic labels',color:'#2D6AFF'},
    {step:'Preprocessing',    desc:'StandardScaler normalization · LabelEncoder for categorical features',color:'#9B6DFF'},
    {step:'Train-Test Split', desc:'70/30 stratified split preserving class proportions',color:'#00E5B4'},
    {step:'SMOTE Balancing',  desc:'Applied only on training data to address class imbalance',color:'#FFAA2C'},
    {step:'Model Training',   desc:'Four ML models trained and cross-validated',color:'#FF3D57'},
    {step:'Evaluation',       desc:'Accuracy, Precision, Recall, F1-Score (macro average)',color:'#2D6AFF'},
  ];

  return(
    <div style={{maxWidth:860,margin:'0 auto',padding:'2.5rem 2rem 6rem'}}>
      <div style={{marginBottom:'2.5rem'}}>
        <div style={{fontSize:'.7rem',color:'#2D6AFF',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>Documentation</div>
        <h1 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'2rem',fontWeight:800,color:'#DCE8FF',letterSpacing:'-.03em',marginBottom:6}}>
          About NephroScan
        </h1>
        <p style={{color:'#7A92BC',fontSize:'.9rem',lineHeight:1.7}}>
          A machine learning–powered chronic kidney disease early detection system developed as a major academic project in Data Engineering.
        </p>
      </div>

      {/* Overview */}
      <Section title="🎯 Project Overview" accent="#2D6AFF">
        <p style={{color:'#7A92BC',fontSize:'.88rem',lineHeight:1.75}}>
          Chronic Kidney Disease (CKD) affects people of all ages, including children, and often goes undetected until significant kidney damage has occurred. NephroScan addresses this by providing an AI-powered early detection system that accepts routine clinical values and delivers instant risk classification, CKD stage estimation, and age-aware health guidance.
        </p>
        <p style={{color:'#7A92BC',fontSize:'.88rem',lineHeight:1.75,marginTop:'1rem'}}>
          The system applies pediatric-adjusted clinical thresholds for patients under 18, recognizing that reference ranges for creatinine, GFR, and hemoglobin differ significantly between children and adults.
        </p>
      </Section>

      {/* Features */}
      <Section title="🧬 Selected Clinical Features (11)" accent="#00E5B4">
        <div>{features.map((f,i)=><Tag key={i} label={f} color="#00E5B4"/>)}</div>
        <p style={{color:'#7A92BC',fontSize:'.82rem',marginTop:'1rem',lineHeight:1.6}}>
          Features were selected based on clinical significance, availability in routine lab tests, coverage across the training dataset, and leakage-safe model comparison logic. All features are numeric at inference time after the same train-only preprocessing pipeline is applied.
        </p>
      </Section>

      {/* ML Pipeline */}
      <Section title="⚙️ ML Pipeline" accent="#9B6DFF">
        <div style={{position:'relative',paddingLeft:'1.5rem'}}>
          <div style={{position:'absolute',left:7,top:8,bottom:8,width:1,background:'#172240'}}/>
          {pipeline.map((p,i)=>(
            <div key={i} style={{position:'relative',paddingLeft:'1.5rem',marginBottom:'1rem'}}>
              <div style={{position:'absolute',left:-1,top:4,width:10,height:10,borderRadius:'50%',background:p.color,border:'2px solid #0A1020'}}/>
              <div style={{color:'#DCE8FF',fontWeight:600,fontSize:'.88rem',marginBottom:2}}>{p.step}</div>
              <div style={{color:'#7A92BC',fontSize:'.82rem'}}>{p.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Models */}
      <Section title="🤖 ML Models Trained" accent="#FFAA2C">
        <ModelRow name="Logistic Regression" desc="Baseline linear model · class_weight='balanced' · max_iter=1000"/>
        <ModelRow name="Random Forest"       desc="200 estimators · class_weight='balanced' · min_samples_split=5"/>
        <ModelRow name="SVM (RBF kernel)"    desc="kernel='rbf' · gamma='scale' · class_weight='balanced'"/>
        <ModelRow name="XGBoost"             desc="200 rounds · learning_rate=0.1 · max_depth=6" isBest/>
        <div style={{marginTop:'1rem',padding:'10px 14px',borderRadius:8,background:'rgba(0,229,180,.06)',border:'1px solid rgba(0,229,180,.2)'}}>
          <span style={{color:'#7A92BC',fontSize:'.82rem'}}>
            All models evaluated using <span style={{color:'#00E5B4',fontWeight:600}}>macro-averaged</span> Precision, Recall, and F1-Score to ensure equal weight is given to both CKD and non-CKD classes regardless of class distribution.
          </span>
        </div>
      </Section>

      {/* Age system */}
      <Section title="👶 Age-Adaptive Detection System" accent="#9B6DFF">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:'1rem'}}>
          {[
            {g:'Infant (0–1)',    color:'#9B6DFF',n:'Cr: 0.1–0.4 mg/dL · GFR: 30–90'},
            {g:'Child (2–12)',    color:'#2D6AFF',n:'Cr: 0.3–0.7 mg/dL · GFR: ≥90'},
            {g:'Teen (13–17)',    color:'#00BFFF',n:'Cr: 0.5–1.0 mg/dL · GFR: ≥90'},
            {g:'Adult (18+)',     color:'#00E5B4',n:'Cr: 0.6–1.2 mg/dL · GFR: ≥90'},
          ].map((a,i)=>(
            <div key={i} style={{background:`${a.color}0C`,border:`1px solid ${a.color}22`,borderRadius:8,padding:'10px 12px'}}>
              <div style={{color:a.color,fontWeight:600,fontSize:'.82rem',marginBottom:3}}>{a.g}</div>
              <div style={{fontFamily:'JetBrains Mono,monospace',color:'#7A92BC',fontSize:'.72rem'}}>{a.n}</div>
            </div>
          ))}
        </div>
        <p style={{color:'#7A92BC',fontSize:'.82rem',lineHeight:1.65}}>
          Children have naturally lower serum creatinine and different GFR baselines. Applying adult thresholds to pediatric patients leads to missed diagnoses. NephroScan corrects for this automatically based on the patient's entered age.
        </p>
      </Section>

     

      {/* Disclaimer */}
      <div style={{textAlign:'center',color:'#3A506A',fontSize:'.76rem',lineHeight:1.7,padding:'1rem',border:'1px solid #172240',borderRadius:10}}>
        ⚠️ NephroScan is developed for academic research and educational purposes.<br/>
        It is not a certified medical device.
      </div>
    </div>
  );
}

import React,{useState} from 'react';

function Section({title,children,accent='var(--accent)'}){
  return(
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'1.8rem',marginBottom:'1.2rem',boxShadow:'var(--shadow)'}}>
      <h3 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'1rem',fontWeight:700,color:accent,marginBottom:'1.2rem',display:'flex',alignItems:'center',gap:8}}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Tag({label,color='#21675D'}){
  return(
    <span style={{
      display:'inline-block',padding:'4px 12px',borderRadius:999,
      background:`${color}14`,border:`1px solid ${color}30`,
      color,fontSize:'.78rem',fontWeight:500,margin:'3px',
    }}>{label}</span>
  );
}

function ModelRow({name,desc}){
  const [hov,setHov]=useState(false);
  return(
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'11px 14px',borderRadius:10,
        background:hov?'var(--surface-hover)':'transparent',
        border:`1px solid ${hov?'var(--border)':'transparent'}`,
        transition:'all .2s',cursor:'default',
        marginBottom:4,
      }}
    >
      <span style={{color:'var(--text)',fontWeight:600,fontSize:'.9rem'}}>{name}</span>
      <span style={{color:'var(--text-secondary)',fontSize:'.82rem'}}>{desc}</span>
    </div>
  );
}

export default function About(){
  const features=[
    'Age','BMI','HbA1c','Serum Creatinine','BUN Levels','GFR (eGFR)',
    'Hemoglobin','Systolic Blood Pressure','Protein in Urine',
    'Urinary Tract Infections','Family History of Kidney Disease',
    'Gender','Smoking',
  ];

  const pipeline=[
    {step:'Data Collection',  desc:'Clinical patient dataset with real diagnostic labels',color:'#21675D'},
    {step:'Preprocessing',    desc:'StandardScaler normalization · LabelEncoder for categorical features',color:'#438A7D'},
    {step:'Train-Test Split', desc:'70/30 stratified split preserving class proportions',color:'#267A59'},
    {step:'SMOTE Balancing',  desc:'Applied only on training data to address class imbalance',color:'#9B7217'},
    {step:'Model Training',   desc:'Four ML models trained and cross-validated',color:'#B56525'},
    {step:'Evaluation',       desc:'Accuracy, Precision, Recall, F1-Score (macro average)',color:'#21675D'},
  ];

  return(
    <div style={{maxWidth:860,margin:'0 auto',padding:'2.5rem 2rem 6rem'}}>
      <div style={{marginBottom:'2.5rem'}}>
        <div style={{fontSize:'.7rem',color:'var(--accent)',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>Documentation</div>
        <h1 style={{fontFamily:'Space Grotesk,sans-serif',fontSize:'2rem',fontWeight:800,color:'var(--text)',letterSpacing:'-.03em',marginBottom:6}}>
          About NephroScan
        </h1>
        <p style={{color:'var(--text-secondary)',fontSize:'.9rem',lineHeight:1.7}}>
          A machine learning–powered chronic kidney disease early detection system developed as a major academic project in Data Engineering.
        </p>
      </div>

      {/* Overview */}
      <Section title="🎯 Project Overview">
        <p style={{color:'var(--text-secondary)',fontSize:'.88rem',lineHeight:1.75}}>
          NephroScan is a CKD prediction application built around 13 clinical and demographic inputs. The data is split into stratified training and test sets, scaled using training-set statistics, and balanced on the training set with SMOTENC. Four classifiers are compared, and an isotonic-calibrated XGBoost model powers predictions of “CKD Detected” or “No CKD Detected.”
        </p>
        <p style={{color:'var(--text-secondary)',fontSize:'.88rem',lineHeight:1.75,marginTop:'1rem'}}>
          The current project is trained on adult CKD data spanning ages 20-90, so the app groups patients into adult and senior ranges rather than pediatric categories such as infant or child.
        </p>
      </Section>

      {/* Features */}
      <Section title="🧬 Clinical and Demographic Features (13)" accent="var(--accent)">
        <div>{features.map((f,i)=><Tag key={i} label={f}/>)}</div>
        <p style={{color:'var(--text-secondary)',fontSize:'.82rem',marginTop:'1rem',lineHeight:1.6}}>
          Features were selected based on clinical significance, availability in routine lab tests, coverage across the training dataset, and leakage-safe model comparison logic. All features are numeric at inference time after the same train-only preprocessing pipeline is applied.
        </p>
      </Section>

      {/* ML Pipeline */}
      <Section title="⚙️ ML Pipeline" accent="var(--accent)">
        <div style={{position:'relative',paddingLeft:'1.5rem'}}>
          <div style={{position:'absolute',left:7,top:8,bottom:8,width:1,background:'var(--border)'}}/>
          {pipeline.map((p,i)=>(
            <div key={i} style={{position:'relative',paddingLeft:'1.5rem',marginBottom:'1rem'}}>
              <div style={{position:'absolute',left:-1,top:4,width:10,height:10,borderRadius:'50%',background:p.color,border:'2px solid var(--surface)'}}/>
              <div style={{color:'var(--text)',fontWeight:600,fontSize:'.88rem',marginBottom:2}}>{p.step}</div>
              <div style={{color:'var(--text-secondary)',fontSize:'.82rem'}}>{p.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Models */}
      <Section title="🤖 ML Models Trained" accent="var(--risk-moderate)">
        <ModelRow name="Logistic Regression" desc="Baseline linear model · class_weight='balanced' · max_iter=1000"/>
        <ModelRow name="Random Forest"       desc="200 estimators · class_weight='balanced' · min_samples_split=5"/>
        <ModelRow name="SVM (RBF kernel)"    desc="kernel='rbf' · gamma='scale' · class_weight='balanced'"/>
        <ModelRow name="XGBoost"             desc="200 rounds · learning_rate=0.1 · max_depth=6"/>
        <div style={{marginTop:'1rem',padding:'10px 14px',borderRadius:8,background:'var(--accent-tint)',border:'1px solid var(--border)'}}>
          <span style={{color:'var(--text-secondary)',fontSize:'.82rem'}}>
            All models evaluated using <span style={{color:'var(--accent)',fontWeight:600}}>macro-averaged</span> Precision, Recall, and F1-Score to ensure equal weight is given to both CKD and non-CKD classes regardless of class distribution.
          </span>
        </div>
      </Section>

      {/* Age system */}
      <Section title="� Age Groups Used in This Dataset" accent="var(--accent)">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:'1rem'}}>
          {[
            {g:'Young Adult (20–39)', color:'#438A7D',n:'Cr: 0.6–1.1 mg/dL · GFR: ≥90'},
            {g:'Adult (40–59)',       color:'#21675D',n:'Cr: 0.6–1.2 mg/dL · GFR: ≥90'},
            {g:'Senior (60+)',        color:'#267A59',n:'Cr: 0.6–1.3 mg/dL · GFR: ≥60'},
            {g:'Dataset Range',       color:'#21675D',n:'Ages: 20–90 years'},
          ].map((a,i)=>(
            <div key={i} style={{background:`${a.color}0C`,border:`1px solid ${a.color}22`,borderRadius:8,padding:'10px 12px'}}>
              <div style={{color:a.color,fontWeight:600,fontSize:'.82rem',marginBottom:3}}>{a.g}</div>
              <div style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text-secondary)',fontSize:'.72rem'}}>{a.n}</div>
            </div>
          ))}
        </div>
        <p style={{color:'var(--text-secondary)',fontSize:'.82rem',lineHeight:1.65}}>
          The dataset used for this project contains adult patients only, with ages from 20 to 90. Because of that, the model groups patients into adult and senior ranges instead of pediatric categories.
        </p>
      </Section>

     

      {/* Disclaimer */}
      <div style={{textAlign:'center',color:'var(--text-muted)',fontSize:'.76rem',lineHeight:1.7,padding:'1rem',border:'1px solid var(--border)',borderRadius:10,background:'var(--surface)'}}>
        ⚠️ NephroScan is developed for academic research and educational purposes.<br/>
        It is not a certified medical device.
      </div>
    </div>
  );
}

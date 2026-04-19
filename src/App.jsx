import { useState, useRef } from "react";
import ScriptGuide from "./ScriptGuide";

const MODEL = "claude-sonnet-4-5";

// ── REAL INSURER UW DATA ──────────────────────────────────────────────────────
const NM_LIMITS = {
  life: [
    { ageMax: 34, noEvidence: 750000,  gpq: 1000000, gpr: 2000000 },
    { ageMax: 39, noEvidence: 600000,  gpq: 900000,  gpr: 1500000 },
    { ageMax: 44, noEvidence: 550000,  gpq: 750000,  gpr: 1000000 },
    { ageMax: 49, noEvidence: 400000,  gpq: 600000,  gpr: 900000  },
    { ageMax: 54, noEvidence: 300000,  gpq: 500000,  gpr: 750000  },
    { ageMax: 59, noEvidence: 200000,  gpq: 350000,  gpr: 600000  },
    { ageMax: 64, noEvidence: 150000,  gpq: 250000,  gpr: 500000  },
    { ageMax: 69, noEvidence: 75000,   gpq: 150000,  gpr: 300000  },
    { ageMax: 99, noEvidence: 50000,   gpq: 100000,  gpr: 200000  },
  ],
  ip: [
    { ageMax: 39, noEvidence: 4000, tmi: 6250 },
    { ageMax: 44, noEvidence: 3000, tmi: 5000 },
    { ageMax: 49, noEvidence: 2500, tmi: 4000 },
    { ageMax: 54, noEvidence: 2000, tmi: 3500 },
    { ageMax: 99, noEvidence: 1500, tmi: 2500 },
  ],
};

function getUWFlag(type, age, amount) {
  const limits = NM_LIMITS[type];
  if (!limits || !age || !amount) return null;
  const band = limits.find(b => age <= b.ageMax) || limits[limits.length - 1];
  if (type === "ip") {
    if (amount <= band.noEvidence) return { level: "none", label: "No automatic evidence required" };
    if (amount <= band.tmi) return { level: "tmi", label: "Nurse/telephone medical likely" };
    return { level: "nse", label: "Full medical examination likely" };
  }
  if (amount <= band.noEvidence) return { level: "none", label: "No automatic evidence required" };
  if (amount <= band.gpq) return { level: "gpq", label: "GP questionnaire likely" };
  if (amount <= band.gpr) return { level: "gpr", label: "Full GP report likely" };
  return { level: "medical", label: "Full medical + blood tests likely" };
}

function getBMIRating(bmi, age) {
  if (!bmi || !age) return null;
  const b = Math.round(bmi);
  let zurichLife = "STD", zurichCI = "STD", flag = "green";
  let note = "Standard terms expected.";

  if (b <= 15) { zurichLife = "Possible decline"; zurichCI = "Possible decline"; flag = "red"; note = `BMI ${b}: Likely decline. Pre-sale UW essential.`; }
  else if (b === 16) { zurichLife = "+50% loading"; zurichCI = "+50% loading"; flag = "red"; note = `BMI ${b}: Heavy loading likely across all products.`; }
  else if (b === 17) { zurichLife = "+25%"; zurichCI = "+25%"; flag = "amber"; note = `BMI ${b}: Loading likely. Pre-sale UW required.`; }
  else if (b >= 18 && b <= 29) { zurichLife = "STD"; zurichCI = "STD"; }
  else if (b === 30) { zurichLife = age < 30 ? "+25%" : "STD"; zurichCI = "+25%"; if (age < 30) { flag = "amber"; note = `BMI ${b}: Minor loading possible.`; } }
  else if (b === 31) { zurichLife = "+25%"; zurichCI = "+25%"; flag = "amber"; note = `BMI ${b}: Loading possible. Check pre-sale UW.`; }
  else if (b === 32) { zurichLife = "+25%"; zurichCI = "+25%"; flag = "amber"; note = `BMI ${b}: Loading likely. Pre-sale UW recommended.`; }
  else if (b === 33) { zurichLife = age < 30 ? "+50%" : "+25%"; zurichCI = age < 30 ? "+50%" : "+25%"; flag = "amber"; note = `BMI ${b}: Loading likely. Pre-sale UW required.`; }
  else if (b === 34) { zurichLife = age < 40 ? "+50%" : "+25%"; zurichCI = age < 40 ? "+50%" : "+25%"; flag = "amber"; note = `BMI ${b}: Loading likely (Zurich Life: ${age < 40 ? "+50%" : "+25%"}).`; }
  else if (b === 35) { zurichLife = age < 40 ? "+50%" : "+25%"; zurichCI = age < 30 ? "+75%" : "+50%"; flag = "amber"; note = `BMI ${b}: Loading likely across life and CI.`; }
  else if (b >= 36 && b <= 39) { zurichLife = b === 36 ? (age < 30 ? "+75%" : "+50%") : (b === 37 ? (age < 40 ? "+75%" : "+50%") : (b === 38 ? (age < 30 ? "+100%" : "+75%") : (age < 40 ? "+100%" : "+75%"))); zurichCI = b <= 37 ? "+75%" : "+100%"; flag = "amber"; note = `BMI ${b}: Significant loading. Pre-sale UW essential.`; }
  else if (b === 40) { zurichLife = age < 30 ? "+125%*" : "+100%"; zurichCI = age < 30 ? "Decline" : "+125%*"; flag = "red"; note = `BMI ${b}: Heavy loading/decline risk. Pre-sale UW essential.`; }
  else if (b >= 41) { zurichLife = age < 30 ? "Decline" : "+125%*"; zurichCI = "Decline"; flag = "red"; note = `BMI ${b}: Decline likely for CI. Life heavily loaded.`; }

  return { flag, note, zurichLife, zurichCI };
}

function isSE(t) { return t === "self_employed" || t === "director" || t === "contractor"; }
function calcBMI(hCm, wKg) { if (!hCm || !wKg) return null; const h = parseFloat(hCm)/100, w = parseFloat(wKg); if (!h||!w) return null; return w/(h*h); }
function calcAge(d,m,y) { if (!d||!m||!y||y.length<4) return null; const t=new Date(), b=new Date(parseInt(y),parseInt(m)-1,parseInt(d)); if(isNaN(b.getTime())) return null; let a=t.getFullYear()-b.getFullYear(); if(t.getMonth()-b.getMonth()<0||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate())) a--; return a>=0&&a<120?a:null; }
function getSPA(d,m,y) { if(!d||!m||!y||y.length<4) return null; const dob=new Date(parseInt(y),parseInt(m)-1,parseInt(d)); if(isNaN(dob.getTime())) return null; if(dob<new Date(1960,3,6)) return 66; if(dob<new Date(1977,3,6)) return 67; return 68; }
function ftInToCm(ft,i) { return ((parseFloat(ft)||0)*12+(parseFloat(i)||0))*2.54; }
function stLbsToKg(st,lb) { return ((parseFloat(st)||0)*14+(parseFloat(lb)||0))*0.453592; }
function getHcm(p) { return p.hUnit==="metric"?parseFloat(p.hCm):ftInToCm(p.hFt,p.hIn); }
function getWkg(p) { return p.wUnit==="metric"?parseFloat(p.wKg):stLbsToKg(p.wSt,p.wLbs); }
function heightStr(p) { return p.hUnit==="metric"?`${p.hCm}cm`:`${p.hFt}ft ${p.hIn}in (${ftInToCm(p.hFt,p.hIn).toFixed(1)}cm)`; }
function weightStr(p) { return p.wUnit==="metric"?`${p.wKg}kg`:`${p.wSt}st ${p.wLbs}lbs (${stLbsToKg(p.wSt,p.wLbs).toFixed(1)}kg)`; }

const UWC = { none:"#059669",tmi:"#d97706",gpq:"#d97706",gpr:"#dc2626",medical:"#dc2626",nse:"#dc2626" };
const FC = { green:"#059669",amber:"#d97706",red:"#dc2626" };

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  navy: "#0f1f3d",
  navyMid: "#1a3260",
  blue: "#2563eb",
  blueLight: "#3b82f6",
  teal: "#0d9488",
  gold: "#f59e0b",
  slate: "#64748b",
  slateLight: "#94a3b8",
  bg: "#f0f4f8",
  bgCard: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMid: "#334155",
};

const S = {
  page: { minHeight:"100vh", background:`linear-gradient(160deg, ${C.navy} 0%, ${C.navyMid} 40%, #1e3a5f 100%)`, fontFamily:"'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", paddingBottom:80 },
  header: { padding:"32px 24px 28px", position:"relative", overflow:"hidden" },
  logo: { display:"flex", alignItems:"center", gap:10, marginBottom:6 },
  logoMark: { width:38, height:38, background:"linear-gradient(135deg, #2563eb, #0d9488)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900, color:"#fff", letterSpacing:"-1px", boxShadow:"0 4px 12px rgba(37,99,235,0.4)" },
  logoText: { fontSize:22, fontWeight:800, color:"#fff", letterSpacing:"-0.5px" },
  logoSub: { fontSize:13, color:"rgba(255,255,255,0.55)", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:500 },
  tagline: { fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:6 },
  wrap: { maxWidth:660, margin:"0 auto", padding:"20px 16px" },
  card: { background:C.bgCard, borderRadius:20, padding:"24px 22px", marginBottom:16, boxShadow:"0 4px 24px rgba(15,31,61,0.12)", border:"1px solid rgba(255,255,255,0.8)" },
  cardH: { fontSize:11, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:C.blue, margin:"0 0 20px 0", display:"flex", alignItems:"center", gap:8 },
  cardHLine: { flex:1, height:1, background:`linear-gradient(90deg, ${C.blue}30, transparent)` },
  lbl: { fontSize:12, fontWeight:700, color:C.slate, marginBottom:6, display:"block", letterSpacing:"0.04em", textTransform:"uppercase" },
  inp: { background:"#f8faff", border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, padding:"12px 14px", fontSize:15, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none", appearance:"none", transition:"border-color 0.15s", fontWeight:500 },
  row2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 },
  row1: { marginBottom:14 },
  sub: { background:"#f8faff", borderRadius:14, padding:16, marginBottom:12, border:`1px solid ${C.border}` },
  subH: { fontSize:13, fontWeight:700, color:C.textMid, margin:"0 0 14px 0" },
  addBtn: { background:"transparent", border:`2px dashed ${C.blue}50`, color:C.blue, borderRadius:12, padding:"12px", fontSize:13, fontWeight:700, cursor:"pointer", width:"100%", marginTop:6, letterSpacing:"0.02em", transition:"all 0.15s" },
  remBtn: { background:"#fef2f2", border:"none", color:"#ef4444", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer" },
  genBtn: { background:`linear-gradient(135deg, ${C.blue} 0%, ${C.teal} 100%)`, border:"none", borderRadius:16, color:"#fff", fontSize:16, fontWeight:800, padding:"20px", cursor:"pointer", width:"100%", boxShadow:"0 8px 24px rgba(37,99,235,0.35)", letterSpacing:"0.02em", transition:"transform 0.15s, box-shadow 0.15s" },
  togWrap: { display:"flex", borderRadius:10, overflow:"hidden", border:`1.5px solid ${C.border}`, marginBottom:10, width:"fit-content", background:"#f8faff" },
  togOn: { background:`linear-gradient(135deg, ${C.blue}, #1d4ed8)`, color:"#fff", border:"none", padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.03em" },
  togOff: { background:"transparent", color:C.slate, border:"none", padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" },
  flag: (col) => ({ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", background:col+"12", border:`1px solid ${col}30`, borderRadius:12, marginBottom:8, fontSize:13 }),
  flagDot: (col) => ({ width:8, height:8, borderRadius:"50%", background:col, marginTop:4, flexShrink:0 }),
  badge: (col) => ({ background:col+"15", color:col, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap", letterSpacing:"0.04em" }),
  ageTag: { fontSize:12, color:C.blue, fontWeight:700, margin:"6px 0 10px 0", padding:"5px 10px", background:"#eff6ff", borderRadius:8, display:"inline-block" },
  bmiTag: (col) => ({ fontSize:12, fontWeight:700, color:FC[col]||C.slate, margin:"6px 0 10px 0", padding:"5px 10px", background:FC[col]+"10"||"#f8fafc", borderRadius:8, display:"inline-block" }),
  chk: { display:"flex", alignItems:"center", gap:12, cursor:"pointer", fontSize:14, color:C.textMid, fontWeight:500 },
  out: { background:C.bgCard, borderRadius:20, padding:24, marginTop:18, boxShadow:"0 4px 24px rgba(15,31,61,0.12)", border:"1px solid rgba(255,255,255,0.8)" },
  outH: { fontSize:15, fontWeight:800, color:C.text, margin:"0 0 4px 0", letterSpacing:"-0.3px" },
  pre: { fontSize:14, lineHeight:1.9, color:C.textMid, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 },
  err: { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:14, padding:16, color:"#dc2626", fontSize:13, marginTop:16 },
  spin: { display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:32, color:"rgba(255,255,255,0.6)", fontSize:14 },
  copyBtn: { background:"#f1f5f9", border:`1px solid ${C.border}`, borderRadius:10, padding:"7px 13px", fontSize:12, fontWeight:700, color:C.slate, cursor:"pointer", letterSpacing:"0.02em", transition:"all 0.15s" },
};

// ── COMPONENTS (all outside App) ──────────────────────────────────────────────
function Inp({ value, onChange, type, placeholder }) {
  return <input style={S.inp} value={value} onChange={e=>onChange(e.target.value)} type={type||"text"} placeholder={placeholder||""} />;
}
function Sel({ value, onChange, children }) {
  return <select style={{...S.inp,cursor:"pointer"}} value={value} onChange={e=>onChange(e.target.value)}>{children}</select>;
}
function Ta({ value, onChange, placeholder }) {
  return <textarea style={{...S.inp,minHeight:80,resize:"vertical"}} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} />;
}
function Lbl({ text }) { return <label style={S.lbl}>{text}</label>; }
function F({ label, children }) { return <div><Lbl text={label}/>{children}</div>; }
function CardHeader({ icon, text }) {
  return (
    <div style={S.cardH}>
      <span>{icon}</span> {text}
      <div style={S.cardHLine} />
    </div>
  );
}
function FlagRow({ label, badge, color, detail }) {
  return (
    <div style={S.flag(color)}>
      <div style={S.flagDot(color)} />
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <span style={{color:C.textMid,fontWeight:500}}>{label}</span>
          <span style={S.badge(color)}>{badge}</span>
        </div>
        {detail && <div style={{fontSize:12,color:C.slateLight,marginTop:3}}>{detail}</div>}
      </div>
    </div>
  );
}
function UnitToggle({ isMetric, onMetric, onImperial }) {
  return (
    <div style={S.togWrap}>
      <button style={isMetric?S.togOn:S.togOff} onClick={onMetric}>Metric</button>
      <button style={isMetric?S.togOff:S.togOn} onClick={onImperial}>Imperial</button>
    </div>
  );
}
function DOB({ d, m, y, od, om, oy }) {
  const mref = useRef(null), yref = useRef(null);
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.5fr",gap:10}}>
      <div><Lbl text="Day"/><input style={{...S.inp,textAlign:"center"}} value={d} placeholder="DD" type="number" onChange={e=>{od(e.target.value);if(e.target.value.length===2)mref.current&&mref.current.focus();}} /></div>
      <div><Lbl text="Month"/><input ref={mref} style={{...S.inp,textAlign:"center"}} value={m} placeholder="MM" type="number" onChange={e=>{om(e.target.value);if(e.target.value.length===2)yref.current&&yref.current.focus();}} /></div>
      <div><Lbl text="Year"/><input ref={yref} style={S.inp} value={y} placeholder="YYYY" type="number" onChange={e=>oy(e.target.value)} /></div>
    </div>
  );
}

const BC = {firstName:"",lastName:"",dobD:"",dobM:"",dobY:"",gender:"",marital:"",smoker:"no",hUnit:"metric",hCm:"",hFt:"",hIn:"",wUnit:"metric",wKg:"",wSt:"",wLbs:"",occ:"",empType:"employed",gross:"",takehome:"",outgoings:"",savings:"",sickPay:"",sickDur:"",benefits:"",health:""};
const BP = {firstName:"",dobD:"",dobM:"",dobY:"",gender:"",smoker:"no",hUnit:"metric",hCm:"",hFt:"",hIn:"",wUnit:"metric",wKg:"",wSt:"",wLbs:"",occ:"",empType:"employed",gross:"",takehome:"",sickPay:"",sickDur:"",health:""};
const BM = {balance:"",term:"",payment:"",type:"repayment",purpose:"residential"};
const BX = {type:"",provider:"",amount:"",term:"",premium:"",basis:"single"};

export default function App() {
  const [Cl, setCl] = useState({...BC});
  const [P, setP] = useState({...BP});
  const [hasP, setHasP] = useState(false);
  const [numKids, setNumKids] = useState(0);
  const [kidAges, setKidAges] = useState([]);
  const [mortgages, setMortgages] = useState([{...BM}]);
  const [cover, setCover] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const sc = k => v => setCl(p=>({...p,[k]:v}));
  const sp = k => v => setP(p=>({...p,[k]:v}));

  function setKids(n) {
    const num = parseInt(n)||0; setNumKids(num);
    setKidAges(prev=>{const a=[...prev];while(a.length<num)a.push("");return a.slice(0,num);});
  }

  const cAge = calcAge(Cl.dobD,Cl.dobM,Cl.dobY);
  const pAge = calcAge(P.dobD,P.dobM,P.dobY);
  const cSPA = getSPA(Cl.dobD,Cl.dobM,Cl.dobY);
  const pSPA = getSPA(P.dobD,P.dobM,P.dobY);
  const cHcm = getHcm(Cl), cWkg = getWkg(Cl);
  const pHcm = getHcm(P),  pWkg = getWkg(P);
  const cBMI = calcBMI(cHcm,cWkg), pBMI = calcBMI(pHcm,pWkg);
  const cBMIR = getBMIRating(cBMI,cAge), pBMIR = getBMIRating(pBMI,pAge);
  const totalMortgage = mortgages.reduce((s,m)=>s+(parseFloat(m.balance)||0),0);
  const cIP = parseFloat(Cl.takehome)||0;
  const lifeFlag  = cAge&&totalMortgage ? getUWFlag("life",cAge,totalMortgage) : null;
  const pLifeFlag = hasP&&pAge&&totalMortgage ? getUWFlag("life",pAge,totalMortgage) : null;
  const ipFlag    = cAge&&cIP ? getUWFlag("ip",cAge,cIP) : null;

  function buildPrompt() {
    const kids = numKids>0?`${numKids} child(ren): ${kidAges.map((a,i)=>`Child ${i+1} age ${a}`).join(", ")}`:"None";
    const morts = mortgages.map((m,i)=>`Mortgage ${i+1}: £${m.balance} outstanding, ${m.term} yrs, £${m.payment}/month, ${m.type}, ${m.purpose}`).join("\n")||"None";
    const existing = cover.map((x,i)=>`${i+1}. ${x.type} (${x.basis}) - ${x.provider}, £${x.amount}, ${x.term} yrs, £${x.premium}/month`).join("\n")||"None";
    const cSick = isSE(Cl.empType)?"Self-employed / no employer sick pay":`Sick pay: ${Cl.sickPay||"unknown"} for ${Cl.sickDur||"unknown"}`;
    const pSick = hasP?(isSE(P.empType)?"Self-employed / no employer sick pay":`Sick pay: ${P.sickPay||"unknown"} for ${P.sickDur||"unknown"}`):"";
    const cBen = isSE(Cl.empType)?"N/A":(Cl.benefits||"None");
    const cB = cBMI?` | BMI ${cBMI.toFixed(1)}${cBMIR?` — Zurich Life: ${cBMIR.zurichLife}, CI: ${cBMIR.zurichCI}`:""}` :"";
    const pB = pBMI?` | BMI ${pBMI.toFixed(1)}${pBMIR?` — Zurich Life: ${pBMIR.zurichLife}, CI: ${pBMIR.zurichCI}`:""}` :"";

    return `You are an expert UK protection insurance adviser. Analyse this fact-find and give exactly four clearly labelled sections.

ADVICE RULES:

LIFE INSURANCE: If mortgage exists, primary goal = pay it off if either person dies (decreasing term matching mortgage for repayment; level for interest-only). After mortgage cleared, calculate remaining outgoings (total outgoings MINUS mortgage payment). Check if surviving partner income covers remaining outgoings with at least £500/month to spare. If less than £500 spare, there is a shortfall — recommend FIB per person separately. No mortgage + renting = FIB on total outgoings. Single no dependants = NO standalone life insurance.

INCOME PROTECTION: Maximum = 60% of gross salary (tax free). Recommended amount = total household outgoings minus the continuing partner's take-home (i.e. the shortfall if that person can't work). If both people's 50% share of outgoings is within 60% of their gross, recommend 50% of outgoings each. Never exceed 60% of gross. Deferred: SE/no sick pay + manual/trade = 1 month. SE/no sick pay + white collar + savings >= 3 months outgoings = 3 months. SE/no sick pay + white collar + low savings = 1 month. Employed = deferral matches when sick pay ends. Always full-term own-occupation to state pension age. NEVER 2-year IP.

CRITICAL ILLNESS: 12 months net income per person, level term. Always recommend.

FAMILY INCOME BENEFIT: Where dependent children. Term = years until youngest reaches 21. Base = total outgoings MINUS mortgage payment. Check surviving partner income covers base with £500 buffer. FIB = shortfall. Per person separately.

SINGLE NO DEPENDANTS: No standalone life insurance. CIC and IP only.

---
OUTPUT:
1. RECOMMENDATION — products, amounts, terms, plain English reasoning. Show working on IP and FIB.
2. EXISTING COVER ASSESSMENT — assess each policy. If none, say so.
3. UNDERWRITING QUESTIONS — specific questions based on health, BMI, occupation, lifestyle.
4. UNDERWRITING FLAGS — loadings, exclusions, postponement or decline risks. Reference Zurich BMI data where relevant.

---
CLIENT: ${Cl.firstName} ${Cl.lastName} | DOB: ${Cl.dobD}/${Cl.dobM}/${Cl.dobY} (Age: ${cAge??"unknown"}) | SPA: ${cSPA??"unknown"} | Gender: ${Cl.gender} | Marital: ${Cl.marital} | Smoker: ${Cl.smoker}
Height: ${heightStr(Cl)} | Weight: ${weightStr(Cl)}${cB}
Occupation: ${Cl.occ} (${Cl.empType}) | Gross: £${Cl.gross}/yr | Take-home: £${Cl.takehome}/month
Outgoings: £${Cl.outgoings}/month | Savings: £${Cl.savings}
${cSick}
Benefits: ${cBen}
Health: ${Cl.health||"Nothing disclosed"}

${hasP?`PARTNER: ${P.firstName} | DOB: ${P.dobD}/${P.dobM}/${P.dobY} (Age: ${pAge??"unknown"}) | SPA: ${pSPA??"unknown"} | Gender: ${P.gender} | Smoker: ${P.smoker}
Height: ${heightStr(P)} | Weight: ${weightStr(P)}${pB}
Occupation: ${P.occ} (${P.empType}) | Gross: £${P.gross}/yr | Take-home: £${P.takehome}/month
${pSick}
Health: ${P.health||"Nothing disclosed"}`:"PARTNER: None / single"}

DEPENDANTS: ${kids}
MORTGAGES:\n${morts}
EXISTING COVER:\n${existing}`;
  }

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:1800,messages:[{role:"user",content:buildPrompt()}]})});
      const data = await res.json();
      if(data.error){setError(typeof data.error==="string"?data.error:JSON.stringify(data.error));return;}
      setResult(data.content?.find(b=>b.type==="text")?.text||"No response received.");
    } catch(e){setError("Failed to generate. Please check your connection and try again.");}
    finally{setLoading(false);}
  }

  function CopyBtn({label,getText}) {
    const [done,setDone] = useState(false);
    return <button style={S.copyBtn} onClick={()=>{navigator.clipboard.writeText(getText());setDone(true);setTimeout(()=>setDone(false),2000);}}>{done?"✓ Copied":label}</button>;
  }

  const showUW = lifeFlag||pLifeFlag||ipFlag||(cBMIR&&cBMIR.flag!=="green")||(hasP&&pBMIR&&pBMIR.flag!=="green");

  return (
    <div style={S.page}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={{maxWidth:660,margin:"0 auto"}}>
          <div style={S.logo}>
            <div style={S.logoMark}>L</div>
            <div>
              <div style={S.logoText}>LifeLogic</div>
              <div style={S.logoSub}>Protection Intelligence Platform</div>
            </div>
          </div>
          <div style={S.tagline}>Complete the fact-find below to generate a full advice report and call script</div>
        </div>
        {/* decorative circles */}
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(37,99,235,0.08)",pointerEvents:"none"}} />
        <div style={{position:"absolute",bottom:-60,right:60,width:150,height:150,borderRadius:"50%",background:"rgba(13,148,136,0.08)",pointerEvents:"none"}} />
      </div>

      <div style={S.wrap}>

        {/* CLIENT */}
        <div style={S.card}>
          <CardHeader icon="👤" text="Client Details" />
          <div style={S.row2}>
            <F label="First Name"><Inp value={Cl.firstName} onChange={sc("firstName")} placeholder="John" /></F>
            <F label="Last Name"><Inp value={Cl.lastName} onChange={sc("lastName")} placeholder="Smith" /></F>
          </div>
          <div style={S.row2}>
            <F label="Marital Status"><Sel value={Cl.marital} onChange={sc("marital")}><option value="">Select…</option><option>Single</option><option>Married</option><option>Cohabiting</option><option>Divorced</option><option>Widowed</option></Sel></F>
            <div/>
          </div>
          <div style={S.row1}>
            <Lbl text="Date of Birth"/>
            <DOB d={Cl.dobD} m={Cl.dobM} y={Cl.dobY} od={sc("dobD")} om={sc("dobM")} oy={sc("dobY")} />
            {cAge!==null&&<span style={S.ageTag}>Age {cAge} · State Pension Age {cSPA}</span>}
          </div>
          <div style={S.row2}>
            <F label="Gender"><Sel value={Cl.gender} onChange={sc("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F>
            <F label="Smoker Status"><Sel value={Cl.smoker} onChange={sc("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F>
          </div>
          <div style={S.row1}>
            <Lbl text="Height"/>
            <UnitToggle isMetric={Cl.hUnit==="metric"} onMetric={()=>setCl(p=>({...p,hUnit:"metric"}))} onImperial={()=>setCl(p=>({...p,hUnit:"imperial"}))} />
            {Cl.hUnit==="metric"
              ? <Inp type="number" value={Cl.hCm} onChange={sc("hCm")} placeholder="e.g. 178" />
              : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp type="number" value={Cl.hFt} onChange={sc("hFt")} placeholder="ft" /><Inp type="number" value={Cl.hIn} onChange={sc("hIn")} placeholder="in" /></div>}
          </div>
          <div style={S.row1}>
            <Lbl text="Weight"/>
            <UnitToggle isMetric={Cl.wUnit==="metric"} onMetric={()=>setCl(p=>({...p,wUnit:"metric"}))} onImperial={()=>setCl(p=>({...p,wUnit:"imperial"}))} />
            {Cl.wUnit==="metric"
              ? <Inp type="number" value={Cl.wKg} onChange={sc("wKg")} placeholder="e.g. 82" />
              : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp type="number" value={Cl.wSt} onChange={sc("wSt")} placeholder="st" /><Inp type="number" value={Cl.wLbs} onChange={sc("wLbs")} placeholder="lbs" /></div>}
            {cBMI&&<span style={S.bmiTag(cBMIR?.flag||"green")}>BMI {cBMI.toFixed(1)}{cBMIR?` · Life: ${cBMIR.zurichLife} · CI: ${cBMIR.zurichCI}`:""}</span>}
          </div>
          <div style={S.row1}><F label="Occupation"><Inp value={Cl.occ} onChange={sc("occ")} placeholder="e.g. Accountant, Plumber" /></F></div>
          <div style={S.row1}><F label="Employment Type"><Sel value={Cl.empType} onChange={sc("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F></div>
          <div style={S.row2}>
            <F label="Gross Income (£/yr)"><Inp type="number" value={Cl.gross} onChange={sc("gross")} placeholder="50000" /></F>
            <F label="Take-home (£/month)"><Inp type="number" value={Cl.takehome} onChange={sc("takehome")} placeholder="3200" /></F>
          </div>
          <div style={S.row2}>
            <F label="Total Outgoings (£/month)"><Inp type="number" value={Cl.outgoings} onChange={sc("outgoings")} placeholder="2500" /></F>
            <F label="Savings (£)"><Inp type="number" value={Cl.savings} onChange={sc("savings")} placeholder="10000" /></F>
          </div>
          {!isSE(Cl.empType)&&<div style={S.row2}><F label="Employer Sick Pay"><Inp value={Cl.sickPay} onChange={sc("sickPay")} placeholder="e.g. Full pay" /></F><F label="Sick Pay Duration"><Inp value={Cl.sickDur} onChange={sc("sickDur")} placeholder="e.g. 3 months" /></F></div>}
          {!isSE(Cl.empType)&&<div style={S.row1}><F label="Employee Benefits"><Ta value={Cl.benefits} onChange={sc("benefits")} placeholder="e.g. 4x salary death in service, group IP" /></F></div>}
          <div style={S.row1}><F label="Health / Medical History"><Ta value={Cl.health} onChange={sc("health")} placeholder="e.g. Type 2 diabetes, well controlled. No other conditions." /></F></div>
        </div>

        {/* PARTNER */}
        <div style={S.card}>
          <CardHeader icon="👥" text="Partner / Second Life" />
          <label style={{...S.chk,marginBottom:hasP?20:0}}>
            <input type="checkbox" checked={hasP} onChange={e=>setHasP(e.target.checked)} style={{width:17,height:17,accentColor:C.blue}} />
            Include a partner on this case
          </label>
          {hasP&&<>
            <div style={{...S.row1,marginTop:16}}><F label="First Name"><Inp value={P.firstName} onChange={sp("firstName")} placeholder="Jane" /></F></div>
            <div style={S.row1}><Lbl text="Date of Birth"/><DOB d={P.dobD} m={P.dobM} y={P.dobY} od={sp("dobD")} om={sp("dobM")} oy={sp("dobY")} />{pAge!==null&&<span style={S.ageTag}>Age {pAge} · State Pension Age {pSPA}</span>}</div>
            <div style={S.row2}><F label="Gender"><Sel value={P.gender} onChange={sp("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F><F label="Smoker Status"><Sel value={P.smoker} onChange={sp("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F></div>
            <div style={S.row1}><Lbl text="Height"/><UnitToggle isMetric={P.hUnit==="metric"} onMetric={()=>setP(p=>({...p,hUnit:"metric"}))} onImperial={()=>setP(p=>({...p,hUnit:"imperial"}))} />{P.hUnit==="metric"?<Inp type="number" value={P.hCm} onChange={sp("hCm")} placeholder="e.g. 165" />:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp type="number" value={P.hFt} onChange={sp("hFt")} placeholder="ft" /><Inp type="number" value={P.hIn} onChange={sp("hIn")} placeholder="in" /></div>}</div>
            <div style={S.row1}><Lbl text="Weight"/><UnitToggle isMetric={P.wUnit==="metric"} onMetric={()=>setP(p=>({...p,wUnit:"metric"}))} onImperial={()=>setP(p=>({...p,wUnit:"imperial"}))} />{P.wUnit==="metric"?<Inp type="number" value={P.wKg} onChange={sp("wKg")} placeholder="e.g. 65" />:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Inp type="number" value={P.wSt} onChange={sp("wSt")} placeholder="st" /><Inp type="number" value={P.wLbs} onChange={sp("wLbs")} placeholder="lbs" /></div>}{pBMI&&<span style={S.bmiTag(pBMIR?.flag||"green")}>BMI {pBMI.toFixed(1)}{pBMIR?` · Life: ${pBMIR.zurichLife} · CI: ${pBMIR.zurichCI}`:""}</span>}</div>
            <div style={S.row1}><F label="Occupation"><Inp value={P.occ} onChange={sp("occ")} placeholder="e.g. Teacher" /></F></div>
            <div style={S.row1}><F label="Employment Type"><Sel value={P.empType} onChange={sp("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F></div>
            <div style={S.row2}><F label="Gross Income (£/yr)"><Inp type="number" value={P.gross} onChange={sp("gross")} placeholder="35000" /></F><F label="Take-home (£/month)"><Inp type="number" value={P.takehome} onChange={sp("takehome")} placeholder="2400" /></F></div>
            {!isSE(P.empType)&&<div style={S.row2}><F label="Employer Sick Pay"><Inp value={P.sickPay} onChange={sp("sickPay")} /></F><F label="Sick Pay Duration"><Inp value={P.sickDur} onChange={sp("sickDur")} /></F></div>}
            <div style={S.row1}><F label="Health / Medical History"><Ta value={P.health} onChange={sp("health")} placeholder="e.g. No issues disclosed." /></F></div>
          </>}
        </div>

        {/* CHILDREN */}
        <div style={S.card}>
          <CardHeader icon="👶" text="Dependant Children" />
          <div style={S.row2}><F label="Number of children"><Sel value={numKids} onChange={setKids}>{[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>{n===0?"None":n}</option>)}</Sel></F><div/></div>
          {kidAges.map((a,i)=><div key={i} style={S.row2}><F label={`Child ${i+1} — Age (years)`}><Inp type="number" value={a} onChange={v=>setKidAges(p=>p.map((x,idx)=>idx===i?v:x))} placeholder="e.g. 5" /></F><div/></div>)}
        </div>

        {/* MORTGAGES */}
        <div style={S.card}>
          <CardHeader icon="🏠" text="Mortgage(s)" />
          {mortgages.map((m,i)=>(
            <div key={i} style={S.sub}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><p style={S.subH}>Mortgage {i+1}</p>{mortgages.length>1&&<button style={S.remBtn} onClick={()=>setMortgages(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>}</div>
              <div style={S.row1}><F label="Outstanding Balance (£)"><Inp type="number" value={m.balance} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,balance:v}:x))} placeholder="250000" /></F></div>
              <div style={S.row2}><F label="Remaining Term (yrs)"><Inp type="number" value={m.term} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,term:v}:x))} placeholder="25" /></F><F label="Monthly Payment (£)"><Inp type="number" value={m.payment} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,payment:v}:x))} placeholder="1200" /></F></div>
              <div style={S.row2}><F label="Repayment Type"><Sel value={m.type} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,type:v}:x))}><option value="repayment">Repayment</option><option value="interest_only">Interest Only</option><option value="part_and_part">Part & Part</option></Sel></F><F label="Purpose"><Sel value={m.purpose} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,purpose:v}:x))}><option value="residential">Residential</option><option value="btl">Buy to Let</option><option value="commercial">Commercial</option></Sel></F></div>
            </div>
          ))}
          <button style={S.addBtn} onClick={()=>setMortgages(p=>[...p,{...BM}])}>+ Add another mortgage</button>
        </div>

        {/* EXISTING COVER */}
        <div style={S.card}>
          <CardHeader icon="🛡️" text="Existing Cover" />
          {cover.map((x,i)=>(
            <div key={i} style={S.sub}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><p style={S.subH}>Policy {i+1}</p><button style={S.remBtn} onClick={()=>setCover(p=>p.filter((_,idx)=>idx!==i))}>Remove</button></div>
              <div style={S.row1}><F label="Cover Type"><Sel value={x.type} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,type:v}:c))}><option value="">Select…</option><option>Decreasing Life Insurance</option><option>Level Life Insurance</option><option>Critical Illness Cover</option><option>Income Protection</option><option>Family Income Benefit</option><option>Whole of Life</option><option>Other</option></Sel></F></div>
              <div style={S.row2}><F label="Provider"><Inp value={x.provider} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,provider:v}:c))} placeholder="Aviva" /></F><F label="Basis"><Sel value={x.basis} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,basis:v}:c))}><option value="single">Single life</option><option value="joint">Joint life</option></Sel></F></div>
              <div style={S.row2}><F label="Sum Assured (£)"><Inp type="number" value={x.amount} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,amount:v}:c))} placeholder="200000" /></F><F label="Remaining Term (yrs)"><Inp type="number" value={x.term} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,term:v}:c))} placeholder="20" /></F></div>
              <div style={S.row1}><F label="Monthly Premium (£)"><Inp type="number" value={x.premium} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,premium:v}:c))} placeholder="45" /></F></div>
            </div>
          ))}
          <button style={S.addBtn} onClick={()=>setCover(p=>[...p,{...BX}])}>+ Add existing policy</button>
        </div>

        {/* LIVE UW FLAGS */}
        {showUW&&(
          <div style={S.card}>
            <CardHeader icon="⚡" text="Live Underwriting Flags" />
            {lifeFlag&&<FlagRow label={`${Cl.firstName||"Client"} — Life cover (£${totalMortgage.toLocaleString()})`} badge={lifeFlag.label} color={UWC[lifeFlag.level]} />}
            {pLifeFlag&&<FlagRow label={`${P.firstName||"Partner"} — Life cover (£${totalMortgage.toLocaleString()})`} badge={pLifeFlag.label} color={UWC[pLifeFlag.level]} />}
            {ipFlag&&<FlagRow label={`${Cl.firstName||"Client"} — IP (£${cIP.toLocaleString()}/month)`} badge={ipFlag.label} color={UWC[ipFlag.level]} />}
            {cBMIR&&cBMIR.flag!=="green"&&cBMI&&<FlagRow label={`${Cl.firstName||"Client"} — BMI ${cBMI.toFixed(1)}`} badge={`Life: ${cBMIR.zurichLife} · CI: ${cBMIR.zurichCI}`} color={FC[cBMIR.flag]} detail={cBMIR.note} />}
            {hasP&&pBMIR&&pBMIR.flag!=="green"&&pBMI&&<FlagRow label={`${P.firstName||"Partner"} — BMI ${pBMI.toFixed(1)}`} badge={`Life: ${pBMIR.zurichLife} · CI: ${pBMIR.zurichCI}`} color={FC[pBMIR.flag]} detail={pBMIR.note} />}
          </div>
        )}

        {/* GENERATE BUTTON */}
        <button style={S.genBtn} onClick={generate} disabled={loading}>
          {loading?"Generating advice…":"Generate Advice & Call Script  →"}
        </button>

        {loading&&<div style={S.spin}><span style={{animation:"spin 1s linear infinite",display:"inline-block",fontSize:20}}>◌</span> Analysing case and generating advice…</div>}
        {error&&<div style={S.err}>{error}</div>}

        {result&&(
          <>
            <div style={S.out}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:10}}>
                <div>
                  <p style={S.outH}>Advice Report</p>
                  <p style={{fontSize:12,color:C.slateLight,margin:0}}>Generated by LifeLogic AI</p>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <CopyBtn label="📋 Fact-Find" getText={buildPrompt} />
                  <CopyBtn label="📋 Advice" getText={()=>result} />
                </div>
              </div>
              <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"0 0 18px 0"}}/>
              <pre style={S.pre}>{result}</pre>
            </div>
            <ScriptGuide C={Cl} P={P} hasP={hasP} mortgages={mortgages} numKids={numKids} kidAges={kidAges} cSPA={cSPA} pSPA={pSPA} />
          </>
        )}

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        select option{background:#fff}
        input[type=number]::-webkit-inner-spin-button{opacity:0.4}
        input:focus,select:focus,textarea:focus{border-color:#2563eb !important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
      `}</style>
    </div>
  );
}

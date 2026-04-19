import { useState, useRef } from "react";

const MODEL = "claude-sonnet-4-5";

// ── REAL INSURER UNDERWRITING DATA ────────────────────────────────────────────
// Source: Aviva (Aug 2024), L&G (Oct 2025), Royal London (Apr 2025), Zurich (Feb 2026)

// Non-medical limits: the threshold BELOW which no automatic evidence is required
// Values are monthly benefit for IP, sum assured for life/CI
// We use the MOST GENEROUS insurer (L&G/Royal London) as the "safe" threshold
// and the MOST RESTRICTIVE as the "evidence likely" threshold

const NM_LIMITS = {
  life: [
    // [ageMax, noEvidence, gpqLikely, gprLikely]
    // Under 35: L&G no evidence to 750k, Aviva no evidence to 1m, RL no evidence to 1.1m
    { ageMax: 34, noEvidence: 750000,  gpq: 1000000, gpr: 2000000 },
    // 35-39: L&G no evidence to 600k (NSE at 600k+), Aviva to 750k
    { ageMax: 39, noEvidence: 600000,  gpq: 900000,  gpr: 1500000 },
    // 40-44: L&G SMR at 550k, Aviva Mini at 550k
    { ageMax: 44, noEvidence: 550000,  gpq: 750000,  gpr: 1000000 },
    // 45-49: L&G NSE at 400k, Aviva Mini at 450k
    { ageMax: 49, noEvidence: 400000,  gpq: 600000,  gpr: 900000  },
    // 50-54: L&G NSE at 300k, Aviva Mini at 325k
    { ageMax: 54, noEvidence: 300000,  gpq: 500000,  gpr: 750000  },
    // 55-59: L&G NSE at 200k, Aviva Mini at 250k
    { ageMax: 59, noEvidence: 200000,  gpq: 350000,  gpr: 600000  },
    // 60-64: L&G PHR at 150k, Aviva GPR at 200k
    { ageMax: 64, noEvidence: 150000,  gpq: 250000,  gpr: 500000  },
    // 65-69: L&G PHR at 100k, Aviva GPR at 75k
    { ageMax: 69, noEvidence: 75000,   gpq: 150000,  gpr: 300000  },
    // 70+
    { ageMax: 99, noEvidence: 50000,   gpq: 100000,  gpr: 200000  },
  ],
  ci: [
    // Under 35: L&G no evidence to 350k, Aviva no evidence to 300k
    { ageMax: 34, noEvidence: 300000,  gpq: 500000,  gpr: 750000  },
    // 35-39: L&G NSE at 500k, Aviva Mini at 300k
    { ageMax: 39, noEvidence: 300000,  gpq: 450000,  gpr: 750000  },
    // 40-44: L&G NSE at 300k, Aviva Mini at 300k
    { ageMax: 44, noEvidence: 300000,  gpq: 400000,  gpr: 600000  },
    // 45-49: L&G NSE at 250k, Aviva Mini at 300k
    { ageMax: 49, noEvidence: 250000,  gpq: 350000,  gpr: 500000  },
    // 50-54: L&G PHR at 150k, Aviva Mini at 150k
    { ageMax: 54, noEvidence: 150000,  gpq: 250000,  gpr: 400000  },
    // 55-59: L&G PHR at 100k, Aviva Mini at 100k
    { ageMax: 59, noEvidence: 100000,  gpq: 200000,  gpr: 350000  },
    // 60-64: L&G PHR at 75k, Aviva no evidence to 75k
    { ageMax: 64, noEvidence: 75000,   gpq: 150000,  gpr: 300000  },
    // 65+
    { ageMax: 99, noEvidence: 50000,   gpq: 100000,  gpr: 200000  },
  ],
  ip: [
    // Monthly benefit thresholds (L&G most generous, Aviva most restrictive)
    // Under 40: L&G no evidence to £6,250/month, Aviva to £6,250/month
    { ageMax: 39, noEvidence: 4000,  tmi: 6250  },
    // 40-44: L&G no evidence to £4,000, Aviva to £3,000
    { ageMax: 44, noEvidence: 3000,  tmi: 5000  },
    // 45-49: L&G no evidence to £4,000, Aviva to £2,500
    { ageMax: 49, noEvidence: 2500,  tmi: 4000  },
    // 50-54: L&G no evidence to £2,000, Aviva NSE at £1,500
    { ageMax: 54, noEvidence: 2000,  tmi: 3500  },
    // 55+: L&G NSE at £2,001, Aviva GPR at £1,000
    { ageMax: 99, noEvidence: 1500,  tmi: 2500  },
  ],
};

// BMI ratings by insurer — using Zurich tables (most detailed)
// Returns { flag, note, zurichLife, zurichCI, zurichIP, rlLife }
function getBMIRating(bmi, age) {
  if (!bmi || !age) return null;
  const b = Math.round(bmi);

  // Zurich Life
  let zurichLife = "STD";
  if (b <= 15) zurichLife = "Possible decline";
  else if (b === 16) zurichLife = "+50% loading";
  else if (b === 17) zurichLife = age >= 70 ? "+50%" : "+25%";
  else if (b === 18) zurichLife = age >= 50 ? "+25%" : "STD";
  else if (b >= 19 && b <= 29) zurichLife = "STD";
  else if (b === 30) zurichLife = age < 30 ? "+25%" : "STD";
  else if (b === 31) zurichLife = age < 40 ? "+25%" : "STD";
  else if (b === 32) zurichLife = age < 50 ? "+25%" : "STD";
  else if (b === 33) zurichLife = age < 30 ? "+50%" : "+25%";
  else if (b === 34) zurichLife = age < 40 ? "+50%" : "+25%";
  else if (b === 35) zurichLife = age < 40 ? "+50%" : "+25%";
  else if (b === 36) zurichLife = age < 30 ? "+75%" : age < 50 ? "+50%" : "+25%";
  else if (b === 37) zurichLife = age < 40 ? "+75%" : age < 50 ? "+50%" : "+25%";
  else if (b === 38) zurichLife = age < 30 ? "+100%" : age < 40 ? "+75%" : age < 60 ? "+50%" : "+50%";
  else if (b === 39) zurichLife = age < 40 ? "+100%" : age < 50 ? "+75%" : "+50%";
  else if (b === 40) zurichLife = age < 30 ? "+125%*" : age < 40 ? "+100%" : age < 50 ? "+100%" : "+75%";
  else if (b >= 41 && b <= 43) zurichLife = age < 30 ? "Decline" : age < 40 ? "+125%*" : "+100%";
  else if (b === 44) zurichLife = age < 40 ? "Decline" : age < 50 ? "+150%*" : "+125%*";
  else if (b === 45) zurichLife = age < 40 ? "Decline" : age < 50 ? "Decline" : "+125%*";
  else if (b >= 46 && b <= 47) zurichLife = age < 50 ? "Decline" : "+150%*";
  else zurichLife = "Decline";

  // Zurich CI (more restrictive)
  let zurichCI = "STD";
  if (b <= 17) zurichCI = "Possible decline/loading";
  else if (b >= 18 && b <= 29) zurichCI = "STD";
  else if (b === 30) zurichCI = "+25%";
  else if (b === 31) zurichCI = age < 40 ? "+25%" : "STD";
  else if (b === 32) zurichCI = "+25%";
  else if (b === 33) zurichCI = age < 30 ? "+50%" : "+25%";
  else if (b === 34) zurichCI = age < 40 ? "+50%" : "+25%";
  else if (b === 35) zurichCI = age < 30 ? "+75%" : "+50%";
  else if (b === 36) zurichCI = age < 40 ? "+75%" : "+50%";
  else if (b === 37) zurichCI = age < 30 ? "+75%*" : "+75%";
  else if (b === 38) zurichCI = age < 30 ? "+100%*" : "+75%";
  else if (b === 39) zurichCI = age < 30 ? "+125%*" : age < 40 ? "+100%*" : "+75%";
  else if (b === 40) zurichCI = age < 30 ? "Decline" : age < 40 ? "+125%*" : "+100%*";
  else if (b >= 41) zurichCI = "Decline";

  // Determine overall flag
  let flag = "green";
  let note = "Standard terms expected across all insurers.";

  if (b <= 17 || zurichLife.includes("Decline") || zurichCI.includes("Decline")) {
    flag = "red";
    note = `BMI ${b}: Likely decline or significant loading. Pre-sale UW essential before applying.`;
  } else if (b >= 38 || zurichLife.includes("%") || zurichCI.includes("%")) {
    flag = "amber";
    const loading = zurichCI.includes("Decline") ? "CI decline likely" : `Zurich life ${zurichLife}, CI ${zurichCI}`;
    note = `BMI ${b}: Loading likely (${loading}). Get pre-sale UW indication before applying.`;
  } else if (b >= 31) {
    flag = "amber";
    note = `BMI ${b}: Minor loading possible with some insurers. Check pre-sale UW.`;
  }

  return { flag, note, zurichLife, zurichCI };
}

function getUWFlag(type, personAge, amount) {
  const limits = NM_LIMITS[type];
  if (!limits || !personAge || !amount) return null;
  const band = limits.find(b => personAge <= b.ageMax) || limits[limits.length - 1];
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

function isSE(t) { return t === "self_employed" || t === "director" || t === "contractor"; }

function calcBMI(hCm, wKg) {
  if (!hCm || !wKg) return null;
  const h = parseFloat(hCm) / 100;
  const w = parseFloat(wKg);
  if (!h || !w) return null;
  return w / (h * h);
}

function calcAge(day, month, year) {
  if (!day || !month || !year || year.length < 4) return null;
  const t = new Date(), b = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(b.getTime())) return null;
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

function getStatePensionAge(day, month, year) {
  if (!day || !month || !year || year.length < 4) return null;
  const dob = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(dob.getTime())) return null;
  if (dob < new Date(1960, 3, 6)) return 66;
  if (dob < new Date(1977, 3, 6)) return 67;
  return 68;
}

function ftInToCm(ft, inches) { return ((parseFloat(ft)||0)*12 + (parseFloat(inches)||0)) * 2.54; }
function stLbsToKg(st, lbs) { return ((parseFloat(st)||0)*14 + (parseFloat(lbs)||0)) * 0.453592; }
function getHcm(p) { return p.hUnit === "metric" ? parseFloat(p.hCm) : ftInToCm(p.hFt, p.hIn); }
function getWkg(p) { return p.wUnit === "metric" ? parseFloat(p.wKg) : stLbsToKg(p.wSt, p.wLbs); }
function heightStr(p) { return p.hUnit === "metric" ? `${p.hCm}cm` : `${p.hFt}ft ${p.hIn}in (${ftInToCm(p.hFt,p.hIn).toFixed(1)}cm)`; }
function weightStr(p) { return p.wUnit === "metric" ? `${p.wKg}kg` : `${p.wSt}st ${p.wLbs}lbs (${stLbsToKg(p.wSt,p.wLbs).toFixed(1)}kg)`; }

const UWC = { none:"#16a34a", tmi:"#d97706", gpq:"#d97706", gpr:"#dc2626", medical:"#dc2626", nse:"#dc2626" };
const FC  = { green:"#16a34a", amber:"#d97706", red:"#dc2626" };

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:    { minHeight:"100vh", background:"#f1f5f9", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingBottom:60 },
  header:  { background:"linear-gradient(135deg,#6366f1,#4f46e5)", padding:"20px 20px 18px" },
  h1:      { fontSize:20, fontWeight:700, color:"#fff", margin:0 },
  h1sub:   { fontSize:13, color:"rgba(255,255,255,0.72)", margin:"3px 0 0 0" },
  wrap:    { maxWidth:640, margin:"0 auto", padding:"16px 14px" },
  card:    { background:"#fff", borderRadius:16, padding:20, marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  cardH:   { fontSize:12, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"#6366f1", margin:"0 0 18px 0" },
  lbl:     { fontSize:13, fontWeight:600, color:"#475569", marginBottom:5, display:"block" },
  inp:     { background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:10, color:"#1e293b", padding:"11px 13px", fontSize:15, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit", WebkitAppearance:"none", appearance:"none" },
  row2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 },
  row1:    { marginBottom:12 },
  sub:     { background:"#f8fafc", borderRadius:12, padding:14, marginBottom:10 },
  subH:    { fontSize:13, fontWeight:600, color:"#64748b", margin:"0 0 12px 0" },
  addBtn:  { background:"transparent", border:"1.5px dashed #6366f1", color:"#6366f1", borderRadius:10, padding:"10px", fontSize:13, fontWeight:600, cursor:"pointer", width:"100%", marginTop:4 },
  remBtn:  { background:"#fee2e2", border:"none", color:"#dc2626", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer" },
  genBtn:  { background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", borderRadius:14, color:"#fff", fontSize:16, fontWeight:700, padding:18, cursor:"pointer", width:"100%", boxShadow:"0 4px 14px rgba(99,102,241,0.3)" },
  togWrap: { display:"flex", borderRadius:8, overflow:"hidden", border:"1.5px solid #e2e8f0", marginBottom:8, width:"fit-content" },
  togOn:   { background:"#6366f1", color:"#fff", border:"none", padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" },
  togOff:  { background:"#f8fafc", color:"#64748b", border:"none", padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" },
  flag:    (c) => ({ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, padding:"11px 13px", background:c+"10", borderLeft:"3px solid "+c, borderRadius:8, marginBottom:8, fontSize:13 }),
  badge:   (c) => ({ background:c+"15", border:"1px solid "+c+"40", color:c, borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }),
  ageTag:  { fontSize:12, color:"#6366f1", fontWeight:600, margin:"5px 0 8px 0" },
  bmiTag:  (c) => ({ fontSize:12, fontWeight:600, color:FC[c]||"#64748b", margin:"5px 0 8px 0" }),
  chk:     { display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:"#475569" },
  out:     { background:"#fff", borderRadius:16, padding:22, marginTop:16, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  outH:    { fontSize:15, fontWeight:700, color:"#1e293b", margin:"0 0 14px 0" },
  pre:     { fontSize:14, lineHeight:1.85, color:"#334155", whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 },
  err:     { background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:12, padding:14, color:"#dc2626", fontSize:13, marginTop:14 },
  spin:    { display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:28, color:"#94a3b8", fontSize:14 },
};

// ── Components outside App ────────────────────────────────────────────────────
function Inp({ value, onChange, type, placeholder }) {
  return <input style={S.inp} value={value} onChange={e => onChange(e.target.value)} type={type||"text"} placeholder={placeholder||""} />;
}
function Sel({ value, onChange, children }) {
  return <select style={{...S.inp, cursor:"pointer"}} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}
function Ta({ value, onChange, placeholder }) {
  return <textarea style={{...S.inp, minHeight:76, resize:"vertical"}} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder||""} />;
}
function Lbl({ text }) { return <label style={S.lbl}>{text}</label>; }
function F({ label, children }) { return <div><Lbl text={label} />{children}</div>; }
function FlagRow({ label, badge, color }) {
  return (
    <div style={S.flag(color)}>
      <span>{label}</span>
      <span style={S.badge(color)}>{badge}</span>
    </div>
  );
}
function UnitToggle({ isMetric, onMetric, onImperial }) {
  return (
    <div style={S.togWrap}>
      <button style={isMetric ? S.togOn : S.togOff} onClick={onMetric}>Metric</button>
      <button style={isMetric ? S.togOff : S.togOn} onClick={onImperial}>Imperial</button>
    </div>
  );
}
function DOB({ d, m, y, od, om, oy }) {
  const mref = useRef(null);
  const yref = useRef(null);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.4fr", gap:8 }}>
      <div>
        <Lbl text="Day" />
        <input style={{...S.inp, textAlign:"center"}} value={d} placeholder="DD" type="number"
          onChange={e => { od(e.target.value); if (e.target.value.length===2) mref.current&&mref.current.focus(); }} />
      </div>
      <div>
        <Lbl text="Month" />
        <input ref={mref} style={{...S.inp, textAlign:"center"}} value={m} placeholder="MM" type="number"
          onChange={e => { om(e.target.value); if (e.target.value.length===2) yref.current&&yref.current.focus(); }} />
      </div>
      <div>
        <Lbl text="Year" />
        <input ref={yref} style={S.inp} value={y} placeholder="YYYY" type="number" onChange={e => oy(e.target.value)} />
      </div>
    </div>
  );
}

const BC = { firstName:"", lastName:"", dobD:"", dobM:"", dobY:"", gender:"", marital:"", smoker:"no", hUnit:"metric", hCm:"", hFt:"", hIn:"", wUnit:"metric", wKg:"", wSt:"", wLbs:"", occ:"", empType:"employed", gross:"", takehome:"", outgoings:"", savings:"", sickPay:"", sickDur:"", benefits:"", health:"" };
const BP = { firstName:"", dobD:"", dobM:"", dobY:"", gender:"", smoker:"no", hUnit:"metric", hCm:"", hFt:"", hIn:"", wUnit:"metric", wKg:"", wSt:"", wLbs:"", occ:"", empType:"employed", gross:"", takehome:"", sickPay:"", sickDur:"", health:"" };
const BM = { balance:"", term:"", payment:"", type:"repayment", purpose:"residential" };
const BX = { type:"", provider:"", amount:"", term:"", premium:"", basis:"single" };

export default function App() {
  const [C, setC] = useState({...BC});
  const [P, setP] = useState({...BP});
  const [hasP, setHasP] = useState(false);
  const [numKids, setNumKids] = useState(0);
  const [kidAges, setKidAges] = useState([]);
  const [mortgages, setMortgages] = useState([{...BM}]);
  const [cover, setCover] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const sc = (k) => (v) => setC(p => ({...p,[k]:v}));
  const sp = (k) => (v) => setP(p => ({...p,[k]:v}));

  function setKids(n) {
    const num = parseInt(n)||0;
    setNumKids(num);
    setKidAges(prev => { const a=[...prev]; while(a.length<num) a.push(""); return a.slice(0,num); });
  }

  const cAge = calcAge(C.dobD, C.dobM, C.dobY);
  const pAge = calcAge(P.dobD, P.dobM, P.dobY);
  const cSPA = getStatePensionAge(C.dobD, C.dobM, C.dobY);
  const pSPA = getStatePensionAge(P.dobD, P.dobM, P.dobY);
  const cHcm = getHcm(C), cWkg = getWkg(C);
  const pHcm = getHcm(P), pWkg = getWkg(P);
  const cBMI = calcBMI(cHcm, cWkg);
  const pBMI = calcBMI(pHcm, pWkg);
  const cBMIRating = getBMIRating(cBMI, cAge);
  const pBMIRating = getBMIRating(pBMI, pAge);
  const totalMortgage = mortgages.reduce((s,m) => s+(parseFloat(m.balance)||0), 0);
  const cIP = parseFloat(C.takehome)||0;
  const lifeFlag = cAge && totalMortgage ? getUWFlag("life", cAge, totalMortgage) : null;
  const pLifeFlag = hasP && pAge && totalMortgage ? getUWFlag("life", pAge, totalMortgage) : null;
  const ipFlag = cAge && cIP ? getUWFlag("ip", cAge, cIP) : null;

  function buildPrompt() {
    const kids = numKids>0 ? `${numKids} child(ren): ${kidAges.map((a,i)=>`Child ${i+1} age ${a}`).join(", ")}` : "None";
    const morts = mortgages.map((m,i)=>`Mortgage ${i+1}: £${m.balance} outstanding, ${m.term} yrs, £${m.payment}/month, ${m.type}, ${m.purpose}`).join("\n")||"None";
    const existing = cover.map((x,i)=>`${i+1}. ${x.type} (${x.basis}) - ${x.provider}, £${x.amount}, ${x.term} yrs, £${x.premium}/month`).join("\n")||"None";
    const cSick = isSE(C.empType) ? "Self-employed / no employer sick pay" : `Sick pay: ${C.sickPay||"unknown"} for ${C.sickDur||"unknown"}`;
    const pSick = hasP ? (isSE(P.empType) ? "Self-employed / no employer sick pay" : `Sick pay: ${P.sickPay||"unknown"} for ${P.sickDur||"unknown"}`) : "";
    const cBen = isSE(C.empType) ? "N/A" : (C.benefits||"None");
    const cB = cBMI ? ` | BMI ${cBMI.toFixed(1)}${cBMIRating ? ` — Zurich Life: ${cBMIRating.zurichLife}, CI: ${cBMIRating.zurichCI}` : ""}` : "";
    const pB = pBMI ? ` | BMI ${pBMI.toFixed(1)}${pBMIRating ? ` — Zurich Life: ${pBMIRating.zurichLife}, CI: ${pBMIRating.zurichCI}` : ""}` : "";

    return `You are an expert UK protection insurance adviser. Analyse this fact-find and give exactly four clearly labelled sections.

ADVICE RULES:

LIFE INSURANCE: If mortgage exists, primary goal = pay it off if either person dies (decreasing term life matching mortgage balance and term for repayment mortgages; level term for interest-only). After mortgage cleared, calculate remaining outgoings (total outgoings MINUS mortgage payment). Check if surviving partner income covers remaining outgoings with at least £500/month to spare. If their income minus remaining outgoings is less than £500, there is a shortfall — recommend FIB per person separately for that shortfall. No mortgage and renting = FIB based on total outgoings including rent. Single with no dependants = NO standalone life insurance. CIC and IP only.

INCOME PROTECTION: Maximum = 60% of gross salary (tax free). For cover amount: (a) Two people with incomes within 25% of each other = 50% of household outgoings each. (b) Significant income difference = weight proportionally to income. (c) Single = 60% of gross. Never exceed 60% of gross. Deferred period: SE/no sick pay + manual/trade = 1 month. SE/no sick pay + white collar/office + savings >= 3 months outgoings = 3 months. SE/no sick pay + white collar + low savings = 1 month. Employed = deferral matches when sick pay ends. Always full-term own-occupation IP to state pension age (shown below). NEVER 2-year IP.

CRITICAL ILLNESS: Default 12 months net income per person, level term. Always recommend.

FAMILY INCOME BENEFIT: Where dependent children. Term = years until youngest reaches 21. Base = total household outgoings MINUS mortgage payment (mortgage already paid off by life cover). Check if surviving partner income covers this net figure with £500/month buffer. FIB covers any shortfall. Per person separately.

SINGLE NO DEPENDANTS: No standalone life insurance. CIC and IP only.

---
OUTPUT:
1. RECOMMENDATION — products, amounts, terms, plain English reasoning. Show your working on IP and FIB calculations.
2. EXISTING COVER ASSESSMENT — assess each policy for adequacy, gaps, what to replace or keep. If none, say so.
3. UNDERWRITING QUESTIONS — specific questions to ask based on health disclosures, BMI, occupation, lifestyle.
4. UNDERWRITING FLAGS — direct flags for loadings, exclusions, postponement or decline. Reference actual insurer BMI ratings where relevant (Zurich data provided above).

---
CLIENT: ${C.firstName} ${C.lastName} | DOB: ${C.dobD}/${C.dobM}/${C.dobY} (Age: ${cAge??"unknown"}) | SPA: ${cSPA??"unknown"} | Gender: ${C.gender} | Marital: ${C.marital} | Smoker: ${C.smoker}
Height: ${heightStr(C)} | Weight: ${weightStr(C)}${cB}
Occupation: ${C.occ} (${C.empType}) | Gross: £${C.gross}/yr | Take-home: £${C.takehome}/month
Outgoings: £${C.outgoings}/month | Savings: £${C.savings}
${cSick}
Benefits: ${cBen}
Health: ${C.health||"Nothing disclosed"}

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
      const res = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:MODEL, max_tokens:1500, messages:[{role:"user",content:buildPrompt()}] }),
      });
      const data = await res.json();
      if (data.error) { setError(typeof data.error==="string"?data.error:JSON.stringify(data.error)); return; }
      setResult(data.content?.find(b=>b.type==="text")?.text || "No response received.");
    } catch(e) {
      setError("Failed to generate. Please check your connection and try again.");
    } finally { setLoading(false); }
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <p style={S.h1}>Protection Advice Tool</p>
        <p style={S.h1sub}>Complete the fact-find then generate advice</p>
      </div>
      <div style={S.wrap}>

        {/* CLIENT */}
        <div style={S.card}>
          <p style={S.cardH}>👤 Client Details</p>
          <div style={S.row2}>
            <F label="First Name"><Inp value={C.firstName} onChange={sc("firstName")} placeholder="John" /></F>
            <F label="Last Name"><Inp value={C.lastName} onChange={sc("lastName")} placeholder="Smith" /></F>
          </div>
          <div style={S.row2}>
            <F label="Marital Status"><Sel value={C.marital} onChange={sc("marital")}><option value="">Select…</option><option>Single</option><option>Married</option><option>Cohabiting</option><option>Divorced</option><option>Widowed</option></Sel></F>
            <div/>
          </div>
          <div style={{marginBottom:12}}>
            <Lbl text="Date of Birth" />
            <DOB d={C.dobD} m={C.dobM} y={C.dobY} od={sc("dobD")} om={sc("dobM")} oy={sc("dobY")} />
            {cAge!==null && <p style={S.ageTag}>Age: {cAge} — State Pension Age: {cSPA}</p>}
          </div>
          <div style={S.row2}>
            <F label="Gender"><Sel value={C.gender} onChange={sc("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F>
            <F label="Smoker Status"><Sel value={C.smoker} onChange={sc("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F>
          </div>
          <div style={S.row1}>
            <Lbl text="Height" />
            <UnitToggle isMetric={C.hUnit==="metric"} onMetric={()=>setC(p=>({...p,hUnit:"metric"}))} onImperial={()=>setC(p=>({...p,hUnit:"imperial"}))} />
            {C.hUnit==="metric"
              ? <Inp type="number" value={C.hCm} onChange={sc("hCm")} placeholder="e.g. 175" />
              : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp type="number" value={C.hFt} onChange={sc("hFt")} placeholder="ft" /><Inp type="number" value={C.hIn} onChange={sc("hIn")} placeholder="in" /></div>
            }
          </div>
          <div style={S.row1}>
            <Lbl text="Weight" />
            <UnitToggle isMetric={C.wUnit==="metric"} onMetric={()=>setC(p=>({...p,wUnit:"metric"}))} onImperial={()=>setC(p=>({...p,wUnit:"imperial"}))} />
            {C.wUnit==="metric"
              ? <Inp type="number" value={C.wKg} onChange={sc("wKg")} placeholder="e.g. 80" />
              : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp type="number" value={C.wSt} onChange={sc("wSt")} placeholder="st" /><Inp type="number" value={C.wLbs} onChange={sc("wLbs")} placeholder="lbs" /></div>
            }
            {cBMI && <p style={S.bmiTag(cBMIRating?.flag||"green")}>BMI: {cBMI.toFixed(1)}{cBMIRating ? ` — Life: ${cBMIRating.zurichLife} | CI: ${cBMIRating.zurichCI}` : ""}</p>}
          </div>
          <div style={S.row1}><F label="Occupation"><Inp value={C.occ} onChange={sc("occ")} placeholder="e.g. Accountant, Plumber" /></F></div>
          <div style={S.row1}><F label="Employment Type"><Sel value={C.empType} onChange={sc("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F></div>
          <div style={S.row2}>
            <F label="Gross Income (£/yr)"><Inp type="number" value={C.gross} onChange={sc("gross")} placeholder="50000" /></F>
            <F label="Take-home (£/month)"><Inp type="number" value={C.takehome} onChange={sc("takehome")} placeholder="3200" /></F>
          </div>
          <div style={S.row2}>
            <F label="Total Outgoings (£/month)"><Inp type="number" value={C.outgoings} onChange={sc("outgoings")} placeholder="2500" /></F>
            <F label="Savings (£)"><Inp type="number" value={C.savings} onChange={sc("savings")} placeholder="10000" /></F>
          </div>
          {!isSE(C.empType) && (
            <div style={S.row2}>
              <F label="Employer Sick Pay"><Inp value={C.sickPay} onChange={sc("sickPay")} placeholder="e.g. Full pay" /></F>
              <F label="Sick Pay Duration"><Inp value={C.sickDur} onChange={sc("sickDur")} placeholder="e.g. 3 months" /></F>
            </div>
          )}
          {!isSE(C.empType) && (
            <div style={S.row1}><F label="Employee Benefits"><Ta value={C.benefits} onChange={sc("benefits")} placeholder="e.g. 4x salary death in service, group IP" /></F></div>
          )}
          <div style={S.row1}><F label="Health / Medical History"><Ta value={C.health} onChange={sc("health")} placeholder="e.g. Type 2 diabetes, well controlled. No other conditions." /></F></div>
        </div>

        {/* PARTNER */}
        <div style={S.card}>
          <p style={S.cardH}>👥 Partner / Second Life</p>
          <label style={{...S.chk, marginBottom:hasP?18:0}}>
            <input type="checkbox" checked={hasP} onChange={e=>setHasP(e.target.checked)} style={{width:16,height:16}} />
            Include a partner on this case
          </label>
          {hasP && <>
            <div style={{...S.row1,marginTop:14}}><F label="First Name"><Inp value={P.firstName} onChange={sp("firstName")} placeholder="Jane" /></F></div>
            <div style={{marginBottom:12}}>
              <Lbl text="Date of Birth" />
              <DOB d={P.dobD} m={P.dobM} y={P.dobY} od={sp("dobD")} om={sp("dobM")} oy={sp("dobY")} />
              {pAge!==null && <p style={S.ageTag}>Age: {pAge} — State Pension Age: {pSPA}</p>}
            </div>
            <div style={S.row2}>
              <F label="Gender"><Sel value={P.gender} onChange={sp("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F>
              <F label="Smoker Status"><Sel value={P.smoker} onChange={sp("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F>
            </div>
            <div style={S.row1}>
              <Lbl text="Height" />
              <UnitToggle isMetric={P.hUnit==="metric"} onMetric={()=>setP(p=>({...p,hUnit:"metric"}))} onImperial={()=>setP(p=>({...p,hUnit:"imperial"}))} />
              {P.hUnit==="metric"
                ? <Inp type="number" value={P.hCm} onChange={sp("hCm")} placeholder="e.g. 165" />
                : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp type="number" value={P.hFt} onChange={sp("hFt")} placeholder="ft" /><Inp type="number" value={P.hIn} onChange={sp("hIn")} placeholder="in" /></div>
              }
            </div>
            <div style={S.row1}>
              <Lbl text="Weight" />
              <UnitToggle isMetric={P.wUnit==="metric"} onMetric={()=>setP(p=>({...p,wUnit:"metric"}))} onImperial={()=>setP(p=>({...p,wUnit:"imperial"}))} />
              {P.wUnit==="metric"
                ? <Inp type="number" value={P.wKg} onChange={sp("wKg")} placeholder="e.g. 65" />
                : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Inp type="number" value={P.wSt} onChange={sp("wSt")} placeholder="st" /><Inp type="number" value={P.wLbs} onChange={sp("wLbs")} placeholder="lbs" /></div>
              }
              {pBMI && <p style={S.bmiTag(pBMIRating?.flag||"green")}>BMI: {pBMI.toFixed(1)}{pBMIRating ? ` — Life: ${pBMIRating.zurichLife} | CI: ${pBMIRating.zurichCI}` : ""}</p>}
            </div>
            <div style={S.row1}><F label="Occupation"><Inp value={P.occ} onChange={sp("occ")} placeholder="e.g. Teacher" /></F></div>
            <div style={S.row1}><F label="Employment Type"><Sel value={P.empType} onChange={sp("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F></div>
            <div style={S.row2}>
              <F label="Gross Income (£/yr)"><Inp type="number" value={P.gross} onChange={sp("gross")} placeholder="35000" /></F>
              <F label="Take-home (£/month)"><Inp type="number" value={P.takehome} onChange={sp("takehome")} placeholder="2400" /></F>
            </div>
            {!isSE(P.empType) && (
              <div style={S.row2}>
                <F label="Employer Sick Pay"><Inp value={P.sickPay} onChange={sp("sickPay")} /></F>
                <F label="Sick Pay Duration"><Inp value={P.sickDur} onChange={sp("sickDur")} /></F>
              </div>
            )}
            <div style={S.row1}><F label="Health / Medical History"><Ta value={P.health} onChange={sp("health")} placeholder="e.g. No issues disclosed." /></F></div>
          </>}
        </div>

        {/* CHILDREN */}
        <div style={S.card}>
          <p style={S.cardH}>👶 Dependant Children</p>
          <div style={S.row2}>
            <F label="Number of children">
              <Sel value={numKids} onChange={setKids}>
                {[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>{n===0?"None":n}</option>)}
              </Sel>
            </F>
            <div/>
          </div>
          {kidAges.map((a,i) => (
            <div key={i} style={S.row2}>
              <F label={`Child ${i+1} — Age (years)`}><Inp type="number" value={a} onChange={v=>setKidAges(p=>p.map((x,idx)=>idx===i?v:x))} placeholder="e.g. 5" /></F>
              <div/>
            </div>
          ))}
        </div>

        {/* MORTGAGES */}
        <div style={S.card}>
          <p style={S.cardH}>🏠 Mortgage(s)</p>
          {mortgages.map((m,i) => (
            <div key={i} style={S.sub}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <p style={S.subH}>Mortgage {i+1}</p>
                {mortgages.length>1 && <button style={S.remBtn} onClick={()=>setMortgages(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>}
              </div>
              <div style={S.row1}><F label="Outstanding Balance (£)"><Inp type="number" value={m.balance} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,balance:v}:x))} placeholder="250000" /></F></div>
              <div style={S.row2}>
                <F label="Remaining Term (yrs)"><Inp type="number" value={m.term} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,term:v}:x))} placeholder="25" /></F>
                <F label="Monthly Payment (£)"><Inp type="number" value={m.payment} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,payment:v}:x))} placeholder="1200" /></F>
              </div>
              <div style={S.row2}>
                <F label="Repayment Type"><Sel value={m.type} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,type:v}:x))}><option value="repayment">Repayment</option><option value="interest_only">Interest Only</option><option value="part_and_part">Part & Part</option></Sel></F>
                <F label="Purpose"><Sel value={m.purpose} onChange={v=>setMortgages(p=>p.map((x,idx)=>idx===i?{...x,purpose:v}:x))}><option value="residential">Residential</option><option value="btl">Buy to Let</option><option value="commercial">Commercial</option></Sel></F>
              </div>
            </div>
          ))}
          <button style={S.addBtn} onClick={()=>setMortgages(p=>[...p,{...BM}])}>+ Add another mortgage</button>
        </div>

        {/* EXISTING COVER */}
        <div style={S.card}>
          <p style={S.cardH}>🛡️ Existing Cover</p>
          {cover.map((x,i) => (
            <div key={i} style={S.sub}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <p style={S.subH}>Policy {i+1}</p>
                <button style={S.remBtn} onClick={()=>setCover(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
              </div>
              <div style={S.row1}><F label="Cover Type"><Sel value={x.type} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,type:v}:c))}><option value="">Select…</option><option>Decreasing Life Insurance</option><option>Level Life Insurance</option><option>Critical Illness Cover</option><option>Income Protection</option><option>Family Income Benefit</option><option>Whole of Life</option><option>Other</option></Sel></F></div>
              <div style={S.row2}>
                <F label="Provider"><Inp value={x.provider} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,provider:v}:c))} placeholder="Aviva" /></F>
                <F label="Basis"><Sel value={x.basis} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,basis:v}:c))}><option value="single">Single life</option><option value="joint">Joint life</option></Sel></F>
              </div>
              <div style={S.row2}>
                <F label="Sum Assured (£)"><Inp type="number" value={x.amount} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,amount:v}:c))} placeholder="200000" /></F>
                <F label="Remaining Term (yrs)"><Inp type="number" value={x.term} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,term:v}:c))} placeholder="20" /></F>
              </div>
              <div style={S.row1}><F label="Monthly Premium (£)"><Inp type="number" value={x.premium} onChange={v=>setCover(p=>p.map((c,idx)=>idx===i?{...c,premium:v}:c))} placeholder="45" /></F></div>
            </div>
          ))}
          <button style={S.addBtn} onClick={()=>setCover(p=>[...p,{...BX}])}>+ Add existing policy</button>
        </div>

        {/* LIVE UW FLAGS */}
        {(lifeFlag||pLifeFlag||ipFlag||(cBMIRating&&cBMIRating.flag!=="green")||(hasP&&pBMIRating&&pBMIRating.flag!=="green")) && (
          <div style={S.card}>
            <p style={S.cardH}>⚡ Live Underwriting Flags</p>
            {lifeFlag && <FlagRow label={`${C.firstName||"Client"} — Life (£${totalMortgage.toLocaleString()})`} badge={lifeFlag.label} color={UWC[lifeFlag.level]} />}
            {pLifeFlag && <FlagRow label={`${P.firstName||"Partner"} — Life (£${totalMortgage.toLocaleString()})`} badge={pLifeFlag.label} color={UWC[pLifeFlag.level]} />}
            {ipFlag && <FlagRow label={`${C.firstName||"Client"} — IP (£${cIP.toLocaleString()}/month)`} badge={ipFlag.label} color={UWC[ipFlag.level]} />}
            {cBMIRating && cBMIRating.flag!=="green" && cBMI && <FlagRow label={`${C.firstName||"Client"} — BMI ${cBMI.toFixed(1)}`} badge={cBMIRating.note} color={FC[cBMIRating.flag]} />}
            {hasP && pBMIRating && pBMIRating.flag!=="green" && pBMI && <FlagRow label={`${P.firstName||"Partner"} — BMI ${pBMI.toFixed(1)}`} badge={pBMIRating.note} color={FC[pBMIRating.flag]} />}
          </div>
        )}

        {/* GENERATE */}
        <button style={S.genBtn} onClick={generate} disabled={loading}>
          {loading ? "Generating advice…" : "⚡  Generate Protection Advice"}
        </button>

        {loading && <div style={S.spin}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Analysing and generating advice…</div>}
        {error && <div style={S.err}>{error}</div>}
        {result && (
          <div style={S.out}>
            <p style={S.outH}>Protection Advice Output</p>
            <hr style={{border:"none",borderTop:"1px solid #e2e8f0",margin:"0 0 16px 0"}} />
            <pre style={S.pre}>{result}</pre>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}select option{background:#fff}`}</style>
    </div>
  );
}

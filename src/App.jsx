
import { useState, useCallback, useRef } from "react";

const ANTHROPIC_MODEL = "claude-sonnet-4-5";

const UW_LIMITS = {
  life: [
    { ageMax: 39, noEvidenceLimit: 1500000, gpqLimit: 2000000, gprLimit: 3000000 },
    { ageMax: 49, noEvidenceLimit: 1000000, gpqLimit: 1500000, gprLimit: 2500000 },
    { ageMax: 59, noEvidenceLimit: 750000,  gpqLimit: 1000000, gprLimit: 2000000 },
    { ageMax: 69, noEvidenceLimit: 500000,  gpqLimit: 750000,  gprLimit: 1500000 },
  ],
  ip: [
    { ageMax: 39, noEvidenceLimit: 6250, tmiLimit: 10000 },
    { ageMax: 49, noEvidenceLimit: 2500, tmiLimit: 6250  },
    { ageMax: 99, noEvidenceLimit: 2000, tmiLimit: 5000  },
  ],
};

const BMI_RATINGS = [
  { min: 0,    max: 17.4, label: "Very Underweight", flag: "decline", note: "Likely decline or heavy loading." },
  { min: 17.5, max: 19.9, label: "Underweight",      flag: "warning", note: "Standard terms unlikely." },
  { min: 20,   max: 32.4, label: "Normal / OK",      flag: "ok",      note: "Standard terms expected." },
  { min: 32.5, max: 34.9, label: "Obese Class I",    flag: "warning", note: "Loading possible — get pre-sale UW." },
  { min: 35,   max: 37.4, label: "Obese Class II",   flag: "warning", note: "Loading likely — pre-sale UW required." },
  { min: 37.5, max: 999,  label: "Severely Obese",   flag: "decline", note: "Decline likely, especially CI and IP." },
];

const FLAG_COLOURS = { ok:"#16a34a", warning:"#d97706", decline:"#dc2626", none:"#16a34a", tmi:"#d97706", gpq:"#d97706", gpr:"#dc2626", medical:"#dc2626", nse:"#dc2626" };

// ── UK State Pension Age ──────────────────────────────────────────────────────
function getStatePensionAge(dobDay, dobMonth, dobYear) {
  if (!dobDay || !dobMonth || !dobYear || dobYear.length < 4) return null;
  const dob = new Date(parseInt(dobYear), parseInt(dobMonth)-1, parseInt(dobDay));
  if (isNaN(dob.getTime())) return null;
  const apr1960 = new Date(1960, 3, 6);
  const apr1961 = new Date(1961, 3, 6);
  const apr1977 = new Date(1977, 3, 6);
  if (dob < apr1960) return 66;
  if (dob < apr1961) return 67; // transitional — simplify to 67
  if (dob < apr1977) return 67;
  return 68;
}

function calcBMI(h, w) { if (!h || !w) return null; const m = h/100; return w/(m*m); }
function getBMIBand(bmi) { if (!bmi) return null; return BMI_RATINGS.find(b => bmi >= b.min && bmi <= b.max) || BMI_RATINGS[BMI_RATINGS.length-1]; }

// Convert imperial to metric
function feetInchesToCm(feet, inches) {
  const f = parseFloat(feet)||0, i = parseFloat(inches)||0;
  return ((f * 12) + i) * 2.54;
}
function stoneToKg(stone, lbs) {
  const s = parseFloat(stone)||0, l = parseFloat(lbs)||0;
  return (s * 6.35029) + (l * 0.453592);
}

function dobToAge(day, month, year) {
  if (!day || !month || !year || year.length < 4) return null;
  const today = new Date();
  const birth = new Date(parseInt(year), parseInt(month)-1, parseInt(day));
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function dobString(day, month, year) {
  if (!day || !month || !year) return "";
  return `${day.padStart(2,"0")}/${month.padStart(2,"0")}/${year}`;
}

function getUWFlag(type, age, amount) {
  const limits = UW_LIMITS[type]; if (!limits) return null;
  const band = limits.find(b => age <= b.ageMax) || limits[limits.length-1];
  if (type === "ip") {
    if (amount <= band.noEvidenceLimit) return { level:"none", label:"No automatic evidence required" };
    if (amount <= band.tmiLimit) return { level:"tmi", label:"Telephone medical interview likely" };
    return { level:"nse", label:"Nurse screening likely" };
  }
  if (amount <= band.noEvidenceLimit) return { level:"none", label:"No automatic evidence required" };
  if (amount <= band.gpqLimit) return { level:"gpq", label:"GP questionnaire likely" };
  if (amount <= band.gprLimit) return { level:"gpr", label:"Full GP report likely" };
  return { level:"medical", label:"Full medical exam likely" };
}

const isSelfEmployed = (t) => t === "self_employed" || t === "director" || t === "contractor";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#f8fafc", surface: "#ffffff", border: "#e2e8f0",
  text: "#1e293b", textMuted: "#64748b", textLight: "#94a3b8",
  primary: "#6366f1", primaryDark: "#4f46e5",
  inputBg: "#f8fafc", subBg: "#f1f5f9",
  danger: "#fee2e2", dangerText: "#dc2626",
};

const inputBase = {
  background: C.inputBg, border: `1px solid ${C.border}`,
  borderRadius: 10, color: C.text, padding: "11px 14px",
  fontSize: 15, outline: "none", width: "100%",
  boxSizing: "border-box", fontFamily: "inherit", WebkitAppearance: "none",
};
const labelBase = { fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: "block" };

// ── Primitives ────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return <div style={{ display:"flex", flexDirection:"column" }}><label style={labelBase}>{label}</label>{children}</div>;
}
function TInput({ value, onChange, type="text", placeholder="", maxLength, inputRef }) {
  return <input ref={inputRef} style={inputBase} value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} maxLength={maxLength} />;
}
function TSelect({ value, onChange, children }) {
  return <select style={{ ...inputBase, cursor:"pointer" }} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}
function TTextarea({ value, onChange, placeholder="" }) {
  return <textarea style={{ ...inputBase, minHeight:80, resize:"vertical" }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}
function Badge({ color, children }) {
  return <span style={{ display:"inline-flex", alignItems:"center", background:color+"15", border:`1px solid ${color}40`, color, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{children}</span>;
}
function FlagRow({ label, badge, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, padding:"12px 14px", background:color+"08", borderLeft:`3px solid ${color}`, borderRadius:8, marginBottom:8, fontSize:13, color:C.text }}>
      <span>{label}</span><Badge color={color}>{badge}</Badge>
    </div>
  );
}
function SectionCard({ icon, title, children }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:16, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <p style={{ fontSize:13, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:C.primary, margin:0 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}
function Row({ children, cols=2 }) {
  return <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, marginBottom:14 }}>{children}</div>;
}
function SubCard({ children }) {
  return <div style={{ background:C.subBg, borderRadius:12, padding:14, marginBottom:12 }}>{children}</div>;
}
function AddBtn({ onClick, label }) {
  return <button style={{ background:"transparent", border:`1.5px dashed ${C.primary}`, color:C.primary, borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer", marginTop:4, width:"100%" }} onClick={onClick}>+ {label}</button>;
}
function RemoveBtn({ onClick }) {
  return <button style={{ background:C.danger, border:"none", color:C.dangerText, borderRadius:8, padding:"4px 10px", fontSize:13, fontWeight:700, cursor:"pointer" }} onClick={onClick}>Remove</button>;
}

// ── DOB Input ─────────────────────────────────────────────────────────────────
function DOBInput({ day, month, year, onDay, onMonth, onYear }) {
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.5fr", gap:8 }}>
      <Field label="Day">
        <input style={{ ...inputBase, textAlign:"center" }} value={day} placeholder="DD" maxLength={2} type="number"
          onChange={e => { const v=e.target.value; onDay(v); if(v.length===2) monthRef.current&&monthRef.current.focus(); }} />
      </Field>
      <Field label="Month">
        <input ref={monthRef} style={{ ...inputBase, textAlign:"center" }} value={month} placeholder="MM" maxLength={2} type="number"
          onChange={e => { const v=e.target.value; onMonth(v); if(v.length===2) yearRef.current&&yearRef.current.focus(); }} />
      </Field>
      <Field label="Year">
        <input ref={yearRef} style={inputBase} value={year} placeholder="YYYY" maxLength={4} type="number" onChange={e => onYear(e.target.value)} />
      </Field>
    </div>
  );
}

// ── Height Input (metric or imperial) ────────────────────────────────────────
function HeightInput({ unit, cm, onCm, feet, onFeet, inches, onInches }) {
  if (unit === "metric") {
    return <Field label="Height (cm)"><TInput type="number" value={cm} onChange={onCm} placeholder="175" /></Field>;
  }
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
      <Field label="Feet"><TInput type="number" value={feet} onChange={onFeet} placeholder="5" /></Field>
      <Field label="Inches"><TInput type="number" value={inches} onChange={onInches} placeholder="10" /></Field>
    </div>
  );
}

// ── Weight Input (metric or imperial) ────────────────────────────────────────
function WeightInput({ unit, kg, onKg, stone, onStone, lbs, onLbs }) {
  if (unit === "metric") {
    return <Field label="Weight (kg)"><TInput type="number" value={kg} onChange={onKg} placeholder="80" /></Field>;
  }
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
      <Field label="Stone"><TInput type="number" value={stone} onChange={onStone} placeholder="12" /></Field>
      <Field label="Lbs"><TInput type="number" value={lbs} onChange={onLbs} placeholder="6" /></Field>
    </div>
  );
}

// ── Unit toggle ───────────────────────────────────────────────────────────────
function UnitToggle({ unit, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:10 }}>
      {["metric","imperial"].map(u => (
        <button key={u} onClick={() => onChange(u)} style={{
          background: unit===u ? C.primary : "transparent",
          color: unit===u ? "#fff" : C.textMuted,
          border: `1px solid ${unit===u ? C.primary : C.border}`,
          borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600, cursor:"pointer"
        }}>{u==="metric" ? "Metric (cm/kg)" : "Imperial (ft/st)"}</button>
      ))}
    </div>
  );
}

// ── BMI display ───────────────────────────────────────────────────────────────
function BMIDisplay({ bmi, band }) {
  if (!bmi || !band) return null;
  const colour = band.flag==="ok" ? C.primary : band.flag==="warning" ? "#d97706" : "#dc2626";
  return (
    <div style={{ background:colour+"10", border:`1px solid ${colour}30`, borderRadius:8, padding:"8px 12px", marginTop:8, marginBottom:4 }}>
      <span style={{ fontSize:13, fontWeight:700, color:colour }}>BMI: {bmi.toFixed(1)}</span>
      <span style={{ fontSize:13, color:C.textMuted }}> — {band.label}</span>
    </div>
  );
}

// ── Age / SPA display ─────────────────────────────────────────────────────────
function AgeSPADisplay({ age, spa }) {
  if (age === null) return null;
  return (
    <div style={{ display:"flex", gap:16, marginTop:6, marginBottom:4 }}>
      <span style={{ fontSize:12, color:C.primary, fontWeight:600 }}>Age: {age}</span>
      {spa && <span style={{ fontSize:12, color:C.textMuted, fontWeight:600 }}>State Pension Age: {spa}</span>}
    </div>
  );
}

// ── Blank states ──────────────────────────────────────────────────────────────
const BC = { firstName:"", lastName:"", dobDay:"", dobMonth:"", dobYear:"", gender:"", maritalStatus:"", smoker:"no", heightUnit:"metric", heightCm:"", heightFt:"", heightIn:"", weightUnit:"metric", weightKg:"", weightSt:"", weightLbs:"", occupation:"", employmentType:"employed", grossIncome:"", takeHomePay:"", totalOutgoings:"", savings:"", healthDetails:"", employerSickPay:"", employerSickPayDuration:"", employeeBenefits:"" };
const BP = { firstName:"", dobDay:"", dobMonth:"", dobYear:"", gender:"", smoker:"no", heightUnit:"metric", heightCm:"", heightFt:"", heightIn:"", weightUnit:"metric", weightKg:"", weightSt:"", weightLbs:"", occupation:"", employmentType:"employed", grossIncome:"", takeHomePay:"", healthDetails:"", employerSickPay:"", employerSickPayDuration:"" };
const BM = { balance:"", term:"", monthlyPayment:"", type:"repayment", purpose:"residential" };
const BX = { type:"", provider:"", amount:"", term:"", premium:"", basis:"single" };

function getHeightCm(p) {
  if (p.heightUnit === "metric") return parseFloat(p.heightCm)||0;
  return feetInchesToCm(p.heightFt, p.heightIn);
}
function getWeightKg(p) {
  if (p.weightUnit === "metric") return parseFloat(p.weightKg)||0;
  return stoneToKg(p.weightSt, p.weightLbs);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function App() {
  const [client, setClient] = useState({...BC});
  const [partner, setPartner] = useState({...BP});
  const [hasPartner, setHasPartner] = useState(false);
  const [numChildren, setNumChildren] = useState(0);
  const [childAges, setChildAges] = useState([]);
  const [mortgages, setMortgages] = useState([{...BM}]);
  const [cover, setCover] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const sc = useCallback((k) => (v) => setClient(p => ({...p,[k]:v})), []);
  const sp = useCallback((k) => (v) => setPartner(p => ({...p,[k]:v})), []);
  const um = useCallback((i,k) => (v) => setMortgages(p => p.map((m,idx) => idx===i?{...m,[k]:v}:m)), []);
  const ux = useCallback((i,k) => (v) => setCover(p => p.map((c,idx) => idx===i?{...c,[k]:v}:c)), []);

  const clientAge = dobToAge(client.dobDay, client.dobMonth, client.dobYear);
  const partnerAge = dobToAge(partner.dobDay, partner.dobMonth, partner.dobYear);
  const clientSPA = getStatePensionAge(client.dobDay, client.dobMonth, client.dobYear);
  const partnerSPA = getStatePensionAge(partner.dobDay, partner.dobMonth, partner.dobYear);

  const cHeightCm = getHeightCm(client);
  const cWeightKg = getWeightKg(client);
  const pHeightCm = getHeightCm(partner);
  const pWeightKg = getWeightKg(partner);

  const cBMI = calcBMI(cHeightCm, cWeightKg);
  const pBMI = calcBMI(pHeightCm, pWeightKg);
  const cBand = getBMIBand(cBMI);
  const pBand = getBMIBand(pBMI);

  const totalLife = mortgages.reduce((s,m) => s+(parseFloat(m.balance)||0), 0);
  const monthIP = parseFloat(client.takeHomePay)||0;
  const lifeFlag = clientAge && totalLife ? getUWFlag("life", clientAge, totalLife) : null;
  const ipFlag = clientAge && monthIP ? getUWFlag("ip", clientAge, monthIP) : null;
  const pLifeFlag = partnerAge && totalLife && hasPartner ? getUWFlag("life", partnerAge, totalLife) : null;

  function handleNumChildren(n) {
    const num = parseInt(n)||0;
    setNumChildren(num);
    setChildAges(prev => { const a=[...prev]; while(a.length<num) a.push(""); return a.slice(0,num); });
  }

  function buildPrompt() {
    const clientDOB = dobString(client.dobDay, client.dobMonth, client.dobYear);
    const partnerDOB = dobString(partner.dobDay, partner.dobMonth, partner.dobYear);
    const kids = numChildren>0 ? `${numChildren} child(ren), ages: ${childAges.map((a,i)=>`Child ${i+1}: ${a} years`).join(", ")}` : "None";
    const morts = mortgages.map((m,i)=>`Mortgage ${i+1}: £${m.balance} outstanding, ${m.term} years remaining, £${m.monthlyPayment}/month, ${m.type}, ${m.purpose}`).join("\n")||"None";
    const existing = cover.map((c,i)=>`${i+1}. ${c.type} (${c.basis}) - ${c.provider}, £${c.amount}, ${c.term} yrs remaining, £${c.premium}/month`).join("\n")||"None";
    const cb = cBMI ? ` | BMI: ${cBMI.toFixed(1)} (${cBand?.label})` : "";
    const pb = pBMI ? ` | BMI: ${pBMI.toFixed(1)} (${pBand?.label})` : "";
    const cSick = isSelfEmployed(client.employmentType) ? "Self-employed / no employer sick pay" : `Sick pay: ${client.employerSickPay||"unknown"} for ${client.employerSickPayDuration||"unknown"}`;
    const pSick = hasPartner ? (isSelfEmployed(partner.employmentType) ? "Self-employed / no employer sick pay" : `Sick pay: ${partner.employerSickPay||"unknown"} for ${partner.employerSickPayDuration||"unknown"}`) : "";
    const cBenefits = isSelfEmployed(client.employmentType) ? "N/A (self-employed)" : (client.employeeBenefits||"None");

    const cGross = parseFloat(client.grossIncome)||0;
    const pGross = parseFloat(partner.grossIncome)||0;
    const cTakeHome = parseFloat(client.takeHomePay)||0;
    const pTakeHome = parseFloat(partner.takeHomePay)||0;
    const outgoings = parseFloat(client.totalOutgoings)||0;

    // IP calc logic for prompt context
    let ipLogic = "";
    if (hasPartner && cGross > 0 && pGross > 0) {
      const similar = Math.abs(cGross - pGross) / Math.max(cGross, pGross) < 0.4;
      if (similar) {
        const halfOut = Math.round(outgoings / 2);
        const cMax = Math.round(cGross * 0.65 / 12);
        const pMax = Math.round(pGross * 0.65 / 12);
        ipLogic = `Similar earners — suggest IP based on half total outgoings per person (£${halfOut}/month each). Max IP allowed: client £${cMax}/month, partner £${pMax}/month (65% gross rule). Check against max before recommending.`;
      } else {
        const higher = cGross > pGross ? "client" : "partner";
        const lowerIncome = Math.min(cTakeHome, pTakeHome);
        const shortfallIfHigherOff = Math.max(0, outgoings - lowerIncome);
        const shortfallIfLowerOff = Math.max(0, outgoings - Math.max(cTakeHome, pTakeHome));
        const cMax = Math.round(cGross * 0.65 / 12);
        const pMax = Math.round(pGross * 0.65 / 12);
        ipLogic = `Different earners — if higher earner (${higher}) is off sick: shortfall is approx £${Math.round(shortfallIfHigherOff)}/month. If lower earner is off: shortfall is approx £${Math.round(shortfallIfLowerOff)}/month. Max IP: client £${cMax}/month, partner £${pMax}/month (65% gross rule). Base recommendation on covering the shortfall if each person individually goes off sick.`;
      }
    } else if (cTakeHome > 0) {
      const cMax = Math.round(cGross * 0.65 / 12);
      ipLogic = `Single / no partner income data — max IP is £${cMax}/month (65% of gross). If outgoings are £${outgoings}/month, recommend enough to cover outgoings up to this maximum.`;
    }

    return `You are an expert UK protection insurance adviser. Analyse this fact-find and respond with exactly four clearly labelled sections.

ADVICE LOGIC - follow precisely:

LIFE INSURANCE:
- If repayment mortgage: recommend JOINT decreasing term life insurance matching total mortgage balance and term. One joint policy, not two singles.
- After mortgage cleared, calculate remaining outgoings (total outgoings minus mortgage payment).
- Check if surviving partner income covers remaining outgoings.
- If shortfall: recommend FIB for that monthly shortfall per person (separate policies).
- No mortgage, renting: FIB based on total outgoings including rent.
- Single with no dependants: NO standalone life insurance. CIC and IP only.

INCOME PROTECTION:
- Maximum IP is 65% of gross annual salary converted to monthly. Never recommend above this.
- IP term: always to state pension age (client SPA: ${clientSPA||"unknown"}${hasPartner?`, partner SPA: ${partnerSPA||"unknown"}`:""}). Never tie to mortgage term.
- ${ipLogic}
- Deferred period:
  * Self-employed / no sick pay + manual/trade occupation = 1 month deferred
  * Self-employed / no sick pay + white collar/office + savings covering 3+ months outgoings = 3 months deferred
  * Self-employed / no sick pay + white collar/office + low savings = 1 month deferred
  * Employed with sick pay: deferral matches when sick pay ends
- Always recommend own-occupation full-term IP. Never 2-year payment period.

CRITICAL ILLNESS COVER:
- Default amount: 12 months net income per person, level term.
- Term: match mortgage term if mortgage exists. If no mortgage, to state pension age.
- Always recommend CIC regardless of other cover.

FAMILY INCOME BENEFIT:
- Where dependent children exist.
- Term = years until youngest child reaches age 21.
- Amount = monthly shortfall after surviving partner income covers outgoings.

---
1. RECOMMENDATION - products needed, amounts, terms, plain-English reasoning per product. Be specific with numbers.
2. EXISTING COVER ASSESSMENT - assess each policy: gaps, what to replace or keep. If none: state "No existing cover."
3. UNDERWRITING QUESTIONS - specific questions to ask based on health disclosures, BMI, occupation, lifestyle.
4. UNDERWRITING FLAGS - direct flags for loadings, exclusions, postponement or decline risks.

---
CLIENT: ${client.firstName} ${client.lastName} | DOB: ${clientDOB} (Age: ${clientAge??'unknown'}, State Pension Age: ${clientSPA??'unknown'}) | Gender: ${client.gender} | Marital: ${client.maritalStatus} | Smoker: ${client.smoker}
Height: ${cHeightCm.toFixed(0)}cm | Weight: ${cWeightKg.toFixed(1)}kg${cb}
Occupation: ${client.occupation} (${client.employmentType}) | Gross: £${client.grossIncome}/yr | Take-home: £${client.takeHomePay}/month
Total outgoings: £${client.totalOutgoings}/month | Savings: £${client.savings}
${cSick}
Benefits: ${cBenefits}
Health: ${client.healthDetails||'Nothing disclosed'}

${hasPartner?`PARTNER: ${partner.firstName} | DOB: ${partnerDOB} (Age: ${partnerAge??'unknown'}, State Pension Age: ${partnerSPA??'unknown'}) | Gender: ${partner.gender} | Smoker: ${partner.smoker}
Height: ${pHeightCm.toFixed(0)}cm | Weight: ${pWeightKg.toFixed(1)}kg${pb}
Occupation: ${partner.occupation} (${partner.employmentType}) | Gross: £${partner.grossIncome}/yr | Take-home: £${partner.takeHomePay}/month
${pSick}
Health: ${partner.healthDetails||'Nothing disclosed'}`:'PARTNER: None / single'}

DEPENDANTS: ${kids}
MORTGAGES:
${morts}
EXISTING COVER:
${existing}
---`;
  }

  async function handleGenerate() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:1500, messages:[{role:"user",content:buildPrompt()}] }),
      });
      const data = await res.json();
      if (data.error) { setError(typeof data.error==="string"?data.error:JSON.stringify(data.error)); return; }
      setResult(data.content?.find(b=>b.type==="text")?.text || "No response received.");
    } catch(e) {
      setError("Failed to generate advice. Please check your connection and try again.");
    } finally { setLoading(false); }
  }

  function PersonSection({ label, p, sc, age, spa, bmi, band, isPartner }) {
    return <>
      <Row cols={2}>
        <Field label="First Name"><TInput value={p.firstName} onChange={sc("firstName")} placeholder={isPartner?"Jane":"John"} /></Field>
        {!isPartner && <Field label="Last Name"><TInput value={p.lastName} onChange={sc("lastName")} placeholder="Smith" /></Field>}
        {isPartner && <div/>}
      </Row>
      <div style={{marginBottom:14}}>
        <p style={{...labelBase, marginBottom:8}}>Date of Birth</p>
        <DOBInput day={p.dobDay} month={p.dobMonth} year={p.dobYear}
          onDay={sc("dobDay")} onMonth={sc("dobMonth")} onYear={sc("dobYear")} />
        <AgeSPADisplay age={age} spa={spa} />
      </div>
      <Row cols={2}>
        <Field label="Gender"><TSelect value={p.gender} onChange={sc("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></TSelect></Field>
        {!isPartner && <Field label="Marital Status"><TSelect value={p.maritalStatus} onChange={sc("maritalStatus")}><option value="">Select…</option><option>Single</option><option>Married</option><option>Cohabiting</option><option>Divorced</option><option>Widowed</option></TSelect></Field>}
        {isPartner && <Field label="Smoker"><TSelect value={p.smoker} onChange={sc("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></TSelect></Field>}
      </Row>
      {!isPartner && (
        <Row cols={2}>
          <Field label="Smoker Status"><TSelect value={p.smoker} onChange={sc("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></TSelect></Field>
          <div/>
        </Row>
      )}
      <div style={{marginBottom:14}}>
        <UnitToggle unit={p.heightUnit} onChange={v => sc("heightUnit")(v)} />
        <Row cols={p.heightUnit==="metric"?1:2}>
          {p.heightUnit==="metric"
            ? <Field label="Height (cm)"><TInput type="number" value={p.heightCm} onChange={sc("heightCm")} placeholder="175" /></Field>
            : <><Field label="Feet"><TInput type="number" value={p.heightFt} onChange={sc("heightFt")} placeholder="5" /></Field>
               <Field label="Inches"><TInput type="number" value={p.heightIn} onChange={sc("heightIn")} placeholder="10" /></Field></>
          }
        </Row>
      </div>
      <div style={{marginBottom:14}}>
        <UnitToggle unit={p.weightUnit} onChange={v => sc("weightUnit")(v)} />
        <Row cols={p.weightUnit==="metric"?1:2}>
          {p.weightUnit==="metric"
            ? <Field label="Weight (kg)"><TInput type="number" value={p.weightKg} onChange={sc("weightKg")} placeholder="80" /></Field>
            : <><Field label="Stone"><TInput type="number" value={p.weightSt} onChange={sc("weightSt")} placeholder="12" /></Field>
               <Field label="Lbs"><TInput type="number" value={p.weightLbs} onChange={sc("weightLbs")} placeholder="6" /></Field></>
          }
        </Row>
        <BMIDisplay bmi={bmi} band={band} />
      </div>
      <Row cols={1}>
        <Field label="Occupation"><TInput value={p.occupation} onChange={sc("occupation")} placeholder="e.g. Accountant, Plumber" /></Field>
      </Row>
      <Row cols={1}>
        <Field label="Employment Type"><TSelect value={p.employmentType} onChange={sc("employmentType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></TSelect></Field>
      </Row>
      <Row cols={2}>
        <Field label="Gross Income (£/yr)"><TInput type="number" value={p.grossIncome} onChange={sc("grossIncome")} placeholder="50000" /></Field>
        <Field label="Take-home (£/month)"><TInput type="number" value={p.takeHomePay} onChange={sc("takeHomePay")} placeholder="3200" /></Field>
      </Row>
      {!isPartner && (
        <Row cols={2}>
          <Field label="Total Outgoings (£/month)"><TInput type="number" value={p.totalOutgoings} onChange={sc("totalOutgoings")} placeholder="2500" /></Field>
          <Field label="Savings (£)"><TInput type="number" value={p.savings} onChange={sc("savings")} placeholder="10000" /></Field>
        </Row>
      )}
      {!isSelfEmployed(p.employmentType) && (
        <Row cols={2}>
          <Field label="Employer Sick Pay"><TInput value={p.employerSickPay} onChange={sc("employerSickPay")} placeholder="e.g. Full pay" /></Field>
          <Field label="Sick Pay Duration"><TInput value={p.employerSickPayDuration} onChange={sc("employerSickPayDuration")} placeholder="e.g. 3 months" /></Field>
        </Row>
      )}
      {!isPartner && !isSelfEmployed(p.employmentType) && (
        <Row cols={1}>
          <Field label="Employee Benefits"><TTextarea value={p.employeeBenefits} onChange={sc("employeeBenefits")} placeholder="e.g. 4x salary death in service, group IP" /></Field>
        </Row>
      )}
      <Row cols={1}>
        <Field label="Health / Medical History"><TTextarea value={p.healthDetails} onChange={sc("healthDetails")} placeholder="e.g. Type 2 diabetes, well controlled. No other conditions." /></Field>
      </Row>
    </>;
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingBottom:80 }}>
      <div style={{ background:"linear-gradient(135deg,#6366f1,#4f46e5)", padding:"20px 20px 16px" }}>
        <p style={{ fontSize:20, fontWeight:700, color:"#fff", margin:0, letterSpacing:"-0.01em" }}>Protection Advice Tool</p>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.75)", margin:"2px 0 0 0" }}>Complete the fact-find, then generate advice</p>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"16px 16px" }}>

        <SectionCard icon="👤" title="Client Details">
          <PersonSection p={client} sc={sc} age={clientAge} spa={clientSPA} bmi={cBMI} band={cBand} isPartner={false} />
        </SectionCard>

        <SectionCard icon="👥" title="Partner / Second Life">
          <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, color:C.textMuted, marginBottom:hasPartner?20:0 }}>
            <input type="checkbox" checked={hasPartner} onChange={e=>setHasPartner(e.target.checked)} style={{width:16,height:16}} />
            Include a partner / second life on this case
          </label>
          {hasPartner && <PersonSection p={partner} sc={sp} age={partnerAge} spa={partnerSPA} bmi={pBMI} band={pBand} isPartner={true} />}
        </SectionCard>

        <SectionCard icon="👶" title="Dependant Children">
          <Row cols={2}>
            <Field label="Number of children">
              <TSelect value={numChildren} onChange={handleNumChildren}>
                {[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>{n===0?"None":n}</option>)}
              </TSelect>
            </Field>
            <div/>
          </Row>
          {childAges.map((age,i) => (
            <Row key={i} cols={2}>
              <Field label={`Child ${i+1} — Age (years)`}>
                <TInput type="number" value={age} onChange={v=>setChildAges(p=>p.map((a,idx)=>idx===i?v:a))} placeholder="e.g. 5" />
              </Field>
              <div/>
            </Row>
          ))}
        </SectionCard>

        <SectionCard icon="🏠" title="Mortgage(s)">
          {mortgages.map((m,i) => (
            <SubCard key={i}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:13,fontWeight:600,color:C.textMuted}}>Mortgage {i+1}</span>
                {mortgages.length>1 && <RemoveBtn onClick={()=>setMortgages(p=>p.filter((_,idx)=>idx!==i))} />}
              </div>
              <Row cols={1}><Field label="Outstanding Balance (£)"><TInput type="number" value={m.balance} onChange={um(i,"balance")} placeholder="250000" /></Field></Row>
              <Row cols={2}>
                <Field label="Remaining Term (years)"><TInput type="number" value={m.term} onChange={um(i,"term")} placeholder="25" /></Field>
                <Field label="Monthly Payment (£)"><TInput type="number" value={m.monthlyPayment} onChange={um(i,"monthlyPayment")} placeholder="1200" /></Field>
              </Row>
              <Row cols={2}>
                <Field label="Repayment Type"><TSelect value={m.type} onChange={um(i,"type")}><option value="repayment">Repayment</option><option value="interest_only">Interest Only</option><option value="part_and_part">Part & Part</option></TSelect></Field>
                <Field label="Purpose"><TSelect value={m.purpose} onChange={um(i,"purpose")}><option value="residential">Residential</option><option value="btl">Buy to Let</option><option value="commercial">Commercial</option></TSelect></Field>
              </Row>
            </SubCard>
          ))}
          <AddBtn onClick={()=>setMortgages(p=>[...p,{...BM}])} label="Add another mortgage" />
        </SectionCard>

        <SectionCard icon="🛡️" title="Existing Cover">
          {cover.map((c,i) => (
            <SubCard key={i}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:13,fontWeight:600,color:C.textMuted}}>Policy {i+1}</span>
                <RemoveBtn onClick={()=>setCover(p=>p.filter((_,idx)=>idx!==i))} />
              </div>
              <Row cols={1}><Field label="Cover Type"><TSelect value={c.type} onChange={ux(i,"type")}><option value="">Select…</option><option>Decreasing Life Insurance</option><option>Level Life Insurance</option><option>Critical Illness Cover</option><option>Income Protection</option><option>Family Income Benefit</option><option>Whole of Life</option><option>Other</option></TSelect></Field></Row>
              <Row cols={2}>
                <Field label="Provider"><TInput value={c.provider} onChange={ux(i,"provider")} placeholder="Aviva" /></Field>
                <Field label="Basis"><TSelect value={c.basis} onChange={ux(i,"basis")}><option value="single">Single life</option><option value="joint">Joint life</option></TSelect></Field>
              </Row>
              <Row cols={3}>
                <Field label="Sum Assured (£)"><TInput type="number" value={c.amount} onChange={ux(i,"amount")} placeholder="200000" /></Field>
                <Field label="Term (yrs)"><TInput type="number" value={c.term} onChange={ux(i,"term")} placeholder="20" /></Field>
                <Field label="Premium (£/mo)"><TInput type="number" value={c.premium} onChange={ux(i,"premium")} placeholder="45" /></Field>
              </Row>
            </SubCard>
          ))}
          <AddBtn onClick={()=>setCover(p=>[...p,{...BX}])} label="Add existing policy" />
        </SectionCard>

        {(lifeFlag||ipFlag||pLifeFlag||(cBand&&cBand.flag!=="ok")||(pBand&&pBand.flag!=="ok")) && (
          <SectionCard icon="⚡" title="Live Underwriting Flags">
            {lifeFlag && <FlagRow label={`${client.firstName||"Client"} — Life cover (£${totalLife.toLocaleString()})`} badge={lifeFlag.label} color={FLAG_COLOURS[lifeFlag.level]} />}
            {pLifeFlag && <FlagRow label={`${partner.firstName||"Partner"} — Life cover (£${totalLife.toLocaleString()})`} badge={pLifeFlag.label} color={FLAG_COLOURS[pLifeFlag.level]} />}
            {ipFlag && <FlagRow label={`${client.firstName||"Client"} — IP (£${monthIP.toLocaleString()}/month)`} badge={ipFlag.label} color={FLAG_COLOURS[ipFlag.level]} />}
            {cBand && cBMI && cBand.flag!=="ok" && <FlagRow label={`${client.firstName||"Client"} — BMI ${cBMI.toFixed(1)} (${cBand.label})`} badge={cBand.note} color={FLAG_COLOURS[cBand.flag]} />}
            {pBand && pBMI && hasPartner && pBand.flag!=="ok" && <FlagRow label={`${partner.firstName||"Partner"} — BMI ${pBMI.toFixed(1)} (${pBand.label})`} badge={pBand.note} color={FLAG_COLOURS[pBand.flag]} />}
          </SectionCard>
        )}

        <button style={{ background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", borderRadius:14, color:"#fff", fontSize:16, fontWeight:700, padding:"18px", cursor:"pointer", width:"100%", marginTop:4, opacity:loading?0.75:1, letterSpacing:"-0.01em", boxShadow:"0 4px 14px rgba(99,102,241,0.35)" }} onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating advice…" : "⚡  Generate Protection Advice"}
        </button>

        {loading && <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:28,color:C.textMuted,fontSize:14}}><span style={{fontSize:18,display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>Analysing fact-find…</div>}
        {error && <div style={{background:C.danger,border:"1px solid #fca5a5",borderRadius:12,padding:16,color:C.dangerText,fontSize:13,marginTop:16}}>{error}</div>}
        {result && (
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:24,marginTop:20,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <p style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:16,marginTop:0}}>Protection Advice Output</p>
            <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"0 0 16px 0"}} />
            <pre style={{fontSize:14,lineHeight:1.85,color:C.text,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{result}</pre>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}select option{background:#fff}*{box-sizing:border-box}input[type=number]::-webkit-inner-spin-button{opacity:0}`}</style>
    </div>
  );
}

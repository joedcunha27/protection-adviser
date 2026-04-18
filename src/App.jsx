import { useState, useCallback } from “react”;

const ANTHROPIC_MODEL = “claude-sonnet-4-20250514”;

const UW_LIMITS = {
life: [
{ ageMax: 39, noEvidenceLimit: 1500000, gpqLimit: 2000000, gprLimit: 3000000 },
{ ageMax: 49, noEvidenceLimit: 1000000, gpqLimit: 1500000, gprLimit: 2500000 },
{ ageMax: 59, noEvidenceLimit: 750000,  gpqLimit: 1000000, gprLimit: 2000000 },
{ ageMax: 69, noEvidenceLimit: 500000,  gpqLimit: 750000,  gprLimit: 1500000 },
],
ip: [
{ ageMax: 39, noEvidenceLimit: 6250,  tmiLimit: 10000 },
{ ageMax: 49, noEvidenceLimit: 2500,  tmiLimit: 6250  },
{ ageMax: 99, noEvidenceLimit: 2000,  tmiLimit: 5000  },
],
};

const BMI_RATINGS = [
{ min: 0,    max: 17.4, label: “Very Underweight”, flag: “decline”,  note: “Likely decline or heavy loading.” },
{ min: 17.5, max: 19.9, label: “Underweight”,      flag: “warning”,  note: “Standard terms unlikely.” },
{ min: 20,   max: 32.4, label: “Normal / OK”,      flag: “ok”,       note: “Standard terms expected.” },
{ min: 32.5, max: 34.9, label: “Obese Class I”,    flag: “warning”,  note: “Loading possible — get pre-sale UW.” },
{ min: 35,   max: 37.4, label: “Obese Class II”,   flag: “warning”,  note: “Loading likely — pre-sale UW required.” },
{ min: 37.5, max: 999,  label: “Severely Obese”,   flag: “decline”,  note: “Decline likely, especially CI and IP.” },
];

const FLAG_COLOURS = { ok:”#22c55e”, warning:”#f59e0b”, decline:”#ef4444”, none:”#22c55e”, tmi:”#f59e0b”, gpq:”#f59e0b”, gpr:”#ef4444”, medical:”#ef4444”, nse:”#ef4444” };

function calcBMI(h, w) { if (!h || !w) return null; const m = h/100; return w/(m*m); }
function getBMIBand(bmi) { if (!bmi) return null; return BMI_RATINGS.find(b => bmi >= b.min && bmi <= b.max) || BMI_RATINGS[BMI_RATINGS.length-1]; }
function getAge(dob) {
if (!dob) return null;
const t = new Date(), b = new Date(dob);
let a = t.getFullYear() - b.getFullYear();
if (t.getMonth() - b.getMonth() < 0 || (t.getMonth()===b.getMonth() && t.getDate()<b.getDate())) a–;
return a;
}
function getUWFlag(type, age, amount) {
const limits = UW_LIMITS[type]; if (!limits) return null;
const band = limits.find(b => age <= b.ageMax) || limits[limits.length-1];
if (type === “ip”) {
if (amount <= band.noEvidenceLimit) return { level:“none”, label:“No automatic evidence required” };
if (amount <= band.tmiLimit) return { level:“tmi”, label:“Telephone medical interview likely” };
return { level:“nse”, label:“Nurse screening likely” };
}
if (amount <= band.noEvidenceLimit) return { level:“none”, label:“No automatic evidence required” };
if (amount <= band.gpqLimit) return { level:“gpq”, label:“GP questionnaire likely” };
if (amount <= band.gprLimit) return { level:“gpr”, label:“Full GP report likely” };
return { level:“medical”, label:“Full medical exam likely” };
}

// ── Stable primitive components — defined OUTSIDE the main component ──────────
// This is critical: defining these inside the main component causes React to
// remount them on every keystroke, which kills focus on mobile keyboards.

const iStyle = { background:”#111827”, border:“1px solid #2a3347”, borderRadius:8, color:”#f1f5f9”, padding:“10px 14px”, fontSize:14, outline:“none”, width:“100%”, boxSizing:“border-box”, fontFamily:“inherit” };
const taStyle = { …iStyle, minHeight:80, resize:“vertical” };
const lbStyle = { fontSize:12, fontWeight:600, color:”#94a3b8”, letterSpacing:“0.04em”, marginBottom:6, display:“block” };

function Field({ label, children }) {
return <div style={{ display:“flex”, flexDirection:“column”, gap:4 }}><label style={lbStyle}>{label}</label>{children}</div>;
}
function TInput({ value, onChange, type=“text”, placeholder=”” }) {
return <input style={iStyle} value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} />;
}
function TSelect({ value, onChange, children }) {
return <select style={iStyle} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}
function TTextarea({ value, onChange, placeholder=”” }) {
return <textarea style={taStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}
function Badge({ color, children }) {
return <span style={{ display:“inline-flex”, alignItems:“center”, background:color+“22”, border:`1px solid ${color}55`, color, borderRadius:6, padding:“3px 10px”, fontSize:12, fontWeight:600, whiteSpace:“nowrap” }}>{children}</span>;
}
function FlagRow({ label, badge, color }) {
return (
<div style={{ display:“flex”, alignItems:“center”, justifyContent:“space-between”, flexWrap:“wrap”, gap:8, padding:“10px 14px”, background:”#111827”, borderRadius:8, marginBottom:8, fontSize:13 }}>
<span>{label}</span><Badge color={color}>{badge}</Badge>
</div>
);
}

const sec = { background:”#1a2133”, border:“1px solid #2a3347”, borderRadius:12, padding:24, marginBottom:20 };
const secH = { fontSize:13, fontWeight:700, letterSpacing:“0.08em”, textTransform:“uppercase”, color:”#3b82f6”, marginBottom:20, marginTop:0 };
const g2 = { display:“grid”, gridTemplateColumns:“1fr 1fr”, gap:16 };
const g3 = { display:“grid”, gridTemplateColumns:“1fr 1fr 1fr”, gap:16 };
const addBtn = { background:“transparent”, border:“1px dashed #3b82f6”, color:”#3b82f6”, borderRadius:8, padding:“8px 16px”, fontSize:13, cursor:“pointer”, marginTop:8 };
const delBtn = { background:“transparent”, border:“none”, color:”#ef4444”, cursor:“pointer”, fontSize:20, padding:“0 4px”, lineHeight:1 };

const BC = { firstName:””, lastName:””, dob:””, gender:””, maritalStatus:””, smoker:“no”, heightCm:””, weightKg:””, occupation:””, employmentType:“employed”, grossIncome:””, takeHomePay:””, totalOutgoings:””, savings:””, healthDetails:””, employerSickPay:””, employerSickPayDuration:””, employeeBenefits:”” };
const BP = { firstName:””, dob:””, gender:””, smoker:“no”, heightCm:””, weightKg:””, occupation:””, employmentType:“employed”, grossIncome:””, takeHomePay:””, healthDetails:””, employerSickPay:””, employerSickPayDuration:”” };
const BM = { balance:””, term:””, monthlyPayment:””, type:“repayment”, purpose:“residential” };
const BX = { type:””, provider:””, amount:””, term:””, premium:””, basis:“single” };

export default function App() {
const [client, setClient] = useState({…BC});
const [partner, setPartner] = useState({…BP});
const [hasPartner, setHasPartner] = useState(false);
const [children, setChildren] = useState([]);
const [mortgages, setMortgages] = useState([{…BM}]);
const [cover, setCover] = useState([]);
const [loading, setLoading] = useState(false);
const [result, setResult] = useState(null);
const [error, setError] = useState(null);

// useCallback ensures these handler factories are stable across renders
const sc = useCallback((k) => (v) => setClient(p => ({…p, [k]:v})), []);
const sp = useCallback((k) => (v) => setPartner(p => ({…p, [k]:v})), []);
const um = useCallback((i,k) => (v) => setMortgages(p => p.map((m,idx) => idx===i ? {…m,[k]:v} : m)), []);
const ux = useCallback((i,k) => (v) => setCover(p => p.map((c,idx) => idx===i ? {…c,[k]:v} : c)), []);
const uc = useCallback((i) => (v) => setChildren(p => p.map((c,idx) => idx===i ? {…c,dob:v} : c)), []);

const cAge = getAge(client.dob);
const pAge = getAge(partner.dob);
const cBMI = calcBMI(parseFloat(client.heightCm), parseFloat(client.weightKg));
const pBMI = calcBMI(parseFloat(partner.heightCm), parseFloat(partner.weightKg));
const cBand = getBMIBand(cBMI);
const pBand = getBMIBand(pBMI);
const totalLife = mortgages.reduce((s,m) => s+(parseFloat(m.balance)||0), 0);
const monthIP = parseFloat(client.takeHomePay)||0;
const lifeFlag = cAge && totalLife ? getUWFlag(“life”, cAge, totalLife) : null;
const ipFlag = cAge && monthIP ? getUWFlag(“ip”, cAge, monthIP) : null;
const pLifeFlag = pAge && totalLife && hasPartner ? getUWFlag(“life”, pAge, totalLife) : null;

function buildPrompt() {
const kids = children.map((c,i)=>`Child ${i+1}: DOB ${c.dob}${getAge(c.dob)!==null?` (age ${getAge(c.dob)})`:""}`) .join(”; “)||“None”;
const morts = mortgages.map((m,i)=>`Mortgage ${i+1}: £${m.balance} outstanding, ${m.term} years remaining, £${m.monthlyPayment}/month, ${m.type}, ${m.purpose}`).join(”\n”)||“None”;
const existing = cover.map((c,i)=>`${i+1}. ${c.type} (${c.basis}) – ${c.provider}, £${c.amount}, ${c.term} yrs remaining, £${c.premium}/month`).join(”\n”)||“None”;
const cb = cBMI ? ` | BMI: ${cBMI.toFixed(1)} (${cBand?.label})` : “”;
const pb = pBMI ? ` | BMI: ${pBMI.toFixed(1)} (${pBand?.label})` : “”;
return `You are an expert UK protection insurance adviser assistant. Analyse this fact-find and respond with exactly four sections:

1. RECOMMENDATION
   What protection products this client needs, cover amounts, terms, and plain-English reasoning. Do not recommend specific insurers or prices.
1. EXISTING COVER ASSESSMENT
   Assess each existing policy for adequacy, gaps, and whether it needs replacing. If none, state “No existing cover.”
1. UNDERWRITING QUESTIONS
   Specific questions the adviser should ask the client based on any health disclosures, BMI, occupation, or lifestyle risks — to prepare for pre-sale underwriting.
1. UNDERWRITING FLAGS
   Direct flags for any factors likely to cause loadings, exclusions, postponement or decline.

Logic rules:

- Repayment mortgage → decreasing term life matching balance and term
- Interest-only mortgage → level term life
- IP deferred period should match when employer sick pay ends
- IP amount = net monthly income minus ongoing sick pay
- FIB where dependent children exist; term to youngest reaching age 21
- Always recommend CIC; level term preferred
- Flag if sum assured likely to require GPQ, GPR or medical

-----

CLIENT: ${client.firstName} ${client.lastName} | DOB: ${client.dob} (Age: ${cAge??‘unknown’}) | Gender: ${client.gender} | Marital: ${client.maritalStatus} | Smoker: ${client.smoker}
Height: ${client.heightCm}cm | Weight: ${client.weightKg}kg${cb}
Occupation: ${client.occupation} (${client.employmentType}) | Gross: £${client.grossIncome}/yr | Take-home: £${client.takeHomePay}/month
Outgoings: £${client.totalOutgoings}/month | Savings: £${client.savings}
Sick pay: ${client.employerSickPay||‘unknown’} for ${client.employerSickPayDuration||‘unknown’}
Benefits: ${client.employeeBenefits||‘None’}
Health: ${client.healthDetails||‘Nothing disclosed’}

${hasPartner?`PARTNER: ${partner.firstName} | DOB: ${partner.dob} (Age: ${pAge??'unknown'}) | Gender: ${partner.gender} | Smoker: ${partner.smoker} Height: ${partner.heightCm}cm | Weight: ${partner.weightKg}kg${pb} Occupation: ${partner.occupation} (${partner.employmentType}) | Gross: £${partner.grossIncome}/yr | Take-home: £${partner.takeHomePay}/month Sick pay: ${partner.employerSickPay||'unknown'} for ${partner.employerSickPayDuration||'unknown'} Health: ${partner.healthDetails||'Nothing disclosed'}`:‘PARTNER: None’}

DEPENDANTS: ${kids}
MORTGAGES:\n${morts}
EXISTING COVER:\n${existing}
—`;
}

async function handleGenerate() {
setLoading(true); setError(null); setResult(null);
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method:“POST”, headers:{“Content-Type”:“application/json”},
body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:1000, messages:[{role:“user”,content:buildPrompt()}] }),
});
const data = await res.json();
setResult(data.content?.find(b=>b.type===“text”)?.text || “No response received.”);
} catch(e) {
setError(“Failed to generate advice. Please check your connection and try again.”);
} finally { setLoading(false); }
}

return (
<div style={{ minHeight:“100vh”, background:”#0f1117”, color:”#e2e8f0”, fontFamily:”‘DM Sans’,‘Segoe UI’,sans-serif”, paddingBottom:80 }}>

```
  <div style={{ background:"linear-gradient(135deg,#1e2535,#151a27)", borderBottom:"1px solid #2a3347", padding:"24px 32px", display:"flex", alignItems:"center", gap:16 }}>
    <div style={{ width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff" }}>S</div>
    <div>
      <p style={{ fontSize:20,fontWeight:700,color:"#f1f5f9",margin:0 }}>Springtide Protection Adviser</p>
      <p style={{ fontSize:13,color:"#64748b",margin:0 }}>Fact-find to advice — live on-call tool</p>
    </div>
  </div>

  <div style={{ maxWidth:960,margin:"0 auto",padding:"32px 24px" }}>

    {/* CLIENT */}
    <div style={sec}>
      <p style={secH}>👤 Client Details</p>
      <div style={{...g3,marginBottom:16}}>
        <Field label="First Name"><TInput value={client.firstName} onChange={sc("firstName")} placeholder="John" /></Field>
        <Field label="Last Name"><TInput value={client.lastName} onChange={sc("lastName")} placeholder="Smith" /></Field>
        <Field label="Date of Birth"><TInput type="date" value={client.dob} onChange={sc("dob")} /></Field>
      </div>
      <div style={{...g3,marginBottom:16}}>
        <Field label="Gender"><TSelect value={client.gender} onChange={sc("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></TSelect></Field>
        <Field label="Marital Status"><TSelect value={client.maritalStatus} onChange={sc("maritalStatus")}><option value="">Select…</option><option>Single</option><option>Married</option><option>Cohabiting</option><option>Divorced</option><option>Widowed</option></TSelect></Field>
        <Field label="Smoker?"><TSelect value={client.smoker} onChange={sc("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></TSelect></Field>
      </div>
      <div style={{...g2,marginBottom:16}}>
        <Field label="Height (cm)"><TInput type="number" value={client.heightCm} onChange={sc("heightCm")} placeholder="175" /></Field>
        <Field label="Weight (kg)"><TInput type="number" value={client.weightKg} onChange={sc("weightKg")} placeholder="80" /></Field>
      </div>
      <div style={{...g2,marginBottom:16}}>
        <Field label="Occupation"><TInput value={client.occupation} onChange={sc("occupation")} placeholder="Software engineer" /></Field>
        <Field label="Employment Type"><TSelect value={client.employmentType} onChange={sc("employmentType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Company director</option><option value="contractor">Contractor</option></TSelect></Field>
      </div>
      <div style={{...g3,marginBottom:16}}>
        <Field label="Gross Income (£/year)"><TInput type="number" value={client.grossIncome} onChange={sc("grossIncome")} placeholder="50000" /></Field>
        <Field label="Take-home Pay (£/month)"><TInput type="number" value={client.takeHomePay} onChange={sc("takeHomePay")} placeholder="3200" /></Field>
        <Field label="Total Outgoings (£/month)"><TInput type="number" value={client.totalOutgoings} onChange={sc("totalOutgoings")} placeholder="2500" /></Field>
      </div>
      <div style={{...g2,marginBottom:16}}>
        <Field label="Savings (£)"><TInput type="number" value={client.savings} onChange={sc("savings")} placeholder="10000" /></Field>
        <div/>
      </div>
      <div style={{...g2,marginBottom:16}}>
        <Field label="Employer Sick Pay"><TInput value={client.employerSickPay} onChange={sc("employerSickPay")} placeholder="e.g. Full pay" /></Field>
        <Field label="Sick Pay Duration"><TInput value={client.employerSickPayDuration} onChange={sc("employerSickPayDuration")} placeholder="e.g. 3 months full, then SSP" /></Field>
      </div>
      <div style={{marginBottom:16}}><Field label="Employee Benefits"><TTextarea value={client.employeeBenefits} onChange={sc("employeeBenefits")} placeholder="e.g. 4x salary death in service, group IP to 2 years" /></Field></div>
      <Field label="Health Details / Medical History"><TTextarea value={client.healthDetails} onChange={sc("healthDetails")} placeholder="e.g. Type 2 diabetes diagnosed 2020, well controlled. No other conditions." /></Field>
    </div>

    {/* PARTNER */}
    <div style={sec}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:hasPartner?20:0 }}>
        <p style={{...secH,marginBottom:0}}>👥 Partner / Second Life</p>
        <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#94a3b8" }}>
          <input type="checkbox" checked={hasPartner} onChange={e=>setHasPartner(e.target.checked)} /> Include partner
        </label>
      </div>
      {hasPartner && <>
        <div style={{...g3,marginBottom:16}}>
          <Field label="First Name"><TInput value={partner.firstName} onChange={sp("firstName")} placeholder="Jane" /></Field>
          <Field label="Date of Birth"><TInput type="date" value={partner.dob} onChange={sp("dob")} /></Field>
          <Field label="Gender"><TSelect value={partner.gender} onChange={sp("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></TSelect></Field>
        </div>
        <div style={{...g3,marginBottom:16}}>
          <Field label="Smoker?"><TSelect value={partner.smoker} onChange={sp("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></TSelect></Field>
          <Field label="Height (cm)"><TInput type="number" value={partner.heightCm} onChange={sp("heightCm")} placeholder="165" /></Field>
          <Field label="Weight (kg)"><TInput type="number" value={partner.weightKg} onChange={sp("weightKg")} placeholder="65" /></Field>
        </div>
        <div style={{...g2,marginBottom:16}}>
          <Field label="Occupation"><TInput value={partner.occupation} onChange={sp("occupation")} /></Field>
          <Field label="Employment Type"><TSelect value={partner.employmentType} onChange={sp("employmentType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Company director</option><option value="contractor">Contractor</option></TSelect></Field>
        </div>
        <div style={{...g3,marginBottom:16}}>
          <Field label="Gross Income (£/year)"><TInput type="number" value={partner.grossIncome} onChange={sp("grossIncome")} /></Field>
          <Field label="Take-home Pay (£/month)"><TInput type="number" value={partner.takeHomePay} onChange={sp("takeHomePay")} /></Field>
          <div/>
        </div>
        <div style={{...g2,marginBottom:16}}>
          <Field label="Employer Sick Pay"><TInput value={partner.employerSickPay} onChange={sp("employerSickPay")} /></Field>
          <Field label="Sick Pay Duration"><TInput value={partner.employerSickPayDuration} onChange={sp("employerSickPayDuration")} /></Field>
        </div>
        <Field label="Health Details / Medical History"><TTextarea value={partner.healthDetails} onChange={sp("healthDetails")} /></Field>
      </>}
    </div>

    {/* CHILDREN */}
    <div style={sec}>
      <p style={secH}>👶 Dependant Children</p>
      {children.map((c,i) => (
        <div key={i} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
          <div style={{flex:1}}><Field label={`Child ${i+1} — Date of Birth`}><TInput type="date" value={c.dob} onChange={uc(i)} /></Field></div>
          {getAge(c.dob)!==null && <span style={{fontSize:12,color:"#64748b",marginTop:18}}>Age {getAge(c.dob)}</span>}
          <button style={{...delBtn,marginTop:18}} onClick={()=>setChildren(p=>p.filter((_,idx)=>idx!==i))}>×</button>
        </div>
      ))}
      <button style={addBtn} onClick={()=>setChildren(p=>[...p,{dob:""}])}>+ Add child</button>
    </div>

    {/* MORTGAGES */}
    <div style={sec}>
      <p style={secH}>🏠 Mortgage(s)</p>
      {mortgages.map((m,i) => (
        <div key={i} style={{ background:"#111827",borderRadius:10,padding:16,marginBottom:12 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <span style={{fontSize:13,fontWeight:600,color:"#64748b"}}>Mortgage {i+1}</span>
            {mortgages.length>1 && <button style={delBtn} onClick={()=>setMortgages(p=>p.filter((_,idx)=>idx!==i))}>×</button>}
          </div>
          <div style={{...g3,marginBottom:12}}>
            <Field label="Outstanding Balance (£)"><TInput type="number" value={m.balance} onChange={um(i,"balance")} placeholder="250000" /></Field>
            <Field label="Remaining Term (years)"><TInput type="number" value={m.term} onChange={um(i,"term")} placeholder="25" /></Field>
            <Field label="Monthly Payment (£)"><TInput type="number" value={m.monthlyPayment} onChange={um(i,"monthlyPayment")} placeholder="1200" /></Field>
          </div>
          <div style={g2}>
            <Field label="Repayment Type"><TSelect value={m.type} onChange={um(i,"type")}><option value="repayment">Repayment</option><option value="interest_only">Interest Only</option><option value="part_and_part">Part & Part</option></TSelect></Field>
            <Field label="Purpose"><TSelect value={m.purpose} onChange={um(i,"purpose")}><option value="residential">Residential</option><option value="btl">Buy to Let</option><option value="commercial">Commercial</option></TSelect></Field>
          </div>
        </div>
      ))}
      <button style={addBtn} onClick={()=>setMortgages(p=>[...p,{...BM}])}>+ Add mortgage</button>
    </div>

    {/* EXISTING COVER */}
    <div style={sec}>
      <p style={secH}>🛡️ Existing Cover</p>
      {cover.map((c,i) => (
        <div key={i} style={{ background:"#111827",borderRadius:10,padding:16,marginBottom:12 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <span style={{fontSize:13,fontWeight:600,color:"#64748b"}}>Policy {i+1}</span>
            <button style={delBtn} onClick={()=>setCover(p=>p.filter((_,idx)=>idx!==i))}>×</button>
          </div>
          <div style={{...g3,marginBottom:12}}>
            <Field label="Cover Type"><TSelect value={c.type} onChange={ux(i,"type")}><option value="">Select…</option><option>Decreasing Life Insurance</option><option>Level Life Insurance</option><option>Critical Illness Cover</option><option>Income Protection</option><option>Family Income Benefit</option><option>Whole of Life</option><option>Other</option></TSelect></Field>
            <Field label="Provider"><TInput value={c.provider} onChange={ux(i,"provider")} placeholder="Aviva" /></Field>
            <Field label="Basis"><TSelect value={c.basis} onChange={ux(i,"basis")}><option value="single">Single life</option><option value="joint">Joint life</option></TSelect></Field>
          </div>
          <div style={g3}>
            <Field label="Sum Assured / Benefit (£)"><TInput type="number" value={c.amount} onChange={ux(i,"amount")} placeholder="200000" /></Field>
            <Field label="Remaining Term (years)"><TInput type="number" value={c.term} onChange={ux(i,"term")} placeholder="20" /></Field>
            <Field label="Monthly Premium (£)"><TInput type="number" value={c.premium} onChange={ux(i,"premium")} placeholder="45" /></Field>
          </div>
        </div>
      ))}
      <button style={addBtn} onClick={()=>setCover(p=>[...p,{...BX}])}>+ Add existing policy</button>
    </div>

    {/* LIVE UW FLAGS */}
    {(lifeFlag||ipFlag||pLifeFlag||cBand||pBand) && (
      <div style={sec}>
        <p style={secH}>⚡ Live Underwriting Flags</p>
        {lifeFlag && <FlagRow label={`${client.firstName||"Client"} — Life (£${totalLife.toLocaleString()})`} badge={lifeFlag.label} color={FLAG_COLOURS[lifeFlag.level]} />}
        {pLifeFlag && <FlagRow label={`${partner.firstName||"Partner"} — Life (£${totalLife.toLocaleString()})`} badge={pLifeFlag.label} color={FLAG_COLOURS[pLifeFlag.level]} />}
        {ipFlag && <FlagRow label={`${client.firstName||"Client"} — IP (£${monthIP.toLocaleString()}/month)`} badge={ipFlag.label} color={FLAG_COLOURS[ipFlag.level]} />}
        {cBand && cBMI && <FlagRow label={`${client.firstName||"Client"} — BMI ${cBMI.toFixed(1)} (${cBand.label})`} badge={cBand.note} color={FLAG_COLOURS[cBand.flag]} />}
        {pBand && pBMI && hasPartner && <FlagRow label={`${partner.firstName||"Partner"} — BMI ${pBMI.toFixed(1)} (${pBand.label})`} badge={pBand.note} color={FLAG_COLOURS[pBand.flag]} />}
      </div>
    )}

    {/* GENERATE */}
    <button style={{ background:"linear-gradient(135deg,#3b82f6,#6366f1)",border:"none",borderRadius:10,color:"#fff",fontSize:16,fontWeight:700,padding:"16px 40px",cursor:"pointer",width:"100%",marginTop:8,opacity:loading?0.7:1 }} onClick={handleGenerate} disabled={loading}>
      {loading ? "Generating advice…" : "⚡ Generate Protection Advice"}
    </button>

    {loading && <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:12,padding:32,color:"#64748b",fontSize:14 }}><span style={{fontSize:20,display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>Analysing fact-find…</div>}
    {error && <div style={{ background:"#2d0a0a",border:"1px solid #7f1d1d",borderRadius:8,padding:16,color:"#fca5a5",fontSize:13,marginTop:16 }}>{error}</div>}
    {result && (
      <div style={{ background:"#0d1520",border:"1px solid #2a3347",borderRadius:12,padding:28,marginTop:24 }}>
        <p style={{ fontSize:16,fontWeight:700,color:"#f1f5f9",marginBottom:16,marginTop:0 }}>Protection Advice Output</p>
        <hr style={{ border:"none",borderTop:"1px solid #2a3347",margin:"0 0 20px 0" }} />
        <pre style={{ fontSize:14,lineHeight:1.8,color:"#cbd5e1",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0 }}>{result}</pre>
      </div>
    )}
  </div>

  <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)}select option{background:#111827}*{box-sizing:border-box}`}</style>
</div>
```

);
}

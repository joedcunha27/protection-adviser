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

const FLAG_COLOURS = { ok:"#22c55e", warning:"#f59e0b", decline:"#ef4444", none:"#22c55e", tmi:"#f59e0b", gpq:"#f59e0b", gpr:"#ef4444", medical:"#ef4444", nse:"#ef4444" };

function calcBMI(h, w) { if (!h || !w) return null; const m = h/100; return w/(m*m); }
function getBMIBand(bmi) { if (!bmi) return null; return BMI_RATINGS.find(b => bmi >= b.min && bmi <= b.max) || BMI_RATINGS[BMI_RATINGS.length-1]; }

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

const iStyle = { background:"#111827", border:"1px solid #2a3347", borderRadius:8, color:"#f1f5f9", padding:"10px 14px", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
const taStyle = { ...iStyle, minHeight:80, resize:"vertical" };
const lbStyle = { fontSize:12, fontWeight:600, color:"#94a3b8", letterSpacing:"0.04em", marginBottom:6, display:"block" };

function Field({ label, children }) {
  return <div style={{ display:"flex", flexDirection:"column", gap:4 }}><label style={lbStyle}>{label}</label>{children}</div>;
}
function TInput({ value, onChange, type="text", placeholder="", maxLength, inputRef }) {
  return <input ref={inputRef} style={iStyle} value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} maxLength={maxLength} />;
}
function TSelect({ value, onChange, children }) {
  return <select style={iStyle} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}
function TTextarea({ value, onChange, placeholder="" }) {
  return <textarea style={taStyle} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}
function Badge({ color, children }) {
  return <span style={{ display:"inline-flex", alignItems:"center", background:color+"22", border:`1px solid ${color}55`, color, borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{children}</span>;
}
function FlagRow({ label, badge, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, padding:"10px 14px", background:"#111827", borderRadius:8, marginBottom:8, fontSize:13 }}>
      <span>{label}</span><Badge color={color}>{badge}</Badge>
    </div>
  );
}

// DOB input — three boxes, auto-advances on completion
function DOBInput({ day, month, year, onDay, onMonth, onYear }) {
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const small = { ...iStyle, textAlign:"center", padding:"10px 4px" };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr", gap:8 }}>
      <div>
        <label style={lbStyle}>Day</label>
        <input style={small} value={day} placeholder="DD" maxLength={2} type="number"
          onChange={e => { const v = e.target.value; onDay(v); if (v.length === 2) monthRef.current && monthRef.current.focus(); }} />
      </div>
      <div>
        <label style={lbStyle}>Month</label>
        <input ref={monthRef} style={small} value={month} placeholder="MM" maxLength={2} type="number"
          onChange={e => { const v = e.target.value; onMonth(v); if (v.length === 2) yearRef.current && yearRef.current.focus(); }} />
      </div>
      <div>
        <label style={lbStyle}>Year</label>
        <input ref={yearRef} style={iStyle} value={year} placeholder="YYYY" maxLength={4} type="number"
          onChange={e => onYear(e.target.value)} />
      </div>
    </div>
  );
}

const sec = { background:"#1a2133", border:"1px solid #2a3347", borderRadius:12, padding:24, marginBottom:20 };
const secH = { fontSize:13, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#3b82f6", marginBottom:20, marginTop:0 };
const g2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 };
const g3 = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 };
const addBtn = { background:"transparent", border:"1px dashed #3b82f6", color:"#3b82f6", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", marginTop:8 };
const delBtn = { background:"transparent", border:"none", color:"#ef4444", cursor:"pointer", fontSize:20, padding:"0 4px", lineHeight:1 };

const BC = { firstName:"", lastName:"", dobDay:"", dobMonth:"", dobYear:"", gender:"", maritalStatus:"", smoker:"no", heightCm:"", weightKg:"", occupation:"", employmentType:"employed", grossIncome:"", takeHomePay:"", totalOutgoings:"", savings:"", healthDetails:"", employerSickPay:"", employerSickPayDuration:"", employeeBenefits:"" };
const BP = { firstName:"", dobDay:"", dobMonth:"", dobYear:"", gender:"", smoker:"no", heightCm:"", weightKg:"", occupation:"", employmentType:"employed", grossIncome:"", takeHomePay:"", healthDetails:"", employerSickPay:"", employerSickPayDuration:"" };
const BM = { balance:"", term:"", monthlyPayment:"", type:"repayment", purpose:"residential" };
const BX = { type:"", provider:"", amount:"", term:"", premium:"", basis:"single" };

const isSelfEmployed = (t) => t === "self_employed" || t === "director" || t === "contractor";

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

  const sc = useCallback((k) => (v) => setClient(p => ({...p, [k]:v})), []);
  const sp = useCallback((k) => (v) => setPartner(p => ({...p, [k]:v})), []);
  const um = useCallback((i,k) => (v) => setMortgages(p => p.map((m,idx) => idx===i ? {...m,[k]:v} : m)), []);
  const ux = useCallback((i,k) => (v) => setCover(p => p.map((c,idx) => idx===i ? {...c,[k]:v} : c)), []);

  const clientAge = dobToAge(client.dobDay, client.dobMonth, client.dobYear);
  const partnerAge = dobToAge(partner.dobDay, partner.dobMonth, partner.dobYear);
  const cBMI = calcBMI(parseFloat(client.heightCm), parseFloat(client.weightKg));
  const pBMI = calcBMI(parseFloat(partner.heightCm), parseFloat(partner.weightKg));
  const cBand = getBMIBand(cBMI);
  const pBand = getBMIBand(pBMI);
  const totalLife = mortgages.reduce((s,m) => s+(parseFloat(m.balance)||0), 0);
  const monthIP = parseFloat(client.takeHomePay)||0;
  const lifeFlag = clientAge && totalLife ? getUWFlag("life", clientAge, totalLife) : null;
  const ipFlag = clientAge && monthIP ? getUWFlag("ip", clientAge, monthIP) : null;
  const pLifeFlag = partnerAge && totalLife && hasPartner ? getUWFlag("life", partnerAge, totalLife) : null;

  function handleNumChildren(n) {
    const num = parseInt(n) || 0;
    setNumChildren(num);
    setChildAges(prev => {
      const arr = [...prev];
      while (arr.length < num) arr.push("");
      return arr.slice(0, num);
    });
  }

  function buildPrompt() {
    const clientDOB = dobString(client.dobDay, client.dobMonth, client.dobYear);
    const partnerDOB = dobString(partner.dobDay, partner.dobMonth, partner.dobYear);
    const kids = numChildren > 0 ? `${numChildren} child(ren), ages: ${childAges.map((a,i)=>`Child ${i+1}: ${a} years`).join(", ")}` : "None";
    const morts = mortgages.map((m,i)=>`Mortgage ${i+1}: £${m.balance} outstanding, ${m.term} years remaining, £${m.monthlyPayment}/month, ${m.type}, ${m.purpose}`).join("\n")||"None";
    const existing = cover.map((c,i)=>`${i+1}. ${c.type} (${c.basis}) - ${c.provider}, £${c.amount}, ${c.term} yrs remaining, £${c.premium}/month`).join("\n")||"None";
    const cb = cBMI ? ` | BMI: ${cBMI.toFixed(1)} (${cBand?.label})` : "";
    const pb = pBMI ? ` | BMI: ${pBMI.toFixed(1)} (${pBand?.label})` : "";
    const cSickInfo = isSelfEmployed(client.employmentType) ? "Self-employed / no employer sick pay" : `Sick pay: ${client.employerSickPay||"unknown"} for ${client.employerSickPayDuration||"unknown"}`;
    const pSickInfo = hasPartner ? (isSelfEmployed(partner.employmentType) ? "Self-employed / no employer sick pay" : `Sick pay: ${partner.employerSickPay||"unknown"} for ${partner.employerSickPayDuration||"unknown"}`) : "";

    return `You are an expert UK protection insurance adviser assistant. Analyse this fact-find and respond with exactly four clearly labelled sections.

ADVICE LOGIC RULES - follow these precisely:

LIFE INSURANCE:
- If mortgage exists: primary need is to pay off mortgage if either person dies. Start there.
- After mortgage cleared, calculate remaining household outgoings (total outgoings minus mortgage payment).
- Check if surviving partner's income alone covers remaining outgoings.
- If shortfall exists, recommend Family Income Benefit for that shortfall amount per person.
- If no mortgage and renting: use FIB based on total outgoings including rent.
- If client is single with no dependants: do NOT recommend a standalone life insurance policy. CIC only (plus IP).

INCOME PROTECTION:
- Cover = net monthly take-home pay (minus any ongoing employer sick pay after deferred period).
- Deferred period logic:
  * Self-employed or no sick pay + manual/trade occupation = 1 month deferred
  * Self-employed or no sick pay + white collar/office occupation + good savings (3+ months outgoings) = 3 months deferred
  * Self-employed or no sick pay + white collar/office occupation + low savings = 1 month deferred
  * Employed with sick pay: deferred period matches when sick pay ends
- Always recommend own-occupation full-term IP (to state pension age), not 2-year payment period.

CRITICAL ILLNESS COVER:
- Default recommendation: 12 months net income per person, level term.
- Always recommend regardless of other cover.

FAMILY INCOME BENEFIT:
- Recommend where dependent children exist.
- Term = years until youngest child reaches age 21.
- Amount = monthly shortfall after surviving partner's income covers outgoings.

SINGLE / NO DEPENDANTS:
- No standalone life insurance recommendation.
- Focus on IP and CIC.

---
Respond with these four sections:

1. RECOMMENDATION
What to put in place, amounts, terms, clear reasoning per product.

2. EXISTING COVER ASSESSMENT
Assess each existing policy. Gaps, what to replace, what to keep. If none: state "No existing cover."

3. UNDERWRITING QUESTIONS
Specific questions to ask based on health, BMI, occupation, lifestyle disclosures.

4. UNDERWRITING FLAGS
Direct flags for anything likely to cause loadings, exclusions, postponement or decline.

---
CLIENT: ${client.firstName} ${client.lastName} | DOB: ${clientDOB} (Age: ${clientAge??'unknown'}) | Gender: ${client.gender} | Marital: ${client.maritalStatus} | Smoker: ${client.smoker}
Height: ${client.heightCm}cm | Weight: ${client.weightKg}kg${cb}
Occupation: ${client.occupation} (${client.employmentType}) | Gross: £${client.grossIncome}/yr | Take-home: £${client.takeHomePay}/month
Total outgoings: £${client.totalOutgoings}/month | Savings: £${client.savings}
${cSickInfo}
Benefits: ${client.employeeBenefits||'None'}
Health: ${client.healthDetails||'Nothing disclosed'}

${hasPartner ? `PARTNER: ${partner.firstName} | DOB: ${partnerDOB} (Age: ${partnerAge??'unknown'}) | Gender: ${partner.gender} | Smoker: ${partner.smoker}
Height: ${partner.heightCm}cm | Weight: ${partner.weightKg}kg${pb}
Occupation: ${partner.occupation} (${partner.employmentType}) | Gross: £${partner.grossIncome}/yr | Take-home: £${partner.takeHomePay}/month
${pSickInfo}
Health: ${partner.healthDetails||'Nothing disclosed'}` : 'PARTNER: None / single'}

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
      if (data.error) { setError(data.error); return; }
      setResult(data.content?.find(b=>b.type==="text")?.text || "No response received.");
    } catch(e) {
      setError("Failed to generate advice. Please check your connection and try again.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0f1117", color:"#e2e8f0", fontFamily:"'DM Sans','Segoe UI',sans-serif", paddingBottom:80 }}>

      <div style={{ background:"linear-gradient(135deg,#1e2535,#151a27)", borderBottom:"1px solid #2a3347", padding:"20px 24px" }}>
        <p style={{ fontSize:18, fontWeight:700, color:"#f1f5f9", margin:0 }}>Protection Advice Tool</p>
        <p style={{ fontSize:13, color:"#64748b", margin:0 }}>Fact-find to advice</p>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>

        {/* CLIENT */}
        <div style={sec}>
          <p style={secH}>👤 Client Details</p>
          <div style={{...g2, marginBottom:16}}>
            <Field label="First Name"><TInput value={client.firstName} onChange={sc("firstName")} placeholder="John" /></Field>
            <Field label="Last Name"><TInput value={client.lastName} onChange={sc("lastName")} placeholder="Smith" /></Field>
          </div>
          <div style={{marginBottom:16}}>
            <DOBInput day={client.dobDay} month={client.dobMonth} year={client.dobYear}
              onDay={sc("dobDay")} onMonth={sc("dobMonth")} onYear={sc("dobYear")} />
            {clientAge !== null && <p style={{fontSize:12,color:"#64748b",margin:"6px 0 0 0"}}>Age: {clientAge}</p>}
          </div>
          <div style={{...g3, marginBottom:16}}>
            <Field label="Gender"><TSelect value={client.gender} onChange={sc("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></TSelect></Field>
            <Field label="Marital Status"><TSelect value={client.maritalStatus} onChange={sc("maritalStatus")}><option value="">Select…</option><option>Single</option><option>Married</option><option>Cohabiting</option><option>Divorced</option><option>Widowed</option></TSelect></Field>
            <Field label="Smoker?"><TSelect value={client.smoker} onChange={sc("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></TSelect></Field>
          </div>
          <div style={{...g2, marginBottom:16}}>
            <Field label="Height (cm)"><TInput type="number" value={client.heightCm} onChange={sc("heightCm")} placeholder="175" /></Field>
            <Field label="Weight (kg)"><TInput type="number" value={client.weightKg} onChange={sc("weightKg")} placeholder="80" /></Field>
          </div>
          <div style={{...g2, marginBottom:16}}>
            <Field label="Occupation"><TInput value={client.occupation} onChange={sc("occupation")} placeholder="e.g. Plumber" /></Field>
            <Field label="Employment Type"><TSelect value={client.employmentType} onChange={sc("employmentType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></TSelect></Field>
          </div>
          <div style={{...g3, marginBottom:16}}>
            <Field label="Gross Income (£/yr)"><TInput type="number" value={client.grossIncome} onChange={sc("grossIncome")} placeholder="50000" /></Field>
            <Field label="Take-home Pay (£/month)"><TInput type="number" value={client.takeHomePay} onChange={sc("takeHomePay")} placeholder="3200" /></Field>
            <Field label="Total Outgoings (£/month)"><TInput type="number" value={client.totalOutgoings} onChange={sc("totalOutgoings")} placeholder="2500" /></Field>
          </div>
          <div style={{...g2, marginBottom:16}}>
            <Field label="Savings (£)"><TInput type="number" value={client.savings} onChange={sc("savings")} placeholder="10000" /></Field>
            <div/>
          </div>
          {!isSelfEmployed(client.employmentType) && (
            <div style={{...g2, marginBottom:16}}>
              <Field label="Employer Sick Pay"><TInput value={client.employerSickPay} onChange={sc("employerSickPay")} placeholder="e.g. Full pay" /></Field>
              <Field label="Sick Pay Duration"><TInput value={client.employerSickPayDuration} onChange={sc("employerSickPayDuration")} placeholder="e.g. 3 months full, then SSP" /></Field>
            </div>
          )}
          <div style={{marginBottom:16}}>
            <Field label="Employee Benefits (death in service, group IP, etc.)">
              <TTextarea value={client.employeeBenefits} onChange={sc("employeeBenefits")} placeholder="e.g. 4x salary death in service" />
            </Field>
          </div>
          <Field label="Health Details / Medical History">
            <TTextarea value={client.healthDetails} onChange={sc("healthDetails")} placeholder="e.g. Type 2 diabetes, well controlled. No other conditions." />
          </Field>
        </div>

        {/* PARTNER */}
        <div style={sec}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:hasPartner?20:0 }}>
            <p style={{...secH, marginBottom:0}}>👥 Partner / Second Life</p>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"#94a3b8" }}>
              <input type="checkbox" checked={hasPartner} onChange={e=>setHasPartner(e.target.checked)} /> Include partner
            </label>
          </div>
          {hasPartner && <>
            <div style={{...g2, marginBottom:16}}>
              <Field label="First Name"><TInput value={partner.firstName} onChange={sp("firstName")} placeholder="Jane" /></Field>
              <div/>
            </div>
            <div style={{marginBottom:16}}>
              <DOBInput day={partner.dobDay} month={partner.dobMonth} year={partner.dobYear}
                onDay={sp("dobDay")} onMonth={sp("dobMonth")} onYear={sp("dobYear")} />
              {partnerAge !== null && <p style={{fontSize:12,color:"#64748b",margin:"6px 0 0 0"}}>Age: {partnerAge}</p>}
            </div>
            <div style={{...g3, marginBottom:16}}>
              <Field label="Gender"><TSelect value={partner.gender} onChange={sp("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></TSelect></Field>
              <Field label="Smoker?"><TSelect value={partner.smoker} onChange={sp("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></TSelect></Field>
              <div/>
            </div>
            <div style={{...g2, marginBottom:16}}>
              <Field label="Height (cm)"><TInput type="number" value={partner.heightCm} onChange={sp("heightCm")} placeholder="165" /></Field>
              <Field label="Weight (kg)"><TInput type="number" value={partner.weightKg} onChange={sp("weightKg")} placeholder="65" /></Field>
            </div>
            <div style={{...g2, marginBottom:16}}>
              <Field label="Occupation"><TInput value={partner.occupation} onChange={sp("occupation")} /></Field>
              <Field label="Employment Type"><TSelect value={partner.employmentType} onChange={sp("employmentType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></TSelect></Field>
            </div>
            <div style={{...g3, marginBottom:16}}>
              <Field label="Gross Income (£/yr)"><TInput type="number" value={partner.grossIncome} onChange={sp("grossIncome")} /></Field>
              <Field label="Take-home Pay (£/month)"><TInput type="number" value={partner.takeHomePay} onChange={sp("takeHomePay")} /></Field>
              <div/>
            </div>
            {!isSelfEmployed(partner.employmentType) && (
              <div style={{...g2, marginBottom:16}}>
                <Field label="Employer Sick Pay"><TInput value={partner.employerSickPay} onChange={sp("employerSickPay")} /></Field>
                <Field label="Sick Pay Duration"><TInput value={partner.employerSickPayDuration} onChange={sp("employerSickPayDuration")} /></Field>
              </div>
            )}
            <Field label="Health Details / Medical History">
              <TTextarea value={partner.healthDetails} onChange={sp("healthDetails")} />
            </Field>
          </>}
        </div>

        {/* CHILDREN */}
        <div style={sec}>
          <p style={secH}>👶 Dependant Children</p>
          <div style={{...g2, marginBottom: numChildren > 0 ? 16 : 0}}>
            <Field label="Number of children">
              <TSelect value={numChildren} onChange={handleNumChildren}>
                {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
              </TSelect>
            </Field>
            <div/>
          </div>
          {childAges.map((age, i) => (
            <div key={i} style={{...g2, marginBottom:12}}>
              <Field label={`Child ${i+1} age (years)`}>
                <TInput type="number" value={age} onChange={v => setChildAges(p => p.map((a,idx) => idx===i ? v : a))} placeholder="e.g. 5" />
              </Field>
              <div/>
            </div>
          ))}
        </div>

        {/* MORTGAGES */}
        <div style={sec}>
          <p style={secH}>🏠 Mortgage(s)</p>
          {mortgages.map((m,i) => (
            <div key={i} style={{ background:"#111827", borderRadius:10, padding:16, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{fontSize:13,fontWeight:600,color:"#64748b"}}>Mortgage {i+1}</span>
                {mortgages.length>1 && <button style={delBtn} onClick={()=>setMortgages(p=>p.filter((_,idx)=>idx!==i))}>×</button>}
              </div>
              <div style={{...g3, marginBottom:12}}>
                <Field label="Outstanding Balance (£)"><TInput type="number" value={m.balance} onChange={um(i,"balance")} placeholder="250000" /></Field>
                <Field label="Remaining Term (yrs)"><TInput type="number" value={m.term} onChange={um(i,"term")} placeholder="25" /></Field>
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
            <div key={i} style={{ background:"#111827", borderRadius:10, padding:16, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{fontSize:13,fontWeight:600,color:"#64748b"}}>Policy {i+1}</span>
                <button style={delBtn} onClick={()=>setCover(p=>p.filter((_,idx)=>idx!==i))}>×</button>
              </div>
              <div style={{...g3, marginBottom:12}}>
                <Field label="Cover Type"><TSelect value={c.type} onChange={ux(i,"type")}><option value="">Select…</option><option>Decreasing Life Insurance</option><option>Level Life Insurance</option><option>Critical Illness Cover</option><option>Income Protection</option><option>Family Income Benefit</option><option>Whole of Life</option><option>Other</option></TSelect></Field>
                <Field label="Provider"><TInput value={c.provider} onChange={ux(i,"provider")} placeholder="Aviva" /></Field>
                <Field label="Basis"><TSelect value={c.basis} onChange={ux(i,"basis")}><option value="single">Single life</option><option value="joint">Joint life</option></TSelect></Field>
              </div>
              <div style={g3}>
                <Field label="Sum Assured / Benefit (£)"><TInput type="number" value={c.amount} onChange={ux(i,"amount")} placeholder="200000" /></Field>
                <Field label="Remaining Term (yrs)"><TInput type="number" value={c.term} onChange={ux(i,"term")} placeholder="20" /></Field>
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
        <button style={{ background:"linear-gradient(135deg,#3b82f6,#6366f1)", border:"none", borderRadius:10, color:"#fff", fontSize:16, fontWeight:700, padding:"16px 40px", cursor:"pointer", width:"100%", marginTop:8, opacity:loading?0.7:1 }} onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating advice…" : "⚡ Generate Protection Advice"}
        </button>

        {loading && <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:32, color:"#64748b", fontSize:14 }}><span style={{fontSize:20,display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>Analysing fact-find…</div>}
        {error && <div style={{ background:"#2d0a0a", border:"1px solid #7f1d1d", borderRadius:8, padding:16, color:"#fca5a5", fontSize:13, marginTop:16 }}>{error}</div>}
        {result && (
          <div style={{ background:"#0d1520", border:"1px solid #2a3347", borderRadius:12, padding:28, marginTop:24 }}>
            <p style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:16, marginTop:0 }}>Protection Advice Output</p>
            <hr style={{ border:"none", borderTop:"1px solid #2a3347", margin:"0 0 20px 0" }} />
            <pre style={{ fontSize:14, lineHeight:1.8, color:"#cbd5e1", whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 }}>{result}</pre>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}select option{background:#111827}*{box-sizing:border-box}`}</style>
    </div>
  );
}

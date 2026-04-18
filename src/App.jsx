import { useState, useRef } from "react";

const MODEL = "claude-sonnet-4-5";

const UW_LIMITS = {
  life: [
    { ageMax: 39, noEvidence: 1500000, gpq: 2000000, gpr: 3000000 },
    { ageMax: 49, noEvidence: 1000000, gpq: 1500000, gpr: 2500000 },
    { ageMax: 59, noEvidence: 750000,  gpq: 1000000, gpr: 2000000 },
    { ageMax: 69, noEvidence: 500000,  gpq: 750000,  gpr: 1500000 },
  ],
  ip: [
    { ageMax: 39, noEvidence: 6250,  tmi: 10000 },
    { ageMax: 49, noEvidence: 2500,  tmi: 6250  },
    { ageMax: 99, noEvidence: 2000,  tmi: 5000  },
  ],
};

const BMI_BANDS = [
  { min: 0,    max: 17.4, label: "Very Underweight", flag: "red",    note: "Likely decline or heavy loading." },
  { min: 17.5, max: 19.9, label: "Underweight",      flag: "amber",  note: "Standard terms unlikely." },
  { min: 20,   max: 32.4, label: "Normal",            flag: "green",  note: "Standard terms expected." },
  { min: 32.5, max: 34.9, label: "Obese Class I",    flag: "amber",  note: "Loading possible — get pre-sale UW." },
  { min: 35,   max: 37.4, label: "Obese Class II",   flag: "amber",  note: "Loading likely — pre-sale UW required." },
  { min: 37.5, max: 999,  label: "Severely Obese",   flag: "red",    note: "Decline likely, especially CI and IP." },
];

const FC = { green: "#16a34a", amber: "#d97706", red: "#dc2626" };
const UWC = { none: "#16a34a", gpq: "#d97706", gpr: "#dc2626", medical: "#dc2626", tmi: "#d97706", nse: "#dc2626" };

function bmi(hCm, wKg) {
  if (!hCm || !wKg) return null;
  const h = parseFloat(hCm) / 100;
  const w = parseFloat(wKg);
  if (!h || !w) return null;
  return w / (h * h);
}

function bmiBand(b) {
  if (!b) return null;
  return BMI_BANDS.find(x => b >= x.min && b <= x.max) || BMI_BANDS[BMI_BANDS.length - 1];
}

function age(day, month, year) {
  if (!day || !month || !year || year.length < 4) return null;
  const t = new Date(), b = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(b.getTime())) return null;
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}

function uwFlag(type, personAge, amount) {
  const limits = UW_LIMITS[type];
  if (!limits || !personAge || !amount) return null;
  const band = limits.find(b => personAge <= b.ageMax) || limits[limits.length - 1];
  if (type === "ip") {
    if (amount <= band.noEvidence) return { level: "none", label: "No automatic evidence required" };
    if (amount <= band.tmi) return { level: "tmi", label: "Telephone medical interview likely" };
    return { level: "nse", label: "Nurse screening likely" };
  }
  if (amount <= band.noEvidence) return { level: "none", label: "No automatic evidence required" };
  if (amount <= band.gpq) return { level: "gpq", label: "GP questionnaire likely" };
  if (amount <= band.gpr) return { level: "gpr", label: "Full GP report likely" };
  return { level: "medical", label: "Full medical exam likely" };
}

function isSE(t) { return t === "self_employed" || t === "director" || t === "contractor"; }

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:    { minHeight: "100vh", background: "#f1f5f9", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingBottom: 60 },
  header:  { background: "linear-gradient(135deg,#6366f1,#4f46e5)", padding: "20px 20px 18px" },
  h1:      { fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 },
  h1sub:   { fontSize: 13, color: "rgba(255,255,255,0.72)", margin: "3px 0 0 0" },
  wrap:    { maxWidth: 640, margin: "0 auto", padding: "16px 14px" },
  card:    { background: "#fff", borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardH:   { fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6366f1", margin: "0 0 18px 0" },
  lbl:     { fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 5, display: "block" },
  inp:     { background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, color: "#1e293b", padding: "11px 13px", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit", WebkitAppearance: "none", appearance: "none" },
  row2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  row1:    { marginBottom: 12 },
  sub:     { background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 10 },
  subH:    { fontSize: 13, fontWeight: 600, color: "#64748b", margin: "0 0 12px 0" },
  addBtn:  { background: "transparent", border: "1.5px dashed #6366f1", color: "#6366f1", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 4 },
  remBtn:  { background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  genBtn:  { background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: 18, cursor: "pointer", width: "100%", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" },
  flag:    (c) => ({ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "11px 13px", background: c + "10", borderLeft: "3px solid " + c, borderRadius: 8, marginBottom: 8, fontSize: 13 }),
  badge:   (c) => ({ background: c + "15", border: "1px solid " + c + "40", color: c, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }),
  ageTag:  { fontSize: 12, color: "#6366f1", fontWeight: 600, margin: "5px 0 0 0" },
  bmiTag:  (c) => ({ fontSize: 12, fontWeight: 600, color: FC[c] || "#64748b", margin: "5px 0 0 0" }),
  chk:     { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#475569" },
  out:     { background: "#fff", borderRadius: 16, padding: 22, marginTop: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  outH:    { fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 14px 0" },
  pre:     { fontSize: 14, lineHeight: 1.85, color: "#334155", whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 },
  err:     { background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: 14, color: "#dc2626", fontSize: 13, marginTop: 14 },
  spin:    { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 28, color: "#94a3b8", fontSize: 14 },
};

// ── These components are defined OUTSIDE App — critical for keyboard stability ──

function Inp({ value, onChange, type, placeholder, iref }) {
  return <input ref={iref} style={S.inp} value={value} onChange={e => onChange(e.target.value)} type={type || "text"} placeholder={placeholder || ""} />;
}

function Sel({ value, onChange, children }) {
  return <select style={{ ...S.inp, cursor: "pointer" }} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}

function Ta({ value, onChange, placeholder }) {
  return <textarea style={{ ...S.inp, minHeight: 76, resize: "vertical" }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""} />;
}

function Lbl({ text }) { return <label style={S.lbl}>{text}</label>; }

function F({ label, children, mb }) {
  return <div style={{ marginBottom: mb !== undefined ? mb : 12 }}><Lbl text={label} />{children}</div>;
}

function DOB({ d, m, y, od, om, oy }) {
  const mref = useRef(null);
  const yref = useRef(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8 }}>
      <div>
        <Lbl text="Day" />
        <input style={{ ...S.inp, textAlign: "center" }} value={d} placeholder="DD" type="number" maxLength={2}
          onChange={e => { od(e.target.value); if (e.target.value.length === 2) mref.current && mref.current.focus(); }} />
      </div>
      <div>
        <Lbl text="Month" />
        <input ref={mref} style={{ ...S.inp, textAlign: "center" }} value={m} placeholder="MM" type="number" maxLength={2}
          onChange={e => { om(e.target.value); if (e.target.value.length === 2) yref.current && yref.current.focus(); }} />
      </div>
      <div>
        <Lbl text="Year" />
        <input ref={yref} style={S.inp} value={y} placeholder="YYYY" type="number" maxLength={4} onChange={e => oy(e.target.value)} />
      </div>
    </div>
  );
}

function FlagRow({ label, badge, color }) {
  return (
    <div style={S.flag(color)}>
      <span>{label}</span>
      <span style={S.badge(color)}>{badge}</span>
    </div>
  );
}

// ── Blank state templates ─────────────────────────────────────────────────────
const BC = { firstName: "", lastName: "", dobD: "", dobM: "", dobY: "", gender: "", marital: "", smoker: "no", hCm: "", wKg: "", occ: "", empType: "employed", gross: "", takehome: "", outgoings: "", savings: "", sickPay: "", sickDur: "", benefits: "", health: "" };
const BP = { firstName: "", dobD: "", dobM: "", dobY: "", gender: "", smoker: "no", hCm: "", wKg: "", occ: "", empType: "employed", gross: "", takehome: "", sickPay: "", sickDur: "", health: "" };
const BM = { balance: "", term: "", payment: "", type: "repayment", purpose: "residential" };
const BX = { type: "", provider: "", amount: "", term: "", premium: "", basis: "single" };

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [C, setC] = useState({ ...BC });
  const [P, setP] = useState({ ...BP });
  const [hasP, setHasP] = useState(false);
  const [numKids, setNumKids] = useState(0);
  const [kidAges, setKidAges] = useState([]);
  const [mortgages, setMortgages] = useState([{ ...BM }]);
  const [cover, setCover] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Individual stable setters for client
  const sc = (k) => (v) => setC(p => ({ ...p, [k]: v }));
  const sp = (k) => (v) => setP(p => ({ ...p, [k]: v }));

  function setKids(n) {
    const num = parseInt(n) || 0;
    setNumKids(num);
    setKidAges(prev => { const a = [...prev]; while (a.length < num) a.push(""); return a.slice(0, num); });
  }

  const cAge = age(C.dobD, C.dobM, C.dobY);
  const pAge = age(P.dobD, P.dobM, P.dobY);
  const cBMI = bmi(C.hCm, C.wKg);
  const pBMI = bmi(P.hCm, P.wKg);
  const cBand = bmiBand(cBMI);
  const pBand = bmiBand(pBMI);
  const totalMortgage = mortgages.reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
  const cIP = parseFloat(C.takehome) || 0;
  const lifeFlag = cAge && totalMortgage ? uwFlag("life", cAge, totalMortgage) : null;
  const pLifeFlag = hasP && pAge && totalMortgage ? uwFlag("life", pAge, totalMortgage) : null;
  const ipFlag = cAge && cIP ? uwFlag("ip", cAge, cIP) : null;

  function buildPrompt() {
    const kids = numKids > 0 ? `${numKids} child(ren): ${kidAges.map((a, i) => `Child ${i + 1} age ${a}`).join(", ")}` : "None";
    const morts = mortgages.map((m, i) => `Mortgage ${i + 1}: £${m.balance} outstanding, ${m.term} yrs, £${m.payment}/month, ${m.type}, ${m.purpose}`).join("\n") || "None";
    const existing = cover.map((x, i) => `${i + 1}. ${x.type} (${x.basis}) - ${x.provider}, £${x.amount}, ${x.term} yrs, £${x.premium}/month`).join("\n") || "None";
    const cSick = isSE(C.empType) ? "Self-employed / no employer sick pay" : `Sick pay: ${C.sickPay || "unknown"} for ${C.sickDur || "unknown"}`;
    const pSick = hasP ? (isSE(P.empType) ? "Self-employed / no employer sick pay" : `Sick pay: ${P.sickPay || "unknown"} for ${P.sickDur || "unknown"}`) : "";
    const cBen = isSE(C.empType) ? "N/A" : (C.benefits || "None");
    const cB = cBMI ? ` | BMI ${cBMI.toFixed(1)} (${cBand?.label})` : "";
    const pB = pBMI ? ` | BMI ${pBMI.toFixed(1)} (${pBand?.label})` : "";

    return `You are an expert UK protection insurance adviser. Analyse this fact-find and give exactly four sections.

RULES:
LIFE: If mortgage exists, primary goal = pay it off. Then check if surviving partner income covers remaining outgoings (total outgoings minus mortgage payment). If shortfall, recommend FIB for that monthly amount per person. No mortgage + renting = FIB based on total outgoings inc rent. Single, no dependants = NO standalone life cover. CIC and IP only.
IP: Cover = net take-home minus ongoing sick pay after deferral. Deferred period: SE/no sick pay + manual trade = 1 month. SE/no sick pay + white collar/office + savings >= 3 months outgoings = 3 months. SE/no sick pay + white collar + low savings = 1 month. Employed: deferral = when sick pay ends. Always full-term own-occupation to state pension age. Never 2-year.
CIC: Default 12 months net income per person, level term. Always recommend.
FIB: Where dependent children. Term = years until youngest reaches 21. Amount = monthly shortfall after surviving partner income covers outgoings.

OUTPUT SECTIONS:
1. RECOMMENDATION - products, amounts, terms, plain English reasoning per product
2. EXISTING COVER ASSESSMENT - assess each policy, gaps, replace or keep. If none: state no existing cover
3. UNDERWRITING QUESTIONS - specific questions based on health, BMI, occupation, lifestyle
4. UNDERWRITING FLAGS - direct flags for loadings, exclusions, postponement or decline

CLIENT: ${C.firstName} ${C.lastName} | DOB: ${C.dobD}/${C.dobM}/${C.dobY} (Age: ${cAge ?? "unknown"}) | Gender: ${C.gender} | Marital: ${C.marital} | Smoker: ${C.smoker}
Height: ${C.hCm}cm | Weight: ${C.wKg}kg${cB}
Occupation: ${C.occ} (${C.empType}) | Gross: £${C.gross}/yr | Take-home: £${C.takehome}/month
Outgoings: £${C.outgoings}/month | Savings: £${C.savings}
${cSick}
Benefits: ${cBen}
Health: ${C.health || "Nothing disclosed"}

${hasP ? `PARTNER: ${P.firstName} | DOB: ${P.dobD}/${P.dobM}/${P.dobY} (Age: ${pAge ?? "unknown"}) | Gender: ${P.gender} | Smoker: ${P.smoker}
Height: ${P.hCm}cm | Weight: ${P.wKg}kg${pB}
Occupation: ${P.occ} (${P.empType}) | Gross: £${P.gross}/yr | Take-home: £${P.takehome}/month
${pSick}
Health: ${P.health || "Nothing disclosed"}` : "PARTNER: None"}

DEPENDANTS: ${kids}
MORTGAGES:
${morts}
EXISTING COVER:
${existing}`;
  }

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: buildPrompt() }] }),
      });
      const data = await res.json();
      if (data.error) { setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error)); return; }
      setResult(data.content?.find(b => b.type === "text")?.text || "No response received.");
    } catch (e) {
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
            <F label="First Name" mb={0}><Inp value={C.firstName} onChange={sc("firstName")} placeholder="John" /></F>
            <F label="Last Name" mb={0}><Inp value={C.lastName} onChange={sc("lastName")} placeholder="Smith" /></F>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Lbl text="Date of Birth" />
            <DOB d={C.dobD} m={C.dobM} y={C.dobY} od={sc("dobD")} om={sc("dobM")} oy={sc("dobY")} />
            {cAge !== null && <p style={S.ageTag}>Age: {cAge}</p>}
          </div>
          <div style={S.row2}>
            <F label="Gender" mb={0}><Sel value={C.gender} onChange={sc("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F>
            <F label="Marital Status" mb={0}><Sel value={C.marital} onChange={sc("marital")}><option value="">Select…</option><option>Single</option><option>Married</option><option>Cohabiting</option><option>Divorced</option><option>Widowed</option></Sel></F>
          </div>
          <div style={S.row2}>
            <F label="Smoker Status" mb={0}><Sel value={C.smoker} onChange={sc("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F>
            <div />
          </div>
          <div style={S.row2}>
            <F label="Height (cm)" mb={0}><Inp type="number" value={C.hCm} onChange={sc("hCm")} placeholder="175" /></F>
            <F label="Weight (kg)" mb={0}><Inp type="number" value={C.wKg} onChange={sc("wKg")} placeholder="80" /></F>
          </div>
          {cBMI && <p style={S.bmiTag(cBand?.flag)}>BMI: {cBMI.toFixed(1)} — {cBand?.label}</p>}
          <div style={{ ...S.row1, marginTop: cBMI ? 8 : 0 }}>
            <F label="Occupation" mb={0}><Inp value={C.occ} onChange={sc("occ")} placeholder="e.g. Accountant, Plumber" /></F>
          </div>
          <div style={S.row1}>
            <F label="Employment Type" mb={0}><Sel value={C.empType} onChange={sc("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F>
          </div>
          <div style={S.row2}>
            <F label="Gross Income (£/yr)" mb={0}><Inp type="number" value={C.gross} onChange={sc("gross")} placeholder="50000" /></F>
            <F label="Take-home (£/month)" mb={0}><Inp type="number" value={C.takehome} onChange={sc("takehome")} placeholder="3200" /></F>
          </div>
          <div style={S.row2}>
            <F label="Total Outgoings (£/month)" mb={0}><Inp type="number" value={C.outgoings} onChange={sc("outgoings")} placeholder="2500" /></F>
            <F label="Savings (£)" mb={0}><Inp type="number" value={C.savings} onChange={sc("savings")} placeholder="10000" /></F>
          </div>
          {!isSE(C.empType) && (
            <div style={S.row2}>
              <F label="Employer Sick Pay" mb={0}><Inp value={C.sickPay} onChange={sc("sickPay")} placeholder="e.g. Full pay" /></F>
              <F label="Sick Pay Duration" mb={0}><Inp value={C.sickDur} onChange={sc("sickDur")} placeholder="e.g. 3 months" /></F>
            </div>
          )}
          {!isSE(C.empType) && (
            <div style={S.row1}>
              <F label="Employee Benefits" mb={0}><Ta value={C.benefits} onChange={sc("benefits")} placeholder="e.g. 4x salary death in service" /></F>
            </div>
          )}
          <div style={S.row1}>
            <F label="Health / Medical History" mb={0}><Ta value={C.health} onChange={sc("health")} placeholder="e.g. Type 2 diabetes, well controlled. No other conditions." /></F>
          </div>
        </div>

        {/* PARTNER */}
        <div style={S.card}>
          <p style={S.cardH}>👥 Partner / Second Life</p>
          <label style={{ ...S.chk, marginBottom: hasP ? 18 : 0 }}>
            <input type="checkbox" checked={hasP} onChange={e => setHasP(e.target.checked)} style={{ width: 16, height: 16 }} />
            Include a partner on this case
          </label>
          {hasP && <>
            <div style={{ ...S.row1, marginTop: 4 }}>
              <F label="First Name" mb={0}><Inp value={P.firstName} onChange={sp("firstName")} placeholder="Jane" /></F>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Lbl text="Date of Birth" />
              <DOB d={P.dobD} m={P.dobM} y={P.dobY} od={sp("dobD")} om={sp("dobM")} oy={sp("dobY")} />
              {pAge !== null && <p style={S.ageTag}>Age: {pAge}</p>}
            </div>
            <div style={S.row2}>
              <F label="Gender" mb={0}><Sel value={P.gender} onChange={sp("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F>
              <F label="Smoker Status" mb={0}><Sel value={P.smoker} onChange={sp("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F>
            </div>
            <div style={S.row2}>
              <F label="Height (cm)" mb={0}><Inp type="number" value={P.hCm} onChange={sp("hCm")} placeholder="165" /></F>
              <F label="Weight (kg)" mb={0}><Inp type="number" value={P.wKg} onChange={sp("wKg")} placeholder="65" /></F>
            </div>
            {pBMI && <p style={S.bmiTag(pBand?.flag)}>BMI: {pBMI.toFixed(1)} — {pBand?.label}</p>}
            <div style={{ ...S.row1, marginTop: pBMI ? 8 : 0 }}>
              <F label="Occupation" mb={0}><Inp value={P.occ} onChange={sp("occ")} placeholder="e.g. Teacher" /></F>
            </div>
            <div style={S.row1}>
              <F label="Employment Type" mb={0}><Sel value={P.empType} onChange={sp("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F>
            </div>
            <div style={S.row2}>
              <F label="Gross Income (£/yr)" mb={0}><Inp type="number" value={P.gross} onChange={sp("gross")} placeholder="35000" /></F>
              <F label="Take-home (£/month)" mb={0}><Inp type="number" value={P.takehome} onChange={sp("takehome")} placeholder="2400" /></F>
            </div>
            {!isSE(P.empType) && (
              <div style={S.row2}>
                <F label="Employer Sick Pay" mb={0}><Inp value={P.sickPay} onChange={sp("sickPay")} /></F>
                <F label="Sick Pay Duration" mb={0}><Inp value={P.sickDur} onChange={sp("sickDur")} /></F>
              </div>
            )}
            <div style={S.row1}>
              <F label="Health / Medical History" mb={0}><Ta value={P.health} onChange={sp("health")} placeholder="e.g. No issues disclosed." /></F>
            </div>
          </>}
        </div>

        {/* CHILDREN */}
        <div style={S.card}>
          <p style={S.cardH}>👶 Dependant Children</p>
          <div style={S.row2}>
            <F label="Number of children" mb={0}>
              <Sel value={numKids} onChange={setKids}>
                {[0, 1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 0 ? "None" : n}</option>)}
              </Sel>
            </F>
            <div />
          </div>
          {kidAges.map((a, i) => (
            <div key={i} style={S.row2}>
              <F label={`Child ${i + 1} — Age (years)`} mb={0}>
                <Inp type="number" value={a} onChange={v => setKidAges(p => p.map((x, idx) => idx === i ? v : x))} placeholder="e.g. 5" />
              </F>
              <div />
            </div>
          ))}
        </div>

        {/* MORTGAGES */}
        <div style={S.card}>
          <p style={S.cardH}>🏠 Mortgage(s)</p>
          {mortgages.map((m, i) => (
            <div key={i} style={S.sub}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={S.subH}>Mortgage {i + 1}</p>
                {mortgages.length > 1 && <button style={S.remBtn} onClick={() => setMortgages(p => p.filter((_, idx) => idx !== i))}>Remove</button>}
              </div>
              <div style={S.row1}><F label="Outstanding Balance (£)" mb={0}><Inp type="number" value={m.balance} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, balance: v } : x))} placeholder="250000" /></F></div>
              <div style={S.row2}>
                <F label="Remaining Term (yrs)" mb={0}><Inp type="number" value={m.term} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, term: v } : x))} placeholder="25" /></F>
                <F label="Monthly Payment (£)" mb={0}><Inp type="number" value={m.payment} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, payment: v } : x))} placeholder="1200" /></F>
              </div>
              <div style={S.row2}>
                <F label="Repayment Type" mb={0}><Sel value={m.type} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, type: v } : x))}><option value="repayment">Repayment</option><option value="interest_only">Interest Only</option><option value="part_and_part">Part & Part</option></Sel></F>
                <F label="Purpose" mb={0}><Sel value={m.purpose} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, purpose: v } : x))}><option value="residential">Residential</option><option value="btl">Buy to Let</option><option value="commercial">Commercial</option></Sel></F>
              </div>
            </div>
          ))}
          <button style={S.addBtn} onClick={() => setMortgages(p => [...p, { ...BM }])}>+ Add another mortgage</button>
        </div>

        {/* EXISTING COVER */}
        <div style={S.card}>
          <p style={S.cardH}>🛡️ Existing Cover</p>
          {cover.map((x, i) => (
            <div key={i} style={S.sub}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={S.subH}>Policy {i + 1}</p>
                <button style={S.remBtn} onClick={() => setCover(p => p.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
              <div style={S.row1}><F label="Cover Type" mb={0}><Sel value={x.type} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, type: v } : c))}><option value="">Select…</option><option>Decreasing Life Insurance</option><option>Level Life Insurance</option><option>Critical Illness Cover</option><option>Income Protection</option><option>Family Income Benefit</option><option>Whole of Life</option><option>Other</option></Sel></F></div>
              <div style={S.row2}>
                <F label="Provider" mb={0}><Inp value={x.provider} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, provider: v } : c))} placeholder="Aviva" /></F>
                <F label="Basis" mb={0}><Sel value={x.basis} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, basis: v } : c))}><option value="single">Single life</option><option value="joint">Joint life</option></Sel></F>
              </div>
              <div style={S.row2}>
                <F label="Sum Assured (£)" mb={0}><Inp type="number" value={x.amount} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, amount: v } : c))} placeholder="200000" /></F>
                <F label="Remaining Term (yrs)" mb={0}><Inp type="number" value={x.term} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, term: v } : c))} placeholder="20" /></F>
              </div>
              <div style={S.row1}><F label="Monthly Premium (£)" mb={0}><Inp type="number" value={x.premium} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, premium: v } : c))} placeholder="45" /></F></div>
            </div>
          ))}
          <button style={S.addBtn} onClick={() => setCover(p => [...p, { ...BX }])}>+ Add existing policy</button>
        </div>

        {/* LIVE UW FLAGS */}
        {(lifeFlag || pLifeFlag || ipFlag || (cBand && cBand.flag !== "green") || (pBand && pBand.flag !== "green" && hasP)) && (
          <div style={S.card}>
            <p style={S.cardH}>⚡ Live Underwriting Flags</p>
            {lifeFlag && <FlagRow label={`${C.firstName || "Client"} — Life (£${totalMortgage.toLocaleString()})`} badge={lifeFlag.label} color={UWC[lifeFlag.level]} />}
            {pLifeFlag && <FlagRow label={`${P.firstName || "Partner"} — Life (£${totalMortgage.toLocaleString()})`} badge={pLifeFlag.label} color={UWC[pLifeFlag.level]} />}
            {ipFlag && <FlagRow label={`${C.firstName || "Client"} — IP (£${cIP.toLocaleString()}/month)`} badge={ipFlag.label} color={UWC[ipFlag.level]} />}
            {cBand && cBand.flag !== "green" && cBMI && <FlagRow label={`${C.firstName || "Client"} — BMI ${cBMI.toFixed(1)} (${cBand.label})`} badge={cBand.note} color={FC[cBand.flag]} />}
            {pBand && pBand.flag !== "green" && pBMI && hasP && <FlagRow label={`${P.firstName || "Partner"} — BMI ${pBMI.toFixed(1)} (${pBand.label})`} badge={pBand.note} color={FC[pBand.flag]} />}
          </div>
        )}

        {/* GENERATE */}
        <button style={S.genBtn} onClick={generate} disabled={loading}>
          {loading ? "Generating advice…" : "⚡  Generate Protection Advice"}
        </button>

        {loading && <div style={S.spin}><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Analysing and generating advice…</div>}
        {error && <div style={S.err}>{error}</div>}
        {result && (
          <div style={S.out}>
            <p style={S.outH}>Protection Advice Output</p>
            <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 16px 0" }} />
            <pre style={S.pre}>{result}</pre>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}select option{background:#fff}`}</style>
    </div>
  );
}

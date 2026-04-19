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
    { ageMax: 39, noEvidence: 6250, tmi: 10000 },
    { ageMax: 49, noEvidence: 2500, tmi: 6250  },
    { ageMax: 99, noEvidence: 2000, tmi: 5000  },
  ],
};

const BMI_BANDS = [
  { min: 0,    max: 17.4, label: "Very Underweight", flag: "red",   note: "Likely decline or heavy loading." },
  { min: 17.5, max: 19.9, label: "Underweight",      flag: "amber", note: "Standard terms unlikely." },
  { min: 20,   max: 32.4, label: "Normal",            flag: "green", note: "Standard terms expected." },
  { min: 32.5, max: 34.9, label: "Obese Class I",    flag: "amber", note: "Loading possible — get pre-sale UW." },
  { min: 35,   max: 37.4, label: "Obese Class II",   flag: "amber", note: "Loading likely — pre-sale UW required." },
  { min: 37.5, max: 999,  label: "Severely Obese",   flag: "red",   note: "Decline likely, especially CI and IP." },
];

const FC = { green: "#16a34a", amber: "#d97706", red: "#dc2626" };
const UWC = { none: "#16a34a", gpq: "#d97706", gpr: "#dc2626", medical: "#dc2626", tmi: "#d97706", nse: "#dc2626" };

function calcBMI(hCm, wKg) {
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
  const apr1960 = new Date(1960, 3, 6);
  const apr1977 = new Date(1977, 3, 6);
  if (dob < apr1960) return 66;
  if (dob < apr1977) return 67;
  return 68;
}
function getUWFlag(type, personAge, amount) {
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
function ftInToCm(ft, inches) {
  return ((parseFloat(ft) || 0) * 12 + (parseFloat(inches) || 0)) * 2.54;
}
function stLbsToKg(st, lbs) {
  return ((parseFloat(st) || 0) * 14 + (parseFloat(lbs) || 0)) * 0.453592;
}
function getHcm(p) { return p.hUnit === "metric" ? parseFloat(p.hCm) : ftInToCm(p.hFt, p.hIn); }
function getWkg(p) { return p.wUnit === "metric" ? parseFloat(p.wKg) : stLbsToKg(p.wSt, p.wLbs); }
function heightStr(p) { return p.hUnit === "metric" ? `${p.hCm}cm` : `${p.hFt}ft ${p.hIn}in (${ftInToCm(p.hFt, p.hIn).toFixed(1)}cm)`; }
function weightStr(p) { return p.wUnit === "metric" ? `${p.wKg}kg` : `${p.wSt}st ${p.wLbs}lbs (${stLbsToKg(p.wSt, p.wLbs).toFixed(1)}kg)`; }

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
  togWrap: { display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #e2e8f0", marginBottom: 8, width: "fit-content" },
  togOn:   { background: "#6366f1", color: "#fff", border: "none", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  togOff:  { background: "#f8fafc", color: "#64748b", border: "none", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  flag:    (c) => ({ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "11px 13px", background: c + "10", borderLeft: "3px solid " + c, borderRadius: 8, marginBottom: 8, fontSize: 13 }),
  badge:   (c) => ({ background: c + "15", border: "1px solid " + c + "40", color: c, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }),
  ageTag:  { fontSize: 12, color: "#6366f1", fontWeight: 600, margin: "5px 0 8px 0" },
  bmiTag:  (c) => ({ fontSize: 12, fontWeight: 600, color: FC[c] || "#64748b", margin: "5px 0 8px 0" }),
  chk:     { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#475569" },
  out:     { background: "#fff", borderRadius: 16, padding: 22, marginTop: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  outH:    { fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 14px 0" },
  pre:     { fontSize: 14, lineHeight: 1.85, color: "#334155", whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 },
  err:     { background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: 14, color: "#dc2626", fontSize: 13, marginTop: 14 },
  spin:    { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 28, color: "#94a3b8", fontSize: 14 },
};

// ── ALL components defined outside App — critical for keyboard stability ───────
function Inp({ value, onChange, type, placeholder }) {
  return <input style={S.inp} value={value} onChange={e => onChange(e.target.value)} type={type || "text"} placeholder={placeholder || ""} />;
}
function Sel({ value, onChange, children }) {
  return <select style={{ ...S.inp, cursor: "pointer" }} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}
function Ta({ value, onChange, placeholder }) {
  return <textarea style={{ ...S.inp, minHeight: 76, resize: "vertical" }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""} />;
}
function Lbl({ text }) { return <label style={S.lbl}>{text}</label>; }
function F({ label, children }) {
  return <div><Lbl text={label} />{children}</div>;
}
function FlagRow({ label, badge, color }) {
  return (
    <div style={S.flag(color)}>
      <span>{label}</span>
      <span style={S.badge(color)}>{badge}</span>
    </div>
  );
}
// Unit toggle — takes two stable onClick handlers, no factories
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8 }}>
      <div>
        <Lbl text="Day" />
        <input style={{ ...S.inp, textAlign: "center" }} value={d} placeholder="DD" type="number"
          onChange={e => { od(e.target.value); if (e.target.value.length === 2) mref.current && mref.current.focus(); }} />
      </div>
      <div>
        <Lbl text="Month" />
        <input ref={mref} style={{ ...S.inp, textAlign: "center" }} value={m} placeholder="MM" type="number"
          onChange={e => { om(e.target.value); if (e.target.value.length === 2) yref.current && yref.current.focus(); }} />
      </div>
      <div>
        <Lbl text="Year" />
        <input ref={yref} style={S.inp} value={y} placeholder="YYYY" type="number" onChange={e => oy(e.target.value)} />
      </div>
    </div>
  );
}

// ── Blank state ───────────────────────────────────────────────────────────────
const BC = { firstName: "", lastName: "", dobD: "", dobM: "", dobY: "", gender: "", marital: "", smoker: "no", hUnit: "metric", hCm: "", hFt: "", hIn: "", wUnit: "metric", wKg: "", wSt: "", wLbs: "", occ: "", empType: "employed", gross: "", takehome: "", outgoings: "", savings: "", sickPay: "", sickDur: "", benefits: "", health: "" };
const BP = { firstName: "", dobD: "", dobM: "", dobY: "", gender: "", smoker: "no", hUnit: "metric", hCm: "", hFt: "", hIn: "", wUnit: "metric", wKg: "", wSt: "", wLbs: "", occ: "", empType: "employed", gross: "", takehome: "", sickPay: "", sickDur: "", health: "" };
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

  // Individual setters — each is a stable function reference
  const setC_ = (k) => (v) => setC(p => ({ ...p, [k]: v }));
  const setP_ = (k) => (v) => setP(p => ({ ...p, [k]: v }));

  function setKids(n) {
    const num = parseInt(n) || 0;
    setNumKids(num);
    setKidAges(prev => { const a = [...prev]; while (a.length < num) a.push(""); return a.slice(0, num); });
  }

  // Derived values
  const cAge = calcAge(C.dobD, C.dobM, C.dobY);
  const pAge = calcAge(P.dobD, P.dobM, P.dobY);
  const cSPA = getStatePensionAge(C.dobD, C.dobM, C.dobY);
  const pSPA = getStatePensionAge(P.dobD, P.dobM, P.dobY);
  const cHcm = getHcm(C);
  const cWkg = getWkg(C);
  const pHcm = getHcm(P);
  const pWkg = getWkg(P);
  const cBMI = calcBMI(cHcm, cWkg);
  const pBMI = calcBMI(pHcm, pWkg);
  const cBand = bmiBand(cBMI);
  const pBand = bmiBand(pBMI);
  const totalMortgage = mortgages.reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
  const cIP = parseFloat(C.takehome) || 0;
  const lifeFlag = cAge && totalMortgage ? getUWFlag("life", cAge, totalMortgage) : null;
  const pLifeFlag = hasP && pAge && totalMortgage ? getUWFlag("life", pAge, totalMortgage) : null;
  const ipFlag = cAge && cIP ? getUWFlag("ip", cAge, cIP) : null;

  function buildPrompt() {
    const kids = numKids > 0 ? `${numKids} child(ren): ${kidAges.map((a, i) => `Child ${i + 1} age ${a}`).join(", ")}` : "None";
    const morts = mortgages.map((m, i) => `Mortgage ${i + 1}: £${m.balance} outstanding, ${m.term} yrs, £${m.payment}/month, ${m.type}, ${m.purpose}`).join("\n") || "None";
    const existing = cover.map((x, i) => `${i + 1}. ${x.type} (${x.basis}) - ${x.provider}, £${x.amount}, ${x.term} yrs, £${x.premium}/month`).join("\n") || "None";
    const cSick = isSE(C.empType) ? "Self-employed / no employer sick pay" : `Sick pay: ${C.sickPay || "unknown"} for ${C.sickDur || "unknown"}`;
    const pSick = hasP ? (isSE(P.empType) ? "Self-employed / no employer sick pay" : `Sick pay: ${P.sickPay || "unknown"} for ${P.sickDur || "unknown"}`) : "";
    const cBen = isSE(C.empType) ? "N/A" : (C.benefits || "None");
    const cB = cBMI ? ` | BMI ${cBMI.toFixed(1)} (${cBand?.label})` : "";
    const pB = pBMI ? ` | BMI ${pBMI.toFixed(1)} (${pBand?.label})` : "";

    return `You are Joe D'Cunha, an experienced UK protection insurance adviser. Analyse the fact-find below and produce structured advice using the principles, rules, archetypes and output format defined here. Be specific, commercial and plain-English. Show your reasoning in the advice — do not hedge.

═══════════════════════════════════════════
CORE PHILOSOPHY (apply to every case)
═══════════════════════════════════════════
• Protect income first, mortgage second, legacy third. Income Protection is the most likely claim of any protection product — treat IP as the foundation, not the afterthought.
• Size every product by the specific purpose it serves (replace income, clear mortgage, replace household spend, protect children). Only compromise on size once the ideal stack is defined.
• Default to single-life policies on two lives (two separate policies) rather than joint-life. Two single policies pay out twice, survive divorce/separation, allow independent trust nomination, and are rarely more expensive than joint on modern quote engines.
• Put every Life and CIC policy in trust where there is a spouse, partner, dependant, or estate concern. Trust nomination is the default, not an upsell — flag it under the recommendation without waiting to be asked.
• Include Waiver of Premium on IP by default. Add on Life/CIC where budget allows.
• If budget is the binding constraint, cut cover in this order: CIC first, then Life term length (not sum assured), then FIB term, then IP last. IP is the last thing to be reduced.
• Triage disclosure risk upfront. If BMI >32.5, mental health history, musculoskeletal, diabetes, cancer history, complex GP history, or family CI under 60 — call out the loading/exclusion/decline risk and name the provider(s) most likely to offer best terms. Recommend pre-sale underwriting (disclosure to underwriter before application) where risk is material.
• Never recommend cancelling existing cover until replacement cover is on risk. Check existing policies for premium guarantees, conversion options, or indexation worth preserving before replacing.

═══════════════════════════════════════════
PRODUCT RULES (hard defaults)
═══════════════════════════════════════════
LIFE INSURANCE
• Mortgage present with a repayment element → Decreasing Term Assurance matched to balance, term and repayment basis. For interest-only or part-and-part balances, use Level Term instead of DTA.
• Single-life basis — one DTA per borrower, each on their own life. NEVER joint-life DTA as the default.
• After the mortgage is cleared, calculate remaining outgoings (total outgoings minus mortgage payment). If the surviving partner's net income alone does not cover those remaining outgoings, recommend Family Income Benefit per person equal to the monthly shortfall.
• No mortgage but renting with dependants → FIB based on total outgoings (including rent) per person.
• Single with no dependants and no estate need → NO standalone life insurance. Recommend CIC and IP only.
• Limited company directors / shareholders → Relevant Life Plan in preference to personal Life (corporation-tax deductible, no BIK). Always in trust.

CRITICAL ILLNESS COVER
• Default: 12 months net household income per person, Level Term.
• Term: matched to the longer of (mortgage end) and (youngest child reaches age 21). If no mortgage and no children, match to retirement / SPA.
• Single-life basis per person — NEVER joint-life CIC. Joint CIC pays once and ends; two single policies protect both lives.
• Include Children's CIC as a default enhancement where there are dependent children, unless client declines.
• Always recommend CIC. If client refuses, document the refusal under "Considered and ruled out".

INCOME PROTECTION
• Cover amount = net take-home pay, minus any sick pay that continues past the deferral period (rare; usually cover = full net take-home).
• Term: full term to State Pension Age (shown below). NEVER a 2-year or 5-year payment term.
• Basis: Own-occupation definition always. Never activities-of-daily-living or work-tasks.
• Deferred period logic:
   (1) Self-employed / no sick pay AND manual or trade occupation → 1-month deferred.
   (2) Self-employed / no sick pay AND white collar/office AND savings ≥ 3 months outgoings → 3-month deferred.
   (3) Self-employed / no sick pay AND white collar AND savings < 3 months outgoings → 1-month deferred.
   (4) Employed with employer sick pay → deferred period matches when sick pay ends (e.g. 3 months full sick pay → 3-month deferral; 6 months → 6; 12 months → 12).
• Top-up IP where client has strong employer Group PHI: size personal IP as excess over the Group benefit with deferred period matched to when employer cover ends.
• Waiver of Premium: included by default.
• Guaranteed premiums preferred over reviewable.

FAMILY INCOME BENEFIT
• Use wherever there are dependent children.
• Term: years until the youngest child reaches 21 (or 23 if university is mentioned).
• Amount: household monthly shortfall after the surviving partner's net income covers outgoings.
• Level benefit preferred unless client explicitly wants indexation and can afford the higher premium.

═══════════════════════════════════════════
CLIENT ARCHETYPE PLAYBOOK
═══════════════════════════════════════════
Identify which archetype the client best fits and apply the default stack (adapt to the case, don't blindly repeat):

• SINGLE, NO DEPENDANTS, WITH MORTGAGE → IP + CIC. No standalone Life unless estate/funeral purpose.
• SINGLE, NO DEPENDANTS, NO MORTGAGE → IP + CIC only.
• COUPLE, NO CHILDREN YET, WITH MORTGAGE → 2× DTA (single) matched to mortgage + 2× IP + CIC on the main earner (both if budget allows). Flag that the case should be reviewed on arrival of first child.
• FAMILY WITH MORTGAGE AND CHILDREN → 2× DTA to mortgage + 2× FIB (to youngest age 21) + 2× IP + 2× CIC with Children's CIC included.
• REMORTGAGE / PROTECTION REVIEW → Rebase term lengths to the new mortgage term. Never cancel existing cover before new cover is on risk. Check existing policies for guaranteed premiums / conversion options worth preserving.
• HIGH EARNER WITH STRONG EMPLOYER BENEFITS (DIS, Group PHI) → Top up Life where DIS is inadequate against mortgage + FIB need. IP structured as excess over Group PHI with deferral matched to when Group PHI ends. CIC still recommended personally — DIS does not pay on critical illness.
• LIMITED COMPANY DIRECTOR → Relevant Life Plan for personal life cover. Executive Income Protection where personal IP is uneconomic (Ltd dividend structures). Shareholder Protection where there is more than one shareholder. Key Person Cover where one individual drives the revenue.
• SELF-EMPLOYED / SOLE TRADER → IP is non-negotiable — 1-month deferred, own-occupation, to SPA. Layer CIC and Life per dependants/mortgage.
• NON-UK NATIONAL / VISA HOLDER → Flag residency status to the underwriter up front. Favour Aviva and Zurich (comfortable with non-UK nationals). Avoid providers known to decline on residency grounds.
• OLDER APPLICANT (50+) → Match term to mortgage end or planned retirement, whichever is sooner. CIC premiums become expensive — consider Life-only + savings if CIC is uneconomic.
• BUDGET-CONSTRAINED → Apply priority order: IP → FIB → Life → CIC. Reduce CIC term or drop CIC before touching IP.

═══════════════════════════════════════════
PROVIDER SHORTLIST (suggest a primary + alternative per product)
═══════════════════════════════════════════
• Life / DTA / Level Term: Aviva (default), Zurich, Vitality (for health-conscious clients).
• Critical Illness Cover (where definitions matter most): Guardian (strongest definitions — ABI+ enhancements), Vitality, Aviva.
• Income Protection: Aviva (default), The Exeter (manual / trade / self-employed), Vitality.
• Relevant Life Plan: Zurich, Aviva, YuLife.
• Complex underwriting (diabetes, mental health, BMI >33, cancer history): Zurich and The Exeter are typically most pragmatic.

State the primary recommendation with one-sentence reasoning and one alternative. Do not recommend a provider without a reason.

═══════════════════════════════════════════
OWNERSHIP / TRUSTS (flag under Recommendation)
═══════════════════════════════════════════
• Every Life and CIC policy should go into trust where there is a spouse, partner, dependant, or cohabiting partner — default to the provider's standard Discretionary Trust.
• Relevant Life policies always in trust (required for corp-tax treatment).
• Couples should nominate each other, with the children as the default secondary beneficiaries.

═══════════════════════════════════════════
OUTPUT — FOUR SECTIONS, IN THIS ORDER
═══════════════════════════════════════════

1. RECOMMENDATION
   Identify the client archetype in one line, then list for each person the products recommended:
     – Product + primary provider + one alternative
     – Sum assured / benefit amount (show the calculation or reference where it comes from)
     – Term (years and what it is matched to — mortgage end, youngest child age 21, SPA, etc.)
     – Basis (single/joint — default single) and policy ownership
     – Trust position (default Discretionary Trust unless a reason not to)
     – Waiver of Premium position
     – 1–2 sentence plain-English rationale — why this product, why these numbers
   Close with a short "Considered and ruled out" note naming any products or structures you actively decided against for this client and why (e.g. "Joint-life CIC ruled out — two single policies pay both partners and survive separation"; "Relevant Life not suitable — client is employed PAYE"; "CIC term shortened — budget constraint, prioritised IP").

2. EXISTING COVER ASSESSMENT
   For each existing policy: keep / replace / cancel — with the reason. If none, state "No existing cover disclosed." Never recommend cancelling existing cover before replacement is on risk; say this explicitly when recommending a replacement.

3. UNDERWRITING QUESTIONS
   4–8 specific disclosure questions based on the health, BMI, occupation and lifestyle shown. Target questions that will materially change the application (not generic "any other conditions?" fillers).

4. UNDERWRITING FLAGS
   Summarise loading, exclusion, postponement or decline risks. For each flag: name the likely outcome and the provider most likely to offer best terms. If pre-sale underwriting is warranted, say so and name the underwriter(s) to approach.

---
CLIENT: ${C.firstName} ${C.lastName} | DOB: ${C.dobD}/${C.dobM}/${C.dobY} (Age: ${cAge ?? "unknown"}) | State Pension Age: ${cSPA ?? "unknown"} | Gender: ${C.gender} | Marital: ${C.marital} | Smoker: ${C.smoker}
Height: ${heightStr(C)} | Weight: ${weightStr(C)}${cB}
Occupation: ${C.occ} (${C.empType}) | Gross: £${C.gross}/yr | Take-home: £${C.takehome}/month
Outgoings: £${C.outgoings}/month | Savings: £${C.savings}
${cSick}
Benefits: ${cBen}
Health: ${C.health || "Nothing disclosed"}

${hasP ? `PARTNER: ${P.firstName} | DOB: ${P.dobD}/${P.dobM}/${P.dobY} (Age: ${pAge ?? "unknown"}) | State Pension Age: ${pSPA ?? "unknown"} | Gender: ${P.gender} | Smoker: ${P.smoker}
Height: ${heightStr(P)} | Weight: ${weightStr(P)}${pB}
Occupation: ${P.occ} (${P.empType}) | Gross: £${P.gross}/yr | Take-home: £${P.takehome}/month
${pSick}
Health: ${P.health || "Nothing disclosed"}` : "PARTNER: None / single"}

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
        body: JSON.stringify({ model: MODEL, max_tokens: 3000, messages: [{ role: "user", content: buildPrompt() }] }),
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
            <F label="First Name"><Inp value={C.firstName} onChange={setC_("firstName")} placeholder="John" /></F>
            <F label="Last Name"><Inp value={C.lastName} onChange={setC_("lastName")} placeholder="Smith" /></F>
          </div>
          <div style={S.row2}>
            <F label="Marital Status"><Sel value={C.marital} onChange={setC_("marital")}><option value="">Select…</option><option>Single</option><option>Married</option><option>Cohabiting</option><option>Divorced</option><option>Widowed</option></Sel></F>
            <div />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Lbl text="Date of Birth" />
            <DOB d={C.dobD} m={C.dobM} y={C.dobY} od={setC_("dobD")} om={setC_("dobM")} oy={setC_("dobY")} />
            {cAge !== null && <p style={S.ageTag}>Age: {cAge} — State Pension Age: {cSPA}</p>}
          </div>
          <div style={S.row2}>
            <F label="Gender"><Sel value={C.gender} onChange={setC_("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F>
            <F label="Smoker Status"><Sel value={C.smoker} onChange={setC_("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F>
          </div>
          <div style={S.row1}>
            <Lbl text="Height" />
            <UnitToggle isMetric={C.hUnit === "metric"} onMetric={() => setC(p => ({ ...p, hUnit: "metric" }))} onImperial={() => setC(p => ({ ...p, hUnit: "imperial" }))} />
            {C.hUnit === "metric"
              ? <Inp type="number" value={C.hCm} onChange={setC_("hCm")} placeholder="e.g. 175" />
              : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Inp type="number" value={C.hFt} onChange={setC_("hFt")} placeholder="ft" />
                  <Inp type="number" value={C.hIn} onChange={setC_("hIn")} placeholder="in" />
                </div>
            }
          </div>
          <div style={S.row1}>
            <Lbl text="Weight" />
            <UnitToggle isMetric={C.wUnit === "metric"} onMetric={() => setC(p => ({ ...p, wUnit: "metric" }))} onImperial={() => setC(p => ({ ...p, wUnit: "imperial" }))} />
            {C.wUnit === "metric"
              ? <Inp type="number" value={C.wKg} onChange={setC_("wKg")} placeholder="e.g. 80" />
              : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Inp type="number" value={C.wSt} onChange={setC_("wSt")} placeholder="st" />
                  <Inp type="number" value={C.wLbs} onChange={setC_("wLbs")} placeholder="lbs" />
                </div>
            }
            {cBMI && <p style={S.bmiTag(cBand?.flag)}>BMI: {cBMI.toFixed(1)} — {cBand?.label}</p>}
          </div>
          <div style={S.row1}><F label="Occupation"><Inp value={C.occ} onChange={setC_("occ")} placeholder="e.g. Accountant, Plumber" /></F></div>
          <div style={S.row1}><F label="Employment Type"><Sel value={C.empType} onChange={setC_("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F></div>
          <div style={S.row2}>
            <F label="Gross Income (£/yr)"><Inp type="number" value={C.gross} onChange={setC_("gross")} placeholder="50000" /></F>
            <F label="Take-home (£/month)"><Inp type="number" value={C.takehome} onChange={setC_("takehome")} placeholder="3200" /></F>
          </div>
          <div style={S.row2}>
            <F label="Total Outgoings (£/month)"><Inp type="number" value={C.outgoings} onChange={setC_("outgoings")} placeholder="2500" /></F>
            <F label="Savings (£)"><Inp type="number" value={C.savings} onChange={setC_("savings")} placeholder="10000" /></F>
          </div>
          {!isSE(C.empType) && (
            <div style={S.row2}>
              <F label="Employer Sick Pay"><Inp value={C.sickPay} onChange={setC_("sickPay")} placeholder="e.g. Full pay" /></F>
              <F label="Sick Pay Duration"><Inp value={C.sickDur} onChange={setC_("sickDur")} placeholder="e.g. 3 months" /></F>
            </div>
          )}
          {!isSE(C.empType) && (
            <div style={S.row1}><F label="Employee Benefits"><Ta value={C.benefits} onChange={setC_("benefits")} placeholder="e.g. 4x salary death in service, group IP" /></F></div>
          )}
          <div style={S.row1}><F label="Health / Medical History"><Ta value={C.health} onChange={setC_("health")} placeholder="e.g. Type 2 diabetes, well controlled. No other conditions." /></F></div>
        </div>

        {/* PARTNER */}
        <div style={S.card}>
          <p style={S.cardH}>👥 Partner / Second Life</p>
          <label style={{ ...S.chk, marginBottom: hasP ? 18 : 0 }}>
            <input type="checkbox" checked={hasP} onChange={e => setHasP(e.target.checked)} style={{ width: 16, height: 16 }} />
            Include a partner on this case
          </label>
          {hasP && <>
            <div style={{ ...S.row1, marginTop: 14 }}>
              <F label="First Name"><Inp value={P.firstName} onChange={setP_("firstName")} placeholder="Jane" /></F>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Lbl text="Date of Birth" />
              <DOB d={P.dobD} m={P.dobM} y={P.dobY} od={setP_("dobD")} om={setP_("dobM")} oy={setP_("dobY")} />
              {pAge !== null && <p style={S.ageTag}>Age: {pAge} — State Pension Age: {pSPA}</p>}
            </div>
            <div style={S.row2}>
              <F label="Gender"><Sel value={P.gender} onChange={setP_("gender")}><option value="">Select…</option><option value="male">Male</option><option value="female">Female</option></Sel></F>
              <F label="Smoker Status"><Sel value={P.smoker} onChange={setP_("smoker")}><option value="no">Non-smoker</option><option value="yes">Smoker</option><option value="ex">Ex-smoker</option></Sel></F>
            </div>
            <div style={S.row1}>
              <Lbl text="Height" />
              <UnitToggle isMetric={P.hUnit === "metric"} onMetric={() => setP(p => ({ ...p, hUnit: "metric" }))} onImperial={() => setP(p => ({ ...p, hUnit: "imperial" }))} />
              {P.hUnit === "metric"
                ? <Inp type="number" value={P.hCm} onChange={setP_("hCm")} placeholder="e.g. 165" />
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Inp type="number" value={P.hFt} onChange={setP_("hFt")} placeholder="ft" />
                    <Inp type="number" value={P.hIn} onChange={setP_("hIn")} placeholder="in" />
                  </div>
              }
            </div>
            <div style={S.row1}>
              <Lbl text="Weight" />
              <UnitToggle isMetric={P.wUnit === "metric"} onMetric={() => setP(p => ({ ...p, wUnit: "metric" }))} onImperial={() => setP(p => ({ ...p, wUnit: "imperial" }))} />
              {P.wUnit === "metric"
                ? <Inp type="number" value={P.wKg} onChange={setP_("wKg")} placeholder="e.g. 65" />
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Inp type="number" value={P.wSt} onChange={setP_("wSt")} placeholder="st" />
                    <Inp type="number" value={P.wLbs} onChange={setP_("wLbs")} placeholder="lbs" />
                  </div>
              }
              {pBMI && <p style={S.bmiTag(pBand?.flag)}>BMI: {pBMI.toFixed(1)} — {pBand?.label}</p>}
            </div>
            <div style={S.row1}><F label="Occupation"><Inp value={P.occ} onChange={setP_("occ")} placeholder="e.g. Teacher" /></F></div>
            <div style={S.row1}><F label="Employment Type"><Sel value={P.empType} onChange={setP_("empType")}><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="director">Limited company director</option><option value="contractor">Contractor</option></Sel></F></div>
            <div style={S.row2}>
              <F label="Gross Income (£/yr)"><Inp type="number" value={P.gross} onChange={setP_("gross")} placeholder="35000" /></F>
              <F label="Take-home (£/month)"><Inp type="number" value={P.takehome} onChange={setP_("takehome")} placeholder="2400" /></F>
            </div>
            {!isSE(P.empType) && (
              <div style={S.row2}>
                <F label="Employer Sick Pay"><Inp value={P.sickPay} onChange={setP_("sickPay")} /></F>
                <F label="Sick Pay Duration"><Inp value={P.sickDur} onChange={setP_("sickDur")} /></F>
              </div>
            )}
            <div style={S.row1}><F label="Health / Medical History"><Ta value={P.health} onChange={setP_("health")} placeholder="e.g. No issues disclosed." /></F></div>
          </>}
        </div>

        {/* CHILDREN */}
        <div style={S.card}>
          <p style={S.cardH}>👶 Dependant Children</p>
          <div style={S.row2}>
            <F label="Number of children">
              <Sel value={numKids} onChange={setKids}>
                {[0, 1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 0 ? "None" : n}</option>)}
              </Sel>
            </F>
            <div />
          </div>
          {kidAges.map((a, i) => (
            <div key={i} style={S.row2}>
              <F label={`Child ${i + 1} — Age (years)`}>
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
              <div style={S.row1}><F label="Outstanding Balance (£)"><Inp type="number" value={m.balance} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, balance: v } : x))} placeholder="250000" /></F></div>
              <div style={S.row2}>
                <F label="Remaining Term (yrs)"><Inp type="number" value={m.term} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, term: v } : x))} placeholder="25" /></F>
                <F label="Monthly Payment (£)"><Inp type="number" value={m.payment} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, payment: v } : x))} placeholder="1200" /></F>
              </div>
              <div style={S.row2}>
                <F label="Repayment Type"><Sel value={m.type} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, type: v } : x))}><option value="repayment">Repayment</option><option value="interest_only">Interest Only</option><option value="part_and_part">Part & Part</option></Sel></F>
                <F label="Purpose"><Sel value={m.purpose} onChange={v => setMortgages(p => p.map((x, idx) => idx === i ? { ...x, purpose: v } : x))}><option value="residential">Residential</option><option value="btl">Buy to Let</option><option value="commercial">Commercial</option></Sel></F>
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
              <div style={S.row1}><F label="Cover Type"><Sel value={x.type} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, type: v } : c))}><option value="">Select…</option><option>Decreasing Life Insurance</option><option>Level Life Insurance</option><option>Critical Illness Cover</option><option>Income Protection</option><option>Family Income Benefit</option><option>Whole of Life</option><option>Other</option></Sel></F></div>
              <div style={S.row2}>
                <F label="Provider"><Inp value={x.provider} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, provider: v } : c))} placeholder="Aviva" /></F>
                <F label="Basis"><Sel value={x.basis} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, basis: v } : c))}><option value="single">Single life</option><option value="joint">Joint life</option></Sel></F>
              </div>
              <div style={S.row2}>
                <F label="Sum Assured (£)"><Inp type="number" value={x.amount} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, amount: v } : c))} placeholder="200000" /></F>
                <F label="Remaining Term (yrs)"><Inp type="number" value={x.term} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, term: v } : c))} placeholder="20" /></F>
              </div>
              <div style={S.row1}><F label="Monthly Premium (£)"><Inp type="number" value={x.premium} onChange={v => setCover(p => p.map((c, idx) => idx === i ? { ...c, premium: v } : c))} placeholder="45" /></F></div>
            </div>
          ))}
          <button style={S.addBtn} onClick={() => setCover(p => [...p, { ...BX }])}>+ Add existing policy</button>
        </div>

        {/* LIVE UW FLAGS */}
        {(lifeFlag || pLifeFlag || ipFlag || (cBand && cBand.flag !== "green") || (hasP && pBand && pBand.flag !== "green")) && (
          <div style={S.card}>
            <p style={S.cardH}>⚡ Live Underwriting Flags</p>
            {lifeFlag && <FlagRow label={`${C.firstName || "Client"} — Life (£${totalMortgage.toLocaleString()})`} badge={lifeFlag.label} color={UWC[lifeFlag.level]} />}
            {pLifeFlag && <FlagRow label={`${P.firstName || "Partner"} — Life (£${totalMortgage.toLocaleString()})`} badge={pLifeFlag.label} color={UWC[pLifeFlag.level]} />}
            {ipFlag && <FlagRow label={`${C.firstName || "Client"} — IP (£${cIP.toLocaleString()}/month)`} badge={ipFlag.label} color={UWC[ipFlag.level]} />}
            {cBand && cBand.flag !== "green" && cBMI && <FlagRow label={`${C.firstName || "Client"} — BMI ${cBMI.toFixed(1)} (${cBand.label})`} badge={cBand.note} color={FC[cBand.flag]} />}
            {hasP && pBand && pBand.flag !== "green" && pBMI && <FlagRow label={`${P.firstName || "Partner"} — BMI ${pBMI.toFixed(1)} (${pBand.label})`} badge={pBand.note} color={FC[pBand.flag]} />}
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

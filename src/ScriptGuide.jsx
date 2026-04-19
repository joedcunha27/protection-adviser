import { useState } from "react";

function fmt(n) { return n ? `£${Math.round(n).toLocaleString()}` : "£—"; }
function fmtM(n) { return n ? `£${Math.round(n).toLocaleString()}/month` : "£—/month"; }

function ScriptLine({ text }) {
  return (
    <div style={{
      fontSize: 15, color: "#0f172a", lineHeight: 1.75, margin: "10px 0",
      background: "#f0f7ff", borderLeft: "3px solid #0ea5e9",
      padding: "12px 16px", borderRadius: "0 10px 10px 0"
    }}>{text}</div>
  );
}

function CustomerLine() {
  return <p style={{fontSize:13,color:"#94a3b8",fontStyle:"italic",margin:"5px 0 5px 24px"}}>(Customer responds)</p>;
}

function NoteBox({ children }) {
  return (
    <div style={{
      background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10,
      padding: "12px 14px", margin: "10px 0", fontSize: 13,
      lineHeight: 1.65, color: "#78350f"
    }}>{children}</div>
  );
}

function ScriptSection({ title, icon, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{marginBottom: 8, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0"}}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%",
        background: open ? "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)" : "#f8fafc",
        color: open ? "#fff" : "#1e293b", border: "none", padding: "14px 16px",
        textAlign: "left", fontSize: 13, fontWeight: 700, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        letterSpacing: "0.02em", textTransform: "uppercase"
      }}>
        <span>{icon}&nbsp;&nbsp;{title}</span>
        <span style={{fontSize: 11, opacity: 0.8}}>{open ? "▲ CLOSE" : "▼ OPEN"}</span>
      </button>
      {open && <div style={{padding: "16px 18px", background: "#fff"}}>{children}</div>}
    </div>
  );
}

export default function ScriptGuide({ C, P, hasP, mortgages, numKids, kidAges, cSPA }) {
  const [copied, setCopied] = useState(false);

  const c1Name = C.firstName || "Client";
  const c2Name = P.firstName || "Partner";
  const c1Income = parseFloat(C.takehome) || 0;
  const c2Income = parseFloat(P.takehome) || 0;
  const totalOutgoings = parseFloat(C.outgoings) || 0;
  const savings = parseFloat(C.savings) || 0;
  const mortgagePayment = mortgages.reduce((s, m) => s + (parseFloat(m.payment) || 0), 0);
  const mortgageBalance = mortgages.reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
  const mortgageTerm = mortgages[0]?.term || "—";
  const isRepayment = (mortgages[0]?.type || "repayment") === "repayment";
  const hasMortgage = mortgageBalance > 0;
  const BUFFER = 500;
  const remainingOutgoings = hasMortgage ? totalOutgoings - mortgagePayment : totalOutgoings;

  const youngChildAge = kidAges.length > 0 ? Math.min(...kidAges.map(a => parseInt(a) || 99)) : null;
  const fibTerm = youngChildAge !== null ? Math.max(0, 21 - youngChildAge) : null;

  // FIB: if person 1 dies, person 2 is survivor — does person 2's income cover remaining outgoings + buffer?
  const fibIfC1Dies = Math.max(0, (remainingOutgoings + BUFFER) - c2Income); // C1 dies, C2 survives
  const fibIfC2Dies = Math.max(0, (remainingOutgoings + BUFFER) - c1Income); // C2 dies, C1 survives

  // IP: if person can't work, partner's income vs total outgoings
  const c1IPShortfall = Math.max(0, totalOutgoings - c2Income); // C1 can't work, C2 covers
  const c2IPShortfall = Math.max(0, totalOutgoings - c1Income); // C2 can't work, C1 covers
  const c1Gross60 = (parseFloat(C.gross) || 0) * 0.6 / 12;
  const c2Gross60 = (parseFloat(P.gross) || 0) * 0.6 / 12;
  const c1IPAmount = Math.min(c1IPShortfall || c1Gross60, c1Gross60);
  const c2IPAmount = Math.min(c2IPShortfall || c2Gross60, c2Gross60);

  // Deferred period
  const isSE1 = ["self_employed", "director", "contractor"].includes(C.empType);
  const isSE2 = ["self_employed", "director", "contractor"].includes(P.empType);
  const monthsSavings = totalOutgoings > 0 ? savings / totalOutgoings : 0;

  function getDeferral(isSE, sickPay, sickDur) {
    if (!isSE) return { period: `when your ${sickPay || "sick pay"} ends (${sickDur || "check duration"})`, note: `sick pay of ${sickPay || "unknown"} for ${sickDur || "unknown"}` };
    if (monthsSavings >= 3) return { period: "3 months", note: `savings of ${fmt(savings)} cover ${monthsSavings.toFixed(1)} months outgoings` };
    return { period: "1 month", note: "self-employed with no sick pay and insufficient savings to wait longer" };
  }

  const c1Def = getDeferral(isSE1, C.sickPay, C.sickDur);
  const c2Def = getDeferral(isSE2, P.sickPay, P.sickDur);

  // Summary items for pre-price check
  const summaryItems = [];
  if (hasMortgage) summaryItems.push(`${isRepayment ? "Decreasing" : "Level"} term life — ${fmt(mortgageBalance)} over ${mortgageTerm} years${hasP ? ", joint life first death" : ""}`);
  if (numKids > 0 && fibIfC1Dies > 0) summaryItems.push(`Family Income Benefit on ${c1Name}'s life — ${fmtM(fibIfC1Dies)} for ${fibTerm} years`);
  if (numKids > 0 && hasP && fibIfC2Dies > 0) summaryItems.push(`Family Income Benefit on ${c2Name}'s life — ${fmtM(fibIfC2Dies)} for ${fibTerm} years`);

  function buildScriptText() {
    const lines = [];
    const say = (t) => lines.push(`"${t}"`);
    const cr = () => lines.push("(Customer responds)");
    const note = (t) => lines.push(`[NOTE: ${t}]`);
    const sec = (t) => lines.push(`\n── ${t} ──`);

    sec("1. CALL INTRO");
    say(`Hi, is that ${c1Name}?`); cr();
    say(`Hi ${c1Name}, it's [Your Name] calling back. Before we go through your options can I just ask you to confirm the first line of your address and postcode for Data Protection please?`); cr();
    say("That's great, thanks. Right, I've completed my research so I can now run through the recommendation and quotes with you. This is based on what I would do if I were in your shoes, but of course we can make some tweaks if you want to, ok?"); cr();
    say("Do you have a pen and paper to jot this all down?");

    if (hasMortgage) {
      sec("2. MORTGAGE COVER");
      say(`So the first thing I'm going to recommend is a ${hasP ? "joint" : "single"} policy for ${fmt(mortgageBalance)} over ${mortgageTerm} years, which will pay off your mortgage if ${hasP ? "you or your partner" : "you"} pass away.`);
      say(`Now, because you have a ${isRepayment ? "repayment" : "interest only"} mortgage I'm recommending that you set up this policy on a ${isRepayment ? "decreasing" : "level"} basis.`);
      say(`What this means is that the amount you're insured for will ${isRepayment ? "reduce in line with your mortgage balance" : "stay the same"}, so the mortgage will be paid off in full if ${hasP ? "you or your partner" : "you"} die at any point during the mortgage term. Does that make sense?`); cr();
    }

    if (numKids > 0) {
      sec(`${hasMortgage ? "3" : "2"}. FAMILY INCOME BENEFIT`);
      if (hasMortgage) {
        say(`Great. So the next thing I'm recommending is some additional protection for the family. You told me earlier that the total household outgoings including your mortgage are ${fmtM(totalOutgoings)}, and that the mortgage payment is ${fmtM(mortgagePayment)}, correct?`); cr();
        say(`So if one of you were to pass away and the mortgage was paid off by the life insurance, the remaining outgoings would reduce to ${fmtM(remainingOutgoings)}. Does that make sense?`); cr();
      } else {
        say(`So you told me earlier that the total household outgoings are ${fmtM(totalOutgoings)}, correct?`); cr();
      }

      if (hasP) {
        if (fibIfC1Dies > 0 && fibIfC2Dies <= 0) {
          say(`Now, if ${c2Name} were to pass away, you'd actually be fine — your income of ${fmtM(c1Income)} comfortably covers the remaining outgoings of ${fmtM(remainingOutgoings)}.`);
          say(`However, if you were to pass away, ${c2Name}'s income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a shortfall of ${fmtM(fibIfC1Dies)}.`);
          say(`So I'm recommending a Family Income Benefit policy on your life that pays out ${fmtM(fibIfC1Dies)} per month to ${c2Name} if you die, for ${fibTerm} years until your youngest child reaches age 21. Does that make sense?`); cr();
        } else if (fibIfC2Dies > 0 && fibIfC1Dies <= 0) {
          say(`Now, if you were to pass away, ${c2Name} would actually be fine — their income of ${fmtM(c2Income)} comfortably covers the remaining outgoings of ${fmtM(remainingOutgoings)}.`);
          say(`However, if ${c2Name} were to pass away, your income of ${fmtM(c1Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a shortfall of ${fmtM(fibIfC2Dies)}.`);
          say(`So I'm recommending a Family Income Benefit policy on ${c2Name}'s life that pays out ${fmtM(fibIfC2Dies)} per month to you if they die, for ${fibTerm} years until your youngest child reaches age 21. Does that make sense?`); cr();
        } else if (fibIfC1Dies > 0 && fibIfC2Dies > 0) {
          say(`Now, if you were to pass away, ${c2Name}'s income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a shortfall of ${fmtM(fibIfC1Dies)}.`);
          say(`And equally, if ${c2Name} were to pass away, your income of ${fmtM(c1Income)} wouldn't cover the remaining outgoings either — there'd be a shortfall of ${fmtM(fibIfC2Dies)}.`);
          say(`So I'm recommending a Family Income Benefit policy on each of your lives. Your policy pays out ${fmtM(fibIfC1Dies)} per month to ${c2Name} if you die, and ${c2Name}'s policy pays out ${fmtM(fibIfC2Dies)} per month to you if they die — both running for ${fibTerm} years until your youngest reaches age 21. Does that make sense?`); cr();
        }
      } else {
        say(`So I'm recommending a Family Income Benefit policy that pays out ${fmtM(remainingOutgoings + BUFFER)} per month to the guardian of your children if you die, for ${fibTerm} years until your youngest reaches age 21. Does that make sense?`); cr();
      }
    }

    sec(`${(hasMortgage ? 1 : 0) + (numKids > 0 ? 1 : 0) + 2}. PRE-PRICE CHECK`);
    say("Great, so to summarise what we're putting in place:");
    summaryItems.forEach((item, i) => lines.push(`  ${i + 1}. ${item}`));
    say("Before we discuss the pricing, I just want to check you're happy with all of that and agree with the advice. There's not much point talking about prices for a policy you don't like the sound of.");
    cr();
    say("Great, and do you have any questions at all?"); cr();

    sec(`${(hasMortgage ? 1 : 0) + (numKids > 0 ? 1 : 0) + 3}. PRICE CORE`);
    say(`Great, so I've had a look across the market and [Provider] are currently offering the most competitive premiums, which is £[X] per month in total.`);
    say("Now, I always say it's important we get the right balance between a good level of protection and an affordable premium. This is supposed to give you peace of mind, not have you worrying about payments every month. With that in mind, is £[X] comfortable for you?"); cr();
    note("If NO: ask what monthly amount works. If YES: move to IP upsell.");

    sec(`${(hasMortgage ? 1 : 0) + (numKids > 0 ? 1 : 0) + 4}. INCOME PROTECTION UPSELL`);
    say("Just before we do that, I mentioned at the start of the call that I've also looked at something that could support you if you're off work because of an illness or injury. I think you could be in a fairly difficult financial position in that scenario.");
    if (hasP) {
      if (c1IPShortfall > 0) say(`If you can't work, ${c2Name}'s income of ${fmtM(c2Income)} wouldn't be enough to cover the full outgoings of ${fmtM(totalOutgoings)}. There'd be a shortfall of ${fmtM(c1IPAmount)} per month — so I'm recommending Income Protection for you covering ${fmtM(c1IPAmount)} per month.`);
      if (c2IPShortfall > 0 && hasP) say(`And equally, if ${c2Name} can't work, your income of ${fmtM(c1Income)} wouldn't cover the full outgoings either — there'd be a shortfall of ${fmtM(c2IPAmount)} per month. So I'm also recommending Income Protection for ${c2Name} covering ${fmtM(c2IPAmount)} per month.`);
    } else {
      say(`Obviously if you can't work you won't be able to cover your bills. So I'm recommending Income Protection covering ${fmtM(c1IPAmount)} per month — which is 60% of your gross salary, the maximum insurable amount.`);
    }
    say("So the product is called Income Protection. Have you heard of it before?"); cr();
    say("Income Protection pays out a monthly amount if you're unable to work because of illness, injury or accident — everything from cancer to depression to a broken leg. If your doctor signs you off as unfit for work, for whatever reason, the policy pays out. Does that make sense?"); cr();
    say(`The policy pays out every month until you can return to work — or if you can never go back, it pays out until your state pension age of ${cSPA || 68}. And making a claim doesn't affect your premiums, so you're encouraged to use it whenever you need to.`);
    say("Now, there's one important thing called the Deferred Period — the length of time you need to be off work before the policy starts paying out.");
    say(`For you ${c1Name}, I'd recommend a deferred period of ${c1Def.period}. ${isSE1 ? (monthsSavings >= 3 ? `You have savings of ${fmt(savings)} which could tide you over, so opting for a longer deferred period makes the premium meaningfully cheaper.` : "As you're self-employed with no sick pay, you'd need it to kick in as soon as possible.") : `Your employer pays you ${C.sickPay || "sick pay"} for ${C.sickDur || "a period"}, so there's no need for the policy to start paying out before that ends — and a longer deferred period makes the premium a lot cheaper.`}`);
    if (hasP) say(`For ${c2Name}, I'd recommend a deferred period of ${c2Def.period}.`);
    say("Any questions on all of that? Do you feel that would be beneficial?"); cr();

    sec(`${(hasMortgage ? 1 : 0) + (numKids > 0 ? 1 : 0) + 5}. PRICE UPSELL & CLOSE`);
    say(`So for the Income Protection, the most competitive provider is [Provider] quoting £[X] per month.`);
    say(`So in total you'd be looking at £[X] for the life insurance and £[X] for the Income Protection. Is that still comfortable for you?`); cr();
    note("If NO: proceed with life insurance only, revisit IP in future. If YES: close.");
    say(`Ok great. All we need to do now is run through a few medical questions to make sure [Provider] are happy to cover you — which based on what you've told me should be fine. Then we'll get everything sorted.`);
    say(`While those questions are loading, let me tell you about some of the additional benefits you get with [Provider]… [list 3 benefits and claims payout rate]`);

    return lines.join("\n");
  }

  function copyScript() {
    navigator.clipboard.writeText(buildScriptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const sNum = (n) => `${(hasMortgage ? 1 : 0) + (numKids > 0 ? 1 : 0) + n}`;

  return (
    <div style={{background: "#fff", borderRadius: 20, padding: 24, marginTop: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(14,165,233,0.08)"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18}}>
        <div>
          <p style={{fontSize: 17, fontWeight: 800, color: "#0369a1", margin: "0 0 3px 0", letterSpacing: "-0.02em"}}>📞 Call Script</p>
          <p style={{fontSize: 12, color: "#94a3b8", margin: 0}}>Numbers calculated automatically from fact-find. Tap to expand each section.</p>
        </div>
        <button onClick={copyScript} style={{
          background: copied ? "#dcfce7" : "#f0f9ff", border: `1px solid ${copied ? "#86efac" : "#bae6fd"}`,
          borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700,
          color: copied ? "#16a34a" : "#0369a1", cursor: "pointer", whiteSpace: "nowrap"
        }}>
          {copied ? "✓ Copied!" : "📋 Copy Script"}
        </button>
      </div>

      <ScriptSection title="Call Intro" icon="👋" defaultOpen={true}>
        <ScriptLine text={`"Hi, is that ${c1Name}?"`} />
        <CustomerLine />
        <ScriptLine text={`"Hi ${c1Name}, it's [Your Name] calling back. Before we go through your options can I just ask you to confirm the first line of your address and postcode for Data Protection please?"`} />
        <CustomerLine />
        <ScriptLine text={`"That's great, thanks. Right, I've completed my research so I can now run through the recommendation and quotes with you. This is based on what I would do if I were in your shoes, but of course we can make some tweaks if you want to, ok?"`} />
        <CustomerLine />
        <ScriptLine text={`"Do you have a pen and paper to jot this all down?"`} />
      </ScriptSection>

      {hasMortgage && (
        <ScriptSection title="Mortgage Cover" icon="🏠">
          <ScriptLine text={`"So the first thing I'm going to recommend is a ${hasP ? "joint" : "single"} policy for ${fmt(mortgageBalance)} over ${mortgageTerm} years, which will pay off your mortgage if ${hasP ? "you or your partner" : "you"} pass away."`} />
          <ScriptLine text={`"Now, because you have a ${isRepayment ? "repayment" : "interest only"} mortgage I'm recommending that you set up this policy on a ${isRepayment ? "decreasing" : "level"} basis."`} />
          <ScriptLine text={`"What this means is that the amount you're insured for will ${isRepayment ? "reduce in line with your mortgage balance" : "stay the same"}, so the mortgage will be paid off in full if ${hasP ? "you or your partner" : "you"} die at any point during the mortgage term. Does that make sense?"`} />
          <CustomerLine />
        </ScriptSection>
      )}

      {numKids > 0 && (
        <ScriptSection title="Family Income Benefit" icon="👨‍👩‍👧">
          {hasMortgage ? <>
            <ScriptLine text={`"Great. So the next thing I'm recommending is some additional protection for the family. You told me earlier that the total household outgoings including your mortgage are ${fmtM(totalOutgoings)}, and that the mortgage payment is ${fmtM(mortgagePayment)}, correct?"`} />
            <CustomerLine />
            <ScriptLine text={`"So if one of you were to pass away and the mortgage was paid off by the life insurance, the remaining outgoings would reduce to ${fmtM(remainingOutgoings)}. Does that make sense?"`} />
            <CustomerLine />
          </> : <>
            <ScriptLine text={`"So you told me earlier that the total household outgoings are ${fmtM(totalOutgoings)}, correct?"`} />
            <CustomerLine />
          </>}

          {hasP && fibIfC1Dies > 0 && fibIfC2Dies <= 0 && <>
            <ScriptLine text={`"Now, if ${c2Name} were to pass away, you'd actually be fine — your income of ${fmtM(c1Income)} comfortably covers the remaining outgoings of ${fmtM(remainingOutgoings)}."`} />
            <ScriptLine text={`"However, if you were to pass away, ${c2Name}'s income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a shortfall of ${fmtM(fibIfC1Dies)}."`} />
            <ScriptLine text={`"So I'm recommending a Family Income Benefit policy on your life that pays out ${fmtM(fibIfC1Dies)} per month to ${c2Name} if you die, for ${fibTerm} years until your youngest child reaches age 21. Does that make sense?"`} />
            <CustomerLine />
          </>}

          {hasP && fibIfC2Dies > 0 && fibIfC1Dies <= 0 && <>
            <ScriptLine text={`"Now, if you were to pass away, ${c2Name} would actually be fine — their income of ${fmtM(c2Income)} comfortably covers the remaining outgoings of ${fmtM(remainingOutgoings)}."`} />
            <ScriptLine text={`"However, if ${c2Name} were to pass away, your income of ${fmtM(c1Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a shortfall of ${fmtM(fibIfC2Dies)}."`} />
            <ScriptLine text={`"So I'm recommending a Family Income Benefit policy on ${c2Name}'s life that pays out ${fmtM(fibIfC2Dies)} per month to you if they die, for ${fibTerm} years until your youngest child reaches age 21. Does that make sense?"`} />
            <CustomerLine />
          </>}

          {hasP && fibIfC1Dies > 0 && fibIfC2Dies > 0 && <>
            <ScriptLine text={`"Now, if you were to pass away, ${c2Name}'s income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a shortfall of ${fmtM(fibIfC1Dies)}."`} />
            <ScriptLine text={`"And equally, if ${c2Name} were to pass away, your income of ${fmtM(c1Income)} wouldn't cover the remaining outgoings either — there'd be a shortfall of ${fmtM(fibIfC2Dies)}."`} />
            <ScriptLine text={`"So I'm recommending a Family Income Benefit policy on each of your lives. Your policy pays out ${fmtM(fibIfC1Dies)} per month to ${c2Name} if you die, and ${c2Name}'s policy pays out ${fmtM(fibIfC2Dies)} per month to you if they die — both running for ${fibTerm} years until your youngest reaches age 21. Does that make sense?"`} />
            <CustomerLine />
          </>}

          {!hasP && <>
            <ScriptLine text={`"So I'm recommending a Family Income Benefit policy that pays out ${fmtM(remainingOutgoings + BUFFER)} per month to the guardian of your children if you die, for ${fibTerm} years until your youngest reaches age 21. Does that make sense?"`} />
            <CustomerLine />
          </>}
        </ScriptSection>
      )}

      <ScriptSection title="Pre-Price Check" icon="✅">
        <ScriptLine text={`"Great, so to summarise what we're putting in place:"`} />
        {summaryItems.map((item, i) => (
          <div key={i} style={{fontSize: 14, color: "#0369a1", fontWeight: 600, margin: "4px 0 4px 16px", padding: "6px 12px", background: "#f0f9ff", borderRadius: 8}}>
            {i + 1}. {item}
          </div>
        ))}
        {summaryItems.length === 0 && <div style={{fontSize: 13, color: "#94a3b8", fontStyle: "italic", padding: "6px 12px"}}>[Fill in form to see summary]</div>}
        <ScriptLine text={`"Before we discuss the pricing, I just want to check you're happy with all of that and agree with the advice. There's not much point talking about prices for a policy you don't like the sound of."`} />
        <CustomerLine />
        <ScriptLine text={`"Great, and do you have any questions at all?"`} />
        <CustomerLine />
      </ScriptSection>

      <ScriptSection title="Price Core" icon="💷">
        <ScriptLine text={`"Great, so I've had a look across the market and [Provider] are currently offering the most competitive premiums, which is £[X] per month in total."`} />
        <ScriptLine text={`"Now, I always say it's important we get the right balance between a good level of protection and an affordable premium. This is supposed to give you peace of mind, not have you worrying about payments every month. With that in mind, is £[X] comfortable for you?"`} />
        <CustomerLine />
        <NoteBox>
          <strong>If NO:</strong> "Ok, what sort of amount would be comfortable for you monthly so I can look at what's available within your budget?"<br /><br />
          <strong>If YES:</strong> Move to Income Protection upsell below.
        </NoteBox>
      </ScriptSection>

      <ScriptSection title="Income Protection Upsell" icon="🛡️">
        <ScriptLine text={`"Just before we do that, I mentioned at the start of the call that I've also looked at something that could support you if you're off work because of an illness or injury. I think you could be in a fairly difficult financial position in that scenario."`} />
        {hasP ? <>
          {c1IPShortfall > 0 && <ScriptLine text={`"If you can't work, ${c2Name}'s income of ${fmtM(c2Income)} wouldn't be enough to cover the full outgoings of ${fmtM(totalOutgoings)}. There'd be a shortfall of ${fmtM(c1IPAmount)} per month — so I'm recommending Income Protection for you covering ${fmtM(c1IPAmount)} per month."`} />}
          {c2IPShortfall > 0 && <ScriptLine text={`"And equally, if ${c2Name} can't work, your income of ${fmtM(c1Income)} wouldn't cover the full outgoings either — there'd be a shortfall of ${fmtM(c2IPAmount)} per month. So I'm also recommending Income Protection for ${c2Name} covering ${fmtM(c2IPAmount)} per month."`} />}
        </> : <>
          <ScriptLine text={`"Obviously if you can't work you won't be able to cover your bills. So I'm recommending Income Protection covering ${fmtM(c1IPAmount)} per month — which is 60% of your gross salary and the maximum insurable amount."`} />
        </>}
        <ScriptLine text={`"So the product is called Income Protection. Have you heard of it before?"`} />
        <CustomerLine />
        <ScriptLine text={`"Income Protection pays out a monthly amount if you're unable to work because of illness, injury or accident — everything from cancer to depression to a broken leg. If your doctor signs you off as unfit for work, for whatever reason, the policy pays out. Does that make sense?"`} />
        <CustomerLine />
        <ScriptLine text={`"The policy pays out every month until you can return to work — or if you can never go back, it pays out until your state pension age of ${cSPA || 68}. And making a claim doesn't affect your premiums, so you're encouraged to use it whenever you need to."`} />
        <ScriptLine text={`"Now, there's one important thing called the Deferred Period — the length of time you need to be off work before the policy starts paying out."`} />
        <ScriptLine text={`"For you ${c1Name}, I'd recommend a deferred period of ${c1Def.period}. ${isSE1 ? (monthsSavings >= 3 ? `You have savings of ${fmt(parseFloat(C.savings))} which could tide you over, so a longer deferred period makes the premium meaningfully cheaper.` : "As you're self-employed with no sick pay, you need it to kick in as soon as possible.") : `Your employer pays ${C.sickPay || "sick pay"} for ${C.sickDur || "a period"}, so the policy doesn't need to start until that ends — and this makes the premium a lot cheaper.`}"`} />
        {hasP && <ScriptLine text={`"For ${c2Name}, I'd recommend a deferred period of ${c2Def.period}."`} />}
        <ScriptLine text={`"Any questions on all of that? Do you feel that would be beneficial?"`} />
        <CustomerLine />
      </ScriptSection>

      <ScriptSection title="Price Upsell & Close" icon="🤝">
        <ScriptLine text={`"So for the Income Protection, the most competitive provider is [Provider] quoting £[X] per month."`} />
        <ScriptLine text={`"So in total you'd be looking at £[X] for the life insurance and £[X] for the Income Protection. Is that still comfortable for you?"`} />
        <CustomerLine />
        <NoteBox>
          <strong>If NO:</strong> "Ok, we can proceed with just the life insurance for now and revisit the Income Protection in the future if you change your mind."<br /><br />
          <strong>If YES:</strong> Move to close.
        </NoteBox>
        <ScriptLine text={`"Ok great. All we need to do now is run through a few medical questions to make sure [Provider] are happy to cover you — which based on what you've told me should be fine. Then we'll get everything sorted."`} />
        <ScriptLine text={`"While those questions are loading, let me tell you about some of the additional benefits you get with [Provider]… [list 3 benefits and claims payout rate]"`} />
      </ScriptSection>
    </div>
  );
}

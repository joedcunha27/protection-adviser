import { useState } from "react";

const AMBER = "#f59e0b";
const DARK = "#111827";
const DARKER = "#1a2235";
const BORDER = "#1f2937";
const BORDERLIGHT = "#374151";
const TEXT = "#f9fafb";
const TEXTMID = "#d1d5db";
const TEXTDIM = "#9ca3af";
const EMERALD = "#10b981";
const ROSE = "#f43f5e";

function fmt(n) { return n ? `£${Math.round(n).toLocaleString()}` : "£—"; }
function fmtM(n) { return n ? `£${Math.round(n).toLocaleString()}/month` : "£—/month"; }

function ScriptLine({ text }) {
  return (
    <div style={{
      fontSize:15, color:TEXT, lineHeight:1.75, margin:"10px 0",
      background:DARKER, borderLeft:`3px solid ${AMBER}`,
      padding:"12px 16px", borderRadius:"0 10px 10px 0", fontWeight:500,
    }}>
      {text}
    </div>
  );
}

function CustomerLine() {
  return <p style={{fontSize:13,color:TEXTDIM,fontStyle:"italic",margin:"5px 0 5px 28px"}}>↩ Customer responds</p>;
}

function NoteBox({ children }) {
  return (
    <div style={{
      background:"rgba(245,158,11,0.08)", border:`1px solid rgba(245,158,11,0.25)`,
      borderRadius:10, padding:"12px 14px", margin:"10px 0",
      fontSize:13, lineHeight:1.65, color:"#fcd34d",
    }}>
      {children}
    </div>
  );
}

function ScriptSection({ title, icon, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={{marginBottom:8, borderRadius:14, overflow:"hidden", border:`1px solid ${open ? AMBER+"40" : BORDER}`}}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%",
        background: open ? `linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))` : DARKER,
        color: open ? AMBER : TEXTMID,
        border:"none", padding:"15px 18px", textAlign:"left",
        fontSize:13, fontWeight:700, cursor:"pointer",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        letterSpacing:"0.04em", textTransform:"uppercase",
      }}>
        <span>{icon}&nbsp;&nbsp;{title}</span>
        <span style={{fontSize:11, opacity:0.7}}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{padding:"18px 20px", background:DARK, borderTop:`1px solid ${BORDER}`}}>{children}</div>}
    </div>
  );
}

export default function ScriptGuide({ C, P, hasP, mortgages, numKids, kidAges, cSPA }) {
  const [copied, setCopied] = useState(false);

  const c1Income = parseFloat(C.takehome) || 0;
  const c2Income = parseFloat(P.takehome) || 0;
  const totalOutgoings = parseFloat(C.outgoings) || 0;
  const mortgagePayment = mortgages.reduce((s, m) => s + (parseFloat(m.payment) || 0), 0);
  const mortgageBalance = mortgages.reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
  const mortgageTerm = mortgages[0]?.term || "—";
  const isRepayment = (mortgages[0]?.type || "repayment") === "repayment";
  const hasMortgage = mortgageBalance > 0;
  const BUFFER = 500;
  const remainingOutgoings = hasMortgage ? totalOutgoings - mortgagePayment : totalOutgoings;
  const youngChildAge = kidAges.length > 0 ? Math.min(...kidAges.map(a => parseInt(a) || 99)) : null;
  const fibTerm = youngChildAge !== null ? Math.max(0, 21 - youngChildAge) : null;

  // FIB: if C dies, P is survivor. Shortfall = remaining outgoings + buffer - P's income
  const fibIfCDies = Math.max(0, (remainingOutgoings + BUFFER) - c2Income);
  // FIB: if P dies, C is survivor. Shortfall = remaining outgoings + buffer - C's income  
  const fibIfPDies = Math.max(0, (remainingOutgoings + BUFFER) - c1Income);

  // IP: if C can't work, P's income covers what they can. Shortfall = outgoings - P's income
  const ipC1Shortfall = Math.max(0, totalOutgoings - c2Income);
  // IP: if P can't work, C's income covers what they can. Shortfall = outgoings - C's income
  const ipC2Shortfall = Math.max(0, totalOutgoings - c1Income);
  const c1Gross60 = (parseFloat(C.gross) || 0) * 0.6 / 12;
  const c2Gross60 = (parseFloat(P.gross) || 0) * 0.6 / 12;
  const ipC1Amount = Math.min(ipC1Shortfall, c1Gross60);
  const ipC2Amount = Math.min(ipC2Shortfall, c2Gross60);

  // Deferred period
  const isSE1 = ["self_employed","director","contractor"].includes(C.empType);
  const isSE2 = ["self_employed","director","contractor"].includes(P.empType);
  const savings = parseFloat(C.savings) || 0;
  const monthsOfSavings = totalOutgoings > 0 ? savings / totalOutgoings : 0;

  function getDeferral(isSE, sickPay, sickDur) {
    if (!isSE) return { text: `when sick pay ends (${sickPay || "unknown"} for ${sickDur || "unknown"})`, months: sickDur || "when sick pay ends" };
    if (monthsOfSavings >= 3) return { text: `3 months (you have ${fmt(savings)} in savings — about ${monthsOfSavings.toFixed(1)} months of outgoings)`, months: "3 months" };
    return { text: "1 month (shortest available — no sick pay or sufficient savings)", months: "1 month" };
  }
  const c1Deferral = getDeferral(isSE1, C.sickPay, C.sickDur);
  const c2Deferral = getDeferral(isSE2, P.sickPay, P.sickDur);

  const c1Name = C.firstName || "you";
  const c2Name = P.firstName || "your partner";
  const hasFIB = numKids > 0;
  const sNum = n => (hasMortgage ? 1 : 0) + (hasFIB ? 1 : 0) + n;

  // Build summary lines for pre-price check
  function buildSummaryLines() {
    const lines = [];
    if (hasMortgage) {
      lines.push(`• ${isRepayment ? "Decreasing" : "Level"} term life insurance — ${fmt(mortgageBalance)} over ${mortgageTerm} years${hasP ? ", joint life" : ""}, to pay off the mortgage`);
    }
    if (hasFIB) {
      if (fibIfCDies > 0) lines.push(`• Family Income Benefit on ${c1Name}'s life — ${fmtM(fibIfCDies)} for ${fibTerm} years (until youngest reaches 21)`);
      if (hasP && fibIfPDies > 0) lines.push(`• Family Income Benefit on ${c2Name}'s life — ${fmtM(fibIfPDies)} for ${fibTerm} years`);
    }
    return lines;
  }

  function buildScriptText() {
    const lines = [];
    const say = t => lines.push(`"${t}"`);
    const cr = () => lines.push("↩ Customer responds");
    const note = t => lines.push(`[NOTE: ${t}]`);
    const section = t => lines.push(`\n── ${t} ──`);

    section("1. CALL INTRO");
    say(`Hi, is that ${C.firstName || "[Client]"}?`); cr();
    say(`Hi ${C.firstName || "[Client]"}, it's [Your Name] calling back. Can I just ask you to confirm the first line of your address and postcode for Data Protection please?`); cr();
    say("That's great, thanks. I've completed my research and I can now run through the recommendation and quotes with you. This is based on what I would do if I were in your shoes, but we can make tweaks once we've gone through it, ok?"); cr();
    say("Do you have a pen and paper to jot this all down?");

    if (hasMortgage) {
      section("2. MORTGAGE COVER");
      say(`So the first thing I'm going to recommend is a ${hasP ? "joint" : "single"} policy for ${fmt(mortgageBalance)} over ${mortgageTerm} years, which will pay off your mortgage if ${hasP ? "you or your partner" : "you"} pass away.`);
      say(`Because you have a ${isRepayment ? "repayment" : "interest only"} mortgage I'm recommending a ${isRepayment ? "decreasing" : "level"} basis — the amount insured will ${isRepayment ? "reduce in line with your mortgage balance" : "stay the same"}, so the mortgage is always fully covered. Does that make sense?`); cr();
    }

    if (hasFIB) {
      section(`${hasMortgage ? "3" : "2"}. FAMILY INCOME BENEFIT`);
      if (hasMortgage) {
        say(`Great. The next thing I want to recommend is additional protection for the family. So the total household outgoings including the mortgage are ${fmtM(totalOutgoings)}, and the mortgage payment is ${fmtM(mortgagePayment)}, correct?`); cr();
        say(`So if one of you were to pass away and the mortgage was paid off, the remaining outgoings would reduce to ${fmtM(remainingOutgoings)}. Does that make sense?`); cr();
      } else {
        say(`So you told me earlier the total household outgoings are ${fmtM(totalOutgoings)}, correct?`); cr();
      }

      if (hasP) {
        if (fibIfCDies > 0 && fibIfPDies <= 0) {
          say(`Now, if your partner were to pass away, your income of ${fmtM(c1Income)} would comfortably cover the remaining outgoings of ${fmtM(remainingOutgoings)} — so there's no shortfall there.`);
          say(`However, if you were to pass away, your partner's income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a monthly shortfall of ${fmtM(fibIfCDies)}.`);
          say(`So I'm recommending a Family Income Benefit policy on your life that would pay ${fmtM(fibIfCDies)} per month to your partner if you die — for ${fibTerm} years, until your youngest reaches 21. Does that make sense?`); cr();
        } else if (fibIfPDies > 0 && fibIfCDies <= 0) {
          say(`Now, if you were to pass away, your partner's income of ${fmtM(c2Income)} would comfortably cover the remaining outgoings of ${fmtM(remainingOutgoings)} — no shortfall there.`);
          say(`However, if your partner were to pass away, your income of ${fmtM(c1Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a monthly shortfall of ${fmtM(fibIfPDies)}.`);
          say(`So I'm recommending a Family Income Benefit policy on your partner's life that would pay ${fmtM(fibIfPDies)} per month to you if your partner dies — for ${fibTerm} years, until your youngest reaches 21. Does that make sense?`); cr();
        } else if (fibIfCDies > 0 && fibIfPDies > 0) {
          say(`Now, if you pass away, your partner's income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a shortfall of ${fmtM(fibIfCDies)}.`);
          say(`And if your partner passes away, your income of ${fmtM(c1Income)} wouldn't cover the remaining outgoings either — there'd be a shortfall of ${fmtM(fibIfPDies)}.`);
          say(`So I'm recommending Family Income Benefit on both lives — ${fmtM(fibIfCDies)} per month on your life, and ${fmtM(fibIfPDies)} per month on your partner's life — both running for ${fibTerm} years until your youngest reaches 21. Does that make sense?`); cr();
        } else {
          say(`Now, after the mortgage is paid off, you'd both actually have enough income individually to cover the remaining outgoings — so there's no income shortfall in either scenario. I won't recommend additional life cover on top of the mortgage protection unless there's anything specific you'd like to leave behind.`); cr();
        }
      } else {
        say(`So I'm recommending a Family Income Benefit policy for ${fmtM(remainingOutgoings + BUFFER)} per month, payable to your children's guardian if you die, for ${fibTerm} years until your youngest reaches 21. Does that make sense?`); cr();
      }
    }

    section(`${sNum(2)}. PRE-PRICE CHECK — SUMMARY`);
    const summaryLines = buildSummaryLines();
    say(`Great. So to summarise what we're putting in place:`);
    summaryLines.forEach(l => lines.push(l));
    say(`Before we discuss pricing, I just want to make sure you're happy with all of that and agree with the advice — there's no point talking about prices for something you don't like the sound of. Are you happy with everything I've just outlined?`); cr();
    say("Great, and do you have any questions at all?"); cr();

    section(`${sNum(3)}. PRICE CORE`);
    say(`Great. So I've had a look across the market and [Provider] are currently offering the most competitive premiums — that's £[X] per month in total.`);
    say(`I always say it's important to get the right balance between good protection and an affordable premium. This should give you peace of mind, not have you worrying about the payments every month. Is £[X] comfortable for you on a monthly basis?`); cr();
    note("If NO: ask what monthly amount works. If YES: move to IP upsell below.");

    section(`${sNum(4)}. INCOME PROTECTION UPSELL`);
    say(`Just before we finalise that, I mentioned at the start that I've looked at something that could support you financially if you were off work due to illness or injury.`);

    if (hasP && ipC1Amount > 0) {
      say(`If you were unable to work, your partner's income of ${fmtM(c2Income)} wouldn't be enough to cover the full household outgoings of ${fmtM(totalOutgoings)} — there would be a shortfall of ${fmtM(ipC1Amount)} per month. So I'm recommending Income Protection for you covering ${fmtM(ipC1Amount)} per month.`);
    } else if (!hasP) {
      say(`Obviously if you can't work you won't be able to cover your bills, so I'm recommending Income Protection covering ${fmtM(ipC1Amount)} per month — that's 60% of your gross salary, which is the maximum insurable amount.`);
    }
    if (hasP && ipC2Amount > 0) {
      say(`And if your partner were unable to work, your income of ${fmtM(c1Income)} wouldn't cover the full outgoings either — there'd be a shortfall of ${fmtM(ipC2Amount)} per month. So I'm also recommending Income Protection for your partner for ${fmtM(ipC2Amount)} per month.`);
    }

    say(`The product is called Income Protection. Have you heard of it before?`); cr();
    say(`So, Income Protection pays out a monthly amount if you're unable to work because of illness, injury or accident — from critical illness like cancer, all the way to mental health like depression, or something like a broken leg. If your doctor signs you off work for any reason, the policy pays out.`); cr();
    say(`The policy pays every month until you return to work — however long that takes. Or if you can never return to work, it pays out right up to your state pension age of ${cSPA || 68}. And unlike most insurance, making a claim doesn't affect your premiums.`);
    say(`There's one more thing to cover — the Deferred Period. That's the length of time you have to be off work before the policy starts paying out.`);
    if (ipC1Amount > 0) say(`For you, I'd recommend a deferred period of ${c1Deferral.months} — ${c1Deferral.text}.`);
    if (hasP && ipC2Amount > 0) say(`For your partner, I'd recommend a deferred period of ${c2Deferral.months} — ${c2Deferral.text}.`);
    say(`Does all of that make sense? Do you feel that would be beneficial for you?`); cr();

    section(`${sNum(5)}. PRICE UPSELL & CLOSE`);
    say(`So for the Income Protection, [Provider] are quoting £[X] per month.`);
    say(`So in total you'd be looking at £[X] for the life cover, and £[X] for the Income Protection — covering you on all fronts. Is that still comfortable monthly?`); cr();
    note("If NO: just do life cover now, revisit IP later. If YES: go to close.");
    say(`Brilliant. All we need to do now is run through a few medical questions to make sure [Provider] are happy to cover you — based on what you've told me, that should be straightforward. Then we'll get everything set up for you.`);
    say(`While those questions load, let me just tell you about a few of the additional benefits you get with [Provider]… [list 3 benefits and payout rate]`);

    return lines.join("\n");
  }

  function copyScript() {
    navigator.clipboard.writeText(buildScriptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{background:DARK,borderRadius:20,padding:"24px 22px",marginTop:16,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",border:`1px solid ${BORDER}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <div>
          <p style={{fontSize:15,fontWeight:800,color:TEXT,margin:"0 0 3px 0",letterSpacing:"-0.3px"}}>📞 Call Script</p>
          <p style={{fontSize:11,color:AMBER,margin:0,letterSpacing:"0.1em",fontWeight:700}}>NUMBERS AUTO-FILLED FROM FACT-FIND · TAP TO EXPAND</p>
        </div>
        <button onClick={copyScript} style={{background:copied?"rgba(16,185,129,0.15)":"rgba(245,158,11,0.1)",border:`1px solid ${copied?"rgba(16,185,129,0.3)":"rgba(245,158,11,0.3)"}`,borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:700,color:copied?EMERALD:AMBER,cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}>
          {copied ? "✓ Copied!" : "📋 Copy Script"}
        </button>
      </div>

      <hr style={{border:"none",borderTop:`1px solid ${BORDER}`,margin:"16px 0"}} />

      <ScriptSection title="Call Intro" icon="👋" defaultOpen={true}>
        <ScriptLine text={`"Hi, is that ${C.firstName || "[Client]"}?"`} />
        <CustomerLine />
        <ScriptLine text={`"Hi ${C.firstName || "[Client]"}, it's [Your Name] calling back. Before we go through your options can I just ask you to confirm the first line of your address and postcode for Data Protection please?"`} />
        <CustomerLine />
        <ScriptLine text={`"That's great, thanks. I've completed my research and I can now run through the recommendation and quotes with you. This is based on what I would do if I were in your shoes, but we can make tweaks once we've gone through it, ok?"`} />
        <CustomerLine />
        <ScriptLine text={`"Do you have a pen and paper to jot this all down?"`} />
      </ScriptSection>

      {hasMortgage && (
        <ScriptSection title="Mortgage Cover" icon="🏠">
          <ScriptLine text={`"So the first thing I'm going to recommend is a ${hasP ? "joint" : "single"} policy for ${fmt(mortgageBalance)} over ${mortgageTerm} years, which will pay off your mortgage if ${hasP ? "you or your partner" : "you"} pass away."`} />
          <ScriptLine text={`"Because you have a ${isRepayment ? "repayment" : "interest only"} mortgage I'm recommending a ${isRepayment ? "decreasing" : "level"} basis — the amount insured will ${isRepayment ? "reduce in line with your mortgage balance" : "stay the same"}, so the mortgage is always fully covered. Does that make sense?"`} />
          <CustomerLine />
        </ScriptSection>
      )}

      {hasFIB && (
        <ScriptSection title="Family Income Benefit" icon="👨‍👩‍👧">
          {hasMortgage ? <>
            <ScriptLine text={`"Great. The next thing I want to recommend is additional protection for the family. The total household outgoings including the mortgage are ${fmtM(totalOutgoings)}, and the mortgage payment is ${fmtM(mortgagePayment)}, correct?"`} />
            <CustomerLine />
            <ScriptLine text={`"So if one of you were to pass away and the mortgage was paid off, the remaining outgoings would reduce to ${fmtM(remainingOutgoings)}. Does that make sense?"`} />
            <CustomerLine />
          </> : <>
            <ScriptLine text={`"So you told me earlier the total household outgoings are ${fmtM(totalOutgoings)}, correct?"`} />
            <CustomerLine />
          </>}

          {hasP && fibIfCDies > 0 && fibIfPDies <= 0 && <>
            <ScriptLine text={`"Now, if your partner were to pass away, your income of ${fmtM(c1Income)} would comfortably cover the remaining outgoings of ${fmtM(remainingOutgoings)} — no shortfall there."`} />
            <ScriptLine text={`"However, if you were to pass away, your partner's income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a monthly shortfall of ${fmtM(fibIfCDies)}."`} />
            <ScriptLine text={`"So I'm recommending a Family Income Benefit policy on your life — paying ${fmtM(fibIfCDies)} per month to your partner if you die, for ${fibTerm} years until your youngest reaches 21. Does that make sense?"`} />
          </>}

          {hasP && fibIfPDies > 0 && fibIfCDies <= 0 && <>
            <ScriptLine text={`"Now, if you were to pass away, your partner's income of ${fmtM(c2Income)} would comfortably cover the remaining outgoings of ${fmtM(remainingOutgoings)} — no shortfall there."`} />
            <ScriptLine text={`"However, if your partner were to pass away, your income of ${fmtM(c1Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a monthly shortfall of ${fmtM(fibIfPDies)}."`} />
            <ScriptLine text={`"So I'm recommending a Family Income Benefit policy on your partner's life — paying ${fmtM(fibIfPDies)} per month to you if your partner dies, for ${fibTerm} years until your youngest reaches 21. Does that make sense?"`} />
          </>}

          {hasP && fibIfCDies > 0 && fibIfPDies > 0 && <>
            <ScriptLine text={`"Now, if you pass away, your partner's income of ${fmtM(c2Income)} wouldn't be enough to cover the remaining outgoings of ${fmtM(remainingOutgoings)} — there'd be a shortfall of ${fmtM(fibIfCDies)}."`} />
            <ScriptLine text={`"And if your partner passes away, your income of ${fmtM(c1Income)} wouldn't cover the remaining outgoings either — there'd be a shortfall of ${fmtM(fibIfPDies)}."`} />
            <ScriptLine text={`"So I'm recommending Family Income Benefit on both lives — ${fmtM(fibIfCDies)} per month on your life, and ${fmtM(fibIfPDies)} per month on your partner's life — both for ${fibTerm} years until your youngest reaches 21. Does that make sense?"`} />
          </>}

          {hasP && fibIfCDies <= 0 && fibIfPDies <= 0 && <>
            <ScriptLine text={`"Now, after the mortgage is paid off you'd both actually have enough income to cover the remaining outgoings individually — so there's no income shortfall in either scenario. I won't recommend additional life cover on top of the mortgage protection unless there's something specific you'd like to leave behind."`} />
          </>}

          {!hasP && <>
            <ScriptLine text={`"So I'm recommending a Family Income Benefit policy for ${fmtM(remainingOutgoings + BUFFER)} per month, payable to your children's guardian if you die, for ${fibTerm} years until your youngest reaches 21. Does that make sense?"`} />
          </>}
          <CustomerLine />
        </ScriptSection>
      )}

      <ScriptSection title={`${sNum(2)}. Pre-Price Check`} icon="✅">
        <ScriptLine text={`"Great. So to summarise what we're putting in place:"`} />
        {buildSummaryLines().map((line, i) => (
          <div key={i} style={{fontSize:14,color:TEXTMID,padding:"6px 14px",background:DARKER,borderRadius:8,margin:"4px 0",borderLeft:`2px solid ${AMBER}`}}>{line}</div>
        ))}
        <ScriptLine text={`"Before we discuss pricing, I just want to make sure you're happy with all of that and agree with the advice — there's no point talking about prices for something you don't like the sound of. Are you happy with everything I've just outlined?"`} />
        <CustomerLine />
        <ScriptLine text={`"Great, and do you have any questions at all?"`} />
        <CustomerLine />
      </ScriptSection>

      <ScriptSection title={`${sNum(3)}. Price Core`} icon="💷">
        <ScriptLine text={`"Great. So I've had a look across the market and [Provider] are currently offering the most competitive premiums — that's £[X] per month in total."`} />
        <ScriptLine text={`"I always say it's important to get the right balance between good protection and an affordable premium. This should give you peace of mind, not have you worrying about the payments every month. Is £[X] comfortable for you on a monthly basis?"`} />
        <CustomerLine />
        <NoteBox>
          <strong>If NO:</strong> "Ok, what sort of monthly amount would work for you so I can look at what's available within your budget?"<br/><br/>
          <strong>If YES:</strong> Move to Income Protection upsell.
        </NoteBox>
      </ScriptSection>

      <ScriptSection title={`${sNum(4)}. Income Protection Upsell`} icon="🏥">
        <ScriptLine text={`"Just before we finalise that, I mentioned at the start that I've looked at something that could support you financially if you were off work due to illness or injury."`} />

        {(ipC1Amount > 0) && (
          <ScriptLine text={`"If you were unable to work, your partner's income of ${fmtM(c2Income)} wouldn't be enough to cover the full household outgoings of ${fmtM(totalOutgoings)} — there would be a shortfall of ${fmtM(ipC1Amount)} per month. So I'm recommending Income Protection for you covering ${fmtM(ipC1Amount)} per month."`} />
        )}
        {(!hasP) && (
          <ScriptLine text={`"Obviously if you can't work you won't be able to cover your bills, so I'm recommending Income Protection covering ${fmtM(ipC1Amount)} per month — that's 60% of your gross salary, the maximum insurable amount."`} />
        )}
        {hasP && ipC2Amount > 0 && (
          <ScriptLine text={`"And if your partner were unable to work, your income of ${fmtM(c1Income)} wouldn't cover the full outgoings either — there'd be a shortfall of ${fmtM(ipC2Amount)} per month. So I'm also recommending Income Protection for your partner for ${fmtM(ipC2Amount)} per month."`} />
        )}

        <ScriptLine text={`"The product is called Income Protection — have you heard of it before?"`} />
        <CustomerLine />
        <ScriptLine text={`"So, Income Protection pays out a monthly amount if you're unable to work because of illness, injury or accident — from critical illness like cancer, all the way to mental health or something like a broken leg. If your doctor signs you off for any reason, the policy pays out. Does that make sense?"`} />
        <CustomerLine />
        <ScriptLine text={`"The policy pays every month until you return to work — however long that takes. Or if you can never return, it pays right up to your state pension age of ${cSPA || 68}. And unlike most insurance, making a claim doesn't affect your premiums."`} />
        <ScriptLine text={`"There's one more thing — the Deferred Period. That's how long you have to be off work before the policy starts paying out."`} />

        {ipC1Amount > 0 && <ScriptLine text={`"For you, I'd recommend a deferred period of ${c1Deferral.months} — ${c1Deferral.text}."`} />}
        {hasP && ipC2Amount > 0 && <ScriptLine text={`"For your partner, I'd recommend a deferred period of ${c2Deferral.months} — ${c2Deferral.text}."`} />}

        <ScriptLine text={`"Does all of that make sense? Do you feel that would be beneficial for you?"`} />
        <CustomerLine />
      </ScriptSection>

      <ScriptSection title={`${sNum(5)}. Price Upsell & Close`} icon="🤝">
        <ScriptLine text={`"So for the Income Protection, [Provider] are quoting £[X] per month."`} />
        <ScriptLine text={`"So in total you'd be looking at £[X] for the life cover, and £[X] for the Income Protection — covering you on all fronts. Is that still comfortable monthly?"`} />
        <CustomerLine />
        <NoteBox>
          <strong>If NO:</strong> "Ok, we can just get the life cover sorted now and come back to the Income Protection in the future if you change your mind."<br/><br/>
          <strong>If YES:</strong> Move to close.
        </NoteBox>
        <ScriptLine text={`"Brilliant. All we need to do now is run through a few medical questions to make sure [Provider] are happy to cover you — based on what you've told me, that should be straightforward. Then we'll get everything set up for you."`} />
        <ScriptLine text={`"While those questions load, let me tell you about a few of the additional benefits you get with [Provider]… [list 3 benefits and payout rate]"`} />
      </ScriptSection>

    </div>
  );
}

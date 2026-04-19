import { useState } from "react";

function fmt(n) { return n ? `£${Math.round(n).toLocaleString()}` : "£—"; }
function fmtM(n) { return n ? `£${Math.round(n).toLocaleString()}/month` : "£—/month"; }

function ScriptLine({ text, isCustomer }) {
  if (isCustomer) return <p style={{fontSize:13,color:"#94a3b8",fontStyle:"italic",margin:"4px 0 4px 20px"}}>(Customer responds)</p>;
  return <p style={{fontSize:15,color:"#1e293b",lineHeight:1.7,margin:"8px 0",background:"#f0f7ff",borderLeft:"3px solid #6366f1",padding:"10px 14px",borderRadius:"0 8px 8px 0"}}>{text}</p>;
}

function ScriptSection({ title, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen||false);
  return (
    <div style={{marginBottom:8,border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:open?"#6366f1":"#f8fafc",color:open?"#fff":"#1e293b",border:"none",padding:"14px 16px",textAlign:"left",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        {title}<span style={{fontSize:16}}>{open?"▲":"▼"}</span>
      </button>
      {open && <div style={{padding:16,background:"#fff"}}>{children}</div>}
    </div>
  );
}

function Note({ children }) {
  return <div style={{background:"#fef9c3",borderRadius:8,padding:12,margin:"8px 0",fontSize:13,lineHeight:1.6}}>{children}</div>;
}

export default function ScriptGuide({ C, P, hasP, mortgages, numKids, kidAges, cSPA }) {
  const c1Income = parseFloat(C.takehome)||0;
  const c2Income = parseFloat(P.takehome)||0;
  const totalOutgoings = parseFloat(C.outgoings)||0;
  const mortgagePayment = mortgages.reduce((s,m)=>s+(parseFloat(m.payment)||0),0);
  const mortgageBalance = mortgages.reduce((s,m)=>s+(parseFloat(m.balance)||0),0);
  const mortgageTerm = mortgages[0]?.term||"—";
  const isRepayment = (mortgages[0]?.type||"repayment")==="repayment";
  const remainingOutgoings = totalOutgoings - mortgagePayment;
  const BUFFER = 500;
  const hasMortgage = mortgageBalance > 0;
  const youngChildAge = kidAges.length>0 ? Math.min(...kidAges.map(a=>parseInt(a)||99)) : null;
  const fibTerm = youngChildAge!==null ? Math.max(0,21-youngChildAge) : null;
  const c1Shortfall = Math.max(0,(remainingOutgoings+BUFFER)-c1Income);
  const c2Shortfall = Math.max(0,(remainingOutgoings+BUFFER)-c2Income);
  const c1Gross60 = (parseFloat(C.gross)||0)*0.6/12;
  const sectionNum = (n) => `${(hasMortgage?1:0)+(numKids>0?1:0)+n}`;

  return (
    <div style={{background:"#fff",borderRadius:16,padding:20,marginTop:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
      <p style={{fontSize:15,fontWeight:700,color:"#1e293b",margin:"0 0 4px 0"}}>📞 Call Script Guide</p>
      <p style={{fontSize:13,color:"#64748b",margin:"0 0 16px 0"}}>Numbers filled in automatically from the fact-find. Tap each section to expand.</p>

      <ScriptSection title="1. Call Intro" defaultOpen={true}>
        <ScriptLine text={`"Hi, is that ${C.firstName||"[Client]"}?"`} />
        <ScriptLine isCustomer />
        <ScriptLine text={`"Hi ${C.firstName||"[Client]"}, it's [Your Name] calling back. Before we go through your options can I just ask you to confirm the first line of your address and postcode for me again for Data Protection please?"`} />
        <ScriptLine isCustomer />
        <ScriptLine text={`"That's great, thanks. Right, I've completed my research so I can now run through the recommendation and quotes with you. This is based on what I would do if I were in your shoes, but of course we can make some tweaks if you want to once we've gone through it, ok?"`} />
        <ScriptLine isCustomer />
        <ScriptLine text={`"Do you have a pen and paper with you to jot this all down?"`} />
      </ScriptSection>

      {hasMortgage && (
        <ScriptSection title="2. Mortgage Cover">
          <ScriptLine text={`"So the first thing I'm going to recommend is a ${hasP?"joint":"single"} policy for ${fmt(mortgageBalance)} over ${mortgageTerm} years, which will pay off your mortgage if ${hasP?"you or your partner":"you"} pass away."`} />
          <ScriptLine text={`"Now, because you have a ${isRepayment?"repayment":"interest only"} mortgage I'm recommending that you set up this policy on a ${isRepayment?"decreasing":"level"} basis."`} />
          <ScriptLine text={`"What this means is that the amount you're insured for will ${isRepayment?"reduce in line with your mortgage balance":"stay the same"}, so the mortgage will be paid off in full if ${hasP?"you or your partner":"you"} die at any point during the mortgage term. Does that make sense?"`} />
          <ScriptLine isCustomer />
        </ScriptSection>
      )}

      {numKids > 0 && (
        <ScriptSection title={`${hasMortgage?"3":"2"}. Family Income Benefit`}>
          {hasMortgage ? <>
            <ScriptLine text={`"Great. So the next thing I'm going to recommend is some additional protection for the family. You told me earlier that the total household outgoings, including your mortgage, are ${fmtM(totalOutgoings)}, and that the mortgage payment is ${fmtM(mortgagePayment)}, correct?"`} />
            <ScriptLine isCustomer />
            <ScriptLine text={`"Ok, so if one of you were to pass away, and the mortgage was paid off, the total household outgoings would reduce to ${fmtM(remainingOutgoings)} because there would no longer be a monthly mortgage payment. Does that make sense?"`} />
            <ScriptLine isCustomer />
          </> : <>
            <ScriptLine text={`"So, you told me earlier that the total household outgoings are ${fmtM(totalOutgoings)}, correct?"`} />
            <ScriptLine isCustomer />
          </>}

          {hasP && c1Shortfall>0 && c2Shortfall<=0 && <>
            <ScriptLine text={`"Now, if your partner were to pass away, your monthly take home of ${fmtM(c1Income)} would be enough to cover the full outgoings."`} />
            <ScriptLine text={`"However, if you pass away, your partner's monthly take-home earnings are ${fmtM(c2Income)} so they wouldn't have enough money each month to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a monthly shortfall of ${fmtM(c2Shortfall)}."`} />
            <ScriptLine text={`"So, what I'm recommending is an additional Life Insurance policy that will pay out ${fmtM(c2Shortfall)} per month to your partner if you die${fibTerm?`, running for ${fibTerm} years until your youngest child reaches age 21`:""}, to make sure they have enough money each month. Does that make sense?"`} />
          </>}

          {hasP && c2Shortfall>0 && c1Shortfall<=0 && <>
            <ScriptLine text={`"Now, if you were to pass away, your partner's monthly take home of ${fmtM(c2Income)} would be enough to cover the full outgoings."`} />
            <ScriptLine text={`"However, if your partner passes away, your monthly take-home earnings are ${fmtM(c1Income)} so you wouldn't have enough money each month to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a monthly shortfall of ${fmtM(c1Shortfall)}."`} />
            <ScriptLine text={`"So, what I'm recommending is an additional Life Insurance policy that will pay out ${fmtM(c1Shortfall)} per month to you if your partner dies${fibTerm?`, running for ${fibTerm} years until your youngest child reaches age 21`:""}, to make sure you have enough money each month. Does that make sense?"`} />
          </>}

          {hasP && c1Shortfall>0 && c2Shortfall>0 && <>
            <ScriptLine text={`"Now, if you pass away, your partner's monthly take-home earnings are ${fmtM(c2Income)} so they wouldn't have enough money each month to cover the remaining outgoings of ${fmtM(remainingOutgoings)}. There would be a monthly shortfall of ${fmtM(c2Shortfall)}."`} />
            <ScriptLine text={`"The same can be said for if your partner passes away. Your monthly take-home earnings are ${fmtM(c1Income)} so you wouldn't have enough money each month either. In that scenario, there would be a monthly shortfall of ${fmtM(c1Shortfall)}."`} />
            <ScriptLine text={`"So, what I'm recommending is for each of you to have an additional Life Insurance that will pay out to the other person if you die. Your policy would pay out ${fmtM(c2Shortfall)} per month to your partner, and your partner's policy would pay out ${fmtM(c1Shortfall)} per month to you.${fibTerm?` Both policies would run for ${fibTerm} years until your youngest child reaches age 21.`:""} Does that make sense?"`} />
          </>}

          {!hasP && <>
            <ScriptLine text={`"So, what I'm recommending is a Life Insurance policy that will pay out ${fmtM(remainingOutgoings+BUFFER)} per month to the guardian of your children if you die${fibTerm?`, for ${fibTerm} years until your youngest child reaches age 21`:""}, to make sure there is enough money to raise the children. Does that make sense?"`} />
          </>}
          <ScriptLine isCustomer />
        </ScriptSection>
      )}

      <ScriptSection title={`${sectionNum(2)}. Pre-Price Check`}>
        <ScriptLine text={`"Great, so to summarise, we're looking at… [recap all products, amounts and terms]."`} />
        <ScriptLine text={`"Before we discuss the pricing, I just want to check you're happy with all of that and agree with the advice. There's not much point talking about prices for a policy you don't like the sound of, so I just want to check that with you first."`} />
        <ScriptLine isCustomer />
        <ScriptLine text={`"Great, and do you have any questions at all?"`} />
        <ScriptLine isCustomer />
      </ScriptSection>

      <ScriptSection title={`${sectionNum(3)}. Price Core`}>
        <ScriptLine text={`"Great, so I've had a look across the market and [Provider] are currently offering the most competitive premiums, which is £[X] per month in total."`} />
        <ScriptLine text={`"Now, I always say it's important we get the right balance between making sure you have a good level of protection in place and making sure the premium is affordable. This is supposed to give you peace of mind, not have you worrying about the payments every month. With that being said, is £[X] comfortable for you on a monthly basis?"`} />
        <ScriptLine isCustomer />
        <Note>
          <strong>If NO:</strong> "Ok, what sort of amount would be comfortable for you monthly so I can have a look at what would be available within your budget?"<br/><br/>
          <strong>If YES:</strong> Move to Income Protection upsell.
        </Note>
      </ScriptSection>

      <ScriptSection title={`${sectionNum(4)}. Income Protection Upsell`}>
        <ScriptLine text={`"Just before we do that, I mentioned at the start of the call that I've looked at something that could support you if you're off work because of an illness or injury. The reason I wanted to look at that for you is because I think you could be in a fairly difficult position financially in that scenario."`} />
        {hasP
          ? <ScriptLine text={`"Your partner's monthly take home pay is ${fmtM(c2Income)} which ${c2Income>=(totalOutgoings-BUFFER)?"would be enough to cover everything if you can't work":"wouldn't be enough to cover the full outgoings if you can't work"}, so I'm recommending ${c2Income<(totalOutgoings-BUFFER)?`you cover the shortfall of ${fmtM(Math.min(c1Shortfall,c1Gross60))} per month`:`income protection so you're covered if you're off work for any reason`}."`} />
          : <ScriptLine text={`"Obviously, if you can't work, you're not going to be able to cover your bills. So, I'm recommending that you cover up to ${fmtM(c1Gross60)} per month — which is 60% of your gross salary and the maximum insurable amount."`} />
        }
        <ScriptLine text={`"So, the product is called Income Protection. Have you heard of it before?"`} />
        <ScriptLine isCustomer />
        <ScriptLine text={`"So, Income Protection pays out a monthly amount if you are unable to work because of an illness, injury or accident. It covers everything from critical illnesses like cancer all the way to mental illnesses like depression or injuries like a broken leg or back problems. Very simply, if your doctor signs you off as unfit for work, whatever the reason, you can claim on the policy and it will pay out whilst you're off work. Does that make sense?"`} />
        <ScriptLine isCustomer />
        <ScriptLine text={`"The policy will continue to pay you every month until you are able to return to work, however long that may take. Or if you're unable to go back to work ever again, it will keep paying out until your state pension age of ${cSPA||68}. And unlike most insurances, making a claim doesn't impact your premiums, so you're encouraged to claim whenever you need to."`} />
        <ScriptLine text={`"Now, there's one other thing to consider which is something called the Deferred Period — in simple terms, the length of time you have to be off work before your policy starts paying out."`} />
        <Note>
          <strong>No savings / no sick pay:</strong> "This is the shortest deferred period available. You don't have any savings or sick pay so you'd need the monthly payment to kick in as soon as possible."<br/><br/>
          <strong>Has sick pay:</strong> {`"You get ${C.sickPay||"sick pay"} from your employer, so you don't need your policy to start paying out until that ends. Having a longer deferred period instead of 1 month makes the monthly premium a lot cheaper."`}<br/><br/>
          <strong>Has savings:</strong> {`"You have ${fmt(parseFloat(C.savings))} in savings which could tide you over if you were off work, so by having a longer deferred period the monthly premium will be a lot cheaper."`}
        </Note>
        <ScriptLine text={`"Any questions on all of that? Do you feel that would be beneficial for you?"`} />
        <ScriptLine isCustomer />
      </ScriptSection>

      <ScriptSection title={`${sectionNum(5)}. Price Upsell & Close`}>
        <ScriptLine text={`"So, for the Income Protection, the most competitive provider on the market is [Provider] and they are quoting a price of £[X] per month."`} />
        <ScriptLine text={`"So, you'd be looking at £[X] for the Life Insurance, and then £[X] for the Income Protection which will cover you on all fronts. Is that still comfortable for you on a monthly basis?"`} />
        <ScriptLine isCustomer />
        <Note>
          <strong>If NO:</strong> "Ok, we can just get the Life Insurance sorted now then, and can always come back to the Income Protection in the future if you change your mind."<br/><br/>
          <strong>If YES:</strong> Move to close.
        </Note>
        <ScriptLine text={`"Ok great. So, all we need to do now is run through a few medical questions just to make sure [Provider] are happy to cover you which, based on what you've already told me, should be fine. And then we'll get everything sorted for you."`} />
        <ScriptLine text={`"While these questions are loading, I'm just going to make you aware of some additional benefits you get from [Provider]… [list 3 provider benefits and payout rate]"`} />
      </ScriptSection>

    </div>
  );
}

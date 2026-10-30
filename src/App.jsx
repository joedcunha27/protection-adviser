import { useState } from "react";

const A="#f59e0b",DARK="#0a0f1e",CARD="#111827",INNER="#1a2235",BORDER="#1f2937",
      BORDERL="#374151",TEXT="#f9fafb",TEXTM="#d1d5db",TEXTD="#9ca3af",
      EMERALD="#10b981",ROSE="#f43f5e",BLUE="#3b82f6";
const MODEL="claude-sonnet-4-5";

const fmt=n=>n?`£${Number(n).toLocaleString()}`:"—";
const fmtM=n=>n?`£${Number(n).toLocaleString()}/mo`:"—";
function calcAge(d){if(!d)return null;const b=new Date(d),t=new Date();let a=t.getFullYear()-b.getFullYear();if(t.getMonth()-b.getMonth()<0||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;return a>=0&&a<120?a:null;}
function getSPA(d){if(!d)return 68;const b=new Date(d);if(b<new Date(1960,3,6))return 66;if(b<new Date(1977,3,6))return 67;return 68;}

// ── TWO-CALL STEPS ────────────────────────────────────────────────────────────
// Call 1 = Fact Find. Call 2 = Pitch.
const TWO_CALL_STEPS = [

  // ── CALL 1: FACT FIND ──────────────────────────────────────────────────────

  { id:"c1_intro", section:"Introduction", script:"Hi, is that [firstName]?",
    subScript:"Hi [firstName], it's [Your Name] calling from First Thought Financial — I'm calling because you recently made an enquiry about Income Protection. I just need to run through a quick fact-find with you to make sure I put together the right recommendation, and then I'll go away and research the best options across the market, and call you back with the quotes. Does that sound OK?",
    type:"tap", options:["Yes, go ahead","Not a good time"], note:"",
    next:"IF:options[0]:c1_idd|ELSE:c1_bad_time" },

  { id:"c1_bad_time", section:"Introduction", script:"No problem — when would be a better time to call you back?",
    type:"info", options:[], note:"Note the callback time and end the call.", next:"ALWAYS:c1_intro" },

  { id:"c1_idd", section:"Introduction",
    script:"Before we start, I'm required to let you know that I act as an independent protection broker, which means I search the whole market on your behalf rather than just one insurer. I get paid by commission from the insurer when a policy is placed, and there's no charge to you at any point. Is that all fine?",
    type:"tap", options:["Yes, that's fine","Tell me more"], note:"",
    followUps:[
      { optionIndex:1, script:"I'll search across all the major providers including Aviva, Legal & General, Zurich, Royal London, LV= and others. You get independent advice at no cost to you — the insurers pay me a commission when you take a policy out. Happy to continue?", inputs:[] }
    ],
    next:"ALWAYS:c1_dpa" },

  { id:"c1_dpa", section:"Introduction",
    script:"Great. Can I just confirm your full name, date of birth, and the first line of your address and postcode for Data Protection?",
    type:"input",
    inputs:[{key:"firstName",label:"First Name",placeholder:"John"},{key:"lastName",label:"Last Name",placeholder:"Smith"},{key:"dob",label:"Date of Birth",inputType:"date"},{key:"address",label:"Address / Postcode",placeholder:"e.g. 12 High Street, SW1A 1AA"}],
    note:"", next:"ALWAYS:c1_overview" },

  { id:"c1_overview", section:"Situation",
    script:"Great, thanks. So let me just get a brief overview of your situation — what made you look into Income Protection, and where are you at right now?",
    type:"info", options:[], note:"Listen carefully. Let them talk — don't cut them off. Note any key details.", next:"ALWAYS:c1_marital" },

  { id:"c1_marital", section:"Situation",
    script:"Are you single, or do you have a partner or spouse?",
    type:"tap", options:["Single","Partner / Spouse"], ffKey:"marital", note:"",
    followUps:[
      { optionIndex:1, script:"What's your partner's name and date of birth?", inputs:[{key:"partnerFirstName",label:"Partner's First Name",placeholder:"Jane"},{key:"partnerDob",label:"Partner's Date of Birth",inputType:"date"}] }
    ],
    next:"ALWAYS:c1_occupation" },

  { id:"c1_occupation", section:"Situation",
    script:"What do you do for work?",
    type:"input",
    inputs:[{key:"occupation",label:"Occupation",placeholder:"e.g. Carpenter, Nurse, Project Manager"},{key:"empType",label:"Employment Type",type:"select",options:["Employed","Self-employed","Ltd Company Director","Contractor"]}],
    note:"", next:"ALWAYS:c1_income" },

  { id:"c1_income", section:"Situation",
    script:"And what's your annual income, and what does that work out as take-home after tax each month?",
    type:"input",
    inputs:[{key:"grossIncome",label:"Gross Annual Income (£)",placeholder:"50000",inputType:"number"},{key:"takeHome",label:"Monthly Take-home (£)",placeholder:"3200",inputType:"number"}],
    note:"", next:"ALWAYS:c1_housing" },

  { id:"c1_housing", section:"Situation",
    script:"Are you renting or do you have a mortgage?",
    type:"tap", options:["Mortgage","Renting","Own outright","Living with family"], ffKey:"housing", note:"",
    followUps:[
      { optionIndex:0, script:"What's the outstanding balance, remaining term, and monthly payment?", inputs:[{key:"mortgageBalance",label:"Outstanding Balance (£)",placeholder:"250000",inputType:"number"},{key:"mortgageTerm",label:"Remaining Term (years)",placeholder:"22",inputType:"number"},{key:"mortgagePayment",label:"Monthly Payment (£)",placeholder:"1200",inputType:"number"},{key:"mortgageType",label:"Repayment Type",type:"select",options:["Repayment","Interest Only","Part & Part"]}] }
    ],
    next:"ALWAYS:c1_kids" },

  { id:"c1_kids", section:"Situation",
    script:"Do you have any dependent children?",
    type:"tap", options:["No children","Yes — 1","Yes — 2","Yes — 3 or more"], ffKey:"hasKids", note:"",
    followUps:[
      { optionIndex:1, script:"How old are they?", inputs:[{key:"kidAge1",label:"Child 1 — Age",placeholder:"e.g. 7",inputType:"number"}] },
      { optionIndex:2, script:"How old are they?", inputs:[{key:"kidAge1",label:"Child 1 — Age",placeholder:"e.g. 4",inputType:"number"},{key:"kidAge2",label:"Child 2 — Age",placeholder:"e.g. 7",inputType:"number"}] },
      { optionIndex:3, script:"How old are they?", inputs:[{key:"kidAge1",label:"Child 1 — Age",placeholder:"e.g. 4",inputType:"number"},{key:"kidAge2",label:"Child 2 — Age",placeholder:"e.g. 7",inputType:"number"},{key:"kidAge3",label:"Child 3 — Age",placeholder:"e.g. 11",inputType:"number"}] },
    ],
    next:"ALWAYS:c1_health" },

  { id:"c1_health", section:"Situation",
    script:"Have you had any medical conditions or health issues — anything your GP is aware of?",
    type:"tap", options:["No — all clear","Yes — minor / managed","Yes — significant condition"], ffKey:"healthFlag", note:"",
    followUps:[
      { optionIndex:1, inputs:[{key:"healthDetail",label:"Brief overview",placeholder:"e.g. Type 2 diabetes, well controlled"}] },
      { optionIndex:2, inputs:[{key:"healthDetail",label:"Brief overview",placeholder:"e.g. Recent back surgery, still under consultant"}] },
    ],
    next:"ALWAYS:c1_existing_cover" },

  { id:"c1_existing_cover", section:"Situation",
    script:"Do you have any existing protection insurance in place at the moment — anything like Life Insurance or Income Protection?",
    type:"tap", options:["No existing cover","Yes — Life Insurance","Yes — Income Protection","Yes — multiple policies"], ffKey:"existingCover", note:"",
    followUps:[
      { optionIndex:1, inputs:[{key:"lifeProvider",label:"Provider",placeholder:"e.g. Aviva"},{key:"lifeCoverAmount",label:"Cover Amount (£)",placeholder:"300000",inputType:"number"},{key:"lifePremium",label:"Monthly Premium (£)",placeholder:"45",inputType:"number"}] },
      { optionIndex:2, inputs:[{key:"existingIPDetail",label:"Policy details",placeholder:"e.g. Aviva, £2000/mo, 3 month deferred"}] },
      { optionIndex:3, inputs:[{key:"existingCoverDetail",label:"Brief overview of all policies",placeholder:"e.g. Life with Aviva, IP with LV="}] },
    ],
    next:"ALWAYS:c1_explain_ip" },

  { id:"c1_explain_ip", section:"Income Protection",
    script:"So — Income Protection. Very quickly, let me explain what it is and how it works.",
    subScript:"Basically, if you were signed off work by your doctor due to illness or injury — and that covers everything from a broken leg to cancer to depression — the policy would pay you a set monthly amount, tax free, directly into your bank account. It keeps paying for as long as you're off work, right up to your retirement if it came to it. As long as your GP signs you off, you can claim. Does that make sense?",
    type:"tap", options:["Yes, makes sense","Can you explain more?"], note:"",
    next:"IF:options[0]:c1_outgoings|ELSE:c1_ip_more" },

  { id:"c1_ip_more", section:"Income Protection",
    script:"Think of it as a replacement salary paid by the insurer. So if you broke your leg and couldn't work for 3 months, the policy would pay your agreed monthly amount straight into your bank — like getting paid without working. It's that simple. And unlike most insurance, you can claim as many times as you need to. Clear now?",
    type:"tap", options:["Yes, got it"], note:"", next:"ALWAYS:c1_outgoings" },

  { id:"c1_outgoings", section:"Monthly Benefit",
    script:"OK, so to work out how much cover you'd need — what would you say your total monthly outgoings are? I'm talking everything: bills, food, rent or mortgage, travel, everything you spend in a month.",
    type:"input",
    inputs:[{key:"totalOutgoings",label:"Total Monthly Outgoings (£)",placeholder:"3500",inputType:"number"}],
    note:"", next:"ALWAYS:c1_benefit_check" },

  { id:"c1_benefit_check", section:"Monthly Benefit",
    script:"So if you weren't working, would [outgoings] per month be enough to cover everything — or would you need a bit more?",
    type:"tap", options:["Yes, that covers it","I'd need a bit more","I could manage on less"], ffKey:"benefitConfirm", note:"",
    followUps:[
      { optionIndex:1, script:"How much would you need?", inputs:[{key:"benefitAdjust",label:"Monthly amount needed (£)",placeholder:"e.g. 3800",inputType:"number"}] },
    ],
    next:"IF:marital=Partner / Spouse:c1_partner_contrib|ELSE:c1_sick_pay" },

  { id:"c1_partner_contrib", section:"Monthly Benefit",
    script:"Would your partner still be working and contributing to the bills if you were off sick — or would you need to cover everything yourself?",
    type:"tap", options:["Partner would contribute","I'd need to cover it all"], ffKey:"partnerContrib", note:"",
    followUps:[
      { optionIndex:0, script:"What's your partner's monthly take-home pay?", inputs:[{key:"partnerIncome",label:"Partner's Monthly Take-home (£)",placeholder:"2400",inputType:"number"}] },
    ],
    next:"ALWAYS:c1_sick_pay" },

  { id:"c1_sick_pay", section:"Waiting Period",
    script:"Do you get any sick pay from your employer?",
    type:"tap", options:["Yes — full pay","Yes — partial pay","No sick pay","Self-employed — no sick pay"], ffKey:"sickPayType", note:"",
    followUps:[
      { optionIndex:0, script:"How long does it last at full pay?", inputs:[{key:"sickPayDuration",label:"Duration",type:"select",options:["1 month","2 months","3 months","4–6 months","6+ months"]}] },
      { optionIndex:1, script:"How long does it last at partial pay?", inputs:[{key:"sickPayDuration",label:"Duration",type:"select",options:["1 month","2 months","3 months","4–6 months","6+ months"]}] },
      { optionIndex:2, script:"Do you have any savings you could fall back on?", inputs:[{key:"savingsLevel",label:"Savings",type:"select",options:["No / very little","1–2 months worth","3+ months worth"]}] },
      { optionIndex:3, script:"Do you have any savings you could fall back on?", inputs:[{key:"savingsLevel",label:"Savings",type:"select",options:["No / very little","1–2 months worth","3+ months worth"]}] },
    ],
    next:"ALWAYS:c1_deferred_explain" },

  { id:"c1_deferred_explain", section:"Waiting Period",
    script:"There's one more thing to consider — something called the deferred period. In simple terms, it's how long you have to be off work before the policy starts paying out. The longer you wait, the cheaper the premium. I'll use what you've just told me to recommend the most suitable one for you.",
    type:"info", options:[], note:"", next:"ALWAYS:c1_budget" },

  { id:"c1_budget", section:"Budget",
    script:"Just before I go away to research — do you have a rough monthly budget in mind for this, or would you prefer I just find the best policy and present the cost to you?",
    type:"tap", options:["I have a rough budget in mind","Just find the best option"], ffKey:"hasBudget", note:"",
    followUps:[
      { optionIndex:0, script:"What sort of monthly amount were you thinking?", inputs:[{key:"budget",label:"Monthly Budget (£)",placeholder:"40",inputType:"number"}] },
    ],
    next:"ALWAYS:c1_summarise" },

  { id:"c1_summarise", section:"Summary",
    script:"Great. So let me just recap what we've agreed — I'm going to look for an Income Protection policy that will pay you [benefit] per month if you're signed off work for any reason, with a deferred period of [DEFERRED]. [DEFERRED_REASON]. That'll run right up to your state pension age.\n\nDoes that all sound right?",
    type:"tap", options:["Yes, that's right","I want to change something"], ffKey:"summaryConfirm", note:"", next:"ALWAYS:c1_life_mention" },

  { id:"c1_life_mention", section:"Life Cover",
    script:"One other thing I'll have a look at while I'm researching — just to give you peace of mind. While Income Protection covers you if you're off work, it doesn't pay out if you die. So if you have a partner, a mortgage, or children, I'll also run some quick Life Insurance numbers alongside it, just so you can see the full picture.",
    type:"tap", options:["Yes, please do","I'm happy with just the IP"], ffKey:"lifeResearchOK", note:"Only mention if client has a partner, mortgage, or kids.",
    next:"ALWAYS:c1_callback" },

  { id:"c1_callback", section:"Summary",
    script:"Perfect. I'll go away and research that now — it'll take me around 10 to 15 minutes. What's the best number to reach you on, and when are you free for me to call back?",
    type:"input",
    inputs:[{key:"callbackNumber",label:"Best number to call back on",placeholder:"07700 900000"},{key:"callbackTime",label:"Callback time",placeholder:"e.g. in 15 mins, 2pm today"}],
    note:"Confirm the callback is booked before ending the call.", next:"ALWAYS:c1_end" },

  { id:"c1_end", section:"Summary",
    script:"Brilliant. I'll speak to you [callbackTime]. All the information has been captured — tap below to generate your advice report now while you research.",
    type:"generate", options:[], note:"", next:"ALWAYS:null" },

  // ── CALL 2: PITCH ──────────────────────────────────────────────────────────

  { id:"c2_intro", section:"Call 2 — Pitch",
    script:"Hi, is that [firstName]? It's [Your Name] from First Thought Financial calling back.",
    subScript:"Before we go through your options — can I just ask you to confirm the first line of your address and postcode for me again for Data Protection?",
    type:"input",
    inputs:[{key:"dpaConfirm",label:"Address confirmed?",placeholder:"Confirmed"}],
    note:"", next:"ALWAYS:c2_preamble" },

  { id:"c2_preamble", section:"Call 2 — Pitch",
    script:"Right — I've completed my research and I can now run through the recommendation and quotes with you. This is based on what I would do if I were in your shoes — but of course we can make some tweaks once we've gone through it, OK?\n\nDo you have a pen and paper handy to jot anything down?",
    type:"tap", options:["Yes, go ahead","One moment…"], note:"", next:"ALWAYS:c2_ip_explain" },

  { id:"c2_ip_explain", section:"Call 2 — Pitch",
    script:"So — the first thing I want to cover is the Income Protection, which is the main reason you got in touch.",
    subScript:"What I'm recommending is a policy that will pay you [benefit] per month if you're signed off work by your doctor for any reason — whether that's illness, injury, or mental health. It'll pay out after a waiting period of [DEFERRED], and it'll keep paying for as long as you need it, right up to your state pension age. As long as your GP signs you off, you're covered. Does that make sense?",
    type:"tap", options:["Yes, makes sense","Can you explain more?"], note:"",
    next:"ALWAYS:c2_provider_premium" },

  { id:"c2_provider_premium", section:"Call 2 — Pitch",
    script:"I've searched across the whole market — and the most competitive provider right now is [PROVIDER], and the premium is [PREMIUM] per month.\n\nNow I always say — the premium is fixed. It won't increase with age, and it won't go up after a claim. It stays at [PREMIUM] for the life of the policy. Does that sound comfortable?",
    type:"tap", options:["Yes, comfortable","It's a bit much","Need to think about it"], ffKey:"affordability", note:"",
    followUps:[
      { optionIndex:1, script:"What sort of monthly amount would work for you?", inputs:[{key:"budget",label:"Target monthly amount (£)",placeholder:"35",inputType:"number"}] },
    ],
    next:"ALWAYS:c2_claim_types" },

  { id:"c2_claim_types", section:"Call 2 — Pitch",
    script:"Just so you're fully in the picture on how it pays out — there are two types of policy.\n\nOption 1 is full-term: if you were off work and unable to return — worst-case scenario — it would pay out right up to your state pension age. That gives you the maximum protection.\n\nOption 2 is shorter-term: it pays for up to 2 years per claim. But — and this is important — you can claim unlimited times. So if you recovered, went back to work, and then had another issue, you can claim again. It's more cost-effective, and suits some people very well.\n\nBased on your situation, I'd recommend [OPTION]. But I've got quotes for both. Which would you like to look at first?",
    type:"tap", options:["Full term first","Short term first","Show me both"], ffKey:"quotePreference", note:"", next:"ALWAYS:c2_life_upsell_check" },

  { id:"c2_life_upsell_check", section:"Call 2 — Pitch",
    script:"Now — the other thing I wanted to mention.",
    type:"tap", options:["They have a partner / kids / mortgage","Single, no dependants"], ffKey:"lifeUpsellRoute", note:"Route based on client situation",
    next:"IF:options[0]:c2_life_upsell_existing|ELSE:c2_close" },

  { id:"c2_life_upsell_existing", section:"Call 2 — Pitch",
    script:"Do you have any Life Insurance in place at the moment?",
    type:"tap", options:["Yes","No"], ffKey:"hasLife", note:"",
    next:"IF:options[0]:c2_existing_life|ELSE:c2_no_life" },

  { id:"c2_no_life", section:"Call 2 — Pitch",
    script:"Right — so Income Protection covers you if you can't work. But what about if you were to die? Your partner and family would still have the mortgage and the bills to deal with — without your income.\n\nI've looked at Life Insurance for you alongside this. I'd recommend a policy that would pay off the mortgage and leave your family financially secure. It would actually work out cheaper to set up both together, and some providers offer a multi-product discount. Would you like me to run through those numbers?",
    type:"tap", options:["Yes, please do","No thanks — just IP for now"], ffKey:"lifeUpsell", note:"", next:"ALWAYS:c2_close" },

  { id:"c2_existing_life", section:"Call 2 — Pitch",
    script:"OK — I've had a look at that policy. I'd want to review whether it's the right amount, the right type, and whether it's still fit for purpose given your current situation. Sometimes people have cover that's either too low, the wrong structure, or costing more than it should.\n\nWould you like me to run through what I'd recommend alongside the IP?",
    type:"tap", options:["Yes, please review it","No thanks — just the IP for now"], ffKey:"lifeReviewAgreed", note:"", next:"ALWAYS:c2_close" },

  { id:"c2_close", section:"Call 2 — Pitch",
    script:"Perfect. So the next step is just to run through a short set of medical questions with the insurer — these are standard health declaration questions, and based on what you've already told me, it should be very straightforward. It only takes a few minutes.\n\nWhile those are loading — let me just mention a few of the additional benefits you get with [PROVIDER] as standard…",
    type:"info", options:[], note:"Mention 3 provider benefits and payout rate here — look these up in advance.", next:"ALWAYS:c2_generate" },

  { id:"c2_generate", section:"Call 2 — Pitch",
    script:"All the information has been captured. Tap below to generate the full LifeLogic advice report.",
    type:"generate", options:[], note:"", next:"ALWAYS:null" },
];

// ── ONE-CALL STEPS ────────────────────────────────────────────────────────────
// Blended fact find + pitch in one flowing call.
const ONE_CALL_STEPS = [

  { id:"intro", section:"Introduction",
    script:"Hi, is that [firstName]?",
    subScript:"Hi [firstName], it's [Your Name] calling from First Thought Financial. You recently made an enquiry about Income Protection, so I'm calling to help with that today. I just need to grab a few quick details first — it won't take long. Is that OK?",
    type:"tap", options:["Yes, go ahead","Not a good time"], note:"",
    next:"IF:options[0]:idd|ELSE:bad_time" },

  { id:"bad_time", section:"Introduction",
    script:"No problem — when would be a better time to call you back?",
    type:"info", options:[], note:"Note the callback time and end the call.", next:"ALWAYS:intro" },

  { id:"idd", section:"Introduction",
    script:"Before we start — just so you know, I'm an independent broker, so I search across the whole market for you rather than being tied to one insurer. There's no charge to you — I'm paid by commission from the insurer if you take a policy out. Happy for me to proceed on that basis?",
    type:"tap", options:["Yes, that's fine","Tell me more"],
    followUps:[
      { optionIndex:1, script:"I'll search providers like Aviva, Legal & General, Zurich, Royal London, LV= and others. Independent advice, no cost to you. Happy to continue?", inputs:[] }
    ],
    note:"", next:"ALWAYS:data_protection" },

  { id:"data_protection", section:"Introduction",
    script:"Can I just confirm the first line of your address and postcode for Data Protection, and your full name and date of birth?",
    type:"input",
    inputs:[{key:"firstName",label:"First Name",placeholder:"John"},{key:"lastName",label:"Last Name",placeholder:"Smith"},{key:"dob",label:"Date of Birth",inputType:"date"},{key:"address",label:"Address / Postcode",placeholder:"e.g. 12 High Street, SW1A 1AA"}],
    note:"", next:"ALWAYS:situation_overview" },

  { id:"situation_overview", section:"Situation",
    script:"So — what made you look into Income Protection, and where are you at right now?",
    type:"info", options:[], note:"Let them talk. Listen carefully. Note any key details before continuing.", next:"ALWAYS:marital" },

  { id:"marital", section:"Situation",
    script:"Are you single, or do you have a partner or spouse?",
    type:"tap", options:["Single","Partner / Spouse"], ffKey:"marital", note:"",
    followUps:[
      { optionIndex:1, script:"What's your partner's name and date of birth?", inputs:[{key:"partnerFirstName",label:"Partner's First Name",placeholder:"Jane"},{key:"partnerDob",label:"Partner's Date of Birth",inputType:"date"}] }
    ],
    next:"ALWAYS:occupation" },

  { id:"occupation", section:"Situation",
    script:"What do you do for work?",
    type:"input",
    inputs:[{key:"occupation",label:"Occupation",placeholder:"e.g. Carpenter, Nurse, Project Manager"},{key:"empType",label:"Employment Type",type:"select",options:["Employed","Self-employed","Ltd Company Director","Contractor"]}],
    note:"", next:"ALWAYS:income" },

  { id:"income", section:"Situation",
    script:"What's your annual income — and what does that work out as take-home after tax each month?",
    type:"input",
    inputs:[{key:"grossIncome",label:"Gross Annual Income (£)",placeholder:"50000",inputType:"number"},{key:"takeHome",label:"Monthly Take-home (£)",placeholder:"3200",inputType:"number"}],
    note:"", next:"ALWAYS:housing" },

  { id:"housing", section:"Situation",
    script:"Are you renting or do you have a mortgage?",
    type:"tap", options:["Mortgage","Renting","Own outright","Living with family"], ffKey:"housing", note:"",
    followUps:[
      { optionIndex:0, script:"What's the outstanding balance, remaining term, and monthly payment?", inputs:[{key:"mortgageBalance",label:"Outstanding Balance (£)",placeholder:"250000",inputType:"number"},{key:"mortgageTerm",label:"Remaining Term (years)",placeholder:"22",inputType:"number"},{key:"mortgagePayment",label:"Monthly Payment (£)",placeholder:"1200",inputType:"number"},{key:"mortgageType",label:"Repayment Type",type:"select",options:["Repayment","Interest Only","Part & Part"]}] }
    ],
    next:"ALWAYS:kids" },

  { id:"kids", section:"Situation",
    script:"Do you have any dependent children?",
    type:"tap", options:["No children","Yes — 1","Yes — 2","Yes — 3 or more"], ffKey:"hasKids", note:"",
    followUps:[
      { optionIndex:1, script:"How old are they?", inputs:[{key:"kidAge1",label:"Child 1 — Age",placeholder:"e.g. 7",inputType:"number"}] },
      { optionIndex:2, script:"How old are they?", inputs:[{key:"kidAge1",label:"Child 1 — Age",placeholder:"e.g. 4",inputType:"number"},{key:"kidAge2",label:"Child 2 — Age",placeholder:"e.g. 7",inputType:"number"}] },
      { optionIndex:3, script:"How old are they?", inputs:[{key:"kidAge1",label:"Child 1 — Age",placeholder:"e.g. 4",inputType:"number"},{key:"kidAge2",label:"Child 2 — Age",placeholder:"e.g. 7",inputType:"number"},{key:"kidAge3",label:"Child 3 — Age",placeholder:"e.g. 11",inputType:"number"}] },
    ],
    next:"ALWAYS:health" },

  { id:"health", section:"Situation",
    script:"Have you had any medical conditions or health issues — anything your GP is currently aware of?",
    type:"tap", options:["No — all clear","Yes — minor / managed","Yes — significant condition"], ffKey:"healthFlag", note:"",
    followUps:[
      { optionIndex:1, inputs:[{key:"healthDetail",label:"Brief overview",placeholder:"e.g. Type 2 diabetes, well controlled"}] },
      { optionIndex:2, inputs:[{key:"healthDetail",label:"Brief overview",placeholder:"e.g. Recent back surgery, still under consultant"}] },
    ],
    next:"ALWAYS:existing_cover" },

  { id:"existing_cover", section:"Situation",
    script:"Do you have any existing protection in place — any Life Insurance or Income Protection already?",
    type:"tap", options:["No existing cover","Yes — Life Insurance","Yes — Income Protection","Yes — multiple policies"], ffKey:"existingCover", note:"",
    followUps:[
      { optionIndex:1, inputs:[{key:"lifeProvider",label:"Provider",placeholder:"e.g. Aviva"},{key:"lifeCoverAmount",label:"Cover Amount (£)",placeholder:"300000",inputType:"number"},{key:"lifePremium",label:"Monthly Premium (£)",placeholder:"45",inputType:"number"}] },
      { optionIndex:2, inputs:[{key:"existingIPDetail",label:"Policy details",placeholder:"e.g. Aviva, £2000/mo, 3 month deferred"}] },
      { optionIndex:3, inputs:[{key:"existingCoverDetail",label:"Brief overview of all policies",placeholder:"e.g. Life with Aviva, IP with LV="}] },
    ],
    next:"ALWAYS:explain_ip" },

  { id:"explain_ip", section:"Income Protection",
    script:"Let me quickly explain how Income Protection works — it's very straightforward.",
    subScript:"If you're signed off work by your GP due to illness or injury — whether that's a broken leg, cancer, depression, anything — this policy replaces your income each month, tax free, directly into your bank account. It keeps paying for as long as you're off work, right up to your retirement if need be. As long as your doctor signs you off, you're covered. Does that make sense?",
    type:"tap", options:["Yes, makes sense","Can you explain more?"], note:"",
    next:"IF:options[0]:outgoings|ELSE:explain_ip_more" },

  { id:"explain_ip_more", section:"Income Protection",
    script:"Think of it as a replacement salary paid by the insurer. If you broke your leg and couldn't work for 3 months, the policy pays your agreed monthly amount straight into your bank — like getting paid without working. You can claim as many times as you need throughout the policy, as long as you're signed off. Clear now?",
    type:"tap", options:["Yes, got it"], note:"", next:"ALWAYS:outgoings" },

  { id:"outgoings", section:"Monthly Benefit",
    script:"To work out how much cover you'd need — what would you say your total monthly outgoings are? Everything: bills, rent or mortgage, food, travel, the lot.",
    type:"input",
    inputs:[{key:"totalOutgoings",label:"Total Monthly Outgoings (£)",placeholder:"3500",inputType:"number"}],
    note:"", next:"ALWAYS:benefit_check" },

  { id:"benefit_check", section:"Monthly Benefit",
    script:"So if you weren't working, would [outgoings] a month be enough to keep everything covered?",
    type:"tap", options:["Yes, that covers it","I'd need a bit more","I could manage on less"], ffKey:"benefitConfirm", note:"",
    followUps:[
      { optionIndex:1, script:"How much would you need?", inputs:[{key:"benefitAdjust",label:"Monthly amount needed (£)",placeholder:"e.g. 3800",inputType:"number"}] },
    ],
    next:"IF:marital=Partner / Spouse:partner_contribution|ELSE:sick_pay" },

  { id:"partner_contribution", section:"Monthly Benefit",
    script:"Would your partner still be working and contributing to the bills if you were off sick — or would you need to cover everything yourself?",
    type:"tap", options:["Partner would contribute","I'd need to cover it all"], ffKey:"partnerContrib", note:"",
    followUps:[
      { optionIndex:0, script:"What's your partner's monthly take-home?", inputs:[{key:"partnerIncome",label:"Partner's Monthly Take-home (£)",placeholder:"2400",inputType:"number"}] },
    ],
    next:"ALWAYS:sick_pay" },

  { id:"sick_pay", section:"Waiting Period",
    script:"Do you get any sick pay from your employer?",
    type:"tap", options:["Yes — full pay","Yes — partial pay","No sick pay","Self-employed — no sick pay"], ffKey:"sickPayType", note:"",
    followUps:[
      { optionIndex:0, script:"How long does it last at full pay?", inputs:[{key:"sickPayDuration",label:"Duration",type:"select",options:["1 month","2 months","3 months","4–6 months","6+ months"]}] },
      { optionIndex:1, script:"How long does it last at partial pay?", inputs:[{key:"sickPayDuration",label:"Duration",type:"select",options:["1 month","2 months","3 months","4–6 months","6+ months"]}] },
      { optionIndex:2, script:"Do you have savings you could fall back on?", inputs:[{key:"savingsLevel",label:"Savings",type:"select",options:["No / very little","1–2 months worth","3+ months worth"]}] },
      { optionIndex:3, script:"Do you have savings you could fall back on?", inputs:[{key:"savingsLevel",label:"Savings",type:"select",options:["No / very little","1–2 months worth","3+ months worth"]}] },
    ],
    next:"ALWAYS:deferred_explain" },

  { id:"deferred_explain", section:"Waiting Period",
    script:"There's one thing called the deferred period — that's just how long you have to be off work before payments start. The longer you wait, the cheaper the policy. Based on what you've told me, I'd suggest a waiting period of [DEFERRED]. [DEFERRED_REASON].\n\nDoes that sound reasonable?",
    type:"tap", options:["Yes, sounds good","I'd prefer shorter","I'd prefer longer"], ffKey:"deferredConfirm", note:"", next:"ALWAYS:research_pause" },

  { id:"research_pause", section:"Summary",
    script:"Perfect. So let me just quickly run those numbers and find you the most competitive option — give me 2 minutes.",
    type:"info", options:[], note:"In a one-call scenario, use this pause to run your quote software. Come back when you have the price.", next:"ALWAYS:summary_pitch" },

  { id:"summary_pitch", section:"Summary",
    script:"Right — I've had a look across the market. So, what I'm recommending is a policy that pays you [benefit] per month if you're signed off work by your GP for any reason — after a [DEFERRED] wait — and it runs right up to your state pension age.\n\nThe most competitive provider right now is [PROVIDER], and the premium is [PREMIUM] per month. That's a fixed premium — it won't go up with age and it won't increase after a claim.\n\nIs that comfortable for you monthly?",
    type:"tap", options:["Yes, comfortable","It's a bit much","Need to think about it"], ffKey:"affordability", note:"",
    followUps:[
      { optionIndex:1, script:"What sort of monthly amount would work?", inputs:[{key:"budget",label:"Target monthly amount (£)",placeholder:"35",inputType:"number"}] },
    ],
    next:"ALWAYS:quote_type" },

  { id:"quote_type", section:"Summary",
    script:"Just so you're fully informed — there are two types of Income Protection.\n\nThe full-term option pays right up to your state pension age if you can't return to work — maximum protection.\n\nThe short-term option pays for up to 2 years per claim, but you can claim unlimited times throughout the policy. It's more budget-friendly and suits a lot of people.\n\nI'd recommend the full-term option for you — but which would you like to go with?",
    type:"tap", options:["Full term","Short term — 2 year","Show me both options"], ffKey:"quotePreference", note:"", next:"ALWAYS:life_upsell_check" },

  { id:"life_upsell_check", section:"Life Cover",
    script:"Just before we move to the final bit — I want to mention one other thing.",
    type:"tap", options:["They have partner / kids / mortgage","Single, no dependants"], ffKey:"lifeUpsellRoute", note:"",
    next:"IF:options[0]:life_upsell_existing|ELSE:close" },

  { id:"life_upsell_existing", section:"Life Cover",
    script:"Do you already have any Life Insurance in place?",
    type:"tap", options:["Yes","No"], ffKey:"hasLife", note:"",
    next:"IF:options[0]:existing_life_review|ELSE:no_life_pitch" },

  { id:"no_life_pitch", section:"Life Cover",
    script:"So Income Protection covers you if you can't work — but it doesn't pay out if you were to die. If that happened, your partner and family would still have the mortgage and bills, but without your income.\n\nAlongside this, I've looked at Life Insurance for you. I'd recommend a policy that would pay off the mortgage and protect your family financially if the worst happened. And actually, setting up both together often works out cheaper — some providers offer a multi-policy discount.\n\nShall I run through those numbers with you now?",
    type:"tap", options:["Yes please","No thanks — just the IP"], ffKey:"lifeUpsell", note:"", next:"ALWAYS:close" },

  { id:"existing_life_review", section:"Life Cover",
    script:"I've had a look at that policy. I just want to make sure it's still the right amount, the right type, and that it's still competitive — things change over time and sometimes existing policies aren't quite what they should be.\n\nWould you like me to quickly run through what I'd recommend alongside the IP?",
    type:"tap", options:["Yes, please review it","No thanks — just the IP"], ffKey:"lifeReviewAgreed", note:"", next:"ALWAYS:close" },

  { id:"close", section:"Close",
    script:"Perfect. So the last step is just a short set of medical questions — these are standard questions from the insurer, and based on what you've told me today, it should all be very straightforward. It takes about 5 minutes.\n\nWhile those are loading, let me tell you about a few of the added benefits you get with [PROVIDER] as part of this policy…",
    type:"info", options:[], note:"Mention 3 provider benefits and payout rate here — look these up in advance.", next:"ALWAYS:generate" },

  { id:"generate", section:"Advice",
    script:"All the information has been captured. Tap below to generate the full LifeLogic advice report.",
    type:"generate", options:[], note:"", next:"ALWAYS:null" },
];

const DEFAULT_STEPS = ONE_CALL_STEPS;

const SECTIONS_ONE_CALL=["Introduction","Situation","Income Protection","Monthly Benefit","Waiting Period","Summary","Life Cover","Close","Advice"];
const SECTIONS_TWO_CALL=["Introduction","Situation","Income Protection","Monthly Benefit","Waiting Period","Budget","Summary","Call 2 — Pitch","Advice"];

// ── NEXT STEP RESOLVER ────────────────────────────────────────────────────────
function resolveNext(nextStr,selectedOption,step,ff){
  if(!nextStr)return null;
  const parts=nextStr.split("|");
  for(const part of parts){
    const t=part.trim();
    if(t.startsWith("ALWAYS:")){const d=t.replace("ALWAYS:","");return d==="null"?null:d;}
    if(t.startsWith("ELSE:")){const d=t.replace("ELSE:","");return d==="null"?null:d;}
    if(t.startsWith("IF:")){
      const body=t.replace("IF:","");
      const ci=body.indexOf(":");
      const condition=body.slice(0,ci);
      const dest=body.slice(ci+1);
      if(!dest)continue;
      if(condition.startsWith("options[")){const idx=parseInt(condition.match(/\[(\d+)\]/)?.[1]);if(!isNaN(idx)&&step.options&&selectedOption===step.options[idx])return dest==="null"?null:dest;continue;}
      if(condition.includes("!=")){const[k,v]=condition.split("!=");if(ff[k.trim()]!==v.trim())return dest==="null"?null:dest;continue;}
      if(condition.includes("=")){const[k,v]=condition.split("=");if(ff[k.trim()]===v.trim())return dest==="null"?null:dest;continue;}
    }
  }
  return null;
}

// ── PROMPT BUILDER ────────────────────────────────────────────────────────────
function buildPrompt(ff){
  const age=calcAge(ff.dob),spa=getSPA(ff.dob),pAge=calcAge(ff.partnerDob),pSpa=getSPA(ff.partnerDob);
  const hasP=ff.marital==="Partner / Spouse",hasMort=ff.housing==="Mortgage",hasKids=ff.hasKids&&ff.hasKids!=="No children";
  const kidsAges=[ff.kidAge1,ff.kidAge2,ff.kidAge3].filter(Boolean).join(", ");
  const gross60=(parseFloat(ff.grossIncome)||0)*0.6/12,out=parseFloat(ff.totalOutgoings)||0,pInc=parseFloat(ff.partnerIncome)||0;
  const ipBen=hasP&&ff.partnerContrib==="Partner would contribute"?Math.min(Math.max(0,out-pInc),gross60):Math.min(out,gross60);
  const def=ff.sickPayDuration||(ff.savingsLevel==="3+ months worth"?"3 months":"1 month");
  return `You are an expert UK protection insurance adviser. Analyse this fact-find and give exactly four clearly labelled sections.

ADVICE RULES:
LIFE INSURANCE: If mortgage, primary goal = pay it off (decreasing for repayment; level for interest-only). After mortgage cleared, remaining outgoings = total outgoings MINUS mortgage payment. Check if surviving partner income covers remaining outgoings with £500 buffer. If shortfall, recommend FIB per person. No mortgage + renting = FIB on total outgoings. Single no dependants = NO standalone life insurance.
INCOME PROTECTION: Max = 60% gross (tax free). Amount = outgoings minus partner take-home. Never exceed 60% gross. Deferred as captured. Full-term own-occupation to SPA. Offer 2-year as budget option only.
CRITICAL ILLNESS: 12 months net income per person, level term. Always recommend.
FAMILY INCOME BENEFIT: Term = years until youngest reaches 21. Base = outgoings minus mortgage payment. FIB = shortfall after partner income + £500 buffer. Per person separately.
SINGLE NO DEPENDANTS: CIC and IP only — no standalone life.

OUTPUT:
1. RECOMMENDATION — products, amounts, terms, show IP and FIB working
2. EXISTING COVER ASSESSMENT
3. UNDERWRITING QUESTIONS
4. UNDERWRITING FLAGS

ENQUIRY TYPE: Income Protection (with potential Life upsell)
CLIENT: ${ff.firstName||""} ${ff.lastName||""} | DOB: ${ff.dob||"unknown"} (Age: ${age??"unknown"}) | SPA: ${spa}
Marital: ${ff.marital||"unknown"} | Occupation: ${ff.occupation||"unknown"} (${ff.empType||"employed"})
Gross: £${ff.grossIncome||0}/yr | Take-home: £${ff.takeHome||0}/month
Outgoings: £${ff.totalOutgoings||0}/month | Housing: ${ff.housing||"unknown"}
${hasMort?`Mortgage: £${ff.mortgageBalance} outstanding, ${ff.mortgageTerm} yrs, £${ff.mortgagePayment}/month, ${ff.mortgageType}`:""}
Sick pay: ${ff.sickPayType||"unknown"}${ff.sickPayDuration?` for ${ff.sickPayDuration}`:""}
Savings: ${ff.savingsLevel||"unknown"} | Health: ${ff.healthDetail||ff.healthFlag||"Nothing disclosed"}
Kids: ${hasKids?(kidsAges||ff.hasKids):"None"}
${hasP?`PARTNER: ${ff.partnerFirstName||"Partner"} | DOB: ${ff.partnerDob||"unknown"} (Age: ${pAge??"unknown"}) | SPA: ${pSpa}
Partner take-home: £${ff.partnerIncome||0}/month | Contributes if off work: ${ff.partnerContrib||"unknown"}`:"PARTNER: None"}
CALCULATED IP BENEFIT: £${Math.round(ipBen)}/month | DEFERRED: ${def}
LIFE NEED: ${ff.lifeNeed||"Not assessed"} | LIFE UPSELL: ${ff.lifeUpsell||"Not discussed"}
${ff.hasLife==="Yes"?`EXISTING LIFE: ${ff.lifeProvider||"unknown"}, £${ff.lifeCoverAmount||0}, £${ff.lifePremium||0}/month`:"EXISTING LIFE: None"}`;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S={
  page:    {height:"100vh",background:`radial-gradient(ellipse at 20% 0%,#1a1f35 0%,${DARK} 60%)`,fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"},
  header:  {padding:"12px 20px",borderBottom:`1px solid ${BORDER}`,display:"flex",alignItems:"center",gap:12,background:"rgba(10,15,30,0.9)",backdropFilter:"blur(10px)",flexShrink:0,zIndex:100},
  logoMk:  {width:32,height:32,background:`linear-gradient(135deg,${A},#d97706)`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:DARK,flexShrink:0},
  logoT:   {fontSize:16,fontWeight:800,color:TEXT,letterSpacing:"-0.5px"},
  logoS:   {fontSize:9,color:A,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700},
  modeTabs:{display:"flex",background:INNER,borderRadius:8,padding:3,gap:3},
  modeTab: (a)=>({padding:"6px 14px",fontSize:12,fontWeight:700,border:"none",borderRadius:6,cursor:"pointer",background:a?A:"transparent",color:a?DARK:TEXTD,letterSpacing:"0.04em",transition:"all 0.15s"}),
  callTabs:{display:"flex",background:INNER,borderRadius:8,padding:3,gap:3},
  callTab: (a)=>({padding:"5px 12px",fontSize:11,fontWeight:700,border:"none",borderRadius:6,cursor:"pointer",background:a?"#3b82f6":"transparent",color:a?"#fff":TEXTD,letterSpacing:"0.04em",transition:"all 0.15s"}),
  prog:    {padding:"8px 20px",background:"rgba(17,24,39,0.7)",borderBottom:`1px solid ${BORDER}`,flexShrink:0},
  pBar:    {height:3,background:BORDERL,borderRadius:4,overflow:"hidden",marginTop:4},
  pFill:   (p)=>({height:"100%",width:`${p}%`,background:`linear-gradient(90deg,${A},${EMERALD})`,borderRadius:4,transition:"width 0.4s"}),
  tabs:    {display:"flex",borderBottom:`1px solid ${BORDER}`,background:CARD,flexShrink:0},
  tab:     (a)=>({flex:1,padding:"9px 0",fontSize:12,fontWeight:700,background:"transparent",border:"none",cursor:"pointer",color:a?A:TEXTD,borderBottom:a?`2px solid ${A}`:"2px solid transparent",letterSpacing:"0.08em",textTransform:"uppercase"}),
  body:    {display:"flex",flex:1,overflow:"hidden",minHeight:0},
  left:    {flex:1,overflowY:"auto",padding:"18px 16px 100px",minHeight:0},
  right:   {width:290,borderLeft:`1px solid ${BORDER}`,overflowY:"auto",padding:"16px 14px 80px",background:"rgba(10,15,30,0.5)",flexShrink:0,minHeight:0},
  pill:    {fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:A,background:"rgba(245,158,11,0.1)",border:`1px solid rgba(245,158,11,0.2)`,borderRadius:20,padding:"3px 10px",display:"inline-block",marginBottom:10},
  sBox:    {background:CARD,borderRadius:14,padding:"16px 18px",marginBottom:12,border:`1px solid ${BORDER}`},
  sLbl:    {fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:TEXTD,marginBottom:7},
  sTxt:    {fontSize:16,color:TEXT,lineHeight:1.75,fontWeight:500},
  sSub:    {fontSize:14,color:TEXTM,lineHeight:1.7,marginTop:10,paddingTop:10,borderTop:`1px solid ${BORDER}`},
  infoBox: {background:"rgba(245,158,11,0.07)",border:`1px solid rgba(245,158,11,0.2)`,borderRadius:10,padding:"11px 13px",marginBottom:12,fontSize:13,color:"#fcd34d",lineHeight:1.6},
  noteBox: {background:"rgba(59,130,246,0.07)",border:`1px solid rgba(59,130,246,0.2)`,borderRadius:10,padding:"11px 13px",marginBottom:12,fontSize:13,color:"#93c5fd",lineHeight:1.6},
  followUp:{background:"rgba(245,158,11,0.05)",border:`1px solid rgba(245,158,11,0.15)`,borderRadius:10,padding:"12px 14px",marginTop:10},
  followUpL:{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:A,marginBottom:10},
  oGrid:   {display:"grid",gap:8,marginBottom:12},
  oBtn:    (a)=>({background:a?"rgba(245,158,11,0.12)":INNER,border:`1.5px solid ${a?A:BORDERL}`,borderRadius:10,padding:"12px 14px",fontSize:14,fontWeight:600,color:a?A:TEXTM,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:9,transition:"all 0.15s"}),
  oDot:    (a)=>({width:7,height:7,borderRadius:"50%",background:a?A:BORDERL,flexShrink:0}),
  iGroup:  {marginBottom:10},
  lbl:     {fontSize:12,fontWeight:600,color:TEXTD,marginBottom:5,display:"block",letterSpacing:"0.03em"},
  inp:     {background:INNER,border:`1.5px solid ${BORDERL}`,borderRadius:9,color:TEXT,padding:"10px 12px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"},
  sel:     {background:INNER,border:`1.5px solid ${BORDERL}`,borderRadius:9,color:TEXT,padding:"10px 12px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",cursor:"pointer"},
  nBtn:    {background:`linear-gradient(135deg,${A},#d97706)`,border:"none",borderRadius:10,color:DARK,fontSize:14,fontWeight:800,padding:"13px 20px",cursor:"pointer",width:"100%",letterSpacing:"0.02em",marginTop:4},
  gBtn:    {background:`linear-gradient(135deg,${A},#d97706)`,border:"none",borderRadius:11,color:DARK,fontSize:15,fontWeight:800,padding:"16px",cursor:"pointer",width:"100%",letterSpacing:"0.02em",boxShadow:`0 8px 24px rgba(245,158,11,0.2)`},
  bkBtn:   {background:"transparent",border:`1px solid ${BORDERL}`,borderRadius:7,color:TEXTD,fontSize:11,fontWeight:600,padding:"5px 10px",cursor:"pointer"},
  ffT:     {fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:A,marginBottom:12},
  ffSec:   {marginBottom:14},
  ffSecT:  {fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:TEXTD,marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${BORDER}`},
  ffRow:   {display:"flex",justifyContent:"space-between",gap:8,marginBottom:4},
  ffK:     {fontSize:12,color:TEXTD,fontWeight:500,flexShrink:0},
  ffV:     {fontSize:12,color:TEXT,fontWeight:600,textAlign:"right"},
  ffEmpty: {fontSize:12,color:BORDERL,fontStyle:"italic"},
  outBox:  {background:CARD,borderRadius:14,padding:"18px 20px",border:`1px solid ${BORDER}`,marginTop:12},
  outH:    {fontSize:15,fontWeight:800,color:TEXT,margin:"0 0 2px 0"},
  outSub:  {fontSize:10,color:A,fontWeight:700,letterSpacing:"0.1em",margin:"0 0 12px 0"},
  pre:     {fontSize:13,lineHeight:1.85,color:TEXTM,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0},
  spin:    {display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:28,color:TEXTD,fontSize:14},
  err:     {background:"rgba(244,63,94,0.1)",border:`1px solid rgba(244,63,94,0.2)`,borderRadius:10,padding:12,color:ROSE,fontSize:13},
  edWrap:  {display:"flex",flex:1,overflow:"hidden",minHeight:0},
  edLeft:  {width:280,borderRight:`1px solid ${BORDER}`,overflowY:"auto",padding:"16px 12px",background:CARD,flexShrink:0,minHeight:0},
  edRight: {flex:1,overflowY:"auto",padding:"20px 24px 80px",minHeight:0},
  edStepBtn:(a,type)=>({width:"100%",textAlign:"left",background:a?`rgba(245,158,11,0.12)`:type==="generate"?"rgba(16,185,129,0.08)":type==="info"?"rgba(59,130,246,0.08)":INNER,border:`1px solid ${a?A:BORDER}`,borderRadius:10,padding:"10px 12px",marginBottom:6,cursor:"pointer",color:a?A:TEXTM,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}),
  edCard:  {background:CARD,borderRadius:14,padding:"20px 22px",marginBottom:16,border:`1px solid ${BORDER}`},
  edH:     {fontSize:13,fontWeight:700,color:TEXT,marginBottom:14},
  edLbl:   {fontSize:11,fontWeight:600,color:TEXTD,marginBottom:5,display:"block",letterSpacing:"0.04em",textTransform:"uppercase"},
  edInp:   {background:INNER,border:`1px solid ${BORDERL}`,borderRadius:8,color:TEXT,padding:"9px 11px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit"},
  edTa:    {background:INNER,border:`1px solid ${BORDERL}`,borderRadius:8,color:TEXT,padding:"9px 11px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",minHeight:72,resize:"vertical"},
  edSel:   {background:INNER,border:`1px solid ${BORDERL}`,borderRadius:8,color:TEXT,padding:"9px 11px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"},
  edOptRow:{display:"flex",gap:6,marginBottom:6,alignItems:"center"},
  addBtn:  {background:"transparent",border:`1px dashed ${BORDERL}`,borderRadius:8,color:TEXTD,fontSize:12,fontWeight:600,padding:"7px 12px",cursor:"pointer",width:"100%",marginTop:4},
  delBtn:  {background:"rgba(244,63,94,0.1)",border:`1px solid rgba(244,63,94,0.2)`,borderRadius:6,color:ROSE,fontSize:11,fontWeight:700,padding:"4px 8px",cursor:"pointer",flexShrink:0},
  saveBtn: {background:EMERALD,border:"none",borderRadius:9,color:DARK,fontSize:13,fontWeight:800,padding:"10px 20px",cursor:"pointer",letterSpacing:"0.02em"},
  resetBtn:{background:"rgba(244,63,94,0.1)",border:`1px solid rgba(244,63,94,0.2)`,borderRadius:9,color:ROSE,fontSize:12,fontWeight:700,padding:"10px 16px",cursor:"pointer"},
  badge:   (c)=>({fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",background:c+"15",border:`1px solid ${c}30`,color:c,borderRadius:20,padding:"2px 8px",flexShrink:0}),
  dragH:   {fontSize:16,color:BORDERL,cursor:"grab",userSelect:"none",lineHeight:1,padding:"0 2px",flexShrink:0},
};

// ── FF SUMMARY ────────────────────────────────────────────────────────────────
function FFSummary({ff}){
  const rows=[
    {s:"Client",items:[{k:"Name",v:ff.firstName?`${ff.firstName} ${ff.lastName||""}`.trim():null},{k:"DOB",v:ff.dob},{k:"Marital",v:ff.marital}]},
    {s:"Work & Income",items:[{k:"Occupation",v:ff.occupation},{k:"Employment",v:ff.empType},{k:"Gross",v:ff.grossIncome?`£${Number(ff.grossIncome).toLocaleString()}/yr`:null},{k:"Take-home",v:ff.takeHome?fmtM(ff.takeHome):null}]},
    {s:"Finances",items:[{k:"Housing",v:ff.housing},{k:"Outgoings",v:ff.totalOutgoings?fmtM(ff.totalOutgoings):null},{k:"Mortgage",v:ff.mortgageBalance?fmt(ff.mortgageBalance):null},{k:"Mrt. pmt",v:ff.mortgagePayment?fmtM(ff.mortgagePayment):null}]},
    {s:"Partner",items:[{k:"Name",v:ff.partnerFirstName},{k:"Income",v:ff.partnerIncome?fmtM(ff.partnerIncome):null},{k:"Contributes?",v:ff.partnerContrib}]},
    {s:"Children",items:[{k:"Kids",v:ff.hasKids==="No children"?"None":ff.hasKids||null},{k:"Ages",v:[ff.kidAge1,ff.kidAge2,ff.kidAge3].filter(Boolean).join(", ")||null}]},
    {s:"Health",items:[{k:"Health",v:ff.healthFlag},{k:"Detail",v:ff.healthDetail}]},
    {s:"IP Details",items:[{k:"Sick pay",v:ff.sickPayType},{k:"Duration",v:ff.sickPayDuration},{k:"Savings",v:ff.savingsLevel},{k:"Deferred",v:ff.deferredConfirm}]},
    {s:"Life Cover",items:[{k:"Life need",v:ff.lifeNeed},{k:"Has life?",v:ff.hasLife},{k:"Provider",v:ff.lifeProvider},{k:"Upsell",v:ff.lifeUpsell}]},
  ];
  const hasAny=Object.values(ff).some(Boolean);
  return(
    <div>
      <p style={S.ffT}>📋 Live Fact-Find</p>
      {!hasAny&&<p style={S.ffEmpty}>Populates as you go through the call…</p>}
      {rows.map(({s,items})=>{
        const filled=items.filter(i=>i.v);
        if(!filled.length)return null;
        return <div key={s} style={S.ffSec}><p style={S.ffSecT}>{s}</p>{filled.map(({k,v})=><div key={k} style={S.ffRow}><span style={S.ffK}>{k}</span><span style={S.ffV}>{String(v)}</span></div>)}</div>;
      })}
    </div>
  );
}

// Renders text preserving newlines
function ScriptText({text,style}){
  if(!text)return null;
  const lines=text.split("\n");
  return(
    <div style={style}>
      {lines.map((line,i)=>(
        <span key={i}>{line}{i<lines.length-1&&<br/>}</span>
      ))}
    </div>
  );
}

// ── INLINE INPUT GROUP ────────────────────────────────────────────────────────
function InlineInputs({inputs,values,onChange}){
  return(
    <div>
      {inputs.map(inp=>(
        <div key={inp.key} style={S.iGroup}>
          <label style={S.lbl}>{inp.label}</label>
          {inp.type==="select"
            ?<select style={S.sel} value={values[inp.key]||""} onChange={e=>onChange(inp.key,e.target.value)}><option value="">Select…</option>{inp.options?.map(o=><option key={o}>{o}</option>)}</select>
            :<input style={S.inp} type={inp.inputType||"text"} placeholder={inp.placeholder||""} value={values[inp.key]||""} onChange={e=>onChange(inp.key,e.target.value)} />
          }
        </div>
      ))}
    </div>
  );
}

// ── STEP CONTROLS ─────────────────────────────────────────────────────────────
function StepControls({step,ff,onAnswer,onInputNext}){
  const [sel,setSel]=useState(null);
  const [inputs,setInputs]=useState({});
  const [followUpInputs,setFollowUpInputs]=useState({});

  function enrich(text){
    if(!text)return text;
    const def=ff.sickPayDuration||(ff.savingsLevel==="3+ months worth"?"3 months":"1 month");
    const out=parseFloat(ff.totalOutgoings)||0,pInc=parseFloat(ff.partnerIncome)||0,g=(parseFloat(ff.grossIncome)||0)*0.6/12;
    const ipBen=ff.partnerContrib==="Partner would contribute"?Math.min(Math.max(0,out-pInc),g):Math.min(out,g);
    const dR=ff.sickPayDuration?`that way the policy kicks in when your sick pay runs out, keeping the premium as low as possible`:ff.savingsLevel==="3+ months worth"?`your savings can cover the first 3 months, so a longer wait makes the premium considerably cheaper`:`as you don't have sick pay or significant savings, you want it to start as soon as possible`;
    return text
      .replace(/\[firstName\]/g,ff.firstName||"[name]")
      .replace(/\[housingLabel\]/g,ff.housing==="Mortgage"?"mortgage":"rent")
      .replace(/\[housingCost\]/g,ff.mortgagePayment?fmtM(ff.mortgagePayment):ff.totalOutgoings?fmtM(ff.totalOutgoings):"[amount]")
      .replace(/\[outgoings\]/g,ff.totalOutgoings?fmtM(ff.totalOutgoings):"[outgoings]")
      .replace(/\[benefit\]/g,ipBen?fmtM(ipBen):"[benefit]")
      .replace(/\[DEFERRED\]/g,def)
      .replace(/\[DEFERRED_REASON\]/g,dR);
  }

  const selectedOptIdx = sel ? step.options?.indexOf(sel) : -1;
  const activeFollowUp = step.followUps?.find(f=>f.optionIndex===selectedOptIdx);

  if(step.type==="info")return(
    <div>
      {step.note&&<div style={S.noteBox}>💡 {step.note}</div>}
      <button style={S.nBtn} onClick={()=>onAnswer(null,resolveNext(step.next,null,step,ff))}>Continue →</button>
    </div>
  );
  if(step.type==="generate")return(
    <div>
      <div style={S.infoBox}>✅ All information captured. Tap below to generate the full LifeLogic advice report.</div>
      <button style={S.gBtn} onClick={()=>onAnswer("generate",null)}>⚡ Generate Advice Report</button>
    </div>
  );
  if(step.type==="tap")return(
    <div>
      <div style={S.oGrid}>
        {step.options.map((opt)=>(
          <button key={opt} style={S.oBtn(sel===opt)} onClick={()=>{setSel(opt);setFollowUpInputs({});}}>
            <span style={S.oDot(sel===opt)}/>{opt}
          </button>
        ))}
      </div>
      {sel&&activeFollowUp&&(
        <div style={S.followUp}>
          {activeFollowUp.script&&(
            <div style={{...S.sBox,marginBottom:12,background:"rgba(245,158,11,0.04)"}}>
              <div style={S.sLbl}>SAY THIS</div>
              <ScriptText text={activeFollowUp.script} style={{...S.sTxt,fontSize:15}} />
            </div>
          )}
          {!activeFollowUp.script&&<div style={S.followUpL}>Additional details</div>}
          {activeFollowUp.inputs&&activeFollowUp.inputs.length>0&&(
            <InlineInputs
              inputs={activeFollowUp.inputs}
              values={followUpInputs}
              onChange={(k,v)=>setFollowUpInputs(p=>({...p,[k]:v}))}
            />
          )}
        </div>
      )}
      {sel&&(
        <button style={{...S.nBtn,marginTop:12}} onClick={()=>{
          const next=resolveNext(step.next,sel,step,ff);
          onAnswer(sel,next,followUpInputs);
          setSel(null);setFollowUpInputs({});
        }}>Continue →</button>
      )}
    </div>
  );
  if(step.type==="input")return(
    <div>
      <InlineInputs inputs={step.inputs||[]} values={inputs} onChange={(k,v)=>setInputs(p=>({...p,[k]:v}))} />
      <button style={S.nBtn} onClick={()=>{onInputNext(inputs,resolveNext(step.next,null,step,ff));setInputs({});}}>Continue →</button>
    </div>
  );
  return null;
}

// ── NEXT STEP BUILDER ─────────────────────────────────────────────────────────
function parseRules(nextStr){
  if(!nextStr)return[{type:"always",dest:"null"}];
  return nextStr.split("|").map(part=>{
    const t=part.trim();
    if(t.startsWith("ALWAYS:"))return{type:"always",dest:t.replace("ALWAYS:","")};
    if(t.startsWith("ELSE:"))return{type:"else",dest:t.replace("ELSE:","")};
    if(t.startsWith("IF:")){
      const body=t.replace("IF:","");const ci=body.indexOf(":");const condition=body.slice(0,ci);const dest=body.slice(ci+1);
      if(condition.startsWith("options[")){const idx=parseInt(condition.match(/\[(\d+)\]/)?.[1]??0);return{type:"if_option",optionIndex:idx,dest};}
      if(condition.includes("!=")){const[k,v]=condition.split("!=");return{type:"if_ff_not",ffKey:k.trim(),ffVal:v.trim(),dest};}
      if(condition.includes("=")){const[k,v]=condition.split("=");return{type:"if_ff",ffKey:k.trim(),ffVal:v.trim(),dest};}
    }
    return{type:"always",dest:"null"};
  });
}
function rulesToString(rules){
  return rules.map(r=>{
    if(r.type==="always")return`ALWAYS:${r.dest||"null"}`;
    if(r.type==="else")return`ELSE:${r.dest||"null"}`;
    if(r.type==="if_option")return`IF:options[${r.optionIndex??0}]:${r.dest||"null"}`;
    if(r.type==="if_ff")return`IF:${r.ffKey}=${r.ffVal}:${r.dest||"null"}`;
    if(r.type==="if_ff_not")return`IF:${r.ffKey}!=${r.ffVal}:${r.dest||"null"}`;
    return"";
  }).filter(Boolean).join("|");
}
const FF_KEYS=[
  {key:"marital",label:"Marital status (Single / Partner / Spouse)"},
  {key:"empType",label:"Employment type (Employed / Self-employed…)"},
  {key:"housing",label:"Housing (Mortgage / Renting…)"},
  {key:"hasKids",label:"Has children (No children / Yes — 1…)"},
  {key:"healthFlag",label:"Health flag (No — all clear / Yes — minor…)"},
  {key:"existingCover",label:"Existing cover (No existing cover / Yes — Life…)"},
  {key:"sickPayType",label:"Sick pay type (Yes — full pay / No sick pay…)"},
  {key:"sickPayDuration",label:"Sick pay duration (1 month / 3 months…)"},
  {key:"savingsLevel",label:"Savings level (No / very little / 3+ months…)"},
  {key:"benefitConfirm",label:"Benefit amount confirmed (Yes / No)"},
  {key:"partnerContrib",label:"Partner contributes to bills (Yes / No)"},
  {key:"deferredConfirm",label:"Deferred period agreed (Yes / prefer shorter…)"},
  {key:"hasBudget",label:"Has budget in mind (Yes / No)"},
  {key:"summaryConfirm",label:"Summary confirmed (Yes / change something)"},
  {key:"lifeResearchOK",label:"Life research approved (Yes / No)"},
  {key:"lifeNeed",label:"Life cover need (They'd struggle / Fine)"},
  {key:"hasLife",label:"Has existing life insurance (Yes / No)"},
  {key:"lifeUpsell",label:"Life upsell response (Yes show me / No thanks)"},
  {key:"lifeUpsellRoute",label:"Life upsell route (partner+kids+mort / single)"},
  {key:"lifeReviewAgreed",label:"Life review agreed (Yes / No)"},
  {key:"affordability",label:"Affordability (Yes comfortable / Too much)"},
  {key:"quotePreference",label:"Quote preference (Both / Full term / 2-year)"},
];

function NextStepBuilder({step,allSteps,update}){
  const stepIds=allSteps.map(s=>s.id);
  const[rules,setRules]=useState(()=>parseRules(step.next));
  const[lastId,setLastId]=useState(step.id);
  if(step.id!==lastId){setLastId(step.id);setRules(parseRules(step.next));}
  const[dragIdx,setDragIdx]=useState(null);
  const[dragOverIdx,setDragOverIdx]=useState(null);

  function updateRules(fn){
    setRules(prev=>{const r=fn(prev);update("next",rulesToString(r));return r;});
  }
  function updateRule(i,field,val){updateRules(prev=>prev.map((r,idx)=>idx===i?{...r,[field]:val}:r));}
  function addRule(type){updateRules(prev=>[...prev,type==="else"?{type:"else",dest:"null"}:type==="if_option"?{type:"if_option",optionIndex:0,dest:"null"}:type==="if_ff_not"?{type:"if_ff_not",ffKey:"marital",ffVal:"",dest:"null"}:type==="always"?{type:"always",dest:"null"}:{type:"if_ff",ffKey:"marital",ffVal:"",dest:"null"}]);}
  function removeRule(i){updateRules(prev=>prev.filter((_,idx)=>idx!==i));}
  function onDrop(i){
    if(dragIdx===null||dragIdx===i){setDragIdx(null);setDragOverIdx(null);return;}
    updateRules(prev=>{const r=[...prev];const[m]=r.splice(dragIdx,1);r.splice(i,0,m);return r;});
    setDragIdx(null);setDragOverIdx(null);
  }

  const ruleTypeLabels={always:"Always go to",else:"Otherwise go to",if_option:"If customer picks option",if_ff:"If fact-find field equals",if_ff_not:"If fact-find field does NOT equal"};
  const ruleColors={always:EMERALD,else:TEXTD,if_option:A,if_ff:BLUE,if_ff_not:ROSE};

  return(
    <div>
      <p style={{fontSize:12,color:TEXTD,marginBottom:12,lineHeight:1.5}}>Rules are checked top to bottom. First match wins. <span style={{color:A}}>Drag ⠿ to reorder.</span></p>
      {rules.map((rule,i)=>(
        <div key={i} draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>{e.preventDefault();setDragOverIdx(i);}} onDrop={()=>onDrop(i)} onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null);}}
          style={{background:INNER,border:`1px solid ${dragOverIdx===i?A:ruleColors[rule.type]||BORDERL}${dragOverIdx===i?"":"22"}`,borderRadius:10,padding:"12px 14px",marginBottom:8,opacity:dragIdx===i?0.4:1,transition:"opacity 0.1s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={S.dragH} title="Drag to reorder">⠿</span>
              <span style={{fontSize:11,fontWeight:700,color:ruleColors[rule.type]||TEXTD,letterSpacing:"0.08em",textTransform:"uppercase"}}>{ruleTypeLabels[rule.type]}</span>
            </div>
            <button style={S.delBtn} onClick={()=>removeRule(i)}>✕</button>
          </div>
          {rule.type==="if_option"&&(
            <div style={{marginBottom:10}}>
              <label style={S.edLbl}>Which option triggers this?</label>
              <select style={S.edSel} value={rule.optionIndex??0} onChange={e=>updateRule(i,"optionIndex",parseInt(e.target.value))}>
                {(step.options||[]).map((opt,idx)=><option key={idx} value={idx}>Option {idx+1}: "{opt}"</option>)}
                {(step.options||[]).length===0&&<option value={0}>No options defined yet</option>}
              </select>
            </div>
          )}
          {(rule.type==="if_ff"||rule.type==="if_ff_not")&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><label style={S.edLbl}>Fact-find field</label>
                <select style={S.edSel} value={rule.ffKey||""} onChange={e=>updateRule(i,"ffKey",e.target.value)}>
                  {FF_KEYS.map(({key,label})=><option key={key} value={key}>{label}</option>)}
                </select></div>
              <div><label style={S.edLbl}>{rule.type==="if_ff"?"Equals":"Does NOT equal"}</label>
                <input style={S.edInp} value={rule.ffVal||""} placeholder="value to check" onChange={e=>updateRule(i,"ffVal",e.target.value)} /></div>
            </div>
          )}
          <div><label style={S.edLbl}>Go to step</label>
            <select style={{...S.edSel,borderColor:ruleColors[rule.type]+"40"}} value={rule.dest||"null"} onChange={e=>updateRule(i,"dest",e.target.value)}>
              <option value="null">— End the call flow —</option>
              {stepIds.map(id=><option key={id} value={id}>{id}</option>)}
            </select></div>
        </div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
        <button style={{...S.addBtn,fontSize:11,borderColor:EMERALD+"50",color:EMERALD}} onClick={()=>addRule("always")}>+ Always go to…</button>
        <button style={{...S.addBtn,fontSize:11,borderColor:TEXTD+"50",color:TEXTD}} onClick={()=>addRule("else")}>+ Otherwise go to…</button>
        <button style={{...S.addBtn,fontSize:11,borderColor:A+"50",color:A}} onClick={()=>addRule("if_option")}>+ If option selected…</button>
        <button style={{...S.addBtn,fontSize:11,borderColor:BLUE+"50",color:BLUE}} onClick={()=>addRule("if_ff")}>+ If fact-find equals…</button>
        <button style={{...S.addBtn,fontSize:11,borderColor:ROSE+"50",color:ROSE,gridColumn:"span 2"}} onClick={()=>addRule("if_ff_not")}>+ If fact-find does NOT equal…</button>
      </div>
      <div style={{background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"8px 12px",marginTop:12,fontSize:11,color:BORDERL,fontFamily:"monospace",wordBreak:"break-all"}}>{rulesToString(rules)||"No rules defined"}</div>
    </div>
  );
}

// ── FOLLOW-UP EDITOR ──────────────────────────────────────────────────────────
function FollowUpEditor({step,update}){
  function updateFollowUp(optIdx,inputs){
    const existing=(step.followUps||[]).filter(f=>f.optionIndex!==optIdx);
    const current=(step.followUps||[]).find(f=>f.optionIndex===optIdx);
    if(inputs.length>0)update("followUps",[...existing,{optionIndex:optIdx,script:current?.script||"",inputs}]);
    else update("followUps",existing);
  }
  function getFollowUp(optIdx){return(step.followUps||[]).find(f=>f.optionIndex===optIdx);}
  function addFollowUpField(optIdx){
    const fu=getFollowUp(optIdx);
    const inputs=[...(fu?.inputs||[]),{key:`field_${Date.now()}`,label:"New Field",placeholder:""}];
    updateFollowUp(optIdx,inputs);
  }
  function updateFollowUpField(optIdx,i,field,val){
    const fu=getFollowUp(optIdx);
    const inputs=(fu?.inputs||[]).map((inp,idx)=>idx===i?{...inp,[field]:val}:inp);
    updateFollowUp(optIdx,inputs);
  }
  function removeFollowUpField(optIdx,i){
    const fu=getFollowUp(optIdx);
    const inputs=(fu?.inputs||[]).filter((_,idx)=>idx!==i);
    updateFollowUp(optIdx,inputs);
  }
  if(!step.options||step.options.length===0)return<p style={{fontSize:12,color:TEXTD}}>Add options above first.</p>;
  return(
    <div>
      <p style={{fontSize:12,color:TEXTD,marginBottom:12,lineHeight:1.5}}>For each option, you can add follow-up input fields that appear inline when that option is selected — before the customer moves on.</p>
      {step.options.map((opt,oi)=>{
        const fu=getFollowUp(oi);
        return(
          <div key={oi} style={{background:INNER,borderRadius:10,padding:"12px 14px",marginBottom:10,border:`1px solid ${BORDER}`}}>
            <div style={{fontSize:12,fontWeight:700,color:A,marginBottom:10}}>Option {oi+1}: "{opt}"</div>
            <div style={S.iGroup}>
              <label style={S.edLbl}>Script to say when this option is selected (optional)</label>
              <textarea style={{...S.edTa,minHeight:56}} value={fu?.script||""} placeholder="e.g. Great — what's your partner's name and date of birth?" onChange={e=>{const existing=(step.followUps||[]).filter(f=>f.optionIndex!==oi);const inputs=fu?.inputs||[];update("followUps",[...existing,{optionIndex:oi,script:e.target.value,inputs}]);}} />
            </div>
            {(fu?.inputs||[]).map((inp,i)=>(
              <div key={i} style={{background:CARD,borderRadius:8,padding:"10px 12px",marginBottom:8,border:`1px solid ${BORDERL}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:TEXTM}}>Field {i+1}</span>
                  <button style={S.delBtn} onClick={()=>removeFollowUpField(oi,i)}>✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label style={S.edLbl}>Key (FF field name)</label><input style={S.edInp} value={inp.key||""} onChange={e=>updateFollowUpField(oi,i,"key",e.target.value)} /></div>
                  <div><label style={S.edLbl}>Label (shown to user)</label><input style={S.edInp} value={inp.label||""} onChange={e=>updateFollowUpField(oi,i,"label",e.target.value)} /></div>
                  <div><label style={S.edLbl}>Placeholder</label><input style={S.edInp} value={inp.placeholder||""} onChange={e=>updateFollowUpField(oi,i,"placeholder",e.target.value)} /></div>
                  <div><label style={S.edLbl}>Input Type</label>
                    <select style={S.edSel} value={inp.inputType||inp.type||"text"} onChange={e=>updateFollowUpField(oi,i,"inputType",e.target.value)}>
                      {["text","number","date","select"].map(t=><option key={t}>{t}</option>)}
                    </select></div>
                </div>
              </div>
            ))}
            <button style={{...S.addBtn,fontSize:11}} onClick={()=>addFollowUpField(oi)}>+ Add follow-up field for this option</button>
          </div>
        );
      })}
    </div>
  );
}

// ── EDITOR ────────────────────────────────────────────────────────────────────
function Editor({steps,onSave,onReset}){
  const[selId,setSelId]=useState(steps[0]?.id||null);
  const[edited,setEdited]=useState(()=>JSON.parse(JSON.stringify(steps)));
  const[saved,setSaved]=useState(false);
  const[dragIdx,setDragIdx]=useState(null);
  const[dragOverIdx,setDragOverIdx]=useState(null);

  const step=edited.find(s=>s.id===selId);
  const ALL_SECTIONS=[...new Set([...SECTIONS_ONE_CALL,...SECTIONS_TWO_CALL])];

  function update(field,val){setEdited(p=>p.map(s=>s.id===selId?{...s,[field]:val}:s));}
  function updateOption(i,val){const opts=[...(step.options||[])];opts[i]=val;update("options",opts);}
  function addOption(){update("options",[...(step.options||[]),"New option"]);}
  function removeOption(i){update("options",(step.options||[]).filter((_,idx)=>idx!==i));}
  function updateInput(i,field,val){const inps=[...(step.inputs||[])];inps[i]={...inps[i],[field]:val};update("inputs",inps);}
  function addInput(){update("inputs",[...(step.inputs||[]),{key:`field_${Date.now()}`,label:"New Field",placeholder:""}]);}
  function removeInput(i){update("inputs",(step.inputs||[]).filter((_,idx)=>idx!==i));}

  function handleSave(){onSave(edited);setSaved(true);setTimeout(()=>setSaved(false),2000);}

  function onStepDrop(i){
    if(dragIdx===null||dragIdx===i){setDragIdx(null);setDragOverIdx(null);return;}
    const r=[...edited];const[m]=r.splice(dragIdx,1);r.splice(i,0,m);
    setEdited(r);setDragIdx(null);setDragOverIdx(null);
  }

  const typeColor={tap:A,input:BLUE,info:"#8b5cf6",generate:EMERALD};

  return(
    <div style={S.edWrap}>
      <div style={S.edLeft}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:A,margin:0}}>Steps ({edited.length})</p>
          <div style={{display:"flex",gap:6}}>
            <button style={{...S.saveBtn,fontSize:11,padding:"6px 10px"}} onClick={()=>{const newId=`step_${Date.now()}`;const ns={id:newId,section:"Situation",script:"New step",type:"tap",options:["Option 1","Option 2"],followUps:[],note:"",next:"ALWAYS:null"};setEdited(p=>[...p,ns]);setSelId(newId);}}>+ Add</button>
            <button style={S.resetBtn} onClick={()=>{if(window.confirm("Reset all steps to defaults?"))onReset();}}>Reset</button>
          </div>
        </div>
        {edited.map((s,i)=>(
          <div key={s.id} draggable
            onDragStart={()=>setDragIdx(i)}
            onDragOver={e=>{e.preventDefault();setDragOverIdx(i);}}
            onDrop={()=>onStepDrop(i)}
            onDragEnd={()=>{setDragIdx(null);setDragOverIdx(null);}}
            style={{opacity:dragIdx===i?0.4:1,transition:"opacity 0.1s",border:`1px solid ${dragOverIdx===i&&dragIdx!==i?A:BORDERL+"00"}`,borderRadius:10,marginBottom:6}}
          >
            <button style={{...S.edStepBtn(selId===s.id,s.type),marginBottom:0}} onClick={()=>setSelId(s.id)}>
              <span style={S.dragH} title="Drag to reorder">⠿</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4,marginBottom:2}}>
                  <span style={{fontSize:10,color:TEXTD,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.section}</span>
                  <span style={S.badge(typeColor[s.type]||TEXTD)}>{s.type}</span>
                </div>
                <div style={{fontSize:12,color:selId===s.id?A:TEXT,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.id}</div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div style={S.edRight}>
        {!step?<p style={{color:TEXTD}}>Select a step to edit</p>:(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{fontSize:18,fontWeight:800,color:TEXT,margin:"0 0 4px 0"}}>{step.id}</h2>
                <span style={S.badge(typeColor[step.type]||TEXTD)}>{step.type}</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={S.resetBtn} onClick={()=>{if(window.confirm(`Delete step "${step.id}"?`)){const r=edited.filter(s=>s.id!==selId);setEdited(r);setSelId(r[0]?.id||null);}}}>🗑 Delete</button>
                <button style={S.saveBtn} onClick={handleSave}>{saved?"✓ Saved!":"Save Changes"}</button>
              </div>
            </div>

            <div style={S.edCard}>
              <p style={S.edH}>Basic Info</p>
              <div style={S.iGroup}><label style={S.edLbl}>Step ID</label>
                <input style={S.edInp} value={step.id} onChange={e=>{const newId=e.target.value;setEdited(p=>p.map(s=>s.id===selId?{...s,id:newId}:s));setSelId(newId);}} /></div>
              <div style={S.iGroup}><label style={S.edLbl}>Section</label>
                <select style={S.edSel} value={step.section} onChange={e=>update("section",e.target.value)}>
                  {ALL_SECTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
              <div style={S.iGroup}><label style={S.edLbl}>Type</label>
                <select style={S.edSel} value={step.type} onChange={e=>update("type",e.target.value)}>
                  {["tap","input","info","generate"].map(t=><option key={t}>{t}</option>)}</select></div>
              <div style={S.iGroup}><label style={S.edLbl}>FF Key (what to store the tap answer as)</label>
                <input style={S.edInp} value={step.ffKey||""} placeholder="e.g. marital, housing" onChange={e=>update("ffKey",e.target.value)} /></div>
            </div>

            <div style={S.edCard}>
              <p style={S.edH}>Script</p>
              <div style={S.iGroup}><label style={S.edLbl}>Main Script</label>
                <textarea style={S.edTa} value={step.script||""} onChange={e=>update("script",e.target.value)} />
                <p style={{fontSize:11,color:TEXTD,marginTop:4}}>Variables: [firstName] [housingLabel] [housingCost] [outgoings] [benefit] [DEFERRED] [DEFERRED_REASON]</p></div>
              <div style={S.iGroup}><label style={S.edLbl}>Sub-script (optional, shown below)</label>
                <textarea style={{...S.edTa,minHeight:52}} value={step.subScript||""} onChange={e=>update("subScript",e.target.value)} /></div>
              <div style={S.iGroup}><label style={S.edLbl}>Adviser Note (shown in blue, not read aloud)</label>
                <input style={S.edInp} value={step.note||""} placeholder="e.g. Only ask if client has kids" onChange={e=>update("note",e.target.value)} /></div>
            </div>

            {step.type==="tap"&&(
              <div style={S.edCard}>
                <p style={S.edH}>Tap Options</p>
                {(step.options||[]).map((opt,i)=>(
                  <div key={i} style={S.edOptRow}>
                    <input style={S.edInp} value={opt} onChange={e=>updateOption(i,e.target.value)} />
                    <button style={S.delBtn} onClick={()=>removeOption(i)}>✕</button>
                  </div>
                ))}
                <button style={S.addBtn} onClick={addOption}>+ Add option</button>
              </div>
            )}

            {step.type==="tap"&&(
              <div style={S.edCard}>
                <p style={S.edH}>Follow-up Questions (inline)</p>
                <FollowUpEditor step={step} update={update} />
              </div>
            )}

            {step.type==="input"&&(
              <div style={S.edCard}>
                <p style={S.edH}>Input Fields</p>
                {(step.inputs||[]).map((inp,i)=>(
                  <div key={i} style={{background:INNER,borderRadius:10,padding:"12px 14px",marginBottom:10,border:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:TEXTM}}>Field {i+1}</span>
                      <button style={S.delBtn} onClick={()=>removeInput(i)}>✕</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><label style={S.edLbl}>Key</label><input style={S.edInp} value={inp.key} onChange={e=>updateInput(i,"key",e.target.value)} /></div>
                      <div><label style={S.edLbl}>Label</label><input style={S.edInp} value={inp.label} onChange={e=>updateInput(i,"label",e.target.value)} /></div>
                      <div><label style={S.edLbl}>Placeholder</label><input style={S.edInp} value={inp.placeholder||""} onChange={e=>updateInput(i,"placeholder",e.target.value)} /></div>
                      <div><label style={S.edLbl}>Input Type</label>
                        <select style={S.edSel} value={inp.inputType||inp.type||"text"} onChange={e=>updateInput(i,"inputType",e.target.value)}>
                          {["text","number","date","select"].map(t=><option key={t}>{t}</option>)}</select></div>
                    </div>
                  </div>
                ))}
                <button style={S.addBtn} onClick={addInput}>+ Add input field</button>
              </div>
            )}

            <div style={S.edCard}>
              <p style={S.edH}>Next Step Logic</p>
              <NextStepBuilder step={step} allSteps={edited} update={update} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const[mode,setMode]=useState("live");
  // callMode: "one" = one-call blended, "two" = two-call (fact find + pitch)
  const[callMode,setCallMode]=useState("one");
  const activeDefaultSteps=callMode==="two"?TWO_CALL_STEPS:ONE_CALL_STEPS;
  const activeSections=callMode==="two"?SECTIONS_TWO_CALL:SECTIONS_ONE_CALL;

  const[steps,setSteps]=useState(()=>{
    try{
      const s=localStorage.getItem("ll_steps_"+callMode);
      return s?JSON.parse(s):activeDefaultSteps;
    }catch(e){return activeDefaultSteps;}
  });
  const[stepId,setStepId]=useState(steps[0]?.id||"intro");
  const[ff,setFF]=useState({});
  const[history,setHistory]=useState([steps[0]?.id||"intro"]);
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);
  const[error,setError]=useState(null);
  const[tab,setTab]=useState("script");

  // When call mode changes, load that mode's steps and reset the call
  function switchCallMode(newMode){
    setCallMode(newMode);
    const defaults=newMode==="two"?TWO_CALL_STEPS:ONE_CALL_STEPS;
    let loaded=defaults;
    try{const s=localStorage.getItem("ll_steps_"+newMode);if(s)loaded=JSON.parse(s);}catch(e){}
    setSteps(loaded);
    setStepId(loaded[0]?.id||"intro");
    setHistory([loaded[0]?.id||"intro"]);
    setFF({});setResult(null);setError(null);
  }

  const step=steps.find(s=>s.id===stepId);
  const secIdx=activeSections.indexOf(step?.section);
  const pct=step?.type==="generate"||result?100:Math.round((secIdx/(activeSections.length-1))*100);

  function saveSteps(ns){setSteps(ns);try{localStorage.setItem("ll_steps_"+callMode,JSON.stringify(ns));}catch(e){}}
  function resetSteps(){saveSteps(activeDefaultSteps);setStepId(activeDefaultSteps[0].id);setHistory([activeDefaultSteps[0].id]);}
  function go(nextId){if(!nextId)return;setHistory(h=>[...h,nextId]);setStepId(nextId);}

  function onAnswer(answer,nextId,extraInputs){
    if(answer==="generate"){generate();return;}
    const updates={};
    if(step?.ffKey&&answer)updates[step.ffKey]=answer;
    if(extraInputs)Object.assign(updates,extraInputs);
    if(Object.keys(updates).length)setFF(p=>({...p,...updates}));
    if(nextId)go(nextId);
  }
  function onInputNext(inputs,nextId){setFF(p=>({...p,...inputs}));if(nextId)go(nextId);}
  function goBack(){if(history.length<=1)return;setHistory(h=>h.slice(0,-1));setStepId(history[history.length-2]);}
  function resetCall(){setStepId(steps[0]?.id||"intro");setFF({});setHistory([steps[0]?.id||"intro"]);setResult(null);setError(null);}

  async function generate(){
    setLoading(true);setError(null);setResult(null);
    try{
      const res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:1800,messages:[{role:"user",content:buildPrompt(ff)}]})});
      const data=await res.json();
      if(data.error){setError(typeof data.error==="string"?data.error:JSON.stringify(data.error));return;}
      setResult(data.content?.find(b=>b.type==="text")?.text||"No response received.");
    }catch(e){setError("Failed to generate. Check your connection.");}
    finally{setLoading(false);}
  }

  function enrichScript(text){
    if(!text)return text;
    const def=ff.sickPayDuration||(ff.savingsLevel==="3+ months worth"?"3 months":"1 month");
    const out=parseFloat(ff.totalOutgoings)||0,pInc=parseFloat(ff.partnerIncome)||0,g=(parseFloat(ff.grossIncome)||0)*0.6/12;
    const ipBen=ff.partnerContrib==="Partner would contribute"?Math.min(Math.max(0,out-pInc),g):Math.min(out,g);
    const dR=ff.sickPayDuration?`the policy kicks in when your sick pay runs out, keeping the premium as low as possible`:ff.savingsLevel==="3+ months worth"?`your savings cover the first 3 months, making the premium considerably cheaper`:`you don't have sick pay or savings to fall back on, so you need it to start as soon as possible`;
    return text.replace(/\[firstName\]/g,ff.firstName||"[name]").replace(/\[housingLabel\]/g,ff.housing==="Mortgage"?"mortgage":"rent").replace(/\[housingCost\]/g,ff.mortgagePayment?fmtM(ff.mortgagePayment):ff.totalOutgoings?fmtM(ff.totalOutgoings):"[amount]").replace(/\[outgoings\]/g,ff.totalOutgoings?fmtM(ff.totalOutgoings):"[outgoings]").replace(/\[benefit\]/g,ipBen?fmtM(ipBen):"[benefit]").replace(/\[DEFERRED\]/g,def).replace(/\[DEFERRED_REASON\]/g,dR);
  }

  return(
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logoMk}>LL</div>
        <div><div style={S.logoT}>LifeLogic Live</div><div style={S.logoS}>Call Companion</div></div>
        <div style={{marginLeft:16}}><div style={S.modeTabs}>
          <button style={S.modeTab(mode==="live")} onClick={()=>setMode("live")}>📞 Live</button>
          <button style={S.modeTab(mode==="editor")} onClick={()=>setMode("editor")}>✏️ Editor</button>
        </div></div>
        {/* Call mode toggle — shown always */}
        <div style={{marginLeft:12}}>
          <div style={S.callTabs}>
            <button style={S.callTab(callMode==="one")} onClick={()=>switchCallMode("one")} title="One-call blended — fact find and pitch in a single call">1-Call</button>
            <button style={S.callTab(callMode==="two")} onClick={()=>switchCallMode("two")} title="Two-call process — fact find on call 1, pitch on call 2">2-Call</button>
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          {mode==="live"&&<>
            {history.length>1&&!result&&<button onClick={goBack} style={S.bkBtn}>← Back</button>}
            {result&&<button onClick={resetCall} style={{...S.bkBtn,color:EMERALD,borderColor:EMERALD}}>+ New Call</button>}
            <div style={{fontSize:11,color:TEXTD,background:INNER,padding:"4px 10px",borderRadius:6,border:`1px solid ${BORDER}`,fontWeight:600}}>{step?.section||"—"}</div>
          </>}
        </div>
      </div>

      {mode==="live"&&(
        <div style={S.prog}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {activeSections.map((s,i)=><span key={s} style={{fontSize:9,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:i<secIdx?EMERALD:i===secIdx?A:BORDERL}}>{s}</span>)}
            </div>
            <span style={{fontSize:11,color:A,fontWeight:700,flexShrink:0,marginLeft:8}}>{pct}%</span>
          </div>
          <div style={S.pBar}><div style={S.pFill(pct)}/></div>
        </div>
      )}

      {mode==="live"&&(
        <>
          <div style={S.tabs}>
            <button style={S.tab(tab==="script")} onClick={()=>setTab("script")}>📞 Script</button>
            <button style={S.tab(tab==="ff")} onClick={()=>setTab("ff")}>📋 Fact-Find</button>
          </div>
          <div style={S.body}>
            <div style={{...S.left,display:tab==="ff"?"none":"block"}}>
              {step&&<><div style={S.pill}>{step.section}</div>
                <div style={S.sBox}>
                  <div style={S.sLbl}>SAY THIS</div>
                  <ScriptText text={enrichScript(step.script)} style={S.sTxt} />
                  {step.subScript&&<ScriptText text={enrichScript(step.subScript)} style={S.sSub} />}
                </div></>}
              {step&&!result&&!loading&&<StepControls step={step} ff={ff} onAnswer={onAnswer} onInputNext={onInputNext}/>}
              {loading&&<div style={S.spin}><span style={{animation:"spin 1s linear infinite",display:"inline-block",color:A,fontSize:20}}>◌</span> Generating advice report…</div>}
              {error&&<div style={S.err}>{error}</div>}
              {result&&<div style={S.outBox}><p style={S.outH}>Advice Report</p><p style={S.outSub}>GENERATED BY LIFELOGIC AI</p><hr style={{border:"none",borderTop:`1px solid ${BORDER}`,margin:"0 0 12px 0"}}/><pre style={S.pre}>{result}</pre></div>}
            </div>
            <div style={{...S.right,display:"block"}}><FFSummary ff={ff}/></div>
          </div>
        </>
      )}

      {mode==="editor"&&<Editor steps={steps} onSave={saveSteps} onReset={resetSteps}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${DARK}}
        html,body,#root{height:100%;overflow:hidden}
        select option{background:#1a2235;color:#f9fafb}
        input:focus,select:focus,textarea:focus{border-color:${A}!important;box-shadow:0 0 0 3px rgba(245,158,11,0.12)!important;outline:none}
        ::placeholder{color:#4b5563}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${BORDERL};border-radius:2px}
      `}</style>
    </div>
  );
}

import { useState, useEffect } from "react";

const CLAUDE_MODEL = "claude-sonnet-5";
// Paste your Google Form share link between the quotes below.
// Until you do, the button quietly points to the DMNU site as a fallback.
const STRATEGY_FORM_URL = "";
const NAVY = "#1A2B4A";
const TEAL = "#2ABFBF";
const TEAL_INK = "#0E7C7B"; // darker teal for text on white/light (WCAG AA)
const FOCUS = "#D97706";    // focus-ring colour, >=3:1 on both white and navy
// Makes a non-button element keyboard-operable (WCAG 2.1.1, 4.1.2).
const clickable = (fn) => ({ onClick: fn, role: "button", tabIndex: 0,
  onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } } });
const SUCCESS = "#27AE60";
const WARNING = "#F39C12";
const ALERT = "#E74C3C";
const PURPLE = "#8B5CF6";
const BG = "#F8F9FA";

// ── QUESTIONS ────────────────────────────────────────────────────────
// format: "agree" = 5-point agreement scale · "status" = Yes/Working on it/No/I don't know
const QUESTIONS = [
  { id:1, dimension:"awareness", format:"agree",  text:"I have a clear understanding of what AI tools are currently being used in my organisation or school." },
  { id:2, dimension:"awareness", format:"agree",  text:"I feel confident explaining the basics of the EU AI Act, or relevant AI regulation, to my colleagues." },
  { id:3, dimension:"awareness", format:"agree",  text:"My team or staff are aware of both the opportunities and the risks that AI presents to our work." },
  { id:4, dimension:"policy",    format:"status", text:"My organisation or school has a written AI policy or usage guidelines in place." },
  { id:5, dimension:"policy",    format:"status", text:"We have clear data privacy procedures, aligned with GDPR, for the AI tools we use." },
  { id:6, dimension:"policy",    format:"status", text:"There is a named person or team responsible for AI governance in my organisation or school." },
  { id:7, dimension:"practice",  format:"agree",  text:"Staff in my organisation or school are actively using AI tools to save time or improve the quality of their work." },
  { id:8, dimension:"practice",  format:"status", text:"We have provided structured AI training or professional development in the last 12 months." },
  { id:9, dimension:"practice",  format:"agree",  text:"I can point to at least one concrete example where AI has improved an outcome in my organisation or school." },
  { id:10,dimension:"culture",   format:"agree",  text:"Leadership in my organisation or school actively models and champions the responsible use of AI." },
  { id:11,dimension:"culture",   format:"agree",  text:"Staff feel safe to experiment with AI tools and to share what they learn." },
  { id:12,dimension:"culture",   format:"agree",  text:"We regularly review and update our approach to AI as the technology and regulations evolve." },
  { id:13,dimension:"policy",    format:"status", text:"AI training in my organisation is coordinated at institutional level, not left to individual staff to arrange." },
  { id:14,dimension:"awareness", format:"agree",  text:"I know which of the AI tools used in my organisation could significantly affect a person's access, assessment, or progression." },
];

const LABELS = ["Strongly Disagree","Disagree","Sometimes","Agree","Strongly Agree"];
const STATUS_OPTIONS = [
  { label:"Yes",           value:5 },
  { label:"Working on it", value:3 },
  { label:"No",            value:1 },
  { label:"I don't know",  value:2 },
];
function answerLabel(q,val){
  if(val===undefined||val===null) return "No answer";
  if(q.format==="status"){ const o=STATUS_OPTIONS.find(x=>x.value===val); return o?o.label:String(val); }
  return LABELS[val-1]||String(val);
}

const DIM_LABELS = { awareness:"Awareness", policy:"Policy & Compliance", practice:"Practice", culture:"Culture" };
const DIM_COLORS = { awareness:TEAL, policy:"#3B82F6", practice:PURPLE, culture:WARNING };
const DIM_DESC   = {
  awareness:"Whether leaders and staff understand what AI tools are in use and what regulatory frameworks apply.",
  policy:"Whether governance structures, written policies, data privacy procedures, and named accountability exist.",
  practice:"Whether AI is actively and demonstrably being used to improve outcomes, supported by structured training.",
  culture:"Whether leadership models AI use, staff feel safe to experiment, and the organisation reviews iteratively.",
};

// ── DEMOGRAPHICS ─────────────────────────────────────────────────────
const DEMOGRAPHICS = [
  { key:"orgType",     label:"What type of organisation are you in?",          options:["Primary","Post-Primary","ETB","Higher Education","Corporate","Other"] },
  { key:"designation", label:"How is your school or organisation designated?", options:["DEIS","Public","Private","Other"] },
  { key:"size",        label:"How many staff are in your organisation?",       options:["Under 100","100–300","300–500","500+"] },
];

const ROLE_LABELS = { school_leader:"School Leader", teacher:"Teacher", ld_manager:"L&D Manager", trainer:"Trainer" };

// ── LOCATION CASCADE ─────────────────────────────────────────────────
const ROI_COUNTIES = ["Carlow","Cavan","Clare","Cork","Donegal","Dublin","Galway","Kerry","Kildare","Kilkenny","Laois","Leitrim","Limerick","Longford","Louth","Mayo","Meath","Monaghan","Offaly","Roscommon","Sligo","Tipperary","Waterford","Westmeath","Wexford","Wicklow"];
const NI_COUNTIES = ["Antrim","Armagh","Derry","Down","Fermanagh","Tyrone"];
const EU_STATES = ["Austria","Belgium","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden"];
const NON_EU_REGIONS = ["Great Britain","Northern Africa","Sub-Saharan Africa","Central Asia","Eastern Asia","South-Eastern Asia","Southern Asia","Western Asia (Middle East)","Northern America","Central America","Caribbean","South America","Europe (non-EU)","Australia and New Zealand","Pacific Islands"];
const GB_NATIONS = ["England","Scotland","Wales"];

// Returns {label, options} for the next step given the chosen path, or null when the path is complete (leaf reached).
function locationOptions(path){
  const [j,a,b] = path;
  if(path.length===0) return { label:"Where are you based?", options:["Republic of Ireland","Northern Ireland","Outside Ireland"] };
  if(j==="Republic of Ireland" && path.length===1) return { label:"County", options:ROI_COUNTIES };
  if(j==="Northern Ireland"    && path.length===1) return { label:"County", options:NI_COUNTIES };
  if(j==="Outside Ireland"){
    if(path.length===1) return { label:"Region", options:["EU","Non-EU"] };
    if(a==="EU" && path.length===2) return { label:"EU member state", options:EU_STATES };
    if(a==="Non-EU"){
      if(path.length===2) return { label:"Where?", options:NON_EU_REGIONS };
      if(b==="Great Britain" && path.length===3) return { label:"Nation", options:GB_NATIONS };
    }
  }
  return null;
}
// Readable location string for the report and aggregate.
function locationString(path){
  if(!path || !path.length) return "";
  const j=path[0];
  if(j==="Republic of Ireland" || j==="Northern Ireland") return path.length>1 ? `${path[1]}, ${j}` : j;
  const leaf=path[path.length-1];
  if(leaf==="Great Britain") return "Great Britain";
  if(leaf==="EU" || leaf==="Non-EU") return `${leaf}, outside Ireland`;
  if(leaf==="Outside Ireland") return "Outside Ireland";
  return leaf;
}

// ── SCENARIOS ────────────────────────────────────────────────────────
const SCENARIOS = {
  policy: {
    id:"teachbot",
    tool:"TeachBot HQ",
    subtitle:"The Instant IEP Problem",
    tag:"Policy & Compliance",
    tagColor:"#3B82F6",
    why:"Your Policy & Compliance score shows this is your most urgent area. This scenario puts you right in the middle of a governance crisis.",
    brief:"TeachBot HQ generates instant Individual Education Plans using teacher notes and medical assessment data. It has been trialled in four classrooms without formal approval. Parents have been receiving AI-generated IEPs, unaware that humans only 'checked' them. Teachers are uploading doctor assessment documents directly to the AI dashboard.",
    proofStep:"O: Obligations & Oversight",
    proofDesc:"Identify what rules apply to your role as deployer. Add human oversight, clear documentation, and transparency mechanisms before any further use.",
    resource:"EU AI Act Cheat Sheet",
    resourceUrl:"https://canva.link/8d55o3qpczvmb8x",
    questions:[
      { q:"A parent asks to see their child's IEP and questions whether it was written by a human. What do you do first?", options:["Disclose the AI's role and explain how it was reviewed","Say only that a teacher reviewed it and leave it there","Withdraw TeachBot at once without telling the parent","Refer the parent to the IT department to explain"] },
      { q:"A teacher wants to upload a child's psychiatric assessment to TeachBot to improve the IEP quality. What is the correct response?", options:["Allow it, since better data makes for better IEPs","Allow it only if the teacher reviews the AI output","Block it: this is special category data under GDPR","Check first whether the vendor is GDPR compliant"] },
      { q:"Leadership asks for a 30-day action plan. What is your first priority?", options:["Commission a full external audit before doing anything","Keep using TeachBot but add a disclaimer to the IEPs","Draft a policy document and circulate it for feedback","Pause TeachBot, tell parents, and run a data assessment"] },
    ],
    kapow:{
      after:1,
      title:"⚡ KAPOW: Policy Update",
      text:"Breaking: The Data Protection Commission has just issued new guidance stating that AI-generated documents involving children's medical data require explicit parental consent and a completed DPIA before any deployment. Your principal asks: 'Where does this leave us?'",
      followUp:"How does this change your 30-day plan?",
    },
  },
  awareness: {
    id:"insighted",
    tool:"InsightEd",
    subtitle:"Invisible AI, Visible Consequences",
    tag:"Awareness",
    tagColor:TEAL,
    why:"Your Awareness score suggests your organisation may not have full visibility of the AI tools already in use. This scenario is built on exactly that gap.",
    brief:"InsightEd is an AI insights layer that switched on inside the school's digital learning platform, the online system teachers already use every day for assignments, materials, and communication. It arrived in a routine update. No announcement was made. The platform now shows an engagement dashboard that flags which students and which activities are 'low engagement', and many teachers do not realise these insights are AI-generated. Because group work and open-ended creative tasks register as low engagement, the dashboard quietly nudges teachers to cut them. Nobody chose this feature, nobody reviewed it, and there is no documentation of what 'engagement' actually measures.",
    proofStep:"P: Profile Your AI Use",
    proofDesc:"Conduct an AI audit of every tool in your ecosystem, including the AI features switched on inside systems you already use. You cannot govern what you cannot see.",
    resource:"AI in ED Policy Workshop",
    resourceUrl:"https://canva.link/1c571fp50g2jytw",
    debriefFocus:"This scenario turns on transparency and profiling. Under the EU AI Act, people must know when AI is shaping decisions about them, and neither teachers nor students were told the insights were AI-generated. An engagement dashboard measures what is easy to count, not what matters: group work and creative tasks register as low engagement because they are hard to measure, not because they are low value. And the tool's own adaptive features are gated behind paid tiers and school devices, so the students it flags as disengaged are often the ones it never fully served. Reading an access gap as an effort gap penalises disadvantage. A tool switched on by a routine update, that nobody chose or reviewed, is exactly what the Profile step exists to catch.",
    questions:[
      { q:"Teachers do not know InsightEd is AI. Under the EU AI Act, what is the most serious obligation being breached?", options:["The duty to register the AI system with the EU","The duty to run a full technical audit each year","The transparency duty: people must know AI is used","The duty to publish the system's source code"] },
      { q:"A teacher notices group work is consistently flagged as 'low engagement' and shortened. What should they do?", options:["Document the pattern and ask leadership how it decides","Accept the recommendation, since it is based on data","Ignore it and keep planning group work anyway","Switch the AI feature off without telling anyone"] },
      { q:"The school wants to put this right within 60 days. What is the most important first step?", options:["Replace InsightEd with a tool that uses no AI","Tell all staff AI is embedded and set up a feedback route","Hire a dedicated compliance officer to manage it","Publish a press release about the school's AI strategy"] },
    ],
    kapow:{
      after:1,
      title:"⚡ KAPOW: The Gap",
      text:"A closer look at who the dashboard flags changes the picture. The platform's best study tools, the adaptive quizzes and guided revision, only work fully for students on the paid tier with a school device at home. The students marked 'low engagement' are, again and again, the ones without that access. The dashboard is not measuring who is trying. It is measuring who can afford the full version, and reading the difference as effort.",
      followUp:"The tool created part of the gap it is now flagging. What does that ask of how you read its insights?",
    },
  },
  practice: {
    id:"gradegenie",
    tool:"GradeGenie",
    subtitle:"The Invisible Marker",
    tag:"Practice",
    tagColor:PURPLE,
    why:"Your Practice score suggests AI use in your organisation may lack structure and oversight. This scenario is about what happens when AI becomes invisible in daily practice.",
    brief:"GradeGenie allows teachers to paste student essays and receive pre-written feedback aligned to a rubric. Some teachers, under time pressure, use the comments as they are without modification. Students have begun noticing patterns: similar wording, repeated phrases, odd comments that do not match what they wrote. One student posted screenshots asking 'Is this feedback even from a real person?'",
    proofStep:"O: Obligations & Oversight",
    proofDesc:"Establish clear expectations for human review of all AI-generated outputs before they reach students. Document your oversight process.",
    resource:"Scenario Cards",
    resourceUrl:"https://canva.link/9yzvujteg04pjik",
    questions:[
      { q:"Students are questioning whether their feedback is from a real person. Under the EU AI Act, what obligation is most relevant?", options:["The duty to register GradeGenie as a high-risk system","The prohibition on emotion recognition systems","The requirement to use only open-source models","The transparency duty: students must know AI is used"] },
      { q:"A teacher argues: 'I do review the feedback, I just rarely change it.' Is this sufficient human oversight?", options:["Yes, any human glance counts as proper oversight","No: oversight means being willing to actually intervene","Yes, as long as the review is documented somewhere","Only if the teacher can explain the AI's rubric"] },
      { q:"Leadership wants to keep using GradeGenie but restore student trust. What is the most important immediate action?", options:["Tell students AI drafts feedback and teachers review it","Disable GradeGenie and go back to manual grading","Add a brief AI disclaimer to each report card","Survey students on their satisfaction with the feedback"] },
    ],
    kapow:{
      after:1,
      title:"⚡ KAPOW: Deepfake Alert",
      text:"A student has created a deepfake video showing 'GradeGenie' generating racist feedback, which has gone viral in your school community. The video is fabricated, but indistinguishable from real. Parents are demanding answers at an emergency meeting tonight.",
      followUp:"How does your communication and governance response change when misinformation about your AI tools spreads faster than the facts?",
    },
  },
  culture: {
    id:"classmind",
    tool:"ClassMind AI",
    subtitle:"The Quiet Takeover",
    tag:"Culture",
    tagColor:WARNING,
    why:"Your Culture score is your biggest gap. This scenario is about what happens when AI adoption spreads peer-to-peer without any cultural or governance foundation.",
    brief:"About 60% of teachers at Riverview Secondary rely on ClassMind AI to generate parent communications, feedback, and grades based on AI-generated rubrics. It spread entirely peer-to-peer, with no formal rollout and no training. Students aren't aware feedback is AI-generated. Nobody knows what data ClassMind stores. Grades influence access to school-subsidised extracurricular activities.",
    proofStep:"R: Risk-Classify the Tools",
    proofDesc:"ClassMind is being used for automated grading that affects student access to activities, so it likely qualifies as high-risk under the EU AI Act. Classify it formally and act accordingly.",
    resource:"Kapow Cards",
    resourceUrl:"https://canva.link/z833pn3nfffq1kv",
    questions:[
      { q:"Grades generated by ClassMind affect access to extracurricular activities. Under the EU AI Act, how should this be classified?", options:["Minimal risk, it is only a grading assistant","High risk: it shapes student access to opportunities","Limited risk, needing only a transparency notice","Unacceptable risk, it must be banned at once"] },
      { q:"60% of teachers are using ClassMind. Leadership wants to stop this, but teachers love it. What is the most effective approach?", options:["Ban it immediately and monitor staff for compliance","Send a strongly worded email about the policy","Wait until the EU AI Act is fully enforced in 2027","Assess the risk and co-design a use protocol with staff"] },
      { q:"Parents find out AI is grading their children's work. What is the first thing the school must do?", options:["Deny AI involvement until the investigation finishes","Suspend all the teachers who used ClassMind","Explain openly what it does and how grades are reviewed","Ask ClassMind's vendor to issue a statement"] },
    ],
    kapow:{
      after:1,
      title:"⚡ KAPOW: Regulatory Contact",
      text:"The Data Protection Commission contacts the school directly. They have received a complaint from a parent and are requesting documentation of your AI data processing activities, your DPIA for ClassMind, and records of staff training on AI use. You have 30 days to respond.",
      followUrl:"https://canva.link/z833pn3nfffq1kv",
      followUp:"What documentation can you produce right now, and what does the gap tell you about your governance culture?",
    },
  },
};

// ── UNIVERSAL SCENARIOS ──────────────────────────────────────────────
// Not dimension-matched. Offered to every user regardless of lowest score.
const FLAG_SCENARIO = {
  id:"theflag",
  tool:"WriteGuard AI",
  subtitle:"The 94% That Wasn't",
  tag:"Equity",
  tagColor:"#DB2777",
  universal:true,
  cardLabel:"⚖ Equity scenario · available to everyone",
  why:"This scenario is available to everyone, whatever your scores. AI detectors misflag students who write in an additional language, neurodivergent students, and students whose writing outpaces how they speak, while missing those who can afford to evade them. It asks what you do when the tool is wrong and a student carries the cost.",
  brief:"St. Brigid's Community School, a DEIS post-primary in Dublin, uses WriteGuard AI to screen essays for AI use, with an automatic penalty for anything it flags. An essay by a student who arrived from Ukraine eighteen months ago, writing in her third language, is flagged at 94% AI-generated. She says she wrote every word, and her teacher believes her. The essay was sent for screening in the first place because a staff member felt the writing was stronger than the student's spoken English. The deputy principal wants to apply the penalty. The detector gives a number, not an explanation.",
  proofStep:"O: Obligations & Oversight",
  proofDesc:"A detector score is not evidence on its own. Put meaningful human review, a route to explanation, and a right of appeal around any automated flag before it affects a student.",
  resource:"SAV: AI Detection Analysis",
  resourceUrl:"#sav-resource",
  debriefFocus:"This scenario turns on equity. AI detectors do not catch AI use. They catch the students who cannot afford to evade them: the ones without paid tools, private tuition, or the skill to make AI write in their own voice. The students who slip through are doing exactly what DigComp, the EU and OECD AILit framework, and the UNESCO competencies all call good AI literacy, while the tool penalises those who were never given access to learn it. Spoken register, accent, and fluency are not evidence of written ability, and treating a gap between them as suspicious is a class and prestige bias the score only launders. A detector score is never determinative proof of misconduct, and Irish bodies including the Higher Education Authority have urged this caution. Under Article 85 of the EU AI Act, now in force, a parent, student, or teacher can complain about a suspected breach directly to the national authority, with no court process, and enforcement is likelier where inadequate staff training caused the harm. Coordinated institution-level training is the school's real defence, not a folder of individual certificates.",
  questions:[
    { q:"The essay is flagged at 94% and the deputy principal wants to apply the automatic penalty. What do you do first?", options:["Set the score aside and look at her drafts and process","Apply the penalty, since 94% is strong enough to act on","Ask the student to prove that she wrote it herself","Run it through a second detector and compare the results"] },
    { q:"Looking closer, a colleague realises one of the other flagged students is dyslexic. She wrote her essay by dictating into a speech-to-text app, because speaking her ideas works when typing does not. She used AI, and broke no rule. How should this shape your approach?", options:["She used AI, so the flag stands and the penalty applies","Have her redo the essay by typing, without any tools","Using AI is not cheating: assistive use is legitimate","Allow it this once but keep the automatic penalty"] },
    { q:"What is the right change to make at school level?", options:["Keep WriteGuard and tell teachers to use judgement","Switch to a different detection vendor and carry on","Stop all use of AI anywhere across the school","Drop the auto-penalty; require human review and appeal"] },
  ],
  kapow:{
    after:1,
    title:"⚡ KAPOW: The Email",
    text:"A parent emails the school. Through their own child, they have learned that a private, fee-charging AI club runs on the school premises after hours, advertised through the school's own channels. Students there set up paid pro accounts and build a 'usemyvoice' setting, a custom instruction that makes the AI write in their own voice, small mistakes and all, so nothing they submit is ever flagged. The parent is uneasy. The students being flagged, they point out, are the ones who cannot pay for any of that, and several were referred only because a teacher felt their writing was too good for how they speak.",
    followUp:"The tool is not catching the students who used AI. It is catching the students who could not afford to hide it. What does that ask of you now?",
  },
};

const NEWSLETTER_SCENARIO = {
  id:"newsletter",
  tool:"DraftWise AI",
  subtitle:"The Newsletter Nobody Signed",
  tag:"Transparency",
  tagColor:"#6366F1",
  universal:true,
  cardLabel:"📢 Transparency scenario · available to everyone",
  why:"This scenario is available to everyone, whatever your scores. Article 50's transparency duty is now in force. When an organisation publishes AI-drafted text to inform the public, the duty turns on one thing: can you show a named person took responsibility for it? It works for a training body, a college, an ETB, or a company.",
  brief:"Meridian Learning is a training organisation. Its monthly bulletin goes out to several thousand learners, staff, and members of the public. This month, most of it was drafted by DraftWise AI, an AI writing tool, and sent out on schedule. It reads well. Nobody is named anywhere as having reviewed it, and there is no record of who checked it before it went out. A board member asks a simple question: under the new transparency rules, did we need to disclose that AI wrote this, and can we show who was responsible for it?",
  proofStep:"O: Obligations & Oversight",
  proofDesc:"Article 50's text-disclosure duty falls on you as a deployer for AI text published to inform the public. The safeguard is a light one: a named person reviews public communications, holds editorial responsibility, and you can show it.",
  resource:"EU AI Act, Article 50 (official)",
  resourceUrl:"https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50",
  debriefFocus:"Article 50(4)'s text-disclosure duty covers AI-generated text published to inform the public on matters of public interest, and it carves out content that has been through human review, where a named person holds editorial responsibility for what is published. So the question is rarely whether AI was used. It is whether someone reviewed it, is named, and can show it. The chatbot-disclosure and machine-marking duties fall on the provider that builds the tool, not on the deployer using it, which is why an individual staff member drafting with AI is usually not the one who must disclose. The deployer's duty is the review and the named responsibility. Most organisations already review public communications as normal practice, and almost none could currently prove it. None of this is intuitive, and the only way to know the carve-out applied is to stop and check.",
  questions:[
    { q:"The board member asks whether you needed to disclose that AI wrote the bulletin, and who was responsible. What is the actual duty here?", options:["No duty applies: Article 50 is only about chatbots","It applies, but names a reviewer as the real question","We must label everything AI and that settles it","The tool's provider handles this, so we have no duty"] },
    { q:"A staff member says the person who used the AI to write it should have disclosed they used AI, the way a teacher might label AI-made slides. Is that where the duty sits?", options:["No: the disclosure duty sits with the tool's provider","Yes, whoever uses AI must personally disclose it","No one has a duty; AI-assisted writing is exempt","Only content naming a real person needs disclosure"] },
    { q:"What do you put in place so the organisation is inside the carve-out and can show it?", options:["Add a footer saying it may contain AI content","Stop using AI to draft any public communications","Name a reviewer, record the review, keep the evidence","Get a compliance certificate from the AI vendor"] },
  ],
  kapow:{
    after:1,
    title:"⚡ KAPOW: Prove It",
    text:"It turns out someone did glance over the bulletin before it went out. A staff member read it, fixed a typo, and hit send. But nobody was formally responsible for it, nobody recorded that a review had happened, and if anyone asked the organisation to show who stood behind the content, there is nothing to point to. The review happened. It just cannot be proven.",
    followUp:"You almost certainly did the right thing. The problem is that you cannot show it. What would it take to be able to?",
  },
};

// Practice-dimension scenario for non-school settings (ETB FET, HE, corporate L&D).
// Swapped in for GradeGenie by pickScenario() based on organisation type.
const LD_PRACTICE_SCENARIO = {
  id:"ascend",
  tool:"AscendAI",
  subtitle:"Ranked by the Machine",
  tag:"Practice",
  tagColor:PURPLE,
  why:"Your Practice score suggests AI use in your organisation may lack structure and oversight. This scenario is about what happens when an AI tool starts shaping decisions about your own people.",
  brief:"AscendAI scores staff for promotion readiness by analysing performance data, training records, and manager feedback. It was brought in to save time shortlisting for progression. Under pressure, some managers have started treating the score as the decision rather than an input, and two people with strong records were passed over because the tool ranked them low. Nobody can fully explain how the score is calculated. One of those passed over has asked, in writing, how the decision about her was made.",
  proofStep:"O: Obligations & Oversight",
  proofDesc:"An AI tool that shapes decisions about people's jobs is high-risk under the EU AI Act. Keep a named human accountable for every decision, make the reasoning explainable, and give people a route to challenge it.",
  debriefFocus:"AI used to evaluate staff or shape promotion and progression decisions is high-risk under the EU AI Act (Annex III, employment). Where an AI-assisted decision materially affects someone's job, Article 86 gives them a right to a clear explanation of how it was made. Meaningful human oversight means a named person who can understand the score, depart from it, and be accountable for the outcome, not one who defers to it. A score built from performance and activity data can reproduce bias through proxies, such as hours logged standing in for parental leave, even when protected characteristics were never entered. Objectivity in appearance is not fairness in fact.",
  resource:"EU AI Act, Article 86 (official)",
  resourceUrl:"https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-86",
  questions:[
    { q:"The person passed over has asked, in writing, how the decision about her was made. Under the EU AI Act, what is most relevant?", options:["The tool must be registered as open-source first","The prohibition on emotion recognition applies here","No duty applies: staff data is not personal data","It is high-risk, and she has a right to an explanation"] },
    { q:"A manager says: 'I do use my judgement, I just tend to go with the score.' Is that sufficient human oversight?", options:["Yes, any human involvement counts as oversight","No: real oversight means being able to overrule it","Yes, provided the score is recorded on file","Only if the manager can name the data it used"] },
    { q:"Leadership wants to keep AscendAI but make progression decisions defensible. What matters most?", options:["Use it as input only; a named person can overrule it","Stop using it and go back to manual shortlisting","Add a line to the staff handbook about AI use","Ask the vendor to confirm the tool is unbiased"] },
  ],
  kapow:{
    after:1,
    title:"⚡ KAPOW: The Proxy",
    text:"A pattern surfaces. AscendAI consistently ranks part-time staff and those returning from leave lower, because it weights recent continuous activity and hours logged. Most of the people affected are women who returned from parental leave in the last two years. The tool was never told anyone's gender or their leave. It did not need to be. It found a proxy.",
    followUp:"The score looked objective. It was reproducing a bias nobody entered. What does that ask of how you use it?",
  },
};

// Scenarios offered to every user, in addition to the dimension-matched one.
const UNIVERSAL_SCENARIOS = [FLAG_SCENARIO, NEWSLETTER_SCENARIO];

const CORRECT_ANSWERS = {
  teachbot:  [0,2,3], insighted: [2,0,1], gradegenie: [3,1,0], classmind: [1,3,2], theflag: [0,2,3], newsletter: [1,0,2], ascend: [3,1,0],
};

const TIER_GOVERNANCE = {
  Emerging:[
    "Appoint a named AI lead, someone must own this",
    "Audit which AI tools are currently in use (sanctioned or not)",
    "Draft a 1-page AI Acceptable Use Policy as an immediate starting point",
    "Run a staff awareness session on EU AI Act obligations",
    "Add AI data handling to your existing GDPR review cycle",
  ],
  Developing:[
    "Formalise your AI policy with staff, student/client, and legal input",
    "Map your AI tools against EU AI Act risk categories",
    "Create a structured AI CPD pathway, not one-off training",
    "Establish a quarterly AI governance review cadence",
    "Document at least 3 concrete AI use cases with measurable outcomes",
  ],
  Leading:[
    "Publish your AI policy publicly, since transparency builds sector trust",
    "Pilot a staff AI literacy certification programme",
    "Share your governance model with peer institutions",
    "Contribute to EU AI Act consultation processes for your sector",
    "Build an ongoing feedback loop: regular pulse surveys on AI confidence",
  ],
};

// ── HELPERS ──────────────────────────────────────────────────────────
function getTier(score) {
  if (score < 2.5) return { label:"Emerging",   color:ALERT,   emoji:"🌱" };
  if (score < 3.8) return { label:"Developing",  color:WARNING, emoji:"📈" };
  return                    { label:"Leading",    color:SUCCESS, emoji:"🏆" };
}
function calcScores(answers) {
  const dims = { awareness:[], policy:[], practice:[], culture:[] };
  QUESTIONS.forEach(q => { if (answers[q.id]) dims[q.dimension].push(answers[q.id]); });
  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const s = { awareness:avg(dims.awareness), policy:avg(dims.policy), practice:avg(dims.practice), culture:avg(dims.culture) };
  s.overall = avg(Object.values(s));
  return s;
}
function lowestDim(scores) {
  return Object.entries({ awareness:scores.awareness, policy:scores.policy, practice:scores.practice, culture:scores.culture })
    .sort((a,b)=>a[1]-b[1])[0][0];
}
function otherDims(lowest) {
  return Object.keys(SCENARIOS).filter(k=>k!==lowest);
}
// Non-school settings get the L&D staff-assessment scenario in the Practice slot.
const NON_SCHOOL_ORGS = ["ETB","Higher Education","Corporate"];
function pickScenario(dim, orgType){
  // Non-school settings (ETB, Higher Education, Corporate) never get the
  // primary/post-primary scenarios (IEPs, school grading). AscendAI is the
  // sector-appropriate simulation for institutional and corporate contexts.
  if(NON_SCHOOL_ORGS.includes(orgType)) return LD_PRACTICE_SCENARIO;
  return SCENARIOS[dim];
}
function stripMarkdown(t){
  if(!t) return t;
  return t
    .replace(/^\s*[-*_]{3,}\s*$/gm,"")        // horizontal rules: --- *** ___
    .replace(/\*\*\*(.+?)\*\*\*/g,"$1")        // ***bold italic***
    .replace(/\*\*(.+?)\*\*/g,"$1")            // **bold**
    .replace(/__(.+?)__/g,"$1")                // __bold__
    .replace(/^#{1,6}\s*/gm,"")                // # headers
    .replace(/`([^`]+)`/g,"$1")                // `inline code`
    .replace(/\n{3,}/g,"\n\n")                 // collapse blank lines
    .trim();
}
// Robust section splitter: finds each heading anywhere (even inline), slices between them,
// and strips the heading label. Tolerant of the model varying its formatting.
function splitSections(text, heads){
  const up=text.toUpperCase();
  const found=heads.map(([k,label])=>({k,label,idx:up.indexOf(label)})).filter(p=>p.idx>=0).sort((a,b)=>a.idx-b.idx);
  const s={};
  if(found.length===0){ s.raw=text.trim(); return s; }
  for(let i=0;i<found.length;i++){
    const cur=found[i], nxt=found[i+1];
    let seg=text.slice(cur.idx+cur.label.length, nxt?nxt.idx:text.length);
    seg=seg.replace(/^[\s:.\u2013\u2014-]+/,"").trim();
    s[cur.k]=seg;
  }
  return s;
}

// ── UI COMPONENTS ────────────────────────────────────────────────────
function ScoreBar({ label, score, color }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:13,fontWeight:600,color:NAVY}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color}}>{score.toFixed(1)}/5</span>
      </div>
      <div style={{background:"#E2E8F0",borderRadius:8,height:10,overflow:"hidden"}}>
        <div style={{width:`${(score/5)*100}%`,background:color,height:"100%",borderRadius:8,transition:"width 1s ease"}}/>
      </div>
    </div>
  );
}
function ReportSection({ title, content }) {
  return (
    <div style={{marginBottom:18,padding:"16px 20px",background:"#fff",borderRadius:12,border:"1px solid #E2E8F0"}}>
      <div style={{fontWeight:700,color:NAVY,marginBottom:8,fontSize:14,borderBottom:`2px solid ${TEAL}`,paddingBottom:6}}>{title}</div>
      <div style={{color:"#374151",lineHeight:1.7,fontSize:14,whiteSpace:"pre-wrap"}}>{content}</div>
    </div>
  );
}
function Disclosure({ title, children }) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{border:"1px solid #E2E8F0",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} aria-expanded={open} style={{width:"100%",background:open?"#F0FAFA":"#fff",border:"none",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",textAlign:"left"}}>
        <span style={{fontWeight:600,color:NAVY,fontSize:14}}>{title}</span>
        <span aria-hidden="true" style={{color:TEAL_INK,fontSize:18,lineHeight:1}}>{open?"−":"+"}</span>
      </button>
      {open && <div style={{padding:"0 16px 14px",background:"#FAFEFE"}}>{children}</div>}
    </div>
  );
}

// ── FRAMEWORK PAGES ──────────────────────────────────────────────────
function PageShell({ eyebrow, title, subtitle, onBack, children }) {
  return (
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:BG}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
      <div style={{background:NAVY,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:8}}><img src="/dmnu-icon.png" alt="DMNU" style={{height:24,width:"auto"}}/><span style={{color:TEAL,fontWeight:700,fontSize:14}}>DMNU</span></span>
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${TEAL}`,color:TEAL,borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>← Back</button>
      </div>
      <div style={{maxWidth:760,margin:"0 auto",padding:"40px 24px 64px"}}>
        {eyebrow && <div style={{fontSize:11,fontWeight:700,letterSpacing:3,color:TEAL_INK,textTransform:"uppercase",marginBottom:12}}>{eyebrow}</div>}
        <h1 style={{color:NAVY,fontSize:"clamp(24px,4vw,32px)",fontWeight:800,lineHeight:1.2,marginBottom:subtitle?10:24}}>{title}</h1>
        {subtitle && <p style={{color:"#64748B",fontSize:16,lineHeight:1.5,marginBottom:8}}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
function FwH({children}){ return <h2 style={{color:NAVY,fontSize:19,fontWeight:700,margin:"32px 0 12px"}}>{children}</h2>; }
function FwP({children}){ return <p style={{color:"#374151",fontSize:15,lineHeight:1.7,marginBottom:12}}>{children}</p>; }
function AttribBox({children}){ return <div style={{background:"#F0FAFA",border:`1px solid ${TEAL}44`,borderRadius:10,padding:"14px 16px",marginTop:8,marginBottom:8}}><p style={{color:"#0F5257",fontSize:13,lineHeight:1.6}}>{children}</p></div>; }

function CairePage({ onBack }) {
  const values=[
    ["C","Creativity","AI adoption should enhance rather than replace human creativity. Tools should open new possibilities for expression, problem-solving, and learning, not narrow them."],
    ["A","Agency","Students, teachers, and communities should retain meaningful control over AI interactions. Agency means the ability to question, override, and shape AI use, not passive consumption of AI outputs."],
    ["I","Innovation","Genuine innovation means pedagogical transformation, not tool adoption. The question is not what a tool can do, but how it serves learning."],
    ["R","Responsibility","Institutions, educators, and developers share responsibility for the consequences of AI use. Responsibility cannot be outsourced to vendors or delegated to a policy document."],
    ["E","Equity","AI adoption must actively address rather than reinforce existing inequalities. This includes equity of access, equity of representation in training data, and equity of outcome."],
  ];
  const conditions=[
    ["Vision","Confusion. People do not understand where they are going."],
    ["Strategy","Anxiety. People do not know how to get there."],
    ["Climate","Resistance. People do not feel safe to try."],
    ["Ability","Frustration. People want to change but cannot."],
    ["Purpose","False starts. Activity without direction."],
    ["Time","Overwhelm. Good intentions collapse under workload."],
    ["Voice","Resentment. People feel done to rather than done with."],
    ["Relationship","Isolation. Change becomes a solo effort rather than collective."],
  ];
  const guardrails=[
    ["Trust","AI adoption must not undermine the trust relationships between teachers, students, and communities that make learning possible."],
    ["Voice","All stakeholders, including students, must have meaningful voice in decisions about AI use that affects them."],
    ["Equity","No AI adoption is acceptable if it widens existing gaps in educational opportunity or outcome."],
  ];
  const mapping=[
    ["Awareness","Innovation","Vision"],
    ["Policy & Compliance","Responsibility","Strategy"],
    ["Practice","Agency and Creativity","Ability and Time"],
    ["Culture","Equity","Climate, Voice, and Relationship"],
  ];
  return (
    <PageShell eyebrow="DMNU Framework" title="The CAIRE-Change Framework" subtitle="An Integrated Model for Ethical and Effective AI Adoption in Education" onBack={onBack}>
      <AttribBox>
        Daire Maria Ní Uanacháin, DMNU Learning Design. February 2026. This framework is Daire's synthesis. It integrates the CAIRE values model with an EdTech change model. The change conditions draw on Knoster's change management research (1991), as adapted for EdTech contexts by Amelia King (2025). Daire integrated that adaptation with the CAIRE values to create CAIRE-Change.
      </AttribBox>

      <FwH>What it is</FwH>
      <FwP>CAIRE-Change guides school leaders, educators, and policymakers in fostering AI adoption that is effective, equitable, and responsible. It brings together a values model, a change model, and a human rights based approach into one framework.</FwP>
      <FwP>Most AI adoption frameworks answer one of two questions. CAIRE-Change answers both at once. The normative question: what kind of change should we pursue, and what values should define success? The procedural question: what conditions must be in place for that change to succeed?</FwP>

      <FwH>The CAIRE values</FwH>
      <FwP>The normative layer. Five values that define what good AI adoption looks like.</FwP>
      {values.map(([k,name,desc])=>(
        <div key={k} style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:12}}>
          <div style={{minWidth:34,height:34,borderRadius:8,background:TEAL,color:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16}}>{k}</div>
          <div><strong style={{color:NAVY,fontSize:15}}>{name}.</strong> <span style={{color:"#374151",fontSize:15,lineHeight:1.6}}>{desc}</span></div>
        </div>
      ))}

      <FwH>The EdTech change conditions</FwH>
      <FwP>The procedural layer, adapted from Knoster by Amelia King (2025). For change to succeed, all of these must be present. When one is absent, a predictable failure mode follows.</FwP>
      <div style={{border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
        {conditions.map(([c,fail],i)=>(
          <div key={c} style={{display:"grid",gridTemplateColumns:"140px 1fr",borderTop:i?"1px solid #E2E8F0":"none"}}>
            <div style={{padding:"10px 14px",fontWeight:700,color:NAVY,fontSize:14,background:"#F8FAFC"}}>{c}</div>
            <div style={{padding:"10px 14px",color:"#374151",fontSize:14,lineHeight:1.5}}>{fail}</div>
          </div>
        ))}
      </div>

      <FwH>Human rights guardrails</FwH>
      <FwP>The framework is grounded in a human rights based approach. Three non-negotiables.</FwP>
      {guardrails.map(([name,desc])=>(
        <FwP key={name}><strong style={{color:NAVY}}>{name}.</strong> {desc}</FwP>
      ))}

      <FwH>How it connects to the diagnostic</FwH>
      <FwP>Each diagnostic dimension maps to a CAIRE value and a change condition. A low score signals not just a skills gap but a missing condition for change.</FwP>
      <div style={{border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.4fr",background:NAVY}}>
          {["Dimension","CAIRE value","Change condition"].map(h=><div key={h} style={{padding:"10px 12px",color:"#fff",fontWeight:700,fontSize:13}}>{h}</div>)}
        </div>
        {mapping.map(([d,v,c],i)=>(
          <div key={d} style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.4fr",borderTop:"1px solid #E2E8F0"}}>
            <div style={{padding:"10px 12px",fontWeight:600,color:NAVY,fontSize:14}}>{d}</div>
            <div style={{padding:"10px 12px",color:"#374151",fontSize:14}}>{v}</div>
            <div style={{padding:"10px 12px",color:"#374151",fontSize:14}}>{c}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function ProofPage({ onBack }) {
  const steps=[
    ["P","Profile Your AI Use","Identify all AI systems, tools, and vendors in your ecosystem.","Conduct an AI audit. Include grading tools, learning platforms, surveillance, chatbots, and admin tools."],
    ["R","Risk-Classify the Tools","Apply the EU AI Act risk tiers: Unacceptable, High, Limited, Minimal.","Focus especially on profiling, biometric systems, automated decision-making, and student-facing tools."],
    ["O","Obligations and Oversight","Understand what rules apply to your role as user, deployer, or developer.","Add human oversight, clear documentation, and transparency mechanisms. Know what you are responsible for."],
    ["O","Operational Alignment","Align internal policies with AI and data protection requirements.","Update privacy policies, teacher training protocols, procurement processes, and parental consent procedures."],
    ["F","Future-Proof","Stay ahead of legal and ethical developments.","Follow AI governance trends, build digital trust, and invest in ongoing staff capacity."],
  ];
  const highRisk=[
    "Emotion recognition in the classroom",
    "Biometric surveillance or facial recognition",
    "Predictive analytics for student success or risk",
    "AI-generated admissions or grading decisions",
    "Automated behavioural monitoring systems",
  ];
  return (
    <PageShell eyebrow="DMNU Framework" title="PROOF" subtitle="AI Act-PROOF Your Learning Institution" onBack={onBack}>
      <AttribBox>Daire Maria Ní Uanacháin, DMNU Learning Design. Licence: CC BY-SA 4.0.</AttribBox>

      <FwH>The five steps</FwH>
      <FwP>PROOF is a regulatory compliance architecture. Each step names what to understand and what to do about it.</FwP>
      {steps.map(([k,name,means,action],i)=>(
        <div key={i} style={{border:"1px solid #E2E8F0",borderRadius:10,padding:"16px 18px",marginBottom:12}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:8}}>
            <div style={{minWidth:34,height:34,borderRadius:8,background:PURPLE,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16}}>{k}</div>
            <div style={{fontWeight:700,color:NAVY,fontSize:16}}>{name}</div>
          </div>
          <p style={{color:"#374151",fontSize:14,lineHeight:1.6,marginBottom:6}}>{means}</p>
          <p style={{color:"#0F5257",fontSize:14,lineHeight:1.6}}><strong>Action.</strong> {action}</p>
        </div>
      ))}

      <FwH>High-risk AI in education</FwH>
      <FwP>Uses that typically fall into the high-risk tier and demand the closest attention.</FwP>
      <ul style={{margin:"0 0 12px 0",padding:0,listStyle:"none"}}>
        {highRisk.map(h=>(
          <li key={h} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
            <span style={{color:PURPLE,fontWeight:800}}>•</span>
            <span style={{color:"#374151",fontSize:15,lineHeight:1.5}}>{h}</span>
          </li>
        ))}
      </ul>

      <FwH>How PROOF works with the 4Ps</FwH>
      <FwP>PROOF is the regulatory compliance architecture. The 4Ps Practice Audit, drawn from the Irish DES Guidance, is the pedagogical implementation architecture. Together they give a school both the governance foundation and the practice development pathway. Every simulation debrief names the PROOF step most relevant to the scenario, so you learn which part of your own framework to act on first.</FwP>
    </PageShell>
  );
}

function CommitmentSection() {
  const free=[
    "The AI Readiness Diagnostic, all 14 questions across four dimensions",
    "Your personalised readiness report and governance checklist",
    "One live simulation, matched to your lowest dimension",
    "The Flag equity scenario, available to everyone",
    "The Article 50 transparency scenario, available to everyone",
    "The 4Ps Active Audit, with a downloadable CPD document",
    "The SAV detection resource page",
    "The CAIRE-Change and PROOF framework pages",
  ];
  const paid=[
    "The full simulation library, every dimension and future scenarios",
    "Beyond Compliance workshops, facilitated or run in-house with the CPD facilitation guides",
    "Tailored institutional programmes across AI strategy and AI and pedagogy",
    "The SAV and SAL assessment tools and training",
  ];
  return (
    <div style={{padding:"22px 24px",background:NAVY,borderRadius:14,marginTop:24}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:TEAL,textTransform:"uppercase",marginBottom:10}}>Our commitment to access</div>
      <p style={{color:"#CBD5E1",fontSize:14,lineHeight:1.7,marginBottom:12}}>The diagnostic is free, and it stays free. This tool will never ask for your email address. Your results will never be used to trigger a sales call.</p>
      <p style={{color:"#94A3B8",fontSize:13,lineHeight:1.7,marginBottom:18}}>Beyond Compliance has been delivered to educators across many countries, and free webinars will continue to be offered. Access to the core diagnostic and the free scenarios does not depend on payment, registration, or an email address.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:"rgba(42,191,191,0.1)",border:`1px solid ${TEAL}55`,borderRadius:10,padding:"14px 16px"}}>
          <div style={{color:TEAL,fontWeight:700,fontSize:13,marginBottom:10}}>Always free</div>
          {free.map(f=><div key={f} style={{display:"flex",gap:8,marginBottom:7}}><span style={{color:TEAL}}>✓</span><span style={{color:"#CBD5E1",fontSize:12.5,lineHeight:1.5}}>{f}</span></div>)}
        </div>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid #334155",borderRadius:10,padding:"14px 16px"}}>
          <div style={{color:"#94A3B8",fontWeight:700,fontSize:13,marginBottom:10}}>Paid or institutional</div>
          {paid.map(f=><div key={f} style={{display:"flex",gap:8,marginBottom:7}}><span style={{color:"#64748B"}}>•</span><span style={{color:"#94A3B8",fontSize:12.5,lineHeight:1.5}}>{f}</span></div>)}
        </div>
      </div>
    </div>
  );
}

// ── DETECTION INFOGRAPHIC (integrated) ───────────────────────────────
const DI_GREEN="#27AE60", DI_AMBER="#F59E0B", DI_RED="#E74C3C";
const DI_LGREEN="#F0FDF4", DI_LAMBER="#FFFBEB", DI_LRED="#FEF2F2";
const DI_PIECES=[
  { id:"A", label:"Piece A", sublabel:"Published book chapter", year:"2012", note:"Formally peer-reviewed prior to publication. Verifiable ISBN. Produced 10 years before generative AI existed.", aiAssisted:false },
  { id:"B", label:"Piece B", sublabel:"PGCE final assignment", year:"2016", note:"Formally submitted and assessed qualification document. Passed by human examiners. Conferred professional teaching status.", aiAssisted:false },
  { id:"C", label:"Piece C", sublabel:"Professional article", year:"2020", note:"Professionally produced and published on a professional networking platform.", aiAssisted:false },
  { id:"D", label:"Piece D", sublabel:"Blog post", year:"2026", note:"Produced through collaborative authorship: AI brainstorming and drafting, significant human editing, original ideas and personal experience throughout.", aiAssisted:true },
];
const DI_TOOLS=[
  { name:"Sentinel", desc:"One of the most widely deployed tools in Irish and UK education. Integrated into institutional learning management systems.", results:[0,0,0,0], highlight:true },
  { name:"Compass", desc:"Free-tier tool widely used by teachers and students as an accessible first check. Not the same as Pathfinder despite a similar name.", results:[5.5,2.6,30.4,5.7], highlight:false },
  { name:"Pathfinder", desc:"Developed by a student at a world-renowned university. Widely cited in academic integrity research. Attempts to look beyond surface-level pattern matching.", results:[0,0,0,80], highlight:false },
  { name:"Veritas", desc:"Claims to cross-reference results against other named tools. Results varied 4 to 14 points between identical submissions. Cross-referenced results differed from independent tests by up to 68 points.", results:[76,88,79,84], highlight:false, note:"Second run figures. First run: 82%, 92%, 79%, 98%." },
];
function diColor(pct){ if(pct===null) return {bg:"#F1F5F9",text:"#64748B"}; if(pct<=15) return {bg:DI_LGREEN,text:DI_GREEN}; if(pct<=50) return {bg:DI_LAMBER,text:DI_AMBER}; return {bg:DI_LRED,text:DI_RED}; }
function DetectionInfographic(){
  const [activePiece,setActivePiece]=useState(null);
  return (
    <div style={{fontFamily:"'Inter',sans-serif",maxWidth:820,margin:"0 auto"}}>
      <div style={{background:NAVY,borderRadius:"14px 14px 0 0",padding:"28px 28px 24px"}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:3,color:TEAL,marginBottom:10,textTransform:"uppercase"}}>DMNU Learning Design · SAV Resource</div>
        <h2 style={{color:"#fff",fontSize:"clamp(18px,3vw,26px)",fontWeight:800,lineHeight:1.3,marginBottom:10}}>13 AI Detection Tools.<br/>4 Pieces of Writing.<br/>One Finding.</h2>
        <p style={{color:"#94A3B8",fontSize:14,lineHeight:1.6,maxWidth:560}}>All four pieces were written by the same author. Three predate generative AI entirely. One involved AI-assisted drafting in 2026. Tool names are pseudonymised, and the finding holds regardless of which tools you recognise.</p>
      </div>
      <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderTop:"none",padding:"14px 28px",display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,fontWeight:600,color:"#64748B"}}>Score range:</span>
        {[["0",DI_GREEN,DI_LGREEN,"Cleared"],["16",DI_AMBER,DI_LAMBER,"Uncertain"],["51",DI_RED,DI_LRED,"Flagged"]].map(([n,text,bg,label])=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:32,height:20,borderRadius:4,background:bg,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,fontWeight:800,color:text}}>{n}</span></div>
            <span style={{fontSize:12,color:"#374151"}}>{label}</span>
          </div>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:12,borderRadius:"50%",background:TEAL}}/><span style={{fontSize:12,color:"#374151"}}>AI-assisted piece</span></div>
      </div>
      <div style={{overflowX:"auto",border:"1px solid #E2E8F0",borderTop:"none"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
          <thead><tr style={{background:"#F1F5F9"}}>
            <th style={{padding:"14px 20px",textAlign:"left",fontWeight:700,color:NAVY,fontSize:13,borderBottom:"2px solid #E2E8F0",borderRight:"1px solid #E2E8F0",width:"30%"}}>Tool</th>
            {DI_PIECES.map(p=>(
              <th key={p.id} {...clickable(()=>setActivePiece(activePiece===p.id?null:p.id))} style={{padding:"10px 8px",textAlign:"center",fontWeight:700,color:p.aiAssisted?TEAL:NAVY,fontSize:12,borderBottom:"2px solid #E2E8F0",borderRight:"1px solid #E2E8F0",cursor:"pointer",background:activePiece===p.id?"#E0F2FE":"transparent"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  {p.aiAssisted&&<div style={{width:8,height:8,borderRadius:"50%",background:TEAL}}/>}
                  <span>{p.label}</span><span style={{fontWeight:400,color:"#64748B",fontSize:11}}>{p.sublabel}</span><span style={{fontWeight:600,color:p.aiAssisted?TEAL:"#94A3B8",fontSize:11}}>{p.year}</span>
                </div>
              </th>
            ))}
          </tr></thead>
          <tbody>
            {DI_TOOLS.map((tool,ti)=>(
              <tr key={tool.name} style={{background:tool.highlight?"#F0FAFA":"#fff"}}>
                <td style={{padding:"14px 20px",borderBottom:ti<DI_TOOLS.length-1?"1px solid #F1F5F9":"none",borderRight:"1px solid #E2E8F0",verticalAlign:"top"}}>
                  <div style={{fontWeight:700,color:tool.highlight?TEAL:NAVY,fontSize:14,marginBottom:3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{tool.name}{tool.highlight&&<span style={{background:TEAL+"22",color:TEAL_INK,fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:10}}>Widely deployed</span>}</div>
                  <div style={{color:"#64748B",fontSize:12,lineHeight:1.5}}>{tool.desc}</div>
                  {tool.note&&<div style={{color:"#94A3B8",fontSize:11,marginTop:4,fontStyle:"italic"}}>{tool.note}</div>}
                </td>
                {tool.results.map((pct,pi)=>{const c=diColor(pct);return (
                  <td key={pi} style={{padding:"14px 10px",textAlign:"center",background:c.bg,borderBottom:ti<DI_TOOLS.length-1?"1px solid #F1F5F9":"none",borderRight:"1px solid #E2E8F0"}}><span style={{fontWeight:800,fontSize:18,color:c.text}}>{pct}%</span></td>
                );})}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {activePiece&&(
        <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderTop:"none",padding:"16px 20px"}}>
          {DI_PIECES.filter(p=>p.id===activePiece).map(p=>(
            <div key={p.id}><div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:6}}>{p.label}: {p.sublabel} ({p.year})</div><p style={{color:"#374151",fontSize:13,lineHeight:1.6}}>{p.note}</p></div>
          ))}
        </div>
      )}
      <div style={{background:NAVY,padding:"24px 28px",border:"1px solid #E2E8F0",borderTop:"none"}}>
        <div style={{fontWeight:700,color:TEAL,fontSize:13,marginBottom:10,letterSpacing:1}}>THE QUESTION</div>
        <p style={{color:"#fff",fontSize:15,lineHeight:1.7,marginBottom:12}}>Sentinel, one of the most widely deployed tools in Irish and UK higher education, returned <strong style={{color:TEAL}}>0%</strong> on all four pieces above, including the 2026 AI-assisted piece.</p>
        <p style={{color:"#94A3B8",fontSize:14,lineHeight:1.7}}>Using only the tools most widely deployed in Irish and UK education, can you identify which piece involved AI assistance? The table gives you the answer. So does the question.</p>
      </div>
      <div style={{border:"1px solid #E2E8F0",borderTop:"none",padding:"20px 24px",background:"#fff"}}>
        <div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:16}}>What the full dataset shows</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
          {[
            {color:DI_GREEN,bg:DI_LGREEN,title:"Consistent clearers",tools:"Sentinel, Clarity, Pathfinder*, Mirror, Echo, Phantom",note:"*Pathfinder clears pre-AI writing but flags the 2026 piece at 80%"},
            {color:DI_AMBER,bg:DI_LAMBER,title:"Middle ground",tools:"Compass, Scribe, Arbiter",note:"Variable results. Compass spikes on 2020 professional writing (30.4%) but misses the 2026 AI-assisted piece (5.7%)"},
            {color:DI_RED,bg:DI_LRED,title:"Consistent flaggers",tools:"Veritas, Oracle, Spectre",note:"Flag all pieces at 76 to 95% regardless of origin or date"},
          ].map(c=>(
            <div key={c.title} style={{background:c.bg,border:`1px solid ${c.color}44`,borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontWeight:700,color:c.color,fontSize:13,marginBottom:6}}>{c.title}</div>
              <div style={{color:"#374151",fontSize:12,marginBottom:8,fontWeight:600}}>{c.tools}</div>
              <div style={{color:"#64748B",fontSize:12,lineHeight:1.5}}>{c.note}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{border:"1px solid #E2E8F0",borderTop:"none",padding:"20px 24px",background:"#FAFAFA"}}>
        <div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:16}}>Four findings</div>
        {[
          ["The tools do not agree with each other","On a published book chapter from 2012, scores range from 0% to 95%. There is no score that means the same thing across all tools."],
          ["Formally verified pre-AI writing is flagged as AI-generated","A peer-reviewed published chapter and a formally assessed qualification document, both produced before generative AI existed, are flagged at 76 to 95% AI by multiple tools."],
          ["The most widely deployed tools cannot detect AI assistance","The tools on which most Irish and UK institutional decisions rest return 0% on all four pieces, including the AI-assisted 2026 piece."],
          ["Claimed verification systems do not withstand scrutiny","One tool displays third-party results that differ from those tools' independent outputs by up to 68 percentage points. Its own results varied by up to 14 points between identical submissions."],
        ].map(([title,body],i)=>(
          <div key={i} style={{display:"flex",gap:14,marginBottom:i<3?16:0,paddingBottom:i<3?16:0,borderBottom:i<3?"1px solid #E2E8F0":"none"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:NAVY,color:TEAL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{i+1}</div>
            <div><div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:4}}>{title}</div><div style={{color:"#374151",fontSize:13,lineHeight:1.6}}>{body}</div></div>
          </div>
        ))}
      </div>
      <div style={{background:TEAL,borderRadius:"0 0 14px 14px",padding:"24px 28px",border:"1px solid #E2E8F0",borderTop:"none"}}>
        <p style={{color:NAVY,fontSize:15,fontWeight:700,lineHeight:1.6}}>The question worth asking is not "did AI write this?" but "can this student demonstrate that they thought?"</p>
      </div>
    </div>
  );
}

// ── SAV RESOURCE PAGE ────────────────────────────────────────────────
const SAV_LEVELS=["Emerging","Developing","Proficient","Exemplary"];
const SAV_LEVEL_COLORS=[{h:"#E74C3C",b:"#FEF2F2"},{h:"#F59E0B",b:"#FFFBEB"},{h:TEAL,b:"#F0FAFA"},{h:"#27AE60",b:"#F0FDF4"}];
const SAV_RUBRIC=[
  { skill:"Balance of AI Assistance and Author Voice", cells:[
    "Response is generic and lacks a discernible authorial perspective. The tone is flat and could be entirely AI-generated.",
    "Author's voice is visible but inconsistent. The balance with AI output is skewed, resulting in some awkward transitions or lack of flow.",
    "Author's voice is generally consistent and clear. The integration of AI is seamless, enhancing the text without dominating the tone.",
    "The author's voice is distinct, engaging, and confident. The writing skilfully integrates AI as a tool without sacrificing authenticity.",
  ]},
  { skill:"Domain Knowledge Integration", cells:[
    "Includes minimal or inaccurate subject-specific information. Relies on generic, surface-level content.",
    "Shows a basic understanding of the domain. Information is mostly accurate but lacks depth or original insight.",
    "Demonstrates a solid grasp of domain-specific concepts. Synthesises information from multiple sources effectively.",
    "Shows an expert-level grasp of the domain, synthesising multiple sources and adding original insights.",
  ]},
  { skill:"Critical Thinking and Editing", cells:[
    "AI-generated content is used with little to no modification. No evidence of editing or critical evaluation.",
    "Some evidence of editing and critical thinking. The student makes basic changes but may overlook significant issues.",
    "The student actively evaluates and edits AI outputs for accuracy, bias, and relevance. Substantial critical thinking is evident.",
    "The student demonstrates deep metacognitive engagement, questioning the AI and using it as a true collaborative partner.",
  ]},
  { skill:"Bias Awareness", cells:[
    "Accepts sources and AI outputs at face value. Does not recognise bias.",
    "Shows some awareness of bias in sources and AI but may not always identify it or address it effectively.",
    "Recognises and addresses potential biases in both sources and AI outputs. Attempts to present a balanced perspective.",
    "Critically evaluates bias in sources and AI outputs. Anticipates blindspots and actively seeks missing perspectives.",
  ]},
  { skill:"Student Identity and Perspective", cells:[
    "Work is generic. No evidence of personal perspective or cultural context.",
    "Some attempts to integrate personal perspective or context, but it feels forced or lacks depth.",
    "The work reflects the student's perspective and context in a relevant and integrated manner.",
    "Work powerfully reflects the student's unique perspective and cultural or geographic identity. The student explicitly acknowledges how their identity shapes their perspective.",
  ]},
];
const SAV_CASES=[
  { tag:"The roadmap", profile:"A dyslexic student who avoided writing and shut down whenever approached.", body:"The rubric gave her a roadmap. It made better grades seem achievable rather than arbitrary, because she could see exactly what quality looked like and how to reach it." },
  { tag:"The fluency paradox", profile:"A student with advanced proficiency and a formal academic register, terrified that her own writing sounded like AI.", body:"Neurodivergent students often develop highly structured, precise language. To a neurotypical reader that can seem formal or robotic, but it is their authentic voice, not mimicry. SAV protected her by assessing domain knowledge and critical thinking, not whether the writing sounded human. Her fluency was an asset, not a liability." },
  { tag:"The pragmatist", profile:"A student who would not work unless he saw the value, and used AI to write a reflection he found performative.", body:"Even so, he engaged with the rubric to improve the output rather than reach for a humanising tool. In his words: \"I liked having the SAV rubric to help me improve the AI output instead of just using a humanizer bot.\" The problem was never AI use. It was a task that felt meaningless." },
];
function SavPage({ onBack }){
  return (
    <PageShell eyebrow="DMNU Resource" title="Student-Author Voice" subtitle="From detecting AI to assessing authorship" onBack={onBack}>
      <FwP>Every week, teachers and school leaders make decisions about students based on AI detection results. Work is flagged, conversations are had, and in some cases formal misconduct processes begin. All of it rests on one assumption: that the tool producing the result is measuring something real. It is not.</FwP>

      <div style={{margin:"24px 0"}}><DetectionInfographic /></div>

      <AttribBox>Tool names are pseudonymised throughout. This is a deliberate methodological choice, not an evasion. The purpose is not to review individual products but to document a property of the category: no combination of currently available tools produces consistent, reliable results on the same text. The pattern holds whether or not you recognise a tool from its description.</AttribBox>

      <FwP>There is an equity dimension the data makes plain. Detectors are more suspicious of writing that is formally precise, structurally consistent, and rhetorically careful, which are the marks of developed academic writing. A student whose writing has improved over a term, or whose first language produces a particular formal register, or who has been taught to write with unusual clarity, is more likely to be flagged. The tool penalises development. It penalises difference. It penalises care. Irish bodies have already said so: the National Academic Integrity Network does not recommend detectors and warns of false positives, and the AI Advisory Council has confirmed the methods do not work.</FwP>

      <FwH>Building trust, not policing</FwH>
      <FwP>Detection asks whether writing sounds human. That is the wrong question, and it is the same question the tools ask. The better one is not whether AI was used, but whether the student remained the author of their own thinking. That reframes assessment from suspicion to a shared standard, the way an established writing rubric is a standard a student works toward, not a hidden instrument used on them.</FwP>

      <FwH>Where SAV came from</FwH>
      <FwP>The Student-Author Voice rubric began as three dimensions across five levels: Balance of AI Assistance and Author Voice, Domain Knowledge Integration, and Critical Thinking and Editing. That version was peer-reviewed, receiving Best Poster at the Université Côte d'Azur Research Day in 2024 and publication in Thresholds in Education following full peer review, with Lila Aouad.</FwP>
      <FwP>It was not only published. It was used, in a bilingual secondary classroom across the 2024 to 2025 school year, inside an early version of the project-based diagnostic. Students were told the work would be graded assuming AI use, and that SAV would be the standard. They asked for the rubric, the way they would expect a copy of a Cambridge writing rubric to work against in a lesson. They worked with it as a guide, then graded themselves against it in their project reflection. Their use of the tool, and their feedback, became the material taken to TESOL France.</FwP>

      <FwH>How it evolved</FwH>
      <div style={{border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden",marginBottom:16}}>
        {[
          ["TESOL France, November 2025","Presented and workshopped against the Cambridge assessment approach, the six-step rubric pedagogy of analysing the rubric together, grading examples, comparing with real feedback, and peer assessment. SAV was positioned as an extension of that proven practice into the AI age."],
          ["International School Monaco, January 2026","At Innovate-Share-Empower, the work reframed the central question from how human the writing sounds to who made the decisions in the work. That shift from output to agency, the seed of a developing instrument called the Student Agency Lens, is what surfaced two further dimensions."],
          ["SAV v2","Five dimensions across four levels: the original three plus Bias Awareness and Student Identity and Perspective, both agency questions in spirit. Used across the 2025 to 2026 school year, and presented at AIducation and the National Education Show in Ireland in 2026."],
        ].map(([t,b],i)=>(
          <div key={i} style={{padding:"14px 16px",borderTop:i?"1px solid #E2E8F0":"none"}}>
            <div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:4}}>{t}</div>
            <div style={{color:"#374151",fontSize:14,lineHeight:1.6}}>{b}</div>
          </div>
        ))}
      </div>
      <FwP>The Student Agency Lens is still in development. It is named here because the thinking behind it shaped SAV, not because it is finished. Where SAV asks whether the student is the author of the writing, the agency work asks whether the student remained the agent of the learning.</FwP>

      <FwH>The SAV v2 rubric</FwH>
      <FwP>Five skills, four levels. This is the version used with students and presented publicly.</FwP>
      <div style={{overflowX:"auto",border:"1px solid #E2E8F0",borderRadius:10,marginBottom:16}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
          <thead><tr>
            <th style={{padding:"10px 12px",textAlign:"left",background:NAVY,color:"#fff",fontSize:12,fontWeight:700,width:150}}>Skill</th>
            {SAV_LEVELS.map((l,i)=>(<th key={l} style={{padding:"10px 12px",textAlign:"left",background:SAV_LEVEL_COLORS[i].h,color:"#fff",fontSize:12,fontWeight:700}}>{i+1} {l}</th>))}
          </tr></thead>
          <tbody>
            {SAV_RUBRIC.map((row,ri)=>(
              <tr key={ri}>
                <td style={{padding:"10px 12px",fontWeight:700,color:NAVY,fontSize:12,background:"#F8FAFC",borderTop:"1px solid #E2E8F0",verticalAlign:"top"}}>{row.skill}</td>
                {row.cells.map((c,ci)=>(<td key={ci} style={{padding:"10px 12px",color:"#374151",fontSize:12,lineHeight:1.5,background:SAV_LEVEL_COLORS[ci].b,borderTop:"1px solid #E2E8F0",borderLeft:"1px solid #E2E8F0",verticalAlign:"top"}}>{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FwH>In real classroom use</FwH>
      <FwP>SAV is not a theoretical rubric. It is embedded in graded, project-based units in a bilingual secondary school, and it is sequenced across year groups so that students take on more responsibility for their own authorship as they mature. The same rubric appears at two levels of autonomy, by design.</FwP>
      <div style={{border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"14px 16px"}}>
          <div style={{fontWeight:700,color:TEAL_INK,fontSize:13,marginBottom:4}}>Grade 7, supported: SAV embedded</div>
          <div style={{fontWeight:600,color:NAVY,fontSize:13,marginBottom:6}}>A Geography and Civic Education inquiry-based learning project</div>
          <div style={{color:"#374151",fontSize:14,lineHeight:1.6}}>The rubric lives inside the dossier. Three of the five dimensions run as required Pause and Check moments in the flow of the work: Bias Awareness before sources are finalised, Domain Knowledge Integration before the analysis, and Balance of AI Assistance and Author Voice before the final rationale. At each, the student stops, answers honestly, and makes one concrete change before moving on. The checks are done for them, at the right moment. The Pause and Check is the classroom equivalent of this tool's own KAPOW card: an unexpected stop that forces a conscious decision rather than passive acceptance.</div>
        </div>
        <div style={{padding:"14px 16px",borderTop:"1px solid #E2E8F0",background:"#F8FAFC"}}>
          <div style={{fontWeight:700,color:TEAL_INK,fontSize:13,marginBottom:4}}>Grade 8, independent: SAV externalised</div>
          <div style={{fontWeight:600,color:NAVY,fontSize:13,marginBottom:6}}>A Geography and Civic Education inquiry-based learning project</div>
          <div style={{color:"#374151",fontSize:14,lineHeight:1.6}}>The scaffolding is removed. The dossier no longer contains the checks. It directs the student, at five named checkpoints, to open the SAV Diagnostic Tool as a separate document, apply the right dimension to their own research, and bring the result back. All five dimensions are in play now, not three, and the unit closes with a full authorship reflection and a self-rating against the SAV Rubric V2 (2026). The student is no longer prompted in place. They are the one who decides when and how to check their own authorship.</div>
        </div>
      </div>
      <FwP>That progression, from embedded to externalised, from three dimensions to five, from prompts done for the student to a diagnostic the student runs alone, is the classroom form of the same shift that produced SAV v2: from assessing the writing to handing the student agency over the work. AI Disclosure and Digital Responsibility is assessed as a formal, graded criterion in both units, bilingually, alongside Geography and Civic Education. A student who uses AI without disclosing it, or without demonstrating authorship, loses marks not for cheating but for failing to show the civic and digital literacy the curriculum requires. Self and peer assessment are built in, and every rating must carry a specific example, not just a level.</FwP>

      <FwH>What happened</FwH>
      <div style={{display:"grid",gap:12,marginBottom:8}}>
        {SAV_CASES.map((c,i)=>(
          <div key={i} style={{border:"1px solid #E2E8F0",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontWeight:700,color:TEAL_INK,fontSize:13,marginBottom:4}}>{c.tag}</div>
            <div style={{color:NAVY,fontSize:13,fontWeight:600,marginBottom:6}}>{c.profile}</div>
            <div style={{color:"#374151",fontSize:14,lineHeight:1.6}}>{c.body}</div>
          </div>
        ))}
      </div>
      <FwP>Across the group, students who used AI and then applied the SAV criteria to improve their work saw grades rise, anecdotally by two or more levels. More telling than any grade, a reputation for being too strict shifted to strict but fair, because the rubric became a shared language for talking about learning rather than an instrument of judgement. That is the whole argument: not did you cheat, but what did you learn, and where is your voice.</FwP>

      <FwH>Recognition</FwH>
      <div style={{border:"2px solid #27AE60",borderRadius:12,padding:"16px 18px",marginBottom:8,background:"#F0FDF4",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <img src="/badge-teacher-innovation.png" alt="AI for Education Awards 2026, Teacher Innovation Award, Official Participant, European Edition" style={{width:110,height:110,flexShrink:0}}/>
        <div style={{flex:1,minWidth:200}}>
        <div style={{fontWeight:800,color:NAVY,fontSize:15,marginBottom:4}}>Official Participant, Teacher Innovation Award, European Edition</div>
        <div style={{color:"#374151",fontSize:13,lineHeight:1.6}}>AI for Education Awards 2026. SAV was also awarded Best Poster at the Université Côte d'Azur Research Day 2024 and published in Thresholds in Education following full peer review.</div>
        </div>
      </div>

      <FwH>Verification and replication</FwH>
      <FwP>Educators or researchers who wish to attempt replication can contact DMNU Learning Design, and excerpts can be shared on request. Results will not necessarily reproduce. Several tools returned different scores on identical text between submissions, in one case by up to 14 percentage points, with no change to the text. That is not a weakness in the method. It is the finding. A tool whose result changes on identical input is not producing a stable measurement, and a judgement made about a student on a Tuesday may differ from the one made on a Wednesday.</FwP>
    </PageShell>
  );
}


// ── 4Ps ACTIVE AUDIT ─────────────────────────────────────────────────
const AUDIT_CHALLENGERS = {
  colleague: {
    name:"A trusted colleague", emoji:"👤", versions:["classroom","systems"], focusP:"Purpose and Practice",
    blurb:"A peer who shares your context and will not accept hand-waving. Presses on why you use AI and whether it truly serves learning.",
    persona:"You are a fellow educator and trusted colleague of the person, at the same level as them. You are collegial and informal, but intellectually sharp and hard to fob off because you share their context. You are not hostile. You challenge them peer to peer about how they use AI, pressing especially on PURPOSE (why use AI here at all, does it serve learning or just save time) and PRACTICE (does meaningful human oversight remain, are learners still doing the thinking). Call out vague or defensive answers.",
  },
  parent: {
    name:"A concerned parent", emoji:"🧑‍🍼", versions:["classroom","systems"], focusP:"Purpose and transparency",
    blurb:"A parent of a student. Personal, direct, sometimes emotional. Turns the abstract into one child and asks whether it is fair.",
    persona:"You are the parent of a student, not a professional educator. You are personal, direct, and at times emotional, but reasonable and open to a good answer. You challenge the person about AI use that affects your child, pressing on PURPOSE (what exactly is being used on my child and why) and transparency (why was I not told, is this fair to my child, what happens to their data). Make the abstract personal and concrete. Do not use jargon.",
  },
  principal: {
    name:"Your principal, mid-audit", emoji:"🏫", versions:["classroom"], focusP:"Policies and Practice",
    blurb:"Your own school leader, under pressure after a parent complaint triggered an audit. Needs you to show your practice was defensible.",
    persona:"You are the person's own school principal. A parent has complained about AI use and the school is now being audited, so you are under pressure yourself. You are NOT attacking the teacher. You are a colleague who now has to hold them to account and needs them to show their practice was defensible. Press on POLICIES (did you follow our Acceptable Use Policy) and PRACTICE (can you show you disclosed AI use to students, kept human oversight, and can evidence it). You need specifics and evidence, not reassurance. Be warm but insistent: you are on their side, but the audit is real.",
  },
  inspector: {
    name:"An external inspector", emoji:"📋", versions:["systems"], focusP:"Policies and Planning",
    blurb:"A formal inspector assessing institutional AI governance, prompted by a parent complaint. Unmoved by feelings. Wants evidence.",
    persona:"You are a formal external inspector assessing the institution's AI governance, prompted in part by a parent complaint. You are professional, formal, and unmoved by feelings or good intentions. You press on POLICIES (show me the written policy, is it current) and PLANNING (show me it was followed, who is the named person accountable, where is the documentation and the impact assessment). You care only about what can be evidenced. Be correct and courteous, never cruel, but do not accept an answer that cannot be evidenced.",
  },
};
function auditVersion(role){ return (role==="school_leader"||role==="ld_manager") ? "systems" : "classroom"; }
function assignChallenger(lowest, version){
  if(lowest==="policy") return version==="systems" ? "inspector" : "principal";
  if(lowest==="culture") return "parent";
  return "colleague"; // practice + awareness
}
const DIM_LABEL_SHORT = { awareness:"Awareness", policy:"Policy & Compliance", practice:"Practice", culture:"Culture" };

function downloadDoc(sections, meta){
  const esc = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const body = sections.map(s=>`<h2 style="color:#1A2B4A;font-size:15pt;margin:16pt 0 6pt">${esc(s.h)}</h2><p style="font-size:11pt;line-height:1.5;color:#222">${esc(s.b).replace(/\n/g,"<br/>")}</p>`).join("");
  const cpd=`<h2 style="color:#1A2B4A;font-size:15pt;margin:20pt 0 6pt">Using this for CPD</h2><p style="font-size:11pt;line-height:1.5;color:#222">This reflection is a record you can keep as evidence of professional development and self-evaluation. To take it further, bring one point from it to a team conversation: share the challenge you found hardest to answer, and ask how colleagues would have responded. Normalising this kind of reflection is how a staff culture around AI shifts. For a facilitated version, DMNU Learning Design offers Beyond Compliance workshops and CPD facilitation guides.</p>`;
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>4Ps Audit Reflection</title></head><body style="font-family:Calibri,Arial,sans-serif">`+
    `<div style="border-bottom:2pt solid #2ABFBF;padding-bottom:8pt;margin-bottom:12pt"><div style="color:#2ABFBF;font-size:9pt;letter-spacing:2pt;font-weight:bold">DMNU LEARNING DESIGN</div><div style="color:#1A2B4A;font-size:20pt;font-weight:bold">4Ps Active Audit: CPD Reflection</div><div style="color:#555;font-size:10pt">${esc(meta)}</div></div>`+
    body+cpd+
    `<p style="margin-top:20pt;color:#888;font-size:8pt">Generated by the DMNU AI Readiness Ecosystem. A self-reflection record for CPD and self-evaluation. Grounded in the Irish DES 4Ps (Purpose, Planning, Policies, Practice) and designed to build practical understanding of EU AI Act obligations in educational contexts.</p>`+
    `</body></html>`;
  const blob = new Blob([html], {type:"application/msword"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="4Ps_Audit_CPD_Reflection.doc"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function FourPsAudit({ role, scores, onBack }){
  const [version,setVersion]=useState(auditVersion(role));
  const lowest = scores ? lowestDim(scores) : "awareness";
  const roleLabel = ROLE_LABELS[role] || "Educator";
  const available = Object.keys(AUDIT_CHALLENGERS).filter(k=>AUDIT_CHALLENGERS[k].versions.includes(version));
  const suggested = assignChallenger(lowest, version);

  const [step,setStep]=useState("intro"); // intro | roleplay | generating | document
  const [challenger,setChallenger]=useState(null);
  const [convo,setConvo]=useState([]); // includes hidden seed at [0]
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [doc,setDoc]=useState(null);

  const display = convo.slice(1); // hide seed
  const userTurns = display.filter(m=>m.role==="user").length;

  async function callClaude(system, messages, maxTokens){
    const res=await fetch("/api/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:maxTokens,system,messages})});
    const data=await res.json();
    return (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
  }
  function systemPrompt(c){
    return `${AUDIT_CHALLENGERS[c].persona}

CONTEXT: You are challenging a ${roleLabel} working in an Irish educational setting, in a ${version==="systems"?"whole-school or organisational":"classroom or practice"} context. This is the DMNU 4Ps Active Audit, a professional reflection exercise grounded in the Irish Department of Education 4Ps: Purpose (why we use AI), Planning (intentional, curriculum-aligned integration), Policies (clear boundaries and safety), and Practice (pedagogy and human oversight). Your focus lands hardest on ${AUDIT_CHALLENGERS[c].focusP}, but roam across the 4Ps as the conversation allows.

RULES: Stay fully in character. Give ONE focused challenge per message. Keep each message short, two to four sentences. End most messages with a single pointed question. Escalate gently. Never be a caricature or cruel; be constructive underneath. This is Irish education (DES Guidance on AI in Schools, Acceptable Use Policy, EU AI Act). Do not use markdown, asterisks, or headings. Do not use em dashes.`;
  }

  async function begin(c){
    setChallenger(c); setStep("roleplay"); setLoading(true);
    const seed={role:"user",content:"Begin the audit. Open with your first challenge, in character."};
    try{
      const opener=await callClaude(systemPrompt(c), [seed], 400);
      setConvo([seed, {role:"assistant",content:stripMarkdown(opener)}]);
    }catch(e){ setConvo([seed, {role:"assistant",content:"Right, let us get into it. Tell me plainly: where are you actually using AI in your work, and why?"}]); }
    setLoading(false);
  }
  async function send(){
    if(!input.trim()||loading) return;
    const next=[...convo,{role:"user",content:input.trim()}];
    setConvo(next); setInput(""); setLoading(true);
    const near = next.filter(m=>m.role==="user").length >= 5;
    const sys = systemPrompt(challenger) + (near?"\n\nThe conversation is near its end. Move toward a final summarising challenge, then acknowledge that they have reflected enough to record it.":"");
    try{
      const reply=await callClaude(sys, next, 400);
      setConvo([...next,{role:"assistant",content:stripMarkdown(reply)}]);
    }catch(e){ setConvo([...next,{role:"assistant",content:"Let me put it more simply. Can you point to the evidence for what you just told me?"}]); }
    setLoading(false);
  }
  async function finish(){
    setStep("generating");
    const transcript = display.map(m=>`${m.role==="user"?roleLabel:AUDIT_CHALLENGERS[challenger].name}: ${m.content}`).join("\n\n");
    const prompt=`The following is a 4Ps Active Audit roleplay between a ${roleLabel} and "${AUDIT_CHALLENGERS[challenger].name}" in an Irish educational context. Produce a professional CPD reflection record from it, grounded in the Irish DES 4Ps.

TRANSCRIPT:
${transcript}

Write clear, warm, professional prose. Use exactly these section headings on their own lines, each followed by 2 to 4 sentences: PURPOSE, PLANNING, POLICIES, PRACTICE, STRENGTHS, NEXT STEPS. For each of the four Ps, note what emerged in the conversation and one gap or question to carry forward. Under NEXT STEPS give three concrete, specific actions. Do not use markdown, asterisks, bullets, or em dashes. Do not invent facts not implied by the transcript.`;
    try{
      const out=await callClaude("You are an expert educational CPD facilitator.", [{role:"user",content:prompt}], 2500);
      const clean=stripMarkdown(out);
      const heads=["PURPOSE","PLANNING","POLICIES","PRACTICE","STRENGTHS","NEXT STEPS"];
      const by={}; let cur=null;
      clean.split("\n").forEach(line=>{
        const m=line.trim().match(/^(PURPOSE|PLANNING|POLICIES|PRACTICE|STRENGTHS|NEXT STEPS)\s*(?:[:\-]\s*(.*))?$/i);
        if(m){ cur=m[1].toUpperCase(); by[cur]=m[2]?[m[2]]:[]; }
        else if(cur){ by[cur].push(line); }
      });
      const secs=heads.map(h=>({h:h.charAt(0)+h.slice(1).toLowerCase(), b:(by[h]||[]).join("\n").trim()})).filter(x=>x.b);
      setDoc(secs.length>=3 ? secs : [{h:"Reflection", b:clean}]);
    }catch(e){ setDoc([{h:"Reflection",b:"Your audit conversation is complete. A written record could not be generated automatically this time. You can still use the conversation above as your reflection."}]); }
    setStep("document");
  }

  const C = challenger?AUDIT_CHALLENGERS[challenger]:null;

  if(step==="intro"){
    return (
      <PageShell eyebrow="DMNU · A thought-doer activity" title="The 4Ps Active Audit" subtitle="Face a challenger. Defend your AI decisions. Leave with a CPD record." onBack={onBack}>
        <FwP>This is not a quiz. It is a roleplay. An AI plays someone with a reason to question how you use AI, and presses you across the Irish Department of Education 4Ps: Purpose, Planning, Policies, and Practice. You answer in your own words. At the end you get a formatted reflection you can download for your CPD folder or self-evaluation.</FwP>
        <div style={{background:"#F0FAFA",border:`1px solid ${TEAL}44`,borderRadius:10,padding:"14px 16px",marginBottom:20}}>
          <div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:8}}>Choose your version</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            {[["classroom","Classroom","your own practice, as a practitioner"],["systems","Systems","whole-school or organisational governance, as a leader"]].map(([v,label])=>(
              <button key={v} onClick={()=>setVersion(v)} style={{flex:1,padding:"10px 12px",borderRadius:8,border:`2px solid ${version===v?TEAL:"#CBD5E1"}`,background:version===v?TEAL:"#fff",color:version===v?NAVY:"#64748B",fontWeight:700,fontSize:13,cursor:"pointer"}}>{label}</button>
            ))}
          </div>
          <div style={{color:"#374151",fontSize:13,lineHeight:1.5}}>{version==="systems"?"Pitched at whole-school or organisational governance, as a leader.":"Pitched at your own classroom or practice, as a practitioner."} We have defaulted to the fit for your role, but you can switch.</div>
        </div>
        <FwH>Choose your challenger</FwH>
        <FwP>Your results suggest starting with the one matched to your lowest dimension, {DIM_LABEL_SHORT[lowest]}. You can face any of them, and coming back to face another is a good way to use this more than once.</FwP>
        {available.map(k=>{
          const ch=AUDIT_CHALLENGERS[k]; const isSug=k===suggested;
          return (
            <div key={k} {...clickable(()=>begin(k))} style={{border:`2px solid ${isSug?TEAL:"#E2E8F0"}`,borderRadius:12,padding:"16px 18px",marginBottom:12,cursor:"pointer",background:isSug?"#F0FAFA":"#fff"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:22}}>{ch.emoji}</span>
                <div style={{fontWeight:700,color:NAVY,fontSize:15}}>{ch.name}</div>
                {isSug&&<span style={{background:TEAL,color:NAVY,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:10,letterSpacing:0.5}}>MATCHED TO YOU</span>}
              </div>
              <div style={{color:"#64748B",fontSize:13,lineHeight:1.5,marginBottom:6}}>{ch.blurb}</div>
              <div style={{color:TEAL_INK,fontSize:12,fontWeight:600}}>Presses hardest on: {ch.focusP}</div>
            </div>
          );
        })}
      </PageShell>
    );
  }

  if(step==="roleplay"){
    return (
      <PageShell eyebrow={`4Ps Audit · ${version==="systems"?"Systems":"Classroom"}`} title={C.name} subtitle={`Focus: ${C.focusP}`} onBack={onBack}>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          {display.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"85%",padding:"12px 16px",borderRadius:14,background:m.role==="user"?TEAL:"#fff",color:m.role==="user"?NAVY:"#1A2B4A",border:m.role==="user"?"none":"1px solid #E2E8F0",fontSize:14,lineHeight:1.6}}>
                {m.role==="assistant"&&<div style={{fontSize:11,fontWeight:700,color:TEAL_INK,marginBottom:4}}>{C.emoji} {C.name}</div>}
                {m.content}
              </div>
            </div>
          ))}
          {loading&&<div style={{color:"#94A3B8",fontSize:13,fontStyle:"italic"}}>{C.name} is thinking...</div>}
        </div>
        <div style={{position:"sticky",bottom:0,background:BG,paddingTop:8}}>
          <textarea value={input} aria-label="Your response to the challenger" onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Answer in your own words..." rows={2}
            style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"2px solid #E2E8F0",fontSize:14,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,marginBottom:8}}/>
          <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
            <button onClick={finish} disabled={userTurns<2} style={{padding:"11px 18px",borderRadius:8,border:`1px solid ${userTurns<2?"#E2E8F0":TEAL}`,background:"#fff",color:userTurns<2?"#94A3B8":NAVY,fontSize:13,fontWeight:700,cursor:userTurns<2?"default":"pointer"}}>Complete and generate my CPD record</button>
            <button onClick={send} disabled={!input.trim()||loading} style={{padding:"11px 24px",borderRadius:8,border:"none",background:(!input.trim()||loading)?"#E2E8F0":TEAL,color:(!input.trim()||loading)?"#94A3B8":NAVY,fontSize:14,fontWeight:700,cursor:(!input.trim()||loading)?"default":"pointer"}}>Respond →</button>
          </div>
          {userTurns<2&&<div style={{color:"#94A3B8",fontSize:12,marginTop:8}}>Answer a couple of challenges before generating your record.</div>}
        </div>
      </PageShell>
    );
  }

  if(step==="generating"){
    return (
      <PageShell eyebrow="4Ps Audit" title="Writing your reflection" onBack={onBack}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"20px 0"}}>
          <div style={{width:22,height:22,border:`3px solid ${TEAL}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <span style={{color:"#64748B",fontSize:14}}>Turning your conversation into a CPD record...</span>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
      </PageShell>
    );
  }

  // document
  return (
    <PageShell eyebrow="4Ps Audit · Complete" title="Your CPD reflection" subtitle={`From your audit with ${C.name}`} onBack={onBack}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <button onClick={()=>downloadDoc(doc, `${roleLabel} · ${version==="systems"?"Systems":"Classroom"} version · Challenger: ${C.name}`)} style={{padding:"12px 22px",borderRadius:8,border:"none",background:TEAL,color:NAVY,fontSize:14,fontWeight:700,cursor:"pointer"}}>⬇ Download as a document</button>
        <button onClick={()=>{setStep("intro");setConvo([]);setChallenger(null);setDoc(null);}} style={{padding:"12px 22px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",color:NAVY,fontSize:14,fontWeight:600,cursor:"pointer"}}>Face another challenger</button>
      </div>
      {doc.map((s,i)=>(
        <div key={i} style={{marginBottom:16}}>
          <div style={{fontWeight:700,color:NAVY,fontSize:15,marginBottom:6}}>{s.h}</div>
          <p style={{color:"#374151",fontSize:14,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{s.b}</p>
        </div>
      ))}
    </PageShell>
  );
}


// ── BEYOND COMPLIANCE PAGE ───────────────────────────────────────────
const BC_FORMATS=[
  ["Scenario cards","Fictional AI tools dropped into realistic educational situations, from AI grading to student-facing chatbots, so participants assess risk in context rather than in the abstract."],
  ["Top Trumps risk cards","Each tool is scored across risk dimensions on a Top Trumps-style card, turning risk assessment into a hands-on, comparative judgement."],
  ["KAPOW twist cards","Injected mid-simulation, a regulatory update, a media crisis, a Data Protection Commission contact, that changes the situation and forces a fresh decision. This tool's own KAPOW card comes straight from here."],
  ["News report cards","A branded data source for each tool, used as the information participants must weigh during the activity."],
  ["The post-workshop toolkit","Micro risk assessments and a Field Notes from the Front Lines dossier, so change can begin bottom-up even without formal governance in place."],
  ["The Brussels Effect masterclass","EU AI Act essentials and what the Brussels Effect means for non-EU schools and EdTech providers."],
];
const BC_QUOTES=[
  ["Identifying the risks with a template and rubric really helped hammer the concepts home.","ICT Teacher, Germany"],
  ["I like the PROOF step as I can use that for future purposes.","Student, Philippines"],
  ["They are incredibly valuable. Hands-on and relatable.","Head of Programme, Faculty of Law, South Africa"],
];
function BeyondCompliancePage({ onBack, goProof }){
  return (
    <PageShell eyebrow="DMNU · Professional Learning" title="Beyond Compliance" subtitle="AI risk, responsibility, and readiness in education" onBack={onBack}>
      <div style={{border:"2px solid #27AE60",borderRadius:12,padding:"14px 16px",marginBottom:20,background:"#F0FDF4"}}>
        <div style={{fontWeight:800,color:NAVY,fontSize:15,marginBottom:2}}>Official Participant, Teacher Training Award, Global Competition</div>
        <div style={{color:"#374151",fontSize:13}}>AI for Education Awards 2026.</div>
      </div>

      <FwP>Beyond Compliance is a simulation-based professional learning programme that moves educators from AI awareness to responsible implementation. It is not a one-off workshop. It is a behaviour-change pathway, from knowing the rules to making confident decisions in the classroom, built for the reality most educators actually face.</FwP>

      <FwH>How it works</FwH>
      <FwP>The programme builds in three moves. Knowledge, a grounded, plain-language understanding of the EU AI Act and what it asks of schools. Simulation, where participants work through realistic scenarios, score AI tools for risk, and meet unexpected twists that model how quickly the ground shifts. Transfer, a toolkit that turns the session into immediate action back in the institution. The simulations, scenario cards, and KAPOW twists in this very tool are drawn from that programme.</FwP>

      <FwH>Grounded in PROOF</FwH>
      <FwP>The backbone of Beyond Compliance is the PROOF framework: Profile, Risk-Classify, Obligations and Oversight, Operational Alignment, and Future-Proof. It is what participants take away and keep using, and it is the same framework that anchors this tool's simulation debriefs.</FwP>
      <button onClick={goProof} style={{background:"#fff",border:`2px solid ${PURPLE}`,color:NAVY,borderRadius:8,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:8}}>Open the PROOF Framework →</button>

      <FwH>The formats</FwH>
      <FwP>The programme runs on a set of purpose-built materials. If you have met any of them elsewhere in this tool, this is where they come from.</FwP>
      {BC_FORMATS.map(([t,b])=>(
        <div key={t} style={{borderLeft:`3px solid ${TEAL}`,paddingLeft:14,marginBottom:12}}>
          <div style={{fontWeight:700,color:NAVY,fontSize:14,marginBottom:2}}>{t}</div>
          <div style={{color:"#374151",fontSize:14,lineHeight:1.6}}>{b}</div>
        </div>
      ))}

      <FwH>Impact</FwH>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:12}}>
        {[["4.79 / 5","Overall satisfaction"],["15+","Countries, four continents"],["100+","Educators reached"],["75%","Requested more materials"]].map(([n,l])=>(
          <div key={l} style={{background:"#F0FAFA",border:`1px solid ${TEAL}44`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
            <div style={{color:TEAL_INK,fontWeight:800,fontSize:22}}>{n}</div>
            <div style={{color:"#374151",fontSize:12,lineHeight:1.4,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <AttribBox>Figures are DMNU impact data from Beyond Compliance and related initiatives, 2024 to 2025. Participant cohorts have spanned Europe, Africa, Asia, and the Americas. Engagement and relevance scored 4.89 out of 5, and confidence gained 4.5 out of 5.</AttribBox>

      <FwH>What participants said</FwH>
      {BC_QUOTES.map(([q,who],i)=>(
        <div key={i} style={{background:"#F8FAFC",borderRadius:10,padding:"14px 16px",marginBottom:10}}>
          <div style={{color:NAVY,fontSize:14,lineHeight:1.6,fontStyle:"italic"}}>"{q}"</div>
          <div style={{color:"#64748B",fontSize:12,marginTop:6}}>{who}</div>
        </div>
      ))}

      <FwH>Recognition</FwH>
      <div style={{border:"2px solid #27AE60",borderRadius:12,padding:"16px 18px",background:"#F0FDF4",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
        <img src="/badge-teacher-training.png" alt="AI for Education Awards 2026, Teacher Training Award, Official Participant, Global Competition" style={{width:110,height:110,flexShrink:0}}/>
        <div style={{flex:1,minWidth:200}}>
        <div style={{fontWeight:800,color:NAVY,fontSize:15,marginBottom:4}}>Official Participant, Teacher Training Award, Global Competition</div>
        <div style={{color:"#374151",fontSize:13,lineHeight:1.6}}>AI for Education Awards 2026. Beyond Compliance is a professional learning programme, not a compliance certification. It is designed to build practical understanding of EU AI Act obligations in educational contexts.</div>
        </div>
      </div>
    </PageShell>
  );
}


// ── SIMULATION COMPONENT ─────────────────────────────────────────────
function Simulation({ scenario, onDone }) {
  const [simStep, setSimStep] = useState(0); // 0=brief, 1-3=questions, 4=kapow, 5=debrief
  const [answers, setAnswers] = useState({});
  const [kapowShown, setKapowShown] = useState(false);
  const [kapowReflection, setKapowReflection] = useState({assessment:"", toolView:""});
  const [debrief, setDebrief] = useState(null);
  const [loading, setLoading] = useState(false);

  const sc = scenario;
  const correct = CORRECT_ANSWERS[sc.id];
  const totalQ = sc.questions.length;

  async function generateDebrief() {
    setLoading(true);
    const score = sc.questions.reduce((acc,q,i) => acc + (answers[i]===correct[i]?1:0), 0);
    const answerSummary = sc.questions.map((q,i)=>`Q${i+1}: "${q.options[answers[i]||0]}" (${answers[i]===correct[i]?"correct":"could be stronger"})`).join("\n");
    const prompt = `You are an expert facilitator for Beyond Compliance, a simulation-based AI ethics training programme for educators. A participant just completed a scenario simulation called "${sc.tool}: ${sc.subtitle}".

Their answers:
${answerSummary}

They also encountered a Kapow Card (an unexpected twist): "${sc.kapow.text}"
${sc.debriefFocus?`\nKey legal point to convey, in plain words, woven into WHERE TO THINK DEEPER: ${sc.debriefFocus}\n`:""}
${(kapowReflection.assessment||kapowReflection.toolView)?`\nAfter the twist, they reflected:\n- How it changed their assessment: "${kapowReflection.assessment||"(left blank)"}"\n- Whether it changed their view of the tool: "${kapowReflection.toolView||"(left blank)"}"\n`:""}
Write a short, warm, punchy debrief in 3 short sections:

WHAT YOU GOT RIGHT
1-2 sentences acknowledging their correct decisions and the reasoning behind them.${(kapowReflection.assessment||kapowReflection.toolView)?" Where they reflected after the twist, briefly affirm or gently extend their thinking.":""}

WHERE TO THINK DEEPER
1-2 sentences on the trickiest decision point and what the EU AI Act / GDPR actually requires.

YOUR PROOF STEP
1 sentence naming the PROOF framework step most relevant to this scenario (${sc.proofStep}: ${sc.proofDesc}) and one concrete action they can take this week.

Keep total to 120 words maximum. Warm but direct tone. No jargon without explanation.`;

    try {
      const res = await fetch("/api/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:CLAUDE_MODEL, max_tokens:800, messages:[{role:"user",content:prompt}] })
      });
      const data = await res.json();
      setDebrief(data.content?.find(b=>b.type==="text")?.text || "");
    } catch {
      setDebrief("Great work completing the simulation. Review the PROOF step below and apply it to your own context this week.");
    }
    setLoading(false);
  }

  // Brief screen
  if (simStep === 0) return (
    <div style={{background:"#fff",borderRadius:14,border:`2px solid ${sc.tagColor}`,overflow:"hidden"}}>
      <div style={{background:sc.tagColor,padding:"14px 20px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>🎭</span>
        <div>
          <div style={{fontWeight:800,color:sc.tag==="Culture"?NAVY:"#fff",fontSize:15}}>{sc.tool}</div>
          <div style={{color:sc.tag==="Culture"?"#1A2B4A99":"rgba(255,255,255,0.8)",fontSize:12}}>{sc.subtitle}</div>
        </div>
      </div>
      <div style={{padding:"20px 20px"}}>
        <div style={{background:"#FFF8E7",border:"1px solid #FDE68A",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#92400E",lineHeight:1.5}}>
          <strong>Why this scenario:</strong> {sc.why}
        </div>
        <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:8}}>📋 The Situation</div>
        <p style={{color:"#374151",fontSize:14,lineHeight:1.7,marginBottom:20}}>{sc.brief}</p>
        <div style={{background:"#F0F9FF",borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:13,color:"#1E40AF"}}>
          <strong>Your mission:</strong> Work through 3 decision points. Midway, something will change. That is the KAPOW card. Stay sharp.
        </div>
        <button onClick={()=>setSimStep(1)} style={{background:sc.tagColor,color:sc.tag==="Culture"?NAVY:"#fff",border:"none",borderRadius:8,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%"}}>
          Start Simulation →
        </button>
      </div>
    </div>
  );

  // Question screens (1, 2, 3) with Kapow after Q2
  if (simStep >= 1 && simStep <= totalQ) {
    const qIdx = simStep - 1;
    const q = sc.questions[qIdx];
    const selected = answers[qIdx];

    // Show Kapow before Q2 (after first question answered)
    if (simStep === 2 && !kapowShown) {
      return (
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #E74C3C",overflow:"hidden"}}>
          <div style={{background:"#E74C3C",padding:"14px 20px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18,lineHeight:1}}>⚡</span>
            <div style={{fontWeight:800,color:"#fff",fontSize:16,letterSpacing:0.3}}>{sc.kapow.title}</div>
          </div>
          <div style={{padding:"20px"}}>
            <p style={{color:"#374151",fontSize:14,lineHeight:1.7,marginBottom:16}}>{sc.kapow.text}</p>
            <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,padding:"10px 14px",marginBottom:22,fontSize:13,color:"#991B1B"}}>
              <strong>The twist:</strong> {sc.kapow.followUp}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontWeight:700,color:NAVY,fontSize:14,marginBottom:8}}>How does this change your assessment?</label>
              <textarea value={kapowReflection.assessment} aria-label="How does this change your assessment?" onChange={e=>setKapowReflection(r=>({...r,assessment:e.target.value}))} placeholder="Type your thinking here…" rows={3} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:14,color:NAVY,fontFamily:"inherit",resize:"vertical",lineHeight:1.5}}/>
            </div>
            <div style={{marginBottom:22}}>
              <label style={{display:"block",fontWeight:700,color:NAVY,fontSize:14,marginBottom:8}}>Did it change your view of the tool?</label>
              <textarea value={kapowReflection.toolView} aria-label="Did it change your view of the tool?" onChange={e=>setKapowReflection(r=>({...r,toolView:e.target.value}))} placeholder="Type your thinking here…" rows={3} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:14,color:NAVY,fontFamily:"inherit",resize:"vertical",lineHeight:1.5}}/>
            </div>
            <button onClick={()=>setKapowShown(true)} style={{background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%"}}>
              Continue the Simulation →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{background:"#fff",borderRadius:14,border:`2px solid ${sc.tagColor}`,overflow:"hidden"}}>
        <div style={{background:sc.tagColor,padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,color:sc.tag==="Culture"?NAVY:"#fff",fontSize:13}}>{sc.tool}</span>
          <span style={{color:sc.tag==="Culture"?"#1A2B4A99":"rgba(255,255,255,0.8)",fontSize:12}}>Decision {simStep} of {totalQ}</span>
        </div>
        <div style={{background:"#E2E8F0",height:4}}>
          <div style={{width:`${((simStep-1)/totalQ)*100}%`,background:sc.tagColor,height:"100%",transition:"width 0.3s"}}/>
        </div>
        <div style={{padding:"20px"}}>
          <div style={{fontWeight:700,color:NAVY,fontSize:15,marginBottom:20,lineHeight:1.4}}>{q.q}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {q.options.map((opt,i)=>(
              <button key={i} onClick={()=>setAnswers(a=>({...a,[qIdx]:i}))}
                style={{padding:"12px 16px",borderRadius:10,border:`2px solid ${selected===i?sc.tagColor:"#E2E8F0"}`,background:selected===i?sc.tagColor+"18":"#fff",cursor:"pointer",textAlign:"left",fontSize:14,color:selected===i?NAVY:"#374151",fontWeight:selected===i?600:400,lineHeight:1.4}}>
                <span style={{fontWeight:700,marginRight:8,color:selected===i?sc.tagColor:"#94A3B8"}}>{String.fromCharCode(65+i)}.</span>{opt}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setSimStep(s=>s-1)} style={{padding:"10px 16px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",color:"#64748B",fontSize:13,cursor:"pointer"}}>← Back</button>
            <button onClick={()=>{
              if(selected===undefined) return;
              if(simStep===totalQ){ generateDebrief(); setSimStep(totalQ+1); }
              else { setSimStep(s=>s+1); }
            }} style={{flex:1,padding:"10px 16px",borderRadius:8,border:"none",background:selected!==undefined?sc.tagColor:"#E2E8F0",color:selected!==undefined?(sc.tag==="Culture"?NAVY:"#fff"):"#94A3B8",fontSize:14,fontWeight:700,cursor:selected!==undefined?"pointer":"default"}}>
              {simStep===totalQ?"See My Debrief →":"Next Decision →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Debrief screen
  if (simStep === totalQ + 1) {
    const score = sc.questions.reduce((acc,q,i)=>acc+(answers[i]===correct[i]?1:0),0);
    function parseDebrief(text) {
      if(!text) return {};
      text=stripMarkdown(text);
      const s=splitSections(text,[["right","WHAT YOU GOT RIGHT"],["deeper","WHERE TO THINK DEEPER"],["proof","YOUR PROOF STEP"]]);
      if(!s.right && !s.deeper && !s.proof) s.raw=text;
      return s;
    }
    const d = parseDebrief(debrief);
    return (
      <div style={{background:"#fff",borderRadius:14,border:"2px solid #27AE60",overflow:"hidden"}}>
        <div style={{background:"#27AE60",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,color:"#fff",fontSize:15}}>Simulation Debrief</div>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 14px",color:"#fff",fontSize:13,fontWeight:700}}>{score}/{totalQ} strong decisions</div>
        </div>
        <div style={{padding:"20px"}}>
          {loading ? (
            <div style={{textAlign:"center",padding:"30px 0",color:"#64748B"}}>
              <div style={{width:40,height:40,borderRadius:"50%",border:`3px solid ${TEAL}33`,borderTop:`3px solid ${TEAL}`,animation:"spin 1s linear infinite",margin:"0 auto 12px"}}/>
              Generating your debrief…
            </div>
          ) : (
            <>
              {d.right && <div style={{marginBottom:14,padding:"12px 16px",background:"#F0FDF4",borderRadius:10,border:"1px solid #86EFAC"}}><div style={{fontWeight:700,color:"#166534",fontSize:13,marginBottom:6}}>✓ What You Got Right</div><p style={{color:"#14532D",fontSize:14,lineHeight:1.6}}>{d.right}</p></div>}
              {d.deeper && <div style={{marginBottom:14,padding:"12px 16px",background:"#FFFBEB",borderRadius:10,border:"1px solid #FDE68A"}}><div style={{fontWeight:700,color:"#92400E",fontSize:13,marginBottom:6}}>🔍 Where to Think Deeper</div><p style={{color:"#78350F",fontSize:14,lineHeight:1.6}}>{d.deeper}</p></div>}
              {d.proof && <div style={{marginBottom:14,padding:"12px 16px",background:"#EFF6FF",borderRadius:10,border:"1px solid #BFDBFE"}}><div style={{fontWeight:700,color:"#1E40AF",fontSize:13,marginBottom:6}}>🧭 Your PROOF Step: {sc.proofStep}</div><p style={{color:"#1E3A8A",fontSize:14,lineHeight:1.6}}>{d.proof}</p></div>}
              {d.raw && <p style={{color:"#374151",fontSize:14,lineHeight:1.7}}>{d.raw}</p>}
              {sc.resourceUrl && sc.resourceUrl.startsWith("http") && (
              <div style={{background:"#F8FAFC",borderRadius:10,padding:"14px 16px",marginBottom:16,border:"1px solid #E2E8F0"}}>
                <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:8}}>📚 Go Deeper: Beyond Compliance Resource</div>
                <a href={sc.resourceUrl} target="_blank" rel="noopener noreferrer" style={{color:TEAL_INK,fontWeight:600,fontSize:14,textDecoration:"none"}}>→ {sc.resource} ↗</a>
              </div>
              )}
              <button onClick={onDone} style={{background:NAVY,color:"#fff",border:"none",borderRadius:8,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%"}}>Back to My Report</button>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// ── MAIN APP ─────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]=useState("landing");
  // Session-only by design: nothing is stored, so a refresh clears the report.
  // Warn before the browser discards it.
  useEffect(()=>{
    if(phase==="landing") return;
    const warn=(e)=>{ e.preventDefault(); e.returnValue=""; };
    window.addEventListener("beforeunload",warn);
    return ()=>window.removeEventListener("beforeunload",warn);
  },[phase]);
  const [returnTo,setReturnTo]=useState("landing");
  const [role,setRole]=useState(null);
  const [demographics,setDemographics]=useState({orgType:"",designation:"",size:"",locationPath:[]});
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState({});
  const [report,setReport]=useState(null);
  const [scores,setScores]=useState(null);
  const [loadingMsg,setLoadingMsg]=useState("Analysing your responses…");
  const [activeScenario,setActiveScenario]=useState(null);
  const [showAllScenarios,setShowAllScenarios]=useState(false);

  const totalSteps=QUESTIONS.length;
  const currentQ=QUESTIONS[step];

  useEffect(()=>{
    if(phase==="loading"){
      const msgs=["Analysing your responses…","Mapping your readiness profile…","Generating your personalised report…","Applying CAIRE-Change framework…","Almost ready…"];
      let i=0; const interval=setInterval(()=>{i=(i+1)%msgs.length;setLoadingMsg(msgs[i]);},2200);
      return ()=>clearInterval(interval);
    }
  },[phase]);

  function reset(){setPhase("landing");setDemographics({orgType:"",designation:"",size:"",locationPath:[]});setAnswers({});setStep(0);setReport(null);setScores(null);setActiveScenario(null);setShowAllScenarios(false);}

  async function generateReport(){
    setPhase("loading");
    const s=calcScores(answers); setScores(s);
    const tier=getTier(s.overall);
    const rawAnswers=QUESTIONS.map(q=>`Q${q.id} (${DIM_LABELS[q.dimension]}): "${q.text}" -> ${answerLabel(q,answers[q.id])}`).join("\n");
    const prompt=`You are an expert AI readiness consultant trained in the CAIRE-Change Framework and the PROOF framework (Profile, Risk-Classify, Obligations, Operational Alignment, Future-Proof) developed by DMNU Learning Design. Your tone is professional but warm.

RESPONDENT: ${ROLE_LABELS[role]||"Educator"}.
CONTEXT: ${demographics.orgType||"Not specified"} setting | Designation: ${demographics.designation||"Not specified"} | Size: ${demographics.size||"Not specified"} staff | Location: ${locationString(demographics.locationPath)||"Not specified"}.
Tailor the language, examples, and terminology to this respondent and setting. A ${ROLE_LABELS[role]||"respondent"} in a ${demographics.orgType||"school"} context has a specific sphere of influence: a teacher shapes classroom practice, a leader shapes whole-school policy, a trainer or L&D manager shapes staff development. For corporate settings, use organisational rather than school language. For Irish primary, post-primary, or ETB settings, use Irish educational terminology. When referring to obligations, always cite GDPR and the EU AI Act. The respondent's location is given above: if it names a specific country or jurisdiction, you may refer to that country's national data protection framework (for example, the Irish Data Protection Acts, or the relevant Italian regime); if the location is blank, non-EU, or unclear, refer only to GDPR and national data protection law in general, and do not name any specific country.
SCORES: Awareness ${s.awareness.toFixed(2)} | Policy ${s.policy.toFixed(2)} | Practice ${s.practice.toFixed(2)} | Culture ${s.culture.toFixed(2)} | Overall ${s.overall.toFixed(2)} | Tier: ${tier.label}
ANSWERS:\n${rawAnswers}

Generate a personalised AI Readiness Report with EXACTLY these five labelled sections:

READINESS SUMMARY
2–3 sentences. Warm, honest, reference their tier.

DIMENSION BREAKDOWN
Four short paragraphs, one each for Awareness, Policy, Practice, and Culture, in that order, each beginning with the dimension name. Each is 2 to 3 sentences: what the score reveals, what is working, the key gap. Never answer a dimension with a single word.

TOP 3 PRIORITIES
Numbered. Specific, actionable, 90-day horizon.

WHAT GOOD LOOKS LIKE
One paragraph. Inspiring 12-month vision.

NEXT STEP
1-2 sentences. Close with encouragement. You may add a low-key mention that DMNU Learning Design offers workshops and support if useful. Do not promise any specific plan or deliverable, and do not pressure them to book anything.

450–550 words total.`;
    try {
      const res=await fetch("/api/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:1600,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const text=data.content?.find(b=>b.type==="text")?.text||"";
      setReport(parseReport(text));
    } catch { setReport({error:"Something went wrong. Please try again."}); }
    setPhase("results");
  }

  function parseReport(text){
    text=stripMarkdown(text);
    const s=splitSections(text,[["summary","READINESS SUMMARY"],["breakdown","DIMENSION BREAKDOWN"],["priorities","TOP 3 PRIORITIES"],["vision","WHAT GOOD LOOKS LIKE"],["cta","NEXT STEP"]]);
    if(!s.summary && !s.breakdown && !s.priorities && !s.vision && !s.cta) s.raw=text;
    return s;
  }

  // ── LANDING ────────────────────────────────────────────────────────
  if(phase==="caire") return <CairePage onBack={()=>setPhase(returnTo)} />;
  if(phase==="proof") return <ProofPage onBack={()=>setPhase(returnTo)} />;
  if(phase==="sav") return <SavPage onBack={()=>setPhase(returnTo)} />;
  if(phase==="audit") return <FourPsAudit role={role} scores={scores} onBack={()=>setPhase(returnTo)} />;
  if(phase==="beyond") return <BeyondCompliancePage onBack={()=>setPhase(returnTo)} goProof={()=>{setReturnTo("beyond");setPhase("proof");}} />;

  if(phase==="landing") return (
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:BG}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}.dmnu-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}@media(max-width:720px){.dmnu-grid{grid-template-columns:repeat(2,1fr)}}.dmnu-pillars{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}@media(max-width:600px){.dmnu-pillars{grid-template-columns:1fr}}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
      <div style={{background:NAVY,padding:"48px 24px 56px",textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}><img src="/dmnu-icon.png" alt="DMNU" style={{height:44,width:"auto"}}/><span style={{fontSize:11,fontWeight:700,letterSpacing:3,color:TEAL,textTransform:"uppercase"}}>DMNU Learning Design</span></div>
        <h1 style={{color:"#fff",fontSize:"clamp(24px,5vw,40px)",fontWeight:800,lineHeight:1.2,maxWidth:680,margin:"0 auto 16px"}}>Is Your School or Organisation<br/><span style={{color:TEAL}}>AI-Ready?</span></h1>
        <p style={{color:"#94A3B8",fontSize:17,maxWidth:480,margin:"0 auto 16px",lineHeight:1.6}}>Find out in 5 minutes. {QUESTIONS.length} questions. A personalised readiness report, then test your judgement with a live simulation.</p>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(42,191,191,0.12)",border:"1px solid rgba(42,191,191,0.35)",borderRadius:20,padding:"6px 16px",marginBottom:36}}>
          <span style={{color:TEAL,fontSize:13}}>★</span>
          <span style={{color:"#CBD5E1",fontSize:13,fontWeight:600}}>Built on Beyond Compliance, an Official Participant in the 2026 AI for Education Awards</span>
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:40}}>
          {[["school_leader","🏫","I'm a School Leader"],["teacher","📚","I'm a Teacher"],["ld_manager","💼","I'm an L&D Manager"],["trainer","🎓","I'm a Trainer"]].map(([r,emoji,label])=>(
            <button key={r} onClick={()=>{setRole(r);setPhase("demographics");}} style={{background:TEAL,color:NAVY,border:"none",borderRadius:10,padding:"14px 28px",fontSize:15,fontWeight:700,cursor:"pointer"}}>{emoji} {label}</button>
          ))}
        </div>
        <div style={{maxWidth:620,margin:"0 auto",background:"rgba(42,191,191,0.1)",border:"1px solid rgba(42,191,191,0.3)",borderRadius:12,padding:"18px 22px",textAlign:"left"}}>
          <div style={{fontWeight:700,color:TEAL,fontSize:13,marginBottom:10}}>⚖️ Responsible Use Statement</div>
          <p style={{color:"#94A3B8",fontSize:13,lineHeight:1.6,marginBottom:8}}>This diagnostic is a <strong style={{color:"#CBD5E1"}}>self-reported assessment tool</strong>, not an audit or compliance certification. Scores reflect your perceptions at a point in time, a starting point for reflection, not a definitive judgement.</p>
          <p style={{color:"#94A3B8",fontSize:13,lineHeight:1.6}}><strong style={{color:"#CBD5E1"}}>Data handling:</strong> This tool never asks for your name, email, or anything that identifies you. Your responses stay in your browser for this session only and are gone when you close the tab. Nothing is stored, and nothing is used to train AI models. A future version will record anonymous readiness data only, your scores, tier, role, sector, and county or region, never anything that identifies you, to build a nationwide picture of AI readiness for educators and policymakers.</p>
        </div>
      </div>
      <div style={{maxWidth:720,margin:"0 auto",padding:"48px 24px"}}>
        <h2 style={{color:NAVY,fontSize:22,fontWeight:700,textAlign:"center",marginBottom:32}}>What you will get</h2>
        <div className="dmnu-grid" style={{marginBottom:40}}>
          {[["📊","Scored profile","4 dimensions of AI readiness"],["🎯","Readiness tier","Emerging, Developing, or Leading"],["✅","Top 3 priorities","Actionable 90-day steps"],["🎭","Live simulation","Test your judgement on a real scenario"]].map(([icon,title,desc])=>(
            <div key={title} style={{background:"#fff",borderRadius:12,padding:20,border:"1px solid #E2E8F0",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
              <div style={{fontWeight:700,color:NAVY,marginBottom:4,fontSize:14}}>{title}</div>
              <div style={{color:"#64748B",fontSize:13,lineHeight:1.5}}>{desc}</div>
            </div>
          ))}
        </div>

        <h2 style={{color:NAVY,fontSize:22,fontWeight:700,textAlign:"center",marginBottom:8}}>The four pillars of AI readiness</h2>
        <p style={{color:"#64748B",fontSize:14,textAlign:"center",maxWidth:520,margin:"0 auto 24px",lineHeight:1.6}}>The work behind this tool. Each pillar has its own page.</p>
        <div className="dmnu-pillars" style={{marginBottom:40}}>
          {[
            ["beyond","Beyond Compliance","Professional Learning","The simulation-based programme behind this tool. Official Participant, Teacher Training Award, Global Competition.",TEAL],
            ["sav","Student-Author Voice","Assessment","Peer-reviewed detection analysis and a rubric that assesses authorship instead of hunting for AI.",TEAL],
            ["caire","CAIRE-Change","Framework","An integrated model for ethical and effective AI adoption, values and change conditions together.","#3B82F6"],
            ["proof","PROOF","Framework","AI Act-PROOF your institution: Profile, Risk-Classify, Obligations, Operational Alignment, Future-Proof.","#8B5CF6"],
          ].map(([page,name,tag,desc,color])=>(
            <div key={page} {...clickable(()=>{setReturnTo("landing");setPhase(page);})} style={{background:"#fff",border:`1px solid #E2E8F0`,borderTop:`3px solid ${color}`,borderRadius:12,padding:"18px 20px",cursor:"pointer",display:"flex",flexDirection:"column"}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:color,textTransform:"uppercase",marginBottom:6}}>{tag}</div>
              <div style={{fontWeight:800,color:NAVY,fontSize:16,marginBottom:6}}>{name}</div>
              <div style={{color:"#64748B",fontSize:13,lineHeight:1.5,marginBottom:12,flex:1}}>{desc}</div>
              <span style={{color:NAVY,fontWeight:700,fontSize:13}}>Explore →</span>
            </div>
          ))}
        </div>

        <div style={{padding:"18px 20px",background:"#EFF6FF",borderRadius:12,border:"1px solid #BFDBFE"}}>
          <div style={{fontWeight:700,color:NAVY,fontSize:13,marginBottom:8}}>Grounded in:</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {l:"EU AI Act",u:"https://eur-lex.europa.eu/eli/reg/2024/1689"},
              {l:"GDPR",u:"https://eur-lex.europa.eu/eli/reg/2016/679/oj"},
              {l:"EU Ethical Guidelines on AI in Education",u:"https://education.ec.europa.eu/focus-topics/digital-education/actions/plan/ethical-guidelines-for-educators-on-using-artificial-intelligence"},
              {l:"Irish DES Guidance 2025",u:"https://www.gov.ie/en/department-of-education/press-releases/minister-mcentee-welcomes-new-national-guidance-on-the-use-of-ai-in-schools/"},
              {l:"DigCompEdu",u:"https://joint-research-centre.ec.europa.eu/projects-and-activities/key-competences-lifelong-learning/digcompedu_en"},
              {l:"DigComp 3.0",u:"https://joint-research-centre.ec.europa.eu/projects-and-activities/education-and-training/digital-transformation-education/digital-competence-framework-digcomp/digcomp-30_en"},
              {l:"UNESCO AI Competencies for Teachers",u:"https://www.unesco.org/en/articles/ai-competency-framework-teachers"},
              {l:"UNESCO AI Competencies for Students",u:"https://www.unesco.org/en/articles/ai-competency-framework-students"},
              {l:"EU & OECD AILit Framework",u:"https://ailiteracyframework.org/"},
            ].map(({l,u})=>(
              <a key={l} href={u} target="_blank" rel="noopener noreferrer" style={{background:"#DBEAFE",color:"#1E40AF",padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,textDecoration:"none"}}>{l} ↗</a>
            ))}
          </div>
        </div>

        <CommitmentSection />
      </div>
    </div>
  );

  // ── DEMOGRAPHICS ──────────────────────────────────────────────────
  if(phase==="demographics"){
    const ready = demographics.orgType && demographics.designation && demographics.size;
    return (
      <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:BG,display:"flex",flexDirection:"column"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
        <div style={{background:NAVY,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:8}}><img src="/dmnu-icon.png" alt="DMNU" style={{height:24,width:"auto"}}/><span style={{color:TEAL,fontWeight:700,fontSize:14}}>DMNU</span></span>
          <span style={{color:"#94A3B8",fontSize:13}}>A little about your context</span>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 24px"}}>
          <div style={{maxWidth:580,width:"100%"}}>
            <h2 style={{color:NAVY,fontSize:"clamp(18px,3vw,24px)",fontWeight:700,marginBottom:8,lineHeight:1.3}}>Before you begin</h2>
            <p style={{color:"#64748B",fontSize:14,lineHeight:1.6,marginBottom:28}}>Four quick questions about your setting. This tailors your report and helps build a picture of AI readiness across schools and organisations.</p>

            {DEMOGRAPHICS.map(({key,label,options})=>(
              <div key={key} style={{marginBottom:24}}>
                <div style={{fontWeight:700,color:NAVY,fontSize:15,marginBottom:12}}>{label}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {options.map(opt=>{
                    const sel=demographics[key]===opt;
                    return (
                      <button key={opt} onClick={()=>setDemographics(d=>({...d,[key]:opt}))}
                        style={{padding:"10px 16px",borderRadius:8,border:`2px solid ${sel?TEAL:"#E2E8F0"}`,background:sel?TEAL+"15":"#fff",color:sel?NAVY:"#64748B",fontWeight:sel?600:400,fontSize:14,cursor:"pointer"}}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{marginBottom:24}}>
              <div style={{fontWeight:700,color:NAVY,fontSize:15,marginBottom:12}}>Where are you based?</div>
              {(()=>{
                const path=demographics.locationPath;
                const steps=[]; let p=[];
                while(true){
                  const opt=locationOptions(p);
                  if(!opt) break;
                  const chosen=path[p.length]||"";
                  steps.push({label:opt.label, options:opt.options, level:p.length, value:chosen});
                  if(!chosen) break;
                  p=[...p, chosen];
                }
                return steps.map(st=>(
                  <div key={st.level} style={{marginBottom:10}}>
                    <div style={{fontSize:12,color:"#64748B",marginBottom:4}}>{st.label}</div>
                    <select value={st.value} aria-label={st.label}
                      onChange={e=>{const v=e.target.value; setDemographics(d=>({...d,locationPath:v?[...d.locationPath.slice(0,st.level),v]:d.locationPath.slice(0,st.level)}));}}
                      style={{width:"100%",padding:"12px 16px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:14,color:st.value?NAVY:"#94A3B8",fontFamily:"inherit",background:"#fff",cursor:"pointer"}}>
                      <option value="">Select...</option>
                      {st.options.map(o=><option key={o} value={o} style={{color:NAVY}}>{o}</option>)}
                    </select>
                  </div>
                ));
              })()}
            </div>

            <div style={{background:"#F0FAFA",border:`1px solid ${TEAL}44`,borderRadius:10,padding:"14px 16px",marginBottom:28}}>
              <p style={{color:"#0F5257",fontSize:13,lineHeight:1.6}}>We use this to tailor your report to your setting. None of this identifies you, and nothing you enter is stored after your session. A future version will use anonymous, non-identifying data of this kind to build a nationwide picture of AI readiness for educators and policymakers.</p>
            </div>

            <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
              <button onClick={()=>setPhase("landing")} style={{padding:"12px 20px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",color:"#64748B",fontSize:14,cursor:"pointer"}}>← Back</button>
              <button onClick={()=>{if(ready)setPhase("form");}} style={{padding:"12px 24px",borderRadius:8,border:"none",background:ready?TEAL:"#E2E8F0",color:ready?NAVY:"#94A3B8",fontSize:14,fontWeight:700,cursor:ready?"pointer":"default",flex:1,maxWidth:240}}>Start the Diagnostic →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────
  if(phase==="form"){
    const progress=(step/totalSteps)*100;
    const selected=answers[currentQ.id];
    const dimColor=DIM_COLORS[currentQ.dimension];
    return (
      <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:BG,display:"flex",flexDirection:"column"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
        <div style={{background:NAVY,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:8}}><img src="/dmnu-icon.png" alt="DMNU" style={{height:24,width:"auto"}}/><span style={{color:TEAL,fontWeight:700,fontSize:14}}>DMNU</span></span>
          <span style={{color:"#94A3B8",fontSize:13}}>Question {step+1} of {totalSteps}</span>
        </div>
        <div style={{background:"#E2E8F0",height:4}}><div style={{width:`${progress}%`,background:TEAL,height:"100%",transition:"width 0.3s ease"}}/></div>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px"}}>
          <div style={{maxWidth:580,width:"100%"}}>
            <div style={{display:"inline-block",background:dimColor+"22",color:dimColor,fontWeight:700,fontSize:11,letterSpacing:2,padding:"4px 10px",borderRadius:6,marginBottom:8,textTransform:"uppercase"}}>{DIM_LABELS[currentQ.dimension]}</div>
            <p style={{color:"#64748B",fontSize:12,marginBottom:16,lineHeight:1.5}}>{DIM_DESC[currentQ.dimension]}</p>
            <h2 style={{color:NAVY,fontSize:"clamp(16px,3vw,22px)",fontWeight:700,marginBottom:10,lineHeight:1.4}}>{currentQ.text}</h2>
            <p style={{color:"#94A3B8",fontSize:12,marginBottom:22,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{currentQ.format==="status"?"Choose the closest description":"How much do you agree?"}</p>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:36}}>
              {currentQ.format==="status"?(
                STATUS_OPTIONS.map(opt=>(
                  <button key={opt.value} onClick={()=>setAnswers(a=>({...a,[currentQ.id]:opt.value}))} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:10,border:`2px solid ${selected===opt.value?dimColor:"#E2E8F0"}`,background:selected===opt.value?dimColor+"15":"#fff",cursor:"pointer",textAlign:"left"}}>
                    <span style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${selected===opt.value?dimColor:"#CBD5E1"}`,background:selected===opt.value?dimColor:"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{selected===opt.value&&<span style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}</span>
                    <span style={{color:selected===opt.value?NAVY:"#374151",fontWeight:selected===opt.value?600:400,fontSize:14}}>{opt.label}</span>
                  </button>
                ))
              ):(
                [1,2,3,4,5].map(val=>(
                  <button key={val} onClick={()=>setAnswers(a=>({...a,[currentQ.id]:val}))} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:10,border:`2px solid ${selected===val?dimColor:"#E2E8F0"}`,background:selected===val?dimColor+"15":"#fff",cursor:"pointer",textAlign:"left"}}>
                    <span style={{width:28,height:28,borderRadius:"50%",background:selected===val?dimColor:"#E2E8F0",color:selected===val?"#fff":"#64748B",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0}}>{val}</span>
                    <span style={{color:selected===val?NAVY:"#64748B",fontWeight:selected===val?600:400,fontSize:14}}>{LABELS[val-1]}</span>
                  </button>
                ))
              )}
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"space-between"}}>
              <button onClick={()=>step>0?setStep(s=>s-1):reset()} style={{padding:"12px 20px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",color:"#64748B",fontSize:14,cursor:"pointer"}}>← Back</button>
              {step<totalSteps-1?(
                <button onClick={()=>{if(selected)setStep(s=>s+1);}} style={{padding:"12px 24px",borderRadius:8,border:"none",background:selected?NAVY:"#E2E8F0",color:selected?"#fff":"#94A3B8",fontSize:14,fontWeight:600,cursor:selected?"pointer":"default",flex:1,maxWidth:200}}>Next →</button>
              ):(
                <button onClick={()=>{if(selected)generateReport();}} style={{padding:"12px 24px",borderRadius:8,border:"none",background:selected?TEAL:"#E2E8F0",color:selected?NAVY:"#94A3B8",fontSize:14,fontWeight:700,cursor:selected?"pointer":"default",flex:1,maxWidth:240}}>Generate My Report 🚀</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ────────────────────────────────────────────────────────
  if(phase==="loading") return (
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:NAVY,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
      <div style={{width:64,height:64,borderRadius:"50%",border:`4px solid ${TEAL}33`,borderTop:`4px solid ${TEAL}`,animation:"spin 1s linear infinite",marginBottom:32}}/>
      <h2 style={{color:"#fff",fontSize:22,fontWeight:700,marginBottom:12}}>Building your report</h2>
      <p style={{color:TEAL,fontSize:16,fontWeight:500,animation:"pulse 2s ease-in-out infinite"}}>{loadingMsg}</p>
      <p style={{color:"#475569",fontSize:13,marginTop:20}}>Your responses are not stored · Session only · GDPR by design</p>
    </div>
  );

  // ── RESULTS ────────────────────────────────────────────────────────
  if(phase==="results"&&scores){
    const tier=getTier(scores.overall);
    const lowest=lowestDim(scores);
    const recommended=pickScenario(lowest, demographics.orgType);
    const nonSchool=NON_SCHOOL_ORGS.includes(demographics.orgType);
    const others=nonSchool ? [] : otherDims(lowest).slice(0,2).map(k=>pickScenario(k, demographics.orgType));
    const shownIds=new Set([recommended.id, ...others.map(o=>o.id)]);
    const universals=UNIVERSAL_SCENARIOS.filter(sc=>!shownIds.has(sc.id));

    // Active simulation
    if(activeScenario) return (
      <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:BG}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
        <div style={{background:NAVY,padding:"14px 24px",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setActiveScenario(null)} style={{background:"transparent",border:"1px solid #475569",color:"#94A3B8",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>← Back to report</button>
          <span style={{color:TEAL,fontWeight:700,fontSize:14}}>Beyond Compliance: Live Simulation</span>
        </div>
        <div style={{maxWidth:640,margin:"0 auto",padding:"28px 20px"}}>
          <Simulation scenario={activeScenario} onDone={()=>setActiveScenario(null)}/>
        </div>
      </div>
    );

    return (
      <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:BG}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}*:focus-visible{outline:3px solid #D97706;outline-offset:2px;border-radius:3px}@media(prefers-reduced-motion:reduce){*{animation-duration:0.001ms!important;transition-duration:0.001ms!important}}`}</style>
        <div style={{background:NAVY,padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:8}}><img src="/dmnu-icon.png" alt="DMNU" style={{height:28,width:"auto"}}/><span style={{color:TEAL,fontWeight:800,fontSize:16}}>DMNU</span></span>
          <span style={{color:"#94A3B8",fontSize:13}}>AI Readiness Report</span>
          <button onClick={reset} style={{background:"transparent",border:"1px solid #475569",color:"#94A3B8",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Start over</button>
        </div>

        <div style={{maxWidth:680,margin:"0 auto",padding:"32px 20px"}}>

          {/* Tier badge */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{display:"inline-block",background:tier.color+"18",border:`2px solid ${tier.color}`,borderRadius:16,padding:"20px 36px",marginBottom:12}}>
              <div style={{fontSize:36,marginBottom:6}}>{tier.emoji}</div>
              <div style={{fontSize:12,fontWeight:600,color:"#64748B",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Your Readiness Tier</div>
              <div style={{fontSize:30,fontWeight:800,color:tier.color}}>{tier.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:NAVY,marginTop:4}}>{scores.overall.toFixed(1)} / 5.0</div>
            </div>
            <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:"10px 16px",maxWidth:500,margin:"0 auto",textAlign:"left"}}>
              <span style={{fontSize:12,color:"#92400E",lineHeight:1.5}}><strong>Note:</strong> This tier reflects self-reported responses at this point in time. It is an indicative starting point, not a validated audit score.</span>
            </div>
          </div>

          {/* Scores */}
          <div style={{background:"#fff",borderRadius:12,padding:"22px 20px",border:"1px solid #E2E8F0",marginBottom:20}}>
            <h3 style={{color:NAVY,fontWeight:700,fontSize:16,marginBottom:6}}>Dimension scores</h3>
            <p style={{color:"#64748B",fontSize:12,marginBottom:16}}>Each score is the average of your self-reported responses (1–5).</p>
            {Object.entries(DIM_LABELS).map(([k,l])=><ScoreBar key={k} label={l} score={scores[k]} color={DIM_COLORS[k]}/>)}
          </div>

          {/* AI Report */}
          {report&&!report.error&&<>
            {report.summary&&<ReportSection title="Readiness Summary" content={report.summary}/>}
            {report.breakdown&&<ReportSection title="Dimension Breakdown" content={report.breakdown}/>}
            {report.priorities&&<ReportSection title="Top 3 Priorities (Next 90 Days)" content={report.priorities}/>}
            {report.vision&&<ReportSection title="What Good Looks Like" content={report.vision}/>}
            {report.raw&&<ReportSection title="Your Personalised Report" content={report.raw}/>}
          </>}
          {report?.error&&<div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:12,padding:20,marginBottom:20,color:ALERT}}>{report.error}</div>}

          {/* Governance checklist */}
          <div style={{background:"#fff",borderRadius:12,padding:"22px 20px",border:`2px solid ${tier.color}44`,marginBottom:20}}>
            <h3 style={{color:NAVY,fontWeight:700,fontSize:16,marginBottom:6}}>📋 Governance Checklist: {tier.label} Stage</h3>
            <p style={{color:"#64748B",fontSize:12,marginBottom:16,lineHeight:1.5}}>Matched to your readiness tier and the Irish DES AI in Schools Guidance (Oct 2025).</p>
            {TIER_GOVERNANCE[tier.label].map((item,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 0",borderBottom:i<TIER_GOVERNANCE[tier.label].length-1?"1px solid #F1F5F9":"none"}}>
                <div style={{width:22,height:22,borderRadius:4,border:`2px solid ${tier.color}`,flexShrink:0,marginTop:1}}/>
                <span style={{color:"#374151",fontSize:14,lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>

          {/* ── SIMULATION SECTION ── */}
          <div style={{background:NAVY,borderRadius:16,padding:"28px 24px",marginBottom:20}}>
            <div style={{color:TEAL,fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>Beyond Compliance <button onClick={()=>{setReturnTo("results");setPhase("beyond");}} style={{background:"transparent",border:`1px solid ${TEAL}`,color:TEAL,borderRadius:12,padding:"2px 10px",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:0.5}}>What is this?</button></div>
            <h3 style={{color:"#fff",fontSize:20,fontWeight:800,marginBottom:8}}>🎭 Test Your Judgement: Live Simulation</h3>
            <p style={{color:"#94A3B8",fontSize:14,lineHeight:1.6,marginBottom:20}}>Based on your results, we have matched you to a scenario. Work through 3 real-world decision points, face a KAPOW card (something changes mid-way), and get an AI-generated debrief grounded in the EU AI Act and PROOF framework.</p>

            {/* Recommended scenario */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:TEAL,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>⭐ {nonSchool ? "Recommended for your setting" : `Recommended for you, based on your lowest score (${DIM_LABELS[lowest]})`}</div>
              <div style={{background:"rgba(255,255,255,0.06)",border:`2px solid ${recommended.tagColor}`,borderRadius:12,padding:"16px 18px",cursor:"pointer"}} {...clickable(()=>setActiveScenario(recommended))}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:800,color:"#fff",fontSize:15}}>{recommended.tool}</div>
                    <div style={{color:"#94A3B8",fontSize:13}}>{recommended.subtitle}</div>
                  </div>
                  <span style={{background:recommended.tagColor,color:recommended.tag==="Culture"?NAVY:"#fff",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20}}>{recommended.tag}</span>
                </div>
                <p style={{color:"#94A3B8",fontSize:13,lineHeight:1.5,marginBottom:12}}>{recommended.why}</p>
                <button style={{background:recommended.tagColor,color:recommended.tag==="Culture"?NAVY:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer",width:"100%"}}>Start This Simulation →</button>
              </div>
            </div>

            {/* Other scenarios */}
            {others.length>0 && <>
            <div style={{fontSize:12,fontWeight:700,color:"#64748B",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Or try another scenario:</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
              {others.map(sc=>(
                <div key={sc.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #334155",borderRadius:10,padding:"14px 16px",cursor:"pointer"}} {...clickable(()=>setActiveScenario(sc))}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontWeight:700,color:"#fff",fontSize:14}}>{sc.tool}</span>
                    <span style={{background:sc.tagColor+"33",color:sc.tagColor,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:12}}>{sc.tag}</span>
                  </div>
                  <div style={{color:"#64748B",fontSize:12,marginBottom:10}}>{sc.subtitle}</div>
                  <button style={{background:"transparent",color:TEAL,border:`1px solid ${TEAL}`,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",width:"100%"}}>Try this scenario →</button>
                </div>
              ))}
            </div>
            </>}

            {/* Universal scenarios, available to everyone */}
            {universals.map(sc=>(
              <div key={sc.id} style={{marginTop:20,paddingTop:20,borderTop:"1px solid #334155"}}>
                <div style={{fontSize:12,fontWeight:700,color:sc.tagColor,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>{sc.cardLabel}</div>
                <div style={{background:"rgba(255,255,255,0.06)",border:`2px solid ${sc.tagColor}`,borderRadius:12,padding:"16px 18px",cursor:"pointer"}} {...clickable(()=>setActiveScenario(sc))}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:800,color:"#fff",fontSize:15}}>{sc.tool}</div>
                      <div style={{color:"#94A3B8",fontSize:13}}>{sc.subtitle}</div>
                    </div>
                    <span style={{background:sc.tagColor,color:"#fff",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20}}>{sc.tag}</span>
                  </div>
                  <p style={{color:"#94A3B8",fontSize:13,lineHeight:1.5,marginBottom:12}}>{sc.why}</p>
                  <button style={{background:sc.tagColor,color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer",width:"100%"}}>Start This Simulation →</button>
                </div>
              </div>
            ))}
          </div>

          {/* SAV resource link */}
          <div {...clickable(()=>{setReturnTo("results");setPhase("sav");})} style={{background:"#fff",border:`2px solid ${TEAL}`,borderRadius:14,padding:"20px 22px",marginBottom:20,cursor:"pointer"}}>
            <div style={{color:TEAL_INK,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Resource</div>
            <h3 style={{color:NAVY,fontSize:17,fontWeight:800,marginBottom:6}}>Why AI detection cannot protect your students</h3>
            <p style={{color:"#64748B",fontSize:13,lineHeight:1.6,marginBottom:12}}>Four pieces of one author's writing, thirteen detection tools, one finding. Then the Student-Author Voice rubric: an evidence-backed alternative that assesses authorship instead of hunting for AI.</p>
            <span style={{color:NAVY,fontWeight:700,fontSize:14}}>Open the SAV resource →</span>
          </div>

          {/* 4Ps Active Audit */}
          <div {...clickable(()=>{setReturnTo("results");setPhase("audit");})} style={{background:NAVY,borderRadius:14,padding:"22px 24px",marginBottom:20,cursor:"pointer"}}>
            <div style={{color:TEAL,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>A thought-doer activity</div>
            <h3 style={{color:"#fff",fontSize:18,fontWeight:800,marginBottom:6}}>🗣 The 4Ps Active Audit</h3>
            <p style={{color:"#94A3B8",fontSize:13,lineHeight:1.6,marginBottom:12}}>Face a challenger, a colleague, a parent, your principal, or an inspector, who questions how you use AI. Defend your decisions across Purpose, Planning, Policies, and Practice, then download a formatted CPD reflection.</p>
            <span style={{color:TEAL,fontWeight:700,fontSize:14}}>Start the audit →</span>
          </div>

          {/* Methodology */}
          <div style={{marginBottom:20}}>
            <h3 style={{color:NAVY,fontWeight:700,fontSize:15,marginBottom:12}}>📖 Methodology & Transparency</h3>
            <Disclosure title="How is the report generated?">
              <p style={{color:"#374151",fontSize:13,lineHeight:1.6,paddingTop:8}}>Your {QUESTIONS.length} responses are averaged into four dimension scores and an overall score, then sent to Claude (Anthropic) to generate a narrative report grounded in the CAIRE-Change Framework, PROOF framework, EU AI Act, Irish DES Guidance (Oct 2025), and DigCompEdu.</p>
            </Disclosure>
            <Disclosure title="Data handling: what happens to my responses?">
              <div style={{paddingTop:8}}>
                <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                  <span style={{fontWeight:700,color:"#166534",fontSize:13}}>✓ No personal data.</span><span style={{color:"#166534",fontSize:13}}> This tool never asks for your name, email, or anything that identifies you.</span>
                </div>
                {["Your responses stay in your browser for this session only and are gone when you close the tab","Nothing is stored in any database","No personal identifiers are collected","Your responses are not used to train AI models","No tracking cookies are used"].map((item,i)=>(
                  <div key={i} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
                    <span style={{color:SUCCESS,fontWeight:700,flexShrink:0}}>✓</span>
                    <span style={{color:"#374151",fontSize:13,lineHeight:1.5}}>{item}</span>
                  </div>
                ))}
              </div>
            </Disclosure>
            <Disclosure title="Theoretical foundations">
              <div style={{paddingTop:8}}>
                {[["CAIRE-Change Framework","Ní Uanacháin, D.M. (2026). DMNU Learning Design. Integrates CAIRE values with EdTech Change conditions adapted from Knoster (1991) by Amelia King (2025)."],["PROOF Framework","Ní Uanacháin, D.M. (2025). Profile, Risk-Classify, Obligations, Operational Alignment, Future-Proof. CC BY SA 4.0."],["Irish DES Guidance","Department of Education and Youth (Oct 2025). Guidance on Artificial Intelligence in Schools. Dublin: Government of Ireland."],["EU AI Act","Regulation (EU) 2024/1689. European Parliament and of the Council on Artificial Intelligence."],["DigCompEdu","Redecker & Punie (2017). European Framework for the Digital Competence of Educators. European Commission."]].map(([t,d],i)=>(
                  <div key={i} style={{marginBottom:12}}>
                    <div style={{fontWeight:700,color:NAVY,fontSize:13}}>{t}</div>
                    <div style={{color:"#64748B",fontSize:12,lineHeight:1.5,marginTop:2}}>{d}</div>
                  </div>
                ))}
              </div>
            </Disclosure>
          </div>

          {/* CTA */}
          <div style={{background:NAVY,borderRadius:16,padding:"32px 24px",textAlign:"center"}}>
            <div style={{color:TEAL,fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Ready to go deeper?</div>
            <h3 style={{color:"#fff",fontSize:17,fontWeight:700,marginBottom:8,lineHeight:1.5}}>{(report?.cta && report.cta.length<=280) ? report.cta : "Book a free 30-minute AI Strategy Call with the DMNU team."}</h3>
            <p style={{color:"#94A3B8",fontSize:13,marginBottom:24,lineHeight:1.6}}>This report is yours to keep and act on. If your organisation would like support putting it into practice, DMNU Learning Design runs workshops and programmes.</p>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <a href={STRATEGY_FORM_URL || "https://dmnulearningdesign.com"} target="_blank" rel="noopener noreferrer" style={{background:TEAL,color:NAVY,borderRadius:8,padding:"13px 24px",fontWeight:700,fontSize:14,textDecoration:"none",display:"inline-block"}}>Register your interest</a>
              <button onClick={reset} style={{background:"transparent",color:"#94A3B8",border:"1px solid #334155",borderRadius:8,padding:"13px 24px",fontWeight:600,fontSize:14,cursor:"pointer"}}>Retake Diagnostic</button>
            </div>
            <div style={{marginTop:20,color:"#475569",fontSize:11}}>DMNU Learning Design · Beyond Compliance · CAIRE-Change · PROOF Framework · Session-only · GDPR by design</div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

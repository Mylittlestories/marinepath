/* MarinePath v2 — transparent evidence matching. No LLM is implied by local scores. */
const SKILL_RULES = [
 ['Chief Engineer CoC (III/2)', /\biii\s*\/\s*2\b|\b(?:chief engineer|engineer).*?\bclass\s*[1i]\b|\bclass\s*1\s*(?:coc|certificate)/i,4,'certificate'],
 ['Engineering degree', /(?:degree|bsc|msc|beng|meng).{0,50}(?:marine|naval|mechanical|electrical)|(?:marine|naval|mechanical|electrical).{0,35}(?:degree|bsc|msc|beng|meng)/i,4,'education'], ['Electrical / automation', /\b(?:electrical|automation|plc|high voltage)\b/i,3,'specialism'], ['STCW', /\bstcw\b/i,3,'certificate'], ['DP maintenance', /\bdp\s*(?:maintenance|maint)|dynamic positioning maintenance/i,4,'certificate'],
 ['LNG', /\blng\b|liquefied natural gas/i,3,'vessel'], ['LPG', /\blpg\b|liquefied petroleum gas/i,3,'vessel'],
 ['Tankers', /\btankers?\b/i,3,'vessel'], ['Chemical tankers', /chemical.{0,12}tankers?|tankers?.{0,12}chemical/i,3,'vessel'],
 ['PCTC / Car carriers', /\bpctc\b|\bpcc\b|car carriers?/i,3,'vessel'], ['Offshore vessels', /\boffshore\b|\bosv\b/i,3,'vessel'], ['Bulk carriers', /\bbulk(?:ers?| carriers?)?\b/i,3,'vessel'], ['Container ships', /\bcontainer(?:s| ships?| vessels?)?\b/i,3,'vessel'],
 ['Cruise ships', /\bcruise\b/i,3,'vessel'], ['Ferries / Ro-Pax', /\bferr(?:y|ies)\b|\bro[ -]?(?:pax|ro)\b/i,3,'vessel'],
 ['Tugs', /\btugs?\b|\btowage\b/i,3,'vessel'], ['PSV / AHTS', /\bpsv\b|\bahts\b|platform supply vessels?/i,3,'vessel'],
 ['Yachts', /\b(?:super)?yachts?\b/i,3,'vessel'],
 ['Dry docking', /\bdry[ -]?dock(?:ing|s)?\b/i,2,'skill'], ['Planned maintenance', /\bpms\b|planned maintenance/i,2,'skill'],
 ['ISM', /\bism\b/i,2,'skill'], ['SOLAS', /\bsolas\b/i,2,'skill'], ['MARPOL', /\bmarpol\b/i,2,'skill'],
 ['Class surveys', /class(?:ification)? (?:surveys?|societ)|statutory surveys?/i,2,'skill'],
 ['Budget management', /\bbudget(?:s|ing)?\b|opex|capex/i,2,'skill'], ['MAN engines', /\bman(?:[ -]b&w)?\b/i,2,'skill'],
 ['Wärtsilä engines', /w[aä]rtsil[aä]/i,2,'skill'], ['Dual fuel', /dual[ -]fuel/i,2,'skill'],
 ['Repairs', /\brepairs?\b|overhaul/i,1,'skill'], ['Technical management', /technical management|fleet technical|technical superintendent/i,2,'skill'],
 ['English', /\benglish\b/i,1,'language'], ['Greek', /\bgreek\b|ελληνικ/i,1,'language']
];
const MARINE_DOMAIN = /\b(?:maritime|marine|seagoing|seafaring|vessels?|ships?|shipboard|shipowner|shipmanagement|stcw|solas|marpol|tankers?|lng|lpg|drydock|ro[ -]?pax|yachts?|tugs?|psv|ahts|ferries|shipping)\b/i;
function phrase(text,term){const t=String(term||'').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return !!t && new RegExp('(?:^|[^\\p{L}\\p{N}])'+t+'(?:$|[^\\p{L}\\p{N}])','iu').test(String(text||''));}
function evidence(text){
 const raw=String(text||'');
 // Aspirations and explicit negatives are not credentials or experience.
 const body=raw.split(/\n|[.!?;](?:\s|$)/).filter(s=>!/(?:\bno\b|\bwithout\b|\black(?:ing)?\b|\bnot\b).{0,35}(?:experience|certificate|coc|certified|qualification)|\b(?:seeking|aspire|would like|looking for|interested in|objective)\b/i.test(s)).join('\n');
 return SKILL_RULES.filter(r=>r[1].test(body)).map(r=>({name:r[0],weight:r[2],kind:r[3]}));
}
function extractSkills(text){return new Set(evidence(text).map(e=>e.name));}
function parseIntent(c){
 const p=c.prefs||'';let sea=!!c.focus.sea,shore=!!c.focus.shore;
 if(/shore[ -]?(?:based)?\s+only|only\s+shore|no\s+(?:sea[ -]?going|seagoing|sea roles)/i.test(p)){sea=false;shore=true;}
 if(/(?:sea[ -]?going|seagoing)\s+only|only\s+(?:sea[ -]?going|seagoing)|no\s+shore/i.test(p)){sea=true;shore=false;}
 const excludes=splitList(c.exclude||'');
 const negs=[...p.matchAll(/(?:avoid|exclude|do not include|no)\s*:?\s*([^.;\n]+)/gi)];
 for(const m of negs){for(let term of m[1].split(/,|\band\b/i)){term=term.trim().replace(/\s+(?:roles?|jobs?|positions?)$/i,'');if(term && !/sea|shore|fees|relocat/i.test(term))excludes.push(term);}}
 let onlyPlace='';const placePattern='greece|athens|piraeus|cyprus|singapore|europe|uk|united kingdom|uae|dubai|hong kong|netherlands|germany';
 const m=p.match(new RegExp('(?:only\\s+(?:in\\s+)?('+placePattern+')|('+placePattern+')\\s+only)','i'));if(m)onlyPlace=(m[1]||m[2]).toLowerCase();
 const prefer=p.match(new RegExp('prefer(?:ably)?\\s+(?:in\\s+)?('+placePattern+')','i'));
 return {sea,shore,excludes:[...new Set(excludes)],onlyPlace,preferPlace:prefer?prefer[1].toLowerCase():''};
}
function regionSet(job){
 // Do not use the body: office footprints and travel destinations are not job locations.
 const hay=' '+norm(job.location||'').trim()+' ';const rs=new Set();
 for(const r in REGION_TERMS) if(REGION_TERMS[r].some(t=>phrase(hay,t.trim())))rs.add(r);
 if(/\b(?:uk|gb|gb\/ie|europe|eu|southampton|hampshire|liverpool|south coast|north west|north east)\b/.test(hay))rs.add('europe');
 if(/\b(?:gr|el)\b/.test(hay))rs.add('greece');
 if(/\b(?:us|usa|ca)\b/.test(hay))rs.add('americas');
 if(/\b(?:sg|hk|cn|id|bali)\b/.test(hay))rs.add('asia');
 if(/\b(?:ae|qa|sa|gcc|gulf)\b/.test(hay))rs.add('mideast');
 if(/\b(?:de|nl|dk|fr|es|it|cy|mt|be|no|se|ie|fi)\b/.test(hay))rs.add('europe');
 const world=/\b(?:worldwide|at sea|global|international waters|rotation)\b/.test(hay);
 return {rs,world,anySignal:rs.size>0||world};
}
function matchLocation(job,regions){const {rs,world}=regionSet(job);return [...rs].some(r=>regions[r]) || (!!regions.world&&(world||rs.size===0));}
function regionVerdict(job,regions){const {rs,world,anySignal}=regionSet(job);return [...rs].some(r=>regions[r])||world&&regions.world?'ok':anySignal?'bad':'neutral';}
function placeMatch(job,place){
 const reg={greece:'greece',europe:'europe',uk:'europe','united kingdom':'europe'};
 if(place==='greece'||place==='europe')return regionSet(job).rs.has(reg[place]);
 return phrase(job.location,place)||(place==='uk'&&/united kingdom|england|scotland|london|hampshire/i.test(job.location));
}
function excludeHit(text,term){if(phrase(text,term))return true;return /^(yachts?|tankers?|vessels?|ships?)$/.test(term)&&phrase(text,term.endsWith('s')?term.slice(0,-1):term+'s');}
function roleFit(job,c){
 const title=norm(job.title);const body=title+' '+job.desc;const intent=parseIntent(c);
 if(!MARINE_DOMAIN.test(body))return {ok:false,reason:'No maritime context'};
 if(/hotel|hospital|data centre|data center|software|building services|construction superintendent/.test(title) && !/cruise|vessel|ship|marine/.test(title))return {ok:false,reason:'Non-maritime role'};
 if(intent.excludes.some(t=>excludeHit(title,t)||(['lng','lpg','yacht','yachts','cruise','tanker','tankers'].includes(t)&&excludeHit(body,t))))return {ok:false,reason:'Excluded by your instructions'};
 if(/\b(junior|jnr|assistant|trainee|cadet|intern|graduate|apprentice)\b/.test(title)&& !c.roles.some(r=>/junior|jnr|assistant|trainee|cadet|intern|graduate/.test(r)&&phrase(title,r)))return {ok:false,reason:'Below requested seniority'};
 const sea=/\b(?:staff\s+)?chief\s+engineer\b/.test(title);
 const shore=/superintendent|superintended|vessel manager|technical manager|technical director|fleet (?:technical )?manager|port engineer|head of technical/.test(title);
 const explicit=c.roles.some(r=>phrase(title,r));
 const specialised=/marine superintendent|vetting superintendent|cargo superintendent|qhs|hseq|hsqe|electrical|electrician|automation|\beto\b|port captain|crew superintendent/i.test(title)&&!explicit;
 if(!c.related&&specialised)return {ok:false,reason:'Specialist / deck / compliance track (related roles disabled)'};
 const related=/\b(?:second|2nd|first) engineer\b|\bmarine engineer\b|\bpms engineer\b|technical officer/.test(title);
 if((sea&&!intent.sea)||(shore&&!intent.shore))return {ok:false,reason:'Outside selected sea / shore track'};
 if(!sea&&!shore&&!explicit&&!(c.related&&related))return {ok:false,reason:'Outside requested engineering roles'};
 if(!sea&&!shore&&!intent.sea&&!intent.shore)return {ok:false,reason:'No career track selected'};
 if(intent.onlyPlace&&!placeMatch(job,intent.onlyPlace))return {ok:false,reason:'Outside prompt location restriction'};
 if(!matchLocation(job,c.regions))return {ok:false,reason:'Outside selected regions'};
 if(job.validThrough&&Date.parse(job.validThrough)<Date.now())return {ok:false,reason:'Advert past closing date'};
 const age=(Date.now()-Date.parse(job.date))/86400000;
 if(c.maxAge&&Number.isFinite(age)&&age>c.maxAge)return {ok:false,reason:'Older than selected date limit'};
 return {ok:true,track:shore?'Shore-based':sea?'Sea-going':'Related role',related:(!shore&&!sea)||specialised};
}
function durationCheck(jd,cv,title=''){ 
 let req=jd.match(/(?:minimum(?: of)?|at least|require[ds]?|must have|essential)[^.\n]{0,35}?(\d+)\s*\+?\s*years?[^.\n]{0,65}?(chief engineer|technical superintendent|superintendent)/i)
  ||jd.match(/(\d+)\s*\+?\s*years?[^.\n]{0,40}?(chief engineer|technical superintendent|superintendent)[^.\n]{0,20}?(?:required|essential)/i);
 if(!req){const generic=jd.match(/(?:min(?:imum)?(?: of)?|at least)?\s*(\d+)\s*(?:[–—-]\s*\d+)?\s*\+?\s*years?[^.\n]{0,100}(?:similar (?:role|position)|relevant.{0,12}experience|shore[ -]based|in the office|in this rank)/i);if(generic){req=[generic[0],generic[1],/superintendent/i.test(title)?'superintendent':/chief engineer/i.test(title)?'chief engineer':'relevant role'];}}
 if(!req)return null;
 const need=Number(req[1]),role=req[2].toLowerCase();let proven=0;
 for(const line of String(cv).split(/\n/)){
  if(!line.toLowerCase().includes(role))continue;
  const direct=line.match(/(\d+)\s*\+?\s*years?/i);if(direct)proven=Math.max(proven,Number(direct[1]));
  const range=line.match(/\b((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2})\b/);if(range)proven=Math.max(proven,Number(range[2])-Number(range[1])-1);
 }
 return {confirmed:proven>=need,message:proven>=need?'Experience duration appears supported; confirm exact sea service with recruiter.':'Not verified: '+need+' years as '+role+' required. Date ranges and service records need review.'};
}
function localScore(job,c){
 const fit=roleFit(job,c), jd=job.title+'\n'+job.desc;
 const cvFacts=evidence(c.cv), jdFacts=evidence(jd), cvSet=new Set(cvFacts.map(f=>f.name));
 const degreeAlternative=cvSet.has('Chief Engineer CoC (III/2)')&&/(?:degree[^.\n]{0,100}\bor\b[^.\n]{0,70}(?:class\s*1|certificate of competency|coc)|(?:class\s*1|coc)[^.\n]{0,70}\bor\b[^.\n]{0,100}degree)/i.test(jd);
 if(degreeAlternative){const i=jdFacts.findIndex(f=>f.kind==='education');if(i>=0)jdFacts.splice(i,1);}
 const matched=jdFacts.filter(f=>cvSet.has(f.name)), missing=jdFacts.filter(f=>!cvSet.has(f.name));
 const gaps=[];const flags=[];
 const sentences=jd.split(/[\n.!?]+/).map(s=>s.trim()).filter(Boolean);
 const required=missing.filter(f=>{const rule=SKILL_RULES.find(r=>r[0]===f.name);return sentences.some(s=>rule[1].test(s)&&/\b(?:must|required|essential|mandatory|minimum|need to|at least)\b/i.test(s)&&!/not required|not essential|preferred|advantage|desirable/i.test(s));});
 const vesselMissing=missing.filter(f=>f.kind==='vessel'&&SKILL_RULES.find(r=>r[0]===f.name)[1].test(job.title));
 for(const f of required)gaps.push('Required in advert; not evidenced in CV: '+f.name);
 for(const f of vesselMissing)if(!required.includes(f))gaps.push('Vessel experience to verify: '+f.name);
 if(!c.cv.trim())gaps.push('No CV provided');
 if(!job.salary||!/[\d]/.test(job.salary))gaps.push('Salary amount not disclosed');
 if(!job.date)gaps.push('Posting date unavailable');
 if(regionVerdict(job,c.regions)==='neutral')gaps.push('Location unconfirmed');
 if(/work(?:ing)? rights|work authori[sz]ation|no sponsorship|citizenship|green card|right to work/i.test(jd))gaps.push('Work eligibility must be checked; CV location is not proof');
 for(const s of sentences){if(/\b\d+\s*\+?\s*years?\b/i.test(s)&&/experience|chief|superintendent/i.test(s)){gaps.push('Check experience duration: '+s.slice(0,180));break;}}
 if(/master mariner|chief officer|deck officer|deck background/i.test(jd)&&!/chief engineer|engineer.*coc/i.test(job.desc))gaps.push('May require a deck / Master qualification rather than engineering');
 const thin=job.desc.length<450 || job.detailStatus==='summary'||job.descriptionCoverage==='Listing summary only';
 if(thin||jdFacts.length<3)gaps.push('Limited technical evidence: confirm full requirements on source');
 for(const term of ['application fee','registration fee','pay to apply','send money','processing fee'])if(phrase(jd,term))flags.push('Check fee language: '+term);
 if(!safeUrl(job.url))flags.push('Missing valid source link');
 const A=fit.ok?(fit.related?3.2:4.7):1;
 const den=jdFacts.reduce((n,f)=>n+f.weight,0), hit=matched.reduce((n,f)=>n+f.weight,0);
 const B=!c.cv.trim()?1:den?Math.min(4.8,1.4+3.4*hit/den):2.2;
 const seniorCV=/chief engineer|superintendent|technical manager/i.test(c.cv);
 const C=seniorCV?4:2.5;
 const intent=parseIntent(c),preferred=intent.preferPlace&&placeMatch(job,intent.preferPlace);
 const terms=splitList(c.keywords||'');const requestedHits=terms.filter(t=>phrase(c.cv,t)&&phrase(jd,t));
 const D=Math.min(4.6,(regionVerdict(job,c.regions)==='ok'?3.4:2.5)+(/[\d]/.test(job.salary||'')?0.4:0)+(preferred?0.8:0));
 const E=job.company?3:2;
 const F=thin?2:3.5;
 let total=weightedTotal({A,B,C,D,E,F},c.weights);
 if(requestedHits.length)total+=Math.min(.12,requestedHits.length*.02);
 const educationMissing=missing.filter(f=>f.kind==='education');
 for(const f of educationMissing)gaps.push('Education listed in advert, not evidenced in CV: '+f.name+'; check CoC alternatives.');
 if(educationMissing.length)total=Math.min(total,3.8);
 const duration=durationCheck(jd,c.cv,job.title);
 if(duration)gaps.push(duration.message);
 if(duration&&!duration.confirmed)total=Math.min(total,3.8);
 const deckGap=gaps.some(g=>g.startsWith('May require a deck'));if(deckGap)total=Math.min(total,3.1);
 if(gaps.some(g=>g.startsWith('Work eligibility')))total=Math.min(total,3.9);
 if(!fit.ok)total=Math.min(total,2);
 if(thin||jdFacts.length<3)total=Math.min(total,3.3);
 if(required.length||vesselMissing.length)total=Math.min(total,3.6);
 if(!c.cv.trim())total=Math.min(total,2.5);
 total=Math.round(total*100)/100;
 if(job.detailStatus==='digest'){total=Math.min(total,4.3);gaps.push('Published advert digest: verify full requirements and qualification alternatives on the source website.');}
 const confidence=thin||jdFacts.length<3?'Low':job.detailStatus==='digest'||required.length||vesselMissing.length||educationMissing.length||(duration&&!duration.confirmed)||gaps.some(g=>g.startsWith('Work eligibility'))?'Moderate':'Good';
 const G=flags.length?'FLAG':'REVIEW';
 const score={A:{score:A,why:fit.ok?'Title fits '+fit.track+'.':fit.reason}, B:{score:Math.round(B*10)/10,why:matched.length?'CV evidence: '+matched.map(f=>f.name).join(', '):'No explicit CV evidence matched the detected requirements.'},C:{score:C,why:seniorCV?'Senior title present in CV; duration and rank must still be checked.':'Senior experience not clearly evidenced in CV.'},D:{score:D,why:'Location uses the listing field only. Undisclosed pay is not assumed competitive.'},E:{score:E,why:'A named recruiter is not proof of employer quality or job legitimacy.'},F:{score:F,why:thin?'Insufficient detail for a confident assessment.':'Description available for interview preparation; not proof of readiness.'},G:{verdict:G,flags},total,verdict:flags.length?'CAUTION':total>=4?'PRIORITY REVIEW':total>=3?'POSSIBLE MATCH':'LOW FIT',summary:(fit.track||'Out of scope')+' · '+matched.length+' CV evidence matches · '+confidence.toLowerCase()+' evidence confidence. This is a rules-based estimate, not a hiring decision.',strengths:[...(preferred?['Matches your preferred location: '+intent.preferPlace]:[]),...matched.map(f=>'CV and advert both mention '+f.name)],gaps,confidence,ai:false,cv:null};
 return score;
}
function weightedTotal(s,w){let sum=0,weight=0;for(const k of ['A','B','C','D','E','F']){const n=Number(typeof s[k]==='object'?s[k].score:s[k]);const wt=Math.max(0,Number(w[k])||0);if(Number.isFinite(n)){sum+=n*wt;weight+=wt;}}return weight?Math.round(sum/weight*100)/100:1;}
function focusKeywords(){
 const intent=parseIntent(ctx());const out=[];
 if(intent.sea)out.push('chief engineer');if(intent.shore)out.push('technical superintendent','superintendent engineer');if(state.related)out.push('second engineer','marine engineer');
 for(const r of splitList(state.targetRoles))if(r.length>4&&!out.includes(r))out.push(r);
 return out.slice(0,6);
}
function ctx(){return {cv:state.cv||'',roles:splitList(state.targetRoles),prefs:state.prefs||'',regions:state.regions,focus:state.focus,weights:state.weights,keywords:state.keywords||'',exclude:state.exclude||'',related:!!state.related,maxAge:Number(state.maxAge)||0};}
function extractFeaturesFromCV(text){const facts=evidence(text);return {roles:ROLE_PRIORITY.filter(r=>phrase(text,r)),skills:facts.filter(f=>f.kind!=='certificate').map(f=>f.name),certs:facts.filter(f=>f.kind==='certificate').map(f=>f.name),greek:false};}
function suggestFromCV(quiet){
 if((state.cv||'').trim().length<40){if(!quiet)toast('Import or paste your CV first.','err');return;}
 const f=extractFeaturesFromCV(state.cv);
 // Current career goals must not be overwritten with historical CV job titles.
 state.keywords=f.skills.concat(f.certs).join(', ');store.set('keywords',state.keywords);$('#keywords').value=state.keywords;
 $('#cvDetect').innerHTML='<b>Evidence extracted</b><br>'+esc([...f.certs,...f.skills].join(' · ')||'No supported technical terms found. Review your extracted CV text.')+'<br><span class="help">Your target roles and preferred countries were preserved.</span>';
 renderPlan();if(!quiet)toast('CV evidence updated. Your career goals are unchanged.','ok');
}
function safeUrl(u){try{const x=new URL(u);return ['http:','https:'].includes(x.protocol)?x.href:'';}catch(e){return '';}}
function normJob(o){const str=k=>String(o[k]||'');return {id:str('id')||str('url'),title:str('title')||'(untitled)',company:str('company'),location:str('location'),url:safeUrl(o.url),desc:str('desc'),source:str('source'),date:str('date'),salary:str('salary'),type:str('type'),extra:str('extra'),validThrough:str('validThrough'),detailStatus:str('detailStatus'),fetchedAt:str('fetchedAt')||nowISO(),detailError:str('detailError'),descriptionCoverage:str('descriptionCoverage')};}
function dedup(jobs){const seen=new Set();return jobs.filter(j=>{let key=safeUrl(j.url);if(key){const u=new URL(key);for(const k of [...u.searchParams.keys()])if(/^utm_|fbclid|gclid/.test(k))u.searchParams.delete(k);u.hash='';key=u.href.replace(/\/$/,'');}else key=norm(j.title+'|'+j.company+'|'+j.location);if(seen.has(key))return false;seen.add(key);return true;});}
function tailorCV(job,score,c){const matched=evidence(job.title+' '+job.desc).filter(f=>evidence(c.cv).some(x=>x.name===f.name)).map(f=>f.name);return {headline:'Application: '+job.title,summary:matched.length?'My CV includes '+matched.join(', ')+'. I would welcome a discussion about how this experience relates to the position.':'Review your original CV against the requirements before adding a tailored summary.',ats:matched};}
function parseContact(cv){const lines=String(cv||'').split(/\n/).map(s=>s.trim()).filter(Boolean);const line=lines.find(l=>l.length<65&&!/curriculum|résumé|resume|engineer|superintendent|@|\d|contact|profile/i.test(l)&&/^\p{L}[\p{L} .'-]+$/u.test(l)&&l.includes(' '));return {name:line||'',email:(String(cv).match(/[\w.+-]+@[\w-]+\.[\w.-]+/)||[])[0]||'',phone:''};}
function localCover(job,score,c){const p=parseContact(c.cv),skills=tailorCV(job,score,c).ats.slice(0,6);return [p.name||'[Your name]',p.email,todayLong(),'Dear Hiring Team,','Re: '+job.title,'I am writing to apply for the '+job.title+' position'+(job.company?' advertised by '+job.company:'')+'.',skills.length?'My CV includes '+skills.join(', ')+'. I would welcome the opportunity to discuss how this experience relates to the responsibilities in your advert.':'Please find my CV for your review. I would welcome an opportunity to discuss the experience relevant to this position.','The scope of this role interests me, and I would appreciate further information about your technical priorities and expectations. My attached CV provides the details of my employment and qualifications.','Thank you for considering my application. I would be pleased to discuss the position and confirm availability, qualifications and any eligibility requirements.','Yours sincerely,',p.name||'[Your name]'].filter(Boolean).join('\n\n');}
let scanAbort=null;let lastScan=store.get('lastScan',null);
const SCAN_LIMITS={total:60000,fetchPhase:50000,source:35000,request:30000,aiRequest:12000,aiPhase:18000};
function within(promise,ms,signal,label='Request'){
 return new Promise((resolve,reject)=>{
  let timer;const finish=(fn,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);fn(value);};
  const abort=()=>finish(reject,new DOMException('Stopped','AbortError'));
  timer=setTimeout(()=>finish(reject,new DOMException(label+' timed out','TimeoutError')),Math.max(1,ms));
  Promise.resolve(promise).then(v=>finish(resolve,v),e=>finish(reject,e));
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 });
}
async function fetchTimeout(url,opt={},ms=25000){
 const controller=new AbortController(),parent=opt.signal||scanAbort?.signal;
 const abort=()=>controller.abort();parent?.addEventListener('abort',abort,{once:true});
 if(parent?.aborted){parent.removeEventListener('abort',abort);throw new DOMException('Stopped','AbortError');}
 try{
  // Timeout covers headers AND the response body. Previously it ended as soon as headers arrived.
  return await within((async()=>{
   const r=await fetch(url,{...opt,signal:controller.signal,cache:'no-store'});
   const body=await r.arrayBuffer();
   if(body.byteLength>8*1024*1024)throw new Error('Response exceeds 8 MB limit');
   return new Response([204,205,304].includes(r.status)?null:body,{status:r.status,statusText:r.statusText,headers:r.headers});
  })(),ms,parent,'Network request');
 }finally{controller.abort();parent?.removeEventListener('abort',abort);}
}
async function fetchText(url,ms){return fetchViaProxy(url,ms);}
async function fetchViaProxy(url,ms){const r=await fetchTimeout('/proxy?url='+encodeURIComponent(url),{},ms||30000);if(!r.ok)throw new Error('Source request failed (HTTP '+r.status+'). Run with the MarinePath server.');return r.text();}
async function srcFaststream(kws,per){
 const result=await Promise.allSettled(kws.slice(0,6).map(q=>fetchJson('https://www.faststream.com/api/v1/jobs?per_page='+Math.min(per,100)+'&query='+encodeURIComponent(q),30000)));
 const success=result.filter(r=>r.status==='fulfilled');if(!success.length)throw new Error('Faststream API unavailable');
 const jobs=success.flatMap(r=>(r.value.jobs||[]).map(j=>normJob({id:'fs-'+j.id,title:j.job_title||j.title,company:'Faststream (recruiter)',location:j.job_location,url:j.cached_slug?'https://www.faststream.com/job/'+j.cached_slug:'',desc:stripHtml(j.description||j.clean_description||j.job_description||''),source:'faststream',date:j.start_date,salary:j.salary_free||'',type:j.job_type,validThrough:j.end_date,detailStatus:'full'})));
 const unique=dedup(jobs);if(result.some(r=>r.status==='rejected'))unique.warning='Some role queries failed; partial coverage';return unique;
}
async function srcCareernet(kws,per){return connected('careernet',per);}
async function connected(source,per){const r=await fetchTimeout('/api/jobs?source='+source+'&limit='+per,{},SCAN_LIMITS.source);const d=await r.json();if(!r.ok)throw new Error(d.error||'Connection unavailable');const jobs=d.jobs.map(normJob);jobs.warning=(d.warnings||[]).join('; ');jobs.coverage=d.coverage;jobs.discovered=d.discovered;jobs.cached=d.cached;return jobs;}
function briefKey(){const data=JSON.stringify(ctx());let h=2166136261;for(let i=0;i<data.length;i++)h=Math.imul(h^data.charCodeAt(i),16777619);return (h>>>0).toString(16);}
async function scoreJob(job,c){const local=localScore(job,c);if(!state.ai.enabled)return local;try{const ai=await aiScore(job,c);ai.total=Math.min(ai.total,local.total);ai.gaps=[...new Set([...local.gaps,...ai.gaps])];ai.G=local.G.verdict==='FLAG'?local.G:{verdict:ai.G.verdict==='FLAG'?'FLAG':'REVIEW',flags:[...new Set([...local.G.flags,...ai.G.flags])]};ai.confidence=local.confidence;ai.verdict=ai.G.verdict==='FLAG'?'CAUTION':ai.total>=4?'PRIORITY REVIEW':'POSSIBLE MATCH';return ai;}catch(e){toast('AI unavailable; retained local evidence score.','err');return local;}}
// Static-site search: all personal matching stays in this browser.
let publishedSnapshot=null;
function embeddedSnapshot(){try{return JSON.parse(document.getElementById('marinepathData').textContent);}catch{return null;}}
function validSnapshot(d){return !!d&&d.schemaVersion===1&&d.sources&&typeof d.sources==='object'&&Object.values(d.sources).every(s=>Array.isArray(s.jobs)&&s.jobs.length<=1000);}
async function loadPublishedSnapshot(signal){
 let data=embeddedSnapshot(),offline=false;
 if(/^https?:$/.test(location.protocol)){
  try{const response=await fetchTimeout(new URL('./data/jobs.json',location.href).href+'?v='+Date.now(),{signal},8000);if(!response.ok)throw Error('HTTP '+response.status);const fresh=await response.json();if(!validSnapshot(fresh))throw Error('Invalid job snapshot');data=fresh;}
  catch(e){if(signal?.aborted)throw e;offline=true;if(!validSnapshot(data))throw Error('Published job data is unavailable. Please try again later.');}
 }
 if(!validSnapshot(data))throw Error('No valid published snapshot. Open the hosted website or download the complete release.');
 return {data,offline};
}
function showSnapshotInfo(data,offline=false){
 const el=$('#snapshotInfo');if(!el)return;let age=0;const times=Object.values(data.sources).map(s=>Date.parse(s.lastSuccessAt)).filter(Number.isFinite);if(times.length)age=(Date.now()-Math.min(...times))/3600000;
 const generated=Date.parse(data.generatedAt);const label=Number.isFinite(generated)?new Date(generated).toLocaleString():'unknown';
 el.innerHTML='<b>Published job snapshot</b> · '+esc(label)+'<br><span class="help">Updates scheduled every 6 hours. Searching matches this snapshot locally; it does not trigger a new scrape.'+(offline?' Network unavailable: using the snapshot bundled with this page.':'')+(age>24?' Some source data is more than 24 hours old. Check the source-health report.':'')+'</span>';
 if(age>24||offline)el.classList.add('snapshot-warning');else el.classList.remove('snapshot-warning');
}
async function runScan(){
 if(running)return;
 if((state.cv||'').trim().length<40){toast('Import or paste your CV first.','err');$('#cv').focus();return;}
 const sources=state.sources.filter(s=>s.on);if(!sources.length){toast('Select at least one source in Connections.','err');return;}
 if(!Object.values(state.regions).some(Boolean)||!Object.values(state.focus).some(Boolean)){toast('Select a career track and at least one region.','err');return;}
 // Snapshot matching deliberately never uploads the CV or invokes external AI.
 running=true;const control=new AbortController();scanAbort=control;const started=Date.now();let timer;
 $('#btnScan').disabled=true;$('#btnStop').disabled=false;$('#progressWrap').style.display='block';setProgress(5);log('Loading the published job snapshot…');
 try{
  timer=setTimeout(()=>control.abort(),15000);
  const {data,offline}=await loadPublishedSnapshot(control.signal);publishedSnapshot=data;showSnapshotInfo(data,offline);setProgress(30);
  const c=structuredClone(ctx()),reports=[],all=[];
  for(const source of sources){const record=data.sources[source.id];const age=record?.lastSuccessAt?(Date.now()-Date.parse(record.lastSuccessAt))/3600000:Infinity;
   if(!record||age>72||!Number.isFinite(age)){reports.push({id:source.id,count:0,status:'Unavailable',warning:'No successful update in the last 72 hours. Open the source website or run the data-update workflow.'});continue;}
   const jobs=record.jobs.map(normJob);all.push(...jobs);reports.push({id:source.id,count:jobs.length,status:record.status==='Cached'?'Cached':record.status==='Partial'?'Partial':'Snapshot',warning:[...(record.warnings||[]),'Source updated '+new Date(record.lastSuccessAt).toLocaleString()+(age>24?' · older than 24 hours':'')].join(' · '),cached:record.status==='Cached'});
  }
  if(control.signal.aborted)throw new DOMException('Stopped','AbortError');
  if(!reports.some(r=>r.status!=='Unavailable'))throw Error('All published sources are unavailable or older than 72 hours. Previous results kept. Use Connections to open the original sites or update the GitHub workflow.');
  const unique=dedup(all),rejected={};const filtered=unique.filter(j=>{const verdict=roleFit(j,c);if(!verdict.ok)rejected[verdict.reason]=(rejected[verdict.reason]||0)+1;return verdict.ok;});
  log('Matching '+filtered.length+' in-scope adverts to your CV…');const scored=[];
  for(let i=0;i<filtered.length;i++){
   if(control.signal.aborted)throw new DOMException('Stopped','AbortError');
   scored.push({job:filtered[i],score:localScore(filtered[i],c)});
   if(i%12===0){setProgress(30+65*i/Math.max(1,filtered.length));await new Promise(r=>setTimeout(r,0));}
  }
  scored.sort((a,b)=>b.score.total-a.score.total);state.results=scored;store.set('results',scored);
  lastScan={time:nowISO(),briefKey:briefKey(),status:'Complete',sources:reports,raw:unique.length,kept:scored.length,rejected,aiFailed:0,snapshotAt:data.generatedAt,offline,elapsedSeconds:Math.max(.1,Math.round((Date.now()-started)/100)/10)};
  log('Complete in '+lastScan.elapsedSeconds+'s · '+scored.length+' in-scope jobs · matched against the published snapshot.');setProgress(100);store.set('lastScan',lastScan);renderPipeline();switchTab('pipeline');toast(scored.length+' in-scope matches. Review the digest and original advert.','ok');
 }catch(e){log(e.name==='AbortError'?'Stopped — previous results kept.':e.message);toast(e.name==='AbortError'?'Search stopped; previous results kept.':e.message,'err');}
 finally{clearTimeout(timer);control.abort();if(scanAbort===control)scanAbort=null;running=false;$('#btnScan').disabled=false;$('#btnStop').disabled=true;renderHealth();}
}

function renderPlan(){
 const el=$('#searchPlan');if(!el)return;const c=ctx(),intent=parseIntent(c),facts=evidence(c.cv);
 el.innerHTML='<div class="eyebrow">YOUR SEARCH BRIEF</div><h3>'+(!intent.sea?'Shore-based opportunities':!intent.shore?'Sea-going opportunities':'Sea & shore opportunities')+'</h3><p>'+esc(focusKeywords().join(' · '))+'</p><div class="plan-facts">'+(facts.length?facts.slice(0,12).map(f=>'<span class="pill">'+esc(f.name)+'</span>').join(''):'<span class="help">Add your CV to identify technical evidence.</span>')+'</div><p class="help">'+esc((intent.onlyPlace?'Prompt location restriction: '+intent.onlyPlace+'. ':'')+(intent.preferPlace?'Preferred: '+intent.preferPlace+'. ':'')+(intent.excludes.length?'Exclude: '+intent.excludes.join(', ')+'. ':'')+(c.related?'Related engineering roles included. ':'Exact senior tracks only. '))+'</p><div class="hint">Rules-based interpretation, not an AI understanding of every sentence. Check the brief. Use “Greece only”, “shore only” or “Avoid: yachts, LNG” for supported constraints. Region chips and exclusions are enforced.</div>';
}
function renderHealth(){
 const html=lastScan?'<div class="scan-head"><b>'+esc(lastScan.status)+'</b><span>'+new Date(lastScan.time).toLocaleString()+'</span></div><div class="health-grid">'+lastScan.sources.map(s=>'<div class="health-item"><b>'+esc(state.sources.find(x=>x.id===s.id)?.name||s.id)+'</b><span class="'+(['Failed','Timed out','Not completed'].includes(s.status)?'error':'')+'">'+esc(s.status)+' · '+s.count+' fetched'+(s.cached?' · previous successful snapshot':'')+'</span>'+(s.warning?'<small>'+esc(s.warning)+'</small>':'')+'</div>').join('')+'</div>'+(lastScan.status==='Complete'?'<p class="help">'+lastScan.raw+' unique listings → '+lastScan.kept+' in-scope. '+esc(Object.entries(lastScan.rejected||{}).map(([k,v])=>v+' '+k.toLowerCase()).join(' · '))+'. Listings without dates remain visible with a warning.'+(lastScan.aiFailed?' '+lastScan.aiFailed+' AI requests failed; local scores retained.':'')+'</p>':''):'<p class="help">No scan yet. Each connection will show its own status here; a failed request is never reported as “no jobs”.</p>';
 for(const id of ['connectionHealth','scanReport','scanLiveHealth']){const el=$('#'+id);if(el)el.innerHTML=html;}
}
function renderPipeline(){
 const results=state.results||[];const stale=$('#resultsStale');if(stale){stale.hidden=!(results.length&&lastScan?.briefKey&&lastScan.briefKey!==briefKey());}let list=results.slice();const top=$('#onlyTop').checked,sort=$('#sortBy').value;
 const text=norm($('#resultSearch')?.value||'');if(text)list=list.filter(x=>norm(x.job.title+' '+x.job.company+' '+x.job.location).includes(text));if(top)list=list.filter(x=>x.score.total>=4);
 list.sort(sort==='date'?(a,b)=>(Date.parse(b.job.date)||0)-(Date.parse(a.job.date)||0):sort==='source'?(a,b)=>a.job.source.localeCompare(b.job.source):(a,b)=>b.score.total-a.score.total);
 $('#statBar').innerHTML=[['IN SCOPE',results.length],['PRIORITY REVIEW',results.filter(x=>x.score.total>=4).length],['CHECK REQUIREMENTS',results.filter(x=>x.score.total<4).length]].map(([l,n])=>'<div class="box"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');
 $('#results').innerHTML=list.length?list.map(jobCard).join(''):'<div class="empty"><h3>'+(results.length?'No results match this view':'No in-scope jobs yet')+'</h3><p>'+(results.length?'Clear the text filter or turn off priority-only.':'Import your CV and run a search. If a scan is complete, review connection failures and excluded-job counts before widening your criteria.')+'</p><button class="btn" onclick="switchTab(\'search\')">Edit search brief</button></div>';
 $$('#results [data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));renderHealth();
}
function jobCard(x){const j=x.job,s=x.score;const strengths=(s.strengths||[]).slice(0,3);const gaps=(s.gaps||[]).slice(0,3);const saved=state.tracker.some(t=>t.id===j.id);return '<article class="job"><div class="job-heading"><div><div class="eyebrow">'+esc(j.source)+' · '+esc(j.location||'Location unconfirmed')+'</div><h3><button class="title-button" data-detail="'+esc(j.id)+'">'+esc(j.title)+'</button></h3><div class="meta">'+esc(j.company)+' · '+(j.date?esc(ago(j.date)):'Date not supplied')+(j.salary?' · '+esc(j.salary):'')+'</div></div><div class="match-number"><b>'+Number(s.total).toFixed(1)+'</b><span>/ 5 estimated fit</span></div></div><div class="evidence-grid"><div><b class="evidence-label">WHY IT MAY FIT</b><p>'+esc(strengths.join(' · ')||'Not enough matching CV evidence yet.')+'</p></div><div><b class="evidence-label">CHECK BEFORE APPLYING</b><p>'+esc(gaps.join(' · ')||'Confirm availability and qualifications with the recruiter.')+'</p></div></div><div class="job-bottom"><span class="badge">'+esc(s.verdict)+'</span><span class="help">'+esc(s.confidence||'Unrated')+' evidence · '+(s.ai?'AI assisted':'local rules')+'</span><div class="spacer"></div><button class="btn small ghost" data-detail="'+esc(j.id)+'">Review match</button><button class="btn small" data-save="'+esc(j.id)+'" '+(saved?'disabled':'')+'>'+(saved?'Saved':'Save job')+'</button>'+(safeUrl(j.url)?'<a class="btn small primary" href="'+esc(safeUrl(j.url))+'" target="_blank" rel="noopener noreferrer">View listing ↗</a>':'')+'</div></article>';}
function exportAll(){const exported={...state,ai:{...state.ai,key:''},schemaVersion:2};download('marinepath-backup.json',JSON.stringify(exported,null,2),'application/json');}
function importAll(file){const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Not a backup object');for(const k of ['cv','prefs','targetRoles','keywords','exclude'])if(k in d&&typeof d[k]!=='string')throw Error('Invalid '+k);for(const k of ['results','tracker'])if(k in d&&!Array.isArray(d[k]))throw Error('Invalid '+k);if(d.results?.some(x=>!x.job||!x.score||!Number.isFinite(x.score.total)||!['A','B','C','D','E','F'].every(k=>x.score[k])||!x.score.G))throw Error('Invalid result');if(d.tracker?.some(x=>!x.id||!Number.isFinite(x.score)||!STATUSES.includes(x.status)))throw Error('Invalid tracker');if(d.sources&&!Array.isArray(d.sources))throw Error('Invalid sources');if(d.weights&&(!['A','B','C','D','E','F'].every(k=>Number.isFinite(d.weights[k])&&d.weights[k]>=0&&d.weights[k]<=100)))throw Error('Invalid weights');if(d.perSource!=null&&(!Number.isFinite(Number(d.perSource))||Number(d.perSource)<5||Number(d.perSource)>100))throw Error('Invalid fetch depth');if(d.maxAge!=null&&![0,30,60,90].includes(Number(d.maxAge)))throw Error('Invalid posting age');for(const k of ['cv','prefs','targetRoles','keywords','exclude','results','tracker'])if(k in d)state[k]=d[k];state.results=state.results.map(x=>({...x,job:normJob(x.job)}));state.tracker=state.tracker.map(x=>({...x,url:safeUrl(x.url)}));for(const k of ['regions','focus'])if(d[k]&&typeof d[k]==='object')for(const p in state[k])if(typeof d[k][p]==='boolean')state[k][p]=d[k][p];if(d.sources)for(const s of state.sources){const other=d.sources.find?.(x=>x.id===s.id);if(typeof other?.on==='boolean')s.on=other.on;}if(d.weights)state.weights={...d.weights};if(d.perSource!=null)state.perSource=Number(d.perSource);if(typeof d.related==='boolean')state.related=d.related;if(d.maxAge!=null)state.maxAge=Number(d.maxAge);if(typeof d.customUrl==='string')state.customUrl=safeUrl(d.customUrl);saveAll();for(const k of ['exclude','related','maxAge'])store.set(k,state[k]);lastScan={time:nowISO(),status:'Imported backup — run a fresh scan',sources:[],briefKey:'imported'};store.set('lastScan',lastScan);syncAll();$('#exclude').value=state.exclude||'';$('#related').checked=state.related;$('#maxAge').value=state.maxAge;renderPlan();updateConnectionCount();toast('CV, results and tracker restored. API keys are never imported.','ok');}catch(e){toast('Import failed: '+e.message,'err');}};reader.readAsText(file);}

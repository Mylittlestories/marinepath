// Scheduled Node.js data backend. No CV, token, or user preferences enter this process.
import {load} from 'cheerio';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SOURCES=['faststream','spinnaker','careernet','seacareer','marpro','navis'];
const BASE={faststream:'https://www.faststream.com',spinnaker:'https://spinnaker-global.com',careernet:'https://www.careernet.gr',seacareer:'https://www.seacareer.com',marpro:'https://careers.marpro-group.com',navis:'https://navis-consulting.com'};
const ROLE=/chief\s+engineer|superintendent|vessel\s+manager|fleet\s+(?:technical\s+)?manager|technical\s+(?:manager|director)|port\s+engineer|second\s+engineer|2nd\s+engineer|marine\s+engineer|pms\s+engineer/i;
const TTL=72*3600*1000;
export const clean=value=>load(String(value??'')).text().replace(/\s+/g,' ').trim();
const https=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:'';}catch{return '';}};
export async function request(url,signal,options={}){
 const parsed=new URL(url);if(!Object.values(BASE).some(base=>new URL(base).hostname===parsed.hostname)&&!parsed.hostname.endsWith('.github.io'))throw Error('Source host not allowed');
 const guard=AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(10000)]);
 const r=await fetch(url,{...options,signal:guard,headers:{'User-Agent':'MarinePath/3.0 public-job-digest (+https://github.com/Mylittlestories/marinepath)',...options.headers}});
 if(!r.ok)throw Error('HTTP '+r.status);
 const reader=r.body.getReader();let size=0,chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>6_000_000)throw Error('Response too large');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks).toString('utf8');
}
const id=url=>createHash('sha256').update(url).digest('hex').slice(0,16);
const job=(source,title,url,other={})=>({id:source+'-'+id(url),source,title:clean(title),url:https(url),company:source,location:'',desc:'',date:'',salary:'',type:'',validThrough:'',detailStatus:'summary',fetchedAt:new Date().toISOString(),...other});
const unique=jobs=>[...new Map(jobs.filter(j=>j.url&&j.title).map(j=>[j.url,j])).values()];
async function pages(url,source,signal){const html=await request(url,signal);return load(html);}
function walk(x,out){if(!x||typeof x!=='object')return;if(x['@type']==='JobPosting'||Array.isArray(x['@type'])&&x['@type'].includes('JobPosting'))out.push(x);for(const v of Object.values(x))if(v&&typeof v==='object')walk(v,out);}
export function parseStructured($){const out=[];$('script[type="application/ld+json"]').each((_,el)=>{let raw=$(el).html()||'';try{walk(JSON.parse(raw),out);}catch{ // Some public adverts embed literal control characters in JSON strings.
 let quoted=false,escaped=false;raw=raw.replace(/[\s\S]/g,c=>{if(c==='"'&&!escaped)quoted=!quoted;const result=quoted&&c.charCodeAt(0)<32?'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'):c;escaped=c==='\\'&&!escaped;return result;});try{walk(JSON.parse(raw),out);}catch{}}
 });return out[0]||null;}
async function enrich(j,signal){
 try{const $=await pages(j.url,j.source,signal),x=parseStructured($);
  if(x){j.desc=clean(x.description)||j.desc;j.date=x.datePosted||j.date;j.validThrough=x.validThrough||'';j.company=clean(x.hiringOrganization?.name)||j.company;
   const locs=Array.isArray(x.jobLocation)?x.jobLocation:[x.jobLocation];const ls=locs.map(l=>{const a=l?.address;if(typeof a==='string')return a;return [...new Set(['addressLocality','addressRegion','addressCountry'].flatMap(k=>{const v=a?.[k];return String(typeof v==='object'?v?.name||'':v||'').split(',').map(t=>t.trim()).filter(Boolean);}))].join(', ');}).filter(Boolean);if(ls.length)j.location=ls.join(' / ');
   j.type=Array.isArray(x.employmentType)?x.employmentType.join(', '):x.employmentType||'';j.detailStatus='full';
  }else if(j.source==='navis'){const section=$('#content section.main-content');if(section.length){j.desc=clean(section.html());j.detailStatus='full';}}
  if(j.source==='seacareer'&&!j.location&&/chief engineer/i.test(j.title))j.location='At sea / location not specified';
 }catch(e){j.detailError=String(e.message).slice(0,120);}return j;
}
async function mapLimit(list,n,fn){const out=[];let next=0;await Promise.all(Array.from({length:n},async()=>{while(next<list.length){const i=next++;out[i]=await fn(list[i],i);}}));return out;}
async function fetchSource(source){
 const signal=AbortSignal.timeout(55000);const jobs=[],warnings=[];let fetchedPages=0;
 const get=async u=>{if(signal.aborted)throw Error('Source time budget reached');const $=await pages(u,source,signal);fetchedPages++;return $;};
 const attempt=async fn=>{try{await fn();}catch(e){warnings.push(String(e.message).slice(0,140));}};
 if(source==='faststream'){
  for(const q of ['chief engineer','technical superintendent','superintendent engineer','technical manager'])await attempt(async()=>{const d=JSON.parse(await request(BASE[source]+'/api/v1/jobs?per_page=100&query='+encodeURIComponent(q),signal));fetchedPages++;for(const j of d.jobs||[])jobs.push(job(source,j.job_title||j.title,BASE[source]+'/job/'+j.cached_slug,{company:'Faststream (recruiter)',location:j.job_location||'',desc:clean(j.description||j.clean_description||j.job_description),date:j.start_date||'',validThrough:j.end_date||'',salary:j.salary_free||'',type:j.job_type||'',detailStatus:'full'}));});
 }else if(source==='spinnaker'){
  await attempt(async()=>{const d=JSON.parse(await request(BASE[source]+'/wp-json/wp/v2/job?per_page=100&page=1',signal));fetchedPages++;for(const j of d){const title=clean(j.title?.rendered),parts=title.split(/\s+[–—-]\s+/);jobs.push(job(source,title,j.link,{company:'Spinnaker Global (recruiter)',location:parts.length>1?parts.at(-1):'',desc:clean(j.content?.rendered),date:j.date||'',detailStatus:'full'}));}});
 }else if(source==='careernet'){
  for(const term of ['superintendent','chief engineer','technical manager'])for(let p=1;p<=3&&!signal.aborted;p++)await attempt(async()=>{const $=await get(BASE[source]+'/aggelies/naftilia?keywords='+encodeURIComponent(term)+'&page='+p);$('article').each((_,el)=>{const row=$(el),h=row.find('h2.aggelia-title'),a=h.closest('a');if(a.length)jobs.push(job(source,h.text(),new URL(a.attr('href'),BASE[source]).href,{company:clean(row.find('.meta-title').text()),location:clean(row.find('.meta-location').text()),desc:clean(row.find('.par-block p').text())}));});});
 }else if(source==='seacareer'){
  for(const p of ['/chief-engineer-jobs/','/chief-engineer-jobs/2/','/chief-engineer-jobs/3/','/chief-engineer-jobs/4/','/training-technical-project-superintendent-jobs/'])await attempt(async()=>{const $=await get(BASE[source]+p);$('li h2 a').each((_,el)=>{const a=$(el),row=a.closest('li');let date='';const raw=clean(row.find('.summary').text()).split(' - ')[0];if(Number.isFinite(Date.parse(raw)))date=new Date(raw).toISOString();jobs.push(job(source,a.text(),new URL(a.attr('href'),BASE[source]).href,{company:row.find('img').attr('alt')||'Sea Career',desc:clean(row.find('p:not(.summary)').text()),date}));});});
 }else if(source==='marpro'){
  for(let p=1;p<=3;p++)await attempt(async()=>{const $=await get(BASE[source]+(p===1?'/jobs':'/jobs/show_more?page='+p));$('a[href*="/jobs/"]').each((_,el)=>{const a=$(el),t=a.find('[title]').first();if(t.length&&/\/jobs\/\d+/.test(a.attr('href')))jobs.push(job(source,t.attr('title'),new URL(a.attr('href'),BASE[source]).href,{company:'MARPRO (recruiter)',location:clean(a.find('.text-md span').eq(2).text())}));});});
 }else if(source==='navis'){
  const parse=$=>{$('.listing-item-content').each((_,el)=>{const row=$(el),a=row.find('h3 a');if(a.length)jobs.push(job(source,a.text(),a.attr('href'),{company:'Navis Consulting (recruiter)',location:clean(row.find('p').first().text())}));});};
  await attempt(async()=>{const $=await get(BASE[source]+'/jobs');parse($);const form={};$('#filter-bar input[type=hidden]').each((_,el)=>{form[$(el).attr('name')]=$(el).val()||'';});for(const term of ['chief engineer','superintendent','technical manager'])for(let p=1;p<=2&&!signal.aborted;p++){try{const d=JSON.parse(await request(BASE[source]+'/wp-admin/admin-ajax.php',signal,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...form,'job-title':term,paged:String(p)}).toString()}));parse(load(d.html||''));fetchedPages++;if(String(d.load_more)!=='true')break;}catch(e){warnings.push(e.message);break;}}});
 }
 const all=unique(jobs);if(!fetchedPages||!all.length)throw Error(warnings.join('; ')||'No listing markup detected');
 const relevant=all.filter(j=>ROLE.test(j.title)).slice(0,80);
 if(!['faststream','spinnaker'].includes(source))await mapLimit(relevant,4,async(j,i)=>{relevant[i]=await enrich({...j},signal);});
 const errors=relevant.filter(j=>j.detailError).length;if(errors)warnings.push(errors+' full descriptions unavailable');
 return {jobs:relevant,discovered:all.length,warnings:[...new Set(warnings)],status:warnings.length?'Partial':'Connected',lastSuccessAt:new Date().toISOString()};
}
// Publish a bounded excerpt and factual signals, not a full mirror of recruitment websites.
export function digest(j,rules){
 const full=String(j.desc||'');const sentences=full.split(/(?<=[.!?])\s+|\n/).filter(Boolean);
 const terms=rules.filter(r=>r[1].test(j.title+' '+full)).map(r=>{const essential=sentences.some(s=>r[1].test(s)&&/\b(required|essential|mandatory|must|minimum)\b/i.test(s)&&!/preferred|advantage|not required|not essential/i.test(s));const label=r[0]==='Engineering degree'?'Marine engineering degree':r[0];return (essential?'Required (detected, verify): ':'Advert term: ')+label;});
 const flags=[];if(/degree[^.\n]{0,100}\bor\b[^.\n]{0,70}(?:class\s*1|certificate of competency|coc)/i.test(full))flags.push('Degree OR Class 1 CoC qualification alternatives are listed; verify acceptance on the source.');if(/work(?:ing)? rights|work authori[sz]ation|no sponsorship|citizenship|green card|right to work/i.test(full))flags.push('Work authorization / citizenship conditions: verify on original advert.');
 if(/master mariner|chief officer|deck officer/i.test(full))flags.push('Deck / Master qualification mentioned: verify on original advert.');
 const duration=full.match(/\b(\d+)\s*(?:[–-]\s*\d+)?\s*\+?\s*years?[^.\n]{0,80}(?:experience|chief engineer|superintendent|shore[ -]based|similar role)/i);if(duration)flags.push('Experience-duration signal: '+clean(duration[0]).slice(0,180));
 const excerpt=full.slice(0,320).replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[contact on source]');
 return {...j,desc:[excerpt,terms.join('. '),flags.join('\n'),'Public advert digest. Check the original listing for complete requirements and alternatives.'].filter(Boolean).join('\n'),detailStatus:'digest',descriptionCoverage:j.detailStatus==='full'?'Extracted from full advert':'Listing summary only',excerpt,signals:terms,fetchedAt:new Date().toISOString()};
}
export async function collect(){
 let previous={sources:{}};try{previous=JSON.parse(await fs.readFile(path.join(ROOT,'data/jobs.json'),'utf8'));}catch{}
 const previousURL=process.env.PREVIOUS_SNAPSHOT_URL;
 if(previousURL){try{previous=JSON.parse(await request(previousURL,AbortSignal.timeout(6000)));}catch{}}
 const code=await fs.readFile(path.join(ROOT,'src/engine.js'),'utf8');const rules=vm.runInNewContext(code.slice(0,code.indexOf('const MARINE_DOMAIN'))+';SKILL_RULES');
 const result={schemaVersion:1,appVersion:'3.0.0',generatedAt:new Date().toISOString(),refreshHours:6,sources:{}};
 await mapLimit(SOURCES,3,async source=>{const attemptAt=new Date().toISOString();try{const d=await fetchSource(source);result.sources[source]={...d,jobs:d.jobs.map(j=>digest(j,rules)),lastAttemptAt:attemptAt};}catch(e){const old=previous.sources?.[source];const reusable=old&&Date.now()-Date.parse(old.lastSuccessAt)<TTL;result.sources[source]={jobs:reusable?old.jobs:[],discovered:0,lastSuccessAt:reusable?old.lastSuccessAt:null,lastAttemptAt:attemptAt,status:reusable?'Cached':'Failed',warnings:[String(e.message).slice(0,250),...(reusable?['Last successful snapshot retained; not refreshed this run']:[])]};}console.log(source,result.sources[source].status,result.sources[source].jobs.length);});
 const valid=SOURCES.some(s=>['Connected','Partial'].includes(result.sources[s].status));
 await fs.mkdir(path.join(ROOT,'data'),{recursive:true});await fs.writeFile(path.join(ROOT,'data/jobs.json'),JSON.stringify(result,null,2)+'\n');
 console.log('Snapshot',result.generatedAt,Object.values(result.sources).reduce((n,s)=>n+s.jobs.length,0),'job digests');
 // All-source failures are visible in both the site and Actions logs, while retained data remains usable.
 if(!valid)console.warn('WARNING: no live source completed; site will show failures/stale cache.');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await collect();

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

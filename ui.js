'use strict';
const TransferStats=(()=>{
function bytes(n){if(!Number.isFinite(n)||n<0)return '—';if(n<1000)return Math.round(n)+' B';const units=['KB','MB','GB','TB'];let x=n/1000,i=0;while(x>=1000&&i<units.length-1){x/=1000;i++}return (x<10?x.toFixed(1):Math.round(x))+' '+units[i]}
function duration(s){if(!Number.isFinite(s)||s<0)return 'estimating…';const n=Math.ceil(s);if(n<60)return n+'s';if(n<3600)return Math.floor(n/60)+'m '+String(n%60).padStart(2,'0')+'s';return Math.floor(n/3600)+'h '+Math.floor(n%3600/60)+'m'}
function details({received=0,totalBytes=null,elapsedMs=0,remainingSeconds=null,estimated=false,scope='',detail='' }={}){
 const known=Number.isFinite(totalBytes)&&totalBytes>0&&totalBytes>=received,rate=elapsedMs>=500&&received>0?received/(elapsedMs/1000):null;
 const eta=Number.isFinite(remainingSeconds)&&remainingSeconds>=0?remainingSeconds:known&&rate?(totalBytes-received)/rate:null;
 const approx=estimated?'~':'',prefix=scope?scope+' ':'';
 return [detail,approx+bytes(received)+(known?' / '+approx+bytes(totalBytes):'')+' received',rate?approx+bytes(rate)+'/s':'Measuring speed…',prefix+'ETA '+(eta===null?'estimating…':'~'+duration(eta))].filter(Boolean).join(' · ')
}
function guideMetrics(x,size){
 // For opaque responses use observed readable-image mean, or the midpoint
 // of the existing size estimate. Explicitly mark mixed/opaque totals as estimates.
 const mean=x.measuredFiles?x.measuredBytes/x.measuredFiles:size===160?19000:70000;
 const received=x.measuredBytes+x.opaqueFiles*mean,remaining=Math.max(0,x.total-x.done);
 return {received,totalBytes:received+remaining*mean,elapsedMs:x.elapsedMs,remainingSeconds:x.downloaded>0?remaining*x.elapsedMs/1000/x.downloaded:null,estimated:x.opaqueFiles>0,detail:x.done+' / '+x.total+' photos'+(x.failed?' · '+x.failed+' failed':'')+(x.error?' · '+x.error:'')}
}
return {bytes,duration,details,guideMetrics}
})();
if(typeof module!=='undefined')module.exports=TransferStats;
const UI=typeof document==='undefined'?null:(()=>{
const by=id=>document.getElementById(id), log=[],dock=by('activityDock'),home=dock.parentNode,next=dock.nextSibling;let pauseAction=null,pausePending=false;
function report(message,done,total,detail){pauseAction=null;pausePending=false;by('pauseProgress').hidden=true;by('pauseProgress').textContent='Pause';by('activityDock').hidden=false;by('dismissProgress').hidden=!(Number.isFinite(done)&&Number.isFinite(total)&&done>=total);by('activity').textContent=message;const p=by('progress');if(Number.isFinite(done)&&Number.isFinite(total)&&total>0)p.value=Math.min(100,100*done/total);else p.removeAttribute('value');by('progressDetail').textContent=detail||''}
function download(message,done,total,metrics,pause=null){const pending=!!pause&&pause===pauseAction&&pausePending;report(message,done,total,TransferStats.details(metrics));by('dismissProgress').hidden=true;pauseAction=pause;pausePending=pending;by('pauseProgress').hidden=!pause;by('pauseProgress').disabled=pending;by('pauseProgress').textContent=pending?'Pausing…':'Pause'}
function finish(message,done,total,detail=''){report(message,done,total,detail);by('dismissProgress').hidden=false}
function mount(dialog){if(dock.parentNode!==dialog)dialog.append(dock);dock.classList.add('modalActivityDock')}
function unmount(dialog){if(dock.parentNode!==dialog)return;home.insertBefore(dock,next);dock.classList.remove('modalActivityDock')}
by('pauseProgress').onclick=()=>{if(!pauseAction||pausePending)return;pausePending=true;by('pauseProgress').disabled=true;by('pauseProgress').textContent='Pausing…';pauseAction()};
function note(message){log.push(new Date().toISOString()+' '+message);if(log.length>100)log.shift();by('log').textContent=log.join('\n')}
function fail(e){const msg=e?.message||String(e);report('Error: '+msg,0,100,'See activity log for details.');by('dismissProgress').hidden=false;note('ERROR '+msg);return msg}
window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
by('copyLog').onclick=async()=>{const s='Hoot '+document.querySelector('header .top small').textContent+'\n'+navigator.userAgent+'\n'+log.join('\n');try{await navigator.clipboard.writeText(s);by('copyLog').textContent='Copied'}catch{prompt('Copy diagnostics',s)}};
by('dismissProgress').onclick=()=>by('activityDock').hidden=true;function resetLog(){log.length=0;by('log').textContent=''}return {report,download,finish,mount,unmount,note,fail,resetLog};
})();
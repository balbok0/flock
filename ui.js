'use strict';
const UI=(()=>{
const by=id=>document.getElementById(id), log=[];
function report(message,done,total,detail){by('activityDock').hidden=false;by('dismissProgress').hidden=!(Number.isFinite(done)&&Number.isFinite(total)&&done>=total);by('activity').textContent=message;const p=by('progress');if(Number.isFinite(done)&&Number.isFinite(total)&&total>0)p.value=Math.min(100,100*done/total);else p.removeAttribute('value');by('progressDetail').textContent=detail||''}
function note(message){log.push(new Date().toISOString()+' '+message);if(log.length>100)log.shift();by('log').textContent=log.join('\n')}
function fail(e){const msg=e?.message||String(e);report('Error: '+msg,0,100,'See activity log for details.');by('dismissProgress').hidden=false;note('ERROR '+msg);return msg}
window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
by('copyLog').onclick=async()=>{const s='Flock v0.14\n'+navigator.userAgent+'\n'+log.join('\n');try{await navigator.clipboard.writeText(s);by('copyLog').textContent='Copied'}catch{prompt('Copy diagnostics',s)}};
by('dismissProgress').onclick=()=>by('activityDock').hidden=true;return {report,note,fail};
})();
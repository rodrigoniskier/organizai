const $ = s => document.querySelector(s);
let dirHandle = null;
let analysis = [];
let lastMoves = [];
let rules = JSON.parse(localStorage.getItem('od_rules') || '[]');
let history = JSON.parse(localStorage.getItem('od_history') || '[]');

const defaults = [
  { exts:['pdf'], folder:'Documentos/PDFs', category:'PDF' },
  { exts:['doc','docx','odt','rtf','txt'], folder:'Documentos/Textos', category:'Texto' },
  { exts:['xls','xlsx','csv','ods'], folder:'Documentos/Planilhas', category:'Planilha' },
  { exts:['ppt','pptx','odp'], folder:'Documentos/Apresentações', category:'Apresentação' },
  { exts:['jpg','jpeg','png','webp','gif','heic','svg'], folder:'Imagens', category:'Imagem' },
  { exts:['mp4','mov','avi','mkv','webm'], folder:'Vídeos', category:'Vídeo' },
  { exts:['mp3','wav','m4a','aac','ogg','flac'], folder:'Áudio', category:'Áudio' },
  { exts:['zip','rar','7z','tar','gz'], folder:'Compactados', category:'Compactado' },
  { exts:['exe','msi','dmg','deb','apk','crx'], folder:'Instaladores', category:'Instalador' }
];

const keywordRules = [
  { words:['unipe','medicina','simulado','pti','enamed'], folder:'UNIPÊ', category:'UNIPÊ' },
  { words:['sermao','sermão','ebd','teologia','westminster','igreja','salmo'], folder:'Teologia', category:'Teologia' },
  { words:['artigo','paper','pesquisa','conic','referencia','referência'], folder:'Pesquisa', category:'Pesquisa' }
];

function saveState(){
  localStorage.setItem('od_rules', JSON.stringify(rules));
  localStorage.setItem('od_history', JSON.stringify(history.slice(0,100)));
  renderRules(); renderHistory();
}
function extOf(name){ return (name.split('.').pop() || '').toLowerCase(); }
function classify(name){
  const lower = name.toLowerCase(), ext = extOf(name);
  for(const r of rules){
    if((r.contains && lower.includes(r.contains.toLowerCase())) || (r.ext && ext === r.ext.toLowerCase().replace('.',''))){
      return {category:'Regra pessoal', folder:r.folder, confidence:'Alta'};
    }
  }
  for(const k of keywordRules){
    if(k.words.some(w => lower.includes(w))) return {category:k.category, folder:k.folder, confidence:'Alta'};
  }
  for(const d of defaults){
    if(d.exts.includes(ext)) return {category:d.category, folder:d.folder, confidence:'Média'};
  }
  return {category:'Outros', folder:'Outros', confidence:'Baixa'};
}
async function verifyPermission(handle, readWrite=true){
  const opts = readWrite ? {mode:'readwrite'} : {};
  if((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}
async function getSavedHandle(){ return await idbGet('downloadsHandle'); }
async function saveHandle(handle){ await idbSet('downloadsHandle', handle); }

function idbOpen(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open('OrganizaDownloadsDB',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('kv');
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
}
async function idbSet(k,v){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function idbGet(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction('kv');const q=tx.objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}

async function chooseFolder(){
  if(!window.showDirectoryPicker){
    alert('Seu navegador não oferece a API necessária. Use uma versão recente do Chrome no ChromeOS.');
    return;
  }
  try{
    dirHandle = await window.showDirectoryPicker({mode:'readwrite'});
    if(!(await verifyPermission(dirHandle))) return;
    await saveHandle(dirHandle);
    $('#folderName').textContent = dirHandle.name;
    $('#analyze').disabled = false;
  }catch(e){ if(e.name!=='AbortError') alert(e.message); }
}

async function analyze(){
  if(!dirHandle || !(await verifyPermission(dirHandle))) return alert('Autorize novamente o acesso à pasta.');
  analysis=[];
  const hours=Number($('#ignoreRecent').value);
  const cutoff=Date.now()-hours*3600*1000;
  for await (const [name,handle] of dirHandle.entries()){
    if(handle.kind!=='file') continue;
    const file=await handle.getFile();
    if(hours>0 && file.lastModified>cutoff) continue;
    const c=classify(name);
    analysis.push({name, handle, ...c});
  }
  renderAnalysis();
}

function renderAnalysis(){
  $('#countLoose').textContent=analysis.length;
  $('#countClassified').textContent=analysis.filter(x=>x.confidence!=='Baixa').length;
  $('#countReview').textContent=analysis.filter(x=>x.confidence==='Baixa').length;
  $('#organize').disabled=analysis.length===0;
  const body=$('#reviewBody'); body.innerHTML='';
  if(!analysis.length){body.innerHTML='<tr><td colspan="5" class="empty">Nenhum arquivo elegível encontrado.</td></tr>';return;}
  analysis.forEach((x,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.category)}</td>
      <td><input data-i="${i}" class="dest" value="${escapeAttr(x.folder)}"></td>
      <td><span class="badge ${x.confidence==='Alta'?'high':x.confidence==='Média'?'medium':'low'}">${x.confidence}</span></td>
      <td><button class="secondary remember" data-i="${i}">Lembrar correção</button></td>`;
    body.appendChild(tr);
  });
  document.querySelectorAll('.dest').forEach(el=>el.oninput=e=>analysis[Number(e.target.dataset.i)].folder=e.target.value.trim());
  document.querySelectorAll('.remember').forEach(el=>el.onclick=e=>rememberCorrection(Number(e.target.dataset.i)));
}

function rememberCorrection(i){
  const item=analysis[i];
  if(!item.folder) return alert('Defina um destino primeiro.');
  const stem=item.name.replace(/\.[^.]+$/,'').split(/[\s_-]+/).find(p=>p.length>=4) || '';
  rules.unshift({contains:stem, ext:'', folder:item.folder});
  saveState(); alert(`Regra salva usando “${stem}” no nome.`);
}

async function ensureSubfolder(path){
  const parts=path.split('/').map(x=>x.trim()).filter(Boolean);
  let current=dirHandle;
  for(const part of parts) current=await current.getDirectoryHandle(part,{create:$('#createFolders').checked});
  return current;
}
async function existsIn(dir,name){
  try{ await dir.getFileHandle(name); return true; }catch{return false;}
}
async function copyFile(sourceHandle,targetDir,targetName){
  const file=await sourceHandle.getFile();
  const target=await targetDir.getFileHandle(targetName,{create:true});
  const writable=await target.createWritable();
  await writable.write(file); await writable.close();
}
async function uniqueName(dir,name){
  if(!(await existsIn(dir,name))) return name;
  const dot=name.lastIndexOf('.'), base=dot>0?name.slice(0,dot):name, ext=dot>0?name.slice(dot):'';
  let n=2; while(await existsIn(dir,`${base} (${n})${ext}`)) n++;
  return `${base} (${n})${ext}`;
}

async function organize(){
  if(!confirm(`Mover ${analysis.length} arquivo(s) conforme a revisão?`)) return;
  lastMoves=[];
  for(const item of analysis){
    if(!item.folder) continue;
    try{
      const targetDir=await ensureSubfolder(item.folder);
      let targetName=item.name;
      if(await existsIn(targetDir,targetName)){
        if($('#protectOverwrite').checked) targetName=await uniqueName(targetDir,targetName);
      }
      await copyFile(item.handle,targetDir,targetName);
      await dirHandle.removeEntry(item.name);
      lastMoves.push({from:item.name,toFolder:item.folder,toName:targetName});
    }catch(e){
      history.unshift({when:new Date().toLocaleString(),text:`Falha: ${item.name} — ${e.message}`});
    }
  }
  history.unshift({when:new Date().toLocaleString(),text:`Organizados ${lastMoves.length} arquivo(s).`});
  saveState();
  $('#lastRun').textContent=new Date().toLocaleString();
  $('#undo').disabled=lastMoves.length===0;
  await analyze();
  alert(`Concluído: ${lastMoves.length} arquivo(s) organizados.`);
}

async function undo(){
  if(!lastMoves.length) return;
  if(!confirm('Desfazer a última organização?')) return;
  let ok=0;
  for(const m of [...lastMoves].reverse()){
    try{
      const folder=await ensureSubfolder(m.toFolder);
      const src=await folder.getFileHandle(m.toName);
      let backName=m.from;
      if(await existsIn(dirHandle,backName)) backName=await uniqueName(dirHandle,backName);
      await copyFile(src,dirHandle,backName);
      await folder.removeEntry(m.toName);
      ok++;
    }catch(e){ history.unshift({when:new Date().toLocaleString(),text:`Falha ao desfazer ${m.toName}: ${e.message}`}); }
  }
  history.unshift({when:new Date().toLocaleString(),text:`Desfeita organização de ${ok} arquivo(s).`});
  lastMoves=[]; $('#undo').disabled=true; saveState(); await analyze();
}

function renderRules(){
  const wrap=$('#rules'); wrap.innerHTML=rules.length?'':'<div class="muted">Nenhuma regra personalizada.</div>';
  rules.forEach((r,i)=>{
    const div=document.createElement('div'); div.className='rule';
    div.innerHTML=`<div><strong>${escapeHtml(r.folder)}</strong><div class="muted">${r.contains?'nome contém: '+escapeHtml(r.contains):''}${r.ext?' extensão: '+escapeHtml(r.ext):''}</div></div><button class="secondary" data-i="${i}">Excluir</button>`;
    div.querySelector('button').onclick=()=>{rules.splice(i,1);saveState()};
    wrap.appendChild(div);
  });
}
function renderHistory(){
  const wrap=$('#history'); wrap.innerHTML=history.length?'':'<div class="muted">Nenhuma execução registrada.</div>';
  history.forEach(h=>{const d=document.createElement('div');d.className='hist';d.innerHTML=`<span>${escapeHtml(h.text)}</span><span class="muted">${escapeHtml(h.when)}</span>`;wrap.appendChild(d)});
}
function escapeHtml(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(s=''){return escapeHtml(s)}

$('#chooseFolder').onclick=chooseFolder;
$('#analyze').onclick=analyze;
$('#organize').onclick=organize;
$('#undo').onclick=undo;
$('#addRule').onclick=()=>$('#ruleDialog').showModal();
$('#saveRule').onclick=e=>{
  const contains=$('#ruleContains').value.trim(), ext=$('#ruleExt').value.trim(), folder=$('#ruleFolder').value.trim();
  if(!folder){e.preventDefault();return}
  rules.unshift({contains,ext,folder}); saveState();
  $('#ruleContains').value=$('#ruleExt').value=$('#ruleFolder').value='';
};

(async()=>{
  renderRules(); renderHistory();
  try{
    const saved=await getSavedHandle();
    if(saved){
      dirHandle=saved; $('#folderName').textContent=saved.name;
      $('#analyze').disabled=false;
    }
  }catch{}
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();

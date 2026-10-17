#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),Template=path.resolve(__dirname,'../assets/template');
const defaults={schemaVersion:1,name:'Projekt',promptContext:'',port:0,maxScreenshotBytes:12582912,maxBodyBytes:2097152,maxNotesLength:20000,saveDelayMs:350};
function args(argv){const result={command:argv[0]||'open'};for(let i=1;i<argv.length;i++){if(!argv[i].startsWith('--'))throw Error('Expected --option');const key=argv[i].slice(2);result[key]=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}return result;}
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8')),atomic=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',text,'utf8');fs.renameSync(file+'.tmp',file);};
const empty=()=>({entries:{},custom:[],edits:{},archived:[]});
function config(root){const file=path.join(root,'review.config.json');if(fs.existsSync(file))return {...defaults,...readJson(file)};const legacy=readJson(path.join(root,'config.json')).review;const prompt=fs.existsSync(path.join(root,'DATA/review-next-prompt.md'))?fs.readFileSync(path.join(root,'DATA/review-next-prompt.md'),'utf8'):'';return {...defaults,...legacy,name:path.basename(root),promptContext:(prompt.match(/Pregled:.*\r?\n([\s\S]*?)\r?\nPopravki in nove zahteve:/)||[])[1]?.trim()||''};}
function copyMissing(from,to){fs.mkdirSync(to,{recursive:true});for(const entry of fs.readdirSync(from,{withFileTypes:true})){const a=path.join(from,entry.name),b=path.join(to,entry.name);if(entry.isDirectory())copyMissing(a,b);else if(!fs.existsSync(b))fs.copyFileSync(a,b);}}
function ensure(root,options){
 const cfg=path.join(root,'review.config.json'),index=path.join(root,'review/index.html');
 if(fs.existsSync(index)&&!fs.existsSync(cfg)){const old=path.join(root,'scripts/review-server.js'),oldCfg=path.join(root,'config.json');if(fs.existsSync(old)&&fs.existsSync(oldCfg)&&readJson(oldCfg).review)return {legacy:true};throw Error('An existing custom review page was found. Inspect/adopt it without overwriting it.');}
 copyMissing(Template,root);if(!fs.existsSync(cfg))atomic(cfg,JSON.stringify({...defaults,name:options.name||path.basename(root),...(options.port?{port:Number(options.port)}:{})},null,2));
 const state=path.join(root,'DATA/review.json');if(!fs.existsSync(state))atomic(state,JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),state:empty()},null,2));return {legacy:false};
}
function catalog(root){const groups=readJson(path.join(root,'review/features.json')),seen=new Set();if(!Array.isArray(groups))throw Error('Expected an array of feature groups');for(const g of groups){if(typeof g.group!=='string'||!Array.isArray(g.items))throw Error('Invalid feature group');for(const pair of g.items){if(!Array.isArray(pair)||pair.length!==2||!/^[a-z0-9-]{1,100}$/.test(pair[0])||typeof pair[1]!=='string'||!pair[1].trim()||seen.has(pair[0]))throw Error('Invalid or duplicate feature ID');seen.add(pair[0]);}}return groups;}
function state(root){try{return require(path.join(root,'review/model')).validate(readJson(path.join(root,'DATA/review.json')).state,config(root));}catch(e){if(e.code==='ENOENT')return empty();throw e;}}
const flatten=groups=>groups.flatMap(g=>g.items.map(([id,text])=>({id,text,group:g.group})));
function snapshot(root){const s=state(root),base=flatten(catalog(root)),P=require(path.join(Template,'review/prompt')),rows=P.all(base,s).map(f=>({...f,...(s.entries[f.id]||{status:'todo',notes:''}),archived:s.archived.includes(f.id)}));return {project:root,name:config(root).name,features:rows,prompt:P.generate(base,s,config(root),root)};}
function backup(root){const dir=path.join(root,'OUTPUT/review-backups',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(dir,{recursive:true});for(const name of ['DATA/review.json','DATA/review-next-prompt.md','review/features.json'])if(fs.existsSync(path.join(root,name)))fs.copyFileSync(path.join(root,name),path.join(dir,path.basename(name)));return dir;}
function regenerate(root){atomic(path.join(root,'DATA/review-next-prompt.md'),snapshot(root).prompt);}
async function identity(root,url){try{const u=new URL(url);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1')return false;const r=await fetch(url+'/api/identity',{signal:AbortSignal.timeout(1000)});if(!r.ok)return false;const result=await r.json();return path.resolve(result.project)===root;}catch{return false;}}
async function open(root,mode,options){
 const metadata=path.join(root,'DATA/review-server.json');let info;try{info=readJson(metadata);}catch{}if(info&&await identity(root,info.url)){if(!options['no-browser'])browser(info.url);return {...info,reused:true,legacy:mode.legacy};}
 const cfg=config(root),script=path.join(root,'scripts',mode.legacy?'review-server.js':'review-server.cjs'),log=fs.openSync(path.join(root,'DATA/review-server.log'),'a'),child=spawn(process.execPath,mode.legacy?[script,'--no-open']:[script,root,String(options.port||cfg.port)],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log,log],env:{...process.env,...(mode.legacy?{VAP_REVIEW_ROOT:root}:{})}});child.on('error',()=>{});child.unref();fs.closeSync(log);
 const deadline=Date.now()+12000;while(Date.now()<deadline){await new Promise(r=>setTimeout(r,100));try{info=readJson(metadata);}catch{}if(info&&await identity(root,info.url)){if(!options['no-browser'])browser(info.url);return {...info,reused:false,legacy:mode.legacy};}}
 throw Error('The review server did not become ready. Check DATA/review-server.log and review-server-error.txt; a requested port may belong to another project.');
}
function browser(url){const command=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open',child=spawn(command,[url],{detached:true,stdio:'ignore',windowsHide:true});child.on('error',()=>{});child.unref();}
async function run(argv){
 const options=args(argv);if(!options.project)throw Error('Pass --project with the project directory.');const resolved=path.resolve(options.project);fs.mkdirSync(resolved,{recursive:true});const root=fs.realpathSync(resolved),mode=ensure(root,options);
 if(options.command==='open')return open(root,mode,options);
 if(options.command==='init'){regenerate(root);return {project:root,...mode};}
 if(options.command==='read')return snapshot(root);
 if(options.command==='sync'){
  if(!options.features)throw Error('Pass --features catalog.json');const incoming=readJson(path.resolve(options.features)),current=catalog(root),s=state(root),known=new Map(current.flatMap(g=>g.items.map(pair=>[pair[0],pair]))),custom=new Set(s.custom.map(f=>f.id));
  if(!Array.isArray(incoming))throw Error('Expected grouped feature array');const seen=new Set();for(const g of incoming){if(typeof g.group!=='string'||!g.group.trim()||g.group.length>100||!Array.isArray(g.items))throw Error('Invalid group');for(const pair of g.items){if(!Array.isArray(pair)||pair.length!==2||!/^[a-z0-9-]{1,100}$/.test(pair[0])||typeof pair[1]!=='string'||!pair[1].trim()||pair[1].length>config(root).maxNotesLength||seen.has(pair[0]))throw Error('Invalid/duplicate feature');seen.add(pair[0]);}}
  const saved=backup(root);for(const g of incoming){let target=current.find(p=>p.group===g.group);for(const [id,text] of g.items){if(custom.has(id))continue;if(known.has(id)){known.get(id)[1]=text;continue;}if(!target){target={group:g.group,items:[]};current.push(target);}const pair=[id,text];target.items.push(pair);known.set(id,pair);}}
  atomic(path.join(root,'review/features.json'),JSON.stringify(current,null,2));regenerate(root);return {project:root,backup:saved,features:snapshot(root).features.length};
 }
 if(options.command==='reset'){
  const ids=String(options.ids||'').split(',').map(s=>s.trim()).filter(Boolean);if(!ids.length)throw Error('Pass --ids id-one,id-two');const s=state(root),known=new Set(snapshot(root).features.map(f=>f.id));for(const id of ids)if(!known.has(id)||s.archived.includes(id))throw Error('Unknown or archived feature: '+id);const saved=backup(root);for(const id of ids)s.entries[id]={...(s.entries[id]||{notes:''}),status:'todo'};atomic(path.join(root,'DATA/review.json'),JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),state:s},null,2));regenerate(root);return {project:root,reset:ids,backup:saved};
 }
 throw Error('Commands: open, init, read, sync, reset');
}
module.exports={run,snapshot};if(require.main===module)run(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});

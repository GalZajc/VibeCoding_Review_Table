'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const root=fs.realpathSync(process.argv[2]||path.resolve(__dirname,'..')),config=JSON.parse(fs.readFileSync(path.join(root,'review.config.json'),'utf8')),Model=require(path.join(root,'review/model')),Prompt=require(path.join(root,'review/prompt')),host='127.0.0.1',data=path.join(root,'DATA'),stateFile=path.join(data,'review.json'),catalogFile=path.join(root,'review/features.json'),token=crypto.randomBytes(32).toString('hex');let url='',writes=Promise.resolve();fs.mkdirSync(data,{recursive:true});
const empty=()=>({entries:{},custom:[],edits:{},archived:[]});
function read(){try{return Model.validate(JSON.parse(fs.readFileSync(stateFile,'utf8')).state,config);}catch(e){if(e.code==='ENOENT')return empty();throw e;}}
function revision(){const hash=crypto.createHash('sha256');for(const file of [stateFile,catalogFile]){try{hash.update(fs.readFileSync(file));}catch(e){if(e.code!=='ENOENT')throw e;}}return hash.digest('hex');}
function catalog(){return JSON.parse(fs.readFileSync(catalogFile,'utf8')).flatMap(g=>g.items.map(([id,text])=>({id,text,group:g.group})));}
async function atomic(file,value){await fs.promises.writeFile(file+'.tmp',value,'utf8');await fs.promises.rename(file+'.tmp',file);}
function send(res,status,value,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'"});res.end(type.startsWith('application/json')&&!Buffer.isBuffer(value)?JSON.stringify(value):value);}
async function bytes(req,limit){const chunks=[];let count=0;for await(const part of req){count+=part.length;if(count>limit)throw Error('Prevelika vsebina.');chunks.push(part);}return Buffer.concat(chunks);}
const files=new Map([['/',['review/index.html','text/html']],...['app.js','model.js','prompt.js','style.css','features.json','icon.svg'].map(f=>['/review/'+f,['review/'+f,f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'application/json']])]);
const server=http.createServer(async(req,res)=>{try{
 Object.assign(config,JSON.parse(fs.readFileSync(path.join(root,'review.config.json'),'utf8')));
 if(req.headers.host!==new URL(url).host)return send(res,403,{error:'Invalid host'});const pathname=new URL(req.url,url).pathname;
 if(req.method==='GET'&&pathname==='/api/identity')return send(res,200,{project:root,name:config.name});
 if(req.method==='GET'&&pathname==='/api/review')return send(res,200,{state:read(),token,project:root,name:config.name,promptContext:config.promptContext,saveDelayMs:config.saveDelayMs,revision:revision()});
 if(req.method==='GET'&&/^\/screenshots\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(pathname))return send(res,200,await fs.promises.readFile(path.join(data,'review-screenshots',path.basename(pathname))),{'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(pathname)]);
 if(req.method==='POST'&&pathname==='/api/screenshot'){
  if(req.headers.origin!==url||req.headers['x-review-token']!==token)return send(res,403,{error:'Neveljavna seja.'});const image=await bytes(req,config.maxScreenshotBytes),ext=image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':image[0]===255&&image[1]===216&&image[2]===255?'jpg':image.toString('ascii',0,4)==='RIFF'&&image.toString('ascii',8,12)==='WEBP'?'webp':null;if(!ext)throw Error('Izberi PNG, JPEG ali WebP.');const name=crypto.randomBytes(16).toString('hex')+'.'+ext;await fs.promises.mkdir(path.join(data,'review-screenshots'),{recursive:true});await fs.promises.writeFile(path.join(data,'review-screenshots',name),image);return send(res,200,{url:'/screenshots/'+name});
 }
 if(req.method==='POST'&&pathname==='/api/review'){
  if(req.headers.origin!==url||!String(req.headers['content-type']).startsWith('application/json'))return send(res,403,{error:'Invalid origin'});const body=JSON.parse((await bytes(req,config.maxBodyBytes)).toString('utf8'));if(body.token!==token)return send(res,403,{error:'Neveljavna seja. Osveži stran.'});const state=Model.validate(body.state,config);
  const task=writes.catch(()=>{}).then(async()=>{if(body.baseRevision!==revision())return {conflict:true};await atomic(stateFile,JSON.stringify({schemaVersion:1,updatedAt:new Date().toISOString(),state},null,2));await atomic(path.join(data,'review-next-prompt.md'),Prompt.generate(catalog(),state,config,root));return {saved:true,revision:revision()};});writes=task;const result=await task;return send(res,result.conflict?409:200,result.conflict?{error:'Tabela se je medtem spremenila. Shrani svoje opombe v JSON pred osvežitvijo.'}:result);
 }
 if(req.method==='GET'&&files.has(pathname)){const [file,type]=files.get(pathname);return send(res,200,await fs.promises.readFile(path.join(root,file)),type+'; charset=utf-8');}
 send(res,404,{error:'Not found'});
}catch(error){send(res,400,{error:error.message});}});
server.requestTimeout=15000;server.headersTimeout=10000;server.on('error',e=>{fs.writeFileSync(path.join(data,'review-server-error.txt'),e.stack,'utf8');process.exitCode=1;});server.listen(Number(process.argv[3]||config.port||0),host,()=>{url=`http://${host}:${server.address().port}`;fs.writeFileSync(path.join(data,'review-server.json'),JSON.stringify({url,project:root,pid:process.pid},null,2),'utf8');console.log(url);});

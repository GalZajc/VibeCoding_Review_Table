(function(root){
 'use strict';
 function all(base,state){const groups=[...new Set(base.map(f=>f.group))],rank=g=>groups.includes(g)?groups.indexOf(g):groups.length;return [...base,...state.custom.map(f=>({...f,group:f.group||'Dodatne zahteve',custom:true}))].map(f=>({...f,text:state.edits?.[f.id]||f.text})).sort((a,b)=>rank(a.group)-rank(b.group));}
 function generate(base,state,config,project){
  const rows=all(base,state),entry=id=>state.entries[id]||{status:'todo',notes:''},active=rows.filter(f=>!state.archived.includes(f.id)),withStatus=s=>active.filter(f=>entry(f.id).status===s),pass=withStatus('pass'),fail=withStatus('fail'),todo=withStatus('todo'),assumed=withStatus('assumed');
  const lines=[`Popravi projekt ${config.name||'Projekt'} na podlagi mojega sistematičnega pregleda.`,'',`Pregled: ${pass.length} preverjeno deluje, ${fail.length} potrebuje popravek, ${assumed.length} verjetno deluje (nepreverjeno), ${todo.length} še ni preverjeno.`];
  if(config.promptContext?.trim())lines.push(config.promptContext.trim());lines.push('','Popravki in nove zahteve:');if(!fail.length)lines.push('Trenutno ni označenih popravkov. Ne sklepaj, da so nepreverjene funkcije že preverjene.');
  const notes=id=>[...(entry(id).notesHistory||[]),entry(id).notes||''].map((n,i)=>n.trim()?`Opomba ${i+1}: ${n.trim()}`:'').filter(Boolean).join('\n');
  for(const f of fail)lines.push('',`- [${f.id}] ${f.group}: ${f.text}`,`  Moja opomba: ${notes(f.id)||'Opombe še nisem vpisal. Preveri opisano funkcijo; ob nejasnosti vprašaj.'}`);
  for(const [items,title] of [[pass,'Preverjeno delujoče funkcije, ki naj še naprej delujejo:'],[todo,'Še nepreverjeno (to niso prijavljene napake):'],[assumed,'Verjetno deluje, vendar nisem preveril (to niso potrjeni uspehi ali prijavljene napake):']])if(items.length){lines.push('',title);for(const f of items)lines.push(`- [${f.id}] ${f.text}${entry(f.id).status==='assumed'&&notes(f.id)?' — '+notes(f.id):''}`);}
  const sep=project.includes('\\')?'\\':'/';for(const f of active)for(const s of entry(f.id).screenshots||[])lines.push(`Screenshot [${f.id}; ${s.phase==='note'?'Opomba '+(s.note+1):'Osnovna zahteva'}]: ${project.replace(/[\\/]$/,'')}${sep}DATA${sep}review-screenshots${sep}${s.url.split('/').at(-1)} (${s.name})`);
  const archived=rows.filter(f=>state.archived.includes(f.id));if(archived.length){lines.push('','Arhivirane oziroma odstranjene zahteve (niso aktivne; ne vračaj jih brez mojega naročila):');for(const f of archived)lines.push(`- [${f.id}] ${f.group}: ${f.text}`);}
  lines.push('','Ocene in opombe so shranjene v projektni datoteki DATA/review.json. Upoštevaj jih skupaj s prejšnjimi dogovori iz chata.');return lines.join('\n');
 }
 const api={all,generate};if(typeof module!=='undefined')module.exports=api;else root.ReviewPrompt=api;
})(typeof window==='undefined'?globalThis:window);

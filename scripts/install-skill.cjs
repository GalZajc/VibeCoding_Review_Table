#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),source=path.resolve(__dirname,'..'),target=path.resolve(process.argv[2]||path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills','review-table'));
if(target===source||target.startsWith(source+path.sep))throw Error('Choose an installation directory outside this checkout.');
fs.mkdirSync(target,{recursive:true});for(const name of ['SKILL.md','agents','assets','references','scripts'])fs.cpSync(path.join(source,name),path.join(target,name),{recursive:true});console.log(target);

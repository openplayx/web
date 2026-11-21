import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
execFileSync('npm',['run','build'],{cwd:new URL('../../docs/',import.meta.url),stdio:'inherit'});
for(const script of ['build.mjs','assemble-docs.mjs','check.mjs'])execFileSync(process.execPath,['scripts/'+script],{cwd:root,stdio:'inherit'});

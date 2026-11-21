#!/usr/bin/env node
// Regenerate the shared UI kit (web/ui) and copy it into sibling repositories.
//   node scripts/sync-ui.mjs                 regenerate only
//   node scripts/sync-ui.mjs --all           also copy to ../admin/ui and ../openplayx-connector/src/web/ui
//   node scripts/sync-ui.mjs <target-dir>... also copy to the given ui/ directories
import {execFileSync} from 'node:child_process';
import {cpSync,rmSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const web=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(web,'ui');
execFileSync(process.execPath,[resolve(source,'kit.mjs')],{stdio:'inherit'});
const args=process.argv.slice(2);
const targets=args.includes('--all')?[resolve(web,'../admin/ui'),resolve(web,'../openplayx-connector/src/web/ui')]:args.map(arg=>resolve(arg));
for(const target of targets){
  if(!existsSync(dirname(target))){console.error('skip (missing repo): '+target);continue;}
  rmSync(target,{recursive:true,force:true});
  cpSync(source,target,{recursive:true});
  execFileSync(process.execPath,[resolve(target,'kit.mjs'),'--check'],{stdio:'inherit'});
  console.log('synced → '+target);
}

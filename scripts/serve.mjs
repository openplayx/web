import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.json':'application/json' };
const server = createServer(async (request,response) => {
  try {
    const url = new URL(request.url,'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    let path = resolve(root,'.'+pathname);
    if (path !== root && !path.startsWith(root+sep)) {
      response.writeHead(403);response.end('Forbidden');return;
    }
    let status = 200;
    try {
      const info = await stat(path);
      if (info.isDirectory()) {
        if (!pathname.endsWith('/')) { response.writeHead(308,{Location:pathname+'/'+url.search});response.end();return; }
        path=resolve(path,'index.html');
      }
      await stat(path);
    } catch { path=resolve(root,'404.html');status=404; }
    const data=await readFile(path);
    response.writeHead(status,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(request.method==='HEAD'?undefined:data);
  } catch { response.writeHead(400);response.end('Bad request'); }
});
server.listen(port,'127.0.0.1',()=>console.log(`OpenPlayX preview: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));

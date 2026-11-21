import assert from 'node:assert/strict';
export function adminFixture(){
 let fault=null,creates=0;const records=new Map(),items=[],operations=[];
 const configuration={ready:true,missing:[],maxNodes:1,maxMonthly:3.5,release:{tag:'v0.1.1'}};
 const env={API:{async fetch(request){
  assert.equal(new URL(request.url).origin,'https://api.openplayx.com');if(request.headers.get('Cf-Access-Jwt-Assertion')!=='fixture-edge-jwt')return Response.json({error:{code:'admin_login_required'}},{status:401});
  const path=new URL(request.url).pathname.slice('/v1/adminzzz'.length);
  if(path==='/session')return Response.json({actor:{email:'owner@example.com'},configuration});
  if(path==='/providers/vultr/catalog'){
   if(fault==='network')return Response.json({error:{code:'vultr_unreachable'}},{status:503});
   return Response.json({regions:fault==='empty'?[]:[{id:'ewr',name:'New Jersey',country:'US'}],plans:fault==='empty'?[]:[{id:'vc2-1c-0.5gb',monthly:3.5,locations:['ewr'],vcpuCount:1,ram:512,disk:10}],maxNodes:1,maxMonthly:3.5});
  }
  if(path==='/relay/nodes'&&request.method==='POST'){
   assert.equal(request.headers.get('Origin'),'https://api.openplayx.com');const key=request.headers.get('Idempotency-Key');assert.ok(key);const body=await request.json();assert.equal(body.confirmMonthly,3.5);
   if(!records.has(key)){creates++;const node={nodeId:'node_fixture',name:body.name,state:'creating',region:'ewr',regionName:'New Jersey',monthly:3.5,plan:body.plan};items.push(node);const operation={operationId:'operation_fixture',nodeId:node.nodeId,type:'create',status:'pending'};operations.push(operation);records.set(key,{node,operation})}
   return Response.json(records.get(key),{status:202});
  }
  if(path==='/relay/nodes')return Response.json({items,operations,configuration,summary:{total:items.length,ready:0,monthly:items.length*3.5}});
  throw Error('Unexpected mock API request '+path);
 }}};
 return {env,setFault:value=>{fault=value},cloudCreates:()=>creates};
}

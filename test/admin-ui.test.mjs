import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {adminFixture} from './admin-fixture.mjs';
import {adminUIIntegration} from './admin-ui-integration.mjs';
test('Admin DOM through Web service binding: catalog recovery, price policy and idempotent confirmed creation',async()=>{
 const {env,setFault,cloudCreates}=adminFixture();
 await adminUIIntegration({dispatch:(url,init)=>worker.fetch(new Request(url,init),env),token:'fixture-edge-jwt',setFault,cloudCreates});assert.equal(cloudCreates(),1);
});

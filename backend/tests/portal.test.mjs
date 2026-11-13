import assert from 'node:assert/strict';
import { test } from 'node:test';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import app from '../dist/app.js';
import User from '../dist/models/User.js';
import Ticket from '../dist/models/Ticket.js';
import Invitation from '../dist/models/Invitation.js';
import SetupLock from '../dist/models/SetupLock.js';
import RefreshSession from '../dist/models/RefreshSession.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../dist/utils/jwt.js';
import { refreshTokenService, loginUserService } from '../dist/services/auth.service.js';
import { setupAdminService, acceptInviteService, updatePersonService, createInviteService, dashboardService } from '../dist/services/portal.service.js';
import { createTicketService, getTicketByIdService, getTicketService, assignTicketService } from '../dist/services/ticket.service.js';
import { ticketListQuerySchema } from '../dist/validators/ticket.validator.js';

const adminId = '507f1f77bcf86cd799439011';
const agentId = '507f1f77bcf86cd799439012';
const customerId = '507f1f77bcf86cd799439013';
// These checks deliberately use isolated model mocks, never the configured database.
test('role panels and onboarding contracts (mocked database)', async t => {
  process.env.JWT_ACCESS_SECRET = 'isolated-test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'isolated-test-refresh-secret';
  process.env.ADMIN_SETUP_KEY = 'isolated-test-owner-key-at-least-32-characters';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  let role = 'Admin';
  const authentication = t.mock.method(User, 'findById', () => ({select: async () => ({_id:new Types.ObjectId(adminId),name:'Test User',email:'test@example.com',role,isActive:true})}));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method='GET', body, headers={}) => fetch(origin+path,{method,headers:{Authorization:`Bearer ${generateAccessToken({userId:adminId,role})}`,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
  const log = t.mock.method(console, 'error', () => {});
  try {
    await t.test('browser login preflight allows the configured frontend and credentials',async()=>{
      const response=await fetch(origin+'/api/auth/login',{method:'OPTIONS',headers:{Origin:process.env.FRONTEND_URL,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
      assert.equal(response.status,204);
      assert.equal(response.headers.get('access-control-allow-origin'),process.env.FRONTEND_URL);
      assert.equal(response.headers.get('access-control-allow-credentials'),'true');
    });
    await t.test('cross-origin state changes are rejected before handlers',async()=>{
      assert.equal((await request('/api/auth/logout','POST',{}, {Origin:'https://untrusted.example'})).status,403);
    });
    await t.test('anonymous users cannot enter the workspace',async()=>{
      assert.equal((await fetch(origin+'/api/workspace/people')).status,401);
    });
    await t.test('customer and agent cannot list people, agents, or invitations',async()=>{
      for(const value of ['Customer','SupportAgent']){
        role=value;
        for(const path of ['/api/workspace/people','/api/workspace/agents','/api/workspace/invitations'])assert.equal((await request(path)).status,403);
        assert.equal((await request('/api/workspace/invitations','POST',{name:'New Person',email:'new@example.com',role:'Admin'})).status,403);
      }
      role='Admin';
    });
    await t.test('public registration rejects a submitted privileged role',async()=>{
      assert.equal((await request('/api/auth/register','POST',{name:'New Person',email:'new@example.com',password:'test-password-123',role:'Admin'})).status,400);
    });
    await t.test('support portal rejects customer credentials before creating a refresh session',async st=>{
      const password=await bcrypt.hash('test-password-123',4);
      st.mock.method(User,'findOne',()=>({select:async()=>({_id:customerId,name:'Customer',email:'customer@example.com',role:'Customer',isActive:true,password})}));
      const sessions=st.mock.method(RefreshSession,'create',async()=>({}));
      await assert.rejects(loginUserService({email:'customer@example.com',password:'test-password-123',portalRole:'SupportAgent'}),error=>error.statusCode===403&&error.message.includes('Customer access'));
      assert.equal(sessions.mock.callCount(),0);
    });
    await t.test('support portal returns the support role for a real support account',async st=>{
      const password=await bcrypt.hash('test-password-123',4);
      st.mock.method(User,'findOne',()=>({select:async()=>({_id:new Types.ObjectId(agentId),name:'Agent',email:'agent@example.com',role:'SupportAgent',isActive:true,password})}));
      st.mock.method(RefreshSession,'create',async()=>({}));
      const result=await loginUserService({email:'agent@example.com',password:'test-password-123',portalRole:'SupportAgent'});
      assert.equal(result.user.role,'SupportAgent');
    });
    await t.test('setup rejects an incorrect owner key without taking the lock',async st=>{
      const lock=st.mock.method(SetupLock,'create',async()=>{throw new Error('should not reach storage');});
      await assert.rejects(setupAdminService({name:'Owner',email:'owner@example.com',password:'test-password-123',setupKey:'incorrect-key-with-at-least-32-characters'}),err=>err.statusCode===403);
      assert.equal(lock.mock.callCount(),0);
    });
    await t.test('setup serializes concurrent requests and hashes the admin password',async st=>{
      let locked=false;
      st.mock.method(SetupLock,'create',async()=>{if(locked)throw Object.assign(new Error('duplicate lock'),{code:11000});locked=true;});
      st.mock.method(User,'exists',async()=>null);
      st.mock.method(User,'findOne',()=>({select:async()=>null}));
      st.mock.method(User,'create',async data=>{assert.equal(data.role,'Admin');assert.ok(await bcrypt.compare('test-password-123',data.password));return {...data,_id:adminId};});
      const payload={name:'Owner',email:'owner@example.com',password:'test-password-123',setupKey:process.env.ADMIN_SETUP_KEY};
      const results=await Promise.allSettled([setupAdminService(payload),setupAdminService(payload)]);
      assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
      assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.statusCode===409).length,1);
    });
    await t.test('owner can activate an existing customer as the first admin only with its current password',async st=>{
      const password=await bcrypt.hash('existing-password-123',4);
      st.mock.method(SetupLock,'create',async()=>({}));
      st.mock.method(SetupLock,'deleteOne',async()=>({deletedCount:1}));
      st.mock.method(User,'exists',async()=>null);
      st.mock.method(User,'findOne',()=>({select:async()=>({_id:customerId,name:'Workspace Owner',email:'owner@example.com',role:'Customer',isActive:true,password})}));
      const update=st.mock.method(User,'findOneAndUpdate',async(filter,data)=>{assert.equal(filter.password,password);assert.equal(data.$set.role,'Admin');return {_id:customerId,name:'Workspace Owner',email:'owner@example.com',role:'Admin'};});
      const revoke=st.mock.method(RefreshSession,'deleteMany',async()=>({deletedCount:1}));
      const payload={name:'Workspace Owner',email:'owner@example.com',setupKey:process.env.ADMIN_SETUP_KEY,password:'wrong-password-123'};
      await assert.rejects(setupAdminService(payload),err=>err.statusCode===403);
      assert.equal(update.mock.callCount(),0);
      const result=await setupAdminService({...payload,password:'existing-password-123'});
      assert.equal(result.role,'Admin');
      assert.equal(revoke.mock.callCount(),1);
    });
    await t.test('setup cannot create another initial admin when one already exists',async st=>{
      st.mock.method(SetupLock,'create',async()=>({}));
      st.mock.method(SetupLock,'deleteOne',async()=>({deletedCount:1}));
      st.mock.method(User,'exists',async()=>({_id:adminId}));
      await assert.rejects(setupAdminService({name:'Owner',email:'owner@example.com',password:'test-password-123',setupKey:process.env.ADMIN_SETUP_KEY}),err=>err.statusCode===409);
    });
    await t.test('invitations store hashes and return the raw token only at creation',async st=>{
      st.mock.method(User,'exists',async()=>null);
      let written;
      st.mock.method(Invitation,'findOneAndUpdate',(_query,data)=>{written=data;return {select:async()=>({_id:agentId,name:data.name,email:data.email,role:data.role})};});
      const result=await createInviteService({name:'Agent',email:'agent@example.com',role:'SupportAgent'},adminId);
      assert.match(result.token,/^[a-f0-9]{64}$/);
      assert.equal(written.tokenHash,hashToken(result.token));
      assert.notEqual(written.tokenHash,result.token);
      assert.equal(written.role,'SupportAgent');
    });
    await t.test('acceptance uses the server invitation role, hashes password, and consumes once',async st=>{
      let available=true;
      const token='a'.repeat(64);
      st.mock.method(Invitation,'findOneAndDelete',async query=>{assert.equal(query.tokenHash,hashToken(token));assert.ok(query.expiresAt.$gt instanceof Date);if(!available)return null;available=false;return {name:'Agent',email:'agent@example.com',role:'SupportAgent'};});
      st.mock.method(User,'create',async data=>{assert.equal(data.role,'SupportAgent');assert.ok(await bcrypt.compare('test-password-123',data.password));return data;});
      const result=await acceptInviteService(token,'test-password-123');
      assert.equal(result.role,'SupportAgent');
      await assert.rejects(acceptInviteService(token,'test-password-123'),err=>err.statusCode===400);
    });
    await t.test('expired or revoked invitation cannot create an account',async st=>{
      st.mock.method(Invitation,'findOneAndDelete',async()=>null);
      const creation=st.mock.method(User,'create',async()=>({}));
      await assert.rejects(acceptInviteService('b'.repeat(64),'test-password-123'),err=>err.statusCode===400);
      assert.equal(creation.mock.callCount(),0);
    });
    await t.test('admin cannot change own access or another protected admin',async st=>{
      await assert.rejects(updatePersonService(adminId,{isActive:false},adminId),err=>err.statusCode===403);
      st.mock.method(User,'findOneAndUpdate',query=>{assert.deepEqual(query.role,{$ne:'Admin'});return {select:async()=>null};});
      await assert.rejects(updatePersonService(agentId,{role:'Customer'},adminId),err=>err.statusCode===404);
    });
    await t.test('user access changes revoke refresh sessions',async st=>{
      st.mock.method(User,'findOneAndUpdate',()=>({select:async()=>({_id:agentId,role:'Customer',isActive:false})}));
      const revocation=st.mock.method(RefreshSession,'deleteMany',async()=>({deletedCount:2}));
      const user=await updatePersonService(agentId,{isActive:false},adminId);
      assert.equal(user.isActive,false);
      assert.deepEqual(revocation.mock.calls[0].arguments[0],{userId:agentId});
    });
    await t.test('ticket detail filters isolate customers and assigned agents',async st=>{
      let filter;
      st.mock.method(Ticket,'findOne',query=>{filter=query;return {populate(){return this;},then(resolve){return Promise.resolve(null).then(resolve);}};});
      await getTicketByIdService(adminId,{id:customerId,role:'Customer'});
      assert.equal(filter.createdBy.toString(),customerId);
      await getTicketByIdService(adminId,{id:agentId,role:'SupportAgent'});
      assert.equal(filter.assignedTo.toString(),agentId);
    });
    await t.test('a customer-created ticket appears in admin list and can be assigned to an agent',async st=>{
      let record;
      st.mock.method(Ticket,'create',async data=>{record={...data,_id:agentId,status:'Open'};return record;});
      await createTicketService({title:'Customer request',description:'A customer needs help',category:'General',priority:'Medium'},customerId);
      function matches(filter){return (!filter.createdBy||filter.createdBy.toString()===record.createdBy)&&(!filter.assignedTo||filter.assignedTo.toString()===String(record.assignedTo));}
      st.mock.method(Ticket,'find',filter=>({sort(){return this;},skip(){return this;},limit(){return this;},populate(){return this;},then(resolve){return Promise.resolve(matches(filter)?[record]:[]).then(resolve);}}));
      st.mock.method(Ticket,'countDocuments',async filter=>matches(filter)?1:0);
      const query=ticketListQuerySchema.parse({});
      assert.equal((await getTicketService(query,{id:adminId,role:'Admin'})).tickets[0].createdBy,customerId);
      assert.equal((await getTicketService(query,{id:agentId,role:'SupportAgent'})).tickets.length,0);
      st.mock.method(User,'findOne',async filter=>{assert.equal(filter.role,'SupportAgent');assert.equal(filter.isActive,true);return {_id:agentId};});
      st.mock.method(Ticket,'findByIdAndUpdate',(id,data)=>{assert.equal(id,record._id);record.assignedTo=data.assignedTo;return {populate(){return this;},then(resolve){return Promise.resolve(record).then(resolve);}};});
      await assignTicketService(record._id,agentId);
      assert.equal((await getTicketService(query,{id:agentId,role:'SupportAgent'})).tickets.length,1);
      assert.equal((await getTicketService(query,{id:customerId,role:'Customer'})).tickets.length,1);
    });
    await t.test('dashboard metrics are computed within each role scope',async st=>{
      let match;
      st.mock.method(Ticket,'aggregate',async pipeline=>{match=pipeline[0].$match;return [{_id:'Open',count:3}];});
      st.mock.method(Ticket,'find',()=>({sort(){return this;},limit(){return this;},populate:async()=>[]}));
      for(const [value,id,field] of [['Customer',customerId,'createdBy'],['SupportAgent',agentId,'assignedTo']]){
        const summary=await dashboardService({id,role:value});
        assert.equal(match[field].toString(),id);
        assert.equal(summary.total,3);
        assert.equal(summary.counts.Open,3);
        assert.equal(summary.unassigned,0);
      }
    });
    await t.test('support update and assignment routes reject unauthorized actions',async()=>{
      role='SupportAgent';
      assert.equal((await request(`/api/tickets/${agentId}`,'PATCH',{priority:'High'})).status,403);
      assert.equal((await request(`/api/tickets/${agentId}/assign`,'PATCH',{assignedTo:agentId})).status,403);
      role='Customer';
      assert.equal((await request(`/api/tickets/${agentId}`,'DELETE')).status,403);
      role='Admin';
    });
    await t.test('refresh rotation accepts an old token only once even for concurrent requests',async st=>{
      const token=generateRefreshToken({userId:adminId,role:'Admin',sessionId:agentId});
      const oldHash=hashToken(token);
      st.mock.method(RefreshSession,'findOne',async()=>({_id:agentId}));
      st.mock.method(User,'findById',async()=>({_id:adminId,role:'Admin',isActive:true}));
      let consumed=false;
      st.mock.method(RefreshSession,'findOneAndUpdate',async(query,update)=>{
        assert.equal(query.tokenHash,oldHash);
        assert.ok(query.expiresAt.$gt instanceof Date);
        assert.notEqual(update.$set.tokenHash,oldHash);
        if(consumed)return null;
        consumed=true;return {_id:agentId};
      });
      const result=await Promise.allSettled([refreshTokenService(token),refreshTokenService(token)]);
      assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
      assert.equal(result.filter(r=>r.status==='rejected'&&r.reason.statusCode===401).length,1);
    });
    await t.test('missing production token settings return 503 without leaking a secret',async()=>{
      const access=process.env.JWT_ACCESS_SECRET;
      const refresh=process.env.JWT_REFRESH_SECRET;
      try {
        delete process.env.JWT_ACCESS_SECRET;
        assert.throws(()=>generateAccessToken({userId:adminId,role:'Admin'}),error=>error.statusCode===503&&error.message.includes('JWT_ACCESS_SECRET'));
        delete process.env.JWT_REFRESH_SECRET;
        await assert.rejects(refreshTokenService('invalid-diagnostic-token'),error=>error.statusCode===503&&error.message.includes('JWT_REFRESH_SECRET'));
      } finally {
        process.env.JWT_ACCESS_SECRET=access;
        process.env.JWT_REFRESH_SECRET=refresh;
      }
    });
  } finally {
    authentication.mock.restore();log.mock.restore();
    await new Promise(resolve=>server.close(resolve));
  }
});

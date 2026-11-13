import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('frontend panel contracts and session recovery', async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const {default:PublicHome} = await vite.ssrLoadModule('/src/components/PublicHome.tsx');
    const {default:AuthScreen} = await vite.ssrLoadModule('/src/components/AuthScreen.tsx');
    const {default:AccountPanel} = await vite.ssrLoadModule('/src/components/AccountPanel.tsx');
    const api = await vite.ssrLoadModule('/src/api.ts');
    await t.test('one website links to all three portals and uses the real logo',()=>{
      const html=renderToStaticMarkup(createElement(PublicHome,{user:null}));
      for(const role of ['admin','support','customer'])assert.ok(html.includes(`#/login/${role}`));
      assert.ok(html.includes('resolve-ai-light-192.png'));
      assert.ok(html.includes('#/register'));
      assert.ok(html.includes('#/setup'));
    });
    await t.test('each role has a dedicated sign-in screen',()=>{
      for(const [route,label] of [['admin','Admin'],['support','Support'],['customer','Customer']]){
        const html=renderToStaticMarkup(createElement(AuthScreen,{route:`/login/${route}`,onLogin:()=>{}}));
        assert.ok(html.includes(`${label} sign in.`));
        assert.ok(html.includes('name="password"'));
        assert.ok(!html.includes('name="setupKey"'));
      }
    });
    await t.test('account copy and actions match the actual account role',()=>{
      const person={id:'test-id',name:'Test Person',email:'person@example.com'};
      const admin=renderToStaticMarkup(createElement(AccountPanel,{user:{...person,role:'Admin'}}));
      assert.ok(admin.includes('Your administrator access'));
      assert.ok(admin.includes('#/admin/people'));
      assert.ok(!admin.toLowerCase().includes('contact your administrator'));
      const agent=renderToStaticMarkup(createElement(AccountPanel,{user:{...person,role:'SupportAgent'}}));
      assert.ok(agent.includes('Your support access'));
      assert.ok(agent.includes('#/support/tickets'));
      const customer=renderToStaticMarkup(createElement(AccountPanel,{user:{...person,role:'Customer'}}));
      assert.ok(customer.includes('Your customer access'));
      assert.ok(customer.includes('#/customer/tickets'));
      assert.ok(!customer.includes('#/admin/people'));
    });
    await t.test('customer registration never offers a privileged role',()=>{
      const html=renderToStaticMarkup(createElement(AuthScreen,{route:'/register',onLogin:()=>{}}));
      assert.ok(html.includes('Create customer account'));
      assert.ok(!html.includes('name="role"'));
      assert.ok(html.includes('name="confirmPassword"'));
    });
    await t.test('owner setup asks for a private key and begins disabled pending status',()=>{
      const html=renderToStaticMarkup(createElement(AuthScreen,{route:'/setup',onLogin:()=>{}}));
      assert.ok(html.includes('name="setupKey"'));
      assert.ok(html.includes('<fieldset disabled=""'));
    });
    await t.test('concurrent expired requests share a single refresh and retry with the new token',async st=>{
      api.setAccessToken('old-token');
      let refreshes=0;
      let retried=0;
      st.mock.method(globalThis,'fetch',async(url,options)=>{
        assert.equal(options.credentials,'include');
        if(url.endsWith('/api/auth/refresh')){refreshes++;await new Promise(resolve=>setTimeout(resolve,5));return Response.json({success:true,data:{accessToken:'new-token'}});}
        const authorization=new Headers(options.headers).get('Authorization');
        if(authorization==='Bearer old-token')return Response.json({success:false,message:'Expired'}, {status:401});
        assert.equal(authorization,'Bearer new-token');retried++;
        return Response.json({success:true,data:[]});
      });
      await Promise.all([api.apiRequest('/api/tickets'),api.apiRequest('/api/workspace/dashboard')]);
      assert.equal(refreshes,1);assert.equal(retried,2);
    });
    await t.test('a repeatedly rejected request stops after one retry and expires the UI session',async st=>{
      const events=new EventTarget();
      const previous=globalThis.window;
      globalThis.window=events;
      st.after(()=>{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;});
      let expired=0,requests=0;
      events.addEventListener('session-expired',()=>expired++);
      st.mock.method(globalThis,'fetch',async(url)=>{
        if(url.endsWith('/api/auth/refresh'))return Response.json({success:true,data:{accessToken:'refreshed-token'}});
        requests++;return Response.json({success:false,message:'Account unavailable'}, {status:401});
      });
      await assert.rejects(api.apiRequest('/api/tickets'),error=>error.status===401);
      assert.equal(requests,2);assert.equal(expired,1);
    });
    await t.test('network failures produce a recoverable connection message',async st=>{
      st.mock.method(globalThis,'fetch',async()=>{throw new TypeError('network failed');});
      await assert.rejects(api.apiRequest('/api/auth/login',{method:'POST'}),error=>error.message.includes('Cannot reach the server'));
    });
  } finally {await vite.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as client } from '../../client/node_modules/socket.io-client/build/esm/index.js';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app.js';
import { setupRealtime } from '../src/realtime.js';
import Problem from '../src/models/problem.model.js';
import Match from '../src/models/match.model.js';
const event = (socket,name) => new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Missing ${name}`)),8000);socket.once(name,data=>{clearTimeout(timer);resolve(data)});});

test('HTTP auth + real sockets: matchmaking, private judging, both players receive result, reconnect, timeout', async () => {
 const database=await MongoMemoryReplSet.create({replSet:{count:1}});
 const nativeFetch=globalThis.fetch;const sockets=[];let io,server,stop;
 process.env.JWT_SECRET='isolated-integration-test-secret';
 process.env.JUDGE0_API_URL='https://judge.test';
 const tokens=new Map();let sequence=0;
 globalThis.fetch=async (url,options)=>{
  if (!String(url).startsWith('https://judge.test')) return nativeFetch(url,options);
  if(options.method==='POST'){
   const body=JSON.parse(options.body);const source=Buffer.from(body.source_code,'base64').toString();
   // Hosted execution boundary is stubbed. User source is NEVER evaluated in this test process.
   const token=String(++sequence); tokens.set(token,{source,args:JSON.parse(Buffer.from(body.stdin,'base64').toString())});
   return Response.json({token});
  }
  const token=String(url).split('/submissions/')[1].split('?')[0];const {source,args}=tokens.get(token);
  const runtime=source.startsWith('function solve(){throw new Error');const output=source.includes('return 0')?'0':String(args.reduce((a,b)=>a+b,0));
  return Response.json({status:{id:runtime?11:3},stdout:Buffer.from(output).toString('base64'),stderr:runtime?Buffer.from('private diagnostic').toString('base64'):null});
 };
 try {
  await mongoose.connect(database.getUri());
  await Problem.create({title:'Sum',description:'Return the sum.',difficulty:'easy',starterCode:'function solve(a,b) {}',sampleTestCases:[{input:'[2,3]',expectedOutput:'5'}],hiddenTestCases:[{input:'[17,29]',expectedOutput:'46'}]});
  server=createServer(app);io=new Server(server);stop=setupRealtime(io);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const request=(path,cookie,body)=>nativeFetch(base+'/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const cookies=[];const ids=[];
  for(const username of ['alpha','beta','outsider']){
   assert.equal((await request('/auth/register',null,{username,email:username+'@test.invalid',password:'test-password'})).status,201);
   const response=await request('/auth/login',null,{username,password:'test-password'});assert.equal(response.status,200);cookies.push(response.headers.get('set-cookie').split(';')[0]);ids.push((await response.json()).user.id);
  }
  for(const cookie of cookies.slice(0,2)){const socket=client(base,{autoConnect:false,extraHeaders:{Cookie:cookie}});sockets.push(socket);const ready=event(socket,'connect');socket.connect();await ready;}
  const found=sockets.map(socket=>event(socket,'match_found'));const searching=event(sockets[0],'match_searching');sockets[0].emit('find_match');await searching;sockets[1].emit('find_match');
  const matches=await Promise.all(found);assert.equal(matches[0].matchId,matches[1].matchId);const id=matches[0].matchId;
  const resumed=event(sockets[0],'match_found');sockets[0].emit('find_match');assert.equal((await resumed).matchId,id);assert.equal(await Match.countDocuments(),1);
  const view=await (await request('/matches/'+id,cookies[0])).json();assert.equal(JSON.stringify(view).includes('hiddenTestCases'),false);assert.equal(JSON.stringify(view).includes('[17,29]'),false);
  assert.equal((await request(`/matches/${id}/submit`,null,{code:'function solve(){}'})).status,401);
  assert.equal((await request(`/matches/${id}/submit`,cookies[2],{code:'function solve(){}'})).status,403);
  const wrong=await (await request(`/matches/${id}/submit`,cookies[0],{code:'function solve(){return 0}',expectedOutput:'0',verdict:'Accepted'})).json();assert.deepEqual(wrong,{verdict:'Wrong Answer'});
  const runtime=await (await request(`/matches/${id}/submit`,cookies[0],{code:'function solve(){throw new Error() }'})).json();assert.deepEqual(runtime,{verdict:'Runtime Error'});
  const sample=await (await request(`/matches/${id}/run`,cookies[0],{code:'function solve(a,b){return a+b}'})).json();assert.equal(sample.verdict,'Accepted');assert.equal(sample.results[0].expectedOutput,'5');
  const completed=sockets.map(socket=>event(socket,'match_completed'));
  const accepted=await request(`/matches/${id}/submit`,cookies[0],{code:'function solve(a,b){return a+b}'});assert.equal(accepted.status,200);
  const outcomes=await Promise.all(completed);assert.deepEqual(outcomes[0],outcomes[1]);assert.equal(outcomes[0].winner,ids[0]);
  assert.equal((await request(`/matches/${id}/submit`,cookies[1],{code:'function solve(a,b){return a+b}'})).status,409);
  const profile=await (await request('/auth/me',cookies[0])).json();assert.equal(profile.user.wins,1);
  sockets[1].disconnect();
  const offlineResult=await (await request(`/matches/${id}/result`,cookies[1])).json();
  assert.equal(offlineResult.match.status,'completed');assert.equal(offlineResult.match.winner,ids[0]);
  const offlineHistory=await (await request('/matches/history',cookies[1])).json();
  assert.deepEqual(offlineHistory.stats,{total:1,wins:0,losses:1,draws:0,winRate:0});
  const reconnected=event(sockets[1],'connect');sockets[1].connect();await reconnected;
  const watched=await sockets[1].timeout(3000).emitWithAck('watch_match',id);assert.equal(watched.match.winner,ids[0]);
  const draw=await Match.create({player1:ids[0],player2:ids[1],problem:view.match.problem._id,status:'in_progress',endsAt:new Date(Date.now()+1500)});
  for(const socket of sockets) await socket.timeout(3000).emitWithAck('watch_match',String(draw._id));
  const draws=await Promise.all(sockets.map(socket=>event(socket,'match_completed')));assert.equal(draws[0].winner,null);assert.equal(draws[0].status,'completed');assert.deepEqual(draws[0],draws[1]);
 } finally {globalThis.fetch=nativeFetch;stop?.();sockets.forEach(socket=>socket.disconnect());if(io)await new Promise(resolve=>io.close(resolve));await mongoose.disconnect();await database.stop();}
});

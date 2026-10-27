import test from 'node:test'
import assert from 'node:assert/strict'
import { outcome, filterHistory, resultPath, playAgainPath, duration } from '../src/utils/history.js'
import { getHistory, getMatchResult } from '../src/services/matches.js'
import { api } from '../src/services/api.js'
const matches = [{ _id:'one',status:'completed',winner:'a' },{ _id:'two',status:'completed',winner:'b' },{ _id:'three',status:'completed',winner:null }]
test('authoritative winner identifies victory and defeat; only completed winnerless matches draw', () => {
 assert.equal(outcome(matches[0],'a'),'win');assert.equal(outcome(matches[0],'b'),'loss')
 assert.equal(outcome(matches[2],'a'),'draw')
 assert.equal(outcome({status:'in_progress',winner:null},'a'),null)
 assert.equal(outcome(undefined,'a'),null)
 assert.equal(outcome(JSON.parse(JSON.stringify(matches[0])),'b'),'loss')
})
test('all, win, loss and draw filters preserve server ordering', () => {
 assert.deepEqual(filterHistory(matches,'all','a'),matches)
 for(const [index,filter] of ['win','loss','draw'].entries()) assert.deepEqual(filterHistory(matches,filter,'a'),[matches[index]])
 assert.deepEqual(filterHistory([],'win','a'),[])
})
test('history destinations use the real ID and play again never queues', () => {
 assert.equal(resultPath('match-id'),'/matches/match-id/result')
 assert.equal(resultPath('unsafe/id'),'/matches/unsafe%2Fid/result')
 assert.equal(playAgainPath,'/play')
})
test('duration requires recorded timestamps, never a fabricated submission metric', () => {
 assert.equal(duration({startedAt:'2026-10-26T10:00:00Z',completedAt:'2026-10-26T10:04:18Z'}),'04:18')
 assert.equal(duration({startedAt:'2026-10-26T10:00:00Z'}),null)
 assert.equal(duration({startedAt:'2026-10-26T10:00:00Z',endsAt:'2026-10-26T10:10:00Z',completedAt:'2026-10-27T12:00:00Z'}),'10:00')
 assert.equal(duration({startedAt:'invalid',completedAt:'invalid'}),null)
})
test('history and result APIs use credentials without accepting a user ID', async () => {
 const original=api.defaults.adapter
 const paths=[]
 api.defaults.adapter=async config=>{ paths.push(config.url);assert.equal(config.withCredentials,true);assert.equal(config.params,undefined);return {data:{match:matches[0],matches},status:200,headers:{},config} }
 try {assert.deepEqual((await getHistory()).matches,matches);assert.deepEqual(await getMatchResult('one'),matches[0]);assert.deepEqual(paths,['/matches/history','/matches/one/result'])}
 finally {api.defaults.adapter=original}
})

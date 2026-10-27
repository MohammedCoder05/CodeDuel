import test from 'node:test'
import assert from 'node:assert/strict'
import { createLogoutConfirmation } from '../src/utils/logoutConfirmation.js'
const formatError = error => error.message

test('opening and cancelling logout never calls authentication or redirects', async () => {
  const model = createLogoutConfirmation()
  let calls = 0
  let redirects = 0
  model.open()
  assert.deepEqual(model.getSnapshot(), { open: true, busy: false, error: '' })
  model.close() // Stay here, X, backdrop and Escape share this action.
  assert.equal(model.getSnapshot().open, false)
  await model.confirm(() => { calls++ }, () => { redirects++ }, formatError)
  assert.equal(calls, 0)
  assert.equal(redirects, 0)
})

test('confirmation waits for logout success, prevents duplicates, then redirects once', async () => {
  const model = createLogoutConfirmation()
  let resolve
  const request = new Promise(done => { resolve = done })
  let calls = 0
  let redirects = 0
  const logout = () => { calls++; return request }
  const navigate = () => { redirects++ }
  model.open()
  const pending = model.confirm(logout, navigate, formatError)
  assert.equal(model.getSnapshot().busy, true)
  assert.equal(redirects, 0)
  model.close()
  assert.equal(model.getSnapshot().open, true, 'cannot dismiss an in-flight logout')
  await model.confirm(logout, navigate, formatError)
  assert.equal(calls, 1)
  resolve()
  await pending
  assert.equal(redirects, 1)
  assert.deepEqual(model.getSnapshot(), { open: false, busy: false, error: '' })
})

test('failed logout keeps the modal open, shows error, and allows a successful retry', async () => {
  const model = createLogoutConfirmation()
  let redirects = 0
  const navigate = () => { redirects++ }
  model.open()
  await model.confirm(async () => { throw new Error('Unable to log out. Please retry.') }, navigate, formatError)
  assert.deepEqual(model.getSnapshot(), { open: true, busy: false, error: 'Unable to log out. Please retry.' })
  assert.equal(redirects, 0)
  await model.confirm(async () => {}, navigate, formatError)
  assert.equal(redirects, 1)
  assert.deepEqual(model.getSnapshot(), { open: false, busy: false, error: '' })
})

test('closing after failure clears errors and unsubscribed views receive no updates', async () => {
  const model = createLogoutConfirmation()
  let updates = 0
  const unsubscribe = model.subscribe(() => updates++)
  model.open()
  await model.confirm(async () => { throw new Error('Network error') }, () => {}, formatError)
  model.close()
  assert.deepEqual(model.getSnapshot(), { open: false, busy: false, error: '' })
  unsubscribe()
  const previous = updates
  model.open()
  assert.equal(updates, previous)
})

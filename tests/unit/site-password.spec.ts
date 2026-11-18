import { describe, expect, it } from 'vitest'

import { isAuthorized } from '@/lib/site-password'

const basic = (user: string, pass: string) =>
  `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(`${user}:${pass}`)))}`

describe('isAuthorized', () => {
  it('lets everyone in when no password is configured', () => {
    expect(isAuthorized(null, undefined)).toBe(true)
    expect(isAuthorized(null, '')).toBe(true)
  })

  it('accepts the right password with any user name, including non-latin', () => {
    expect(isAuthorized(basic('anyone', 'secret'), 'secret')).toBe(true)
    expect(isAuthorized(basic('', 'полутон'), 'полутон')).toBe(true)
    expect(isAuthorized(basic('user', 'a:b'), 'a:b')).toBe(true)
  })

  it('rejects missing, wrong or malformed credentials', () => {
    expect(isAuthorized(null, 'secret')).toBe(false)
    expect(isAuthorized(basic('user', 'wrong'), 'secret')).toBe(false)
    expect(isAuthorized(basic('user', 'secret1'), 'secret')).toBe(false)
    expect(isAuthorized('Bearer abc', 'secret')).toBe(false)
    expect(isAuthorized('Basic !!!notbase64', 'secret')).toBe(false)
    expect(isAuthorized(`Basic ${btoa('nocolon')}`, 'secret')).toBe(false)
  })
})

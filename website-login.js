import { randomUUID } from 'node:crypto'

const ACTIVE = new Set(['pending', 'connecting', 'committing'])
const failure = (message) => new Error('AIyting ' + message)

/** Device grant secrets live only in this Host closure, never in public views. */
export function websiteLogin({ endpoint, identity, commit, signal, fetcher = fetch, now = Date.now, requestTimeoutMs = 15000 }) {
  const origin = new URL(endpoint).origin
  let attempt = null, queue = Promise.resolve(), epoch = 0
  const serial = (job) => {
    const result = queue.catch(() => {}).then(job)
    queue = result.catch(() => {})
    return result
  }
  const lifecycle = (job) => {
    const started = epoch
    return serial(() => job(started))
  }
  const post = async (path, body, extraSignal, cleanup = false) => {
    const timeout = new AbortController()
    const combined = AbortSignal.any([...(cleanup ? [] : [signal]), ...(extraSignal ? [extraSignal] : []), timeout.signal])
    let timedOut = false, timer, onAbort
    const cancelled = new Promise((_, reject) => {
      onAbort = () => reject(failure(timedOut ? '官网登录请求超时，请重试或使用接入密钥连接。' : '登录请求已取消或连接已关闭。'))
      if (combined.aborted) onAbort()
      else combined.addEventListener('abort', onAbort, { once: true })
    })
    timer = setTimeout(() => { timedOut = true; timeout.abort() }, cleanup ? Math.min(3000, requestTimeoutMs) : requestTimeoutMs)
    const exchange = async () => {
      combined.throwIfAborted()
      const response = await fetcher(new URL('/api/auth/plugin/' + path, origin), {
        method: 'POST', redirect: 'error', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: combined,
      })
      if (response.status === 404 || response.status === 405) {
        void response.body?.cancel().catch(() => {})
        throw failure('官网一键授权尚未开放，请使用接入密钥连接。')
      }
      const text = await response.text()
      if (text.length > 16384) throw failure('登录服务返回异常，请稍后重试。')
      let data
      try { data = JSON.parse(text) } catch { throw failure('官网授权暂不可用，请使用高级设置中的接入密钥。') }
      if (!response.ok && typeof data.error !== 'string') throw failure('官网授权暂不可用，请使用高级设置中的接入密钥。')
      // A transport may deliver a grant after the local deadline already settled.
      // Clean up that unapproved grant without allowing it to become a new attempt.
      if (combined.aborted && path === 'device' && typeof data.device_code === 'string' && /^[A-Za-z0-9_-]{24,256}$/.test(data.device_code)) {
        void post('cancel', { device_code: data.device_code }, undefined, true).catch(() => {})
      }
      combined.throwIfAborted()
      return data
    }
    try { return await Promise.race([exchange(), cancelled]) }
    finally { clearTimeout(timer); combined.removeEventListener('abort', onAbort) }
  }
  const view = (a = attempt) => a ? {
    attemptId: a.id, phase: a.phase, verificationUri: a.uri, userCode: a.code,
    expiresAt: a.expires, nextPollAt: a.next, ...(a.result || {}), ...(a.message ? { message: a.message } : {}),
  } : null
  const cancelRemote = async (a) => {
    if (!a.secret) return
    await post('cancel', { device_code: a.secret }, undefined, true).catch(() => {})
    a.secret = ''
  }
  const stop = async (a, phase, message) => {
    a.phase = phase; a.message = message
    await cancelRemote(a)
    return view(a)
  }
  const begin = (revision) => lifecycle(async (started) => {
    if (started !== epoch) throw failure('登录已取消，请重新发起。')
    if (signal.aborted) throw failure('连接已关闭。')
    const current = await identity()
    if (current.revision !== revision) throw failure('账号已变化，请刷新后重试。')
    if (started !== epoch) throw failure('登录已取消，请重新发起。')
    if (attempt && ACTIVE.has(attempt.phase) && attempt.expires > now() && !attempt.cancelled && attempt.revision === revision) return view()
    if (attempt && attempt.secret) await cancelRemote(attempt)
    const data = await post('device', { client_id: 'aiyting-dsh' })
    if (signal.aborted || started !== epoch) {
      if (typeof data.device_code === 'string') await post('cancel', { device_code: data.device_code }, undefined, true).catch(() => {})
      throw failure('登录已取消或连接已关闭。')
    }
    if (data.error) throw failure('官网授权暂不可用，请使用高级设置中的接入密钥。')
    let uri
    try { uri = new URL(data.verification_uri_complete) } catch { throw failure('官网授权地址无效。') }
    if (uri.origin !== origin || uri.pathname !== '/plugin-authorize' || uri.username || uri.password || uri.hash
      || typeof data.device_code !== 'string' || !/^[A-Za-z0-9_-]{24,256}$/.test(data.device_code)
      || typeof data.user_code !== 'string' || !/^[A-Z0-9-]{6,24}$/.test(data.user_code)
      || uri.searchParams.getAll('code').length !== 1 || [...uri.searchParams.keys()].some((key) => key !== 'code')
      || uri.searchParams.get('code') !== data.user_code) throw failure('官网授权响应无效，请重试。')
    const seconds = Number(data.expires_in), interval = Number(data.interval)
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600 || !Number.isFinite(interval) || interval < 5 || interval > 60) throw failure('官网授权有效期无效。')
    const a = { id: randomUUID(), phase: 'pending', secret: data.device_code, code: data.user_code, uri: uri.href,
      expires: now() + seconds * 1000, next: now() + interval * 1000, interval: interval * 1000, revision,
      controller: new AbortController(), cancelled: false }
    attempt = a
    if ((await identity()).revision !== revision) return stop(a, 'cancelled', '账号已变化，请重新登录。')
    return view()
  })
  const status = (id) => lifecycle(async (started) => {
    if (started !== epoch) return null
    const a = attempt
    if (!a) return null
    if (id && id !== a.id) throw failure('登录请求已变化，请重新打开登录。')
    if (!ACTIVE.has(a.phase)) return view()
    if (a.cancelled) return stop(a, 'cancelled', '已取消登录。')
    if (a.expires <= now()) return stop(a, 'expired', '登录确认已过期，请重试。')
    if ((await identity()).revision !== a.revision) return stop(a, 'cancelled', '账号已变化，请重新登录。')
    if (a.next > now()) return view()
    a.next = now() + a.interval
    try {
      const data = await post('token', { device_code: a.secret }, a.controller.signal)
      if (a.cancelled || signal.aborted) return stop(a, 'cancelled', '已取消登录。')
      if (data.error === 'authorization_pending') { a.message = ''; return view() }
      if (data.error === 'slow_down') { a.interval = Math.min(a.interval + 5000, 60000); a.next = now() + a.interval; return view() }
      if (data.error === 'access_denied') return stop(a, 'denied', '官网已拒绝授权，可以重新登录。')
      if (data.error === 'expired_token') return stop(a, 'expired', '登录确认已过期，请重试。')
      if (data.error) return stop(a, 'error', '登录确认失败，请重试。')
      const key = data.api_key
      if (typeof key !== 'string' || key.length < 24 || key.length > 512 || /\s/.test(key)) return stop(a, 'error', '登录凭据无效，请重试。')
      a.phase = 'connecting'; a.message = ''
      try {
        a.result = await commit(key, a.revision, a.controller.signal, () => {
          if (started !== epoch || a.cancelled || a.expires <= now() || signal.aborted) throw failure('登录已取消或过期。')
          a.phase = 'committing'
        })
      } catch {
        return stop(a, a.cancelled ? 'cancelled' : 'error', a.cancelled ? '已取消登录。' : '连接验证失败，原来的连接已保留，请重试。')
      }
      a.phase = 'connected'
      // Saving locally is the commit point. A lost acknowledgement must never
      // revoke a successfully saved key; the server drops recovery data at TTL.
      await post('complete', { device_code: a.secret }).catch(() => {})
      a.secret = ''
      return started === epoch ? view() : null
    } catch {
      if (a.cancelled || signal.aborted) return stop(a, 'cancelled', '已取消登录。')
      a.phase = 'pending'; a.message = '网络暂不可用，正在等待重连…'
      return view()
    }
  })
  const cancel = (id) => {
    const a = attempt
    if (a && (!id || a.id === id) && a.phase !== 'committing' && a.phase !== 'connected') {
      a.cancelled = true; a.controller.abort()
    }
    return serial(async () => {
      if (!a || a !== attempt || id && id !== a.id) throw failure('登录请求已变化。')
      if (a.phase === 'connected' || a.phase === 'committing') return view(a)
      return stop(a, 'cancelled', '已取消登录。')
    })
  }
  const reset = () => {
    ++epoch
    const previous = attempt
    if (previous && previous.phase !== 'committing' && previous.phase !== 'connected') {
      previous.cancelled = true; previous.controller.abort()
    }
    // Do not hold the account mutation queue while awaiting this queue: an
    // already running poll may itself be waiting for the credential commit.
    return serial(async () => {
      if (previous && previous.phase !== 'connected') await cancelRemote(previous)
      const accountRevision = previous?.phase === 'connected' ? previous.result?.accountRevision : undefined
      if (attempt === previous) attempt = null
      return { accountRevision }
    })
  }
  const canResetFrom = (revision) => Boolean(attempt && attempt.revision === revision && ['committing', 'connected'].includes(attempt.phase))
  return { begin, status, cancel, reset, canResetFrom, dispose() {
    ++epoch
    if (!attempt || attempt.phase === 'committing' || attempt.phase === 'connected') return
    attempt.cancelled = true; attempt.controller.abort()
    void cancelRemote(attempt)
  } }
}

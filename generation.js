/** Agent-facing generation tools. A submit always re-quotes and needs an explicit credit ceiling. */

const PROMPT_MAX = 4000
const control = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/

export function cleanPrompt(value) {
  if (typeof value !== 'string') throw new Error('AIyting 生图需要提示词。')
  const prompt = value.replace(/\r\n?/g, '\n').trim()
  if (!prompt) throw new Error('AIyting 生图需要提示词。')
  if (prompt.length > PROMPT_MAX) throw new Error(`AIyting 提示词最多 ${PROMPT_MAX} 个字符。`)
  if (control.test(prompt)) throw new Error('AIyting 提示词包含无法发送的控制字符。')
  return prompt
}

export function cleanBatchId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{4,120}$/.test(value.trim())) throw new Error('AIyting 任务号无效，请粘贴生成时返回的 batch id。')
  return value.trim()
}

const first = (...values) => values.find((value) => typeof value === 'string' && value) || null
const number = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)

/** Whitelist the upstream task payload; unknown fields never reach the conversation. */
export function normalizeTask(data) {
  const raw = data && typeof data === 'object' ? data : {}
  const children = (Array.isArray(raw.children) ? raw.children : []).slice(0, 8).map((child) => ({
    taskId: child?.taskId ?? null,
    status: first(child?.status) ?? null,
    routeId: first(child?.routeId) ?? null,
    routeName: first(child?.routeName) ?? null,
    error: first(child?.error?.message, typeof child?.error === 'string' ? child.error : null),
    media: (Array.isArray(child?.media) ? child.media : []).map((item) => (typeof item === 'string' ? { url: item, status: 'success' } : item))
      .filter((item) => item && typeof item.url === 'string' && /^https?:\/\//.test(item.url))
      .map((item) => ({ url: item.url, status: first(item.status) ?? null })),
  }))
  const top = (Array.isArray(raw.media) ? raw.media : []).map((item) => (typeof item === 'string' ? { url: item, status: 'success' } : item))
    .filter((item) => item && typeof item.url === 'string' && /^https?:\/\//.test(item.url))
    .map((item) => ({ url: item.url, status: first(item.status) ?? null }))
  const media = (children.flatMap((child) => child.media).length ? children.flatMap((child) => child.media) : top)
    .filter((item) => !item.status || item.status === 'success')
    .slice(0, 16)
    .map((item) => ({ url: item.url }))
  const status = first(raw.status, raw.state)
  return {
    batchId: first(raw.batchId, raw.batch_id, raw.id),
    status,
    terminal: raw.terminal === true || ['succeeded', 'success', 'completed', 'failed', 'cancelled', 'canceled'].includes(status || ''),
    chargedCredits: number(raw.chargedCredits ?? raw.credits),
    refundedCredits: number(raw.refundedCredits ?? raw.refundCredits),
    remainingCredits: number(raw.remainingCredits ?? raw.balanceCredits),
    totalChildren: Number.isInteger(raw.totalChildren) ? raw.totalChildren : children.length,
    media,
    children: children.map(({ routeName, status: childStatus, error }) => ({ routeName, status: childStatus, error })),
    error: first(raw.error?.message, typeof raw.error === 'string' ? raw.error : null, raw.failureReason, children.find((child) => child.error)?.error),
  }
}

/** Panel choices win, then catalog defaults; a stale saved pair falls back instead of failing late. */
export function resolveSettings(overrides = {}, stored = null, catalog) {
  const models = catalog.models.filter((model) => catalog.routes.some((route) => route.modelId === model.id && route.available))
  if (!models.length) throw new Error('AIyting 目录里没有可用线路，请稍后刷新目录。')
  const wanted = first(overrides.modelId, stored?.modelId && stored.modelId)
  let model = models.find((item) => item.id === wanted) || models[0]
  const routes = catalog.routes.filter((route) => route.modelId === model.id && route.available)
  const wantedRoute = first(overrides.routeId, stored?.routeId && (routes.some((route) => route.id === stored.routeId) ? stored.routeId : null))
  const route = routes.find((item) => item.id === wantedRoute) || routes.find((item) => item.recommended) || routes[0]
  const ratios = route.ratios.length ? route.ratios : ['1:1']
  const resolutions = route.resolutions.length ? route.resolutions : ['标准']
  const ratio = [overrides.aspectRatio, stored?.aspectRatio].find((value) => ratios.includes(value)) || [route.defaults?.ratio].find((value) => ratios.includes(value)) || ratios[0]
  const resolution = [overrides.resolution, stored?.resolution].find((value) => resolutions.includes(value)) || [route.defaults?.resolution].find((value) => resolutions.includes(value)) || resolutions[0]
  const quality = [overrides.quality, stored?.quality].find((value) => route.qualities?.includes(value)) || null
  const count = [overrides.count, stored?.count].find((value) => Number.isInteger(value) && value >= 1 && value <= 4) || 1
  return {
    catalogVersion: catalog.catalogVersion,
    modelId: model.id, routeId: route.id, aspectRatio: ratio, resolution, quality, count,
    modelName: model.name, routeName: route.name,
  }
}

export function describeSettings(settings) {
  return [settings.modelName || settings.modelId, settings.routeName || settings.routeId, settings.aspectRatio, settings.resolution, `${settings.count} 张`]
    .concat(settings.quality ? [settings.quality] : []).join(' · ')
}

/** What the person should do next: a stuck task keeps its charge, a failed one is refunded. */
export function retryAdvice(task) {
  if (!task || typeof task !== 'object') return ''
  const media = Array.isArray(task.media) ? task.media : []
  const refunded = typeof task.refundedCredits === 'number' && task.refundedCredits > 0
  if (task.terminal !== true) return `任务还在跑，已扣的 ${task.chargedCredits ?? 0} 点不会重复扣；稍后再查，或带上 waitSeconds 继续等。`
  if (refunded) return `这一笔没有成功，站点已退回 ${task.refundedCredits} 点；原来那单不会再出图，重试请重新提交一次（新提交会重新报价、确认后才扣费）。`
  if (task.status !== 'succeeded' && media.length === 0) return '这一笔没有出图；重新提交会自动用新的请求号，不会和这一笔混在一起。'
  return ''
}

/** DSH tool output is text; markdown keeps the finished images readable in the conversation. */
const render = (_args, value) => [{ type: 'text', text: typeof value?.text === 'string' ? value.text : JSON.stringify(value) }]
const json = { schema: { type: 'json' }, render }

export async function registerGenerationTools(ctx, dispatch) {
  const { defineTool } = await ctx.loader.import('@deepseek-ai/dsh-tools')
  const sessionIdOf = (exec) => {
    const id = exec.agent?.session?.id
    if (!id) throw new Error('AIyting 生图需要当前对话。')
    return id
  }
  ctx.tools.register(defineTool({
    name: 'aiyting_image_catalog',
    description: 'List the live AIyting image models, their routes, credit prices per spec and availability. Read-only; never charges credits. Use before answering questions about models, prices or speed.',
    parameters: {},
    output: json,
    async execute(_args, exec) {
      const catalog = await dispatch('list_models', {}, exec.signal)
      const lines = catalog.models.map((model) => {
        const routes = catalog.routes.filter((route) => route.modelId === model.id)
        const detail = routes.map((route) => `${route.name}${route.available ? '' : '（不可用）'}：${route.resolutions.join('/')} · ${route.ratios.join(' ')} · 成功率 ${route.successRate == null ? '未知' : Math.round(route.successRate * 100) + '%'} · 约 ${route.avgSeconds == null ? '未知' : route.avgSeconds + 's'}`)
        return `- ${model.name}（${model.id}）\n  ${detail.join('\n  ')}`
      })
      return { catalogVersion: catalog.catalogVersion, models: catalog.models.length, routes: catalog.routes.length,
        text: `AIyting 目录 v${catalog.catalogVersion}：${catalog.models.length} 个模型 / ${catalog.routes.length} 条线路\n${lines.join('\n')}\n\n点数以 aiyting_image_generate 首次返回的报价为准。` }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'aiyting_image_generate',
    description: 'Submit one AIyting image generation task using this conversation panel settings. First call without maxCredits to get the price and confirm it with the user; then call again with maxCredits equal to or above that quote to actually submit (this charges credits). Omitting model fields uses the panel selection.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Final generation prompt in the user\u2019s words.' },
      modelId: { type: 'string', description: 'Optional model override, e.g. nano-banana-2.' },
      routeId: { type: 'string', description: 'Optional route override, e.g. C线路.' },
      aspectRatio: { type: 'string', description: 'Optional ratio override such as 1:1 or 16:9.' },
      resolution: { type: 'string', description: 'Optional resolution override such as 1K, 2K, 4K.' },
      quality: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Optional quality override when the route supports it.' },
      count: { type: 'integer', enum: [1, 2, 3, 4], description: 'Images per route, defaults to the panel value.' },
      maxCredits: { type: 'number', description: 'Credit ceiling the user agreed to. Omit to only receive a quote without charging.' },
      clientRequestId: { type: 'string', description: 'Idempotency key; reuse it to retry the same submit without paying twice.' },
    },
    output: json,
    async execute(args, exec) {
      const value = await dispatch('submit_generation', { ...args, sessionId: sessionIdOf(exec) }, exec.signal)
      const head = value.needsConfirmation
        ? `报价：${value.quote.chargedCredits} 点 · ${describeSettings(value.settings)}`
        : `已提交：${value.task.batchId || value.clientRequestId} · ${describeSettings(value.settings)} · ${value.quote.chargedCredits} 点`
      const tail = value.needsConfirmation
        ? `把点数告诉用户；用户同意后再调用一次并带上 maxCredits ≥ ${value.quote.chargedCredits} 才会真正扣费提交。`
        : value.reused
          ? '这个请求号之前已经完成过，这里直接用本机任务记录回答，没有再次扣费。'
          : `提示词：${value.prompt}\n任务号已记到本机任务记录；之后即使对话或进程中断，也能用 aiyting_image_task 不带任务号找回。查询进度用 aiyting_image_task（waitSeconds 最多 50）。`
      return { ...value, text: `${head}\n${tail}` }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'aiyting_image_task',
    description: 'Read or wait for an AIyting generation task: status, charged and refunded credits, and finished image URLs. Omit batchId to list the batches this machine submitted, which is how an interrupted or restarted turn finds its paid tasks again.',
    parameters: {
      batchId: { type: 'string', description: 'batch id returned when the task was submitted. Omit to list recent batches instead.' },
      waitSeconds: { type: 'integer', description: '0-50 seconds to wait for completion; defaults to 0 and only reports the current status.' },
    },
    output: json,
    async execute(args, exec) {
      if (!args.batchId) {
        const value = await dispatch('list_generations', { refresh: args.waitSeconds !== -1 }, exec.signal)
        const lines = value.batches.length
          ? value.batches.map((item) => `- ${item.batchId} · ${item.status}${item.terminal ? '' : '（未完成）'}`
            + `${item.chargedCredits != null ? ` · ${item.chargedCredits} 点` : ''}`
            + `${item.media?.length ? ` · ${item.media.length} 张` : ''} · ${item.createdAt}`)
          : ['本机还没有提交过 AIyting 任务。']
        return { ...value, text: `本机任务记录（${value.batches.length} 条，未完成 ${value.pending} 条）：\n${lines.join('\n')}\n\n带上 batchId 可以查详情或继续等待。` }
      }
      const task = await dispatch('get_generation', { batchId: args.batchId, waitSeconds: args.waitSeconds }, exec.signal)
      const lines = [`状态：${task.status || '未知'}${task.terminal ? '' : '（仍在生成）'}`]
      if (task.chargedCredits != null) lines.push(`已扣：${task.chargedCredits} 点${task.refundedCredits ? ` · 返还 ${task.refundedCredits} 点` : ''}`)
      if (task.remainingCredits != null) lines.push(`剩余：${task.remainingCredits} 点`)
      if (task.error) lines.push(`失败原因：${task.error}`)
      if (task.media.length) {
        const routes = [...new Set((task.children || []).map((child) => child.routeName).filter(Boolean))].join(' / ')
        lines.push('', `【AIyting 出图】${task.media.length} 张${routes ? ` · ${routes}` : ''}${task.chargedCredits != null ? ` · ${task.chargedCredits} 点` : ''}`)
      }
      if (task.media.length) lines.push('', ...task.media.map((item, index) => `![图 ${index + 1}](${item.url})`), '', ...task.media.map((item) => item.url))
      const advice = retryAdvice(task)
      if (advice) lines.push('', advice)
      if (!task.terminal && !task.media.length) lines.push('还没出图；可再调一次并带上 waitSeconds。')
      return { ...task, text: lines.filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n') }
    },
  }))
}

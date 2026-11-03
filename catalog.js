/** Adapt the public MCP catalog; never supply demo models, prices, or telemetry. */
const ALIASES = {
  'gemini-3-pro-image-preview': ['Nano Pro', 'Nano Banana Pro', '香蕉Pro', '香蕉专业版', 'Gemini 3 Pro Image'],
  'gemini-3.1-flash-image-preview': ['Nano Banana 2', 'Nano Banana2', '香蕉2', '香蕉二代', 'Gemini 3.1 Flash Image'],
  'nano-banana-2.1': ['Nano Banana 2.1', '香蕉2.1'],
  'gpt-image-2': ['GPT Image 2', 'GPT Image 2.0', 'GPT生图2'],
  'gpt-image-2.5-sunburst': ['GPT Image 2.5 Sunburst', 'Sunburst'],
  'gpt-image-2.5-flare': ['GPT Image 2.5 Flare', 'Flare'],
  'seedream-5.0-pro': ['Seedream 5 Pro', 'Seedream 5.0 Pro', '即梦5Pro', '即梦5.0Pro'],
  'seedream-5.0-lite': ['Seedream 5 Lite', 'Seedream 5.0 Lite', '即梦5Lite'],
}

const strings = (values) => [...new Set((values || []).filter((value) => typeof value === 'string' && value))]
const numberOrNull = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

export function unwrapMcpResult(result) {
  if (result?.isError) throw new Error('MCP 查询失败')
  const value = result?.value ?? result
  if (value?.isError) throw new Error('MCP 查询失败')
  let data = value?.structuredContent
  if (!data) {
    const text = value?.content?.filter((item) => item.type === 'text').map((item) => item.text).join('\n')
    try { data = JSON.parse(text) } catch { throw new Error('MCP 返回了无法识别的数据') }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('MCP 返回了无法识别的数据')
  if (data.error) throw new Error('MCP 查询失败')
  return data
}

export function normalizeCatalog(data) {
  const catalog = data?.catalogs?.find((item) => item.mediaType === 'image') || data
  if (!Array.isArray(data?.models) || !Number.isSafeInteger(catalog?.catalogVersion) || catalog.catalogVersion < 0) throw new Error('MCP 模型目录格式不正确')
  const models = [], routes = []
  for (const model of data.models) {
    if (typeof model.modelId !== 'string' || (model.type && model.type !== 'image')) continue
    const modelRoutes = []
    for (const route of model.routes || []) {
      const mode = route.modes?.find((item) => item.mode === 'text-to-image')
      if (!mode || typeof route.routeId !== 'string') continue
      const resolutions = strings(mode.resolutions)
      const qualities = strings(mode.qualities).filter((value) => ['low', 'medium', 'high'].includes(value))
      const successRate = numberOrNull(route.successRate)
      modelRoutes.push({
        id: route.routeId,
        modelId: model.modelId,
        name: route.publicName || route.routeId,
        note: typeof route.summary === 'string' ? route.summary : '',
        recommended: route.recommended === true,
        status: route.availability === 'available' ? 'ok' : route.availability === 'maintenance' || route.availability === 'unavailable' ? 'down' : 'unknown',
        available: route.availability === 'available',
        successRate: successRate !== null && successRate <= 1 ? successRate : null,
        avgSeconds: numberOrNull(route.averageDurationMs) === null ? null : Math.round(route.averageDurationMs / 1000),
        ratios: strings(mode.ratios?.length ? mode.ratios : [mode.defaults?.ratio || '1:1']),
        resolutions: resolutions.length ? resolutions : ['标准'],
        qualities: qualities.length ? qualities : null,
        defaults: mode.defaults || {},
        pricing: route.pricing || null,
      })
    }
    if (!modelRoutes.length) continue
    const qualities = strings(modelRoutes.flatMap((route) => route.qualities || []))
    models.push({
      id: model.modelId,
      name: model.displayName || model.modelId,
      vendor: '',
      aliases: strings([...(model.aliases || []), ...(ALIASES[model.modelId] || [])]),
      note: typeof model.note === 'string' ? model.note : typeof model.summary === 'string' ? model.summary : '',
      ratios: strings(modelRoutes.flatMap((route) => route.ratios)),
      resolutions: strings(modelRoutes.flatMap((route) => route.resolutions)),
      qualities: qualities.length ? qualities : null,
      routes: modelRoutes.map((route) => route.id),
    })
    routes.push(...modelRoutes)
  }
  return { catalogVersion: catalog.catalogVersion, limits: catalog.limits || {}, models, routes }
}

/** Whitelist reads and translate panel settings into the upstream MCP contract. */
export function estimateArguments(settings) {
  if (!settings || typeof settings.modelId !== 'string' || typeof settings.routeId !== 'string'
    || typeof settings.aspectRatio !== 'string' || typeof settings.resolution !== 'string'
    || !Number.isInteger(settings.count) || settings.count < 1 || settings.count > 4
    || (settings.quality != null && !['low', 'medium', 'high'].includes(settings.quality))) {
    throw new Error('生图参数不完整，请重新选择模型、线路和规格')
  }
  return {
    media_type: 'image', model_id: settings.modelId,
    route_ids: [settings.routeId], ratio: settings.aspectRatio,
    ...(settings.resolution === '标准' ? {} : { resolution: settings.resolution }),
    ...(settings.quality ? { quality: settings.quality } : {}),
    count_per_route: settings.count,
    // This phase does not read/send the user's conversation or create a task.
    prompt: 'AIyting 生图参数报价',
  }
}

export function normalizeQuote(data, settings) {
  if (data?.modelId !== settings.modelId || data.mediaType !== 'image'
    || data.catalogVersion !== settings.catalogVersion
    || !Array.isArray(data.routes) || data.routes.length !== 1 || data.routes[0].routeId !== settings.routeId
    || data.countPerRoute !== settings.count || numberOrNull(data.chargedCredits) === null
    || data.normalizedParams?.ratio !== settings.aspectRatio
    || (settings.resolution !== '标准' && data.normalizedParams?.resolution !== settings.resolution)
    || (settings.quality && data.normalizedParams?.quality !== settings.quality)) {
    throw new Error('报价与当前参数不一致，请刷新目录后重新确认')
  }
  return { ...data, chargedCredits: data.chargedCredits }
}

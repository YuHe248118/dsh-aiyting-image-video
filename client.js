/**
 * AIyting image-settings panel for the DSH composer.
 *
 * The Host supplies the live MCP catalog and quotes. Credentials stay on the Host.
 */
window.__ModuleLoader__.load({
  id: '@local/aiyting-ui',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /* ---------------------------------------------------------------- theme tokens */

    const T = {
      text: 'var(--dsw-alias-label-primary, #1f2328)',
      sub: 'var(--dsw-alias-label-secondary, #5b636b)',
      cap: 'var(--dsw-alias-label-caption, #8b939b)',
      line: 'var(--dsw-alias-border-l2, rgba(127,127,127,.28))',
      lineSoft: 'var(--dsw-alias-border-l1, rgba(127,127,127,.16))',
      card: 'var(--dsw-alias-bg-layer-1, rgba(127,127,127,.06))',
      cardHover: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))',
      overlay: 'var(--dsw-alias-bg-mask-1, rgba(0,0,0,.45))',
      brand: 'var(--dsw-alias-brand-primary, #3f7dfb)',
      ok: '#22a06b',
      warn: '#d98b0b',
      bad: '#d9534f',
    }

    const font = 'var(--dsw-font-family, system-ui, -apple-system, "Segoe UI", sans-serif)'

    // Reuse the four paths of the project's official public/logo.svg.
    const BRAND_PATHS = [{"d":"M108.9,480.32a11.42,11.42,0,0,0,1.6-.49c1-.5,2-1.08,3.08-1.59A77.69,77.69,0,0,1,136,471.67a212,212,0,0,1,29.25-2,85.2,85.2,0,0,0,17.39-2.49c9.57-2.17,17.87-6.82,25.55-12.77.14-.11.28-.21.41-.33,1.47-1.28,1.57-1.66.86-3.46-.46-1.16-.95-2.3-1.47-3.43q-10.29-22.71-20.62-45.42a20.32,20.32,0,0,0-1.09-2.13c-.15-.26-.5-.41-.78-.62a3.8,3.8,0,0,0-1.42,2.31q-3.37,8.7-6.73,17.41-7.28,18.78-14.54,37.55c-1.35,3.49-1.51,3.57-5.25,3.61-2.85,0-5.69.11-8.54.17-.71,0-1.43.07-2.13,0-1.41-.07-1.89-.76-1.48-2.14.26-.85.62-1.66.94-2.49q7.45-19.14,14.9-38.27,6.39-16.41,12.82-32.79c.49-1.24,1.07-2.44,1.6-3.67,2.28-5.38,10.36-9,17-2.91a14.24,14.24,0,0,1,3.15,4.6c2,4.35,4,8.7,6,13.08q9.23,20.56,18.42,41.14c.36.79.55,1.72,1.43,2.18.89,0,1.2-.65,1.58-1.22a67.54,67.54,0,0,0,6.28-12c.41-1,.77-2,1.15-3,.23-.58.43-1.17.7-1.73.79-1.6,1.73-1.67,2.71-.21.25.37.46.77.68,1.16,2,3.54,4,7.14,6.14,10.62a4.28,4.28,0,0,1,.26,4.49,79.06,79.06,0,0,1-17.07,24,94.21,94.21,0,0,1-10,8.39,82.88,82.88,0,0,1-31,13.67,96.52,96.52,0,0,1-20.63,2.27,151.42,151.42,0,0,0-22.61,1.53,74.76,74.76,0,0,0-15.76,3.9A57.41,57.41,0,0,0,99,508.94a65.78,65.78,0,0,0-4.7,6.8,16.46,16.46,0,0,0-2.45,9.15,13.05,13.05,0,0,0,12.5,12.52c6,.16,10.46-2.37,13.2-7.77a41.19,41.19,0,0,0,1.67-3.92c3-7.61,5.91-15.25,8.9-22.86,1.51-3.85,1.54-3.91,5.66-4.68,3.49-.65,7-1.1,10.54-1.62a3.76,3.76,0,0,1,1.06,0,1.16,1.16,0,0,1,1,1.31,15,15,0,0,1-.69,2.55q-2.65,7-5.36,13.94c-2.11,5.48-4.25,10.94-6.36,16.41a56.61,56.61,0,0,1-3.71,8,29.42,29.42,0,0,1-29.28,14.06A29,29,0,0,1,77,530.4a27,27,0,0,1,.91-15.5c2-5.33,4.08-10.62,6.18-15.91q14-35.46,28.09-70.91,13.11-33.25,26.11-66.54c2.37-6,4.68-12.1,7.1-18.12a56,56,0,0,1,3.06-6.51c6-10.8,15.45-17.06,27.42-19.29a35.81,35.81,0,0,1,25.64,4.92,42,42,0,0,1,14.83,15c4.28,7.39,8.41,14.86,12.63,22.28q10.61,18.67,21.24,37.33,9.35,16.32,18.81,32.58a6,6,0,0,1,.7,5.06,95,95,0,0,0-3.36,17c-.1.89,0,2.22-1.23,2.35-1,.1-1.25-1.11-1.66-1.86-3.66-6.61-7.23-13.28-11-19.84q-12-21.11-24.16-42.12-12.9-22.44-25.81-44.86a27.94,27.94,0,0,0-5.82-7.25c-8.51-7.48-21.64-6.87-29.18-.2a26,26,0,0,0-7.35,10.3c-3.28,8.55-6.65,17.07-10,25.59Q133,417.49,115.9,461q-3.23,8.19-6.46,16.37A4.42,4.42,0,0,0,108.9,480.32Z","transform":"translate(-76.26 -316.85)"},{"d":"M426.37,454.24q0-30.56,0-61.11c0-2.76,0-5.52.17-8.27a26.74,26.74,0,0,1,20.69-24.22,36.5,36.5,0,0,1,8.47-.89c2.66.05,5.34,0,8-.18a14.33,14.33,0,0,0,4.15-.85c6-2.27,9-7.07,8.61-13.57-.44-8-6.49-11.63-12.24-12.14-.71-.06-1.42-.05-2.13-.05-8.72,0-17.44.11-26.16.13-10.58,0-21.16,0-31.75,0-12.72,0-25.44.07-38.16,0a23.71,23.71,0,0,0-17.73,7.31,25.1,25.1,0,0,0-2.36,2.88c-.72,1-1.34,2.1-2,3.18q-6.44,11.37-12.85,22.77-10.29,18.38-20.54,36.8c-2.59,4.66-5.17,9.33-7.68,14a95.78,95.78,0,0,0-10.4,32.6,116,116,0,0,0-1.06,15.69c.05,12.55,0,25.09,0,37.63,0,.8,0,1.61,0,2.41a9.36,9.36,0,0,1-7.85,8.84,36.83,36.83,0,0,1-5.85.16c-1.2,0-1.73-.68-1.88-1.88a16.79,16.79,0,0,1-.08-2.13c0-15.74-.05-31.49,0-47.24,0-3.72.41-7.45.79-11.17a131.62,131.62,0,0,1,2.43-15.8,101.85,101.85,0,0,1,9.35-24.91c5.65-10.69,11.55-21.25,17.39-31.83q10.5-19.05,21.08-38,2.14-3.85,4.43-7.61c7-11.43,17.23-17.92,30.47-19.73a23.7,23.7,0,0,1,2.92-.15H377q42.57,0,85.14-.09a29.89,29.89,0,0,1,10.75,1.63c10.75,4.08,17.33,11.71,19.53,23.07A29,29,0,0,1,475.58,373a31.48,31.48,0,0,1-13.47,2.79c-2.76-.07-5.52-.11-8.27-.07a12.16,12.16,0,0,0-8.66,3.56,9.92,9.92,0,0,0-3,6.64c-.05.89,0,1.78,0,2.67q0,26.69,0,53.38,0,17.75,0,35.49c0,15.75.08,31.5-.14,47.24a27.57,27.57,0,0,1-10.83,22.25,28.83,28.83,0,0,1-20.21,6.14c-11.86-.73-22.76-9.68-25.88-21.36a35.8,35.8,0,0,1-1.14-9.23q0-65.26,0-130.51c0-.63,0-1.25,0-1.87.1-1.78.51-2.46,2.27-2.78q5.51-1,11.06-1.73c1.53-.2,2.13.42,2.22,1.94.06.88,0,1.78,0,2.67q0,65.39,0,130.77a34.64,34.64,0,0,0,.35,5.58,13.26,13.26,0,0,0,26.19-.53,35.06,35.06,0,0,0,.27-5.33q0-33.23,0-66.46Z","transform":"translate(-76.26 -316.85)"},{"d":"M426.71,360.62a9,9,0,0,1-.9,1.64,52.2,52.2,0,0,0-7.36,11.08,3.74,3.74,0,0,1-3.8,2.29c-6.23-.05-12.46-.07-18.68.08Q378.6,376.12,368,390a86.4,86.4,0,0,0-6.61,10.63q-9.78,17.44-19.52,34.92a62.34,62.34,0,0,0-8.07,31.15c0,12.54,0,25.08,0,37.63a56.74,56.74,0,0,1-2.52,16.81,42.93,42.93,0,0,1-9,15.89,45.35,45.35,0,0,1-28.9,15.68c-14.91,1.93-27.94-2.57-38.93-12.79a50,50,0,0,1-11.65-16.43c-6.49-14.53-13.1-29-19.66-43.5-.29-.65-.6-1.29-.86-2a2.29,2.29,0,0,1,.74-2.86c.2-.16.42-.32.62-.49,2.53-2.11,5.07-4.21,7.57-6.34s3-1.91,4.24.86c3.37,7.55,6.7,15.12,10.14,22.64,4.22,9.21,8.54,18.38,12.81,27.57a28.48,28.48,0,0,0,10.31,12.33c10.23,6.63,21,8,32.14,2.56a29.68,29.68,0,0,0,15.71-18.63,39.92,39.92,0,0,0,1.76-12.1c0-11.92,0-23.84,0-35.76a99,99,0,0,1,1.28-14.6c.28-1.93.68-3.85,1-5.78a59.11,59.11,0,0,1,7-18.62q11.91-21.32,24-42.54a53.87,53.87,0,0,1,6.47-9.44,50.07,50.07,0,0,1,26.76-15.57,77.92,77.92,0,0,1,17.23-1.58c7,0,14.06,0,21.09,0C424.28,359.67,425.49,359.47,426.71,360.62Z","transform":"translate(-76.26 -316.85)"},{"d":"M226.65,317.82a57.64,57.64,0,0,1,11.45.08,34.87,34.87,0,0,1,22.17,12.17,27.5,27.5,0,0,1,2.93,4.44q9.74,17.34,19.39,34.7,4,7.23,8.08,14.44c.21.39.43.77.65,1.16a3.25,3.25,0,0,1,0,3.31l-6.2,11.2a4.42,4.42,0,0,1-.63.86,1.28,1.28,0,0,1-2.08.06,26.93,26.93,0,0,1-2.05-3.11q-3.46-6.17-6.87-12.36-11-19.81-22-39.65c-.56-1-1.12-2-1.75-3a19.93,19.93,0,0,0-16.95-9.49,34.94,34.94,0,0,0-4.79.24,3.43,3.43,0,0,1-3.56-1.81,58,58,0,0,0-8.1-10.23,3.27,3.27,0,0,1-.69-.81,3,3,0,0,1-.41-1.46c.09-.62.76-.66,1.29-.69.8,0,1.6-.05,2.4-.05Z","transform":"translate(-76.26 -316.85)"}]
    function BrandMark({ size = 24, width, className } = {}) {
      return h('svg', { width: width || Math.round(size * 1.76), height: size, viewBox: '0 0 416.6 236.29',
        className, 'data-aiyting-logo': true, 'aria-hidden': true, focusable: 'false',
        style: { display: 'block', flexShrink: 0 } },
        BRAND_PATHS.map((attributes, index) => h('path', Object.assign({ key: index, fill: 'currentColor' }, attributes))))
    }

    const STATUS = {
      ok: { label: '可用', color: T.ok },
      busy: { label: '高负载', color: T.warn },
      down: { label: '维护中', color: T.bad },
      unknown: { label: '状态未知', color: T.cap },
    }

    /* ---------------------------------------------------------------- name resolution */

    function normalize(value) {
      return String(value == null ? '' : value)
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\s._\-()（）·、,，]/g, '')
    }

    function editDistance(a, b) {
      const m = a.length
      const n = b.length
      if (!m) return n
      if (!n) return m
      let prev = new Array(n + 1)
      let cur = new Array(n + 1)
      for (let j = 0; j <= n; j += 1) prev[j] = j
      for (let i = 1; i <= m; i += 1) {
        cur[0] = i
        for (let j = 1; j <= n; j += 1) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1
          cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        }
        const swap = prev
        prev = cur
        cur = swap
      }
      return prev[n]
    }

    function modelTerms(model) {
      return [model.id, model.name].concat(model.aliases || [])
    }

    /** Mirrors the site's three-state resolution: resolved / ambiguous / unavailable. */
    function resolveMention(query, MODELS) {
      const q = normalize(query)
      if (!q) return { kind: 'empty', candidates: [] }

      const exact = MODELS.filter((m) => modelTerms(m).some((term) => normalize(term) === q))
      if (exact.length === 1) return { kind: 'exact', model: exact[0], candidates: exact }
      if (exact.length > 1) return { kind: 'ambiguous', candidates: exact }

      const partial = MODELS.filter((m) => modelTerms(m).some((term) => normalize(term).includes(q)))
      if (partial.length === 1) return { kind: 'partial', model: partial[0], candidates: partial }
      if (partial.length > 1) return { kind: 'ambiguous', candidates: partial }

      const fuzzy = MODELS.filter((m) =>
        modelTerms(m).some((term) => {
          const t = normalize(term)
          return t.length > 2 && editDistance(t, q) <= (q.length > 6 ? 2 : 1)
        }),
      )
      if (fuzzy.length === 1) return { kind: 'fuzzy', model: fuzzy[0], candidates: fuzzy }
      if (fuzzy.length > 1) return { kind: 'ambiguous', candidates: fuzzy }

      return { kind: 'none', candidates: [] }
    }

    function visibleModels(query, MODELS) {
      const q = normalize(query)
      if (!q) return MODELS
      const hit = resolveMention(query, MODELS)
      if (hit.model) return [hit.model].concat(MODELS.filter((m) => m.id !== hit.model.id))
      if (hit.candidates.length) return hit.candidates
      return MODELS.filter((m) => modelTerms(m).some((term) => normalize(term).includes(q)))
    }

    /* ---------------------------------------------------------------- helpers */

    function routeById(id, ROUTES, modelId) {
      return ROUTES.find((r) => r.id === id && r.modelId === modelId)
    }

    function modelById(id, MODELS) {
      return MODELS.find((m) => m.id === id)
    }

    function resolutionsFor(model, route) {
      return model && route ? model.resolutions.filter((res) => route.resolutions.includes(res)) : []
    }

    function quoteKey(settings, catalog) {
      return JSON.stringify([catalog && catalog.accountRevision, catalog && catalog.catalogVersion, settings.modelId, settings.routeId,
        settings.aspectRatio, settings.resolution, settings.quality, settings.count])
    }

    function summaryOf(settings, catalog) {
      if (!catalog) return '连接 AIyting 目录'
      const model = modelById(settings.modelId, catalog.models)
      const route = routeById(settings.routeId, catalog.routes, settings.modelId)
      if (!model || !route) return '请选择可用的模型与线路'
      const parts = [model.name, route.name, settings.aspectRatio, settings.resolution]
      if (settings.quality) parts.push(settings.quality)
      parts.push(settings.count + '张')
      return parts.join(' · ')
    }

    function reconcile(settings, catalog) {
      const model = modelById(settings.modelId, catalog.models)
      if (!model) return settings
      const next = Object.assign({}, settings)
      const candidates = catalog.routes.filter((r) => r.modelId === model.id && r.available)
      let route = routeById(next.routeId, candidates, model.id)
      if (!route) route = candidates.find((r) => r.recommended) || candidates[0]
      if (!route) return Object.assign(next, { routeId: null })
      next.routeId = route.id
      if (!route.ratios.includes(next.aspectRatio)) next.aspectRatio = route.defaults.ratio || route.ratios[0]
      if (route.qualities) {
        if (!route.qualities.includes(next.quality)) next.quality = route.qualities.includes('medium') ? 'medium' : route.qualities[0]
      } else next.quality = null
      const resolutions = resolutionsFor(model, route)
      if (!resolutions.includes(next.resolution)) next.resolution = resolutions[resolutions.length - 1]
      return next
    }

    function pricesFor(route, settings) {
      const price = {}
      route.resolutions.forEach((resolution) => {
        const params = { mode: 'text-to-image', inputMode: 'text-to-image', ratio: settings.aspectRatio,
          resolution: resolution === '标准' ? undefined : resolution, quality: settings.quality }
        const matches = (route.pricing && route.pricing.variants || []).filter((variant) =>
          Object.entries(variant.match || {}).every(([key, value]) => params[key] === value))
        const values = [...new Set(matches.map((variant) => variant.unitPriceCredits))]
        price[resolution] = route.pricing && route.pricing.billingUnit === 'request' && values.length === 1
          && typeof values[0] === 'number' && Number.isFinite(values[0]) && values[0] >= 0 ? values[0] : null
      })
      return price
    }

    const priceLabel = (price) => price == null ? '待报价' : price + '点'

    /* ---------------------------------------------------------------- styles */

    const chip = (active, disabled) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      borderRadius: 999,
      border: '1px solid ' + (active ? T.brand : T.line),
      background: active ? 'color-mix(in srgb, ' + T.brand + ' 14%, transparent)' : 'transparent',
      color: disabled ? T.cap : active ? T.brand : T.sub,
      font: '500 12px/1.4 ' + font,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
    })

    const sectionTitle = {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '600 13px/1.4 ' + font,
      color: T.text,
      margin: '0 0 8px',
    }

    const stepBadge = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      borderRadius: 6,
      background: T.card,
      color: T.sub,
      font: '600 11px/1 ' + font,
    }

    const cardStyle = (active) => ({
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid ' + (active ? T.brand : T.lineSoft),
      background: active ? 'color-mix(in srgb, ' + T.brand + ' 8%, transparent)' : T.card,
      cursor: 'pointer',
      textAlign: 'left',
    })

    /* ---------------------------------------------------------------- panel */

    function Panel(props) {
      const { settings, onChange, onApply, onClose, onSetDefault, isDefault,
        catalog, loading, error, onRefresh, quote, canApply, defaultMode, saving } = props
      const [query, setQuery] = React.useState('')
      const [tab, setTab] = React.useState('image')

      const MODELS = catalog ? catalog.models : []
      const ROUTES = (catalog ? catalog.routes : []).filter((item) => item.modelId === settings.modelId)
        .map((item) => Object.assign({}, item, { price: pricesFor(item, settings) }))
      const model = modelById(settings.modelId, MODELS)
      const route = routeById(settings.routeId, ROUTES, settings.modelId)
      const resolutions = resolutionsFor(model, route)
      const cost = canApply ? quote.value.chargedCredits : null
      const hit = resolveMention(query, MODELS)
      const listed = visibleModels(query, MODELS)

      React.useEffect(() => {
        if (defaultMode) return
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose, defaultMode])

      const pickModel = (next) => onChange(reconcile(Object.assign({}, settings, { modelId: next.id }), catalog))

      const hint = (() => {
        if (!query.trim()) return null
        if (hit.kind === 'exact' || hit.kind === 'partial' || hit.kind === 'fuzzy') {
          const via = hit.kind === 'exact' ? '别名/名称精确命中' : hit.kind === 'partial' ? '名称包含命中' : '模糊匹配（可能有错别字）'
          return { tone: 'ok', text: '识别为：' + hit.model.name + '（' + via + '）' }
        }
        if (hit.kind === 'ambiguous') {
          return { tone: 'warn', text: '命中 ' + hit.candidates.length + ' 个版本，请从下面选择具体版本' }
        }
        return { tone: 'bad', text: '没有匹配的模型，换个说法或从列表里选' }
      })()

      const modelRow = (item) => {
        const active = item.id === settings.modelId
        const resolved = Boolean(hit.model) && hit.model.id === item.id
        const dimmed = Boolean(query.trim()) && Boolean(hit.model) && !resolved
        return h('div', {
          key: item.id,
          'data-model-card': item.id,
          'aria-pressed': active,
          title: item.name + ' · ' + item.id,
          style: Object.assign(
            cardStyle(active),
            resolved && !active ? { borderColor: T.brand } : null,
            dimmed ? { opacity: 0.5 } : null,
          ),
          onClick: () => pickModel(item),
          onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pickModel(item) } },
          role: 'button',
          tabIndex: 0,
        },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
            h('span', { style: { font: '600 13px/1.4 ' + font, color: T.text } }, item.name),
            h('span', { style: { font: '400 11px/1.4 ' + font, color: T.cap } }, item.vendor),
            active ? h('span', { style: { marginLeft: 'auto', color: T.brand, font: '600 12px/1 ' + font } }, '已选') : null),
          defaultMode ? null : h('div', { style: { font: '400 11px/1.5 ' + font, color: T.cap } }, item.id),
          h('div', { className: 'aiyting-model-note', style: { font: '400 12px/1.5 ' + font, color: T.sub } }, item.note),
          defaultMode ? null : h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 } },
            item.aliases.slice(0, 3).map((alias) =>
              h('span', {
                key: alias,
                style: {
                  padding: '1px 6px',
                  borderRadius: 6,
                  background: T.card,
                  border: '1px solid ' + T.lineSoft,
                  color: T.cap,
                  font: '400 11px/1.5 ' + font,
                },
              }, alias))),
        )
      }

      const routeRow = (item) => {
        const active = item.id === settings.routeId
        const supported = Boolean(model) && model.routes.includes(item.id)
        const usable = supported && item.available
        const status = STATUS[item.status] || STATUS.unknown
        return h('div', {
          key: item.id,
          'data-route-card': item.id,
          role: 'button', tabIndex: usable ? 0 : -1, 'aria-pressed': active, 'aria-disabled': !usable,
          onKeyDown: (event) => {
            if (usable && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault(); onChange(reconcile(Object.assign({}, settings, { routeId: item.id }), catalog))
            }
          },
          style: Object.assign(cardStyle(active), usable ? null : { opacity: 0.5, cursor: 'not-allowed' }),
          onClick: () => {
            if (!usable) return
            onChange(reconcile(Object.assign({}, settings, { routeId: item.id }), catalog))
          },
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', { style: { width: 7, height: 7, borderRadius: 999, background: status.color } }),
            h('span', { style: { font: '600 13px/1.4 ' + font, color: T.text } }, item.name),
            h('span', { style: { font: '400 11px/1.4 ' + font, color: status.color } }, status.label),
            h('span', { style: { marginLeft: 'auto', font: '400 11px/1.4 ' + font, color: T.cap } },
              '成功率 ' + (item.successRate == null ? '未知' : Math.round(item.successRate * 100) + '%')
                + ' · ' + (item.avgSeconds == null ? '耗时未知' : '约 ' + item.avgSeconds + 's')),
            active ? h('span', { style: { color: T.brand, font: '600 12px/1 ' + font } }, '已选') : null),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            Object.keys(item.price).map((res) =>
              h('span', {
                key: res,
                style: {
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid ' + T.lineSoft,
                  color: T.sub,
                  font: '400 11px/1.6 ' + font,
                },
              }, res + ' ' + priceLabel(item.price[res])))),
          usable ? null : h('div', { style: { font: '400 11px/1.5 ' + font, color: T.cap } },
            supported ? '该线路当前不可用' : '该模型不支持此线路'),
        )
      }

      const tabButton = (id, label, enabled) => h('button', {
        key: id,
        disabled: !enabled,
        onClick: () => enabled && setTab(id),
        style: {
          padding: '6px 12px',
          border: 'none',
          borderBottom: '2px solid ' + (tab === id ? T.brand : 'transparent'),
          background: 'transparent',
          color: !enabled ? T.cap : tab === id ? T.text : T.sub,
          font: '600 13px/1.4 ' + font,
          cursor: enabled ? 'pointer' : 'not-allowed',
        },
      }, label)

      return h('div', {
        'data-aiyting-inline-panel': defaultMode || undefined,
        className: defaultMode ? 'aiyting-inline-editor' : undefined,
        style: defaultMode ? { minWidth: 0, width: '100%' } : {
          position: 'fixed',
          inset: 0,
          zIndex: 2147483000,
          background: T.overlay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        },
        onMouseDown: defaultMode ? undefined : onClose,
      },
        h('div', {
          role: defaultMode ? 'region' : 'dialog',
          'aria-label': 'AIyting 生图参数',
          onMouseDown: (event) => event.stopPropagation(),
          style: defaultMode ? { minWidth: 0, color: T.text, font: '400 13px/1.5 ' + font } : {
            width: 'min(760px, 94vw)',
            maxHeight: '84vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 14,
            border: '1px solid ' + T.line,
            background: 'var(--dsw-alias-bg-layer-3, #ffffff)',
            color: T.text,
            font: '400 13px/1.5 ' + font,
            boxShadow: '0 18px 48px rgba(0,0,0,.28)',
            overflow: 'hidden',
          },
        },
          // header
          defaultMode ? null : h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderBottom: '1px solid ' + T.lineSoft,
            },
          },
            h(BrandMark, { size: 19, width: 32 }),
            h('span', { style: { font: '600 14px/1.4 ' + font } }, 'AIyting 生图参数'),
            h('span', {
              style: {
                padding: '1px 7px',
                borderRadius: 6,
                border: '1px solid ' + T.lineSoft,
                color: T.cap,
                font: '400 11px/1.6 ' + font,
              },
            }, '实时模型目录'),
            h('button', {
              onClick: onClose,
              'aria-label': '关闭',
              style: {
                marginLeft: 'auto',
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid ' + T.lineSoft,
                background: 'transparent',
                color: T.sub,
                cursor: 'pointer',
                font: '400 14px/1 ' + font,
              },
            }, '×')),

          // tabs
          defaultMode ? null : h('div', { style: { display: 'flex', gap: 4, padding: '0 12px', borderBottom: '1px solid ' + T.lineSoft } },
            tabButton('image', '生图', true),
            tabButton('video', '生视频（二期）', false)),

          // body
          h('div', { className: 'aiyting-editor-body', style: { padding: defaultMode ? 0 : 16, overflowY: defaultMode ? undefined : 'auto', display: 'flex', flexDirection: 'column', gap: defaultMode ? 24 : 18 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, color: error ? T.bad : T.cap } },
              h('span', { role: error ? 'alert' : 'status', style: { flex: 1 } }, loading ? '正在读取 AIyting 目录…'
                : error || (MODELS.length ? '目录价以当前规格显示，最终用量以服务端报价为准。' : '当前没有可用的文生图模型。')),
              h('button', { type: 'button', onClick: onRefresh, disabled: loading, style: chip(false, loading) }, '刷新目录')),
            quote.error ? h('div', { role: 'alert', style: { color: T.bad } }, quote.error) : null,
            h('div', { className: 'aiyting-editor-section' },
              h('div', { style: sectionTitle }, h('span', { style: stepBadge }, '1'), '选择模型'),
              h('input', {
                value: query,
                onChange: (event) => setQuery(event.target.value),
                placeholder: '输入模型名或简称，例如「香蕉2」「GPT生图2」',
                style: {
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid ' + T.line,
                  background: 'transparent',
                  color: T.text,
                  font: '400 13px/1.5 ' + font,
                  outline: 'none',
                },
              }),
              hint ? h('div', {
                style: {
                  marginTop: 6,
                  font: '400 12px/1.5 ' + font,
                  color: hint.tone === 'ok' ? T.ok : hint.tone === 'warn' ? T.warn : T.bad,
                },
              }, hint.text) : null,
              h('div', { className: 'aiyting-model-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))', gap: 9, marginTop: 12, maxHeight: defaultMode ? undefined : query.trim() ? 260 : 232, overflowY: defaultMode ? undefined : 'auto' } },
                listed.map(modelRow))),

            model ? h('div', { className: 'aiyting-editor-section' },
              h('div', { style: sectionTitle }, h('span', { style: stepBadge }, '2'), '选择线路'),
              h('div', { className: defaultMode ? 'aiyting-route-grid' : undefined, style: { display: 'grid', gridTemplateColumns: defaultMode ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 9 } }, ROUTES.map(routeRow))) : null,

            model ? h('div', { className: 'aiyting-editor-section' },
              h('div', { style: sectionTitle }, h('span', { style: stepBadge }, '3'), '规格参数'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                  h('span', { style: { width: 56, color: T.cap, font: '400 12px/1.5 ' + font } }, '比例'),
                  model.ratios.map((ratio) => h('button', {
                    key: ratio,
                    disabled: !route || !route.ratios.includes(ratio),
                    style: chip(settings.aspectRatio === ratio, !route || !route.ratios.includes(ratio)),
                    onClick: () => onChange(Object.assign({}, settings, { aspectRatio: ratio })),
                  }, ratio))),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                  h('span', { style: { width: 56, color: T.cap, font: '400 12px/1.5 ' + font } }, '分辨率'),
                  model.resolutions.map((res) => {
                    const usable = resolutions.includes(res)
                    return h('button', {
                      key: res,
                      disabled: !usable,
                      style: chip(settings.resolution === res, !usable),
                      onClick: () => usable && onChange(Object.assign({}, settings, { resolution: res })),
                    }, res + (usable ? ' · ' + priceLabel(route.price[res]) : ' 不支持'))
                  })),
                model.qualities ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                  h('span', { style: { width: 56, color: T.cap, font: '400 12px/1.5 ' + font } }, '质量'),
                  model.qualities.map((quality) => h('button', {
                    key: quality,
                    disabled: !route || !route.qualities || !route.qualities.includes(quality),
                    style: chip(settings.quality === quality, !route || !route.qualities || !route.qualities.includes(quality)),
                    onClick: () => onChange(Object.assign({}, settings, { quality })),
                  }, quality))) : null,
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                  h('span', { style: { width: 56, color: T.cap, font: '400 12px/1.5 ' + font } }, '张数'),
                  [1, 2, 3, 4].map((count) => h('button', {
                    key: count,
                    style: chip(settings.count === count, false),
                    onClick: () => onChange(Object.assign({}, settings, { count })),
                  }, count + '张'))))) : null),

            // Confirm the selected parameters and current quote before saving.
            h('div', {
              className: 'aiyting-quote-summary',
              style: {
                padding: '10px 16px',
                borderTop: '1px dashed ' + T.line,
                color: T.sub,
                font: '400 12px/1.6 ' + font,
              },
            },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' } },
                h('span', null, '本次将使用：' + summaryOf(settings, catalog)),
                h('span', { style: { marginLeft: 'auto', color: T.text, font: '600 12px/1.6 ' + font } },
                  '预计 ' + (cost === null ? (quote.status === 'loading' ? '报价中…' : '—') : cost + ' 点')
                    + (route ? '（' + route.name + ' · ' + settings.resolution + ' · ' + settings.count + '张）' : ''))),
              h('div', { style: { color: T.cap } },
                '价格以实时报价为准。保存参数不会生成图片或扣费。')),

          // footer
          h('div', {
            className: 'aiyting-editor-actions',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderTop: '1px solid ' + T.lineSoft,
            },
          },
            defaultMode ? h('span', { style: { color: T.sub, fontSize: 12 } }, '保存为新对话的默认选择') : h('label', {
              style: { display: 'flex', alignItems: 'center', gap: 6, color: T.sub, font: '400 12px/1.5 ' + font, cursor: 'pointer' },
            },
              h('input', {
                type: 'checkbox',
                checked: isDefault,
                onChange: (event) => onSetDefault(event.target.checked),
              }),
              '同时设为默认'),
            h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8 } },
              defaultMode ? null : h('button', {
                onClick: onClose,
                style: {
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid ' + T.line,
                  background: 'transparent',
                  color: T.sub,
                  font: '500 13px/1.4 ' + font,
                  cursor: 'pointer',
                },
              }, '取消'),
              h('button', {
                onClick: onApply,
                disabled: !canApply,
                style: {
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: '1px solid ' + T.brand,
                  background: T.brand,
                  color: '#fff',
                  font: '600 13px/1.4 ' + font,
                  cursor: canApply ? 'pointer' : 'not-allowed',
                  opacity: canApply ? 1 : 0.55,
                },
              }, saving ? '保存中…' : defaultMode ? '保存默认参数' : '应用到当前对话'))),
        ))
    }

    /* ---------------------------------------------------------------- composer activity */

    function Activity(props) {
      const { locked, onActiveChange, request, sessionId, defaultMode, subscribe, onSaved } = props
      const [open, setOpen] = React.useState(Boolean(defaultMode))
      const [settings, setSettings] = React.useState(INITIAL)
      const [isDefault, setIsDefault] = React.useState(false)
      const [catalog, setCatalog] = React.useState(null)
      const [preferences, setPreferences] = React.useState(null)
      const [loading, setLoading] = React.useState(false)
      const [error, setError] = React.useState('')
      const [saveError, setSaveError] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const [reload, setReload] = React.useState(0)
      const [quoteTick, setQuoteTick] = React.useState(0)
      const [quote, setQuote] = React.useState({ status: 'idle' })
      const scope = defaultMode ? null : sessionId
      const key = quoteKey(settings, catalog)
      const route = catalog && routeById(settings.routeId, catalog.routes, settings.modelId)
      const canApply = !saving && !loading && !error && preferences && route && route.available && quote.key === key && quote.status === 'ready'

      React.useEffect(() => subscribe(() => {
        setCatalog(null); setQuote({ status: 'idle' }); setPreferences(null); setSettings(INITIAL)
        setReload((value) => value + 1)
      }), [subscribe])
      React.useEffect(() => {
        const controller = new AbortController()
        const refresh = () => request('get_connection', {}, controller.signal).then((current) => {
          if (!controller.signal.aborted && catalog && current.accountRevision !== catalog.accountRevision) {
            setCatalog(null); setQuote({ status: 'idle' }); setPreferences(null); setSettings(INITIAL)
            setReload((value) => value + 1)
          }
        }).catch(() => {})
        window.addEventListener('focus', refresh)
        return () => { controller.abort(); window.removeEventListener('focus', refresh) }
      }, [request, catalog])

      React.useEffect(() => {
        const controller = new AbortController()
        setLoading(true)
        setError('')
        setSaveError('')
        if (!defaultMode && !scope) {
          setError('AIyting 当前会话不可用，请返回对话后重试。'); setLoading(false)
          return () => controller.abort()
        }
        request('list_models', {}, controller.signal).then(async (next) => {
          const stored = await request('get_preferences', { sessionId: scope, accountRevision: next.accountRevision }, controller.signal)
          if (controller.signal.aborted) return
          setCatalog(next)
          setPreferences(stored)
          if (stored.settings) setSettings(stored.settings)
          else if (next.models.length) {
            const model = modelById(INITIAL.modelId, next.models) || next.models[0]
            setSettings(reconcile(Object.assign({}, INITIAL, { modelId: model.id }), next))
          }
        }).catch((failure) => {
          if (!controller.signal.aborted) setError(failure.message || 'AIyting 目录暂不可用，请刷新重试。')
        }).finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
        return () => controller.abort()
      }, [request, reload, scope])

      React.useEffect(() => {
        if (loading || error || (!open && !defaultMode) || !catalog || !route || !route.available) {
          setQuote({ status: 'idle' })
          return
        }
        const controller = new AbortController()
        setQuote({ status: 'loading', key })
        const timer = window.setTimeout(() => {
          request('estimate_cost', Object.assign({}, settings, { catalogVersion: catalog.catalogVersion, accountRevision: catalog.accountRevision }), controller.signal).then((value) => {
            if (!controller.signal.aborted) setQuote({ status: 'ready', key, value })
          }).catch((failure) => {
            if (!controller.signal.aborted) setQuote({ status: 'error', key, error: failure.message || 'AIyting 报价失败，请刷新重试。' })
          })
        }, 250)
        return () => { controller.abort(); window.clearTimeout(timer) }
      }, [request, open, defaultMode, loading, error, key, catalog, quoteTick])

      React.useEffect(() => {
        if ((!open && !defaultMode) || quote.status !== 'ready') return
        const timer = window.setTimeout(() => setQuoteTick((value) => value + 1), 100000)
        return () => window.clearTimeout(timer)
      }, [open, defaultMode, quote])

      React.useEffect(() => () => { if (onActiveChange) onActiveChange(false) }, [onActiveChange])

      const toggle = () => {
        const next = !open
        setOpen(next)
        if (onActiveChange) onActiveChange(next)
      }

      const close = () => {
        if (saving) return
        setOpen(false)
        if (onActiveChange) onActiveChange(false)
      }

      const apply = async () => {
        if (!canApply) return
        setSaving(true); setSaveError('')
        try {
          const saved = await request('save_preferences', {
            sessionId: scope, settings: Object.assign({}, settings, { catalogVersion: catalog.catalogVersion }),
            revision: preferences.revision, accountRevision: catalog.accountRevision,
            receipt: quote.value.receipt, makeDefault: Boolean(defaultMode || isDefault),
          })
          setPreferences(saved)
          // Saving consumes the receipt; the inline editor needs a fresh quote for its next save.
          if (defaultMode) { setQuote({ status: 'idle' }); setQuoteTick((value) => value + 1) }
          setOpen(false)
          if (onActiveChange) onActiveChange(false)
          if (onSaved) onSaved()
        } catch (failure) { setSaveError(failure.message) }
        finally { setSaving(false) }
      }

      const pill = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 340,
        height: 28,
        padding: '0 10px',
        borderRadius: 999,
        border: '1px solid ' + (open ? T.brand : T.line),
        background: open ? 'color-mix(in srgb, ' + T.brand + ' 12%, transparent)' : 'transparent',
        color: T.text,
        font: '500 12px/1 ' + font,
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.6 : 1,
      }

      return h(React.Fragment, null,
        defaultMode ? null : h('button', {
          type: 'button',
          disabled: locked,
          onClick: toggle,
          title: 'AIyting 生图参数',
          'aria-label': defaultMode ? '编辑默认生图参数' : 'AIyting 生图参数',
          style: pill,
        },
          h(BrandMark, { size: 15, width: 23 }),
          h('span', { style: { color: T.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
            summaryOf(settings, catalog))),
        (defaultMode || open) ? h(Panel, {
          settings,
          onChange: setSettings,
          onApply: apply,
          onClose: close,
          onSetDefault: setIsDefault,
          isDefault,
          catalog,
          loading,
          error: error || saveError,
          quote,
          canApply,
          defaultMode,
          saving,
          onRefresh: () => setReload((value) => value + 1),
        }) : null)
    }

    /* ---------------------------------------------------------------- plugin */

    const INITIAL = {
      modelId: 'gemini-3.1-flash-image-preview',
      routeId: null,
      aspectRatio: '1:1',
      resolution: '2K',
      quality: null,
      count: 1,
    }

    const pageCopy = {
      zh: {
        intro: '管理账号和点数，设定新对话的创作偏好。', account: '账号与连接', refresh: '刷新连接',
        workspace: '创作工作台', loading: '正在同步账号…', connected: '已连接', disconnected: '尚未连接', unknown: '连接待验证',
        balance: '可用点数', spent: '今日已用', limit: '每日上限', unlimited: '不限额',
        login: '登录 / 注册 AIyting', keys: '获取或管理接入密钥', key: 'AIyting 接入密钥',
        recharge: '充值与计费', overview: '账户概览', creditsUnit: '点', synced: '余额来自当前连接的账号',
        hint: '在官网创建接入密钥：要生图就不要勾选“仅查看模型和任务，不允许生图”；只查目录和报价时可勾选。',
        capModels: '模型目录', capQuote: '实时报价', capGenerate: '图片生成', capTask: '任务查询', capBalance: '点数查询',
        capTitle: '接入能力', capabilityHint: '以当前接入密钥的权限为准', available: '可用', unavailable: '未开放',
        shared: '密钥仅保存在本机，供本机的 AIyting 连接共用；保存后不会回显。',
        connect: '验证并连接', connecting: '正在验证…', logout: '退出登录', loggingOut: '正在退出…',
        logoutHint: '清除本机共用连接并取消待确认登录；官网登录和授权仍可在官网管理。',
        cancel: '取消', saved: '连接已保存。', removed: '已退出登录。',
        defaults: '默认生图参数', defaultsHint: '新对话沿用这里的选择，已有对话不受影响。',
        defaultSaved: '默认参数已保存。', connectFirst: '连接账号后可设置默认参数。',
        editorTag: '图片', links: '常用入口', manage: '管理连接', hideManage: '收起连接管理', keyLabel: '接入密钥',
        connectTitle: '登录 AIyting，开始创作', connectBody: '在官网确认授权后，这里会自动连接，无需复制密钥。',
        websiteLogin: '登录 AIyting', switchAccount: '切换账号', openAuthorization: '前往官网确认',
        loginStarting: '正在准备登录…', loginWaiting: '等待官网确认', loginCode: '核对授权码',
        loginCodeHint: '仅在你主动发起登录时确认，官网显示的授权码应与这里一致。',
        loginKeep: '确认后会自动连接。当前账号将在新连接验证成功后切换。',
        loginDenied: '你已拒绝本次授权。', loginExpired: '本次登录已过期，请重新发起。', loginCancelled: '本次登录已取消。',
        loginFailed: '登录暂未完成，请重试。', loginRetry: '重新登录', loginCancel: '取消本次登录',
        advanced: '高级设置 · 手动接入密钥',
        emptyTitle: '先连接账号，再开始设置', emptyBody: '连接后，模型、线路和价格将在这里实时显示。',
        usageHint: '每日额度已用', readOnly: '只保存偏好，不会生成图片或扣费',
        stage: '面板只读取目录与报价，保存参数不会生成图片或扣费；生成由对话里的生图工具提交，提交前会先报点数。', error: '连接暂不可用，请重试。',
      },
      en: {
        intro: 'Manage your account, credits and creative defaults for new conversations.', account: 'Account & connection', refresh: 'Refresh connection',
        workspace: 'Creative workspace', loading: 'Syncing account…', connected: 'Connected', disconnected: 'Not connected', unknown: 'Connection unverified',
        balance: 'Available credits', spent: 'Spent today', limit: 'Daily limit', unlimited: 'Unlimited',
        login: 'Sign in / register', keys: 'Get or manage an access key', key: 'AIyting access key',
        recharge: 'Credits & pricing', overview: 'Account overview', creditsUnit: 'credits', synced: 'Balance from your connected account',
        hint: 'Create a key on the website. Leave the read-only option unchecked to generate images; enable it for catalog-only access.',
        capModels: 'Model catalog', capQuote: 'Live quotes', capGenerate: 'Image generation', capTask: 'Task status', capBalance: 'Credit balance',
        capTitle: 'Available capabilities', capabilityHint: 'Based on your current access key', available: 'Available', unavailable: 'Unavailable',
        shared: 'Your key stays on this device and is shared by local AIyting connections. Saved keys are never displayed.',
        connect: 'Verify and connect', connecting: 'Verifying…', logout: 'Sign out', loggingOut: 'Signing out…',
        logoutHint: 'Clears the shared local connection and pending sign-in. Manage website sessions and authorizations on the website.',
        cancel: 'Cancel', saved: 'Connection saved.', removed: 'Signed out.',
        defaults: 'Default image settings', defaultsHint: 'New conversations inherit these choices. Existing conversations stay unchanged.',
        defaultSaved: 'Defaults saved.', connectFirst: 'Connect an account to set defaults.',
        editorTag: 'Images', links: 'Quick links', manage: 'Manage connection', hideManage: 'Close connection settings', keyLabel: 'Access key',
        connectTitle: 'Sign in to AIyting and start creating', connectBody: 'Approve on the website to connect automatically. No key copying needed.',
        websiteLogin: 'Sign in to AIyting', switchAccount: 'Switch account', openAuthorization: 'Continue on the website',
        loginStarting: 'Preparing sign-in…', loginWaiting: 'Waiting for website approval', loginCode: 'Check the authorization code',
        loginCodeHint: 'Approve only a sign-in you started. The website must show the same code.',
        loginKeep: 'Connects automatically after approval. Your current account stays connected until verification succeeds.',
        loginDenied: 'You declined this authorization.', loginExpired: 'This sign-in expired. Please start again.', loginCancelled: 'This sign-in was cancelled.',
        loginFailed: 'Sign-in did not complete. Please retry.', loginRetry: 'Try sign-in again', loginCancel: 'Cancel sign-in',
        advanced: 'Advanced · Manual access key',
        emptyTitle: 'Connect your account to begin', emptyBody: 'Your models, routes and live prices will appear here.',
        usageHint: 'of daily allowance used', readOnly: 'Saves preferences only. No images are generated or charged.',
        stage: 'The panel only reads catalogs and quotes; saving never creates images or charges credits. Generation runs through the chat tools and always quotes first.', error: 'Connection unavailable. Please retry.',
      },
    }

    function SidebarIcon({ size }) {
      return h(BrandMark, { size: size || 20, width: Math.round((size || 20) * 1.4) })
    }

    const PAGE_STYLE = `
      [data-aiyting-page]{--ai-accent:color-mix(in srgb,#8b5cf6 78%,var(--dsw-alias-label-primary,#1f2328));--dsw-alias-brand-primary:var(--ai-accent);--ai-surface:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.04));--ai-line:var(--dsw-alias-border-l1,rgba(127,127,127,.16));color:var(--dsw-alias-label-primary,#1f2328);font-family:${font};height:100%;overflow:auto}
      [data-aiyting-page] *{box-sizing:border-box}
      [data-aiyting-page] button,[data-aiyting-page] input{font-family:inherit}
      [data-aiyting-page] button:focus-visible,[data-aiyting-page] a:focus-visible,[data-aiyting-page] [role=button]:focus-visible{outline:2px solid var(--ai-accent);outline-offset:3px}
      [data-aiyting-page] button:disabled{cursor:not-allowed;opacity:.48}
      .aiyting-shell{max-width:1120px;margin:0 auto;padding:28px 32px 24px}
      .aiyting-header{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:22px}
      .aiyting-brand{display:flex;align-items:center;gap:18px;min-width:0}
      .aiyting-brand-mark{display:flex;align-items:center;justify-content:center;padding-right:18px;border-right:1px solid var(--ai-line)}
      .aiyting-eyebrow{font-size:11px;letter-spacing:.08em;color:var(--ai-accent);font-weight:650;margin-bottom:7px}
      .aiyting-heading{font-size:25px;line-height:1.25;letter-spacing:-.6px;margin:0;font-weight:720;overflow-wrap:anywhere}
      .aiyting-subtitle{font-size:13px;line-height:1.6;color:${T.sub};margin:9px 0 0}
      .aiyting-header-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
      .aiyting-status{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:${T.sub};padding:7px 10px;border:1px solid var(--ai-line);border-radius:99px;white-space:nowrap}
      .aiyting-status-dot{width:6px;height:6px;border-radius:50%;background:${T.cap};flex-shrink:0}
      .aiyting-status.is-connected .aiyting-status-dot{background:#10b981;box-shadow:0 0 0 3px #10b98112}
      .aiyting-status.is-unknown .aiyting-status-dot{background:#d99b37}
      .aiyting-icon-button{border:1px solid var(--ai-line);border-radius:10px;background:var(--ai-surface);color:${T.sub};width:34px;height:34px;display:grid;place-items:center;cursor:pointer}
      .aiyting-logout-button{border:1px solid var(--ai-line);border-radius:9px;background:transparent;color:${T.sub};padding:8px 11px;min-height:34px;font-size:11px;white-space:nowrap;cursor:pointer}
      .aiyting-logout-button:hover{background:var(--ai-surface);color:${T.text}}
      .aiyting-metrics{display:grid;grid-template-columns:1.35fr 1fr 1fr;gap:0;margin-bottom:20px;border:1px solid var(--ai-line);border-radius:14px;background:var(--ai-surface);overflow:hidden}
      .aiyting-metric{padding:17px 22px;border:0;border-right:1px solid var(--ai-line);min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:10px}
      .aiyting-metric:last-child{border-right:0}
      .aiyting-metric.is-balance{background:linear-gradient(110deg,#8b5cf609,#3b82f602)}
      .aiyting-metric-label{color:${T.sub};font-size:12px;line-height:1.5}
      .aiyting-metric-value{font-size:24px;line-height:1.1;letter-spacing:-.6px;font-weight:650;font-variant-numeric:tabular-nums}
      .aiyting-metric.is-balance .aiyting-metric-value{font-size:30px;letter-spacing:-1px}
      .aiyting-metric-unit{font-size:12px;letter-spacing:0;margin-left:7px;color:${T.cap};font-weight:400}
      .aiyting-metric-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:${T.cap};min-height:18px}
      .aiyting-text-link{color:var(--ai-accent);text-decoration:none;font-weight:550;font-size:12px}
      .aiyting-text-link:hover{text-decoration:underline}
      .aiyting-usage-track{height:4px;background:var(--ai-line);border-radius:9px;overflow:hidden;width:100%;margin-top:5px}
      .aiyting-usage-fill{height:100%;background:#8b5cf6;border-radius:9px}
      .aiyting-content{display:flex;flex-direction:column;gap:18px}
      .aiyting-content>.aiyting-card{width:100%}
      .aiyting-card{border:1px solid var(--ai-line);border-radius:16px;background:var(--ai-surface);min-width:0;overflow:hidden}
      .aiyting-card-head{padding:20px 24px 17px;border-bottom:1px solid var(--ai-line)}
      .aiyting-card-title-row{display:flex;align-items:center;gap:10px}
      .aiyting-card h2{font-size:16px;font-weight:680;letter-spacing:-.25px;line-height:1.4;margin:0}
      .aiyting-card-description{font-size:12px;line-height:1.7;color:${T.cap};margin:7px 0 0}
      .aiyting-tag{font-size:10px;color:var(--ai-accent);background:#8b5cf60c;border:1px solid #8b5cf624;padding:2px 7px;border-radius:5px}
      .aiyting-editor-wrap{padding:20px 24px 0}
      .aiyting-secondary{display:flex;flex-direction:column;align-items:stretch;gap:12px;min-width:0;width:100%}
      .aiyting-secondary .aiyting-card{padding:20px 24px;width:100%}
      .aiyting-secondary h2{font-size:13px}
      .aiyting-capabilities{display:flex;flex-wrap:wrap;gap:15px 28px;margin-top:18px}
      .aiyting-capability{min-width:130px}
      .aiyting-capability{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;color:${T.sub}}
      .aiyting-cap-state{display:inline-flex;align-items:center;gap:6px;color:${T.cap};font-size:10px;white-space:nowrap}
      .aiyting-cap-state.is-available{color:#10a879}
      .aiyting-cap-state::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor}
      .aiyting-links{display:flex;flex-wrap:wrap;gap:12px 28px;margin-top:15px}
      .aiyting-links a{display:inline-flex;align-items:center;font-size:12px;color:${T.sub};text-decoration:none;gap:10px}
      .aiyting-links a:hover{color:var(--ai-accent)}
      .aiyting-manage-toggle{display:flex;align-items:center;justify-content:space-between;gap:10px;border:0;background:transparent;color:inherit;width:100%;padding:0;text-align:left;cursor:pointer;font-size:13px;font-weight:650}
      .aiyting-connection-body{margin-top:18px;max-width:600px}
      .aiyting-connection-body p{font-size:11px;line-height:1.8;color:${T.cap};margin:0 0 12px}
      .aiyting-key-label{display:block;color:${T.sub};font-size:11px;margin:0 0 7px}
      .aiyting-key-input{width:100%;min-width:0;background:transparent;border:1px solid ${T.line};border-radius:9px;color:${T.text};padding:10px 11px;font-size:12px;outline:none}
      .aiyting-key-input:focus{border-color:var(--ai-accent);box-shadow:0 0 0 3px #8b5cf60c}
      .aiyting-connect-button{margin:10px 0 12px;width:100%;border:0;border-radius:9px;padding:10px 13px;color:#fff;background:#7c3aed;font-size:12px;font-weight:600;cursor:pointer}
      .aiyting-signin{padding:22px 24px;margin-bottom:20px}
      .aiyting-signin h2{font-size:17px}
      .aiyting-signin p{font-size:12px;line-height:1.8;color:${T.sub};margin:8px 0 0;max-width:620px}
      .aiyting-login-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px}
      .aiyting-login-primary{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:9px;padding:10px 17px;color:#fff;background:#7c3aed;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none}
      .aiyting-login-secondary{border:1px solid var(--ai-line);border-radius:9px;padding:9px 13px;color:${T.sub};background:transparent;font-size:12px;cursor:pointer}
      .aiyting-login-code{display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-top:16px;padding:14px 16px;border:1px solid var(--ai-line);border-radius:10px;max-width:420px}
      .aiyting-login-code span{font-size:11px;color:${T.cap}}
      .aiyting-login-code strong{font:650 22px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.14em;color:${T.text};overflow-wrap:anywhere}
      .aiyting-login-status{font-size:12px;line-height:1.8;color:${T.sub};margin-top:12px}
      .aiyting-advanced{margin-top:18px;border-top:1px solid var(--ai-line);padding-top:14px}
      .aiyting-advanced summary{font-size:11px;color:${T.sub};cursor:pointer}
      .aiyting-advanced form{margin-top:14px}
      .aiyting-notice{border:1px solid #10b98133;background:#10b98108;color:${T.sub};font-size:12px;line-height:1.65;border-radius:10px;padding:11px 14px;margin-bottom:16px}
      .aiyting-notice.is-error{border-color:#d9534f33;background:#d9534f08;color:${T.bad}}
      .aiyting-empty{padding:52px 24px;text-align:center;display:flex;align-items:center;flex-direction:column;gap:15px}
      .aiyting-empty h3{font-size:15px;margin:2px 0 0;font-weight:600}
      .aiyting-empty p{font-size:12px;line-height:1.8;color:${T.cap};max-width:300px;margin:0}
      .aiyting-skeleton{background:${T.cardHover};border-radius:6px;color:transparent!important;user-select:none;display:inline-block;min-width:92px}
      .aiyting-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:21px;padding:0 2px;color:${T.cap};font-size:11px;line-height:1.8}
      .aiyting-footer-mark{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
      .aiyting-inline-editor .aiyting-editor-section + .aiyting-editor-section{padding-top:23px;border-top:1px solid var(--ai-line)}
      .aiyting-inline-editor [data-model-card]{min-width:0;min-height:82px;padding:12px!important;transition:border-color .15s,background .15s}
      .aiyting-inline-editor [data-model-card]:hover,.aiyting-inline-editor [data-route-card]:hover{border-color:var(--ai-accent)!important}
      .aiyting-inline-editor [data-model-card]>div:first-child{flex-wrap:wrap;align-items:center!important;gap:6px!important}
      .aiyting-inline-editor .aiyting-model-note{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.65!important;font-size:11px!important}
      .aiyting-inline-editor .aiyting-model-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      .aiyting-inline-editor [data-route-card]{padding:12px!important;gap:10px!important;min-width:0}
      .aiyting-inline-editor [data-route-card]>div:first-child{flex-wrap:wrap;gap:6px!important}
      .aiyting-inline-editor .aiyting-quote-summary{background:#8b5cf607;margin:4px -24px 0;padding:16px 24px!important;border-top:1px solid var(--ai-line)!important}
      .aiyting-inline-editor .aiyting-editor-actions{padding:16px 0!important;flex-wrap:wrap;gap:12px!important}
      .aiyting-inline-editor .aiyting-editor-actions button{background:#7c3aed!important;border-color:#7c3aed!important;border-radius:9px!important;padding:10px 17px!important}
      .aiyting-inline-editor input{outline:none!important;min-width:0}
      .aiyting-inline-editor input:focus-visible{border-color:var(--ai-accent)!important;box-shadow:0 0 0 3px #8b5cf60c}
      @media(max-width:900px){.aiyting-header{align-items:flex-start}.aiyting-status{max-width:210px;overflow:hidden;text-overflow:ellipsis}.aiyting-inline-editor .aiyting-model-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:640px){.aiyting-shell{padding:22px 16px}.aiyting-header{flex-direction:column;gap:15px;margin-bottom:18px}.aiyting-brand{gap:12px}.aiyting-brand-mark{padding-right:12px}.aiyting-brand-mark svg{width:48px;height:32px}.aiyting-heading{font-size:20px}.aiyting-subtitle{font-size:12px}.aiyting-eyebrow{font-size:10px}.aiyting-header-actions{width:100%;justify-content:space-between}.aiyting-metrics{grid-template-columns:1fr 1fr;margin-bottom:18px}.aiyting-metric{padding:16px;gap:10px}.aiyting-metric.is-balance{grid-column:1/-1;border-right:0;border-bottom:1px solid var(--ai-line)}.aiyting-metric.is-balance .aiyting-metric-value{font-size:30px}.aiyting-metric-value{font-size:23px}.aiyting-content{gap:16px}.aiyting-card-head{padding:20px}.aiyting-editor-wrap{padding:18px 20px 0}.aiyting-secondary .aiyting-card{padding:20px}.aiyting-capabilities{gap:15px}.aiyting-capability{flex:1 1 130px}.aiyting-links{flex-direction:column;gap:17px}.aiyting-footer{align-items:flex-start;flex-direction:column;gap:7px}.aiyting-inline-editor .aiyting-quote-summary{margin-left:-20px;margin-right:-20px;padding-left:20px!important;padding-right:20px!important}.aiyting-inline-editor .aiyting-editor-actions>span{width:100%}.aiyting-inline-editor .aiyting-editor-actions>div{width:100%;margin:0!important}.aiyting-inline-editor .aiyting-editor-actions button{width:100%}.aiyting-inline-editor [data-route-card]>div:first-child>span:nth-last-child(2){margin-left:0!important}.aiyting-inline-editor .aiyting-model-grid{grid-template-columns:minmax(0,1fr)!important}}
      @media(max-width:640px){.aiyting-inline-editor .aiyting-route-grid{grid-template-columns:minmax(0,1fr)!important}}
      @media(prefers-reduced-motion:reduce){.aiyting-inline-editor [data-model-card]{transition:none}}
    `

    function AccountPage({ request, manageAccount, subscribe, notify, t }) {
      const [status, setStatus] = React.useState(null)
      const [refresh, setRefresh] = React.useState(0)
      const [keyInput, setKeyInput] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [loading, setLoading] = React.useState(true)
      const [loggingOut, setLoggingOut] = React.useState(false)
      const [message, setMessage] = React.useState('')
      const [failure, setFailure] = React.useState('')
      const [manageOpen, setManageOpen] = React.useState(false)
      const [login, setLogin] = React.useState(null)
      const loginSequence = React.useRef(0)
      const accountSequence = React.useRef(0)
      const accountLife = React.useRef(null)
      const completedLogin = React.useRef(null)
      const loginLife = React.useRef(null)
      React.useEffect(() => {
        const controller = new AbortController()
        loginLife.current = controller
        const sequence = loginSequence.current
        manageAccount('login_status', {}, controller.signal).then((next) => {
          if (!controller.signal.aborted && sequence === loginSequence.current) setLogin(next)
        }).catch(() => { /* Existing manual connections keep working if login discovery is unavailable. */ })
        return () => { controller.abort(); loginLife.current?.abort(); loginLife.current = null }
      }, [manageAccount])
      React.useEffect(() => {
        if (loggingOut || !login || !['pending', 'connecting', 'committing'].includes(login.phase)) return
        const controller = new AbortController()
        const sequence = loginSequence.current
        const expiresAt = Number(login.expiresAt)
        const pollAt = Number(login.nextPollAt)
        const remaining = login.phase === 'pending' ? Number.isFinite(expiresAt) ? expiresAt - Date.now() : 0 : 30000
        if (remaining <= 0) { setLogin((value) => value && value.attemptId === login.attemptId ? Object.assign({}, value, { phase: 'expired' }) : value); return }
        const delay = Math.min(remaining, Math.max(1000, Math.min(30000, Number.isFinite(pollAt) ? pollAt - Date.now() : 5000)))
        const timer = setTimeout(() => {
          manageAccount('login_status', { attemptId: login.attemptId }, controller.signal).then((next) => {
            if (!controller.signal.aborted && sequence === loginSequence.current) setLogin(next)
          }).catch(() => {
            if (!controller.signal.aborted && sequence === loginSequence.current) {
              setLogin((value) => value && value.attemptId === login.attemptId ? Object.assign({}, value, { nextPollAt: Date.now() + 5000 }) : value)
            }
          })
        }, delay)
        return () => { clearTimeout(timer); controller.abort() }
      }, [manageAccount, loggingOut, login && login.attemptId, login && login.phase, login && login.expiresAt, login && login.nextPollAt])
      React.useEffect(() => {
        if (!login || login.phase !== 'connected' || completedLogin.current === login.attemptId) return
        completedLogin.current = login.attemptId
        setManageOpen(false); setMessage(t('saved')); setFailure('')
        notify()
      }, [login, notify, t])
      React.useEffect(() => subscribe(() => { setStatus(null); setRefresh((value) => value + 1) }), [subscribe])
      React.useEffect(() => {
        const onFocus = () => setRefresh((value) => value + 1)
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
      }, [])
      React.useEffect(() => {
        const controller = new AbortController()
        const sequence = ++accountSequence.current
        accountLife.current = controller
        setLoading(true); setFailure('')
        request('get_account', {}, controller.signal).then((next) => {
          if (!controller.signal.aborted && sequence === accountSequence.current) setStatus(next)
        }).catch((error) => { if (!controller.signal.aborted && sequence === accountSequence.current) setFailure(error.message || t('error')) })
          .finally(() => { if (!controller.signal.aborted && sequence === accountSequence.current) setLoading(false) })
        return () => controller.abort()
      }, [request, refresh])
      const accountChange = async (operation) => {
        if (!status || busy) return
        setBusy(true); setFailure(''); setMessage('')
        const key = keyInput
        setKeyInput('')
        try {
          await manageAccount(operation, { accountRevision: status.accountRevision, key })
          if (operation === 'connect') setManageOpen(false)
          setMessage(t(operation === 'connect' ? 'saved' : 'removed'))
          notify()
        } catch (error) { setFailure(error.message || t('error')) }
        finally { setBusy(false) }
      }
      const logout = async () => {
        if (!status || busy || loggingOut) return
        const sequence = ++loginSequence.current
        ++accountSequence.current
        loginLife.current?.abort(); accountLife.current?.abort()
        const controller = new AbortController()
        loginLife.current = controller
        setLoggingOut(true); setBusy(true); setFailure(''); setMessage('')
        try {
          const next = await manageAccount('logout', { accountRevision: status.accountRevision }, controller.signal)
          if (controller.signal.aborted || sequence !== loginSequence.current) return
          setLogin(null); completedLogin.current = null; setKeyInput(''); setManageOpen(false)
          setStatus(next); setLoading(false); setMessage(t('removed'))
          notify()
        } catch (error) {
          if (controller.signal.aborted || sequence !== loginSequence.current) return
          setFailure(error.message || t('error'))
          setLoading(false)
        } finally {
          if (!controller.signal.aborted && sequence === loginSequence.current) { setLoggingOut(false); setBusy(false) }
        }
      }
      const loginChange = async (operation) => {
        if (!status || busy) return
        const sequence = ++loginSequence.current
        const signal = loginLife.current && loginLife.current.signal
        setBusy(true); setFailure(''); setMessage('')
        try {
          const next = await manageAccount(operation, operation === 'login_begin'
            ? { accountRevision: status.accountRevision }
            : { attemptId: login && login.attemptId }, signal)
          if (!(signal && signal.aborted) && sequence === loginSequence.current) setLogin(next)
        } catch (error) {
          if (!(signal && signal.aborted) && sequence === loginSequence.current) {
            setFailure(error.message || t('loginFailed'))
            if (operation === 'login_begin') setLogin(null)
          }
        } finally { if (!(signal && signal.aborted) && sequence === loginSequence.current) setBusy(false) }
      }
      const number = (value) => value == null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
      const account = status && status.account
      const loginPending = login && ['pending', 'connecting', 'committing'].includes(login.phase)
      const loginTerminal = login && ['denied', 'expired', 'cancelled', 'error'].includes(login.phase)
      const stateClass = loading ? '' : account ? 'is-connected' : status && status.configured ? 'is-unknown' : ''
      const stateText = loading ? t('loading') : account ? '@' + account.username : status && status.configured ? t('unknown') : t('disconnected')
      const expanded = manageOpen
      const used = account && typeof account.todaySpentCredits === 'number' ? account.todaySpentCredits : null
      const limit = account && typeof account.dailyLimitCredits === 'number' ? account.dailyLimitCredits : null
      const ratio = used != null && limit != null && limit > 0 ? Math.max(0, Math.min(100, used / limit * 100)) : null
      const external = (href, label, className = 'aiyting-text-link') => h('a', { href, target: '_blank', rel: 'noopener noreferrer', className }, label, h('span', { 'aria-hidden': true }, ' ↗'))
      const loginCard = !loading && (!account || loginPending || loginTerminal) ? h('section', { className: 'aiyting-card aiyting-signin', 'aria-label': t('connectTitle'), 'data-aiyting-signin': true },
        h('h2', null, t('connectTitle')),
        h('p', null, t('connectBody')),
        loginPending ? h('div', null,
          h('div', { className: 'aiyting-login-code' }, h('span', null, t('loginCode')), h('strong', null, login.userCode)),
          h('p', null, t('loginCodeHint')),
          h('div', { className: 'aiyting-login-status', role: 'status' }, t(login.phase === 'pending' ? 'loginWaiting' : 'connecting')),
          h('div', { className: 'aiyting-login-actions' },
            external(login.verificationUri, t('openAuthorization'), 'aiyting-login-primary'),
            h('button', { type: 'button', className: 'aiyting-login-secondary', disabled: busy || login.phase === 'committing', onClick: () => void loginChange('login_cancel') }, t('loginCancel'))),
          account ? h('p', null, t('loginKeep')) : null) :
          h('div', null,
            loginTerminal ? h('div', { className: 'aiyting-login-status', role: 'status' },
              t(login.phase === 'denied' ? 'loginDenied' : login.phase === 'expired' ? 'loginExpired' : login.phase === 'cancelled' ? 'loginCancelled' : 'loginFailed')) : null,
            h('div', { className: 'aiyting-login-actions' },
              h('button', { type: 'button', className: 'aiyting-login-primary', disabled: busy || !status, onClick: () => void loginChange('login_begin') }, busy ? t('loginStarting') : t(loginTerminal ? 'loginRetry' : 'websiteLogin'))))) : null
      const metric = (label, value, primary, footer, raw) => h('section', { className: 'aiyting-metric' + (primary ? ' is-balance' : ''), 'aria-label': t(label) },
        h('div', { className: 'aiyting-metric-label' }, t(label)),
        h('div', { className: 'aiyting-metric-value' + (loading && !account ? ' aiyting-skeleton' : ''), title: raw == null ? undefined : String(raw) },
          value, primary ? h('span', { className: 'aiyting-metric-unit' }, t('creditsUnit')) : null),
        h('div', { className: 'aiyting-metric-foot' }, footer))
      return h('div', { 'data-aiyting-page': true },
        h('style', null, PAGE_STYLE),
        h('div', { className: 'aiyting-shell' },
          h('header', { className: 'aiyting-header' },
            h('div', { className: 'aiyting-brand' },
              h('div', { className: 'aiyting-brand-mark' }, h(BrandMark, { size: 37, width: 65 })),
              h('div', null, h('div', { className: 'aiyting-eyebrow' }, t('workspace')),
                h('h1', { className: 'aiyting-heading' }, 'aiyting生图/生视频'),
                h('p', { className: 'aiyting-subtitle' }, t('intro')))),
            h('div', { className: 'aiyting-header-actions' },
              h('span', { className: 'aiyting-status ' + stateClass, role: 'status', 'aria-label': account ? t('connected') + ' · ' + stateText : stateText },
                h('span', { className: 'aiyting-status-dot', 'aria-hidden': true }), stateText),
              status && status.configured ? h('button', { type: 'button', className: 'aiyting-logout-button', title: t('logoutHint'),
                disabled: busy || loggingOut || login && login.phase === 'committing', onClick: () => void logout() }, t(loggingOut ? 'loggingOut' : 'logout')) : null,
              h('button', { type: 'button', className: 'aiyting-icon-button', 'aria-label': t('refresh'), title: t('refresh'), disabled: loading || busy, onClick: () => setRefresh((value) => value + 1) },
                h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
                  h('path', { d: 'M20 7v5h-5M4 17v-5h5M5.5 7.5A7.5 7.5 0 0 1 18.7 6L20 12M4 12l1.3 6A7.5 7.5 0 0 0 18.5 16.5', strokeLinecap: 'round', strokeLinejoin: 'round' }))))),
          failure || status && status.connectionError ? h('div', { role: 'alert', className: 'aiyting-notice is-error' }, failure || status.connectionError) : null,
          message ? h('div', { role: 'status', className: 'aiyting-notice' }, message) : null,
          loginCard,
          h('div', { className: 'aiyting-metrics', 'aria-label': t('overview') },
            metric('balance', number(account && account.balanceCredits), true,
              [h('span', { key: 'hint' }, t('synced')), external('https://aiyting.com/pricing', t('recharge'))], account && account.balanceCredits),
            metric('spent', number(used), false, ratio == null ? h('span', null, '—') :
              h('div', { style: { width: '100%' } },
                h('span', null, number(ratio) + '% · ' + t('usageHint')),
                h('div', { className: 'aiyting-usage-track', role: 'progressbar', 'aria-label': t('usageHint'), 'aria-valuenow': Math.round(ratio), 'aria-valuemin': 0, 'aria-valuemax': 100 },
                  h('div', { className: 'aiyting-usage-fill', style: { width: ratio + '%' } }))), used),
            metric('limit', account ? limit == null ? t('unlimited') : number(limit) : '—', false,
              h('span', null, t('capabilityHint')), limit)),
          h('div', { className: 'aiyting-content' },
            h('section', { className: 'aiyting-card', 'aria-label': t('defaults') },
              h('div', { className: 'aiyting-card-head' },
                h('div', { className: 'aiyting-card-title-row' }, h('h2', null, t('defaults')), h('span', { className: 'aiyting-tag' }, t('editorTag'))),
                h('p', { className: 'aiyting-card-description' }, t('defaultsHint'))),
              status && account ? h('div', { className: 'aiyting-editor-wrap' },
                h(Activity, { key: status.accountRevision, defaultMode: true, request, subscribe, onSaved: () => setMessage(t('defaultSaved')) })) :
                h('div', { className: 'aiyting-empty', 'aria-busy': loading },
                  h(BrandMark, { size: 34, width: 60 }),
                  h('h3', null, loading ? t('loading') : t('emptyTitle')),
                  h('p', null, loading ? t('defaultsHint') : t('emptyBody')))),
            h('div', { className: 'aiyting-secondary' },
              h('section', { className: 'aiyting-card', 'aria-label': t('capTitle') },
                h('h2', null, t('capTitle')), h('p', { className: 'aiyting-card-description' }, t('capabilityHint')),
                h('div', { className: 'aiyting-capabilities' },
                  [['models', 'capModels'], ['quote', 'capQuote'], ['generate', 'capGenerate'], ['task', 'capTask'], ['balance', 'capBalance']].map(([key, label]) => {
                    const known = status && status.capabilities
                    const available = known && known[key]
                    return h('div', { key, className: 'aiyting-capability' }, h('span', null, t(label)),
                      h('span', { className: 'aiyting-cap-state' + (available ? ' is-available' : '') }, loading ? '—' : !known ? '—' : t(available ? 'available' : 'unavailable')))
                  }))),
              h('section', { className: 'aiyting-card', 'aria-label': t('links') },
                h('h2', null, t('links')), h('nav', { className: 'aiyting-links' },
                  external('https://aiyting.com/', t('login'), ''),
                  external('https://aiyting.com/home?view=apiKeys', t('keys'), ''),
                  external('https://aiyting.com/pricing', t('recharge'), ''))),
              h('section', { className: 'aiyting-card', 'data-aiyting-connection': true },
                h('button', { type: 'button', className: 'aiyting-manage-toggle', 'aria-expanded': expanded, 'aria-controls': 'aiyting-connection-settings',
                  onClick: () => setManageOpen((value) => !value) }, h('span', null, t('account')), h('span', { 'aria-hidden': true, style: { color: T.cap } }, expanded ? '−' : '+')),
                expanded ? h('div', { className: 'aiyting-connection-body', id: 'aiyting-connection-settings' },
                  account ? h('div', null, h('p', null, t('loginKeep')),
                    h('button', { type: 'button', className: 'aiyting-login-secondary', disabled: busy || loginPending || !status, onClick: () => void loginChange('login_begin') }, t('switchAccount'))) : null,
                  h('details', { className: 'aiyting-advanced' }, h('summary', null, t('advanced')),
                    h('form', { onSubmit: (event) => { event.preventDefault(); void accountChange('connect') } },
                      h('label', { className: 'aiyting-key-label', htmlFor: 'aiyting-access-key' }, t('keyLabel')),
                      h('input', { id: 'aiyting-access-key', type: 'password', value: keyInput, 'aria-label': t('key'), placeholder: t('key'), autoComplete: 'off', spellCheck: false,
                        className: 'aiyting-key-input', disabled: busy || loginPending || !status, onChange: (event) => setKeyInput(event.target.value), maxLength: 512 }),
                      h('button', { type: 'submit', className: 'aiyting-connect-button', disabled: busy || loginPending || !status || !keyInput.trim() }, busy ? t('connecting') : t('connect'))),
                    h('p', null, t('hint')), h('p', null, t('shared')))) : null))),
          h('footer', { className: 'aiyting-footer' }, h('span', null, t('readOnly')),
            h('span', { className: 'aiyting-footer-mark' }, h(BrandMark, { size: 11, width: 19 }), 'AIyting'))))
    }

    return {
      inject: ['slots', 'connection', 'locale'],
      apply(ctx) {
        const listeners = new Set()
        const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
        const notify = () => listeners.forEach((listener) => listener())
        ctx.effect(() => () => listeners.clear(), 'aiyting-ui: views')
        ctx.effect(() => ctx.locale.register('aiyting', pageCopy), 'aiyting-ui: locale')
        const send = async (path, operation, payload, signal) => {
          const response = await fetch(path, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin', body: JSON.stringify({ operation, payload }), signal,
          })
          if (!response.ok) throw new Error('AIyting 查询暂不可用，请检查 DSH 连接后刷新。')
          const result = await response.json()
          if (!result.ok) throw new Error(result.error.message || 'AIyting 查询失败')
          return result.value
        }
        const request = (operation, payload, signal) => send('api/aiyting', operation, payload, signal)
        const manageAccount = (operation, payload, signal) => send('api/aiyting/account', operation, payload, signal)
        const ConnectedActivity = (props) => h(Activity, Object.assign({}, props, { key: props.sessionId, request, subscribe }))
        const ConnectedPage = (props) => h(AccountPage, Object.assign({}, props, { request, manageAccount, subscribe, notify }))
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: 'aiyting', id: 'aiyting-page', locale: 'aiyting',
        }, ConnectedPage))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: 'aiyting', order: 30, label: 'aiyting生图/生视频',
        }, SidebarIcon))
        // The activity slot is single and belongs to voice input; toolbar controls use a list slot.
        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register({
            name: 'conversation.input.right',
            id: 'aiyting-image-settings',
            order: 40,
          }, ConnectedActivity))
      },
    }
  },
})

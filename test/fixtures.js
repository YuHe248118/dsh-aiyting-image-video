// Test-only MCP replies. Runtime modules never import this file.
export function fixtureCatalog() {
  const route = (price) => ({
    routeId: 'shared-route-id', publicName: 'C线路', availability: 'available',
    successRate: null, averageDurationMs: null,
    modes: [{ mode: 'text-to-image', ratios: ['1:1', '16:9'], resolutions: ['1K', '2K'], qualities: [], defaults: { ratio: '1:1', resolution: '1K' } }],
    pricing: { billingUnit: 'request', variants: [{ match: { resolution: '1K' }, unitPriceCredits: price }] },
  })
  return { catalogVersion: 17, limits: { maxSelectedRoutes: 3, maxBatchChildren: 8 }, models: [
    { modelId: 'gemini-3.1-flash-image-preview', displayName: '测试香蕉二代', type: 'image', routes: [route(1.25)] },
    { modelId: 'nano-banana-2.1', displayName: '测试香蕉 2.1', type: 'image', routes: [{ ...route(9.5), availability: 'maintenance', successRate: 0, averageDurationMs: 2500 }] },
    { modelId: 'image-reference-only', type: 'image', routes: [{ ...route(5), modes: [{ mode: 'image-to-image' }] }] },
    { modelId: 'video-only', type: 'video', routes: [route(2)] },
  ] }
}

export const settings = { modelId: 'gemini-3.1-flash-image-preview', routeId: 'shared-route-id',
  aspectRatio: '1:1', resolution: '2K', quality: null, count: 2, catalogVersion: 17 }
export const fixtureQuote = () => ({ modelId: settings.modelId, mediaType: 'image', catalogVersion: 17,
  countPerRoute: 2, chargedCredits: 3.75, routes: [{ routeId: settings.routeId, publicName: 'C线路' }],
  normalizedParams: { ratio: '1:1', resolution: '2K' } })

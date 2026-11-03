import { openPreferences } from './preferences.js'
import { openBatches } from './batches.js'
import { installRuntime } from './host.js'
export { installRuntime } from './host.js'
export const inject = ['loader', 'connection', 'credentials', 'tools', 'storageDomain', 'profileContext', 'sessions']
export async function apply(ctx, config = {}) {
  await installRuntime(ctx, config, await openPreferences(ctx), await openBatches(ctx))
}

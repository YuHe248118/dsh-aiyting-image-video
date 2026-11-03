/** UI and agent settings actions share the Host dispatch. Credentials stay user-only. */
export async function registerSettingsTool(ctx, dispatch) {
  const { defineTool } = await ctx.loader.import('@deepseek-ai/dsh-tools')
  const text = { type: 'string', required: true }
  ctx.tools.register(defineTool({
    name: 'aiyting_image_settings',
    description: 'Read or save AIyting image settings for this conversation or profile defaults. Use get first. Before save, use quote with exact settings and its catalogVersion, then pass the returned receipt and accountRevision plus the get revision. Save only when the user requests a settings change; saving never generates images or charges credits. Account connection and disconnection are user-only on the AIyting sidebar page.',
    parameters: {
      action: { type: 'string', enum: ['get', 'quote', 'save'], required: true },
      scope: { type: 'string', enum: ['session', 'default'], description: 'Defaults to this conversation. default changes profile defaults for new conversations.' },
      settings: { type: 'object', additionalProperties: false, properties: {
        modelId: text, routeId: text, aspectRatio: text, resolution: text,
        quality: { required: true, oneOf: [{ type: 'null' }, { type: 'string', enum: ['low', 'medium', 'high'] }] },
        count: { type: 'integer', required: true, enum: [1, 2, 3, 4] },
        catalogVersion: { required: true, oneOf: [{ type: 'string' }, { type: 'number' }] },
      } },
      revision: { type: 'integer', description: 'Settings revision from get.' },
      accountRevision: { type: 'string', description: 'Account revision from get or quote.' },
      receipt: { type: 'string', description: 'Unexpired receipt returned by quote for the same settings.' },
      makeDefault: { type: 'boolean', description: 'Also use these conversation settings as defaults, only if the user requests it.' },
    },
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) {
      if (!exec.agent?.session?.id) throw new Error('AIyting 参数操作需要当前对话。')
      const sessionId = args.scope === 'default' ? null : exec.agent.session.id
      const common = { sessionId, accountRevision: args.accountRevision }
      if (args.action === 'get') return dispatch('get_preferences', common, exec.signal)
      if (args.action === 'quote') return dispatch('estimate_cost', { ...args.settings, accountRevision: args.accountRevision }, exec.signal)
      return dispatch('save_preferences', { ...common, settings: args.settings, revision: args.revision,
        receipt: args.receipt, makeDefault: args.scope === 'default' || args.makeDefault === true }, exec.signal)
    },
  }))
}

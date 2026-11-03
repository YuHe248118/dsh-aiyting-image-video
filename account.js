/** Public account data only: never pass arbitrary MCP fields to the browser. */
export function accountInfo(data) {
  if (typeof data?.username !== 'string' || !data.username || data.username.length > 160) throw new Error('AIyting 账号信息暂不可用。')
  const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
  return { username: data.username, balanceCredits: number(data.balanceCredits),
    dailyLimitCredits: number(data.dailyLimitCredits), todaySpentCredits: number(data.todaySpentCredits) }
}

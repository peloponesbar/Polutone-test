/**
 * Shop notifications to a Telegram chat through a bot.
 * TELEGRAM_BOT_TOKEN — from @BotFather; TELEGRAM_CHAT_ID — the chat the bot was added to.
 * Without them nothing is sent: notifications are optional, orders never depend on them.
 */

export type TelegramResult = 'sent' | 'skipped'

export async function sendTelegram(
  text: string,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TelegramResult> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = env.TELEGRAM_CHAT_ID?.trim()
  if (!token || !chatId) return 'skipped'

  const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Plain text: customer input goes in as is, nothing is parsed as markup.
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Telegram responded ${response.status}`)
  return 'sent'
}

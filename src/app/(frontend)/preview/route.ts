import config from '@payload-config'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { isSafePath } from '@/lib/preview'

/**
 * Admin preview entry: switches this browser into draft mode and opens the page.
 * Only signed-in admins get in — drafts are never shown to visitors.
 */
export async function GET(request: Request): Promise<Response> {
  const path = new URL(request.url).searchParams.get('path')
  if (!isSafePath(path)) {
    return new Response('Неверный адрес страницы для предпросмотра.', { status: 400 })
  }

  let signedIn = false
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    signedIn = Boolean(user)
  } catch (error) {
    console.error('Preview: admin auth check failed', error)
    return new Response('Не удалось проверить вход в админку. Попробуйте ещё раз.', { status: 500 })
  }
  if (!signedIn) {
    return new Response('Предпросмотр доступен только после входа в админку.', { status: 403 })
  }

  ;(await draftMode()).enable()
  redirect(path)
}

import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { isSafePath } from '@/lib/preview'

/** Leaves draft mode: the browser sees the published site again. */
export async function GET(request: Request): Promise<Response> {
  const path = new URL(request.url).searchParams.get('path')
  ;(await draftMode()).disable()
  redirect(isSafePath(path) ? path : '/')
}

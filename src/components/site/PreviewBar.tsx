'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { usePathname, useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'

import { focusRing, label } from './ui'

const noSubscribe = () => () => {}

/**
 * Shown only in draft mode (admin preview): says the page is a draft and lets the admin
 * leave preview. Inside the admin's Live Preview frame it also re-renders the page
 * every time the form autosaves, so edits appear while typing.
 */
export function PreviewBar() {
  const router = useRouter()
  const pathname = usePathname()
  // The page origin, known only in the browser (null during server render).
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => null)

  return (
    <>
      {origin ? <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={origin} /> : null}
      <div role="status" className="bg-primary text-background">
        <div className="mx-auto flex min-h-[44px] w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2 md:px-20">
          <p className={label}>Предпросмотр · черновик не виден посетителям</p>
          <a
            href={`/preview/exit?path=${encodeURIComponent(pathname)}`}
            className={`${label} inline-flex min-h-[44px] items-center underline decoration-accent underline-offset-4 ${focusRing} focus-visible:ring-background focus-visible:ring-offset-primary`}
          >
            Выйти из предпросмотра
          </a>
        </div>
      </div>
    </>
  )
}

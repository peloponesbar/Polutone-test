'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useRef, useState } from 'react'

import { submitOrder } from '@/app/(frontend)/checkout/actions'
import { RemovedNote } from '@/components/site/cart/CartView'
import { itemsLabel } from '@/components/site/cart/format'
import { LineThumb } from '@/components/site/cart/LineThumb'
import { useCartQuote } from '@/components/site/cart/useCartQuote'
import { buttonPrimary, buttonSecondary, focusRing, label, textLink } from '@/components/site/ui'
import { cart } from '@/lib/cart/store'
import { formatPrice } from '@/lib/format'
import type { CheckoutErrors, CheckoutField } from '@/lib/orders/checkout'
import {
  DELIVERY_METHODS,
  DELIVERY_SERVICES,
  type DeliveryMethod,
  type DeliveryService,
  labelOf,
  methodsOf,
  PAYMENT_METHODS,
} from '@/lib/orders/options'

const note = 'font-sans text-caption tracking-body text-primary/80'
const input = `w-full border bg-background px-4 font-sans text-body-m tracking-body text-primary placeholder:text-primary/50 ${focusRing}`

/** Field order on the page: the first invalid one gets focus. */
const FIELD_ORDER: CheckoutField[] = [
  'name',
  'phone',
  'email',
  'deliveryService',
  'deliveryMethod',
  'city',
  'address',
  'paymentMethod',
  'comment',
  'consent',
]

const ADDRESS_LABEL: Record<DeliveryMethod | 'post', { label: string; hint: string }> = {
  pickup: { label: 'Адрес пункта выдачи', hint: 'Улица и дом пункта или его код, если знаете.' },
  courier: { label: 'Адрес доставки', hint: 'Улица, дом, квартира, подъезд и этаж.' },
  post: { label: 'Адрес отделения или ваш адрес с индексом', hint: 'Например, 420111, ул. Баумана, 1, кв. 5.' },
}

export function CheckoutView() {
  const router = useRouter()
  const { hydrated, lines, result, loading, removedNote, reconcile } = useCartQuote()
  const [service, setService] = useState<DeliveryService>('cdek')
  const [method, setMethod] = useState<DeliveryMethod>('pickup')
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [placed, setPlaced] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)

  const placeholder = (text: string) => <p className="py-16 font-sans text-body-m tracking-body text-primary/70">{text}</p>
  if (!hydrated) return placeholder('Загружаем корзину…')
  if (placed) return placeholder('Заказ оформлен, открываем его страницу…')

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 border-t border-primary/10 py-16">
        {removedNote ? <RemovedNote /> : null}
        <p className="font-sans text-body-m tracking-body text-primary/80 md:text-body">В корзине пока ничего нет.</p>
        <Link href="/catalog" className={buttonSecondary}>
          Перейти в каталог
        </Link>
      </div>
    )
  }
  if (!result) return placeholder('Загружаем корзину…')
  if (!result.ok) return <p role="alert" className="py-16 font-sans text-body-m tracking-body text-primary">{result.error}</p>

  const priced = result.cart
  const buyable = priced.lines.filter((l) => l.qty > 0)
  const hasUnavailable = priced.lines.some((l) => l.status === 'unavailable')

  function chooseService(next: DeliveryService) {
    setService(next)
    if (!methodsOf(next).includes(method)) setMethod(methodsOf(next)[0])
  }

  function showNotice(text: string) {
    setNotice(text)
    requestAnimationFrame(() => noticeRef.current?.focus())
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, unknown>
    form.consent = form.consent === 'on'
    setSending(true)
    setNotice(null)
    try {
      const outcome = await submitOrder({ lines, expectedTotal: priced.total, form })
      if (outcome.ok) {
        setPlaced(true)
        cart.clear()
        router.replace(`/order/${outcome.token}`)
        return
      }
      if (outcome.reason === 'invalid') {
        setErrors(outcome.errors)
        const first = FIELD_ORDER.find((f) => outcome.errors[f])
        const field = first && formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)
        field?.focus()
      } else if (outcome.reason === 'changed') {
        setErrors({})
        reconcile(outcome.cart)
        showNotice('Пока вы оформляли заказ, изменились цены или наличие. Проверьте, пожалуйста, состав заказа и подтвердите ещё раз.')
      } else if (outcome.reason === 'empty') {
        showNotice('В корзине нет товаров для заказа.')
      } else {
        showNotice(outcome.message)
      }
    } catch {
      showNotice('Не удалось отправить заказ. Проверьте, пожалуйста, интернет и попробуйте ещё раз.')
    } finally {
      setSending(false)
    }
  }

  const address = ADDRESS_LABEL[service === 'post' ? 'post' : method]

  return (
    <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-12 md:gap-x-6">
      <aside aria-label="Ваш заказ" className="flex flex-col gap-4 bg-surface/40 p-6 md:sticky md:top-[132px] md:order-last md:col-span-4 md:col-start-9">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className={`${label} text-primary`}>Ваш заказ</h2>
          <Link href="/cart" className={`font-sans text-caption tracking-body ${textLink}`}>
            Изменить
          </Link>
        </div>
        {/* Each item on its own milk card over the stone panel, with its photo. */}
        <ul className="flex flex-col gap-2" aria-busy={loading}>
          {priced.lines.map((l) => (
            <li
              key={l.variantId}
              className="grid grid-cols-[56px_1fr_auto] items-start gap-3 bg-background p-3 font-sans text-caption tracking-body text-primary"
            >
              <LineThumb line={l} sizes="56px" />
              <span className="min-w-0">
                {l.title}
                <span className="block text-primary/70">
                  {[l.color, l.size].filter(Boolean).join(' · ')}
                </span>
                <span className="block text-primary/70">{l.qty > 0 ? `${l.qty} шт.` : 'Нет в наличии'}</span>
              </span>
              <span className="whitespace-nowrap">{l.qty > 0 ? formatPrice(l.lineTotal) : '—'}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-primary/10 pt-4 font-sans text-body-m tracking-body text-primary">
          <div className="flex justify-between gap-4">
            <dt>{itemsLabel(priced.count)}</dt>
            <dd>{formatPrice(priced.total)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-primary/80">
            <dt>Доставка</dt>
            <dd>сообщим отдельно</dd>
          </div>
          <div className="flex justify-between gap-4 pt-2 md:text-body">
            <dt>Итого</dt>
            <dd>{formatPrice(priced.total)}</dd>
          </div>
        </dl>
        {hasUnavailable ? (
          <p className={note}>Товары, которых нет в наличии, в заказ не войдут.</p>
        ) : null}
      </aside>

      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-10 md:col-span-7">
        {removedNote ? <RemovedNote /> : null}
        {notice ? (
          <div ref={noticeRef} tabIndex={-1} role="alert" className="border-l-2 border-accent pl-4 font-sans text-body-m tracking-body text-primary outline-none">
            {notice}
          </div>
        ) : null}

        <Section title="Контакты">
          <Field name="name" label="Имя" errors={errors} autoComplete="name" />
          <Field name="phone" label="Телефон" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 900 123-45-67" errors={errors} hint="Для связи с курьером или пунктом выдачи." />
          <Field name="email" label="Почта" type="email" autoComplete="email" errors={errors} hint="Сюда придёт чек об оплате." />
        </Section>

        <Section title="Доставка">
          <Choice
            name="deliveryService"
            legend="Служба доставки"
            options={DELIVERY_SERVICES.map((s) => ({ value: s.value, label: s.label }))}
            value={service}
            onChange={(v) => chooseService(v as DeliveryService)}
            error={errors.deliveryService}
          />
          {methodsOf(service).length > 1 ? (
            <Choice
              name="deliveryMethod"
              legend="Способ"
              options={methodsOf(service).map((m) => ({ value: m, label: labelOf(DELIVERY_METHODS, m) }))}
              value={method}
              onChange={(v) => setMethod(v as DeliveryMethod)}
              error={errors.deliveryMethod}
            />
          ) : (
            <input type="hidden" name="deliveryMethod" value={methodsOf(service)[0]} />
          )}
          <Field name="city" label="Город" autoComplete="address-level2" errors={errors} />
          <Field name="address" label={address.label} hint={address.hint} multiline errors={errors} />
          <p className={note}>Стоимость и срок доставки сообщим перед оплатой.</p>
        </Section>

        <Section title="Оплата">
          <Choice
            name="paymentMethod"
            legend="Способ оплаты"
            options={PAYMENT_METHODS.map((p) => ({ value: p.value, label: p.label }))}
            value="online"
            onChange={() => {}}
            error={errors.paymentMethod}
          />
          <p className={note}>
            Оплата на сайте подключается. Пока заказ сохранится со статусом «Ожидает оплаты».
          </p>
        </Section>

        <Section title="Комментарий">
          <Field name="comment" label="Комментарий к заказу" optional multiline errors={errors} />
        </Section>

        <div className="flex flex-col gap-6 border-t border-primary/10 pt-6">
          <Consent error={errors.consent} />
          <div className="flex flex-col gap-2">
            <button type="submit" disabled={sending || buyable.length === 0} className={`${buttonPrimary} w-full md:w-auto md:self-start`}>
              {sending ? 'Оформляем…' : `Подтвердить заказ · ${formatPrice(priced.total)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-6">
      <legend className="mb-6 font-display text-h2-m text-primary md:text-h2">{title}</legend>
      {children}
    </fieldset>
  )
}

type FieldProps = {
  name: CheckoutField
  label: string
  errors: CheckoutErrors
  hint?: string
  optional?: boolean
  multiline?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>

function Field({ name, label: text, errors, hint, optional = false, multiline = false, ...rest }: FieldProps) {
  const id = useId()
  const error = errors[name]
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  const common = {
    id,
    name,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    required: !optional,
    className: `${input} ${error ? 'border-primary' : 'border-primary/20'}`,
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-sans text-caption tracking-body text-primary">
        {text}
        {optional ? <span className="text-primary/70"> — по желанию</span> : null}
      </label>
      {multiline ? (
        <textarea {...common} rows={3} className={`${common.className} py-3`} />
      ) : (
        <input {...common} {...rest} className={`${common.className} min-h-[44px]`} />
      )}
      {hint ? <p id={`${id}-hint`} className={note}>{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="font-sans text-caption tracking-body text-primary">{error}</p> : null}
    </div>
  )
}

function Choice({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string
  legend: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-sans text-caption tracking-body text-primary">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`inline-flex min-h-[44px] cursor-pointer items-center gap-3 border px-4 font-sans text-body-m tracking-body text-primary transition-colors duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
              o.value === value ? 'border-primary' : 'border-primary/20 hover:border-primary'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="accent-primary"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error ? <p className="font-sans text-caption tracking-body text-primary">{error}</p> : null}
    </fieldset>
  )
}

function Consent({ error }: { error?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 font-sans text-caption tracking-body text-primary">
        <input
          id={id}
          type="checkbox"
          name="consent"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`mt-1 h-5 w-5 shrink-0 accent-primary ${focusRing}`}
        />
        <span>
          Даю согласие на обработку персональных данных в соответствии с{' '}
          <Link href="/info/privacy" target="_blank" className={textLink}>
            политикой конфиденциальности
          </Link>
          .
        </span>
      </label>
      {error ? <p id={`${id}-error`} className="font-sans text-caption tracking-body text-primary">{error}</p> : null}
    </div>
  )
}

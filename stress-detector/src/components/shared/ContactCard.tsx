import type { ReactNode } from 'react'

export function ContactCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl bg-slate-900/50 border border-purple-800/30 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  )
}


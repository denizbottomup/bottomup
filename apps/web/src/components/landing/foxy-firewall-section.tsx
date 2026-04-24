'use client';

import { useT } from '@/lib/i18n';

const PILLAR_ICONS = ['🔍', '🚫', '⚙', '🧪'];

export function FoxyFirewallSection() {
  const { t } = useT();
  return (
    <section id="foxy" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.06] blur-[140px]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_560px] lg:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              {t.foxy.label}
            </div>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] md:text-5xl lg:text-6xl">
              {t.foxy.headline_1}{' '}
              <span className="logo-gradient">{t.foxy.headline_2}</span>{' '}
              {t.foxy.headline_3}
            </h2>
            <p className="mt-5 max-w-xl text-base text-fg-muted">
              {t.foxy.subtitle}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {t.foxy.pillars.map((p, i) => (
                <Pillar
                  key={p.title}
                  icon={PILLAR_ICONS[i] ?? '•'}
                  title={p.title}
                  body={p.body}
                />
              ))}
            </div>
          </div>

          <FoxyDiagram />
        </div>
      </div>
    </section>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="text-xl">{icon}</div>
      <div className="mt-2 text-sm font-semibold text-fg">{title}</div>
      <div className="mt-1 text-[12px] leading-relaxed text-fg-muted">
        {body}
      </div>
    </div>
  );
}

function FoxyDiagram() {
  const { t } = useT();
  return (
    <div className="relative rounded-2xl border border-border bg-bg-card/80 p-5 shadow-2xl">
      <div className="text-[10px] uppercase tracking-wider text-fg-dim">
        {t.foxy.signal_flow}
      </div>
      <div className="mt-4 space-y-3">
        <Node
          icon="👤"
          label={t.foxy.trader_node}
          sub={t.foxy.trader_node_sub}
          tone="neutral"
        />
        <Arrow />
        <Node
          icon="🛡"
          label={t.foxy.foxy_node}
          sub={t.foxy.foxy_node_sub}
          tone="shield"
        />
        <div className="grid grid-cols-2 gap-3">
          <DecisionCard
            label={t.foxy.decision_bad}
            body={t.foxy.decision_bad_body}
            tone="danger"
          />
          <DecisionCard
            label={t.foxy.decision_ok}
            body={t.foxy.decision_ok_body}
            tone="success"
          />
        </div>
        <Arrow />
        <Node
          icon="💼"
          label={t.foxy.wallet_node}
          sub={t.foxy.wallet_node_sub}
          tone="success"
        />
      </div>

      <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] p-3 text-[11px] text-emerald-200">
        {t.foxy.stat}
      </div>
    </div>
  );
}

function Node({
  icon,
  label,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  sub: string;
  tone: 'neutral' | 'shield' | 'success';
}) {
  const border =
    tone === 'shield'
      ? 'border-emerald-400/40 bg-emerald-400/[0.06]'
      : tone === 'success'
        ? 'border-brand/40 bg-brand/[0.06]'
        : 'border-border bg-bg';
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${border}`}>
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-fg">{label}</div>
        <div className="text-[11px] text-fg-muted">{sub}</div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-dim">
        <polyline points="7 10 12 15 17 10" />
      </svg>
    </div>
  );
}

function DecisionCard({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: 'danger' | 'success';
}) {
  const cls =
    tone === 'danger'
      ? 'border-rose-400/30 bg-rose-400/[0.06] text-rose-300'
      : 'border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300';
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{body}</div>
    </div>
  );
}

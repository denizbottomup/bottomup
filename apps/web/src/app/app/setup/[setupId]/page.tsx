'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { SetupChart } from '@/components/setup-chart';

interface TraderRef {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
  is_trending: boolean;
}

interface CoinRef {
  code: string;
  display_name: string | null;
  image: string | null;
}

interface SetupDetail {
  id: string;
  status: 'incoming' | 'active' | 'cancelled' | 'stopped' | 'success' | 'closed';
  sub_status: string | null;
  category: 'spot' | 'futures';
  position: 'long' | 'short' | null;
  order_type: string;
  coin_name: string;
  entry_value: number;
  entry_value_end: number | null;
  stop_value: number | null;
  profit_taking_1: number | null;
  profit_taking_2: number | null;
  profit_taking_3: number | null;
  initial_entry_value: number | null;
  initial_entry_value_end: number | null;
  initial_stop_value: number | null;
  initial_profit_taking_1: number | null;
  initial_profit_taking_2: number | null;
  initial_profit_taking_3: number | null;
  r_value: number | null;
  open_leverage: number | null;
  is_tp1: boolean | null;
  is_tp2: boolean | null;
  is_tp3: boolean | null;
  close_price: number | null;
  close_date: string | null;
  activation_date: string | null;
  tp1_date: string | null;
  tp2_date: string | null;
  tp3_date: string | null;
  stop_date: string | null;
  note: string | null;
  tags: string[];
  clap_count: number;
  image_success: string | null;
  created_at: string | null;
  updated_at: string | null;
  trader: TraderRef;
  coin: CoinRef;
  viewer: {
    clapped: boolean;
    reported: boolean;
    follows_trader: boolean;
  };
}

interface FoxyVerdict {
  risk_score: number;
  verdict: 'TP_LIKELY' | 'NEUTRAL' | 'STOP_LIKELY';
  confidence: number;
  comment: string;
}

interface SetupEvent {
  id: number;
  event_time: string | null;
  action: string | null;
  changed_column: string | null;
  old_value: string | null;
  new_value: string | null;
  trader_name: string | null;
  trader_image: string | null;
}

interface EditDraft {
  stop_value: string;
  profit_taking_1: string;
  profit_taking_2: string;
  profit_taking_3: string;
  entry_value: string;
  note: string;
}

interface HistoryPoint {
  id: string;
  field: string;
  value: number | null;
  created_at: string | null;
}

export default function SetupDetailPage() {
  const params = useParams<{ setupId: string }>();
  const setupId = params?.setupId;
  const router = useRouter();

  const [detail, setDetail] = useState<SetupDetail | null>(null);
  const [foxy, setFoxy] = useState<FoxyVerdict | null>(null);
  const [events, setEvents] = useState<SetupEvent[] | null>(null);
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [watched, setWatched] = useState<boolean | null>(null);
  const [watchPending, setWatchPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clapPending, setClapPending] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [managePending, setManagePending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [imagePromptOpen, setImagePromptOpen] = useState(false);

  useEffect(() => {
    if (!setupId) return;
    let alive = true;
    setErr(null);
    Promise.all([
      api<SetupDetail>(`/setup/${setupId}`),
      api<FoxyVerdict>(`/feed/foxy/${setupId}`).catch(() => null),
      api<{ items: SetupEvent[] }>(`/feed/setup/${setupId}/events?limit=40`).catch(() => ({ items: [] })),
      api<{ items: HistoryPoint[] }>(`/setup/${setupId}/previous_values?limit=60`).catch(() => ({ items: [] })),
      api<{ watched: boolean }>(`/watch_list/status/${setupId}`).catch(() => ({ watched: false })),
      api<{ id: string }>(`/user/me`).catch(() => null),
    ])
      .then(([d, f, e, h, w, m]) => {
        if (!alive) return;
        setDetail(d);
        setFoxy(f);
        setEvents(e.items);
        setHistory(h.items);
        setWatched(w.watched);
        setMeId(m?.id ?? null);
      })
      .catch((x) => {
        if (!alive) return;
        const msg = x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message;
        setErr(msg);
      });
    return () => {
      alive = false;
    };
  }, [setupId]);

  const onToggleWatch = useCallback(async () => {
    if (!detail || watched == null) return;
    setWatchPending(true);
    const next = !watched;
    try {
      await api<{ ok: true }>(`/watch_list/${detail.id}`, {
        method: next ? 'PUT' : 'DELETE',
      });
      setWatched(next);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setWatchPending(false);
    }
  }, [detail, watched]);

  const onToggleClap = useCallback(async () => {
    if (!detail) return;
    setClapPending(true);
    try {
      const { clap_count } = await api<{ ok: true; clap_count: number }>(
        `/setup/${detail.id}/clap`,
        { method: detail.viewer.clapped ? 'DELETE' : 'PUT' },
      );
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              clap_count,
              viewer: { ...prev.viewer, clapped: !prev.viewer.clapped },
            }
          : prev,
      );
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setClapPending(false);
    }
  }, [detail]);

  const submitSuccessImage = useCallback(
    async (url: string) => {
      if (!detail) return;
      try {
        await api<{ ok: true }>(`/setup/${detail.id}/success_image`, {
          method: 'PATCH',
          body: JSON.stringify({ success_image: url.trim() || null }),
        });
        setDetail((prev) =>
          prev ? { ...prev, image_success: url.trim() || null } : prev,
        );
        setImagePromptOpen(false);
      } catch (x) {
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      }
    },
    [detail],
  );

  const openEdit = useCallback(() => {
    if (!detail) return;
    setEditDraft({
      stop_value: numToText(detail.stop_value),
      profit_taking_1: numToText(detail.profit_taking_1),
      profit_taking_2: numToText(detail.profit_taking_2),
      profit_taking_3: numToText(detail.profit_taking_3),
      entry_value: numToText(detail.entry_value),
      note: detail.note ?? '',
    });
    setEditOpen(true);
    setManageOpen(false);
  }, [detail]);

  const saveEdit = useCallback(async () => {
    if (!detail || !editDraft) return;
    setEditPending(true);
    try {
      const patch: Record<string, number | string | null> = {};
      const fields: Array<keyof EditDraft> = [
        'stop_value',
        'profit_taking_1',
        'profit_taking_2',
        'profit_taking_3',
        'entry_value',
      ];
      for (const f of fields) {
        const raw = (editDraft[f] ?? '').trim();
        if (raw === '') patch[f] = null;
        else {
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            throw new Error(`${f} sayı olmalı`);
          }
          patch[f] = n;
        }
      }
      const noteRaw = (editDraft.note ?? '').trim();
      patch.note = noteRaw === '' ? null : noteRaw;

      await api<{ ok: true }>(`/setup/${detail.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const fresh = await api<SetupDetail>(`/setup/${detail.id}`);
      setDetail(fresh);
      setEditOpen(false);
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
    } finally {
      setEditPending(false);
    }
  }, [detail, editDraft]);

  const onClose = useCallback(
    async (reason: 'success' | 'stop' | 'cancel') => {
      if (!detail) return;
      const labels: Record<typeof reason, string> = {
        success: 'Setup başarılı olarak kapatılsın mı?',
        stop: 'Setup stop ile kapatılsın mı?',
        cancel: 'Setup iptal edilsin mi?',
      };
      if (!window.confirm(labels[reason])) return;
      setManagePending(true);
      try {
        const res = await api<{ ok: true; status: SetupDetail['status'] }>(
          `/setup/${detail.id}/close`,
          { method: 'PATCH', body: JSON.stringify({ reason }) },
        );
        setDetail((prev) => (prev ? { ...prev, status: res.status } : prev));
        setManageOpen(false);
      } catch (x) {
        setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      } finally {
        setManagePending(false);
      }
    },
    [detail],
  );

  const onDelete = useCallback(async () => {
    if (!detail) return;
    if (!window.confirm('Setup kalıcı olarak silinecek. Emin misin?')) return;
    setManagePending(true);
    try {
      await api<{ ok: true }>(`/setup/${detail.id}`, { method: 'DELETE' });
      router.push('/app/feed');
    } catch (x) {
      setErr(x instanceof ApiError ? `${x.status} ${x.message}` : (x as Error).message);
      setManagePending(false);
    }
  }, [detail, router]);

  const onShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 1600);
    } catch {
      /* ignore */
    }
  }, []);

  if (err) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <p className="text-sm text-rose-300">Setup yüklenemedi: {err}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="h-60 animate-pulse rounded-2xl bg-white/[0.02]" />
      </div>
    );
  }

  const isLong = detail.position === 'long';
  const isShort = detail.position === 'short';
  const coinCode = (detail.coin.code || detail.coin_name).toUpperCase();
  const traderName =
    detail.trader.name ||
    [detail.trader.first_name, detail.trader.last_name].filter(Boolean).join(' ').trim() ||
    'Trader';

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/app/feed"
          className="inline-flex items-center gap-1 text-xs text-fg-muted transition hover:text-fg"
        >
          ← Akış
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void onToggleWatch()}
            disabled={watched == null || watchPending}
            className={`rounded-md px-3 py-1.5 text-xs ring-1 transition ${
              watched
                ? 'bg-brand/15 text-brand ring-brand/30'
                : 'bg-white/5 text-fg-muted ring-white/10 hover:text-fg'
            } disabled:opacity-60`}
            title={watched ? "Watchlist'ten çıkar" : "Watchlist'e ekle"}
          >
            {watched ? '★ Watchlist' : '☆ Watchlist'}
          </button>
          <button
            onClick={() => void onShare()}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
          >
            {shareToast ? 'Kopyalandı ✓' : 'Paylaş'}
          </button>
          <button
            onClick={() => setReportOpen(true)}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-white/10 hover:text-fg"
          >
            Bildir
          </button>
          {meId && meId === detail.trader.id ? (
            <div className="relative">
              <button
                onClick={() => setManageOpen((v) => !v)}
                disabled={managePending}
                className="rounded-md bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-400/15 disabled:opacity-60"
              >
                {managePending ? 'İşleniyor…' : 'Yönet ▾'}
              </button>
              {manageOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-bg-card shadow-xl">
                  <ManageItem
                    label="Fiyatları düzenle"
                    tone="amber"
                    disabled={managePending}
                    onClick={openEdit}
                  />
                  <ManageItem
                    label={detail.image_success ? 'Başarı görselini değiştir' : 'Başarı görseli ekle'}
                    tone="emerald"
                    disabled={managePending}
                    onClick={() => {
                      setManageOpen(false);
                      setImagePromptOpen(true);
                    }}
                  />
                  <ManageItem
                    label="Başarıyla kapat"
                    tone="emerald"
                    disabled={managePending}
                    onClick={() => void onClose('success')}
                  />
                  <ManageItem
                    label="Stop ile kapat"
                    tone="rose"
                    disabled={managePending}
                    onClick={() => void onClose('stop')}
                  />
                  <ManageItem
                    label="İptal et"
                    tone="dim"
                    disabled={managePending}
                    onClick={() => void onClose('cancel')}
                  />
                  <ManageItem
                    label="Sil"
                    tone="danger"
                    disabled={managePending}
                    onClick={() => void onDelete()}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Header */}
      <header className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5">
        <div className="flex flex-wrap items-start gap-4">
          <CoinIcon src={detail.coin.image} code={coinCode} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-mono text-2xl font-semibold text-fg">{coinCode}</div>
              {detail.coin.display_name && detail.coin.display_name.toUpperCase() !== coinCode ? (
                <div className="text-sm text-fg-dim">{detail.coin.display_name}</div>
              ) : null}
              <DirectionPill position={detail.position} />
              <StatusPill status={detail.status} subStatus={detail.sub_status} />
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted ring-1 ring-white/10">
                {detail.category === 'futures' ? 'Futures' : 'Spot'} · {detail.order_type}
              </span>
              {detail.open_leverage ? (
                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand ring-1 ring-brand/30">
                  {detail.open_leverage}x
                </span>
              ) : null}
              {detail.r_value != null ? (
                <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-fg-muted ring-1 ring-white/10">
                  R {detail.r_value.toFixed(1)}
                </span>
              ) : null}
            </div>

            <Link
              href={`/app/trader/${detail.trader.id}`}
              className="mt-3 inline-flex items-center gap-2 text-sm text-fg-muted transition hover:text-fg"
            >
              <TraderMini image={detail.trader.image} fallback={traderName[0]?.toUpperCase() ?? '?'} />
              <span className="font-medium">{traderName}</span>
              {detail.trader.is_trending ? (
                <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand ring-1 ring-brand/30">
                  Öne çıkan
                </span>
              ) : null}
              {detail.viewer.follows_trader ? (
                <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  Takipte
                </span>
              ) : null}
            </Link>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => void onToggleClap()}
              disabled={clapPending}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${
                detail.viewer.clapped
                  ? 'bg-brand/15 text-brand ring-brand/30 hover:bg-brand/20'
                  : 'bg-white/5 text-fg-muted ring-white/10 hover:text-fg'
              } disabled:opacity-60`}
            >
              👏 {detail.clap_count}
            </button>
            <div className="text-[11px] text-fg-dim">
              {formatRelative(detail.created_at)}
            </div>
          </div>
        </div>

        {detail.note ? (
          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm leading-relaxed text-fg">
            {detail.note}
          </div>
        ) : null}

        {detail.image_success ? (
          <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.image_success}
              alt="Başarı görüntüsü"
              className="max-h-80 w-full object-contain bg-black/40"
            />
          </div>
        ) : null}
      </header>

      {/* Chart + Foxy */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-bg-card p-4">
          <SetupChart
            symbol={detail.coin_name}
            entry={detail.entry_value}
            entryHigh={detail.entry_value_end}
            stop={detail.stop_value}
            tp1={detail.profit_taking_1}
            tp2={detail.profit_taking_2}
            tp3={detail.profit_taking_3}
            position={isLong ? 'long' : isShort ? 'short' : null}
            height={360}
          />
        </div>
        <FoxyPanel foxy={foxy} />
      </div>

      {/* Price matrix */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="text-[11px] uppercase tracking-wider text-fg-dim mb-3">Seviyeler</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <PriceBlock
            label="Giriş"
            value={formatRange(detail.entry_value, detail.entry_value_end)}
            initial={formatRange(detail.initial_entry_value, detail.initial_entry_value_end)}
            tone="accent"
          />
          <PriceBlock
            label="Stop"
            value={formatNum(detail.stop_value)}
            initial={formatNum(detail.initial_stop_value)}
            tone="danger"
          />
          <PriceBlock
            label="TP 1"
            value={formatNum(detail.profit_taking_1)}
            initial={formatNum(detail.initial_profit_taking_1)}
            tone="success"
            hit={!!detail.is_tp1}
            hitDate={detail.tp1_date}
          />
          <PriceBlock
            label="TP 2"
            value={formatNum(detail.profit_taking_2)}
            initial={formatNum(detail.initial_profit_taking_2)}
            tone="success"
            hit={!!detail.is_tp2}
            hitDate={detail.tp2_date}
          />
          {detail.profit_taking_3 != null ? (
            <PriceBlock
              label="TP 3"
              value={formatNum(detail.profit_taking_3)}
              initial={formatNum(detail.initial_profit_taking_3)}
              tone="success"
              hit={!!detail.is_tp3}
              hitDate={detail.tp3_date}
            />
          ) : null}
          {detail.close_price != null ? (
            <PriceBlock label="Kapanış" value={formatNum(detail.close_price)} tone="neutral" />
          ) : null}
        </div>
      </section>

      {/* Events timeline */}
      <EventsSection events={events} />

      {/* Price history */}
      <HistorySection history={history} />

      {/* Report modal */}
      {reportOpen && detail ? (
        <ReportModal
          setupId={detail.id}
          onClose={() => setReportOpen(false)}
          onDone={() =>
            setDetail((prev) =>
              prev ? { ...prev, viewer: { ...prev.viewer, reported: true } } : prev,
            )
          }
        />
      ) : null}

      {imagePromptOpen ? (
        <SuccessImageSheet
          current={detail?.image_success ?? null}
          onCancel={() => setImagePromptOpen(false)}
          onSubmit={submitSuccessImage}
        />
      ) : null}

      {/* Edit sheet — owner only */}
      {editOpen && editDraft ? (
        <EditSheet
          draft={editDraft}
          setDraft={setEditDraft}
          pending={editPending}
          isLong={isLong}
          onCancel={() => setEditOpen(false)}
          onSave={() => void saveEdit()}
        />
      ) : null}
    </div>
  );
}

function SuccessImageSheet({
  current,
  onCancel,
  onSubmit,
}: {
  current: string | null;
  onCancel: () => void;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState(current ?? '');
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-white/10 bg-bg-card p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Başarı görseli</h3>
          <button
            onClick={onCancel}
            className="text-lg leading-none text-fg-dim hover:text-fg"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <p className="text-[11px] text-fg-muted">
          Kapanışı kanıtlayan ekran görüntüsü URL'ini yapıştır. Sadece http(s) kabul edilir.
        </p>
        <label className="mt-3 block text-xs text-fg-muted">
          Görsel URL'i
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        {url ? (
          <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Önizleme"
              className="max-h-60 w-full object-contain bg-black/40"
            />
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost text-sm">
            Vazgeç
          </button>
          {current ? (
            <button
              onClick={() => onSubmit('')}
              className="rounded-lg bg-white/5 px-3 py-2 text-sm text-fg-muted ring-1 ring-white/10 hover:text-rose-300"
            >
              Kaldır
            </button>
          ) : null}
          <button
            onClick={() => onSubmit(url)}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSheet({
  draft,
  setDraft,
  pending,
  isLong,
  onCancel,
  onSave,
}: {
  draft: EditDraft;
  setDraft: (d: EditDraft | ((prev: EditDraft | null) => EditDraft | null)) => void;
  pending: boolean;
  isLong: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = (k: keyof EditDraft, v: string): void => {
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev));
  };
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-white/10 bg-bg-card p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Fiyat seviyelerini güncelle</h3>
          <button
            onClick={onCancel}
            className="text-fg-dim hover:text-fg text-lg leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <p className="text-[11px] text-fg-muted">
          Stop değerini girişe eşitlemek risk-free (breakeven) anlamına gelir — izin verilir.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <EditField
            label={`Giriş${isLong ? ' (alt)' : ' (üst)'}`}
            value={draft.entry_value}
            onChange={(v) => set('entry_value', v)}
          />
          <EditField
            label="Stop"
            value={draft.stop_value}
            onChange={(v) => set('stop_value', v)}
            hint="Breakeven için girişe eşitle"
          />
          <EditField
            label="TP1"
            value={draft.profit_taking_1}
            onChange={(v) => set('profit_taking_1', v)}
          />
          <EditField
            label="TP2"
            value={draft.profit_taking_2}
            onChange={(v) => set('profit_taking_2', v)}
          />
          <EditField
            label="TP3"
            value={draft.profit_taking_3}
            onChange={(v) => set('profit_taking_3', v)}
          />
        </div>

        <label className="mt-4 block text-xs text-fg-muted">
          Not
          <textarea
            value={draft.note}
            onChange={(e) => set('note', e.target.value)}
            rows={3}
            placeholder="Opsiyonel güncelleme açıklaması"
            className="mt-1 w-full resize-none rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost text-sm">
            Vazgeç
          </button>
          <button
            onClick={onSave}
            disabled={pending}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block text-xs text-fg-muted">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        placeholder="—"
        className="mt-1 w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      {hint ? <div className="mt-0.5 text-[10px] text-fg-dim">{hint}</div> : null}
    </label>
  );
}

function numToText(n: number | null): string {
  if (n == null) return '';
  return String(n);
}

function DirectionPill({ position }: { position: 'long' | 'short' | null }) {
  if (!position) return null;
  const long = position === 'long';
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
        long
          ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30'
          : 'bg-rose-400/10 text-rose-300 ring-rose-400/30'
      }`}
    >
      {long ? 'Long' : 'Short'}
    </span>
  );
}

function StatusPill({ status, subStatus }: { status: SetupDetail['status']; subStatus: string | null }) {
  const map: Record<SetupDetail['status'], { label: string; tone: string }> = {
    incoming: { label: 'Fırsat', tone: 'bg-amber-300/10 text-amber-200 ring-amber-300/30' },
    active: { label: 'Aktif', tone: 'bg-blue-400/10 text-blue-300 ring-blue-400/30' },
    success: { label: 'Başarılı', tone: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30' },
    closed: { label: 'Kapandı', tone: 'bg-white/5 text-fg-muted ring-white/10' },
    stopped: { label: 'Stop', tone: 'bg-rose-400/10 text-rose-300 ring-rose-400/30' },
    cancelled: { label: 'İptal', tone: 'bg-white/5 text-fg-dim ring-white/10' },
  };
  const cfg = map[status];
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${cfg.tone}`}>
      {cfg.label}
      {subStatus ? ` · ${subStatus}` : ''}
    </span>
  );
}

function CoinIcon({ src, code, size }: { src: string | null; code: string; size: number }) {
  const initial = code.slice(0, 3) || '?';
  const dim = { width: size, height: size };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={dim} className="rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div
      style={dim}
      className="flex items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 font-mono text-xs font-bold text-fg-muted"
    >
      {initial}
    </div>
  );
}

function ManageItem({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  tone: 'emerald' | 'rose' | 'dim' | 'danger' | 'amber';
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-300 hover:bg-emerald-400/10'
      : tone === 'rose'
        ? 'text-rose-300 hover:bg-rose-400/10'
        : tone === 'amber'
          ? 'text-amber-300 hover:bg-amber-400/10'
          : tone === 'danger'
            ? 'text-rose-400 hover:bg-rose-500/15'
            : 'text-fg-muted hover:bg-white/5';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`block w-full px-3 py-2 text-left text-xs transition disabled:opacity-50 ${toneClass}`}
    >
      {label}
    </button>
  );
}

function TraderMini({ image, fallback }: { image: string | null; fallback: string }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10" />
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-fg ring-1 ring-white/10">
      {fallback}
    </div>
  );
}

function PriceBlock({
  label,
  value,
  initial,
  tone,
  hit,
  hitDate,
}: {
  label: string;
  value: string;
  initial?: string;
  tone: 'accent' | 'success' | 'danger' | 'neutral';
  hit?: boolean;
  hitDate?: string | null;
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-300'
        : tone === 'accent'
          ? 'text-blue-300'
          : 'text-fg';
  const showInitial = initial && initial !== value && initial !== '—';
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        hit ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-white/5 bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-fg-dim">
        <span>{label}</span>
        {hit ? (
          <span className="rounded bg-emerald-400/20 px-1 text-[9px] text-emerald-200">✓</span>
        ) : null}
      </div>
      <div className={`mt-0.5 font-mono text-base ${toneClass}`}>{value}</div>
      {showInitial ? (
        <div className="mt-0.5 font-mono text-[10px] text-fg-dim">
          İlk: <span className="line-through decoration-fg-dim/60">{initial}</span>
        </div>
      ) : null}
      {hit && hitDate ? (
        <div className="mt-0.5 text-[10px] text-emerald-300/80">
          {formatRelative(hitDate)}
        </div>
      ) : null}
    </div>
  );
}

function FoxyPanel({ foxy }: { foxy: FoxyVerdict | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-fg-dim">
        <FoxyIcon /> Foxy AI
      </div>
      {foxy == null ? (
        <div className="mt-3 space-y-2">
          <div className="h-2 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-full animate-pulse rounded bg-white/10" />
          <div className="h-2 w-5/6 animate-pulse rounded bg-white/10" />
        </div>
      ) : (
        <>
          <RiskGauge value={foxy.risk_score} verdict={foxy.verdict} />
          <p className="mt-3 text-sm leading-relaxed text-fg">{foxy.comment}</p>
          <div className="mt-3 text-[11px] text-fg-dim">Güven: {foxy.confidence}%</div>
        </>
      )}
    </div>
  );
}

function RiskGauge({ value, verdict }: { value: number; verdict: FoxyVerdict['verdict'] }) {
  const label =
    verdict === 'TP_LIKELY' ? 'TP olası' : verdict === 'STOP_LIKELY' ? 'Stop olası' : 'Dengeli';
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-fg-dim">Risk skoru</div>
        <div className="font-mono text-sm text-fg">
          {value}
          <span className="text-fg-dim">/100</span>
        </div>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-white/5">
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${value}%`,
            backgroundImage: 'linear-gradient(90deg, #34d399 0%, #fbbf24 55%, #f87171 100%)',
          }}
        />
      </div>
      <div className="mt-1 text-[11px] text-fg-muted">{label}</div>
    </div>
  );
}

function FoxyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <path
        fill="currentColor"
        d="M10 2c1.8 1.2 3 2.8 3 4.5 1.5.4 3 1.8 3 3.7 0 1.6-.9 3-2.2 3.6L13 17l-2-1.5L9 17l-.8-3.2C6.9 13.2 6 11.8 6 10.2c0-1.9 1.5-3.3 3-3.7C9 4.8 10 3.2 10 2Zm-1.7 8.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm3.4 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
      />
    </svg>
  );
}

function EventsSection({ events }: { events: SetupEvent[] | null }) {
  if (events == null) {
    return (
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="text-[11px] uppercase tracking-wider text-fg-dim mb-3">
          Trader güncellemeleri
        </div>
        <div className="space-y-2">
          <div className="h-2 w-1/2 animate-pulse rounded bg-white/10" />
          <div className="h-2 w-2/3 animate-pulse rounded bg-white/10" />
        </div>
      </section>
    );
  }
  if (events.length === 0) {
    return (
      <section className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-fg-dim">
        Henüz güncelleme yok.
      </section>
    );
  }
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wider text-fg-dim mb-3">
        Trader güncellemeleri
      </div>
      <ol className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-[12px] leading-relaxed">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <span className="min-w-0 flex-1">
              <EventLine e={e} />
            </span>
            <span className="shrink-0 font-mono text-[10px] text-fg-dim">
              {formatAgo(e.event_time)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EventLine({ e }: { e: SetupEvent }) {
  const col = humanColumn(e.changed_column);
  if (e.action === 'insert') return <span className="text-fg">Setup paylaşıldı.</span>;
  if (e.action === 'update' && col) {
    const from = fmtVal(e.old_value);
    const to = fmtVal(e.new_value);
    if (from && to && from !== to) {
      return (
        <span className="text-fg">
          <span className="text-fg-muted">{col}</span>{' '}
          <span className="font-mono text-rose-300/90 line-through decoration-rose-400/40">
            {from}
          </span>{' '}
          → <span className="font-mono text-emerald-300">{to}</span>
        </span>
      );
    }
    if (to) {
      return (
        <span className="text-fg">
          <span className="text-fg-muted">{col}</span>{' '}
          <span className="font-mono text-emerald-300">{to}</span>
        </span>
      );
    }
    return <span className="text-fg-muted">{col} güncellendi</span>;
  }
  return <span className="text-fg-muted">{e.action} {e.changed_column ?? ''}</span>;
}

function HistorySection({ history }: { history: HistoryPoint[] | null }) {
  if (!history || history.length === 0) return null;
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wider text-fg-dim mb-3">
        Fiyat geçmişi
      </div>
      <div className="grid grid-cols-1 gap-y-1 text-[12px] sm:grid-cols-2">
        {history.slice(0, 30).map((h) => (
          <div key={h.id} className="flex items-center justify-between gap-2 font-mono">
            <span className="text-fg-muted">{humanColumn(h.field) || h.field}</span>
            <span className="text-fg">{h.value != null ? h.value : '—'}</span>
            <span className="text-[10px] text-fg-dim">{formatAgo(h.created_at)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportModal({
  setupId,
  onClose,
  onDone,
}: {
  setupId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    setErr(null);
    if (reason.trim().length < 4) {
      setErr('En az 4 karakter girmelisin.');
      return;
    }
    setBusy(true);
    try {
      await api<{ ok: true }>(`/setup/${setupId}/report`, {
        method: 'POST',
        body: JSON.stringify({ content: reason.trim() }),
      });
      onDone();
      onClose();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-fg">Setup'ı bildir</h2>
        <p className="mt-1 text-sm text-fg-muted">Ne sorun olduğunu kısaca anlat. Bu yalnızca ekibe iletilir.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          maxLength={400}
          className="mt-3 w-full resize-none rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="Neyi bildiriyorsun?"
        />
        {err ? <p className="mt-2 text-xs text-rose-300">{err}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm">İptal</button>
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white ring-1 ring-brand hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Gönderiliyor…' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}

function humanColumn(col: string | null): string {
  if (!col) return '';
  const map: Record<string, string> = {
    status: 'Durum',
    sub_status: 'Alt durum',
    entry_value: 'Giriş',
    entry_value_end: 'Giriş üst',
    stop_value: 'Stop',
    profit_taking_1: 'TP1',
    profit_taking_2: 'TP2',
    profit_taking_3: 'TP3',
    is_tp1: 'TP1 vuruldu',
    is_tp2: 'TP2 vuruldu',
    is_tp3: 'TP3 vuruldu',
    close_price: 'Kapanış',
    note: 'Not',
    open_leverage: 'Kaldıraç',
    take_profit_1: 'TP1',
    take_profit_2: 'TP2',
    take_profit_3: 'TP3',
  };
  return map[col] ?? col;
}

function fmtVal(v: string | null): string | null {
  if (v == null) return null;
  const n = Number(v);
  if (Number.isFinite(n)) {
    const abs = Math.abs(n);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    return n.toLocaleString('en-US', { maximumFractionDigits: digits });
  }
  return v;
}

function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function formatRange(a: number | null, b: number | null): string {
  if (a == null) return '—';
  if (b == null || b === a) return formatNum(a);
  return `${formatNum(a)} – ${formatNum(b)}`;
}

function formatAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffS = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (diffS < 60) return `${diffS}s`;
  const m = Math.round(diffS / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.round(h / 24);
  return `${d}g`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const ago = formatAgo(iso);
  return ago ? `${ago} önce` : '';
}

const IOS_URL =
  process.env.NEXT_PUBLIC_IOS_URL ||
  'https://apps.apple.com/tr/app/bottomup-social/id1661474993';
const ANDROID_URL =
  process.env.NEXT_PUBLIC_ANDROID_URL ||
  'https://play.google.com/store/apps/details?id=com.bottomup.bottomupapp';

export const storeUrls = { ios: IOS_URL, android: ANDROID_URL };

export function StoreBadges({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const base =
    size === 'sm'
      ? 'h-11 px-3 text-[11px]'
      : 'h-14 px-4 text-[12px]';
  const iconSize = size === 'sm' ? 18 : 22;
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      <a
        href={IOS_URL}
        target="_blank"
        rel="noreferrer"
        className={`${base} inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-black text-white transition hover:border-white/30 hover:bg-black/80`}
        aria-label="Download on the App Store"
      >
        <AppleIcon size={iconSize} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-medium uppercase tracking-wider text-white/70">
            Download on the
          </span>
          <span className="text-[15px] font-semibold leading-tight">
            App Store
          </span>
        </span>
      </a>
      <a
        href={ANDROID_URL}
        target="_blank"
        rel="noreferrer"
        className={`${base} inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-black text-white transition hover:border-white/30 hover:bg-black/80`}
        aria-label="Get it on Google Play"
      >
        <GooglePlayIcon size={iconSize} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] font-medium uppercase tracking-wider text-white/70">
            Get it on
          </span>
          <span className="text-[15px] font-semibold leading-tight">
            Google Play
          </span>
        </span>
      </a>
    </div>
  );
}

function AppleIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className="fill-current"
    >
      <path d="M11.18 8.41c-.02-1.78 1.45-2.64 1.52-2.68-.83-1.22-2.12-1.38-2.58-1.4-1.1-.11-2.14.65-2.7.65-.56 0-1.42-.63-2.33-.62-1.2.02-2.31.7-2.93 1.77-1.25 2.17-.32 5.37.9 7.13.6.86 1.31 1.83 2.23 1.8.9-.04 1.24-.58 2.33-.58 1.09 0 1.4.58 2.35.56.97-.02 1.59-.88 2.18-1.74.69-1 .97-1.97.98-2.02-.02-.01-1.88-.72-1.9-2.87zM9.48 3.16c.5-.6.83-1.44.74-2.28-.72.03-1.59.48-2.1 1.08-.46.53-.86 1.39-.75 2.21.8.06 1.61-.41 2.11-1.01z" />
    </svg>
  );
}

function GooglePlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#34A853" d="M3.6 20.6l10-10-10-10C3.2 1 3 1.5 3 2v20c0 .5.2 1 .6.6z" />
      <path fill="#FBBC05" d="M17.5 8.3l-3.9-2.3L11 9l2.6 2.6 3.9-3.3z" />
      <path fill="#EA4335" d="M20.8 10.5l-3.3-1.9-3.2 3.4 3.2 3.1 3.3-1.9c1.1-.6 1.1-2.1 0-2.7z" />
      <path fill="#4285F4" d="M13.6 11.6L3.6 20.6c.4.4 1 .5 1.6.1l12.3-7-3.9-2.1z" />
    </svg>
  );
}

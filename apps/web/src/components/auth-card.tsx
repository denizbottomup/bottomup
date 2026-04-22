import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded-lg bg-brand" />
          <span className="text-lg font-semibold">bottomUP</span>
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-4 text-center text-sm text-fg-muted">{footer}</div> : null}
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingShell } from '@/components/landing/landing-shell';
import { LOCALES, type LocaleCode } from '@/lib/locale-config';
import { landingMetadata } from '../_landing-metadata';

export const revalidate = 60;

/**
 * The `en` locale is canonically served at "/" (no prefix), so it's
 * NOT pre-rendered here. Visiting `/en` lands in the catch-all and
 * 404s; we let Google rely on the canonical tag to route users to /.
 */
const STATIC_LOCALES: readonly string[] = LOCALES.filter(
  (l) => l.code !== 'en',
).map((l) => l.code);

export function generateStaticParams() {
  return STATIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!STATIC_LOCALES.includes(locale as LocaleCode)) {
    return {};
  }
  return landingMetadata(locale as LocaleCode);
}

export default async function LocaleLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!STATIC_LOCALES.includes(locale as LocaleCode)) {
    notFound();
  }
  return <LandingShell locale={locale as LocaleCode} />;
}

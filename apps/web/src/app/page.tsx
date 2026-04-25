import type { Metadata } from 'next';
import { LandingShell } from '@/components/landing/landing-shell';
import { landingMetadata } from './_landing-metadata';

export const revalidate = 60;
export const metadata: Metadata = landingMetadata('en');

export default function LandingPage() {
  return <LandingShell locale="en" />;
}

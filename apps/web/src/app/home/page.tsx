import { redirect } from 'next/navigation';

/**
 * `/home` itself has no surface; it's just the entry redirect into
 * the default sidebar tab. Foxy is the post-login landing per the
 * Phase 1 product spec.
 */
export default function HomeIndexPage(): never {
  redirect('/home/foxy');
}

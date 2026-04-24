import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  variant?: 'mark' | 'lockup'; // mark = icon only, lockup = icon + wordmark
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  className?: string;
}

const marks = {
  sm: { w: 24, h: 24 },
  md: { w: 32, h: 32 },
  lg: { w: 56, h: 56 },
};

const lockups = {
  sm: { w: 112, h: 28 },
  md: { w: 144, h: 36 },
  lg: { w: 200, h: 50 },
};

export function Logo({
  variant = 'lockup',
  size = 'md',
  href = '/',
  className = '',
}: LogoProps) {
  const src = variant === 'mark' ? '/logos/logomark-color.png' : '/logos/logotype-color-light.png';
  const dims = variant === 'mark' ? marks[size] : lockups[size];

  const img = (
    <Image
      src={src}
      alt="bottomUP"
      width={dims.w}
      height={dims.h}
      priority
      className={className}
    />
  );

  if (!href) return img;
  return (
    <Link href={href} aria-label="bottomUP" className="inline-flex items-center">
      {img}
    </Link>
  );
}

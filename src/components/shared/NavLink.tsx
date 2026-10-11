'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavLinkProps {
  to: string;
  className?: string | ((props: { isActive: boolean }) => string);
  children?: ReactNode | ((props: { isActive: boolean }) => ReactNode);
  title?: string;
}

export function NavLink({ to, className, children, title }: NavLinkProps) {
  const pathname = usePathname() ?? '';
  const isActive = pathname === to || pathname.startsWith(`${to}/`);
  const resolvedClass = typeof className === 'function' ? className({ isActive }) : className;
  const resolvedChildren = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <Link href={to} className={resolvedClass} title={title}>
      {resolvedChildren}
    </Link>
  );
}

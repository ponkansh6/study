"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

type NavLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  pendingClassName?: string;
  children: ReactNode;
};

export function NavLink({ href, pendingClassName, className, children, ...rest }: NavLinkProps) {
  return (
    <Link href={href} className={className} {...rest}>
      <PendingState pendingClassName={pendingClassName}>{children}</PendingState>
    </Link>
  );
}

function PendingState({
  pendingClassName,
  children,
}: {
  pendingClassName?: string;
  children: ReactNode;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={["inline-flex items-center justify-center gap-2", pending && pendingClassName]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

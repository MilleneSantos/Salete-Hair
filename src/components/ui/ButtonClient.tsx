"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "md" | "lg";

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "disabled"> & {
    href?: undefined;
  };

type AnchorProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> & {
    href: string;
  };

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-2xl border font-medium transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] active:opacity-90";

const variantClasses: Record<Variant, string> = {
  primary: "bg-[#D4AF37] text-black border-[#D4AF37] active:brightness-95",
  secondary: "bg-white/8 text-white border-[#D4AF37]/25 active:bg-white/12",
  outline: "bg-white/5 text-white border-[#D4AF37]/35 active:bg-white/10",
  ghost: "bg-transparent text-[#D4AF37] border-transparent active:bg-[#D4AF37]/10",
};

const sizeClasses: Record<Size, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

function buildClasses(params: {
  variant: Variant;
  size: Size;
  fullWidth: boolean;
  selected: boolean;
  loading: boolean;
  disabled: boolean;
  className?: string;
}) {
  const {
    variant,
    size,
    fullWidth,
    selected,
    disabled,
    loading,
    className,
  } = params;
  const isDisabled = Boolean(disabled || loading);
  const selectedClasses = "bg-[#D4AF37] text-black border-[#D4AF37]";
  const classes = [
    baseClasses,
    sizeClasses[size],
    selected ? selectedClasses : variantClasses[variant],
    fullWidth ? "w-full" : "",
    isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return { classes, isDisabled };
}

export function ButtonClient(props: ButtonProps | AnchorProps) {
  const {
    variant = "secondary",
    size = "md",
    fullWidth = false,
    selected = false,
    loading = false,
    disabled = false,
    className,
    children,
    ...rest
  } = props as CommonProps & Record<string, unknown>;

  const { classes, isDisabled } = buildClasses({
    variant,
    size,
    fullWidth,
    selected,
    loading,
    disabled,
    className,
  });

  if ("href" in rest && typeof rest.href === "string") {
    const { href, onClick, ...anchorProps } = rest as AnchorProps;

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <a
        href={href}
        className={classes}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={handleClick}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  const { type = "button", ...buttonProps } = rest as ButtonProps;

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

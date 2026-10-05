import type { ComponentChildren, JSX } from "preact";
import { Icon, type IconName } from "../Icon/Icon.tsx";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "text" | "icon";

interface CommonProps {
  variant?: Variant;
  size?: "md" | "sm";
  icon?: IconName;
  iconAfter?: IconName;
  label?: string; // accessible name (required for icon-only buttons)
  class?: string;
  children?: ComponentChildren;
}

type NativeButton = Omit<JSX.IntrinsicElements["button"], "size" | "label" | "icon" | "class">;
// Preact types <a> as a union keyed on href; Omit collapses it, so drop `role` (links here never need one).
type NativeLink = Omit<JSX.IntrinsicElements["a"], "size" | "label" | "icon" | "class" | "href" | "role">;
type ButtonProps = CommonProps & NativeButton & { href?: undefined };
type LinkProps = CommonProps & NativeLink & { href: string };

/** Square, uppercase Equinox-style button. Renders an <a> when given an href. */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = "secondary", size = "md", icon, iconAfter, label, class: extra, children, ...rest } = props;
  const className = [styles.button, styles[variant], styles[size], extra].filter(Boolean).join(" ");
  const iconSize = size === "sm" ? 16 : 20;
  const content = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      {children && <span>{children}</span>}
      {iconAfter && <Icon name={iconAfter} size={16} />}
    </>
  );
  if (typeof rest.href === "string") {
    const { href, ...linkRest } = rest as NativeLink & { href: string };
    return (
      <a class={className} aria-label={label} {...linkRest} href={href}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" class={className} aria-label={label} {...(rest as NativeButton)}>
      {content}
    </button>
  );
}

import { cn } from "@/lib/utils";

/**
 * Icons drawn in the same hand as the strokes and the tally marks: one weight,
 * round caps, slightly imperfect curves, never a filled shape. They exist to
 * replace sentences like "Turn the microphone off", which read as instructions
 * rather than controls.
 */

type IconProps = {
  className?: string;
  /** Give it a label when the icon is the only thing naming a control. */
  title?: string;
  strokeWidth?: number;
};

function Svg({
  children,
  className,
  title,
  strokeWidth = 1.7,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2c-1.5 0-2.5 1-2.5 2.4v5.6c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5V5.6C14.5 4.2 13.5 3.2 12 3.2Z" />
      <path d="M5.8 10.6c.2 3.4 2.8 5.9 6.2 5.9s6-2.5 6.2-5.9" />
      <path d="M12 16.6c0 1.4-.1 2.8 0 4.2" />
      <path d="M8.8 20.8c2.2-.3 4.3-.3 6.4 0" />
    </Svg>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 6.1c-.1-1.7.9-2.9 2.5-2.9 1.5 0 2.5 1 2.5 2.4v4.2" />
      <path d="M9.5 10v1.2c0 1.5 1 2.5 2.5 2.5.6 0 1.1-.2 1.5-.5" />
      <path d="M5.8 10.6c.1 2.2 1.3 4.1 3.1 5.2" />
      <path d="M18.2 10.6a6.3 6.3 0 0 1-1 3.2" />
      <path d="M12 16.6v4.2" />
      <path d="M8.8 20.8c2.2-.3 4.3-.3 6.4 0" />
      <path d="M4.2 3.6c5.2 5.4 10.5 10.9 15.8 16.4" strokeOpacity="0.85" />
    </Svg>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.4 7.4c5.8-.5 11.5-.5 17.2 0 .5 3.1.5 6.1 0 9.2-5.7.5-11.4.5-17.2 0-.5-3.1-.5-6.1 0-9.2Z" />
      <path d="M7 10.6h.01M10.4 10.6h.01M13.8 10.6h.01M17 10.6h.01" />
      <path d="M8.4 13.9c2.4-.2 4.8-.2 7.2 0" />
    </Svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.4 6.8c3.7-.4 7.5-.4 11.2 0 .4 3.5.4 6.9 0 10.4-3.7.4-7.5.4-11.2 0-.4-3.5-.4-6.9 0-10.4Z" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.2 6c4 3.9 7.8 8 11.6 12.1" />
      <path d="M17.9 6.1C13.9 10 10 14 6.1 18" />
    </Svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12c5.4-1.9 10.9-3.6 16.4-5.1-1.6 5.5-3.3 11-5.1 16.4" transform="translate(0 -2)" />
      <path d="M4 12c3.7.7 7.3 1.4 10.9 2.2" />
    </Svg>
  );
}

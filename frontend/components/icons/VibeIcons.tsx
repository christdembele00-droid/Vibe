"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.2 4.2" /></Icon>;
}

export function StatusIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="3.1" /></Icon>;
}

export function GroupsIcon(props: IconProps) {
  return <Icon {...props}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M3.8 19c.5-3.1 2.2-4.8 5.2-4.8s4.7 1.7 5.2 4.8" /><path d="M14.5 15.2c2.8-.5 4.8.9 5.4 3.8" /></Icon>;
}

export function ChannelIcon(props: IconProps) {
  return <Icon {...props}><path d="M7 4.5h10v15H7z" /><path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3.2" /></Icon>;
}

export function SettingsIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.2 13.1 1.1.8-1.7 3-1.3-.5a7.6 7.6 0 0 1-1.5.9l-.2 1.4h-3.5l-.2-1.4a7.6 7.6 0 0 1-1.5-.9l-1.3.5-1.7-3 1.1-.8a7 7 0 0 1 0-1.9l-1.1-.8 1.7-3 1.3.5a7.6 7.6 0 0 1 1.5-.9l.2-1.4h3.5l.2 1.4a7.6 7.6 0 0 1 1.5.9l1.3-.5 1.7 3-1.1.8a7 7 0 0 1 0 1.9Z" /></Icon>;
}

export function ReplyIcon(props: IconProps) {
  return <Icon {...props}><path d="M9 7 4 12l5 5" /><path d="M5 12h8.2a6 6 0 0 1 6 6" /></Icon>;
}

export function EditIcon(props: IconProps) {
  return <Icon {...props}><path d="m4.5 16.8-.8 3.5 3.5-.8L18.5 8.2a2.5 2.5 0 0 0-3.5-3.5L4.5 16.8Z" /><path d="m13.5 6.5 4 4" /></Icon>;
}

export function DeleteIcon(props: IconProps) {
  return <Icon {...props}><path d="M5 7h14M9 7V4.5h6V7M7 7l.7 12.5h8.6L17 7M10 10.5v6M14 10.5v6" /></Icon>;
}

export function AttachIcon(props: IconProps) {
  return <Icon {...props}><path d="m9 12.5 5.8-5.8a3.1 3.1 0 0 1 4.4 4.4l-7.8 7.8a5 5 0 0 1-7.1-7.1l7.5-7.5a3.5 3.5 0 0 1 5 5L9.5 16.6a2 2 0 0 1-2.8-2.8l7-7" /></Icon>;
}

export function SendIcon(props: IconProps) {
  return <Icon {...props}><path d="m21 3-7.2 18-3.5-7.3L3 10.2 21 3Z" /><path d="m10.3 13.7 4.8-4.8" /></Icon>;
}

export function CloseIcon(props: IconProps) {
  return <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
}

export function CheckDoubleIcon(props: IconProps) {
  return <Icon {...props}><path d="m4 12 3.2 3.2L13 9.4" /><path d="m9.5 15.2 1.1 1.1L20 7" /></Icon>;
}

export function PhoneIcon(props: IconProps) {
  return <Icon {...props}><path d="M7.2 4.5 9.5 4l2 4.3-1.8 1.4a13.5 13.5 0 0 0 4.6 4.6l1.4-1.8 4.3 2-.5 2.3a2.7 2.7 0 0 1-3 2.1C9.8 18.3 5.7 14.2 5.1 7.5a2.7 2.7 0 0 1 2.1-3Z" /></Icon>;
}

export function VideoIcon(props: IconProps) {
  return <Icon {...props}><rect x="3.5" y="6" width="12" height="12" rx="3" /><path d="m15.5 10 5-3v10l-5-3" /></Icon>;
}

export function MenuIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
}

export function VibeLogo({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path d="M4 5.5 8.6 18h2.1L15.3 5.5h-2.7l-3 8.6-3-8.6H4Z" fill="currentColor" />
      <path d="m15.4 5.5 3.1 8.6 1.5-4.2-1.6-4.4h-3Z" fill="currentColor" opacity=".72" />
    </svg>
  );
}

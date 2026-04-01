import { TextField } from "@radix-ui/themes";

export const CalendarIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-4 w-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="16" y1="2.5" x2="16" y2="6" />
    <line x1="8" y1="2.5" x2="8" y2="6" />
    <line x1="3" y1="9" x2="21" y2="9" />
  </svg>
);

export const ClockIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-4 w-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5l3 2" />
  </svg>
);

export const CalendarSlot = () => (
  <TextField.Slot side="left">
    <CalendarIcon />
  </TextField.Slot>
);

export const ClockSlot = () => (
  <TextField.Slot side="left">
    <ClockIcon />
  </TextField.Slot>
);

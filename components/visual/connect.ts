"use client";

// Opens the slide-in connect form from anywhere on the page, tagged with what the visitor was reading.
export type ConnectDetail = { topic: string; segment?: string; products?: string[]; title?: string };

export function openConnect(d: ConnectDetail) {
  track("connect_open", d.topic);
  window.dispatchEvent(new CustomEvent<ConnectDetail>("labb:connect", { detail: d }));
}

// Analytics hook (Google Tag Manager dataLayer). Records which details visitors open.
export function track(event: string, topic: string) {
  (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event, topic, page: window.location.pathname });
}

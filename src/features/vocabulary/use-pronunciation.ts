"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const supported = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
const serverSupported = () => false;

export function usePronunciation(text: string) {
  const available = useSyncExternalStore(subscribe, supported, serverSupported);
  function speak() {
    if (!available) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    window.speechSynthesis.speak(utterance);
  }
  return { available, speak };
}

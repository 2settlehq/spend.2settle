"use client";

import React, { useEffect, useState } from "react";

const phrases = ["Transfer Money", "Make Payment"];

export default function FooterTypingText() {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "erasing">("typing");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!preference) return;
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener?.("change", update);
    return () => preference.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const phrase = phrases[phraseIndex];
    const waiting = phase === "typing" && text.length === phrase.length;
    const timeout = window.setTimeout(() => {
      if (phase === "typing") {
        if (waiting) setPhase("erasing");
        else setText(phrase.slice(0, text.length + 1));
      } else if (text.length > 0) {
        setText(text.slice(0, -1));
      } else {
        setPhraseIndex((index) => (index + 1) % phrases.length);
        setPhase("typing");
      }
    }, waiting ? 2000 : 100);
    return () => window.clearTimeout(timeout);
  }, [text, phraseIndex, phase, reducedMotion]);

  return (
    <p className="min-h-6 max-w-[220px] text-sm leading-5 text-white sm:max-w-none sm:pr-6 sm:text-base" aria-label="@2SettleHQ: Transfer Money or Make Payment">
      <span className="text-white/75">@2SettleHQ | </span>
      <span aria-hidden="true">{reducedMotion ? phrases.join(" / ") : text}</span>
      {!reducedMotion && <span aria-hidden="true" className="ml-0.5 inline-block animate-blink text-white">|</span>}
    </p>
  );
}

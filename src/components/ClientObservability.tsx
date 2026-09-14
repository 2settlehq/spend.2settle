import dynamic from "next/dynamic";
import React from "react";

// These invisible widgets use routing hooks inside Suspense. Mount them only
// in the browser so startup updates cannot interrupt their server hydration.
const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((module) => module.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((module) => module.SpeedInsights),
  { ssr: false },
);

export default function ClientObservability() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

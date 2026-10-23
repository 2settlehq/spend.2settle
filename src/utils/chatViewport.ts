type VisualViewportMetrics = {
  height: number;
  offsetTop: number;
};

type ChatViewportInput = {
  innerHeight: number;
  documentHeight: number;
  visualViewport?: VisualViewportMetrics | null;
};

/**
 * Mobile browsers do not always resize the layout and visual viewports in the
 * same way when the keyboard opens. Use the smallest reported height so a
 * stale Samsung Internet visual viewport cannot leave the composer underneath
 * the keyboard.
 */
export function getChatViewportMetrics({
  innerHeight,
  documentHeight,
  visualViewport,
}: ChatViewportInput) {
  const heights = [
    innerHeight,
    documentHeight,
    visualViewport?.height,
  ].filter(
    (height): height is number =>
      typeof height === "number" && Number.isFinite(height) && height > 0,
  );

  return {
    height: Math.round(Math.min(...heights)),
    top: Math.max(0, Math.round(visualViewport?.offsetTop ?? 0)),
  };
}

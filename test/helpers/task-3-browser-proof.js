import { createHash } from "node:crypto";

export function buildBootstrapProof(challenge) {
  const canvasBytes = sampleCanvasBytes(challenge.canvas);
  const layoutMetrics = [
    challenge.layout.root.width,
    challenge.layout.root.height,
    challenge.layout.child.width,
    challenge.layout.child.height,
  ];

  return createHash("sha256")
    .update(
      [challenge.nonce, canvasBytes.join(","), layoutMetrics.join(",")].join(
        "|",
      ),
    )
    .digest("hex");
}

function sampleCanvasBytes(canvas) {
  return canvas.samplePoints.flatMap(([x, y]) => colorAt(canvas, x, y));
}

function colorAt(canvas, x, y) {
  const stripe = canvas.stripes.find(
    (item) => x >= item.x && x < item.x + item.width,
  );
  const inAccent =
    x >= canvas.accent.x &&
    x < canvas.accent.x + canvas.accent.width &&
    y >= canvas.accent.y &&
    y < canvas.accent.y + canvas.accent.height;
  return hexToRgba(inAccent ? canvas.accent.color : stripe.color);
}

function hexToRgba(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

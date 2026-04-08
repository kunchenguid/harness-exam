import { createHash, randomBytes } from "node:crypto";

export function createBrowserBootstrapChallenge() {
  const seed = randomBytes(12);

  return {
    nonce: seed.toString("hex"),
    canvas: {
      width: 96,
      height: 48,
      stripes: buildStripes(seed),
      accent: {
        x: 12 + (seed[3] % 28),
        y: 8 + (seed[4] % 14),
        width: 18 + (seed[5] % 14),
        height: 10 + (seed[6] % 10),
        color: toHexColor(seed[7], seed[8], seed[9]),
      },
      samplePoints: [
        [5, 5],
        [36, 8],
        [68, 12],
        [91, 6],
        [20 + (seed[10] % 10), 16 + (seed[11] % 8)],
      ],
    },
    layout: {
      root: {
        width: 140 + (seed[0] % 30),
        height: 54 + (seed[1] % 18),
      },
      child: {
        width: 72 + (seed[2] % 28),
        height: 18 + (seed[3] % 10),
      },
    },
  };
}

export function buildExpectedBrowserBootstrapProof(challenge) {
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

export function createBrowserSessionSecret() {
  return randomBytes(16).toString("hex");
}

function buildStripes(seed) {
  const width = 24;
  return [0, 1, 2, 3].map((index) => ({
    x: index * width,
    width,
    color: toHexColor(
      seed[index],
      seed[(index + 4) % seed.length],
      seed[(index + 8) % seed.length],
    ),
  }));
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

function toHexColor(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgba(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

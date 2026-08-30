// Flavor text tiers, ordered from least to most rekt.
// Each entry: { max, lines: [...] } — the first tier whose `max` is >= the
// rolled percentage is used, and a line is picked (deterministically) from it.

const TIERS = [
  {
    max: 9,
    lines: [
      "basically untouched. Diamond hands, or just got lucky.",
      "barely felt a thing. The market respects you today.",
      "practically rekt-proof. Suspiciously calm portfolio.",
    ],
  },
  {
    max: 24,
    lines: [
      "took a light scratch. Nothing a green candle won't fix.",
      "mildly rekt. Down bad, but not embarrassing.",
      "felt a small dip. Could still post the PnL screenshot.",
    ],
  },
  {
    max: 49,
    lines: [
      "took real damage but still standing.",
      "definitely rekt, but recoverable. Maybe.",
      "bruised. The chart is not your friend today.",
    ],
  },
  {
    max: 74,
    lines: [
      "getting rekt. It's not looking good in there.",
      "solidly rekt. Time to stop checking the app.",
      "deep in the red. Send thoughts and prayers.",
    ],
  },
  {
    max: 89,
    lines: [
      "absolutely rekt. RIP portfolio.",
      "catastrophically rekt. This is a screenshot for the ages.",
      "nuked. Down only, and going lower.",
    ],
  },
  {
    max: 99,
    lines: [
      "nuclear rekt. Liquidated into oblivion.",
      "rekt beyond recognition. Even the whales feel bad.",
      "margin called, liquidated, and memed about. In that order.",
    ],
  },
  {
    max: 100,
    lines: [
      "the REKTEST OF ALL TIME. Certified rug victim. 🫡",
      "100% rekt. Please seek financial and emotional support.",
      "rekt to the bone. This is a historic event.",
    ],
  },
];

function pickFlavor(percent, seedIndex) {
  const tier = TIERS.find((t) => percent <= t.max) || TIERS[TIERS.length - 1];
  const line = tier.lines[seedIndex % tier.lines.length];
  return line;
}

module.exports = { pickFlavor };

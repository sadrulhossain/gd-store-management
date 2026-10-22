import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { blend, contrastRatio } from "./contrast";

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

function readTokens(selector: string): Record<string, string> {
  const block = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
  if (!block) throw new Error(`Missing ${selector} block in globals.css`);
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value;
  }
  return tokens;
}

const themes = { light: readTokens(":root"), dark: readTokens(".dark") } as const;

const TEXT = 4.5;
const UI = 3;

/** [foreground token, background token] pairs that carry text. */
const textPairs: [string, string][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["success-foreground", "success"],
  ["warning-foreground", "warning"],
  ["danger-foreground", "danger"],
  ["info-foreground", "info"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  // Brand and status colours used as text on surfaces (links, inline messages).
  ["primary", "background"],
  ["primary", "card"],
  ["success", "card"],
  ["warning", "card"],
  ["danger", "card"],
  ["info", "card"],
];

describe.each(Object.entries(themes))("%s theme", (_name, tokens) => {
  it.each(textPairs)("text %s on %s has AA contrast", (fg, bg) => {
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(["success", "warning", "danger", "info"])(
    "%s text on its own soft tint (badge style) has AA contrast",
    (status) => {
      const tint = blend(tokens[status], tokens.card, 0.12);
      expect(contrastRatio(tokens[status], tint)).toBeGreaterThanOrEqual(TEXT);
    },
  );

  it.each([
    ["input", "background"],
    ["input", "card"],
    ["ring", "background"],
    ["ring", "card"],
  ])("UI component boundary %s against %s is at least 3:1", (fg, bg) => {
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(UI);
  });

  it("defines every semantic token the shell relies on", () => {
    for (const name of [
      "background",
      "foreground",
      "card",
      "muted",
      "border",
      "input",
      "ring",
      "primary",
      "secondary",
      "accent",
      "success",
      "warning",
      "danger",
      "info",
    ]) {
      expect(tokens[name], `--${name}`).toBeDefined();
    }
  });
});

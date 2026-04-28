import { describe, expect, it } from "vitest";

describe("frontend smoke", () => {
  it("runs basic assertion", () => {
    expect(1 + 1).toBe(2);
  });
});

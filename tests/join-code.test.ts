import { describe, expect, it } from "vitest";
import {
  generateJoinCode,
  isValidJoinCode,
  JOIN_CODE_LENGTH,
  normalizeJoinCode,
} from "../lib/join-code";

describe("generateJoinCode", () => {
  it("returns a string of the correct length", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
  });

  it("only contains allowed characters (no 0, O, 1, I, L)", () => {
    // Generate many codes to get statistical confidence
    for (let i = 0; i < 100; i++) {
      const code = generateJoinCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("generates unique codes (at least over a small batch)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateJoinCode());
    }
    // With 729M possibilities, 50 codes should all be unique
    expect(codes.size).toBe(50);
  });
});

describe("isValidJoinCode", () => {
  it("accepts valid codes", () => {
    expect(isValidJoinCode("ABC234")).toBe(true);
    expect(isValidJoinCode("XYZHJK")).toBe(true);
    expect(isValidJoinCode("999999")).toBe(true);
  });

  it("rejects codes with ambiguous characters", () => {
    expect(isValidJoinCode("ABC0DE")).toBe(false); // 0
    expect(isValidJoinCode("ABCODE")).toBe(false); // O
    expect(isValidJoinCode("ABC1DE")).toBe(false); // 1
    expect(isValidJoinCode("ABCIDE")).toBe(false); // I
    expect(isValidJoinCode("ABCLDE")).toBe(false); // L
  });

  it("rejects wrong length", () => {
    expect(isValidJoinCode("ABC23")).toBe(false);  // too short
    expect(isValidJoinCode("ABC2345")).toBe(false); // too long
    expect(isValidJoinCode("")).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(isValidJoinCode("abc234")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(isValidJoinCode("ABC-34")).toBe(false);
    expect(isValidJoinCode("ABC 34")).toBe(false);
  });
});

describe("normalizeJoinCode", () => {
  it("uppercases input", () => {
    expect(normalizeJoinCode("abc234")).toBe("ABC234");
  });

  it("strips whitespace and dashes", () => {
    expect(normalizeJoinCode(" ABC-234 ")).toBe("ABC234");
    expect(normalizeJoinCode("ABC 234")).toBe("ABC234");
  });

  it("handles already-normalized codes", () => {
    expect(normalizeJoinCode("ABC234")).toBe("ABC234");
  });
});

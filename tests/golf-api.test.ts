import { describe, expect, it } from "vitest";
import { normaliseClub } from "../lib/golf-api";

describe("normaliseClub", () => {
  const validRaw = {
    id: "dp-123",
    name: "Deer Park Golf & Country Club",
    county: "West Lothian",
    lat: 55.88,
    lng: -3.55,
    tees: [
      {
        id: "white",
        label: "White (Men's Medal)",
        gender: "M",
        par: [4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4, 5, 4, 3, 4, 4],
        strokeIndex: [15, 5, 9, 1, 7, 3, 11, 13, 17, 14, 2, 16, 18, 4, 12, 10, 6, 8],
        yardage: [370, 470, 180, 390, 340, 400, 160, 500, 360, 170, 380, 490, 360, 480, 370, 170, 390, 360],
      },
    ],
  };

  it("returns a normalised course for valid input", () => {
    const result = normaliseClub(validRaw);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("dp-123");
    expect(result!.name).toBe("Deer Park Golf & Country Club");
    expect(result!.county).toBe("West Lothian");
    expect(result!.lat).toBe(55.88);
    expect(result!.holeCount).toBe(18);
    expect(result!.tees).toHaveLength(1);
    expect(result!.tees[0].totalPar).toBe(72);
    expect(result!.tees[0].gender).toBe("M");
  });

  it("returns null if no id or name", () => {
    expect(normaliseClub({ name: "X" })).toBeNull();
    expect(normaliseClub({ id: "x" })).toBeNull();
    expect(normaliseClub(null)).toBeNull();
    expect(normaliseClub({})).toBeNull();
  });

  it("returns null if no tees with valid par+SI", () => {
    expect(normaliseClub({ id: "x", name: "X", tees: [] })).toBeNull();
    expect(normaliseClub({ id: "x", name: "X", tees: [{ par: [] }] })).toBeNull();
    // mismatched par and SI lengths
    expect(
      normaliseClub({
        id: "x",
        name: "X",
        tees: [{ par: [4, 5], strokeIndex: [1] }],
      }),
    ).toBeNull();
  });

  it("handles alternate field names (tee_sets, stroke_index, snake_case)", () => {
    const raw = {
      club_id: "x-42",
      club_name: "Example GC",
      latitude: 51.5,
      longitude: -0.1,
      tee_sets: [
        {
          name: "Yellow",
          par: [4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4, 5, 4, 3, 4, 4],
          stroke_index: [15, 5, 9, 1, 7, 3, 11, 13, 17, 14, 2, 16, 18, 4, 12, 10, 6, 8],
        },
      ],
    };
    const result = normaliseClub(raw);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("x-42");
    expect(result!.name).toBe("Example GC");
    expect(result!.lat).toBe(51.5);
    expect(result!.tees[0].label).toBe("Yellow");
  });

  it("coerces numeric strings in par/SI arrays", () => {
    const raw = {
      id: "x",
      name: "X",
      tees: [
        {
          label: "White",
          par: ["4", "5", "3", "4", "4", "4", "3", "5", "4", "3", "4", "5", "4", "5", "4", "3", "4", "4"],
          strokeIndex: [15, 5, 9, 1, 7, 3, 11, 13, 17, 14, 2, 16, 18, 4, 12, 10, 6, 8],
        },
      ],
    };
    const result = normaliseClub(raw);
    expect(result).not.toBeNull();
    expect(result!.tees[0].par).toEqual([4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4, 5, 4, 3, 4, 4]);
  });

  it("normalises gender strings", () => {
    const base = {
      id: "x",
      name: "X",
      tees: [
        {
          label: "T",
          par: Array.from({ length: 18 }, () => 4),
          strokeIndex: Array.from({ length: 18 }, (_, i) => i + 1),
        },
      ],
    };
    expect(normaliseClub({ ...base, tees: [{ ...base.tees[0], gender: "Male" }] })!.tees[0].gender).toBe("M");
    expect(normaliseClub({ ...base, tees: [{ ...base.tees[0], gender: "Ladies" }] })!.tees[0].gender).toBe("L");
    expect(normaliseClub({ ...base, tees: [{ ...base.tees[0], gender: "Women" }] })!.tees[0].gender).toBe("L");
    expect(normaliseClub({ ...base, tees: [{ ...base.tees[0], gender: "whatever" }] })!.tees[0].gender).toBe("U");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { getCached, setCached, withCache, deleteCached } from "@/lib/cache";

describe("cache utilities", () => {
  beforeEach(() => {
    deleteCached("test:key");
    deleteCached("test:async");
  });

  it("should set and get cached values", () => {
    setCached("test:key", { value: 42 });
    expect(getCached<{ value: number }>("test:key")).toEqual({ value: 42 });
  });

  it("should run function once with withCache", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return { data: "expensive" };
    };

    const a = await withCache("test:async", fn, 60);
    const b = await withCache("test:async", fn, 60);

    expect(a).toEqual({ data: "expensive" });
    expect(b).toEqual({ data: "expensive" });
    expect(callCount).toBe(1);
  });
});

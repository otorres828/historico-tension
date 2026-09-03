import { describe, expect, it } from "vitest";
import { validateReading, validDateFilter } from "./validation";
describe("validateReading", () => {
  const valid = {
    date: "2026-09-02",
    shift: "morning",
    arm: "left_arm",
    time: "08:15",
    systolic: 120,
    diastolic: 80,
    pulse: 70,
  };
  it("acepta una lectura válida", () =>
    expect(validateReading(valid).data).toEqual(valid));
  it("rechaza sistólica menor o igual", () =>
    expect(validateReading({ ...valid, systolic: 70 }).error).toBeTruthy());
  it("rechaza fuera de rango", () =>
    expect(validateReading({ ...valid, systolic: 301 }).error).toBeTruthy());
  it("rechaza hora inválida", () =>
    expect(validateReading({ ...valid, time: "25:00" }).error).toBeTruthy());
  it("rechaza pulsaciones fuera de rango", () =>
    expect(validateReading({ ...valid, pulse: 251 }).error).toBeTruthy());
});
describe("validDateFilter", () => {
  it("acepta vacío o ISO", () => {
    expect(validDateFilter(null)).toBe(true);
    expect(validDateFilter("2026-09-02")).toBe(true);
  });
  it("rechaza otro formato", () =>
    expect(validDateFilter("02/09/2026")).toBe(false));
});

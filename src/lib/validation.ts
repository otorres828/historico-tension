import type { ReadingInput } from "./types";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export function validateReading(value: unknown): {
  data?: ReadingInput;
  error?: string;
} {
  if (!value || typeof value !== "object") return { error: "Datos inválidos." };
  const b = value as Record<string, unknown>;
  const systolic = Number(b.systolic);
  const diastolic = Number(b.diastolic);
  const pulse = Number(b.pulse);
  if (
    typeof b.date !== "string" ||
    !datePattern.test(b.date) ||
    Number.isNaN(Date.parse(`${b.date}T00:00:00`))
  )
    return { error: "La fecha no es válida." };
  if (b.shift !== "morning" && b.shift !== "afternoon")
    return { error: "El turno no es válido." };
  if (b.arm !== "left_arm" && b.arm !== "right_arm")
    return { error: "El brazo no es válido." };
  if (typeof b.time !== "string" || !timePattern.test(b.time))
    return { error: "La hora no es válida." };
  if (!Number.isInteger(systolic) || systolic < 50 || systolic > 300)
    return { error: "La presión sistólica debe estar entre 50 y 300." };
  if (!Number.isInteger(diastolic) || diastolic < 30 || diastolic > 200)
    return { error: "La presión diastólica debe estar entre 30 y 200." };
  if (systolic <= diastolic)
    return { error: "La presión sistólica debe ser mayor que la diastólica." };
  if (!Number.isInteger(pulse) || pulse < 30 || pulse > 250)
    return { error: "Las pulsaciones deben estar entre 30 y 250." };
  return {
    data: {
      date: b.date,
      shift: b.shift,
      arm: b.arm,
      time: b.time,
      systolic,
      diastolic,
      pulse,
    } as ReadingInput,
  };
}
export function validDateFilter(value: string | null) {
  return !value || datePattern.test(value);
}

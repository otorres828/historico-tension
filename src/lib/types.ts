export type Slot = { sys: number; dia: number; time: string } | null;
export type PressureDay = {
  date: string;
  morning: { left_arm: Slot; right_arm: Slot };
  afternoon: { left_arm: Slot; right_arm: Slot };
};
export type ReadingInput = {
  date: string;
  shift: "morning" | "afternoon";
  arm: "left_arm" | "right_arm";
  time: string;
  systolic: number;
  diastolic: number;
};

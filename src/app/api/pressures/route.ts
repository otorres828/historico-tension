import { PressureController } from "@/controllers/PressureController";

export const GET = PressureController.index;
export const POST = PressureController.store;
export const DELETE = PressureController.destroy;

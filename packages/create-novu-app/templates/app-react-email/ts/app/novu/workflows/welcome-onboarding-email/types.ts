import { z } from "zod";
import {
  zodControlSchema,
  zodPayloadSchema,
  componentTypeSchema,
  emailListElementTypeSchema,
} from "./schemas";

export type ControlSchema = z.infer<typeof zodControlSchema>;
export type PayloadSchema = z.infer<typeof zodPayloadSchema>;
export type EmailComponent = z.infer<typeof componentTypeSchema>;
export type ListElementComponent = z.infer<typeof emailListElementTypeSchema>;

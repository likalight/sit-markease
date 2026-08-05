import { z } from "zod";

export const PageRegionSchema = z.object({
  page_index: z.number().int().nonnegative(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().positive().max(1),
  h: z.number().positive().max(1),
});

export const ScriptMappingSchema = z.object({
  mappings: z.array(
    z.object({
      question_id: z.string().uuid(),
      detected_label: z.string(),
      regions: z.array(PageRegionSchema).min(1),
      confidence: z.number().min(0).max(1),
      notes: z.string(),
    })
  ),
  unassigned_regions: z.array(PageRegionSchema),
  flags: z.array(z.string()),
});

export type ScriptMapping = z.infer<typeof ScriptMappingSchema>;
export type PageRegion = z.infer<typeof PageRegionSchema>;

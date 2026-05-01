import { z } from 'zod';

export const CreateCourseZodSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.number().min(0),
  status: z.enum(['DRAFT', 'PUBLIC', 'PRIVATE', 'PASSWORD_PROTECTED']),
  password: z.string().optional(),
  isGiftingEnabled: z.boolean().default(false),
  isProtectionEnabled: z.boolean().default(true),
  dripEnabled: z.boolean().default(false),
  prerequisiteIds: z.array(z.string()).optional(),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        order: z.number(),
        contents: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            videoUrl: z.string().optional(),
            videoSource: z.enum(['NATIVE', 'YOUTUBE', 'VIMEO']),
            isFreePreview: z.boolean().default(false),
            order: z.number(),
          }),
        ),
      }),
    )
    .optional(),
});

export type CreateCourseDto = z.infer<typeof CreateCourseZodSchema>;

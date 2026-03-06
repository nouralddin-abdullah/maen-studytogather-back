import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const updateGoalSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Content of the goal must be atleast 3 characters')
      .max(200, 'Content of the goal max is 200 character'),
    isCompleted: z.boolean().optional(),
  })
  .partial();
export class UpdateGoalDto extends createZodDto(updateGoalSchema) {}

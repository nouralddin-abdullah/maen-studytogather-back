import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const createGoalSchema = z.object({
  title: z
    .string()
    .min(3, 'Content of the goal must be atleast 3 characters')
    .max(200, 'Content of the goal max is 200 character'),
  parentId: z
    .uuid({ message: 'Parent ID must be a valid UUID format' })
    .nullish(),
});
export class CreateGoalDto extends createZodDto(createGoalSchema) {}

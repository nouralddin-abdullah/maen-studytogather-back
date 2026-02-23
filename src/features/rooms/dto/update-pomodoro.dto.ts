import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const updatePomodoroSchema = z
  .object({
    focusDuration: z.coerce
      .number()
      .max(360, 'Max focus duration is 360 mins.')
      .min(5, ',Min focus duration is 5 mins')
      .optional(),
    breakDuration: z.coerce
      .number()
      .max(360, 'Max break duration is 360 mins.')
      .min(5, 'Min break duration is 5 mins')
      .optional(),
  })
  .partial();

export class UpdatePomodoroDto extends createZodDto(updatePomodoroSchema) {}

import z from 'zod';
import { AmbientSound, RoomTheme } from '../enums/rooms.enums';
import { createZodDto } from 'nestjs-zod';

const updateRoomSchema = z
  .object({
    name: z
      .string()
      .max(100, 'Name max length is 100 characters')
      .min(10, 'Name min length is 10'),
    description: z
      .string()
      .max(500, 'Description max length is 500 characters')
      .min(10, 'Description min length is 10 characters'),
    theme: z
      .enum(RoomTheme, { message: 'Choosed Room theme must be from the list' })
      .optional(),
    ambientSound: z
      .enum(AmbientSound, { message: 'Choosed Sound must be from the list' })
      .optional(),
    isPublic: z
      .preprocess((val) => {
        if (typeof val === 'string') return val === 'true';
        return val;
      }, z.boolean())
      .default(true),
    passCode: z
      .string()
      .max(15, 'The max length for the passcode is 15 characters')
      .min(3, 'The min length of the passcode is 3 characters')
      .nullish(),
    maxCapacity: z.coerce
      .number()
      .min(2, 'Min capacity is 2')
      .max(20, 'Max capacity is 20')
      .default(10),
    focusDuration: z.coerce
      .number()
      .max(360, 'Max focus duration is 360 mins.')
      .min(5, ',Min focus duration is 5 mins'),
    breakDuration: z.coerce
      .number()
      .max(360, 'Max break duration is 360 mins.')
      .min(5, 'Min break duration is 5 mins'),
  })
  .partial();

export class UpdateRoomDto extends createZodDto(updateRoomSchema) {}

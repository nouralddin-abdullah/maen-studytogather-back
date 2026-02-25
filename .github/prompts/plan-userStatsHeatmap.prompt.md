## Plan: Fire-and-Forget User Stats + Study Heatmap

**TL;DR:** When a study session completes (leave, phase-end, pause), a BullMQ job fires asynchronously to update the user's denormalized stats (`totalFocusMinutes`, `sessionsCount`, `currentStreak`, `longestStreak`) and upsert a `DailyStudyLog` row (the heatmap data source). A new `GET /users/:id/heatmap` endpoint returns 365 days of `{ date, minutes }` entries. Streak logic respects the user's IANA timezone. The hot path (room timer, leave) stays fast — it just enqueues a job.

**Steps**

1. **New entity: `DailyStudyLog`** — create `src/features/users/entities/daily-study-log.entity.ts`
   - Columns: `id` (uuid PK), `userId` (uuid FK → User), `date` (type `date` — the calendar day in user's TZ), `totalMinutes` (int, default 0)
   - Add a **unique composite index** on `(userId, date)` so we can do efficient upserts and range queries
   - Add `@ManyToOne(() => User)` relation
   - Add the inverse `@OneToMany` on the `User` entity

2. **Add `timezone` column to `User` entity** — in `src/features/users/entities/user.entity.ts`
   - `@Column({ type: 'varchar', default: 'UTC' }) timezone: string`
   - Add `timezone` to `UpdateUserDTO` Zod schema (validated as a string, optional)
   - Add `timezone` to `UserDTO` response (expose it on `/me`)
   - Add `timezone` to `UpdateMeSwaggerDto`

3. **TypeORM migration** — generate a migration that:
   - Creates the `daily_study_log` table with the unique index
   - Adds `timezone` column to `user` (default `'UTC'`)

4. **New BullMQ queue: `user-stats-queue`** — define constant in `src/features/users/constants/user-stats.constants.ts`
   - Queue name: `user-stats-queue`
   - Job name: `SESSION_COMPLETED`
   - Job payload: `{ userId: string, earnedMinutes: number, sessionId: string }`

5. **New processor: `UserStatsProcessor`** — create `src/features/users/services/user-stats.processor.ts`
   - BullMQ `WorkerHost` on `user-stats-queue`
   - On `SESSION_COMPLETED` job, open a **transaction** with a **pessimistic write lock** on the User row to prevent race conditions from concurrent jobs (e.g. rapid pause/unpause firing two jobs simultaneously):
     - a. Begin transaction → `queryRunner.manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } })` — this forces concurrent jobs for the same user to wait in line
     - b. Compute "today" in the user's IANA timezone (using `Intl.DateTimeFormat` or a lightweight helper — no heavy deps needed)
     - c. **Upsert `DailyStudyLog`** using PostgreSQL's `EXCLUDED` keyword for the atomic upsert:
       ```sql
       INSERT INTO "daily_study_log" ("id", "userId", "date", "totalMinutes")
       VALUES (:id, :userId, :date, :earned)
       ON CONFLICT ("userId", "date")
       DO UPDATE SET "totalMinutes" = "daily_study_log"."totalMinutes" + EXCLUDED."totalMinutes"
       ```
       Single atomic SQL, no race conditions on the heatmap data.
     - d. **Update streak**: compare `user.lastStudyDate` (in user's TZ) against today. If same day → no change. If yesterday → `currentStreak++`. If older → `currentStreak = 1`. Update `longestStreak = max(longestStreak, currentStreak)`. Set `lastStudyDate = today`.
     - e. **Increment user stats**: `user.totalFocusMinutes += earnedMinutes`, `user.sessionsCount += 1` (only on leave, not mid-session crediting)
     - f. Save user → commit transaction (or rollback on error)

6. **Register the queue in `UsersModule`** — in `src/features/users/users.module.ts`
   - Import `BullModule.registerQueue({ name: USER_STATS_QUEUE })`
   - Add `UserStatsProcessor` to providers
   - Import `TypeOrmModule.forFeature([DailyStudyLog])` alongside `User`

7. **Emit jobs from rooms module** — modify the 3 existing crediting sites to enqueue a job after crediting session minutes:
   - `src/features/rooms/services/rooms.service.ts` — `leave()` method: after crediting partial minutes and marking session `COMPELETED`, add the BullMQ job `{ userId, earnedMinutes: activeSession.totalFocusMinutes, sessionId }`. This is the **only place** that increments `sessionsCount` (session is done).
   - `src/features/rooms/services/room-timer.processor.ts` — after the FOCUS→BREAK bulk credit loop, enqueue a job **per user** with just the delta `earnedMinutes` for that phase. These do NOT increment `sessionsCount` (session is still active).
   - `src/features/rooms/services/rooms.service.ts` — `pauseTimer()` method: same as timer processor — enqueue per-user jobs with the delta, no `sessionsCount` increment.
   - To distinguish, the job payload gets a `incrementSession: boolean` flag. Only `leave()` sets it `true`.

8. **Inject the queue into `RoomsModule`** — in `src/features/rooms/rooms.module.ts`
   - Import `BullModule.registerQueue({ name: USER_STATS_QUEUE })` (queue can be shared across modules)
   - Inject `@InjectQueue(USER_STATS_QUEUE)` in `RoomsService` and `RoomTimerProcessor`

9. **Heatmap endpoint** — add to `src/features/users/controllers/users.controller.ts`
   - `GET /users/:id/heatmap` — accepts optional `?year=2026` query param (defaults to current year's trailing 365 days)
   - Calls a new `UsersService.getHeatmap(userId, year?)` method
   - Returns `{ data: Array<{ date: string, minutes: number }> }` — 365 entries, zero-filled for days with no study

10. **`UsersService.getHeatmap()`** — add to `src/features/users/services/users.service.ts`
    - Use PostgreSQL's `generate_series()` to produce the full 365-day range with zero-filling in a single query — no JS-side gap filling needed:
      ```sql
      SELECT d::date AS "date", COALESCE(log."totalMinutes", 0) AS "minutes"
      FROM generate_series(:start::date, :end::date, '1 day') AS d
      LEFT JOIN "daily_study_log" AS log
        ON log."userId" = :userId AND log."date" = d::date
      ORDER BY d ASC
      ```
    - Returns exactly 365 rows, fully populated, directly from the database
    - Return the array as `Array<{ date: string, minutes: number }>`

**Verification**

- Generate and run the TypeORM migration, verify tables exist
- Start a room, run a focus session, leave → check that the BullMQ job fires, `User.totalFocusMinutes` / `sessionsCount` / streak fields update, and `DailyStudyLog` row is created
- Hit `GET /users/:id/heatmap` → confirm 365 entries with the correct date and minutes
- Test streak logic: study today → `currentStreak = 1`. Study again tomorrow → `currentStreak = 2`. Skip a day → `currentStreak = 1` again. Verify `longestStreak` never decreases.
- Test timezone: set user TZ to a non-UTC zone, study near midnight → verify the date lands in the correct calendar day

**Decisions**

- BullMQ over EventEmitter2: chosen for durability — if the server crashes mid-processing, the job retries automatically
- IANA timezone over UTC offset: handles DST automatically
- `DailyStudyLog` as a separate entity (not derived from `StudySession`): enables O(1) upserts and fast range queries for the heatmap without scanning all sessions
- Unique index on `(userId, date)` with `ON CONFLICT ... DO UPDATE` using PostgreSQL's `EXCLUDED` keyword: atomic upsert, no race conditions even with concurrent jobs
- Pessimistic write lock on the User row inside a transaction: prevents race conditions from concurrent BullMQ jobs updating the same user's stats (streak, totalFocusMinutes, sessionsCount)
- `generate_series()` for heatmap gap-filling: offloads the 365-day zero-fill to PostgreSQL instead of building it in JS memory
- `incrementSession` flag in job payload: separates "mid-session crediting" (pause/phase-end) from "session complete" (leave) — ensures `sessionsCount` is accurate
- Heatmap scoped to `/users/:id/heatmap`: ready for public profiles later

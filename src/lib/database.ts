import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { SEED_EXERCISES } from './seedData';

// Generate UUID using expo-crypto (works in React Native)
function uuidv4(): string {
  return Crypto.randomUUID();
}
import type {
  Exercise,
  RoutineTemplate,
  WorkoutSession,
  RoutineTemplateWithExercises,
  RoutineExerciseWithDetails,
  CreateRoutineInput,
  ExerciseCategory,
  Equipment,
  SetType,
} from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('fitness.db');

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create all tables
  await db.execAsync(`
    -- Master exercise library
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      equipment TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    -- Routine templates
    CREATE TABLE IF NOT EXISTS routine_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Exercises within a routine template
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY,
      routine_template_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      rest_seconds INTEGER NOT NULL DEFAULT 90,
      notes TEXT,
      superset_group_id TEXT,
      FOREIGN KEY (routine_template_id) REFERENCES routine_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );

    -- Target sets for each routine exercise
    CREATE TABLE IF NOT EXISTS routine_exercise_sets (
      id TEXT PRIMARY KEY,
      routine_exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      target_reps INTEGER NOT NULL,
      target_weight REAL,
      set_type TEXT NOT NULL DEFAULT 'normal',
      FOREIGN KEY (routine_exercise_id) REFERENCES routine_exercises(id) ON DELETE CASCADE
    );

    -- Actual workout sessions (logs)
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      routine_template_id TEXT NOT NULL,
      name TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (routine_template_id) REFERENCES routine_templates(id)
    );

    -- Exercises performed in a workout
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      routine_exercise_id TEXT,
      sort_order INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id),
      FOREIGN KEY (routine_exercise_id) REFERENCES routine_exercises(id)
    );

    -- Actual sets performed
    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      rpe REAL,
      completed_at INTEGER NOT NULL,
      set_type TEXT NOT NULL DEFAULT 'normal',
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
    );

    -- Scheduled workouts for calendar planning
    CREATE TABLE IF NOT EXISTS scheduled_workouts (
      id TEXT PRIMARY KEY,
      routine_template_id TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (routine_template_id) REFERENCES routine_templates(id) ON DELETE CASCADE
    );

    -- Workout progress photos (pump pictures)
    CREATE TABLE IF NOT EXISTS workout_photos (
      id TEXT PRIMARY KEY,
      workout_session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_started ON workout_sessions(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_completed ON workout_sets(completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_routine_exercises_template ON routine_exercises(routine_template_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_date ON scheduled_workouts(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_workout_photos_session ON workout_photos(workout_session_id);
  `);

  // Seed default exercises if empty
  const exerciseCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises'
  );

  if (exerciseCount?.count === 0) {
    await seedExerciseLibrary(db);
  }

  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// ==================== EXERCISE SEEDING ====================

async function seedExerciseLibrary(database: SQLite.SQLiteDatabase): Promise<void> {
  const now = Date.now();

  // Use batch insert for better performance
  const batchSize = 10;
  for (let i = 0; i < SEED_EXERCISES.length; i += batchSize) {
    const batch = SEED_EXERCISES.slice(i, i + batchSize);

    for (const exercise of batch) {
      await database.runAsync(
        `INSERT INTO exercises (id, name, category, equipment, created_at, is_custom)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [uuidv4(), exercise.name, exercise.category, exercise.equipment, now]
      );
    }
  }

  console.log(`Seeded ${SEED_EXERCISES.length} exercises into the database`);
}

// ==================== EXERCISE OPERATIONS ====================

export async function getAllExercises(): Promise<Exercise[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    category: string;
    equipment: string;
    created_at: number;
    is_custom: number;
  }>('SELECT * FROM exercises ORDER BY category, name');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    equipment: row.equipment as Equipment,
    createdAt: row.created_at,
    isCustom: row.is_custom === 1,
  }));
}

export async function getExercisesByCategory(category: ExerciseCategory): Promise<Exercise[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    category: string;
    equipment: string;
    created_at: number;
    is_custom: number;
  }>('SELECT * FROM exercises WHERE category = ? ORDER BY name', [category]);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    equipment: row.equipment as Equipment,
    createdAt: row.created_at,
    isCustom: row.is_custom === 1,
  }));
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const database = getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    name: string;
    category: string;
    equipment: string;
    created_at: number;
    is_custom: number;
  }>('SELECT * FROM exercises WHERE id = ?', [id]);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    equipment: row.equipment as Equipment,
    createdAt: row.created_at,
    isCustom: row.is_custom === 1,
  };
}

// ==================== ROUTINE TEMPLATE OPERATIONS ====================

export async function getAllRoutines(): Promise<RoutineTemplate[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM routine_templates ORDER BY updated_at DESC');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getRoutineWithExercises(
  routineId: string
): Promise<RoutineTemplateWithExercises | null> {
  const database = getDatabase();

  // Get routine template
  const routineRow = await database.getFirstAsync<{
    id: string;
    name: string;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM routine_templates WHERE id = ?', [routineId]);

  if (!routineRow) return null;

  // Get routine exercises with exercise details
  const exerciseRows = await database.getAllAsync<{
    id: string;
    routine_template_id: string;
    exercise_id: string;
    sort_order: number;
    rest_seconds: number;
    notes: string | null;
    superset_group_id: string | null;
    exercise_name: string;
    exercise_category: string;
    exercise_equipment: string;
    exercise_created_at: number;
    exercise_is_custom: number;
  }>(
    `SELECT re.*,
            e.name as exercise_name,
            e.category as exercise_category,
            e.equipment as exercise_equipment,
            e.created_at as exercise_created_at,
            e.is_custom as exercise_is_custom
     FROM routine_exercises re
     JOIN exercises e ON re.exercise_id = e.id
     WHERE re.routine_template_id = ?
     ORDER BY re.sort_order`,
    [routineId]
  );

  // Get sets for each exercise
  const exercises: RoutineExerciseWithDetails[] = await Promise.all(
    exerciseRows.map(async (row) => {
      const setRows = await database.getAllAsync<{
        id: string;
        routine_exercise_id: string;
        set_number: number;
        target_reps: number;
        target_weight: number | null;
        set_type: string;
      }>(
        'SELECT * FROM routine_exercise_sets WHERE routine_exercise_id = ? ORDER BY set_number',
        [row.id]
      );

      return {
        id: row.id,
        routineTemplateId: row.routine_template_id,
        exerciseId: row.exercise_id,
        order: row.sort_order,
        restSeconds: row.rest_seconds,
        notes: row.notes,
        supersetGroupId: row.superset_group_id,
        exercise: {
          id: row.exercise_id,
          name: row.exercise_name,
          category: row.exercise_category as ExerciseCategory,
          equipment: row.exercise_equipment as Equipment,
          createdAt: row.exercise_created_at,
          isCustom: row.exercise_is_custom === 1,
        },
        sets: setRows.map((setRow) => ({
          id: setRow.id,
          routineExerciseId: setRow.routine_exercise_id,
          setNumber: setRow.set_number,
          targetReps: setRow.target_reps,
          targetWeight: setRow.target_weight,
          setType: setRow.set_type as SetType,
        })),
      };
    })
  );

  return {
    id: routineRow.id,
    name: routineRow.name,
    createdAt: routineRow.created_at,
    updatedAt: routineRow.updated_at,
    exercises,
  };
}

export async function createRoutine(input: CreateRoutineInput): Promise<string> {
  const database = getDatabase();
  const routineId = uuidv4();
  const now = Date.now();

  // Insert routine template
  await database.runAsync(
    'INSERT INTO routine_templates (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [routineId, input.name, now, now]
  );

  // Insert exercises and their sets
  for (const exercise of input.exercises) {
    const routineExerciseId = uuidv4();

    await database.runAsync(
      `INSERT INTO routine_exercises
       (id, routine_template_id, exercise_id, sort_order, rest_seconds, notes, superset_group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        routineExerciseId,
        routineId,
        exercise.exerciseId,
        exercise.order,
        exercise.restSeconds,
        exercise.notes,
        exercise.supersetGroupId,
      ]
    );

    // Insert sets
    for (const set of exercise.sets) {
      await database.runAsync(
        `INSERT INTO routine_exercise_sets
         (id, routine_exercise_id, set_number, target_reps, target_weight, set_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), routineExerciseId, set.setNumber, set.targetReps, set.targetWeight, set.setType]
      );
    }
  }

  return routineId;
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM routine_templates WHERE id = ?', [routineId]);
}

// ==================== WORKOUT SESSION OPERATIONS ====================

export async function startWorkout(routineId: string): Promise<string> {
  const database = getDatabase();
  const routine = await getRoutineWithExercises(routineId);

  if (!routine) {
    throw new Error('Routine not found');
  }

  const workoutId = uuidv4();
  const now = Date.now();

  // Create workout session
  await database.runAsync(
    `INSERT INTO workout_sessions (id, routine_template_id, name, started_at, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [workoutId, routineId, routine.name, now]
  );

  // Pre-populate workout exercises from routine
  for (const routineExercise of routine.exercises) {
    const workoutExerciseId = uuidv4();

    await database.runAsync(
      `INSERT INTO workout_exercises
       (id, workout_session_id, exercise_id, routine_exercise_id, sort_order, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        workoutExerciseId,
        workoutId,
        routineExercise.exerciseId,
        routineExercise.id,
        routineExercise.order,
        routineExercise.notes,
      ]
    );
  }

  return workoutId;
}

export async function logSet(
  workoutExerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
  rpe: number | null = null,
  setType: SetType = 'normal'
): Promise<string> {
  const database = getDatabase();
  const setId = uuidv4();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO workout_sets
     (id, workout_exercise_id, set_number, weight, reps, rpe, completed_at, set_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [setId, workoutExerciseId, setNumber, weight, reps, rpe, now, setType]
  );

  return setId;
}

export async function completeWorkout(workoutId: string, notes: string | null = null): Promise<void> {
  const database = getDatabase();
  const now = Date.now();

  await database.runAsync(
    `UPDATE workout_sessions SET completed_at = ?, status = 'completed', notes = ? WHERE id = ?`,
    [now, notes, workoutId]
  );
}

// ==================== HISTORY & CALENDAR QUERIES ====================

export async function getLastWorkoutForExercise(
  exerciseId: string,
  excludeWorkoutId?: string
): Promise<{ weight: number; reps: number; setNumber: number }[]> {
  const database = getDatabase();

  const query = `
    SELECT ws.set_number, ws.weight, ws.reps
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    JOIN workout_sessions wses ON we.workout_session_id = wses.id
    WHERE we.exercise_id = ?
      AND wses.status = 'completed'
      ${excludeWorkoutId ? 'AND wses.id != ?' : ''}
    ORDER BY wses.started_at DESC, ws.set_number ASC
    LIMIT 10
  `;

  const params = excludeWorkoutId ? [exerciseId, excludeWorkoutId] : [exerciseId];
  const rows = await database.getAllAsync<{
    set_number: number;
    weight: number;
    reps: number;
  }>(query, params);

  return rows.map((row) => ({
    setNumber: row.set_number,
    weight: row.weight,
    reps: row.reps,
  }));
}

export async function getWorkoutHistory(limit: number = 20): Promise<WorkoutSession[]> {
  const database = getDatabase();

  const rows = await database.getAllAsync<{
    id: string;
    routine_template_id: string;
    name: string;
    started_at: number;
    completed_at: number | null;
    notes: string | null;
    status: string;
  }>(
    `SELECT * FROM workout_sessions
     WHERE status = 'completed'
     ORDER BY started_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    routineTemplateId: row.routine_template_id,
    name: row.name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
    status: row.status as 'active' | 'completed' | 'abandoned',
  }));
}

// Get all dates that have completed workouts (for calendar marking)
export async function getWorkoutDates(): Promise<string[]> {
  const database = getDatabase();

  const rows = await database.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date(started_at / 1000, 'unixepoch', 'localtime') as date
     FROM workout_sessions
     WHERE status = 'completed'
     ORDER BY date DESC`
  );

  return rows.map((row) => row.date);
}

// Get workouts for a specific date
export async function getWorkoutsForDate(dateString: string): Promise<WorkoutSession[]> {
  const database = getDatabase();

  const rows = await database.getAllAsync<{
    id: string;
    routine_template_id: string;
    name: string;
    started_at: number;
    completed_at: number | null;
    notes: string | null;
    status: string;
  }>(
    `SELECT * FROM workout_sessions
     WHERE status = 'completed'
       AND date(started_at / 1000, 'unixepoch', 'localtime') = ?
     ORDER BY started_at DESC`,
    [dateString]
  );

  return rows.map((row) => ({
    id: row.id,
    routineTemplateId: row.routine_template_id,
    name: row.name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
    status: row.status as 'active' | 'completed' | 'abandoned',
  }));
}

// Get workout summary with volume
export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: number;
  completedAt: number | null;
  duration: number; // in seconds
  totalVolume: number; // weight * reps
  totalSets: number;
  exerciseCount: number;
}

export async function getWorkoutSummary(workoutId: string): Promise<WorkoutSummary | null> {
  const database = getDatabase();

  const workout = await database.getFirstAsync<{
    id: string;
    name: string;
    started_at: number;
    completed_at: number | null;
  }>(
    'SELECT id, name, started_at, completed_at FROM workout_sessions WHERE id = ?',
    [workoutId]
  );

  if (!workout) return null;

  // Get volume and set stats
  const stats = await database.getFirstAsync<{
    total_volume: number;
    total_sets: number;
    exercise_count: number;
  }>(
    `SELECT
       COALESCE(SUM(ws.weight * ws.reps), 0) as total_volume,
       COUNT(ws.id) as total_sets,
       COUNT(DISTINCT we.exercise_id) as exercise_count
     FROM workout_exercises we
     LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
     WHERE we.workout_session_id = ?`,
    [workoutId]
  );

  const duration = workout.completed_at
    ? Math.floor((workout.completed_at - workout.started_at) / 1000)
    : 0;

  return {
    id: workout.id,
    name: workout.name,
    startedAt: workout.started_at,
    completedAt: workout.completed_at,
    duration,
    totalVolume: stats?.total_volume || 0,
    totalSets: stats?.total_sets || 0,
    exerciseCount: stats?.exercise_count || 0,
  };
}

// Get summaries for all workouts on a date
export async function getWorkoutSummariesForDate(dateString: string): Promise<WorkoutSummary[]> {
  const workouts = await getWorkoutsForDate(dateString);
  const summaries = await Promise.all(
    workouts.map((w) => getWorkoutSummary(w.id))
  );
  return summaries.filter((s): s is WorkoutSummary => s !== null);
}

// ==================== SCHEDULED WORKOUTS ====================

export interface ScheduledWorkout {
  id: string;
  routineTemplateId: string;
  routineName: string;
  scheduledDate: string;
  createdAt: number;
}

export async function scheduleWorkout(
  routineTemplateId: string,
  scheduledDate: string
): Promise<string> {
  const database = getDatabase();
  const id = uuidv4();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO scheduled_workouts (id, routine_template_id, scheduled_date, created_at)
     VALUES (?, ?, ?, ?)`,
    [id, routineTemplateId, scheduledDate, now]
  );

  return id;
}

export async function getScheduledWorkoutsForDate(
  dateString: string
): Promise<ScheduledWorkout[]> {
  const database = getDatabase();

  const rows = await database.getAllAsync<{
    id: string;
    routine_template_id: string;
    scheduled_date: string;
    created_at: number;
    routine_name: string;
  }>(
    `SELECT sw.*, rt.name as routine_name
     FROM scheduled_workouts sw
     JOIN routine_templates rt ON sw.routine_template_id = rt.id
     WHERE sw.scheduled_date = ?
     ORDER BY sw.created_at`,
    [dateString]
  );

  return rows.map((row) => ({
    id: row.id,
    routineTemplateId: row.routine_template_id,
    routineName: row.routine_name,
    scheduledDate: row.scheduled_date,
    createdAt: row.created_at,
  }));
}

export async function getScheduledDates(): Promise<string[]> {
  const database = getDatabase();

  const rows = await database.getAllAsync<{ scheduled_date: string }>(
    `SELECT DISTINCT scheduled_date FROM scheduled_workouts ORDER BY scheduled_date`
  );

  return rows.map((row) => row.scheduled_date);
}

export async function deleteScheduledWorkout(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM scheduled_workouts WHERE id = ?', [id]);
}

export async function deleteScheduledWorkoutsForDate(dateString: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM scheduled_workouts WHERE scheduled_date = ?', [dateString]);
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const database = getDatabase();

  // Delete related workout sets first
  await database.runAsync('DELETE FROM workout_sets WHERE workout_id = ?', [workoutId]);

  // Delete related workout photos
  await database.runAsync('DELETE FROM workout_photos WHERE workout_id = ?', [workoutId]);

  // Delete the workout session
  await database.runAsync('DELETE FROM workout_sessions WHERE id = ?', [workoutId]);
}

export async function createCompletedWorkoutForDate(
  routineTemplateId: string,
  dateString: string
): Promise<string> {
  const database = getDatabase();
  const id = uuidv4();

  // Create a timestamp for the start of that date (noon to avoid timezone issues)
  const dateObj = new Date(dateString + 'T12:00:00');
  const startedAt = dateObj.getTime();
  const completedAt = startedAt + (30 * 60 * 1000); // 30 minutes later

  await database.runAsync(
    `INSERT INTO workout_sessions (id, routine_template_id, started_at, completed_at, status)
     VALUES (?, ?, ?, ?, 'completed')`,
    [id, routineTemplateId, startedAt, completedAt]
  );

  return id;
}

// ==================== CUSTOM EXERCISE OPERATIONS ====================

export async function createCustomExercise(
  name: string,
  category: ExerciseCategory,
  equipment: Equipment
): Promise<string> {
  const database = getDatabase();
  const id = uuidv4();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO exercises (id, name, category, equipment, created_at, is_custom)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, name, category, equipment, now]
  );

  return id;
}

export async function deleteCustomExercise(exerciseId: string): Promise<void> {
  const database = getDatabase();

  // Only delete if it's a custom exercise and not used in any routine
  const exercise = await database.getFirstAsync<{ is_custom: number }>(
    'SELECT is_custom FROM exercises WHERE id = ?',
    [exerciseId]
  );

  if (!exercise || exercise.is_custom !== 1) {
    throw new Error('Cannot delete non-custom exercise');
  }

  // Check if used in any routine
  const usedInRoutine = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM routine_exercises WHERE exercise_id = ?',
    [exerciseId]
  );

  if (usedInRoutine && usedInRoutine.count > 0) {
    throw new Error('Cannot delete exercise that is used in a routine');
  }

  await database.runAsync('DELETE FROM exercises WHERE id = ?', [exerciseId]);
}

export async function getCustomExercises(): Promise<Exercise[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    category: string;
    equipment: string;
    created_at: number;
    is_custom: number;
  }>('SELECT * FROM exercises WHERE is_custom = 1 ORDER BY created_at DESC');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    equipment: row.equipment as Equipment,
    createdAt: row.created_at,
    isCustom: true,
  }));
}

// ==================== WORKOUT PHOTO OPERATIONS ====================

export interface WorkoutPhoto {
  id: string;
  workoutSessionId: string;
  filePath: string;
  sortOrder: number;
  createdAt: number;
}

export async function addWorkoutPhoto(
  workoutSessionId: string,
  filePath: string,
  sortOrder: number = 0
): Promise<string> {
  const database = getDatabase();
  const id = uuidv4();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO workout_photos (id, workout_session_id, file_path, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, workoutSessionId, filePath, sortOrder, now]
  );

  return id;
}

export async function getWorkoutPhotos(workoutSessionId: string): Promise<WorkoutPhoto[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    workout_session_id: string;
    file_path: string;
    sort_order: number;
    created_at: number;
  }>(
    'SELECT * FROM workout_photos WHERE workout_session_id = ? ORDER BY sort_order',
    [workoutSessionId]
  );

  return rows.map((row) => ({
    id: row.id,
    workoutSessionId: row.workout_session_id,
    filePath: row.file_path,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));
}

export async function deleteWorkoutPhoto(photoId: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM workout_photos WHERE id = ?', [photoId]);
}

export async function getAllProgressPhotos(): Promise<(WorkoutPhoto & { workoutName: string; workoutDate: number })[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    workout_session_id: string;
    file_path: string;
    sort_order: number;
    created_at: number;
    workout_name: string;
    workout_date: number;
  }>(
    `SELECT wp.*, ws.name as workout_name, ws.started_at as workout_date
     FROM workout_photos wp
     JOIN workout_sessions ws ON wp.workout_session_id = ws.id
     WHERE ws.status = 'completed'
     ORDER BY ws.started_at DESC, wp.sort_order`
  );

  return rows.map((row) => ({
    id: row.id,
    workoutSessionId: row.workout_session_id,
    filePath: row.file_path,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    workoutName: row.workout_name,
    workoutDate: row.workout_date,
  }));
}

// Update completeWorkout to accept photos
export async function completeWorkoutWithPhotos(
  workoutId: string,
  notes: string | null = null,
  photoPaths: string[] = []
): Promise<void> {
  const database = getDatabase();
  const now = Date.now();

  await database.runAsync(
    `UPDATE workout_sessions SET completed_at = ?, status = 'completed', notes = ? WHERE id = ?`,
    [now, notes, workoutId]
  );

  // Add photos
  for (let i = 0; i < photoPaths.length; i++) {
    await addWorkoutPhoto(workoutId, photoPaths[i], i);
  }
}

// Get photo count for workouts on a date
export async function getWorkoutPhotosCountForDate(dateString: string): Promise<Record<string, number>> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    workout_session_id: string;
    photo_count: number;
  }>(
    `SELECT wp.workout_session_id, COUNT(*) as photo_count
     FROM workout_photos wp
     JOIN workout_sessions ws ON wp.workout_session_id = ws.id
     WHERE ws.status = 'completed'
       AND date(ws.started_at / 1000, 'unixepoch', 'localtime') = ?
     GROUP BY wp.workout_session_id`,
    [dateString]
  );

  const result: Record<string, number> = {};
  rows.forEach((row) => {
    result[row.workout_session_id] = row.photo_count;
  });
  return result;
}

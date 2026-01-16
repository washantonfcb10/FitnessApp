// ==================== ENUMS ====================

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'other';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'other';

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export type WorkoutStatus = 'active' | 'completed' | 'abandoned';

// ==================== MASTER LIBRARY ====================

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  createdAt: number;
  isCustom: boolean;
}

// ==================== TEMPLATE SIDE (THE PLAN) ====================

export interface RoutineTemplate {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoutineExercise {
  id: string;
  routineTemplateId: string;
  exerciseId: string;
  order: number;
  restSeconds: number;
  notes: string | null;
  supersetGroupId: string | null;
}

export interface RoutineExerciseSet {
  id: string;
  routineExerciseId: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  setType: SetType;
}

// ==================== LOG SIDE (THE RECORD) ====================

export interface WorkoutSession {
  id: string;
  routineTemplateId: string;
  name: string;
  startedAt: number;
  completedAt: number | null;
  notes: string | null;
  status: WorkoutStatus;
}

export interface WorkoutExercise {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  routineExerciseId: string | null;
  order: number;
  notes: string | null;
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  completedAt: number;
  setType: SetType;
}

// ==================== COMPOSITE TYPES (for UI) ====================

export interface RoutineExerciseWithDetails extends RoutineExercise {
  exercise: Exercise;
  sets: RoutineExerciseSet[];
}

export interface RoutineTemplateWithExercises extends RoutineTemplate {
  exercises: RoutineExerciseWithDetails[];
}

export interface WorkoutSetWithComparison extends WorkoutSet {
  targetReps: number | null;
  targetWeight: number | null;
  lastSessionWeight: number | null;
  lastSessionReps: number | null;
}

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSetWithComparison[];
}

export interface ActiveWorkout extends WorkoutSession {
  exercises: WorkoutExerciseWithDetails[];
}

// ==================== PROGRESSIVE OVERLOAD ====================

export interface ProgressComparison {
  lastWeight: number | null;
  lastReps: number | null;
  trend: 'up' | 'down' | 'same' | 'first';
}

// ==================== INPUT TYPES (for creating/updating) ====================

export interface CreateRoutineInput {
  name: string;
  exercises: CreateRoutineExerciseInput[];
}

export interface CreateRoutineExerciseInput {
  exerciseId: string;
  order: number;
  restSeconds: number;
  notes: string | null;
  supersetGroupId: string | null;
  sets: CreateRoutineExerciseSetInput[];
}

export interface CreateRoutineExerciseSetInput {
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  setType: SetType;
}

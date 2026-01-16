import type { ExerciseCategory, Equipment } from '../types';

export interface SeedExercise {
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
}

// Comprehensive exercise library organized by muscle group
// Total: 75+ exercises covering all major movement patterns

export const SEED_EXERCISES: SeedExercise[] = [
  // ==================== CHEST (12 exercises) ====================
  { name: 'Barbell Bench Press', category: 'chest', equipment: 'barbell' },
  { name: 'Incline Barbell Bench Press', category: 'chest', equipment: 'barbell' },
  { name: 'Decline Barbell Bench Press', category: 'chest', equipment: 'barbell' },
  { name: 'Dumbbell Bench Press', category: 'chest', equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Press', category: 'chest', equipment: 'dumbbell' },
  { name: 'Decline Dumbbell Press', category: 'chest', equipment: 'dumbbell' },
  { name: 'Dumbbell Fly', category: 'chest', equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Fly', category: 'chest', equipment: 'dumbbell' },
  { name: 'Cable Fly', category: 'chest', equipment: 'cable' },
  { name: 'Low Cable Fly', category: 'chest', equipment: 'cable' },
  { name: 'Machine Chest Press', category: 'chest', equipment: 'machine' },
  { name: 'Pec Deck Machine', category: 'chest', equipment: 'machine' },
  { name: 'Push-ups', category: 'chest', equipment: 'bodyweight' },
  { name: 'Dips (Chest Focus)', category: 'chest', equipment: 'bodyweight' },

  // ==================== BACK (14 exercises) ====================
  { name: 'Conventional Deadlift', category: 'back', equipment: 'barbell' },
  { name: 'Sumo Deadlift', category: 'back', equipment: 'barbell' },
  { name: 'Barbell Row', category: 'back', equipment: 'barbell' },
  { name: 'Pendlay Row', category: 'back', equipment: 'barbell' },
  { name: 'T-Bar Row', category: 'back', equipment: 'barbell' },
  { name: 'Dumbbell Row', category: 'back', equipment: 'dumbbell' },
  { name: 'Chest Supported Row', category: 'back', equipment: 'dumbbell' },
  { name: 'Lat Pulldown', category: 'back', equipment: 'cable' },
  { name: 'Close Grip Lat Pulldown', category: 'back', equipment: 'cable' },
  { name: 'Seated Cable Row', category: 'back', equipment: 'cable' },
  { name: 'Face Pull', category: 'back', equipment: 'cable' },
  { name: 'Straight Arm Pulldown', category: 'back', equipment: 'cable' },
  { name: 'Pull-ups', category: 'back', equipment: 'bodyweight' },
  { name: 'Chin-ups', category: 'back', equipment: 'bodyweight' },
  { name: 'Machine Row', category: 'back', equipment: 'machine' },

  // ==================== SHOULDERS (12 exercises) ====================
  { name: 'Overhead Press', category: 'shoulders', equipment: 'barbell' },
  { name: 'Push Press', category: 'shoulders', equipment: 'barbell' },
  { name: 'Behind the Neck Press', category: 'shoulders', equipment: 'barbell' },
  { name: 'Dumbbell Shoulder Press', category: 'shoulders', equipment: 'dumbbell' },
  { name: 'Arnold Press', category: 'shoulders', equipment: 'dumbbell' },
  { name: 'Lateral Raise', category: 'shoulders', equipment: 'dumbbell' },
  { name: 'Front Raise', category: 'shoulders', equipment: 'dumbbell' },
  { name: 'Rear Delt Fly', category: 'shoulders', equipment: 'dumbbell' },
  { name: 'Cable Lateral Raise', category: 'shoulders', equipment: 'cable' },
  { name: 'Cable Front Raise', category: 'shoulders', equipment: 'cable' },
  { name: 'Reverse Pec Deck', category: 'shoulders', equipment: 'machine' },
  { name: 'Machine Shoulder Press', category: 'shoulders', equipment: 'machine' },
  { name: 'Upright Row', category: 'shoulders', equipment: 'barbell' },

  // ==================== BICEPS (8 exercises) ====================
  { name: 'Barbell Curl', category: 'biceps', equipment: 'barbell' },
  { name: 'EZ Bar Curl', category: 'biceps', equipment: 'barbell' },
  { name: 'Preacher Curl', category: 'biceps', equipment: 'barbell' },
  { name: 'Dumbbell Curl', category: 'biceps', equipment: 'dumbbell' },
  { name: 'Hammer Curl', category: 'biceps', equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Curl', category: 'biceps', equipment: 'dumbbell' },
  { name: 'Concentration Curl', category: 'biceps', equipment: 'dumbbell' },
  { name: 'Cable Curl', category: 'biceps', equipment: 'cable' },
  { name: 'Machine Preacher Curl', category: 'biceps', equipment: 'machine' },

  // ==================== TRICEPS (9 exercises) ====================
  { name: 'Close Grip Bench Press', category: 'triceps', equipment: 'barbell' },
  { name: 'Skull Crushers', category: 'triceps', equipment: 'barbell' },
  { name: 'Overhead Tricep Extension', category: 'triceps', equipment: 'dumbbell' },
  { name: 'Tricep Kickback', category: 'triceps', equipment: 'dumbbell' },
  { name: 'Tricep Pushdown', category: 'triceps', equipment: 'cable' },
  { name: 'Rope Pushdown', category: 'triceps', equipment: 'cable' },
  { name: 'Overhead Cable Extension', category: 'triceps', equipment: 'cable' },
  { name: 'Dips (Tricep Focus)', category: 'triceps', equipment: 'bodyweight' },
  { name: 'Diamond Push-ups', category: 'triceps', equipment: 'bodyweight' },
  { name: 'Tricep Dip Machine', category: 'triceps', equipment: 'machine' },

  // ==================== LEGS - QUADS (10 exercises) ====================
  { name: 'Barbell Back Squat', category: 'legs', equipment: 'barbell' },
  { name: 'Barbell Front Squat', category: 'legs', equipment: 'barbell' },
  { name: 'Hack Squat', category: 'legs', equipment: 'machine' },
  { name: 'Leg Press', category: 'legs', equipment: 'machine' },
  { name: 'Leg Extension', category: 'legs', equipment: 'machine' },
  { name: 'Goblet Squat', category: 'legs', equipment: 'dumbbell' },
  { name: 'Dumbbell Lunges', category: 'legs', equipment: 'dumbbell' },
  { name: 'Walking Lunges', category: 'legs', equipment: 'dumbbell' },
  { name: 'Bulgarian Split Squat', category: 'legs', equipment: 'dumbbell' },
  { name: 'Step Ups', category: 'legs', equipment: 'dumbbell' },
  { name: 'Sissy Squat', category: 'legs', equipment: 'bodyweight' },

  // ==================== LEGS - HAMSTRINGS/GLUTES (8 exercises) ====================
  { name: 'Romanian Deadlift', category: 'legs', equipment: 'barbell' },
  { name: 'Stiff Leg Deadlift', category: 'legs', equipment: 'barbell' },
  { name: 'Good Mornings', category: 'legs', equipment: 'barbell' },
  { name: 'Dumbbell Romanian Deadlift', category: 'legs', equipment: 'dumbbell' },
  { name: 'Lying Leg Curl', category: 'legs', equipment: 'machine' },
  { name: 'Seated Leg Curl', category: 'legs', equipment: 'machine' },
  { name: 'Hip Thrust', category: 'legs', equipment: 'barbell' },
  { name: 'Glute Bridge', category: 'legs', equipment: 'bodyweight' },
  { name: 'Cable Pull Through', category: 'legs', equipment: 'cable' },

  // ==================== LEGS - CALVES (4 exercises) ====================
  { name: 'Standing Calf Raise', category: 'legs', equipment: 'machine' },
  { name: 'Seated Calf Raise', category: 'legs', equipment: 'machine' },
  { name: 'Leg Press Calf Raise', category: 'legs', equipment: 'machine' },
  { name: 'Dumbbell Calf Raise', category: 'legs', equipment: 'dumbbell' },

  // ==================== CORE (10 exercises) ====================
  { name: 'Plank', category: 'core', equipment: 'bodyweight' },
  { name: 'Side Plank', category: 'core', equipment: 'bodyweight' },
  { name: 'Dead Bug', category: 'core', equipment: 'bodyweight' },
  { name: 'Hanging Leg Raise', category: 'core', equipment: 'bodyweight' },
  { name: 'Lying Leg Raise', category: 'core', equipment: 'bodyweight' },
  { name: 'Ab Wheel Rollout', category: 'core', equipment: 'other' },
  { name: 'Cable Crunch', category: 'core', equipment: 'cable' },
  { name: 'Cable Woodchop', category: 'core', equipment: 'cable' },
  { name: 'Russian Twist', category: 'core', equipment: 'other' },
  { name: 'Decline Sit-ups', category: 'core', equipment: 'bodyweight' },
  { name: 'Machine Crunch', category: 'core', equipment: 'machine' },

  // ==================== CARDIO (6 exercises) ====================
  { name: 'Treadmill Running', category: 'cardio', equipment: 'machine' },
  { name: 'Treadmill Walking (Incline)', category: 'cardio', equipment: 'machine' },
  { name: 'Stationary Bike', category: 'cardio', equipment: 'machine' },
  { name: 'Rowing Machine', category: 'cardio', equipment: 'machine' },
  { name: 'Stair Climber', category: 'cardio', equipment: 'machine' },
  { name: 'Elliptical', category: 'cardio', equipment: 'machine' },
];

// Utility function to get exercises by category
export function getExercisesByCategory(category: ExerciseCategory): SeedExercise[] {
  return SEED_EXERCISES.filter((ex) => ex.category === category);
}

// Utility function to get exercises by equipment
export function getExercisesByEquipment(equipment: Equipment): SeedExercise[] {
  return SEED_EXERCISES.filter((ex) => ex.equipment === equipment);
}

// Summary stats
export const EXERCISE_STATS = {
  total: SEED_EXERCISES.length,
  byCategory: {
    chest: SEED_EXERCISES.filter((e) => e.category === 'chest').length,
    back: SEED_EXERCISES.filter((e) => e.category === 'back').length,
    shoulders: SEED_EXERCISES.filter((e) => e.category === 'shoulders').length,
    biceps: SEED_EXERCISES.filter((e) => e.category === 'biceps').length,
    triceps: SEED_EXERCISES.filter((e) => e.category === 'triceps').length,
    legs: SEED_EXERCISES.filter((e) => e.category === 'legs').length,
    core: SEED_EXERCISES.filter((e) => e.category === 'core').length,
    cardio: SEED_EXERCISES.filter((e) => e.category === 'cardio').length,
  },
};

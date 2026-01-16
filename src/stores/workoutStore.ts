import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutSet } from '../types';

// ==================== ACTIVE WORKOUT STATE ====================

interface ActiveWorkoutState {
  // Current workout session
  activeWorkoutId: string | null;
  workoutName: string | null;
  routineTemplateId: string | null;
  startedAt: number | null;

  // Current position in workout
  currentExerciseIndex: number;
  currentSetNumber: number;

  // Logged sets (cached for quick access)
  loggedSets: Map<string, WorkoutSet[]>; // workoutExerciseId -> sets

  // Actions
  startWorkout: (workoutId: string, name: string, routineTemplateId: string) => void;
  setCurrentExercise: (index: number) => void;
  setCurrentSet: (setNumber: number) => void;
  addLoggedSet: (workoutExerciseId: string, set: WorkoutSet) => void;
  endWorkout: () => void;
  abandonWorkout: () => void;
  getElapsedSeconds: () => number;
}

export const useWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkoutId: null,
      workoutName: null,
      routineTemplateId: null,
      startedAt: null,
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      loggedSets: new Map(),

      startWorkout: (workoutId, name, routineTemplateId) => {
        set({
          activeWorkoutId: workoutId,
          workoutName: name,
          routineTemplateId,
          startedAt: Date.now(),
          currentExerciseIndex: 0,
          currentSetNumber: 1,
          loggedSets: new Map(),
        });
      },

      setCurrentExercise: (index) => {
        set({ currentExerciseIndex: index, currentSetNumber: 1 });
      },

      setCurrentSet: (setNumber) => {
        set({ currentSetNumber: setNumber });
      },

      addLoggedSet: (workoutExerciseId, workoutSet) => {
        const currentSets = get().loggedSets;
        const exerciseSets = currentSets.get(workoutExerciseId) || [];
        const newMap = new Map(currentSets);
        newMap.set(workoutExerciseId, [...exerciseSets, workoutSet]);
        set({ loggedSets: newMap });
      },

      endWorkout: () => {
        set({
          activeWorkoutId: null,
          workoutName: null,
          routineTemplateId: null,
          startedAt: null,
          currentExerciseIndex: 0,
          currentSetNumber: 1,
          loggedSets: new Map(),
        });
      },

      abandonWorkout: () => {
        set({
          activeWorkoutId: null,
          workoutName: null,
          routineTemplateId: null,
          startedAt: null,
          currentExerciseIndex: 0,
          currentSetNumber: 1,
          loggedSets: new Map(),
        });
      },

      getElapsedSeconds: () => {
        const { startedAt } = get();
        if (!startedAt) return 0;
        return Math.floor((Date.now() - startedAt) / 1000);
      },
    }),
    {
      name: 'active-workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeWorkoutId: state.activeWorkoutId,
        workoutName: state.workoutName,
        routineTemplateId: state.routineTemplateId,
        startedAt: state.startedAt,
        currentExerciseIndex: state.currentExerciseIndex,
        currentSetNumber: state.currentSetNumber,
      }),
    }
  )
);

// ==================== INPUT MEMORY STATE ====================
// Remembers last weight used for each exercise

interface InputMemoryState {
  lastWeights: Record<string, number>; // exerciseId -> last weight
  setLastWeight: (exerciseId: string, weight: number) => void;
  getLastWeight: (exerciseId: string) => number | null;
}

export const useInputMemoryStore = create<InputMemoryState>()(
  persist(
    (set, get) => ({
      lastWeights: {},

      setLastWeight: (exerciseId, weight) => {
        set((state) => ({
          lastWeights: { ...state.lastWeights, [exerciseId]: weight },
        }));
      },

      getLastWeight: (exerciseId) => {
        return get().lastWeights[exerciseId] ?? null;
      },
    }),
    {
      name: 'input-memory-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

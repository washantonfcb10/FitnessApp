import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getRoutineWithExercises,
  getLastWorkoutForExercise,
  completeWorkoutWithPhotos,
} from '../../src/lib/database';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useTheme } from '../../src/contexts/ThemeContext';
import WorkoutCompletionModal from '../../src/components/WorkoutCompletionModal';
import type { RoutineTemplateWithExercises, RoutineExerciseWithDetails } from '../../src/types';

interface SetInputData {
  weight: string;
  reps: string;
  completed: boolean;
}

// Group exercises by superset
interface ExerciseGroup {
  type: 'single' | 'superset';
  exercises: RoutineExerciseWithDetails[];
  supersetGroupId: string | null;
}

function groupExercisesBySupersets(exercises: RoutineExerciseWithDetails[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  const supersetMap = new Map<string, RoutineExerciseWithDetails[]>();
  const standaloneExercises: RoutineExerciseWithDetails[] = [];

  // First pass: group by supersetGroupId
  exercises.forEach((ex) => {
    if (ex.supersetGroupId) {
      const group = supersetMap.get(ex.supersetGroupId) || [];
      group.push(ex);
      supersetMap.set(ex.supersetGroupId, group);
    } else {
      standaloneExercises.push(ex);
    }
  });

  // Build ordered list based on first appearance
  const processedSupersets = new Set<string>();

  exercises.forEach((ex) => {
    if (ex.supersetGroupId) {
      if (!processedSupersets.has(ex.supersetGroupId)) {
        processedSupersets.add(ex.supersetGroupId);
        const supersetExercises = supersetMap.get(ex.supersetGroupId)!;
        groups.push({
          type: 'superset',
          exercises: supersetExercises,
          supersetGroupId: ex.supersetGroupId,
        });
      }
    } else {
      groups.push({
        type: 'single',
        exercises: [ex],
        supersetGroupId: null,
      });
    }
  });

  return groups;
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    routineTemplateId,
    startedAt,
    endWorkout,
    markCompleted,
    resumeWorkout,
    isInResumeWindow,
    completedAt,
    getElapsedSeconds,
  } = useWorkoutStore();

  const [routine, setRoutine] = useState<RoutineTemplateWithExercises | null>(null);
  const [setInputs, setSetInputs] = useState<Record<string, SetInputData[]>>({});
  const [lastWorkoutData, setLastWorkoutData] = useState<Record<string, { weight: number; reps: number }[]>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [resumeTimeLeft, setResumeTimeLeft] = useState(0);

  // Elapsed time clock - updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(getElapsedSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [getElapsedSeconds]);

  // Resume window timer
  useEffect(() => {
    if (isInResumeWindow && completedAt) {
      const updateResumeTime = () => {
        const elapsed = Math.floor((Date.now() - completedAt) / 1000);
        const remaining = Math.max(0, 600 - elapsed); // 10 minutes = 600 seconds
        setResumeTimeLeft(remaining);

        if (remaining <= 0) {
          // Window expired
          endWorkout();
          router.replace('/(tabs)');
        }
      };

      updateResumeTime();
      const interval = setInterval(updateResumeTime, 1000);
      return () => clearInterval(interval);
    }
  }, [isInResumeWindow, completedAt, endWorkout, router]);

  // Load routine data
  useEffect(() => {
    async function loadData() {
      if (!routineTemplateId) return;
      try {
        const data = await getRoutineWithExercises(routineTemplateId);
        setRoutine(data);

        if (data) {
          const inputs: Record<string, SetInputData[]> = {};
          const history: Record<string, { weight: number; reps: number }[]> = {};

          for (const ex of data.exercises) {
            inputs[ex.id] = ex.sets.map((set) => ({
              weight: set.targetWeight?.toString() || '',
              reps: set.targetReps.toString(),
              completed: false,
            }));

            const lastData = await getLastWorkoutForExercise(ex.exerciseId, id);
            history[ex.exerciseId] = lastData.map((d) => ({
              weight: d.weight,
              reps: d.reps,
            }));
          }

          setSetInputs(inputs);
          setLastWorkoutData(history);
        }
      } catch (error) {
        console.error('Failed to load workout data:', error);
      }
    }
    loadData();
  }, [routineTemplateId, id]);

  const exerciseGroups = useMemo(() => {
    if (!routine) return [];
    return groupExercisesBySupersets(routine.exercises);
  }, [routine]);

  const currentGroup = exerciseGroups[currentGroupIndex];

  const handleCompleteSet = async (exerciseId: string, setIndex: number) => {
    const input = setInputs[exerciseId]?.[setIndex];
    if (!input) return;

    const weight = parseFloat(input.weight) || 0;
    const reps = parseInt(input.reps) || 0;

    if (weight <= 0 || reps <= 0) {
      Alert.alert('Error', 'Please enter valid weight and reps');
      return;
    }

    setSetInputs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIndex ? { ...s, completed: true } : s
      ),
    }));
  };

  const updateSetInput = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setSetInputs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIndex ? { ...s, [field]: value } : s
      ),
    }));
  };

  const goToNextGroup = () => {
    if (currentGroupIndex < exerciseGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
    }
  };

  const goToPrevGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
    }
  };

  const handleFinishWorkout = () => {
    setShowCompletionModal(true);
  };

  const handleConfirmCompletion = async (photos: string[]) => {
    try {
      if (id) {
        await completeWorkoutWithPhotos(id, null, photos);
      }
      markCompleted();
      setShowCompletionModal(false);
      // Keep modal open briefly to show resume option, then navigate
      setTimeout(() => {
        if (!isInResumeWindow) {
          endWorkout();
          router.replace('/(tabs)');
        }
      }, 100);
    } catch (error) {
      console.error('Failed to complete workout:', error);
    }
  };

  const handleResumeWorkout = () => {
    const resumed = resumeWorkout();
    if (resumed) {
      setShowCompletionModal(false);
    }
  };

  const handleCloseModal = () => {
    if (isInResumeWindow) {
      endWorkout();
    }
    setShowCompletionModal(false);
    router.replace('/(tabs)');
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure? Your progress will not be saved.',
      [
        { text: 'Continue Workout', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            endWorkout();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressIndicator = (exerciseId: string, setIndex: number) => {
    const exercise = routine?.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return null;

    const history = lastWorkoutData[exercise.exerciseId];
    const lastSet = history?.[setIndex];
    const currentInput = setInputs[exerciseId]?.[setIndex];

    if (!lastSet || !currentInput?.completed) return null;

    const currentWeight = parseFloat(currentInput.weight) || 0;
    const currentReps = parseInt(currentInput.reps) || 0;
    const currentVolume = currentWeight * currentReps;
    const lastVolume = lastSet.weight * lastSet.reps;

    if (currentVolume > lastVolume) return { color: '#34C759', symbol: '↑', label: 'PR' };
    if (currentVolume < lastVolume) return { color: '#FF3B30', symbol: '↓', label: '' };
    return { color: '#8E8E93', symbol: '=', label: '' };
  };

  if (!routine || !currentGroup) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSuperset = currentGroup.type === 'superset';
  const totalCompleted = Object.values(setInputs).flat().filter((s) => s.completed).length;
  const totalSets = Object.values(setInputs).flat().length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Workout Completion Modal */}
      <WorkoutCompletionModal
        visible={showCompletionModal || isInResumeWindow}
        workoutName={routine.name}
        duration={formatElapsedTime(elapsedTime)}
        totalSets={totalCompleted}
        onConfirm={handleConfirmCompletion}
        onCancel={showCompletionModal && !isInResumeWindow ? () => setShowCompletionModal(false) : handleCloseModal}
        onResume={isInResumeWindow ? handleResumeWorkout : undefined}
        isInResumeWindow={isInResumeWindow}
        resumeTimeLeft={resumeTimeLeft}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleCancelWorkout}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{routine.name}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {currentGroupIndex + 1} of {exerciseGroups.length} • {totalCompleted}/{totalSets} sets
          </Text>
        </View>
        <TouchableOpacity onPress={handleFinishWorkout}>
          <Text style={styles.finishButton}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Elapsed Time Clock */}
      <View style={styles.timerBar}>
        <Text style={styles.timerLabel}>Workout Duration</Text>
        <Text style={styles.timerValue}>{formatElapsedTime(elapsedTime)}</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Superset Indicator */}
        {isSuperset && (
          <View style={styles.supersetBadge}>
            <View style={styles.supersetIcon}>
              <Text style={styles.supersetIconText}>⚡</Text>
            </View>
            <Text style={styles.supersetLabel}>SUPERSET</Text>
            <Text style={styles.supersetHint}>
              Complete sets alternating between exercises
            </Text>
          </View>
        )}

        {/* Exercise Cards */}
        <View style={isSuperset ? styles.supersetContainer : undefined}>
          {currentGroup.exercises.map((exercise, exerciseIndex) => {
            const currentInputs = setInputs[exercise.id] || [];
            const completedSets = currentInputs.filter((s) => s.completed).length;

            return (
              <View
                key={exercise.id}
                style={[
                  styles.exerciseCard,
                  { backgroundColor: colors.card },
                  isSuperset && styles.supersetExerciseCard,
                  isSuperset && exerciseIndex > 0 && styles.supersetExerciseCardConnected,
                ]}
              >
                {/* Superset connector line */}
                {isSuperset && exerciseIndex > 0 && (
                  <View style={styles.supersetConnector} />
                )}

                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderLeft}>
                    {isSuperset && (
                      <View style={styles.supersetOrderBadge}>
                        <Text style={styles.supersetOrderText}>
                          {String.fromCharCode(65 + exerciseIndex)}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.exercise.name}</Text>
                      <Text style={[styles.exerciseProgress, { color: colors.textSecondary }]}>
                        {completedSets}/{currentInputs.length} sets
                      </Text>
                    </View>
                  </View>
                </View>

                {exercise.notes && (
                  <View style={[styles.notesContainer, { backgroundColor: isDark ? '#3A3000' : '#FFF9E6' }]}>
                    <Text style={[styles.notesText, { color: isDark ? '#FFD60A' : '#8B6914' }]}>{exercise.notes}</Text>
                  </View>
                )}

                {/* Sets */}
                <View style={styles.setsContainer}>
                  <View style={[styles.setsHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.setsHeaderCell, { color: colors.textSecondary }]}>Set</Text>
                    <Text style={[styles.setsHeaderCell, { color: colors.textSecondary }]}>Previous</Text>
                    <Text style={[styles.setsHeaderCellWide, { color: colors.textSecondary }]}>Weight</Text>
                    <Text style={[styles.setsHeaderCellWide, { color: colors.textSecondary }]}>Reps</Text>
                    <Text style={[styles.setsHeaderCell, { color: colors.textSecondary }]}></Text>
                  </View>

                  {currentInputs.map((input, setIndex) => {
                    const lastSet = lastWorkoutData[exercise.exerciseId]?.[setIndex];
                    const progress = getProgressIndicator(exercise.id, setIndex);

                    return (
                      <View
                        key={setIndex}
                        style={[
                          styles.setRow,
                          { borderBottomColor: colors.border },
                          input.completed && (isDark ? styles.setRowCompletedDark : styles.setRowCompleted),
                        ]}
                      >
                        <Text style={[styles.setNumber, { color: colors.text }]}>{setIndex + 1}</Text>
                        <Text style={[styles.previousValue, { color: colors.textSecondary }]}>
                          {lastSet ? `${lastSet.weight}×${lastSet.reps}` : '-'}
                        </Text>
                        <TextInput
                          style={[
                            styles.setInput,
                            { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: colors.text },
                            input.completed && (isDark ? styles.setInputCompletedDark : styles.setInputCompleted),
                          ]}
                          keyboardType="decimal-pad"
                          value={input.weight}
                          onChangeText={(v) => updateSetInput(exercise.id, setIndex, 'weight', v)}
                          editable={!input.completed}
                          placeholder="0"
                          placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                        />
                        <View style={styles.repsInputContainer}>
                          <TouchableOpacity
                            style={[styles.repsStepperButton, input.completed && styles.repsStepperButtonDisabled]}
                            onPress={() => {
                              const currentReps = parseInt(input.reps) || 0;
                              if (currentReps > 1) {
                                updateSetInput(exercise.id, setIndex, 'reps', String(currentReps - 1));
                              }
                            }}
                            disabled={input.completed}
                          >
                            <Text style={[styles.repsStepperText, input.completed && styles.repsStepperTextDisabled]}>−</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[
                              styles.repsInput,
                              { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: colors.text },
                              input.completed && (isDark ? { backgroundColor: '#1B3D1B' } : styles.repsInputCompleted),
                            ]}
                            keyboardType="number-pad"
                            value={input.reps}
                            onChangeText={(v) => updateSetInput(exercise.id, setIndex, 'reps', v)}
                            editable={!input.completed}
                            placeholder="8"
                            placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                          />
                          <TouchableOpacity
                            style={[styles.repsStepperButton, input.completed && styles.repsStepperButtonDisabled]}
                            onPress={() => {
                              const currentReps = parseInt(input.reps) || 0;
                              updateSetInput(exercise.id, setIndex, 'reps', String(currentReps + 1));
                            }}
                            disabled={input.completed}
                          >
                            <Text style={[styles.repsStepperText, input.completed && styles.repsStepperTextDisabled]}>+</Text>
                          </TouchableOpacity>
                        </View>
                        {input.completed ? (
                          <View style={styles.checkContainer}>
                            <Text style={styles.checkmark}>✓</Text>
                            {progress && (
                              <Text style={[styles.progressIndicator, { color: progress.color }]}>
                                {progress.symbol}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.completeButton}
                            onPress={() => handleCompleteSet(exercise.id, setIndex)}
                          >
                            <Text style={styles.completeButtonText}>Log</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' },
            currentGroupIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={goToPrevGroup}
          disabled={currentGroupIndex === 0}
        >
          <Text
            style={[
              styles.navButtonText,
              { color: colors.text },
              currentGroupIndex === 0 && styles.navButtonTextDisabled,
            ]}
          >
            ← Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            currentGroupIndex === exerciseGroups.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={goToNextGroup}
          disabled={currentGroupIndex === exerciseGroups.length - 1}
        >
          <Text
            style={[
              styles.navButtonText,
              styles.navButtonTextPrimary,
              currentGroupIndex === exerciseGroups.length - 1 && styles.navButtonTextDisabled,
            ]}
          >
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelButton: {
    fontSize: 17,
    color: '#FF3B30',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  finishButton: {
    fontSize: 17,
    color: '#34C759',
    fontWeight: '600',
  },
  timerBar: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  content: {
    flex: 1,
  },
  supersetBadge: {
    backgroundColor: '#FF9500',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  supersetIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  supersetIconText: {
    fontSize: 14,
  },
  supersetLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  supersetHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 8,
  },
  supersetContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  supersetExerciseCard: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  supersetExerciseCardConnected: {
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 2,
    borderTopColor: '#FF9500',
  },
  supersetConnector: {
    position: 'absolute',
    left: 20,
    top: -12,
    width: 4,
    height: 12,
    backgroundColor: '#FF9500',
    borderRadius: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supersetOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supersetOrderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  exerciseProgress: {
    fontSize: 14,
    color: '#8E8E93',
  },
  notesContainer: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#8B6914',
  },
  setsContainer: {
    marginTop: 4,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  setsHeaderCell: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  setsHeaderCellWide: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  setRowCompleted: {
    backgroundColor: '#F0FFF4',
  },
  setRowCompletedDark: {
    backgroundColor: '#0D2818',
  },
  setNumber: {
    width: 50,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  previousValue: {
    width: 50,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  setInputCompleted: {
    backgroundColor: '#E8F5E9',
  },
  setInputCompletedDark: {
    backgroundColor: '#1B3D1B',
  },
  repsInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  repsStepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repsStepperButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.5,
  },
  repsStepperText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  repsStepperTextDisabled: {
    color: '#C7C7CC',
  },
  repsInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 10,
    marginHorizontal: 6,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  repsInputCompleted: {
    backgroundColor: '#E8F5E9',
  },
  checkContainer: {
    width: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: '600',
  },
  progressIndicator: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  completeButton: {
    width: 50,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
  },
  navButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  navButtonTextPrimary: {
    color: '#FFFFFF',
  },
  navButtonTextDisabled: {
    color: '#8E8E93',
  },
});

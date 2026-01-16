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
  completeWorkout,
} from '../../src/lib/database';
import { useWorkoutStore } from '../../src/stores/workoutStore';
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
  const {
    routineTemplateId,
    startedAt,
    endWorkout,
    getElapsedSeconds,
  } = useWorkoutStore();

  const [routine, setRoutine] = useState<RoutineTemplateWithExercises | null>(null);
  const [setInputs, setSetInputs] = useState<Record<string, SetInputData[]>>({});
  const [lastWorkoutData, setLastWorkoutData] = useState<Record<string, { weight: number; reps: number }[]>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // Elapsed time clock - updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(getElapsedSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [getElapsedSeconds]);

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
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              if (id) {
                await completeWorkout(id);
              }
              endWorkout();
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Failed to complete workout:', error);
            }
          },
        },
      ]
    );
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSuperset = currentGroup.type === 'superset';
  const totalCompleted = Object.values(setInputs).flat().filter((s) => s.completed).length;
  const totalSets = Object.values(setInputs).flat().length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancelWorkout}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{routine.name}</Text>
          <Text style={styles.headerSubtitle}>
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
                      <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                      <Text style={styles.exerciseProgress}>
                        {completedSets}/{currentInputs.length} sets
                      </Text>
                    </View>
                  </View>
                </View>

                {exercise.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{exercise.notes}</Text>
                  </View>
                )}

                {/* Sets */}
                <View style={styles.setsContainer}>
                  <View style={styles.setsHeader}>
                    <Text style={styles.setsHeaderCell}>Set</Text>
                    <Text style={styles.setsHeaderCell}>Previous</Text>
                    <Text style={styles.setsHeaderCellWide}>Weight</Text>
                    <Text style={styles.setsHeaderCellWide}>Reps</Text>
                    <Text style={styles.setsHeaderCell}></Text>
                  </View>

                  {currentInputs.map((input, setIndex) => {
                    const lastSet = lastWorkoutData[exercise.exerciseId]?.[setIndex];
                    const progress = getProgressIndicator(exercise.id, setIndex);

                    return (
                      <View
                        key={setIndex}
                        style={[styles.setRow, input.completed && styles.setRowCompleted]}
                      >
                        <Text style={styles.setNumber}>{setIndex + 1}</Text>
                        <Text style={styles.previousValue}>
                          {lastSet ? `${lastSet.weight}×${lastSet.reps}` : '-'}
                        </Text>
                        <TextInput
                          style={[styles.setInput, input.completed && styles.setInputCompleted]}
                          keyboardType="decimal-pad"
                          value={input.weight}
                          onChangeText={(v) => updateSetInput(exercise.id, setIndex, 'weight', v)}
                          editable={!input.completed}
                          placeholder="0"
                          placeholderTextColor="#C7C7CC"
                        />
                        <TextInput
                          style={[styles.setInput, input.completed && styles.setInputCompleted]}
                          keyboardType="number-pad"
                          value={input.reps}
                          onChangeText={(v) => updateSetInput(exercise.id, setIndex, 'reps', v)}
                          editable={!input.completed}
                          placeholder="0"
                          placeholderTextColor="#C7C7CC"
                        />
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
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentGroupIndex === 0 && styles.navButtonDisabled]}
          onPress={goToPrevGroup}
          disabled={currentGroupIndex === 0}
        >
          <Text
            style={[
              styles.navButtonText,
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

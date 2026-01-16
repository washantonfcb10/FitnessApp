import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getRoutineWithExercises, startWorkout } from '../../src/lib/database';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import type { RoutineTemplateWithExercises } from '../../src/types';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<RoutineTemplateWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const { startWorkout: startWorkoutState } = useWorkoutStore();

  useEffect(() => {
    async function loadRoutine() {
      if (!id) return;
      try {
        const data = await getRoutineWithExercises(id);
        setRoutine(data);
      } catch (error) {
        console.error('Failed to load routine:', error);
      } finally {
        setLoading(false);
      }
    }
    loadRoutine();
  }, [id]);

  const handleStartWorkout = async () => {
    if (!routine) return;

    try {
      const workoutId = await startWorkout(routine.id);
      startWorkoutState(workoutId, routine.name, routine.id);
      router.push(`/workout/${workoutId}`);
    } catch (error) {
      console.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Routine not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>{routine.name}</Text>
          <Text style={styles.subtitle}>
            {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.exercisesList}>
          {routine.exercises.map((ex, index) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {ex.sets.length} sets • {ex.restSeconds}s rest
                  </Text>
                </View>
              </View>

              <View style={styles.setsPreview}>
                {ex.sets.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setChip}>
                    <Text style={styles.setChipText}>
                      {set.targetWeight ? `${set.targetWeight}×` : ''}
                      {set.targetReps}
                    </Text>
                  </View>
                ))}
              </View>

              {ex.notes && (
                <Text style={styles.exerciseNotes}>{ex.notes}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStartWorkout}>
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  errorText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  exercisesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 13,
    color: '#8E8E93',
  },
  setsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  exerciseNotes: {
    marginTop: 12,
    fontSize: 14,
    color: '#636366',
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  startButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

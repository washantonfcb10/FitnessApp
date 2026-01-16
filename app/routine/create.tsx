import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAllExercises, createRoutine } from '../../src/lib/database';
import type { Exercise, CreateRoutineInput, CreateRoutineExerciseInput } from '../../src/types';

interface RoutineExerciseFormData {
  id: string; // temp ID for UI
  exercise: Exercise;
  restSeconds: number;
  notes: string;
  sets: { targetReps: number; targetWeight: number | null }[];
}

export default function CreateRoutineScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseFormData[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadExercises = useCallback(async () => {
    try {
      const data = await getAllExercises();
      setAvailableExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    }
  }, []);

  const openExercisePicker = async () => {
    await loadExercises();
    setShowExercisePicker(true);
    setSearchQuery('');
  };

  const addExercise = (exercise: Exercise) => {
    const newExercise: RoutineExerciseFormData = {
      id: Date.now().toString(),
      exercise,
      restSeconds: 90,
      notes: '',
      sets: [
        { targetReps: 10, targetWeight: null },
        { targetReps: 10, targetWeight: null },
        { targetReps: 10, targetWeight: null },
      ],
    };
    setExercises([...exercises, newExercise]);
    setShowExercisePicker(false);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const updateExerciseSets = (id: string, sets: { targetReps: number; targetWeight: number | null }[]) => {
    setExercises(exercises.map((ex) => (ex.id === id ? { ...ex, sets } : ex)));
  };

  const updateExerciseNotes = (id: string, notes: string) => {
    setExercises(exercises.map((ex) => (ex.id === id ? { ...ex, notes } : ex)));
  };

  const addSet = (exerciseId: string) => {
    setExercises(exercises.map((ex) => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1] || { targetReps: 10, targetWeight: null };
        return {
          ...ex,
          sets: [...ex.sets, { ...lastSet }],
        };
      }
      return ex;
    }));
  };

  const removeSet = (exerciseId: string) => {
    setExercises(exercises.map((ex) => {
      if (ex.id === exerciseId && ex.sets.length > 1) {
        return {
          ...ex,
          sets: ex.sets.slice(0, -1),
        };
      }
      return ex;
    }));
  };

  const updateSetReps = (exerciseId: string, setIndex: number, reps: number) => {
    setExercises(exercises.map((ex) => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], targetReps: reps };
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    setIsSaving(true);

    try {
      const input: CreateRoutineInput = {
        name: name.trim(),
        exercises: exercises.map((ex, index): CreateRoutineExerciseInput => ({
          exerciseId: ex.exercise.id,
          order: index,
          restSeconds: ex.restSeconds,
          notes: ex.notes || null,
          supersetGroupId: null,
          sets: ex.sets.map((set, setIndex) => ({
            setNumber: setIndex + 1,
            targetReps: set.targetReps,
            targetWeight: set.targetWeight,
            setType: 'normal',
          })),
        })),
      };

      await createRoutine(input);
      router.back();
    } catch (error) {
      console.error('Failed to create routine:', error);
      Alert.alert('Error', 'Failed to create routine');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredExercises = searchQuery.trim()
    ? availableExercises.filter((ex) =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableExercises;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Routine Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Routine Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g., Push Day A"
            placeholderTextColor="#8E8E93"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Exercises List */}
        <View style={styles.section}>
          <Text style={styles.label}>Exercises</Text>

          {exercises.map((ex, index) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeExercise(ex.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Sets */}
              <View style={styles.setsContainer}>
                <View style={styles.setsHeader}>
                  <Text style={styles.setsLabel}>Sets</Text>
                  <View style={styles.setsControls}>
                    <TouchableOpacity
                      style={styles.setControlButton}
                      onPress={() => removeSet(ex.id)}
                    >
                      <Text style={styles.setControlButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.setsCount}>{ex.sets.length}</Text>
                    <TouchableOpacity
                      style={styles.setControlButton}
                      onPress={() => addSet(ex.id)}
                    >
                      <Text style={styles.setControlButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {ex.sets.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setRow}>
                    <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                    <View style={styles.repsContainer}>
                      <TextInput
                        style={styles.repsInput}
                        keyboardType="number-pad"
                        value={String(set.targetReps)}
                        onChangeText={(text) => {
                          const reps = parseInt(text) || 0;
                          updateSetReps(ex.id, setIndex, reps);
                        }}
                      />
                      <Text style={styles.repsLabel}>reps</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Notes */}
              <TextInput
                style={styles.notesInput}
                placeholder="Notes (e.g., 'Slow eccentric', 'Seat height 4')"
                placeholderTextColor="#8E8E93"
                value={ex.notes}
                onChangeText={(text) => updateExerciseNotes(ex.id, text)}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addExerciseButton} onPress={openExercisePicker}>
            <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Create Routine'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalSearchContainer}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.exercisePickerItem}
                onPress={() => addExercise(item)}
              >
                <Text style={styles.exercisePickerName}>{item.name}</Text>
                <Text style={styles.exercisePickerMeta}>
                  {item.category} • {item.equipment}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.exercisePickerList}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#000000',
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
    marginBottom: 16,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  exerciseName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#FF3B30',
  },
  setsContainer: {
    marginBottom: 12,
  },
  setsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setsLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  setsControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setControlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setControlButtonText: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '500',
  },
  setsCount: {
    fontSize: 17,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  setNumber: {
    fontSize: 15,
    color: '#8E8E93',
    width: 50,
  },
  repsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repsInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 17,
    fontWeight: '500',
    width: 60,
    textAlign: 'center',
  },
  repsLabel: {
    fontSize: 15,
    color: '#8E8E93',
    marginLeft: 8,
  },
  notesInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000000',
  },
  addExerciseButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addExerciseButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalSearchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  modalSearchInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  exercisePickerList: {
    padding: 16,
  },
  exercisePickerItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  exercisePickerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  exercisePickerMeta: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
});

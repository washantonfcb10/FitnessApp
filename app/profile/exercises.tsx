import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  getAllExercises,
  createCustomExercise,
  deleteCustomExercise,
} from '../../src/lib/database';
import type { Exercise, ExerciseCategory, Equipment } from '../../src/types';

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
  other: 'Other',
};

const CATEGORY_ORDER: ExerciseCategory[] = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'biceps',
  'triceps',
  'core',
  'cardio',
  'other',
];

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  other: 'Other',
};

const EQUIPMENT_OPTIONS: Equipment[] = [
  'barbell',
  'dumbbell',
  'bodyweight',
  'cable',
  'machine',
  'kettlebell',
  'other',
];

export default function ExercisesManagementScreen() {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // New exercise form state
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory>('chest');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<Equipment>('barbell');

  const loadExercises = useCallback(async () => {
    try {
      const data = await getAllExercises();
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExercises();
    setRefreshing(false);
  };

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(query) ||
        ex.category.toLowerCase().includes(query) ||
        ex.equipment.toLowerCase().includes(query)
    );
  }, [exercises, searchQuery]);

  const sections = useMemo(() => {
    const grouped: Record<ExerciseCategory, Exercise[]> = {
      chest: [],
      back: [],
      shoulders: [],
      biceps: [],
      triceps: [],
      legs: [],
      core: [],
      cardio: [],
      other: [],
    };

    filteredExercises.forEach((ex) => {
      grouped[ex.category].push(ex);
    });

    return CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map((cat) => ({
      title: CATEGORY_LABELS[cat],
      data: grouped[cat],
    }));
  }, [filteredExercises]);

  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }

    try {
      await createCustomExercise(newExerciseName.trim(), newExerciseCategory, newExerciseEquipment);
      setModalVisible(false);
      setNewExerciseName('');
      setNewExerciseCategory('chest');
      setNewExerciseEquipment('barbell');
      await loadExercises();
    } catch (error) {
      console.error('Failed to create exercise:', error);
      Alert.alert('Error', 'Failed to create exercise');
    }
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    if (!exercise.isCustom) {
      Alert.alert('Cannot Delete', 'Only custom exercises can be deleted.');
      return;
    }

    Alert.alert('Delete Exercise', `Are you sure you want to delete "${exercise.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomExercise(exercise.id);
            await loadExercises();
          } catch (error: any) {
            Alert.alert('Cannot Delete', error.message || 'Failed to delete exercise');
          }
        },
      },
    ]);
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={[styles.exerciseCard, { backgroundColor: colors.card }]}
      onLongPress={() => handleDeleteExercise(item)}
      delayLongPress={500}
    >
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.exerciseEquipment, { color: colors.textSecondary }]}>
          {EQUIPMENT_LABELS[item.equipment]}
        </Text>
      </View>
      {item.isCustom && (
        <View style={[styles.customBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.customBadgeText}>Custom</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Exercises Found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Try a different search term
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Custom Exercise</Text>
      </TouchableOpacity>

      <Text style={[styles.hintText, { color: colors.textSecondary }]}>
        Long press on a custom exercise to delete it
      </Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderExerciseItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmptyState}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Add Exercise Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Exercise</Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Exercise Name */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Exercise Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g., Incline Dumbbell Press"
                placeholderTextColor={colors.textSecondary}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
              />

              {/* Category Selection */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Muscle Group</Text>
              <View style={styles.optionsGrid}>
                {CATEGORY_ORDER.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor:
                          newExerciseCategory === cat ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setNewExerciseCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: newExerciseCategory === cat ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Equipment Selection */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Equipment Type</Text>
              <View style={styles.optionsGrid}>
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <TouchableOpacity
                    key={eq}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor:
                          newExerciseEquipment === eq ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setNewExerciseEquipment(eq)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: newExerciseEquipment === eq ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {EQUIPMENT_LABELS[eq]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setModalVisible(false);
                  setNewExerciseName('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddExercise}
              >
                <Text style={styles.saveButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 28,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
  },
  addButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseEquipment: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  customBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  customBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {},
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

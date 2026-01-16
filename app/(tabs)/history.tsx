import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, DateData } from 'react-native-calendars';
import {
  getWorkoutDates,
  getWorkoutSummariesForDate,
  getScheduledDates,
  getScheduledWorkoutsForDate,
  scheduleWorkout,
  deleteScheduledWorkout,
  getAllRoutines,
  startWorkout,
  getWorkoutPhotos,
  WorkoutSummary,
  ScheduledWorkout,
  WorkoutPhoto,
} from '../../src/lib/database';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import { useTheme } from '../../src/contexts/ThemeContext';
import type { RoutineTemplate } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MarkedDates = {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
    dots?: { key: string; color: string }[];
  };
};

export default function HistoryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { activeWorkoutId, startWorkout: startWorkoutState } = useWorkoutStore();
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [scheduledDates, setScheduledDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWorkouts, setSelectedWorkouts] = useState<WorkoutSummary[]>([]);
  const [selectedScheduled, setSelectedScheduled] = useState<ScheduledWorkout[]>([]);
  const [workoutPhotos, setWorkoutPhotos] = useState<Record<string, WorkoutPhoto[]>>({});
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<{ workoutId: string; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [showRoutinePicker, setShowRoutinePicker] = useState(false);
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);

  const loadWorkoutDates = useCallback(async () => {
    try {
      const [dates, scheduled] = await Promise.all([
        getWorkoutDates(),
        getScheduledDates(),
      ]);
      setWorkoutDates(dates);
      setScheduledDates(scheduled);
    } catch (error) {
      console.error('Failed to load workout dates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkoutDates();
    }, [loadWorkoutDates])
  );

  const loadWorkoutsForDate = useCallback(async (date: string) => {
    setLoadingWorkouts(true);
    try {
      const [summaries, scheduled] = await Promise.all([
        getWorkoutSummariesForDate(date),
        getScheduledWorkoutsForDate(date),
      ]);
      setSelectedWorkouts(summaries);
      setSelectedScheduled(scheduled);

      // Load photos for each workout
      const photosMap: Record<string, WorkoutPhoto[]> = {};
      for (const workout of summaries) {
        const photos = await getWorkoutPhotos(workout.id);
        if (photos.length > 0) {
          photosMap[workout.id] = photos;
        }
      }
      setWorkoutPhotos(photosMap);
    } catch (error) {
      console.error('Failed to load workouts for date:', error);
      setSelectedWorkouts([]);
      setSelectedScheduled([]);
      setWorkoutPhotos({});
    } finally {
      setLoadingWorkouts(false);
    }
  }, []);

  const handleDayPress = useCallback(
    (day: DateData) => {
      const dateStr = day.dateString;
      if (selectedDate === dateStr) {
        // Deselect
        setSelectedDate(null);
        setSelectedWorkouts([]);
        setSelectedScheduled([]);
      } else {
        setSelectedDate(dateStr);
        loadWorkoutsForDate(dateStr);
      }
    },
    [selectedDate, loadWorkoutsForDate]
  );

  const openRoutinePicker = async () => {
    try {
      const allRoutines = await getAllRoutines();
      setRoutines(allRoutines);
      setShowRoutinePicker(true);
    } catch (error) {
      console.error('Failed to load routines:', error);
    }
  };

  const handleScheduleRoutine = async (routine: RoutineTemplate) => {
    if (!selectedDate) return;
    try {
      await scheduleWorkout(routine.id, selectedDate);
      setShowRoutinePicker(false);
      await loadWorkoutsForDate(selectedDate);
      await loadWorkoutDates();
    } catch (error) {
      console.error('Failed to schedule workout:', error);
      Alert.alert('Error', 'Failed to schedule workout');
    }
  };

  const handleDeleteScheduled = async (scheduled: ScheduledWorkout) => {
    Alert.alert(
      'Remove Scheduled Workout',
      `Remove "${scheduled.routineName}" from this day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduledWorkout(scheduled.id);
              if (selectedDate) {
                await loadWorkoutsForDate(selectedDate);
                await loadWorkoutDates();
              }
            } catch (error) {
              console.error('Failed to delete scheduled workout:', error);
            }
          },
        },
      ]
    );
  };

  const handleStartScheduled = async (scheduled: ScheduledWorkout) => {
    if (activeWorkoutId) {
      Alert.alert(
        'Workout in Progress',
        'You already have an active workout. Would you like to continue it?',
        [
          { text: 'Continue', onPress: () => router.push(`/workout/${activeWorkoutId}`) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      const workoutId = await startWorkout(scheduled.routineTemplateId);
      startWorkoutState(workoutId, scheduled.routineName, scheduled.routineTemplateId);
      // Delete from scheduled since we're starting it
      await deleteScheduledWorkout(scheduled.id);
      router.push(`/workout/${workoutId}`);
    } catch (error) {
      console.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout');
    }
  };

  // Build marked dates object for the calendar
  const markedDates = useMemo((): MarkedDates => {
    const marked: MarkedDates = {};

    // Mark all dates with completed workouts (green)
    workoutDates.forEach((date) => {
      marked[date] = {
        marked: true,
        dotColor: '#34C759',
      };
    });

    // Mark scheduled dates (blue) - override if no completed workout
    scheduledDates.forEach((date) => {
      if (!marked[date]) {
        marked[date] = {
          marked: true,
          dotColor: '#007AFF',
        };
      }
    });

    // Highlight selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#007AFF',
      };
    }

    return marked;
  }, [workoutDates, scheduledDates, selectedDate]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k lbs`;
    }
    return `${Math.round(volume)} lbs`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateHeader = (dateStr: string): string => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {/* Calendar */}
      <View style={[styles.calendarContainer, { backgroundColor: colors.card }]}>
        <Calendar
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            backgroundColor: colors.card,
            calendarBackground: colors.card,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: isDark ? '#48484A' : '#C7C7CC',
            dotColor: '#34C759',
            selectedDotColor: '#FFFFFF',
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            textDayFontWeight: '400',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '500',
            textDayFontSize: 16,
            textMonthFontSize: 17,
            textDayHeaderFontSize: 13,
          }}
          style={styles.calendar}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Scheduled</Text>
          </View>
        </View>
        <Text style={[styles.workoutCount, { color: colors.textSecondary }]}>
          {workoutDates.length} workout{workoutDates.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Selected Date Workouts */}
      {selectedDate && (
        <View style={styles.selectedDateSection}>
          <Text style={[styles.selectedDateHeader, { color: colors.text }]}>
            {formatDateHeader(selectedDate)}
          </Text>

          {loadingWorkouts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* Scheduled Workouts */}
              {selectedScheduled.length > 0 && (
                <View style={styles.scheduledSection}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SCHEDULED</Text>
                  {selectedScheduled.map((scheduled) => (
                    <View key={scheduled.id} style={[styles.scheduledCard, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}>
                      <View style={styles.scheduledInfo}>
                        <View style={[styles.scheduledBadge, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : '#007AFF15' }]}>
                          <Text style={[styles.scheduledBadgeText, { color: colors.primary }]}>PLANNED</Text>
                        </View>
                        <Text style={[styles.scheduledName, { color: colors.text }]}>{scheduled.routineName}</Text>
                      </View>
                      <View style={styles.scheduledActions}>
                        <TouchableOpacity
                          style={styles.startScheduledButton}
                          onPress={() => handleStartScheduled(scheduled)}
                        >
                          <Text style={styles.startScheduledText}>Start</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteScheduledButton}
                          onPress={() => handleDeleteScheduled(scheduled)}
                        >
                          <Text style={styles.deleteScheduledText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Completed Workouts */}
              {selectedWorkouts.length > 0 && (
                <View style={styles.completedSection}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COMPLETED</Text>
                  {selectedWorkouts.map((workout) => {
                    const photos = workoutPhotos[workout.id] || [];
                    return (
                      <View key={workout.id} style={[styles.workoutCard, { backgroundColor: colors.card }]}>
                        <View style={styles.workoutHeader}>
                          <Text style={[styles.workoutName, { color: colors.text }]}>{workout.name}</Text>
                          <Text style={[styles.workoutTime, { color: colors.textSecondary }]}>
                            {formatTime(workout.startedAt)}
                          </Text>
                        </View>

                        <View style={styles.statsGrid}>
                          <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                              {formatDuration(workout.duration)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                              {formatVolume(workout.totalVolume)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{workout.totalSets}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{workout.exerciseCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
                          </View>
                        </View>

                        {/* Progress Photos */}
                        {photos.length > 0 && (
                          <View style={styles.photosSection}>
                            <Text style={[styles.photosLabel, { color: colors.textSecondary }]}>
                              Progress Photos
                            </Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.photosRow}
                            >
                              {photos.map((photo, index) => (
                                <TouchableOpacity
                                  key={photo.id}
                                  onPress={() => setSelectedPhotoIndex({ workoutId: workout.id, index })}
                                >
                                  <Image
                                    source={{ uri: photo.filePath }}
                                    style={styles.photoThumbnail}
                                  />
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* No workouts message */}
              {selectedWorkouts.length === 0 && selectedScheduled.length === 0 && (
                <View style={[styles.noWorkoutsContainer, { backgroundColor: colors.card }]}>
                  <Text style={[styles.noWorkoutsText, { color: colors.textSecondary }]}>No workouts on this day</Text>
                </View>
              )}

              {/* Schedule button */}
              <TouchableOpacity
                style={[styles.scheduleButton, { borderColor: colors.primary }]}
                onPress={openRoutinePicker}
              >
                <Text style={[styles.scheduleButtonText, { color: colors.primary }]}>+ Schedule Routine</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Empty state when no date selected */}
      {!selectedDate && workoutDates.length > 0 && (
        <View style={styles.hintContainer}>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Tap a date with a green dot to see workout details
          </Text>
        </View>
      )}

      {/* Empty state when no workouts at all */}
      {!selectedDate && workoutDates.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Workout History</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Complete a workout to see it on your calendar
          </Text>
        </View>
      )}

      {/* Routine Picker Modal */}
      <Modal
        visible={showRoutinePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRoutinePicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowRoutinePicker(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Routine</Text>
            <View style={{ width: 60 }} />
          </View>

          {selectedDate && (
            <View style={[styles.modalDateBanner, { backgroundColor: colors.primary }]}>
              <Text style={styles.modalDateText}>
                {formatDateHeader(selectedDate)}
              </Text>
            </View>
          )}

          <FlatList
            data={routines}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.routinePickerItem, { backgroundColor: colors.card }]}
                onPress={() => handleScheduleRoutine(item)}
              >
                <Text style={[styles.routinePickerName, { color: colors.text }]}>{item.name}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.routinePickerList}
            ListEmptyComponent={
              <View style={styles.emptyRoutines}>
                <Text style={[styles.emptyRoutinesText, { color: colors.textSecondary }]}>
                  No routines yet. Create one first!
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={selectedPhotoIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Text style={styles.photoViewerCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedPhotoIndex && workoutPhotos[selectedPhotoIndex.workoutId] && (
            <Image
              source={{ uri: workoutPhotos[selectedPhotoIndex.workoutId][selectedPhotoIndex.index].filePath }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          )}
          {selectedPhotoIndex && workoutPhotos[selectedPhotoIndex.workoutId] && (
            <View style={styles.photoViewerNav}>
              <TouchableOpacity
                style={[
                  styles.photoNavButton,
                  selectedPhotoIndex.index === 0 && styles.photoNavButtonDisabled,
                ]}
                onPress={() => {
                  if (selectedPhotoIndex.index > 0) {
                    setSelectedPhotoIndex({
                      ...selectedPhotoIndex,
                      index: selectedPhotoIndex.index - 1,
                    });
                  }
                }}
                disabled={selectedPhotoIndex.index === 0}
              >
                <Text style={styles.photoNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.photoViewerCount}>
                {selectedPhotoIndex.index + 1} / {workoutPhotos[selectedPhotoIndex.workoutId].length}
              </Text>
              <TouchableOpacity
                style={[
                  styles.photoNavButton,
                  selectedPhotoIndex.index === workoutPhotos[selectedPhotoIndex.workoutId].length - 1 &&
                    styles.photoNavButtonDisabled,
                ]}
                onPress={() => {
                  const photos = workoutPhotos[selectedPhotoIndex.workoutId];
                  if (selectedPhotoIndex.index < photos.length - 1) {
                    setSelectedPhotoIndex({
                      ...selectedPhotoIndex,
                      index: selectedPhotoIndex.index + 1,
                    });
                  }
                }}
                disabled={selectedPhotoIndex.index === workoutPhotos[selectedPhotoIndex.workoutId].length - 1}
              >
                <Text style={styles.photoNavText}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  calendar: {
    borderRadius: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  workoutCount: {
    fontSize: 13,
    color: '#8E8E93',
  },
  selectedDateSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  selectedDateHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noWorkoutsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  noWorkoutsText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  workoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  workoutTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  hintContainer: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyState: {
    paddingHorizontal: 32,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  scheduledSection: {
    marginBottom: 16,
  },
  completedSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scheduledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  scheduledInfo: {
    flex: 1,
  },
  scheduledBadge: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  scheduledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  scheduledName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  scheduledActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startScheduledButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startScheduledText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteScheduledButton: {
    padding: 8,
  },
  deleteScheduledText: {
    fontSize: 18,
    color: '#FF3B30',
  },
  scheduleButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  scheduleButtonText: {
    color: '#007AFF',
    fontSize: 15,
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
  modalDateBanner: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalDateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  routinePickerList: {
    padding: 16,
  },
  routinePickerItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  routinePickerName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
  },
  emptyRoutines: {
    padding: 32,
    alignItems: 'center',
  },
  emptyRoutinesText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  // Photos styles
  photosSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  photosLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  photosRow: {
    gap: 8,
  },
  photoThumbnail: {
    width: 60,
    height: 80,
    borderRadius: 8,
  },
  // Photo viewer modal
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  photoViewerCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  photoViewerImage: {
    width: SCREEN_WIDTH - 40,
    height: '70%',
  },
  photoViewerNav: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  photoNavButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNavButtonDisabled: {
    opacity: 0.3,
  },
  photoNavText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
  photoViewerCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

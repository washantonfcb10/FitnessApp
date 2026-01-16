import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Calendar, DateData } from 'react-native-calendars';
import {
  getWorkoutDates,
  getWorkoutSummariesForDate,
  WorkoutSummary,
} from '../../src/lib/database';

type MarkedDates = {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
};

export default function HistoryScreen() {
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWorkouts, setSelectedWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  const loadWorkoutDates = useCallback(async () => {
    try {
      const dates = await getWorkoutDates();
      setWorkoutDates(dates);
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
      const summaries = await getWorkoutSummariesForDate(date);
      setSelectedWorkouts(summaries);
    } catch (error) {
      console.error('Failed to load workouts for date:', error);
      setSelectedWorkouts([]);
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
      } else {
        setSelectedDate(dateStr);
        loadWorkoutsForDate(dateStr);
      }
    },
    [selectedDate, loadWorkoutsForDate]
  );

  // Build marked dates object for the calendar
  const markedDates = useMemo((): MarkedDates => {
    const marked: MarkedDates = {};

    // Mark all dates with workouts
    workoutDates.forEach((date) => {
      marked[date] = {
        marked: true,
        dotColor: '#34C759',
      };
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
  }, [workoutDates, selectedDate]);

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <Calendar
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            backgroundColor: '#FFFFFF',
            calendarBackground: '#FFFFFF',
            textSectionTitleColor: '#8E8E93',
            selectedDayBackgroundColor: '#007AFF',
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: '#007AFF',
            dayTextColor: '#000000',
            textDisabledColor: '#C7C7CC',
            dotColor: '#34C759',
            selectedDotColor: '#FFFFFF',
            arrowColor: '#007AFF',
            monthTextColor: '#000000',
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
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>Workout completed</Text>
        </View>
        <Text style={styles.workoutCount}>
          {workoutDates.length} total workout{workoutDates.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Selected Date Workouts */}
      {selectedDate && (
        <View style={styles.selectedDateSection}>
          <Text style={styles.selectedDateHeader}>
            {formatDateHeader(selectedDate)}
          </Text>

          {loadingWorkouts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : selectedWorkouts.length === 0 ? (
            <View style={styles.noWorkoutsContainer}>
              <Text style={styles.noWorkoutsText}>No workouts on this day</Text>
            </View>
          ) : (
            selectedWorkouts.map((workout) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Text style={styles.workoutTime}>
                    {formatTime(workout.startedAt)}
                  </Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatDuration(workout.duration)}
                    </Text>
                    <Text style={styles.statLabel}>Duration</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatVolume(workout.totalVolume)}
                    </Text>
                    <Text style={styles.statLabel}>Volume</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{workout.totalSets}</Text>
                    <Text style={styles.statLabel}>Sets</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{workout.exerciseCount}</Text>
                    <Text style={styles.statLabel}>Exercises</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Empty state when no date selected */}
      {!selectedDate && workoutDates.length > 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            Tap a date with a green dot to see workout details
          </Text>
        </View>
      )}

      {/* Empty state when no workouts at all */}
      {!selectedDate && workoutDates.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No Workout History</Text>
          <Text style={styles.emptySubtitle}>
            Complete a workout to see it on your calendar
          </Text>
        </View>
      )}
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
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
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
});

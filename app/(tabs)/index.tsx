import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { getAllRoutines, deleteRoutine, startWorkout } from '../../src/lib/database';
import { useWorkoutStore } from '../../src/stores/workoutStore';
import type { RoutineTemplate } from '../../src/types';

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { activeWorkoutId, startWorkout: startWorkoutState } = useWorkoutStore();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const loadRoutines = useCallback(async () => {
    try {
      const data = await getAllRoutines();
      setRoutines(data);
    } catch (error) {
      console.error('Failed to load routines:', error);
    }
  }, []);

  // Reload routines when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  };

  const handleStartWorkout = async (routine: RoutineTemplate) => {
    if (activeWorkoutId) {
      Alert.alert(
        'Workout in Progress',
        'You already have an active workout. Would you like to continue it or abandon it?',
        [
          { text: 'Continue', onPress: () => router.push(`/workout/${activeWorkoutId}`) },
          {
            text: 'Abandon & Start New',
            style: 'destructive',
            onPress: async () => {
              useWorkoutStore.getState().abandonWorkout();
              await doStartWorkout(routine);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    await doStartWorkout(routine);
  };

  const doStartWorkout = async (routine: RoutineTemplate) => {
    try {
      const workoutId = await startWorkout(routine.id);
      startWorkoutState(workoutId, routine.name, routine.id);
      router.push(`/workout/${workoutId}`);
    } catch (error) {
      console.error('Failed to start workout:', error);
      Alert.alert('Error', 'Failed to start workout');
    }
  };

  const handleDeleteRoutine = (routine: RoutineTemplate) => {
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${routine.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutine(routine.id);
              await loadRoutines();
            } catch (error) {
              console.error('Failed to delete routine:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const closeSwipeable = (id: string) => {
    const ref = swipeableRefs.current.get(id);
    ref?.close();
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: RoutineTemplate
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.editAction}
        onPress={() => {
          closeSwipeable(item.id);
          router.push(`/routine/${item.id}`);
        }}
      >
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          Edit
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: RoutineTemplate
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          closeSwipeable(item.id);
          handleDeleteRoutine(item);
        }}
      >
        <Animated.Text style={[styles.actionText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const renderRoutineItem = ({ item }: { item: RoutineTemplate }) => (
    <Swipeable
      ref={(ref) => {
        if (ref) {
          swipeableRefs.current.set(item.id, ref);
        } else {
          swipeableRefs.current.delete(item.id);
        }
      }}
      renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={styles.routineCard}
        onPress={() => router.push(`/routine/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.routineInfo}>
          <Text style={styles.routineName}>{item.name}</Text>
          <Text style={styles.routineDate}>Updated {formatDate(item.updatedAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => handleStartWorkout(item)}
        >
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🏋️</Text>
      <Text style={styles.emptyTitle}>No Routines Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first workout routine to get started
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {activeWorkoutId && (
        <TouchableOpacity
          style={styles.activeWorkoutBanner}
          onPress={() => router.push(`/workout/${activeWorkoutId}`)}
        >
          <Text style={styles.bannerText}>Workout in progress</Text>
          <Text style={styles.bannerAction}>Continue →</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={renderRoutineItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={routines.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/routine/create')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
  },
  routineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  routineDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
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
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: -2,
  },
  activeWorkoutBanner: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  bannerAction: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  editAction: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

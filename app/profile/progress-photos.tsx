import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { getAllProgressPhotos, WorkoutPhoto } from '../../src/lib/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3;

interface ProgressPhotoWithMeta extends WorkoutPhoto {
  workoutName: string;
  workoutDate: number;
}

export default function ProgressPhotosScreen() {
  const { colors, isDark } = useTheme();
  const [photos, setPhotos] = useState<ProgressPhotoWithMeta[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const allPhotos = await getAllProgressPhotos();
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Failed to load progress photos:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [loadPhotos])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderPhoto = ({ item, index }: { item: ProgressPhotoWithMeta; index: number }) => (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => setSelectedIndex(index)}
    >
      <Image source={{ uri: item.filePath }} style={styles.photo} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📸</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Progress Photos</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Finish a workout and add pump pictures to see them here
      </Text>
    </View>
  );

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhoto}
        numColumns={3}
        contentContainerStyle={photos.length === 0 ? styles.emptyContainer : styles.grid}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Photo Viewer Modal */}
      <Modal
        visible={selectedIndex !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedIndex(null)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedIndex(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.filePath }}
                style={styles.viewerImage}
                resizeMode="contain"
              />

              <View style={[styles.photoMeta, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <Text style={[styles.photoWorkout, { color: colors.text }]}>
                  {selectedPhoto.workoutName}
                </Text>
                <Text style={[styles.photoDate, { color: colors.textSecondary }]}>
                  {formatDate(selectedPhoto.workoutDate)}
                </Text>
              </View>

              <View style={styles.navButtons}>
                <TouchableOpacity
                  style={[styles.navButton, selectedIndex === 0 && styles.navButtonDisabled]}
                  onPress={() => {
                    if (selectedIndex !== null && selectedIndex > 0) {
                      setSelectedIndex(selectedIndex - 1);
                    }
                  }}
                  disabled={selectedIndex === 0}
                >
                  <Text style={styles.navButtonText}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.photoCount}>
                  {selectedIndex !== null ? selectedIndex + 1 : 0} / {photos.length}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    selectedIndex === photos.length - 1 && styles.navButtonDisabled,
                  ]}
                  onPress={() => {
                    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
                      setSelectedIndex(selectedIndex + 1);
                    }
                  }}
                  disabled={selectedIndex === photos.length - 1}
                >
                  <Text style={styles.navButtonText}>›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  photoContainer: {
    margin: 4,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.33,
    borderRadius: 8,
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
    lineHeight: 22,
  },
  // Viewer modal
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
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
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  viewerImage: {
    width: SCREEN_WIDTH - 40,
    height: '60%',
  },
  photoMeta: {
    position: 'absolute',
    bottom: 150,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoWorkout: {
    fontSize: 16,
    fontWeight: '600',
  },
  photoDate: {
    fontSize: 14,
    marginTop: 4,
  },
  navButtons: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
  photoCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_PHOTOS = 4;

interface WorkoutCompletionModalProps {
  visible: boolean;
  workoutName: string;
  duration: string;
  totalSets: number;
  onConfirm: (photos: string[]) => void;
  onCancel: () => void;
  onResume?: () => void;
  isInResumeWindow?: boolean;
  resumeTimeLeft?: number;
}

export default function WorkoutCompletionModal({
  visible,
  workoutName,
  duration,
  totalSets,
  onConfirm,
  onCancel,
  onResume,
  isInResumeWindow = false,
  resumeTimeLeft = 0,
}: WorkoutCompletionModalProps) {
  const { colors, isDark } = useTheme();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPhotos([]);
      setShowConfirmation(true);
    }
  }, [visible]);

  const formatResumeTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pickImage = async () => {
    if (photos.length >= MAX_PHOTOS) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri);
    }
  };

  const savePhoto = async (uri: string) => {
    // The image picker returns a persistent URI that we can use directly
    setPhotos((prev) => [...prev, uri]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (showConfirmation) {
      // Show the pump pictures screen
      setShowConfirmation(false);
    } else {
      // Final confirmation with photos
      onConfirm(photos);
    }
  };

  const handleSkipPhotos = () => {
    onConfirm([]);
  };

  // Resume window UI
  if (isInResumeWindow && onResume) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.resumeContainer, { backgroundColor: colors.card }]}>
            <View style={styles.resumeIconContainer}>
              <Text style={styles.resumeIcon}>⏱️</Text>
            </View>
            <Text style={[styles.resumeTitle, { color: colors.text }]}>
              Workout Completed
            </Text>
            <Text style={[styles.resumeSubtitle, { color: colors.textSecondary }]}>
              Changed your mind? You can still resume
            </Text>
            <View style={[styles.timerBadge, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
              <Text style={[styles.timerText, { color: colors.primary }]}>
                {formatResumeTime(resumeTimeLeft)} remaining
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.resumeButton, { backgroundColor: colors.primary }]}
              onPress={onResume}
            >
              <Text style={styles.resumeButtonText}>Resume Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissButton} onPress={onCancel}>
              <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Confirmation screen
  if (showConfirmation) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.celebrationContainer}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={[styles.confirmTitle, { color: colors.text }]}>
                Finish Workout?
              </Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
              <Text style={[styles.workoutName, { color: colors.text }]}>{workoutName}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{duration}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{totalSets}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets</Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : '#E3F2FD' }]}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={[styles.infoText, { color: isDark ? '#64B5F6' : '#1976D2' }]}>
                You'll have 10 minutes to resume if you change your mind
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#34C759' }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Pump pictures screen
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, styles.photosContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.photosTitle, { color: colors.text }]}>
            Add Pump Pictures 💪
          </Text>
          <Text style={[styles.photosSubtitle, { color: colors.textSecondary }]}>
            Capture your progress! Add up to 4 photos.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosScroll}
          >
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < MAX_PHOTOS && (
              <View style={styles.addPhotoButtons}>
                <TouchableOpacity
                  style={[styles.addPhotoButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                  onPress={takePhoto}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.addPhotoIcon}>📷</Text>
                      <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>Camera</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addPhotoButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                  onPress={pickImage}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.addPhotoIcon}>🖼️</Text>
                      <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>Gallery</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
            {photos.length}/{MAX_PHOTOS} photos added
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.border }]}
              onPress={handleSkipPhotos}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#34C759' }]}
              onPress={() => onConfirm(photos)}
            >
              <Text style={styles.saveButtonText}>
                {photos.length > 0 ? 'Save & Finish' : 'Finish'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  photosContainer: {
    maxHeight: '80%',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Photos screen
  photosTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  photosSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  photosScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photoImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addPhotoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C7C7CC',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  photoCount: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Resume window
  resumeContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  resumeIconContainer: {
    marginBottom: 16,
  },
  resumeIcon: {
    fontSize: 64,
  },
  resumeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  resumeSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  timerBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  resumeButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  resumeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    padding: 12,
  },
  dismissButtonText: {
    fontSize: 15,
  },
});

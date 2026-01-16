import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How do I create a new routine?',
    answer:
      'Go to the Routines tab and tap the "+" button in the top right corner. Give your routine a name, then add exercises by selecting from the exercise library. You can customize the number of sets, target reps, and rest time for each exercise.',
  },
  {
    question: 'How do I start a workout?',
    answer:
      'From the Routines tab, tap on any routine to view its details, then tap "Start Workout". This will begin tracking your session and allow you to log your sets.',
  },
  {
    question: 'How do I log my sets during a workout?',
    answer:
      'During an active workout, tap on an exercise to expand it. Enter the weight and reps for each set, then tap the checkmark to log it. The app will automatically track your progress and show comparisons to your previous workouts.',
  },
  {
    question: 'Can I add my own custom exercises?',
    answer:
      'Yes! Go to Profile > Manage Exercises and tap "Add Exercise". You can specify the exercise name, muscle group (like chest, back, legs), and equipment type (barbell, dumbbell, bodyweight, etc.).',
  },
  {
    question: 'How do I view my workout history?',
    answer:
      'Go to the History tab to see all your completed workouts. You can tap on any workout to see the details including exercises performed, sets, weights, and reps.',
  },
  {
    question: 'What does the calendar view show?',
    answer:
      'The calendar in the History tab shows dots on days where you completed workouts. Tap on any date to see the workouts completed on that day.',
  },
  {
    question: 'How do I delete a routine?',
    answer:
      'Open the routine you want to delete, scroll to the bottom, and tap the delete button. Note that this will not delete your workout history for that routine.',
  },
  {
    question: 'What is RPE?',
    answer:
      'RPE stands for Rate of Perceived Exertion. It\'s a scale from 1-10 that measures how hard a set felt. An RPE of 10 means you couldn\'t do any more reps, while an RPE of 7 means you had about 3 reps left in the tank.',
  },
  {
    question: 'How does progressive overload tracking work?',
    answer:
      'The app automatically compares your current workout to your previous session for the same routine. Green indicators show improvement, while red indicates a decrease from last time.',
  },
  {
    question: 'How do I enable dark mode?',
    answer:
      'Go to Profile and toggle the Dark Mode switch. The app will remember your preference.',
  },
];

function FAQItemComponent({ item, isExpanded, onToggle }: { item: FAQItem; isExpanded: boolean; onToggle: () => void }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.faqItem, { backgroundColor: colors.card }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.questionRow}>
        <Text style={[styles.question, { color: colors.text }]}>{item.question}</Text>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>
          {isExpanded ? '−' : '+'}
        </Text>
      </View>
      {isExpanded && (
        <Text style={[styles.answer, { color: colors.textSecondary }]}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function FAQScreen() {
  const { colors } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.headerText, { color: colors.textSecondary }]}>
        Tap on a question to see the answer
      </Text>

      {FAQ_DATA.map((item, index) => (
        <FAQItemComponent
          key={index}
          item={item}
          isExpanded={expandedIndex === index}
          onToggle={() => toggleItem(index)}
        />
      ))}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Have more questions? We're always improving the app based on your feedback.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  faqItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },
  answer: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footer: {
    marginTop: 16,
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

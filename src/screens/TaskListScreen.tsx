import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import { getPendingTasks, deleteTask } from '../db';
import { handleDone, handleWorking, handleLater } from '../services/scheduler';
import { formatDueAt } from '../utils';
import { colors, spacing, radius } from '../theme';
import type { Task } from '../types';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TaskListScreen() {
  const navigation = useNavigation<Nav>();
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    const pending = await getPendingTasks();
    setTasks(pending);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  // Handle button presses on the task notification while app is in foreground
  useEffect(() => {
    const unsub = notifee.onForegroundEvent(async ({ type, detail }) => {
      const taskId = detail.notification?.data?.taskId as string | undefined;
      if (!taskId) return;

      if (type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id;
        if (actionId === 'done') await handleDone(taskId);
        else if (actionId === 'working') await handleWorking(taskId);
        else if (actionId === 'later') await handleLater(taskId);
        loadTasks();
      } else if (type === EventType.DISMISSED) {
        await handleLater(taskId);
        loadTasks();
      }
    });
    return () => unsub();
  }, [loadTasks]);

  const onMarkDone = async (task: Task) => {
    await handleDone(task.id);
    loadTasks();
  };

  const onDelete = (task: Task) => {
    Alert.alert('Delete task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          loadTasks();
        },
      },
    ]);
  };

  const renderTask = ({ item }: { item: Task }) => {
    const dueLabel = formatDueAt(item.due_at);
    const isOverdue = item.due_at !== null && item.due_at <= Date.now();

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          {dueLabel ? (
            <Text style={[styles.due, isOverdue && styles.dueOverdue]}>
              {isOverdue ? '⚠ ' : '🕐 '}{dueLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnDone]}
            onPress={() => onMarkDone(item)}
            activeOpacity={0.7}>
            <Text style={styles.btnText}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDelete]}
            onPress={() => onDelete(item)}
            activeOpacity={0.7}>
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={renderTask}
        contentContainerStyle={tasks.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyTitle}>All clear.</Text>
            <Text style={styles.emptySubtitle}>Add a task to start getting nudged.</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTask')}
        activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
  },
  empty: {
    flex: 1,
  },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardContent: {
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  due: {
    color: colors.warning,
    fontSize: 12,
  },
  dueOverdue: {
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnDone: {
    backgroundColor: colors.success,
  },
  btnDelete: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  fabText: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import { useUserStore } from '@/store/userStore';

export async function exportLocalData(): Promise<{ ok: boolean; message: string }> {
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: useUserStore.getState().user,
      tasks: useTaskStore.getState().tasks,
      occurrences: useTaskStore.getState().occurrences,
      sessions: useTimerStore.getState().sessions,
    };
    const json = JSON.stringify(payload, null, 2);

    try {
      const file = new File(Paths.cache, `routine-export-${Date.now()}.json`);
      file.create({ overwrite: true });
      file.write(json);
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Routine data',
        });
        return { ok: true, message: 'Export ready to share.' };
      }
    } catch {
      /* fall through to clipboard */
    }

    await Clipboard.setStringAsync(json);
    return { ok: true, message: 'Data copied to the clipboard.' };
  } catch {
    return { ok: false, message: 'Could not export data. Please try again.' };
  }
}

export async function clearAllLocalData(): Promise<void> {
  useTaskStore.getState().clearTasks();
  useTimerStore.getState().clearSessions();
  useUserStore.getState().clearUser();
  await AsyncStorage.multiRemove(['routine-user', 'routine-tasks', 'routine-timer']);
}

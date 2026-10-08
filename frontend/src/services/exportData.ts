import { Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { exportAccountData } from "@/services/accountSync";

export async function exportData(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const payload = await exportAccountData();
    const json = JSON.stringify(payload, null, 2);
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `routine-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true, message: "Your account export has been downloaded." };
    }

    try {
      const file = new File(Paths.cache, `routine-export-${Date.now()}.json`);
      file.create({ overwrite: true });
      file.write(json);
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export Routine data",
        });
        return { ok: true, message: "Export ready to share." };
      }
    } catch {
      /* fall through to clipboard */
    }

    await Clipboard.setStringAsync(json);
    return { ok: true, message: "Data copied to the clipboard." };
  } catch {
    return { ok: false, message: "Could not export data. Please try again." };
  }
}

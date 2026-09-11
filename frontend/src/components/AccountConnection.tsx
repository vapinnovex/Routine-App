import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { AppText } from "@/components/ui/Text";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { flushChanges, initializeAccount, reloadAccount, returnToSignIn } from "@/services/accountSync";
import { useConnectionStore } from "@/store/connectionStore";
import { useUserStore } from "@/store/userStore";
import { useAppTheme } from "@/theme/ThemeProvider";

export function AccountConnection() {
  const { colors } = useAppTheme();
  const { ready, saving, error, conflict } = useConnectionStore();
  const user = useUserStore((state) => state.user);
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState<"reload" | "login" | null>(null);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); }
    catch (cause) { useConnectionStore.setState({ error: cause instanceof Error ? cause.message : "Request failed" }); }
    finally { setBusy(false); }
  };
  if (!error && ready) return saving ? <AppText muted style={{ padding: 8 }}>Saving to your account...</AppText> : null;
  return (
    <View style={{ padding: 24, gap: 12, backgroundColor: colors.background }}>
      {!error ? <ActivityIndicator color={colors.primary} /> : <>
        <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText>
        {user && <AppText muted>Your recent changes have not been confirmed saved. Keep the app open to retry.</AppText>}
        {!conflict && <Button label={busy ? "Please wait..." : "Retry"} disabled={busy}
          onPress={() => void run(ready ? flushChanges : initializeAccount)} />}
        {user && <>
          <Button label="Reload saved account data" variant="secondary" disabled={busy} onPress={() => setDiscard("reload")} />
          <Button label="Return to login" variant="ghost" disabled={busy} onPress={() => setDiscard("login")} />
        </>}
      </>}
      <ConfirmationDialog visible={discard !== null} title="Discard unsaved changes?"
        message="Changes that have not reached the server will be lost. Your saved account data will remain available."
        confirmLabel="Discard and continue" onCancel={() => setDiscard(null)} onConfirm={() => {
          const action = discard === "reload" ? reloadAccount : returnToSignIn;
          setDiscard(null); void run(action);
        }} />
    </View>
  );
}

import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { useAppTheme } from "@/theme/ThemeProvider";
import { AppText } from "@/components/ui/Text";
import { spacing } from "@/constants/theme";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
declare global {
  interface Window { routineInstallPrompt?: InstallPrompt | null }
}

const dismissalKey = "routine.install.dismissed";
let dismissedThisSession = false;

/** Uses browser-provided installation where available; Safari needs manual steps. */
export function InstallApp() {
  const { colors } = useAppTheme();
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const syncDismissal = () => {
      let stored = false;
      try { stored = window.localStorage.getItem(dismissalKey) === "1"; } catch { /* Private browsing can block storage. */ }
      setDismissed(dismissedThisSession || stored);
    };
    syncDismissal();
    window.addEventListener("routine-install-dismissed", syncDismissal);
    window.addEventListener("storage", syncDismissal);
    const display = window.matchMedia("(display-mode: standalone)");
    const check = () => setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); window.routineInstallPrompt = null; };
    check(); setReady(true); setPrompt(window.routineInstallPrompt ?? null);
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", complete);
    display.addEventListener("change", check);
    return () => {
      window.removeEventListener("routine-install-dismissed", syncDismissal);
      window.removeEventListener("storage", syncDismissal);
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", complete);
      display.removeEventListener("change", check);
    };
  }, []);
  if (!ready || installed || dismissed) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const install = async () => {
    if (!prompt) { setHelp((value) => !value); return; }
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch { setHelp(true); }
    finally { setPrompt(null); window.routineInstallPrompt = null; setBusy(false); }
  };
  const dismiss = () => {
    dismissedThisSession = true;
    setDismissed(true);
    try { window.localStorage.setItem(dismissalKey, "1"); } catch { /* Still dismissed for this session. */ }
    window.dispatchEvent(new Event("routine-install-dismissed"));
  };
  return (
    <View style={[styles.banner, { borderColor: colors.border }]}>
      <View style={styles.row}>
        <Icon name="home" color={colors.textSecondary} size={18} />
        <AppText variant="caption" muted style={{ flex: 1 }}>Routine, one tap away</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Add to Home Screen"
          accessibilityState={{ disabled: busy, expanded: help }} disabled={busy}
          onPress={() => void install()} style={styles.action}>
          <AppText variant="caption" color={colors.primary} style={{ fontWeight: "700" }}>{busy ? "Opening…" : "Install"}</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss install suggestion" onPress={dismiss} style={styles.close}>
          <Icon name="close" color={colors.textSecondary} size={18} />
        </Pressable>
      </View>
      {help && <View style={{ gap: spacing.xs }}>
        <AppText variant="caption">{!window.isSecureContext
          ? "Open Routine using its secure HTTPS address to install it."
          : ios
            ? "In Safari, open Share → Add to Home Screen → Add. If you are inside another app, open this page in Safari first."
            : "Open your browser menu and choose Install app or Add to Home Screen. On desktop Safari, choose File → Add to Dock. If unavailable, try Chrome or Edge."}</AppText>
        <AppText variant="caption" muted>An internet connection is needed to load and save your account. Installation does not enable offline editing.</AppText>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: spacing.md, paddingBottom: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});

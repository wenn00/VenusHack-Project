/**
 * Browser replacement for React Native's Alert.alert.
 *
 * react-native-web ships Alert as a no-op (`static alert() {}`), so on the
 * web build every Alert silently disappeared — including ones whose button
 * callbacks navigate (log-bp's "Got it" → router.back()). This maps the
 * React Native button list onto window.alert / window.confirm.
 *
 * Kept free of React Native imports so it stays unit-testable; the caller
 * passes the Alert object and the browser dialogs in.
 */

export interface AlertButtonLike {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface BrowserDialogs {
  alert(message: string): void;
  confirm(message: string): boolean;
}

type AlertFn = (title: string, message?: string, buttons?: AlertButtonLike[]) => void;

export function showWebAlert(
  title: string,
  message: string | undefined,
  buttons: AlertButtonLike[] | undefined,
  dialogs: BrowserDialogs,
): void {
  const text = message ? `${title}\n\n${message}` : title;
  const list = buttons ?? [];

  if (list.length <= 1) {
    dialogs.alert(text);
    list[0]?.onPress?.();
    return;
  }

  // window.confirm only offers OK / Cancel: OK runs the first real action,
  // Cancel runs the explicit cancel button if the alert declared one.
  const action = list.find((button) => button.style !== "cancel");
  const cancel = list.find((button) => button.style === "cancel");
  if (dialogs.confirm(text)) {
    action?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}

export function installWebAlert(target: { alert: AlertFn }, dialogs: BrowserDialogs): void {
  target.alert = (title, message, buttons) => showWebAlert(title, message, buttons, dialogs);
}

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pageTopPadding } from "@/lib/page-layout";

export function usePageTopPadding() {
  return pageTopPadding(useSafeAreaInsets().top);
}

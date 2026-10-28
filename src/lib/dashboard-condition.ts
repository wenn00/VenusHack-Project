import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { getPregnancyWeeks } from "./pregnancy";
import type { UserProfile } from "@/types";

type StageProfile = Pick<UserProfile, "stage" | "dueDate" | "postpartumStartDate">;
export function getDashboardCondition(profile: StageProfile | null, now = new Date()) {
  if (profile?.stage === "planning") {
    return { value: "Planning", label: "One step at a time", detail: "Preparing for your next chapter", numeric: false };
  }
  if (profile?.stage === "postpartum") {
    const date = profile.postpartumStartDate ? parseISO(profile.postpartumStartDate) : null;
    const days = date && isValid(date) ? differenceInCalendarDays(now, date) : -1;
    return days >= 0
      ? { value: String(Math.floor(days / 7)), label: "weeks postpartum", detail: `Since ${format(date!, "MMM d, yyyy")}`, numeric: true }
      : { value: "Postpartum", label: "Your recovery matters", detail: "Birth date not recorded", numeric: false };
  }
  if (profile?.stage === "pregnant") {
    const date = profile.dueDate ? parseISO(profile.dueDate) : null;
    const weeks = date && isValid(date) ? getPregnancyWeeks(profile.dueDate, now) : null;
    return weeks === null
      ? { value: "Pregnant", label: "Your journey", detail: "Due date not recorded", numeric: false }
      : { value: String(weeks), label: "weeks", detail: `Due ${format(date!, "MMM d, yyyy")}`, numeric: true };
  }
  return { value: "Welcome", label: "Your journey starts here", detail: "Your stage has not been set", numeric: false };
}

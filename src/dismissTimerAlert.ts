import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getAlarms, stopAlarm } from "./backend/alarmBackend";
import { getTimers, stopTimer } from "./backend/timerBackend";
import { Timer } from "./backend/types";

export default async () => {
  if (!getPreferenceValues().ringContinuously) {
    return await showToast({
      style: Toast.Style.Failure,
      title: "Ring Continuously setting not enabled!",
    });
  }
  const finishedTimers = getTimers().filter((t: Timer) => t.timeLeft === 0);
  const ringingAlarms = getAlarms().filter((a) => a.isRinging);
  if (finishedTimers.length === 0 && ringingAlarms.length === 0) {
    return await showToast({
      style: Toast.Style.Failure,
      title: "No finished timers or ringing alarms found!",
    });
  }
  await closeMainWindow();
  if (finishedTimers.length > 0) {
    stopTimer(finishedTimers[0].originalFile);
  } else {
    stopAlarm(ringingAlarms[0].originalFile);
  }
};

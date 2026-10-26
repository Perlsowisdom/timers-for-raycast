import { useState } from "react";
import { getAlarms, startAlarm, stopAlarm } from "../backend/alarmBackend";
import { checkForOverlyLoudAlert } from "../backend/timerBackend";
import { Alarm, AlarmLaunchConfig } from "../backend/types";

export default function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(alarms === undefined);

  const refreshAlarms = () => {
    setAlarms(getAlarms());
    setIsLoading(false);
  };

  const handleStartAlarm = async (launchConf: AlarmLaunchConfig) => {
    if (!checkForOverlyLoudAlert(launchConf.launchedFromMenuBar)) return;
    await startAlarm(launchConf);
    refreshAlarms();
  };

  const handleStopAlarm = (alarm: Alarm) => {
    setAlarms(alarms?.filter((a: Alarm) => a.originalFile !== alarm.originalFile));
    stopAlarm(alarm.originalFile);
    refreshAlarms();
  };

  return {
    alarms,
    isLoading,
    refreshAlarms,
    handleStartAlarm,
    handleStopAlarm,
  };
}

import { environment, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "crypto";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { extname } from "path";
import { launchAlert } from "./alertProcess";
import { formatAlarmTime } from "./formatUtils";
import { silentFileDeletion } from "./timerBackend";
import { Alarm, AlarmLaunchConfig, Preferences, RawAlarm } from "./types";
import { showHudOrToast, showInitialRingContinuouslyWarning } from "./utils";

// Alarms are stored like timers: one `<id>.alarm` JSON file per alarm, plus a `<id>.dismiss`
// file while "Ring Continuously" is enabled. The background alert process deletes the
// `.alarm` file once it has finished ringing.

const alarmFilePath = (alarmFile: string) => environment.supportPath + "/" + alarmFile;
const dismissFileFor = (alarmFilePath: string) => alarmFilePath.replace(/\.alarm$/, ".dismiss");

/**
 * Parses a time of day such as "7", "7am", "7:30", "7.30 pm", "0730" or "19:30" into the next
 * moment that time occurs (today if it's still ahead, otherwise tomorrow).
 * Returns undefined if the input can't be understood.
 */
const parseAlarmTime = (input: string, now = new Date()): Date | undefined => {
  const match = input
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?:[:.h]?(\d{2}))?\s*(a|p|am|pm|a\.m\.|p\.m\.)?$/);
  if (!match) return undefined;

  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3]?.[0];
  if (minutes > 59) return undefined;
  if (meridiem) {
    if (hours < 1 || hours > 12) return undefined;
    hours = (hours % 12) + (meridiem === "p" ? 12 : 0);
  } else if (hours > 23) {
    return undefined;
  }

  const ringsAt = new Date(now);
  ringsAt.setHours(hours, minutes, 0, 0);
  if (ringsAt.getTime() <= now.getTime()) ringsAt.setDate(ringsAt.getDate() + 1);
  return ringsAt;
};

async function startAlarm({
  ringsAt,
  alarmName = "Alarm",
  selectedSound = "default",
  launchedFromMenuBar = false,
}: AlarmLaunchConfig) {
  if (!(await showInitialRingContinuouslyWarning())) return;
  if (ringsAt.getTime() <= Date.now()) {
    showHudOrToast({ msg: "Alarm time must be in the future!", launchedFromMenuBar, isErr: true });
    return;
  }

  const prefs = getPreferenceValues<Preferences>();
  const masterFile = alarmFilePath(randomUUID() + ".alarm");
  if (prefs.ringContinuously) {
    writeFileSync(dismissFileFor(masterFile), ".dismiss file for Timers");
  }

  const fileContents: RawAlarm = {
    name: alarmName,
    ringsAt: ringsAt,
    pid: undefined,
    selectedSound: selectedSound === "default" ? prefs.selectedSound : selectedSound,
  };
  // the file must exist before the alert process can possibly check for it
  writeFileSync(masterFile, JSON.stringify(fileContents));

  fileContents.pid = launchAlert({
    masterFile: masterFile,
    dismissFile: prefs.ringContinuously ? dismissFileFor(masterFile) : undefined,
    wait: { until: ringsAt },
    notificationTitle: "Alarm",
    notificationBody: `${alarmName} (${formatAlarmTime(ringsAt)})`,
    sound: fileContents.selectedSound,
    spokenText: alarmName,
  });
  writeFileSync(masterFile, JSON.stringify(fileContents));

  showHudOrToast({
    msg: `Alarm "${alarmName}" set for ${formatAlarmTime(ringsAt)}!`,
    launchedFromMenuBar: launchedFromMenuBar,
    isErr: false,
  });
}

function getAlarms(): Alarm[] {
  const now = Date.now();
  const alarms: Alarm[] = [];
  readdirSync(environment.supportPath).forEach((alarmFile: string) => {
    if (extname(alarmFile) !== ".alarm") return;
    try {
      const raw: RawAlarm = JSON.parse(readFileSync(alarmFilePath(alarmFile)).toString());
      const ringsAt = new Date(raw.ringsAt);
      if (Number.isNaN(ringsAt.getTime())) return;
      alarms.push({
        name: raw.name,
        ringsAt: ringsAt,
        pid: raw.pid,
        selectedSound: raw.selectedSound,
        originalFile: alarmFile,
        isRinging: ringsAt.getTime() <= now,
      });
    } catch (error) {
      // the file may have been removed by the alert process between listing and reading it
      if (!(error instanceof SyntaxError) && !(error instanceof Error && error.message.includes("ENOENT"))) throw error;
    }
  });
  alarms.sort((a, b) => a.ringsAt.getTime() - b.ringsAt.getTime());
  return alarms;
}

function stopAlarm(alarmFile: string) {
  const filePath = alarmFilePath(alarmFile);
  silentFileDeletion(filePath);
  silentFileDeletion(dismissFileFor(filePath));
}

function renameAlarm(alarmFile: string, newName: string) {
  const filePath = alarmFilePath(alarmFile);
  const raw: RawAlarm = JSON.parse(readFileSync(filePath).toString());
  raw.name = newName;
  writeFileSync(filePath, JSON.stringify(raw));
}

export { getAlarms, parseAlarmTime, renameAlarm, startAlarm, stopAlarm };

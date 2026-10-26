import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import useAlarms from "./hooks/useAlarms";
import { formatAlarmTime, formatTime, secondsBetweenDates } from "./backend/formatUtils";
import { shortcuts } from "./backend/shortcuts";
import RenameAction from "./components/RenameAction";
import SetAlarmView from "./setAlarm";

const upcomingIcon = { source: Icon.Alarm, tintColor: Color.Yellow };
const upcomingLabel = { tag: { value: "Set", color: Color.Yellow } };
const ringingIcon = { source: Icon.Alarm, tintColor: Color.Green };
const ringingLabel = { tag: { value: "Ringing!", color: Color.Green } };

export default function Command() {
  const { alarms, isLoading, refreshAlarms, handleStopAlarm } = useAlarms();
  const { push } = useNavigation();

  useEffect(() => {
    refreshAlarms();
    const interval = setInterval(() => {
      refreshAlarms();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title={alarms?.length !== 0 && alarms != null ? "Alarms" : "No Alarms Set"}>
        {alarms?.map((alarm) => (
          <List.Item
            key={alarm.originalFile}
            icon={alarm.isRinging ? ringingIcon : upcomingIcon}
            title={alarm.name}
            subtitle={formatAlarmTime(alarm.ringsAt)}
            accessories={[
              alarm.isRinging
                ? { text: "Ringing now" }
                : { text: `Rings in ${formatTime(secondsBetweenDates({ d1: alarm.ringsAt }))}` },
              alarm.isRinging ? ringingLabel : upcomingLabel,
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={alarm.isRinging ? "Dismiss Alarm" : "Cancel Alarm"}
                  icon={Icon.Stop}
                  shortcut={shortcuts.stop}
                  onAction={() => handleStopAlarm(alarm)}
                />
                <RenameAction
                  renameLabel="Alarm"
                  currentName={alarm.name}
                  originalFile="alarm"
                  ctID={alarm.originalFile}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          key={0}
          icon={Icon.Alarm}
          title={"Set a new alarm"}
          subtitle={"Press Enter to set an alarm"}
          actions={
            <ActionPanel>
              <Action
                title="Set Alarm"
                icon={Icon.Alarm}
                onAction={() => push(<SetAlarmView arguments={{ time: "", name: "" }} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

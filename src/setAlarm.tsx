import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";
import { useState } from "react";
import { parseAlarmTime, startAlarm } from "./backend/alarmBackend";
import { soundData } from "./backend/soundData";
import { checkForOverlyLoudAlert } from "./backend/timerBackend";
import { AlarmInlineArgs, Preferences } from "./backend/types";

interface AlarmFormValues {
  ringsAt: Date | null;
  name: string;
  selectedSound: string;
}

const nextFullHour = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

export default function SetAlarmView(props: { arguments: AlarmInlineArgs }) {
  const prefs: Preferences = getPreferenceValues();
  const { pop } = useNavigation();
  const timeArg = props.arguments.time?.trim() ?? "";
  const parsedArg = timeArg === "" ? undefined : parseAlarmTime(timeArg);
  const [timeErr, setTimeErr] = useState<string | undefined>(
    timeArg !== "" && !parsedArg ? `Couldn't understand "${timeArg}" as a time` : undefined,
  );

  // a valid time argument sets the alarm straight away, without showing the form
  if (parsedArg) {
    if (checkForOverlyLoudAlert()) {
      startAlarm({ ringsAt: parsedArg, alarmName: props.arguments.name || undefined });
    }
    return null;
  }

  const handleSubmit = (values: AlarmFormValues) => {
    if (!values.ringsAt) {
      setTimeErr("Pick a time for the alarm!");
      return;
    }
    if (values.ringsAt.getTime() <= Date.now()) {
      setTimeErr("Alarm time must be in the future!");
      return;
    }
    if (!checkForOverlyLoudAlert()) return;
    startAlarm({
      ringsAt: values.ringsAt,
      alarmName: values.name ? values.name : undefined,
      selectedSound: values.selectedSound,
    }).then(() => pop());
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Alarm" onSubmit={(values: AlarmFormValues) => handleSubmit(values)} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="ringsAt"
        title="Time"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={nextFullHour()}
        error={timeErr}
        onChange={() => setTimeErr(undefined)}
      />
      <Form.TextField id="name" title="Name" placeholder="Wake Up" defaultValue={props.arguments.name} />
      <Form.Dropdown id="selectedSound" defaultValue="default" title="Sound">
        <Form.Dropdown.Item value="default" title="Default" />
        {soundData.map((item, index) => (
          <Form.Dropdown.Item
            key={index}
            title={item.value === prefs.selectedSound ? `${item.title} (currently selected)` : item.title}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

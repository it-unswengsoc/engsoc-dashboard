type EventType = 'INTERNAL' | 'EXTERNAL';

interface EventRowProps {
  month: string;     // e.g. "JUN"
  day: number;       // e.g. 1
  name: string;      // e.g. "General Meeting"
  type: EventType;   // controls the badge style
  dateString: string; // e.g. "Mon, 1 June"
  time: string;      // e.g. "9:30PM"
}

// TODO: Style this component to match the design
// - a small date block on the left: month abbreviation in red above a bold day number
// - event name in bold next to it
// - a badge below the name: INTERNAL = dark filled, EXTERNAL = outlined
// - small grey text showing the date and time next to the badge
export default function EventRow({ month, day, name, type, dateString, time }: EventRowProps) {
  return (
    <div>
      <div>
        <p>{month}</p>
        <p>{day}</p>
      </div>
      <div>
        <p>{name}</p>
        <div>
          <span>{type}</span>
          <span>{dateString} {time}</span>
        </div>
      </div>
    </div>
  );
}

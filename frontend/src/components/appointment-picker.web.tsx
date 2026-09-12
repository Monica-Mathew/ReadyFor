type Props = {
  value: Date | null;
  onChange: (value: Date | null) => void;
};

function formatLocal(date: Date): string {
  const pad = (number: number) => String(number).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export default function AppointmentPicker({ value, onChange }: Props) {
  return (
    <input
      aria-label="Appointment date and time"
      type="datetime-local"
      value={value ? formatLocal(value) : ''}
      onChange={(event) => {
        const text = event.target.value;
        const date = text ? new Date(text) : null;

        onChange(
          date && !Number.isNaN(date.getTime()) ? date : null
        );
      }}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        minHeight: 50,
        padding: '12px 14px',
        border: '1px solid #d1d5db',
        borderRadius: 12,
        fontSize: 16,
        fontFamily: 'inherit',
        backgroundColor: '#ffffff',
        color: '#111827',
      }}
    />
  );
}
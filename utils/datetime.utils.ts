/** Value for HTML `<input type="datetime-local" />` in the user's local timezone. */
export function formatDateTimeLocalInput(date: Date = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

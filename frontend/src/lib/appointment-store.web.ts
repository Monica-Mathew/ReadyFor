import type { SavedAppointment } from './appointment-types';
const KEY = 'readyfor-appointments-v1';
export async function loadAppointments(): Promise<SavedAppointment[]> {
  const raw = localStorage.getItem(KEY); const value = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(value)) throw new Error('Saved appointments could not be read.');
  return value;
}
export async function writeAppointments(items: SavedAppointment[]) { localStorage.setItem(KEY, JSON.stringify(items)); }

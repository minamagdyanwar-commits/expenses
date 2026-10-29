import { download } from './ui.jsx';
import { isoDate } from './logic.js';

// Downloads a JSON backup and remembers when it happened (for the Home reminder).
export function exportBackup(state, dispatch) {
  const today = isoDate();
  const data = { ...state, settings: { ...state.settings, lastBackup: today } };
  download(`expense-tracker-backup-${today}.json`, JSON.stringify(data, null, 2), 'application/json');
  dispatch({ type: 'settings', settings: { lastBackup: today } });
}

import { getDb } from '../src/lib/db';
import { seedHistoricalDataIfNeeded } from '../src/lib/seed';

const db = getDb();
const seeded = seedHistoricalDataIfNeeded(db, 72);
if (seeded) {
  console.log('Seeded historical telemetry data.');
} else {
  console.log('Seed skipped: database already has telemetry records.');
}

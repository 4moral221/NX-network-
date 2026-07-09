import { openDB } from 'idb';

export const initDB = async () => {
  return await openDB('nxDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offlineTasks')) {
        db.createObjectStore('offlineTasks', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache');
      }
    },
  });
};

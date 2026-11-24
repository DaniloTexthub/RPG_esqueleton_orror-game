// SaveSystem — Saves por slot em IndexedDB e espelho localStorage

const DATABASE_NAME = 'rpg-skeleton-dungeon';
const DATABASE_VERSION = 1;
const STORE_NAME = 'saves';
const STORAGE_KEY = 'skeleton_dungeon_saves';
export const SAVE_SLOTS = ['slot-1', 'slot-2', 'slot-3'];

export class SaveSystem {
  constructor() {
    this.databasePromise = null;
  }

  openDatabase() {
    if (this.databasePromise) return this.databasePromise;
    if (!globalThis.indexedDB) {
      console.warn('IndexedDB indisponível; usando localStorage para os saves.');
      this.databasePromise = Promise.resolve(null);
      return this.databasePromise;
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falha ao abrir IndexedDB.'));
    }).catch(error => {
      console.warn(`${error.message} Usando localStorage para os saves.`);
      return null;
    });
    return this.databasePromise;
  }

  async runTransaction(mode, operation) {
    const database = await this.openDatabase();
    if (!database) return null;

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      let result;
      if (request) {
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error || new Error('Falha ao acessar um save.'));
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error('Transação de save falhou.'));
      transaction.onabort = () => reject(transaction.error || new Error('Transação de save cancelada.'));
    });
  }

  readLocalRecords() {
    try {
      const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return records && typeof records === 'object' && !Array.isArray(records) ? records : {};
    } catch (error) {
      console.warn(`Não foi possível ler o espelho local dos saves: ${error.message}`);
      return {};
    }
  }

  writeLocalRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  async save(slotId, state) {
    if (!SAVE_SLOTS.includes(slotId)) throw new Error(`Slot inválido: ${slotId}`);
    const record = { id: slotId, updatedAt: Date.now(), state };
    const localRecords = this.readLocalRecords();
    localRecords[slotId] = record;

    let localSaved = false;
    try {
      this.writeLocalRecords(localRecords);
      localSaved = true;
    } catch (error) {
      console.warn(`Não foi possível espelhar o save no localStorage: ${error.message}`);
    }

    try {
      const result = await this.runTransaction('readwrite', store => store.put(record));
      if (result === null && !localSaved) throw new Error('IndexedDB e localStorage indisponíveis.');
    } catch (error) {
      console.warn(`Save mantido no fallback local: ${error.message}`);
      if (!localSaved) throw error;
    }
    return record;
  }

  async load(slotId) {
    if (!SAVE_SLOTS.includes(slotId)) throw new Error(`Slot inválido: ${slotId}`);
    const localRecord = this.readLocalRecords()[slotId];
    if (localRecord?.deleted) return null;
    try {
      const record = await this.runTransaction('readonly', store => store.get(slotId));
      if (record) return record;
    } catch (error) {
      console.warn(`Falha ao carregar o slot ${slotId} do IndexedDB: ${error.message}`);
    }
    return localRecord || null;
  }

  async list() {
    let databaseRecords = [];
    try {
      databaseRecords = await this.runTransaction('readonly', store => store.getAll()) || [];
    } catch (error) {
      console.warn(`Falha ao listar saves no IndexedDB: ${error.message}`);
    }

    const records = new Map(databaseRecords.map(record => [record.id, record]));
    for (const [slotId, record] of Object.entries(this.readLocalRecords())) {
      if (record.deleted || !records.has(slotId)) records.set(slotId, record);
    }
    return SAVE_SLOTS.map(slotId => {
      const record = records.get(slotId);
      return record && !record.deleted ? record : null;
    });
  }

  async latest() {
    const records = (await this.list()).filter(Boolean);
    return records.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  }

  async remove(slotId) {
    if (!SAVE_SLOTS.includes(slotId)) throw new Error(`Slot inválido: ${slotId}`);
    const localRecords = this.readLocalRecords();
    localRecords[slotId] = { id: slotId, deleted: true, updatedAt: Date.now() };
    let localSaved = false;
    try {
      this.writeLocalRecords(localRecords);
      localSaved = true;
    } catch (error) {
      console.warn(`Não foi possível remover o espelho local: ${error.message}`);
    }
    try {
      const result = await this.runTransaction('readwrite', store => store.delete(slotId));
      if (result === null && !localSaved) throw new Error('IndexedDB e localStorage indisponíveis.');
    } catch (error) {
      console.warn(`Falha ao remover o slot ${slotId} do IndexedDB: ${error.message}`);
      if (!localSaved) throw error;
    }
  }

  loadProgress() {
    const defaults = {
      highestFloor: 1,
      totalEnemiesKilled: 0,
      speedRuns: 0,
      totalHealingDone: 0
    };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem('skeleton_dungeon_save') || '{}') };
    } catch (error) {
      console.warn(`Não foi possível ler o progresso: ${error.message}`);
      return defaults;
    }
  }

  saveProgress(progress) {
    localStorage.setItem('skeleton_dungeon_save', JSON.stringify(progress));
  }
}

import { supabase } from '../lib/supabase';

export interface PendingEntry {
  id?: number;
  employee_id: string;
  employee_name: string;
  timestamp: string;
  type: string;
  tenant_id: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  device_info: string;
  synced: boolean;
}

class OfflineSyncService {
  private DB_NAME = 'CyberTech_OfflineDB';
  private STORE_NAME = 'pending_entries';
  private EMPLOYEES_STORE = 'cached_employees';

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 2);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(this.EMPLOYEES_STORE)) {
          db.createObjectStore(this.EMPLOYEES_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Salvar batida localmente
  async saveEntry(entry: Omit<PendingEntry, 'synced'>) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.add({ ...entry, synced: false });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Cachear lista de funcionários para identificação offline
  async cacheEmployees(employees: any[]) {
    const db = await this.getDB();
    const transaction = db.transaction(this.EMPLOYEES_STORE, 'readwrite');
    const store = transaction.objectStore(this.EMPLOYEES_STORE);
    store.clear();
    employees.forEach(emp => store.add(emp));
  }

  async getCachedEmployees(): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(this.EMPLOYEES_STORE, 'readonly');
      const store = transaction.objectStore(this.EMPLOYEES_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Buscar batidas pendentes
  async getPendingEntries(): Promise<PendingEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.filter((e: any) => !e.synced));
    });
  }

  // Sincronizar com o servidor
  async syncWithServer() {
    const pending = await this.getPendingEntries();
    if (pending.length === 0) return;

    console.log(`Sincronizando ${pending.length} batidas pendentes...`);

    for (const entry of pending) {
      try {
        const { id, synced, ...dataToSync } = entry;
        const { error } = await supabase.from('time_entries').insert([dataToSync]);
        
        if (!error) {
          // Marcar como sincronizado ou remover
          await this.removeEntry(id!);
        }
      } catch (err) {
        console.error('Falha ao sincronizar entrada:', err);
      }
    }
  }

  private async removeEntry(id: number) {
    const db = await this.getDB();
    const transaction = db.transaction(this.STORE_NAME, 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    store.delete(id);
  }
}

export const offlineSync = new OfflineSyncService();

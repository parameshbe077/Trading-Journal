import { doc, getDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { db } from './firebase.js';
import { defaultState } from './utils.js';

const LEGACY_KEY = 'tradevault_journal';
const CACHE_PREFIX = 'tradevault_journal_';

let currentUserId = null;
let saveTimer = null;
let pendingSave = null;
let onSaveError = null;

function cacheKey(uid) {
  return `${CACHE_PREFIX}${uid}`;
}

function journalRef(uid) {
  return doc(db, 'journals', uid);
}

export function setSaveErrorHandler(fn) {
  onSaveError = fn;
}

export function setStorageUser(uid) {
  if (uid !== currentUserId) {
    currentUserId = uid;
    clearTimeout(saveTimer);
    saveTimer = null;
    pendingSave = null;
  }
}

export function clearStorageUser() {
  currentUserId = null;
  clearTimeout(saveTimer);
  saveTimer = null;
  pendingSave = null;
}

function firestoreErrorMessage(err) {
  const code = err?.code ?? '';
  if (code === 'permission-denied') {
    return 'Firestore blocked the save. Enable Auth + deploy security rules in Firebase Console.';
  }
  if (code === 'unavailable') {
    return 'Firestore is offline. Check your internet connection.';
  }
  return err?.message ?? 'Could not save to cloud.';
}

function readLocalCache(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readLegacyLocal() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = migrate(JSON.parse(raw));
    const hasData = data.trades?.length || data.dailyLogs?.length;
    return hasData ? data : null;
  } catch {
    return null;
  }
}

function writeLocalCache(uid, state) {
  localStorage.setItem(cacheKey(uid), JSON.stringify(state));
}

export async function loadState(uid) {
  if (!uid) return defaultState();

  try {
    const snap = await getDoc(journalRef(uid));
    if (snap.exists()) {
      const state = migrate(snap.data());
      writeLocalCache(uid, state);
      return state;
    }
  } catch (err) {
    console.error('Firestore load failed:', err);
    const cached = readLocalCache(uid);
    if (cached) return cached;
    throw new Error(firestoreErrorMessage(err));
  }

  const legacy = readLegacyLocal();
  if (legacy) {
    writeLocalCache(uid, legacy);
    await flushSave(uid, legacy);
    localStorage.removeItem(LEGACY_KEY);
    return legacy;
  }

  const cached = readLocalCache(uid);
  if (cached) {
    await flushSave(uid, cached);
    return cached;
  }

  const fresh = defaultState();
  writeLocalCache(uid, fresh);
  await flushSave(uid, fresh);
  return fresh;
}

export function saveState(state) {
  if (!currentUserId) return;
  writeLocalCache(currentUserId, state);
  pendingSave = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const toSave = pendingSave;
    const uid = currentUserId;
    pendingSave = null;
    if (toSave && uid) flushSave(uid, toSave);
  }, 600);
}

async function flushSave(uid, state) {
  try {
    await setDoc(journalRef(uid), {
      ...state,
      updatedAt: new Date().toISOString(),
    });
    console.info('Saved to Firestore: journals/', uid);
  } catch (err) {
    console.error('Firestore save failed:', err);
    onSaveError?.(firestoreErrorMessage(err));
    throw err;
  }
}

export async function clearState(uid) {
  if (!uid) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  pendingSave = null;
  localStorage.removeItem(cacheKey(uid));
  localStorage.removeItem(LEGACY_KEY);
  try {
    await deleteDoc(journalRef(uid));
  } catch (err) {
    console.warn('Firestore delete failed:', err);
  }
}

function migrate(data) {
  const base = defaultState();
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...data.settings },
    rules: data.rules?.length ? data.rules : base.rules,
    trades: data.trades ?? [],
    dailyLogs: data.dailyLogs ?? [],
  };
}

export function exportData(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tradevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        resolve(migrate(data));
      } catch {
        reject(new Error('Invalid backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

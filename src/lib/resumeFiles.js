const DB_NAME = 'kisip-jobpilot-private'
const STORE_NAME = 'resumeFiles'
const DB_VERSION = 1

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB is unavailable in this browser.'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open private resume storage.'))
  })
}

function transact(mode, action) {
  return openDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = action(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Private resume storage failed.'))
    transaction.oncomplete = () => db.close()
  }))
}

export const saveResumeFile = (resumeId, file) => transact('readwrite', store => store.put(file, resumeId))
export const getResumeFile = resumeId => transact('readonly', store => store.get(resumeId))
export const deleteResumeFile = resumeId => transact('readwrite', store => store.delete(resumeId))
export const formatFileSize = bytes => bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : 'No PDF selected'

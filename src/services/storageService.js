import { load, remove, save } from '../lib/storage.js'
export const storageService = { load, remove, save: (key, value) => { save(key, value) } }

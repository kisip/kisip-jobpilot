import { load, save } from '../lib/storage.js'
export const storageService = { load, save: (key, value) => { save(key, value) } }

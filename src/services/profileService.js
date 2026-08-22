import preferences from '../config/jobPreferences.js'
import { storageService } from './storageService.js'
export const defaultApplicationProfile={...preferences.candidateProfile,skills:preferences.skills,email:'',phone:''}
export const loadApplicationProfile=()=>storageService.load('applicationProfile',defaultApplicationProfile)
export const saveApplicationProfile=profile=>storageService.save('applicationProfile',profile)

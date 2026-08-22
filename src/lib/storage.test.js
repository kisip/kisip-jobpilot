import { describe, expect, it } from 'vitest'
import { load, save } from './storage'
describe('local storage',()=>{it('round-trips state',()=>{expect(save('settings',{notifications:true})).toBe(true);expect(load('settings',{})).toEqual({notifications:true})});it('returns fallback for missing state',()=>expect(load('jobs',[])).toEqual([]))})

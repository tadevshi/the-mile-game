import { describe, it, expect, beforeEach } from 'vitest'
import { useRankingStore } from '../rankingStore'

describe('rankingStore', () => {
  beforeEach(() => {
    useRankingStore.setState({ currentPlayerId: null })
  })

  it('starts with currentPlayerId as null', () => {
    expect(useRankingStore.getState().currentPlayerId).toBeNull()
  })

  it('setCurrentPlayerId updates the id', () => {
    useRankingStore.getState().setCurrentPlayerId('player-123')
    expect(useRankingStore.getState().currentPlayerId).toBe('player-123')
  })

  it('setCurrentPlayerId(null) clears the id', () => {
    useRankingStore.getState().setCurrentPlayerId('player-123')
    useRankingStore.getState().setCurrentPlayerId(null)
    expect(useRankingStore.getState().currentPlayerId).toBeNull()
  })

  it('overwrites a previous id with a new one', () => {
    useRankingStore.getState().setCurrentPlayerId('player-aaa')
    useRankingStore.getState().setCurrentPlayerId('player-bbb')
    expect(useRankingStore.getState().currentPlayerId).toBe('player-bbb')
  })
})

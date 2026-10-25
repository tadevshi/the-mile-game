import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { LottieProps } from 'lottie-react'
import { LottieAnimation } from './LottieAnimation'
import { CelebrationAnimation } from './CelebrationAnimation'

const { player } = vi.hoisted(() => ({ player: vi.fn() }))
vi.mock('lottie-react', () => ({
  Lottie: (props: LottieProps) => {
    player(props)
    return <button onClick={() => props.subscriptions?.ready?.()}>Animation ready</button>
  },
}))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

const animation = { v: '5.7.4', layers: [] }

describe('Lottie 3 compatibility', () => {
  it('preserves animation source, playback options, size, and loading fallback', () => {
    const { container } = render(
      <LottieAnimation animationData={animation} height={120} width={240}
        loop={false} autoplay={false} fallback={<span>Loading animation</span>} />
    )
    expect(player).toHaveBeenLastCalledWith(expect.objectContaining({
      src: animation, loop: false, autoplay: false,
      style: { height: '100%', width: '100%' },
    }))
    expect(container.firstChild).toHaveStyle({ height: '120px', width: '240px' })
    expect(screen.getByText('Loading animation')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Animation ready' }))
    expect(screen.queryByText('Loading animation')).not.toBeInTheDocument()
  })

  it('preserves default looping and autoplay', () => {
    render(<LottieAnimation animationData={animation} />)
    expect(player).toHaveBeenLastCalledWith(expect.objectContaining({
      src: animation, loop: true, autoplay: true,
    }))
  })

  it('preserves celebration playback, rank message, and dismissal', () => {
    // Avoid leaving the celebration confetti timers running after this test.
    vi.useFakeTimers()
    try {
      const onComplete = vi.fn()
      const { container } = render(
        <CelebrationAnimation rank={2} playerName="Alex" isVisible onComplete={onComplete} />
      )
      expect(screen.getByText('Alex')).toBeInTheDocument()
      expect(screen.getByText('¡Excelente! ¡Segundo lugar!')).toBeInTheDocument()
      expect(player).toHaveBeenLastCalledWith(expect.objectContaining({
        src: expect.objectContaining({ layers: expect.any(Array) }), loop: false, autoplay: true,
      }))
      fireEvent.click(container.firstChild!)
      expect(onComplete).toHaveBeenCalledOnce()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})

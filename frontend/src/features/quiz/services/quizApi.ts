import { api } from '@/shared/lib/api';
import type { Player, CreatePlayerRequest, SubmitQuizRequest, SubmitQuizResponse } from '@/shared/lib/api';

export const quizService = {
  /**
   * Create a player scoped to a specific event.
   * Uses the event-scoped endpoint to properly associate the player with an event.
   */
  createPlayer: (eventSlug: string, data: CreatePlayerRequest): Promise<Player> =>
    api.createPlayerScoped(eventSlug, data),

  submitAnswers: (data: SubmitQuizRequest): Promise<SubmitQuizResponse> =>
    api.submitQuiz(data),

  // Submit answers for a specific event (uses scoped endpoint)
  submitAnswersScoped: (eventSlug: string, data: SubmitQuizRequest): Promise<SubmitQuizResponse> =>
    api.submitQuizScoped(eventSlug, data),
};

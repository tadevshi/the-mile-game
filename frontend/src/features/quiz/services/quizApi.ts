import { api } from '@/shared/lib/api';
import type { Player, CreatePlayerRequest, SubmitQuizRequest, SubmitQuizResponse } from '@/shared/lib/api';

export const quizService = {
  createPlayer: (data: CreatePlayerRequest): Promise<Player> =>
    api.createPlayer(data),

  submitAnswers: (data: SubmitQuizRequest): Promise<SubmitQuizResponse> =>
    api.submitQuiz(data),
};

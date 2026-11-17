import { apiFetch, executeApi } from '../../lib/api-client';
import { DEMO_RAG_RESPONSE } from '../../mocks/fixtures';
import { RAGQueryRequest, RAGQueryResponse } from '../../types/api';

export const ragApi = {
  async askQuestion(
    payload: RAGQueryRequest
  ): Promise<{ data: RAGQueryResponse; isLive: boolean }> {
    return executeApi(
      () =>
        apiFetch<RAGQueryResponse>('/rag/ask', {
          method: 'POST',
          body: JSON.stringify({ question: payload.question }),
        }),
      () => ({
        ...DEMO_RAG_RESPONSE,
        question: payload.question,
      })
    );
  },
};

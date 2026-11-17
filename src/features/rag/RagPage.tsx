import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ragApi } from '../../services/api/ragApi';
import { RAGQueryResponse, SourceCitation } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../context/ConfigContext';
import {
  HelpCircle,
  Sparkles,
  Send,
  BookOpen,
  AlertCircle,
  Bot,
  User as UserIcon,
} from 'lucide-react';

interface ChatTurn {
  id: string;
  question: string;
  response?: RAGQueryResponse;
  error?: string;
}

export const RagPage: React.FC = () => {
  const { addToast } = useConfig();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);

  const sampleQuestions = [
    'Why did the order ingestion pipeline fail?',
    'How do freshness SLA checks work for bronze datasets?',
    'What quality checks are run on silver_orders?',
  ];

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await ragApi.askQuestion({ question: q });
      return { q, data: res.data };
    },
    onSuccess: ({ q, data }) => {
      setHistory((prev) => [
        ...prev,
        { id: `turn-${Date.now()}`, question: q, response: data },
      ]);
      setQuestion('');
    },
    onError: (err: Error, q: string) => {
      setHistory((prev) => [
        ...prev,
        { id: `turn-${Date.now()}`, question: q, error: err.message },
      ]);
      addToast({
        type: 'error',
        title: 'RAG Query Failed',
        message: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  };

  const renderCitations = (resp: RAGQueryResponse) => {
    const rawList = resp.citations || resp.sources || [];
    if (!Array.isArray(rawList) || rawList.length === 0) return null;

    return (
      <div className="pt-3 border-t border-slate-200/80 space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Sources / Citations ({rawList.length})
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rawList.map((item, idx) => {
            if (typeof item === 'string') {
              return (
                <div
                  key={idx}
                  className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700"
                >
                  {item}
                </div>
              );
            }
            const cite = item as SourceCitation;
            return (
              <div
                key={idx}
                className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-indigo-500" />
                    {cite.title || cite.source || cite.doc_id || `Source #${idx + 1}`}
                  </span>
                  {cite.score !== undefined && (
                    <Badge variant="healthy" size="sm">
                      {(cite.score * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
                {(cite.snippet || cite.content) && (
                  <p className="text-slate-600 font-mono text-[10px] line-clamp-3">
                    {cite.snippet || cite.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">RAG Knowledge Assistant</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ask questions about pipeline failures, datasets, and runbooks using Groq + Pinecone (POST /rag/ask)
        </p>
      </div>

      {/* Chat Transcript */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <CardTitle>Assistant Conversation</CardTitle>
          </div>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
              Clear Chat
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs space-y-3">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Ask DataSentinel RAG</h4>
                <p className="mt-1">Try one of the sample engineering questions below:</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {history.map((turn) => (
                <div key={turn.id} className="space-y-3">
                  {/* User Question */}
                  <div className="flex items-start gap-2.5 justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-2xl text-xs leading-relaxed shadow-xs">
                      {turn.question}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Assistant Response or Error */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    {turn.error ? (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl rounded-tl-xs text-rose-700 text-xs flex items-start gap-2 max-w-2xl">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{turn.error}</span>
                      </div>
                    ) : turn.response ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs max-w-3xl text-xs space-y-2 flex-1">
                        <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                          {turn.response.answer}
                        </p>
                        {renderCitations(turn.response)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="pt-4 border-t border-slate-100 space-y-3">
            <Textarea
              label="Ask a Question"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Why did the order ingestion pipeline fail?"
              required
            />
            <div className="flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={mutation.isPending}
                disabled={!question.trim()}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Ask RAG Assistant
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

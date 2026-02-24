'use client';

import { Button } from '@/components/ui/button';

interface ScorecardCriterion {
  id: string;
  name: string;
  score: number;
  justification: string;
}

export interface Scorecard {
  criteria: ScorecardCriterion[];
  overall_score: number;
  overall_level: string;
  top_strength: string;
  top_improvements: { area: string; suggestion: string }[];
}

interface ScorecardViewProps {
  scorecard: Scorecard;
  onDone: () => void;
}

function getLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'strong':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'competent':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'developing':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    default:
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  }
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`h-2 w-5 rounded-sm ${i <= score ? 'bg-primary' : 'bg-muted'}`} />
      ))}
    </div>
  );
}

export function ScorecardView({ scorecard, onDone }: ScorecardViewProps) {
  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <h1 className="text-foreground text-lg font-semibold">Session Results</h1>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Back to Home
        </Button>
      </header>

      <div className="px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Overall Score */}
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-foreground font-mono text-5xl font-bold">
              {scorecard.overall_score}
              <span className="text-muted-foreground text-2xl"> / 40</span>
            </p>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${getLevelColor(scorecard.overall_level)}`}
            >
              {scorecard.overall_level}
            </span>
          </div>

          {/* Top Strength */}
          {scorecard.top_strength && (
            <div className="border-border rounded-lg border p-4">
              <p className="text-foreground mb-1 text-sm font-medium">Top Strength</p>
              <p className="text-muted-foreground text-sm">{scorecard.top_strength}</p>
            </div>
          )}

          {/* Criteria */}
          <div className="space-y-3">
            <h2 className="text-foreground text-sm font-medium">Criteria Scores</h2>
            {scorecard.criteria.map((criterion) => (
              <div key={criterion.id} className="border-border rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-foreground text-sm font-medium">{criterion.name}</p>
                  <div className="flex items-center gap-2">
                    <ScoreBar score={criterion.score} />
                    <span className="text-foreground w-6 text-right font-mono text-sm font-bold">
                      {criterion.score}
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">{criterion.justification}</p>
              </div>
            ))}
          </div>

          {/* Areas for Improvement */}
          {scorecard.top_improvements.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-foreground text-sm font-medium">Areas for Improvement</h2>
              {scorecard.top_improvements.map((improvement, i) => (
                <div key={i} className="border-border rounded-lg border p-4">
                  <p className="text-foreground text-sm font-medium">{improvement.area}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{improvement.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {/* Done Button */}
          <div className="flex justify-center py-4">
            <Button
              size="lg"
              onClick={onDone}
              className="w-64 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
            >
              Start Another Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

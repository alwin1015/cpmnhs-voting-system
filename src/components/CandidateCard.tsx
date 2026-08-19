import { Candidate, Position } from '@/types/voting';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateCardProps {
  candidate: Candidate;
  position: Position;
  isSelected?: boolean;
  onSelect?: () => void;
  showVotes?: boolean;
  rank?: number;
}

export function CandidateCard({
  candidate,
  position,
  isSelected,
  onSelect,
  showVotes,
  rank,
}: CandidateCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer group bg-white/90 backdrop-blur-sm border rounded-2xl",
        isSelected 
          ? "ring-2 ring-indigo-600 shadow-lg shadow-indigo-100/50 border-indigo-300 bg-indigo-50/20" 
          : "hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 border-slate-200/80 shadow-xs",
        rank === 1 && showVotes && "ring-2 ring-amber-400"
      )}
      onClick={onSelect}
    >
      {rank && showVotes && (
        <div className={cn(
          "absolute top-0 right-0 px-2.5 py-0.5 text-xs font-bold rounded-bl-lg z-10",
          rank === 1 ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-700"
        )}>
          #{rank}
        </div>
      )}
      
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col items-center text-center">
          {/* Responsive Photo Container */}
          <div className={cn(
            "relative w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] rounded-full mb-6 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 shadow-md mx-auto shrink-0 border-4",
            isSelected ? "bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/20" : "bg-slate-100 border-white shadow-slate-200/50"
          )}>
            {candidate.photo ? (
              <img 
                src={candidate.photo} 
                alt={candidate.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <User className={cn(
                "h-28 w-28 sm:h-36 sm:w-36",
                isSelected ? "text-indigo-600" : "text-slate-400"
              )} />
            )}
            {isSelected && (
              <div className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center backdrop-blur-[2px] animate-in zoom-in duration-200">
                <Check className="h-16 w-16 text-white stroke-[3]" />
              </div>
            )}
          </div>

          {/* Candidate Name */}
          <h3 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2 px-1">
            {candidate.name}
          </h3>

          {/* Party Badge */}
          <Badge 
            variant="secondary" 
            className="mb-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide max-w-full truncate"
          >
            {candidate.party || 'Independent'}
          </Badge>

          {/* Info Pill */}
          <p className="text-sm font-medium text-slate-500 mb-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60 max-w-full truncate">
            Grade {candidate.gradeLevel || '—'} {candidate.section ? `• ${candidate.section}` : ''}
          </p>

          {/* Motto */}
          {candidate.motto && (
            <p className="text-sm italic text-slate-500 leading-snug px-3 line-clamp-2 mt-1">
              "{candidate.motto}"
            </p>
          )}

          {/* Votes if applicable */}
          {showVotes && (
            <div className="mt-4 pt-4 border-t border-slate-100 w-full">
              <p className="text-2xl sm:text-3xl font-bold text-indigo-700 leading-none">{candidate.votes}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Votes</p>
            </div>
          )}

          {/* Touch-Optimized Select Button */}
          {onSelect && (
            <Button
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "mt-5 min-w-[120px] px-8 rounded-full h-11 text-sm font-bold transition-all duration-200 active:scale-95 touch-manipulation shadow-sm",
                isSelected 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" 
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 group-hover:border-indigo-300 group-hover:text-indigo-600"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected ? (
                <>
                  <Check className="h-4 w-4 mr-1.5 stroke-[3]" />
                  Selected
                </>
              ) : (
                "Vote"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

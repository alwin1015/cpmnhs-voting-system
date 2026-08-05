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
        "relative overflow-hidden transition-all duration-300 cursor-pointer group bg-white/80 backdrop-blur-sm border",
        isSelected ? "ring-2 ring-indigo-500 shadow-xl shadow-indigo-100 border-indigo-200" : "hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 border-slate-100 shadow-sm",
        rank === 1 && showVotes && "ring-2 ring-amber-400"
      )}
      onClick={onSelect}
    >
      {rank && showVotes && (
        <div className={cn(
          "absolute top-0 right-0 px-3 py-1 text-sm font-bold rounded-bl-lg",
          rank === 1 ? "gradient-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
        )}>
          #{rank}
        </div>
      )}
      
      <CardContent className="p-3 pb-4">
        <div className="flex flex-col items-center text-center">
          {/* Photo */}
          <div className={cn(
            "relative w-40 h-40 sm:w-44 sm:h-44 rounded-full mb-3 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105 shadow-md mx-auto",
            isSelected ? "bg-indigo-100 ring-4 ring-indigo-500/20" : "bg-slate-100"
          )}>
            {candidate.photo ? (
              <img 
                src={candidate.photo} 
                alt={candidate.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className={cn(
                "h-16 w-16",
                isSelected ? "text-indigo-500" : "text-slate-400"
              )} />
            )}
            {isSelected && (
              <div className="absolute inset-0 bg-indigo-500/80 flex items-center justify-center backdrop-blur-sm animate-in zoom-in duration-300">
                <Check className="h-10 w-10 text-white" />
              </div>
            )}
          </div>

          {/* Name */}
          <h3 className="font-display text-lg font-bold tracking-wide text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {candidate.name}
          </h3>

          {/* Party */}
          <Badge variant="secondary" className="mb-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 px-3 py-1 text-sm tracking-wider font-bold uppercase"> {candidate.party}
          </Badge>

          {/* Info */}
          <p className="text-sm font-medium tracking-wide text-slate-500 mb-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            Grade {candidate.gradeLevel} <span className="mx-1 opacity-50">•</span> {candidate.section}
          </p>

          {/* Motto */}
          <p className="text-sm tracking-wide italic text-slate-600 leading-snug px-2">
            "{candidate.motto}"
          </p>

          {/* Votes */}
          {showVotes && (
            <div className="mt-4 pt-4 border-t border-border w-full">
              <p className="text-2xl font-bold text-primary">{candidate.votes}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Votes</p>
            </div>
          )}

          {/* Select Button */}
          {onSelect && (
            <Button
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "mt-4 w-1/2 mx-auto rounded-xl h-10 transition-all duration-300",
                isSelected 
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200" 
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 group-hover:border-indigo-200 group-hover:text-indigo-600"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              {isSelected ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Voted
                </>
              ) : (
                "Select Candidate"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}










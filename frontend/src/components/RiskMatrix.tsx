import { Hazard, RISK_COLORS } from '../types';

interface RiskMatrixProps {
  hazards?: Hazard[];
  compact?: boolean;
}

const RISK_CELL_COLORS: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Extreme: 'bg-red-100 text-red-700',
};

function getRiskLevel(s: number, l: number): string {
  const score = s * l;
  if (score <= 5) return 'Low';
  if (score <= 10) return 'Medium';
  if (score <= 15) return 'High';
  return 'Extreme';
}

export default function RiskMatrix({ hazards = [], compact = false }: RiskMatrixProps) {
  const cellSize = compact ? 'w-10 h-10 text-xs' : 'w-14 h-14 text-sm';
  const labelSize = compact ? 'text-xs' : 'text-sm';

  // Map hazard positions
  const hazardPositions: Record<string, number> = {};
  hazards.forEach((h) => {
    const key = `${h.severity}-${h.likelihood}`;
    hazardPositions[key] = (hazardPositions[key] || 0) + 1;
  });

  return (
    <div className="inline-block">
      {/* Y-axis label */}
      <div className="flex items-start gap-2">
        {!compact && (
          <div className="flex items-center justify-center w-5" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '280px' }}>
            <span className="text-xs font-medium text-gray-600 tracking-wider uppercase">Severity</span>
          </div>
        )}

        <div>
          {/* Matrix grid */}
          <div className="flex flex-col-reverse">
            {[1, 2, 3, 4, 5].map((severity) => (
              <div key={severity} className="flex items-center">
                {/* Row label */}
                <div className={`${compact ? 'w-6' : 'w-8'} text-center ${labelSize} font-medium text-gray-500 flex-shrink-0`}>
                  S{severity}
                </div>
                {[1, 2, 3, 4, 5].map((likelihood) => {
                  const riskLevel = getRiskLevel(severity, likelihood);
                  const score = severity * likelihood;
                  const count = hazardPositions[`${severity}-${likelihood}`] || 0;
                  const colors = RISK_CELL_COLORS[riskLevel];

                  return (
                    <div
                      key={likelihood}
                      className={`${cellSize} ${colors} border border-white flex flex-col items-center justify-center font-bold relative cursor-default transition-transform hover:scale-105 hover:z-10 hover:shadow-md`}
                      title={`S${severity} × L${likelihood} = ${score} (${riskLevel})`}
                    >
                      <span>{score}</span>
                      {count > 0 && (
                        <div
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
                          style={{ backgroundColor: RISK_COLORS[riskLevel as keyof typeof RISK_COLORS], fontSize: '9px' }}
                        >
                          {count}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div className="flex mt-1 ml-6">
            {!compact && <div className="w-2" />}
            {[1, 2, 3, 4, 5].map((l) => (
              <div
                key={l}
                className={`${compact ? 'w-10' : 'w-14'} text-center ${labelSize} font-medium text-gray-500`}
              >
                L{l}
              </div>
            ))}
          </div>

          {!compact && (
            <div className={`text-center text-xs font-medium text-gray-600 mt-1 tracking-wider uppercase`}
              style={{ marginLeft: '2rem' }}>
              Likelihood
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className={`flex gap-3 mt-3 flex-wrap ${compact ? 'justify-center' : ''}`}>
        {(['Low', 'Medium', 'High', 'Extreme'] as const).map((level) => (
          <div key={level} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${RISK_CELL_COLORS[level].split(' ')[0]}`} />
            <span className="text-xs text-gray-600">
              {level}
              {!compact && `: ${level === 'Low' ? '1-5' : level === 'Medium' ? '6-10' : level === 'High' ? '11-15' : '16-25'}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RULES = [
  'The House may move twice in a single turn.',
  'The House may promote any pawn to a Queen, anywhere.',
  'The House may relocate any piece to any square.',
  'The House may return its captured pieces to the board.',
  'The House king is not subject to checkmate.',
  'The House may correct your previous move.',
];

export default function HouseRules() {
  return (
    <div className="panel">
      <div className="panel-title border-b border-line px-3 py-2">House rules</div>
      <ul className="space-y-1.5 px-3 py-3 text-xs text-dim">
        {RULES.map((rule) => (
          <li key={rule} className="flex gap-2">
            <span className="text-gold">§</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

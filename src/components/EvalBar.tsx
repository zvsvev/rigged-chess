export default function EvalBar() {
  return (
    <div className="flex w-3 shrink-0 flex-col items-center gap-1 self-stretch" title="House advantage: infinite">
      <div className="relative w-3 flex-1 overflow-hidden rounded-sm border border-line bg-[#e8e3da]">
        <div className="eval-fill absolute inset-x-0 top-0 bg-[#3a3630]" style={{ height: '94%' }} />
        <div className="eval-fill absolute inset-x-0 bottom-0 bg-[#e8e3da]" style={{ height: '6%' }} />
      </div>
      <span className="eval-label text-[9px] font-bold tracking-widest text-gold">HOUSE</span>
    </div>
  );
}

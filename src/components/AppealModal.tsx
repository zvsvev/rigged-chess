import { useState } from 'react';

interface Props {
  verdict: string;
  onClose: () => void;
  onAppeal: () => void;
}

export default function AppealModal({ verdict, onClose, onAppeal }: Props) {
  const [text, setText] = useState('');

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="panel w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">House Department of Appeals</div>
        <h2 className="mt-1 text-lg font-bold">File an appeal</h2>
        <p className="mt-1 text-sm text-dim">
          Describe the incident in detail. Be specific. It will not change the outcome.
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="On turn 4 the House moved two pieces and promoted a pawn in the middle of the board…"
          className="mt-3 w-full resize-none rounded border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {verdict ? (
          <p className="mt-3 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {verdict}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-gold" onClick={onAppeal}>
            Submit appeal
          </button>
        </div>
      </div>
    </div>
  );
}

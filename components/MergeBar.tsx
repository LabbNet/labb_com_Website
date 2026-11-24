"use client";
import { useEffect, useState } from "react";

type Pick = { id: string; name: string; created: number };

// Merge bar for the Leads list: check two or more leads, choose the one to keep, merge now.
export function MergeBar() {
  const [picked, setPicked] = useState<Pick[]>([]);
  const [keep, setKeep] = useState("");
  useEffect(() => {
    const form = document.getElementById("merge-form") as HTMLFormElement | null;
    if (!form) return;
    const read = () => {
      const boxes = [...form.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked')];
      const list = boxes.map((b) => ({ id: b.value, name: b.dataset.name || `#${b.value}`, created: Number(b.dataset.created) || 0 })).sort((a, b) => a.created - b.created);
      setPicked(list);
      setKeep((k) => (list.some((x) => x.id === k) ? k : list[0]?.id || ""));
    };
    form.addEventListener("change", read);
    read();
    return () => form.removeEventListener("change", read);
  }, []);
  const clear = () => {
    document.querySelectorAll<HTMLInputElement>('#merge-form input[name="ids"]:checked').forEach((b) => { b.checked = false; });
    setPicked([]);
    setKeep("");
  };
  if (!picked.length) return <p className="mg-hint fine">Check two or more leads to merge them into one record.</p>;
  return (
    <div className="mg-bar" role="region" aria-label="Merge leads">
      <strong>{picked.length} selected</strong>
      {picked.length < 2 ? <span className="fine">Check at least one more lead to merge.</span> : (
        <>
          <label htmlFor="mg-keep">Keep</label>
          <select id="mg-keep" name="keep" value={keep} onChange={(e) => setKeep(e.target.value)}>
            {picked.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" type="submit"
            onClick={(e) => { if (!confirm(`Merge ${picked.length} leads into one record? The other ${picked.length - 1} will be removed and their history moved to the one you keep.`)) e.preventDefault(); }}>
            Merge now
          </button>
        </>
      )}
      <button type="button" className="linkish" onClick={clear}>Clear</button>
    </div>
  );
}

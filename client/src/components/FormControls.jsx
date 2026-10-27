export function Field({ label, id, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-mono text-xs font-bold tracking-widest uppercase">{label}</label>
      <input id={id} name={id} required {...props} className="h-12 w-full border border-line bg-transparent px-3 text-sm focus:border-slate-500 hover:border-slate-400 placeholder:text-neutral-500 disabled:opacity-60" />
    </div>
  )
}

export function SubmitButton({ busy, children }) {
  return <button type="submit" disabled={busy} className="h-12 w-full border-r-4 border-acid bg-black px-4 text-sm font-bold tracking-wider text-paper uppercase transition-colors hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60">{children}</button>
}

export function ErrorNotice({ message }) {
  return message ? <p role="alert" className="border-l-2 border-red-700 bg-red-50 p-3 text-sm text-red-800">{message}</p> : null
}

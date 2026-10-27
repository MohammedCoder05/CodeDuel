export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-black px-6 py-8 text-paper sm:min-h-[254px]">
        <div className="mb-7 h-3 w-3 bg-acid" aria-hidden="true" />
        <div className="text-[58px] leading-[0.79] font-black tracking-[-6px]">CODE<br />DUEL</div>
        <p className="mt-6 text-sm text-stone-300">One problem. One opponent. Ten minutes.</p>
      </header>
      <main className="mx-auto flex min-h-[calc(100svh-254px)] max-w-[558px] items-center px-6 py-14 sm:py-16">
        <div className="w-full">{children}</div>
      </main>
    </div>
  )
}

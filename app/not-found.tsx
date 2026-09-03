import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950 px-6 py-16 text-zinc-50">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

      <section className="relative w-full max-w-xl text-center">
        <p className="mb-6 font-mono text-sm uppercase tracking-[0.35em] text-amber-300">
          Error 404
        </p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          This page took a wrong turn.
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-7 text-zinc-400 sm:text-lg">
          The address you entered does not lead anywhere here. Let&apos;s get you
          back to the beginning.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-amber-300 px-6 text-sm font-semibold text-zinc-950 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
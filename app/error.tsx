"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">{error.message}</p>
      <button className="mt-4 rounded-md bg-bayou-600 px-4 py-2 text-sm font-semibold text-white" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

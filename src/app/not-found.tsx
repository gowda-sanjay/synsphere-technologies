import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">404</p>
      <h1 className="font-display text-4xl font-bold text-slate-900 sm:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-base text-slate-600">
        The page you were looking for does not exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Back to home
      </Link>
    </div>
  );
}

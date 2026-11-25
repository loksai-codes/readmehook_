import { RepoUrlForm } from '@/components/ui/RepoUrlForm';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center px-6 py-16">
      <p className="mb-4 font-mono text-xs tracking-widest text-emerald-400 uppercase">ReadmeHook</p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
        Would a developer clone your repo in 5 seconds?
      </h1>
      <p className="mt-4 text-lg text-zinc-400">
        Paste a public GitHub repo. Get a shareable landing card, and a live A/B test of which hero makes visitors
        copy the clone command.
      </p>
      <div className="mt-10">
        <RepoUrlForm />
      </div>
    </main>
  );
}

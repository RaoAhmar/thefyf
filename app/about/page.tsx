import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">About Find your Fit</h1>
      <p className="mt-3 opacity-80">
        We connect students and professionals with mentors who’ve done the thing
        you’re trying to do—so you can move faster with fewer mistakes.
      </p>

      <section className="mt-8 grid gap-6">
        <div className="rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 opacity-85">
            <li>Search mentors by skill, industry, school, or role.</li>
            <li>Open a mentor’s profile to view their focus areas and rate.</li>
            <li>Request a session—mentors accept or decline directly.</li>
          </ul>
        </div>

        <div className="rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">Become a mentor</h2>
          <p className="mt-2 opacity-80">
            Share your experience and help others avoid common pitfalls.
          </p>
          <Link href="/apply" className="mt-3 inline-block rounded-full border px-4 py-2 hover:shadow">
            Apply to become a mentor
          </Link>
        </div>

        <div className="rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 opacity-80">
            Questions or feedback? Email{" "}
            <a className="underline" href="mailto:thefindyourfit@gmail.com">
              thefindyourfit@gmail.com
            </a>.
          </p>
        </div>
      </section>
    </main>
  );
}

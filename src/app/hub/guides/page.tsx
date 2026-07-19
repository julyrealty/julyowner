"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, ArrowRight } from "lucide-react";
import { guideBySlug, guidesFor } from "@/lib/demo";
import { useHub } from "@/lib/store";
import { Card, SectionLabel } from "@/components/ui";

export default function GuidesPage() {
  const params = useSearchParams();
  const { hub } = useHub();
  const q = params.get("demo") === "1" ? "?demo=1" : "";
  const slug = params.get("a");
  const guide = slug ? guideBySlug(slug) : undefined;
  // Buyers see buying guides first; owners see ownership guides first.
  const ordered = guidesFor(hub?.journey);
  const isBuyer = hub?.journey === "buying";
  const href = (s: string) => `/hub/guides${q ? `${q}&` : "?"}a=${s}`;

  /* ------------------------------ one guide ------------------------------ */
  if (guide) {
    const others = ordered.filter((a) => a.slug !== guide.slug).slice(0, 3);
    return (
      <div className="container-x py-8">
        <Link href={`/hub/guides${q}`} className="link inline-flex items-center gap-1 text-sm">
          <ChevronLeft size={15} /> All guides
        </Link>

        <article className="mx-auto mt-4 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-wide text-teal">{guide.tag}</p>
          <h1 className="mt-1.5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
            <Clock size={14} /> {guide.minutes} min read
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-gray-600">{guide.excerpt}</p>

          <div className="mt-8 space-y-8">
            {guide.body.map((b) => (
              <section key={b.h}>
                <h2 className="text-lg font-extrabold tracking-tight">{b.h}</h2>
                {b.p?.map((para, i) => (
                  <p key={i} className="mt-2 text-[15px] leading-relaxed text-gray-600">{para}</p>
                ))}
                {b.ul && (
                  <ul className="mt-3 space-y-2">
                    {b.ul.map((li, i) => (
                      <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-gray-600">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <Card className="mt-10 p-5">
            <p className="text-sm font-extrabold">Questions about your own home?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
              General guidance only — your advisor can tell you how any of this applies to your address,
              your neighbourhood, and your timeline.
            </p>
            <Link href={`/hub/messages${q}`} className="btn btn-primary btn-sm mt-3">
              Ask your advisor <ArrowRight size={14} />
            </Link>
          </Card>

          <section className="mt-10">
            <SectionLabel>Keep reading</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              {others.map((a) => (
                <Link key={a.slug} href={href(a.slug)} className="card p-4 transition hover:border-teal">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-teal">{a.tag}</p>
                  <p className="mt-1.5 text-sm font-bold leading-snug">{a.title}</p>
                  <p className="mt-2 text-[11px] font-semibold text-gray-400">{a.minutes} min read</p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </div>
    );
  }

  /* ------------------------------ the library ------------------------------ */
  return (
    <div className="container-x py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Guides</h1>
      <p className="mt-1 text-sm text-gray-500">
        {isBuyer ? "Everything worth knowing before you buy — financing, closing costs, and the programmes people miss." : "Plain-English answers to the questions that come with owning a home — written for this market."}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((a) => (
          <Link key={a.slug} href={href(a.slug)} className="card flex flex-col p-5 transition hover:border-teal">
            <p className="text-[11px] font-bold uppercase tracking-wide text-teal">{a.tag}</p>
            <p className="mt-1.5 text-[15px] font-bold leading-snug">{a.title}</p>
            <p className="mt-1.5 flex-1 text-xs leading-relaxed text-gray-500">{a.excerpt}</p>
            <p className="mt-3 text-[11px] font-semibold text-gray-400">{a.minutes} min read</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

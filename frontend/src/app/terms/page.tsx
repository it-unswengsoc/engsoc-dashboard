import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Terms of Service — EngSoc Dashboard',
};

function TitleBlockCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-gray-100 px-4 py-3 last:border-r-0">
      <span className="block font-mono text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="font-mono text-sm text-gray-900">{value}</span>
    </div>
  );
}

function Clause({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[36px_1fr] gap-x-5 gap-y-1 border-t border-gray-100 py-7 first:border-t-0 first:pt-0 sm:grid-cols-[44px_1fr]">
      <span className="pt-0.5 font-mono text-sm font-bold text-[#3D6C94]">{num}</span>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="col-span-2 max-w-[62ch] text-[15px] leading-relaxed text-gray-600 sm:col-span-1 sm:col-start-2">
        {children}
      </div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-[760px]">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image src="/engsoc-logo.png" alt="" width={36} height={36} className="shrink-0 rounded-md" />
          <div className="text-xs font-bold uppercase leading-tight tracking-wide">
            <div className="text-[#AD1C2B]">UNSW</div>
            <div className="text-[#01183A]">Engineering Society</div>
          </div>
        </Link>

        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-6">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-gray-400">
              UNSW Engineering Society — EngSoc Dashboard
            </span>
            <h1 className="mt-2 text-3xl font-bold text-[#01183A] sm:text-4xl">Terms of Service</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <TitleBlockCell label="Document" value="TOS-2026-01" />
            <TitleBlockCell label="Revision" value="1.0" />
            <TitleBlockCell label="Effective" value="29 Sep 2026" />
            <TitleBlockCell label="Scope" value="unswengsoc.com" />
          </div>
        </div>

        <div className="mt-8 flex gap-3 rounded-lg border border-gray-100 bg-[#B1C9DC]/10 px-4 py-4">
          <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-wide text-[#3D6C94]">TL;DR</span>
          <p className="text-sm text-gray-600">
            The Dashboard is run by and for UNSW Engineering Society members, best-effort and free of charge. Use
            it for Society business, keep your account to yourself, and it keeps working for everyone.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white px-6">
          <Clause num="01" title="Acceptance">
            <p>
              By signing in to the EngSoc Dashboard you agree to these terms. If you don&rsquo;t agree to them,
              don&rsquo;t sign in — there&rsquo;s no other way to use the platform.
            </p>
          </Clause>

          <Clause num="02" title="Who can use it">
            <p>
              The Dashboard is for current UNSW Engineering Society members and volunteers with a valid{' '}
              <code className="rounded bg-[#B1C9DC]/20 px-1.5 py-0.5 font-mono text-[13px] text-[#3D6C94]">
                @unswengsoc.com
              </code>{' '}
              Google Workspace account. Access follows Society membership — it isn&rsquo;t granted or sold
              independently of it, and is revoked when that membership ends.
            </p>
          </Clause>

          <Clause num="03" title="Acceptable use">
            <p>
              Use the Dashboard for genuine Society business — coordinating tasks, posting announcements, managing
              events and documents. In particular, don&rsquo;t:
            </p>
            <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-[#3D6C94]">
              <li>Post content that&rsquo;s offensive, harassing, or unrelated to Society business in announcements or comments;</li>
              <li>Attempt to access another member&rsquo;s account, or data you haven&rsquo;t been given access to;</li>
              <li>Use the platform, or data read from it, for anything outside Society operations.</li>
            </ul>
          </Clause>

          <Clause num="04" title="Your account">
            <p>
              You&rsquo;re responsible for activity under your own sign-in. Director, executive and admin accounts
              carry extra reach — posting official announcements, assigning tasks, managing members — and are
              expected to use it in line with the Society&rsquo;s own governance, not just these terms.
            </p>
          </Clause>

          <Clause num="05" title="Content you post">
            <p>
              Announcements, comments and tasks you create stay attributed to you. The Society may remove content
              that breaches acceptable use, and an admin or the original author can edit or delete a post through
              the platform itself.
            </p>
          </Clause>

          <Clause num="06" title="No warranty">
            <p>
              The Dashboard is built and maintained by student volunteers and provided{' '}
              <strong className="text-gray-900">as is</strong>, best-effort. There&rsquo;s no guaranteed uptime,
              and features may change or be unavailable while the platform is developed further. It isn&rsquo;t a
              substitute for the Society&rsquo;s official records where those are required to live elsewhere.
            </p>
            <div className="mt-3 flex gap-2.5 rounded-lg bg-[#F1C4C9]/30 px-3.5 py-3 text-sm text-gray-600">
              <span className="whitespace-nowrap pt-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8B2E38]">
                Note
              </span>
              <span>
                Calendar and Drive features depend on Google&rsquo;s own services being reachable — an outage on
                their end can affect those features here too.
              </span>
            </div>
          </Clause>

          <Clause num="07" title="Changes & termination">
            <p>
              These terms may be updated as the Dashboard evolves — the effective date above reflects the latest
              revision. Access can be suspended or revoked for a breach of these terms, or simply when your
              Society membership ends.
            </p>
          </Clause>

          <Clause num="08" title="Questions">
            <p>
              Reach the team behind the Dashboard at{' '}
              <a href="mailto:general.it@unswengsoc.com" className="font-bold text-[#3D6C94] hover:underline">
                general.it@unswengsoc.com
              </a>
              .
            </p>
          </Clause>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
          <span className="font-mono text-[11px] text-gray-400">UNSW ENGINEERING SOCIETY</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="font-mono text-[11px] text-gray-400 hover:text-[#3D6C94]">
              Privacy Policy
            </Link>
            <span className="font-mono text-[11px] text-gray-400">TOS-2026-01 · REV 1.0</span>
          </div>
        </div>
      </div>
    </main>
  );
}

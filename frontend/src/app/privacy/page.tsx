import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Privacy Policy — EngSoc Dashboard',
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

export default function PrivacyPolicyPage() {
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
            <h1 className="mt-2 text-3xl font-bold text-[#01183A] sm:text-4xl">Privacy Policy</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <TitleBlockCell label="Document" value="PP-2026-01" />
            <TitleBlockCell label="Revision" value="1.0" />
            <TitleBlockCell label="Effective" value="29 Sep 2026" />
            <TitleBlockCell label="Scope" value="unswengsoc.com" />
          </div>
        </div>

        <div className="mt-8 flex gap-3 rounded-lg border border-gray-100 bg-[#B1C9DC]/10 px-4 py-4">
          <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-wide text-[#3D6C94]">TL;DR</span>
          <p className="text-sm text-gray-600">
            The Dashboard is an internal tool for UNSW Engineering Society members. It reads your Google account
            profile and, where a feature needs it, your Calendar and Drive — never for advertising, never sold,
            never shared outside running the Society.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white px-6">
          <Clause num="01" title="Who this covers">
            <p>
              This policy covers the <strong className="text-gray-900">EngSoc Dashboard</strong>, the internal
              platform UNSW Engineering Society uses for tasks, announcements, events, documents and member
              notifications. Access is restricted to holders of a{' '}
              <code className="rounded bg-[#B1C9DC]/20 px-1.5 py-0.5 font-mono text-[13px] text-[#3D6C94]">
                @unswengsoc.com
              </code>{' '}
              Google Workspace account — sign-in is Google&rsquo;s own, gated to that domain, and the Dashboard
              never sees or stores your password.
            </p>
          </Clause>

          <Clause num="02" title="What we collect">
            <p>
              Signing in with Google shares your name, @unswengsoc.com email address and profile photo. Beyond
              that, only the specific Google data a feature you actually use needs:
            </p>
            <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-[#3D6C94]">
              <li>
                <strong className="text-gray-900">Calendar</strong> — read your events to show them on the
                Dashboard&rsquo;s calendar; write access is used only when you create or edit an event through the
                Dashboard itself.
              </li>
              <li>
                <strong className="text-gray-900">Drive</strong> — read and write access to the Society&rsquo;s
                Shared Drives, used for the Documents page and for files you attach to a task.
              </li>
            </ul>
            <p>
              The Dashboard also stores what you do inside it directly: tasks and their status, announcements and
              comments, event RSVPs, and the notifications those generate.
            </p>
            <div className="mt-3 flex gap-2.5 rounded-lg bg-[#F1C4C9]/30 px-3.5 py-3 text-sm text-gray-600">
              <span className="whitespace-nowrap pt-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8B2E38]">
                Scope
              </span>
              <span>
                Calendar and Drive access is read/write on the scopes the feature needs — never your Gmail, never
                files outside the Society&rsquo;s own Shared Drives.
              </span>
            </div>
          </Clause>

          <Clause num="03" title="How it's used">
            <p>
              Solely to run the features you&rsquo;re using: showing your tasks and calendar, posting and notifying
              on announcements, tracking event RSVPs, and — where a notification is generated — sending you an
              email about it. Nothing here is used to profile members, build advertising audiences, or for any
              purpose outside operating the Dashboard for the Society.
            </p>
          </Clause>

          <Clause num="04" title="Where it's stored">
            <p>
              Application data lives in a Postgres database on Amazon RDS (ap-southeast-2). Notification emails
              are sent through Amazon SES. Google Calendar and Drive data is read live from Google&rsquo;s own
              APIs, not duplicated into our database beyond what a feature needs to display. No data is sold,
              rented, or shared with any third party beyond the infrastructure providers above, who process it
              solely to keep the Dashboard running.
            </p>
          </Clause>

          <Clause num="05" title="Who can see it">
            <p>
              Your data is visible to other Society members only where a feature is inherently shared — an
              announcement you post, a task assigned to a port, your RSVP on an event. Director, executive and
              admin accounts have the additional access their role requires to run the Society (posting official
              announcements, managing members and tasks). Nobody outside @unswengsoc.com can sign in at all.
            </p>
          </Clause>

          <Clause num="06" title="Retention & deletion">
            <p>
              Your data is kept for as long as your account is active. When you leave the Society or want your
              data removed sooner, contact IT below and it will be deleted from our database; Google access can be
              revoked independently at any time from your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#3D6C94] hover:underline"
              >
                Google Account&rsquo;s third-party access settings
              </a>
              .
            </p>
          </Clause>

          <Clause num="07" title="Questions">
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
            <Link href="/terms" className="font-mono text-[11px] text-gray-400 hover:text-[#3D6C94]">
              Terms of Service
            </Link>
            <span className="font-mono text-[11px] text-gray-400">PP-2026-01 · REV 1.0</span>
          </div>
        </div>
      </div>
    </main>
  );
}

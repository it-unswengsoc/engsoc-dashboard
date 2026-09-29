import { Pool } from 'pg';

/* The one shared Postgres connection pool for the whole backend — every
   database/*.ts and functions/*.ts file that talks to Postgres imports this
   instead of constructing its own `new Pool(...)`. Each pool defaults to up
   to 10 open connections; with a dozen separate files each instantiating
   their own, a single warm serverless instance could open 100+ connections
   on its own, and RDS's connection limit gets exhausted fast under any real
   concurrency — a major, compounding cause of slow/hanging requests as this
   backend grew. One shared pool means one bounded set of connections,
   reused across every query regardless of which file it's called from. */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Serverless still means multiple concurrent function instances can each
  // be running their own copy of this module (and thus their own pool) —
  // consolidating to one pool per file eliminated the 12x multiplier, but
  // keeping each instance's own pool small is extra insurance against
  // exhausting RDS's connection limit under real concurrency.
  max: 5,
  // RDS rejects plaintext connections outright ("no pg_hba.conf entry ...
  // no encryption") — confirmed by connecting directly and reproducing the
  // rejection, then resolving it with this exact option. rejectUnauthorized:
  // false still encrypts the connection; it just skips validating RDS's
  // certificate against a trusted CA, avoiding needing to bundle AWS's own
  // RDS CA certificate. Skipped locally (VERCEL unset) since a local
  // Postgres for dev typically doesn't support SSL at all.
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

export default pool;

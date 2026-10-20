import Link from "next/link";

// Line icons for the persona, "who / what / why" and research bands. 24px grid, stroke only.
const PATHS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  alert: <><path d="M12 3 2 21h20L12 3z" /><path d="M12 10v5M12 18h.01" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  reviews: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /></>,
  build: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 13l-2 2 2 2M15 13l2 2-2 2" /></>,
  coins: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>,
  repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
  receipt: <><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></>,
};
export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

// Who it's for, what breaks, why it matters: the three questions a reader asks first.
export function WhoWhatWhy({ who, what, why }: { who: React.ReactNode; what: React.ReactNode; why: React.ReactNode }) {
  const cells: [IconName, string, React.ReactNode][] = [["user", "Who it's for", who], ["alert", "The problem", what], ["target", "Why it matters", why]];
  return (
    <ul className="www" aria-label="Who it's for, the problem, and why it matters">
      {cells.map(([icon, label, body]) => (
        <li key={label}><span className="www-ic"><Icon name={icon} /></span><span className="bm-label">{label}</span><p>{body}</p></li>
      ))}
    </ul>
  );
}

export type Stat = { icon: IconName; value: string; label: string };

// The research, as numbers with icons rather than paragraphs.
export function StatBand({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <ul className="stat-band" aria-label={label}>
      {stats.map((s) => (
        <li key={s.label}><span className="www-ic"><Icon name={s.icon} /></span><b>{s.value}</b><span>{s.label}</span></li>
      ))}
    </ul>
  );
}

export type PersonaProps = {
  tone: "rr" | "sk";
  icon: IconName;
  name: string;
  line: string;
  facts: Stat[];
  why: React.ReactNode;
  evidence?: string;
};

// A persona card for the top of a prototype page: who they are, two facts, and why it matters.
export function Persona({ tone, icon, name, line, facts, why, evidence }: PersonaProps) {
  return (
    <div className={`persona is-${tone}`}>
      <div className="persona-who">
        <span className="persona-av"><Icon name={icon} /></span>
        <div>
          <span className="bm-label">Who it&apos;s for</span>
          <p className="persona-name">{name}</p>
          <p className="persona-line">{line}</p>
        </div>
      </div>
      <ul className="persona-facts">
        {facts.map((f) => (
          <li key={f.label}><Icon name={f.icon} /><b>{f.value}</b><span>{f.label}</span></li>
        ))}
      </ul>
      <p className="persona-why"><Icon name="target" /><span><b>Why it matters.</b> {why}</span></p>
      {evidence && <p className="persona-ev">{evidence}</p>}
    </div>
  );
}

// The same persona, as a link card on the overview that leads into its prototype.
export function PersonaLink({ href, tone, icon, name, line, pain, proto, protoLine, ev }: {
  href: string; tone: "rr" | "sk"; icon: IconName; name: string; line: string; pain: Stat; proto: string; protoLine: string; ev: { cls: string; text: string };
}) {
  return (
    <Link className={`ov-persona is-${tone}`} href={href}>
      <span className="persona-av"><Icon name={icon} /></span>
      <span className="ov-pname">{name}</span>
      <span className="ov-pline">{line}</span>
      <span className="ov-pain"><Icon name={pain.icon} /><b>{pain.value}</b><span>{pain.label}</span></span>
      <span className="ov-pfix"><span className="bm-label">What I&apos;d build</span><strong>{proto}</strong><span>{protoLine}</span></span>
      <span className={`ov-ev ${ev.cls}`}>{ev.text}</span>
      <span className="ov-go" aria-hidden="true">→</span>
    </Link>
  );
}

import { AccountPageHeader } from "@/components/account-page-header";

const PURPOSE_ITEMS = [
  "Youth ideation and creative projects",
  "Training and mentorship activities",
  "Community events and social innovation initiatives",
  "Coffee culture and community engagement activities",
];

const IMPACT_ITEMS = [
  "Youth skills development and mentorship",
  "Inclusive training opportunities for marginalized groups",
  "Community engagement through learning and creativity",
  "Promotion of responsible and sustainable coffee culture",
];

const PARTNERSHIP_ITEMS = [
  "Skills development and training initiatives",
  "Community events and public engagement",
  "Social impact storytelling and communication campaigns",
  "Responsible product or program collaborations aligned with shared values",
];

const MEDIA_ITEMS = [
  "Developing the Club 54 brand identity and narrative",
  "Highlighting the social impact and youth empowerment story",
  "Supporting co-branded campaigns and public engagement activities",
  "Producing communication materials for partners and public outreach",
];

function SectionCard({
  kicker,
  title,
  body,
  items,
}: {
  kicker: string;
  title: string;
  body?: string;
  items?: string[];
}) {
  return (
    <section className="brand-card rounded-[2rem] p-6 sm:p-8">
      <p className="brand-kicker">{kicker}</p>
      <h2 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)] sm:text-3xl">
        {title}
      </h2>
      {body && (
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
      )}
      {items && items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="brand-page max-w-3xl">
      <AccountPageHeader
        title="About Club 54"
        subtitle="A social innovation café and collaborative space empowering children and youth through creativity, skills development, and community engagement."
      />

      <div className="mt-6 space-y-5">
        {/* Origin & name */}
        <section className="brand-card relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          />
          <div className="relative">
            <p className="brand-kicker">Our Name</p>
            <h2 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)] sm:text-3xl">
              Inspired by Article 54
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              The name <span className="font-bold text-[var(--text)]">Club 54</span> is inspired by{" "}
              <span className="font-bold text-[var(--text)]">Article 54 of the UN Convention on the Rights of the Child (CRC)</span>,
              which highlights the responsibility of society to ensure children have access to information,
              opportunity, and support for their development.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              Club 54 combines a community café, collaborative workspace, and youth learning environment
              to create a safe and inspiring place where young people can develop ideas, learn practical
              skills, and connect with mentors and partners.
            </p>
          </div>
        </section>

        {/* Purpose */}
        <SectionCard
          kicker="Purpose"
          title="What We Do"
          body="Club 54 aims to create an inclusive ecosystem where youth, professionals, and community partners collaborate while supporting youth development through real-world learning opportunities. The space will host:"
          items={PURPOSE_ITEMS}
        />

        {/* Social Impact Vision */}
        <SectionCard
          kicker="Social Impact"
          title="Our Vision"
          body="Club 54 is designed as a social enterprise model, where revenue-generating activities support youth empowerment initiatives. Key focus areas include:"
          items={IMPACT_ITEMS}
        />

        {/* Partnership */}
        <SectionCard
          kicker="Collaboration"
          title="Partnership Opportunities"
          body="Club 54 seeks to collaborate with partners who share values related to youth empowerment, sustainability, and community development. Potential collaboration areas may include:"
          items={PARTNERSHIP_ITEMS}
        />

        {/* Media */}
        <SectionCard
          kicker="Media & Communication"
          title="Communication Collaboration"
          body="The communication and media team will support:"
          items={MEDIA_ITEMS}
        />

        {/* Footer note */}
        <p className="px-1 text-xs leading-relaxed text-[var(--text-muted)]">
          The Club 54 concept, framework, and program design are developed and owned by the Club 54 founding team.
          Further operational details will be shared in subsequent collaboration stages as the project develops.
        </p>
      </div>
    </div>
  );
}

import { licences } from "@/content/site";
import { Icon } from "@/components/ui/Icon";
import { LicenceStage } from "./LicenceStage";
import { StampIn } from "./StampIn";
import { VerifyTab } from "./VerifyTab";

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/** "Jul 2025" -> "2025-07" for <time dateTime>. */
function isoMonth(issued: string): string | undefined {
  const [m, y] = issued.split(" ");
  return MONTHS[m] && y ? `${y}-${MONTHS[m]}` : undefined;
}

/**
 * Licences (night). A pinned arc of licence cards drawn at runtime (decorative, aria-hidden),
 * followed by the real list: every certification with issuer, date and a Verify link where the
 * issuer publishes one. The list is server-rendered and is what crawlers and screen readers get.
 */
export function Licences() {
  return (
    <section id="licences" aria-labelledby="licences-title" data-waypoint="licences" className="relative overflow-x-clip bg-night text-paper">
      {/* title and deck are centred on the arc's axis; LicenceStage adds the tick scale under them */}
      <LicenceStage>
        <h2 id="licences-title" className="t-heading text-paper">
          Licences
        </h2>
        <p className="mt-4 max-w-[34ch] text-balance text-[clamp(1.125rem,1.6vw,1.375rem)] leading-snug text-paper/80 lg:max-w-none">
          Four certifications and four courses, from Java to generative AI on Oracle Cloud.
        </p>
      </LicenceStage>

      <div className="mx-auto max-w-[var(--container-route)] px-[var(--gutter)] pb-[var(--section-y)] pt-[clamp(3rem,8vw,6rem)]">
        <StampIn className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          <p className="max-w-[30ch] text-[1.0625rem] leading-relaxed text-paper/75 lg:col-span-3">
            Every licence, with a link to the issuer&rsquo;s record wherever one is public.
          </p>
          <ol className="mt-8 list-none border-t border-night-line p-0 lg:col-span-9 lg:mt-0">
            {licences.map((l) => (
              <li
                key={l.name}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-b border-night-line py-5 md:grid-cols-[7rem_minmax(0,1fr)_auto]"
              >
                <time dateTime={isoMonth(l.issued)} className="t-map hidden text-paper/60 md:block">
                  {l.issued}
                </time>
                <div className="min-w-0">
                  <p className="text-[1.0625rem] font-semibold leading-snug text-paper">{l.name}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.9rem] text-paper/70">
                    {l.icon && <Icon name={l.icon} size={15} maxWidth={84} mono className="text-paper/80" />}
                    <span>{l.issuer}</span>
                    <time dateTime={isoMonth(l.issued)} className="t-map text-paper/55 md:hidden">
                      {l.issued}
                    </time>
                  </p>
                </div>
                {l.verify ? <VerifyTab href={l.verify} name={l.name} /> : <span aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </StampIn>
      </div>
    </section>
  );
}

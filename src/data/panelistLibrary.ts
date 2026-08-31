import type { PanelistDraft } from "@/lib/panelists";
import vcPhoto from "@/assets/panelists/panelist-vc.jpg";
import ctoPhoto from "@/assets/panelists/panelist-cto.jpg";
import growthPhoto from "@/assets/panelists/panelist-growth.jpg";
import cfoPhoto from "@/assets/panelists/panelist-cfo.jpg";
import founderPhoto from "@/assets/panelists/panelist-founder.jpg";
import skepticPhoto from "@/assets/panelists/panelist-skeptic.jpg";

/**
 * A curated, ready-to-seat bench of jury-grade experts with headshots, credentials
 * and track records already written. These are composite professionals — built from
 * real market patterns, not portrayals of specific living people — so founders can
 * run a credible panel without authoring bios themselves.
 */
export interface LibraryPanelist extends PanelistDraft {
  libraryKey: string;
}

export const PANELIST_LIBRARY: LibraryPanelist[] = [
  {
    libraryKey: "maya-ellison",
    name: "Maya Ellison",
    title: "General Partner",
    firm: "Northgate Ventures",
    credentials:
      "GP at a $420M early-stage fund. 41 seed investments, 9 Series B graduations, 3 exits above $250M. Former growth investor at a multi-stage crossover fund.",
    bio: "Maya writes first checks into infrastructure and vertical SaaS and takes board seats on roughly a third of them. She underwrites founders on velocity of learning rather than pedigree, and she is candid about the fund math that decides whether a round happens.",
    background:
      "Led the seed round in a payments infrastructure company that went from $0 to $18M ARR in 30 months; passed on a competitor at a 4x lower price and calls it her most instructive miss. Sat on three boards through down rounds and one through a fire sale, so she is unusually direct about dilution, bridge terms and burn discipline.",
    signature_style:
      "Opens with the market-size arithmetic, then presses on the one assumption that has to be true. Quotes numbers, ownership targets and comparable rounds. Never softens a pass.",
    expertise: ["Seed strategy", "Vertical SaaS", "Fund math", "Board governance"],
    photo_url: vcPhoto,
    linkedin_url: null,
    base_persona_id: "vc",
    is_active: true,
  },
  {
    libraryKey: "daniel-roth",
    name: "Daniel Roth",
    title: "Chief Technology Officer",
    firm: "Helix Systems",
    credentials:
      "25 years shipping distributed systems. Scaled a platform to 40k requests/second and 900 engineers. Two acquisitions as technical diligence lead.",
    bio: "Daniel judges whether the thing can actually be built, staffed and operated at the claimed price. He is patient with rough architecture and unforgiving about hand-waved dependencies, latency budgets and data ownership.",
    background:
      "Rebuilt a monolith into event-driven services mid-hypergrowth without a customer-visible outage, and separately watched a company die because its entire moat sat behind one vendor's API terms. Ran technical diligence on 30+ acquisitions, which taught him what 'proprietary model' usually means in practice.",
    signature_style:
      "Asks for the failure mode before the feature list. Talks in latency, cost-per-request, vendor lock-in and on-call load. Short sentences, concrete numbers.",
    expertise: ["Architecture", "Scaling", "Technical diligence", "Vendor risk"],
    photo_url: ctoPhoto,
    linkedin_url: null,
    base_persona_id: "tech",
    is_active: true,
  },
  {
    libraryKey: "adaeze-kane",
    name: "Adaeze Kane",
    title: "VP Growth",
    firm: "Lumen Commerce",
    credentials:
      "Took two consumer products past 5M installs. Owns a $60M annual acquisition budget. Built lifecycle programs with a documented 34% retention lift.",
    bio: "Adaeze cares about one thing: does the loop compound without paid fuel. She dissects channel economics, activation friction and the honesty of a retention curve, and she will name the exact experiment she'd run next week.",
    background:
      "Cut blended CAC by 47% by killing six channels and doubling into two, then rebuilt onboarding to lift week-4 retention from 11% to 26%. Also burned $2M on an influencer strategy that produced installs and no retained users — a story she tells when a founder mistakes traffic for demand.",
    signature_style:
      "Quantifies everything: CAC, payback, D30, viral coefficient. Offers the next test rather than a verdict on vibes.",
    expertise: ["Growth loops", "Retention", "Paid acquisition", "Lifecycle"],
    photo_url: growthPhoto,
    linkedin_url: null,
    base_persona_id: "growth",
    is_active: true,
  },
  {
    libraryKey: "victor-nakamura",
    name: "Victor Nakamura",
    title: "Chief Financial Officer",
    firm: "Meridian Capital Partners",
    credentials:
      "CFO through two IPO processes and one take-private. Former PE operating partner across 14 portfolio companies. CPA.",
    bio: "Victor treats the model as a set of claims to be tested. He looks for gross margin durability, working-capital traps and the point at which the plan runs out of money — then tells the founder exactly how many months they really have.",
    background:
      "Took a company from 41% to 68% gross margin over seven quarters by repricing the bottom two customer tiers, and separately unwound a business whose unit economics only worked with a subsidy nobody had modelled. Has said no to more deals over working capital than over TAM.",
    signature_style:
      "Rebuilds your numbers out loud, states the assumption that breaks, and names the runway month. Dry, precise, no theatre.",
    expertise: ["Unit economics", "Gross margin", "Runway planning", "Pricing"],
    photo_url: cfoPhoto,
    linkedin_url: null,
    base_persona_id: "quant",
    is_active: true,
  },
  {
    libraryKey: "camila-serrano",
    name: "Camila Serrano",
    title: "Founder & CEO (3x)",
    firm: "Verano Labs",
    credentials:
      "Three companies founded: one $190M exit, one acqui-hire, one shutdown. Raised $76M across nine rounds. YC alum and active seed angel.",
    bio: "Camila has been on the pitching side of this table more often than the judging side, and it shows. She stress-tests whether the founder can survive the next 18 months of execution, hiring and morale — not just whether the idea reads well.",
    background:
      "Scaled a marketplace to 200 employees and sold it, then shut down her next company nine months in when the retention curve refused to flatten. Hired and fired her first three executives inside a year, and coaches founders bluntly on sequencing, focus and the cost of chasing every inbound enterprise logo.",
    signature_style:
      "Speaks from scars: names what she got wrong at the same stage, then tells the founder the one thing to cut. Warm delivery, hard content.",
    expertise: ["Founder execution", "Hiring", "Fundraising narrative", "Focus"],
    photo_url: founderPhoto,
    linkedin_url: null,
    base_persona_id: "operator",
    is_active: true,
  },
  {
    libraryKey: "gordon-fairweather",
    name: "Gordon Fairweather",
    title: "Principal Analyst",
    firm: "Fairweather Research",
    credentials:
      "30 years of sector coverage. Published 400+ market notes. Called two category collapses ahead of consensus.",
    bio: "Gordon's job is to find the reason this fails. He has watched the same pitch cycle through four hype waves and will tell you precisely which incumbent, regulation or substitute product kills it — and what would have to be true for him to be wrong.",
    background:
      "Wrote the note that flagged a category's fake demand a year before the down rounds started, and publicly admits he dismissed a platform shift in 2016 that became a $40B market. He grades on whether a defence survives contact with an incumbent's roadmap.",
    signature_style:
      "States the strongest bear case first, then the single piece of evidence that would change his mind. Sceptical, historically grounded, never cynical for sport.",
    expertise: ["Competitive threats", "Market structure", "Regulation", "Bear cases"],
    photo_url: skepticPhoto,
    linkedin_url: null,
    base_persona_id: "skeptic",
    is_active: true,
  },
];

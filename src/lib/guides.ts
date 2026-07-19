/* Homeowner guides — the content behind every "Featured guides" card.
   Deliberately durable: no rates, no dollar thresholds that go stale, and no
   legal/tax rulings. Where a number or rule actually governs (permits, zoning,
   insurance limits), the guide sends the reader to the authority instead of
   guessing on their behalf. */

export type GuideBlock = { h: string; p?: string[]; ul?: string[] };
export type Article = {
  slug: string; title: string; excerpt: string; tag: string; minutes: number;
  body: GuideBlock[];
};

export const ARTICLES: Article[] = [
  {
    slug: "first-year",
    title: "Your First Year as a Homeowner: What to Do and When",
    tag: "Getting started",
    minutes: 6,
    excerpt: "A month-by-month checklist that keeps small tasks from becoming expensive surprises.",
    body: [
      {
        h: "The first week",
        p: ["Before the boxes are unpacked, do the three things that matter if something goes wrong at 2am."],
        ul: [
          "Find and label the main water shut-off, the electrical panel, and the gas shut-off. Show everyone who lives there.",
          "Change the locks, or at minimum re-key them. You have no idea how many copies exist.",
          "Test every smoke and carbon-monoxide alarm. Replace any older than ten years — the sensors expire even if the unit beeps.",
        ],
      },
      {
        h: "The first month",
        p: [
          "Now build the record you will rely on for years. Photograph the serial and model plates on the furnace, water heater, and panel, and file them in your hub. When something fails, that photo saves an hour on the phone.",
          "Read your home inspection again, cover to cover. On possession day it was a negotiating tool; now it is a to-do list with the urgent items already flagged.",
        ],
      },
      {
        h: "Months two and three",
        p: ["Start the habits that prevent the expensive failures."],
        ul: [
          "Set a furnace-filter reminder. Every two to three months for most homes, monthly if you have pets or allergies.",
          "Run a full walk of the exterior. You are looking for grading that slopes toward the house, gutters that overflow, and any wood touching soil.",
          "Meet one trade before you need them — an electrician or a plumber. Emergency calls to a stranger cost more and take longer.",
        ],
      },
      {
        h: "Before your first winter",
        p: [
          "On the coast, water is the enemy, and almost always it arrives through the roof, the gutters, or the grade. Clear the gutters after the leaves drop, not before. Check that downspouts discharge well away from the foundation. Have the heating system serviced while technicians still have open calendars.",
        ],
      },
      {
        h: "What to skip in year one",
        p: [
          "Resist the urge to renovate immediately. Live through four seasons first — you will learn where the light falls, which rooms run cold, and where you actually spend your time. The kitchen you would have designed in month two is rarely the one you want in month fourteen.",
        ],
      },
    ],
  },
  {
    slug: "hidden-costs",
    title: "Beyond the Mortgage: The Real Costs of Owning a Home",
    tag: "Finances",
    minutes: 5,
    excerpt: "Property tax, insurance, utilities, maintenance reserves — how to budget for all of it without stress.",
    body: [
      {
        h: "The mortgage is roughly two-thirds of it",
        p: [
          "Most owners budget the mortgage payment precisely and everything else vaguely. The rest is not noise — across a year it reliably adds up to a meaningful share of what the house costs you.",
        ],
      },
      {
        h: "The predictable ones",
        ul: [
          "Property tax — billed annually by your municipality. Check whether you qualify for the provincial home owner grant, and claim it every year; it is not automatic.",
          "Home insurance — annual or monthly. Rebuild cost, not market value, is what you are insuring.",
          "Utilities — hydro, gas, water and sewer, plus waste in most municipalities.",
          "Strata fees, if you own a condo or townhouse, plus any special levy the strata approves.",
        ],
      },
      {
        h: "The one everybody underestimates",
        p: [
          "Maintenance. A common planning rule is to set aside roughly one percent of your home's value each year — more for an older home, less for a newer one. Some years you spend nothing. Then the water heater goes, and you spend three years of the reserve in an afternoon.",
          "The point of the reserve is not precision. It is that the failure becomes an annoyance instead of a debt.",
        ],
      },
      {
        h: "How to make it painless",
        p: [
          "Open a separate savings account and automate a monthly transfer covering tax, insurance, and your maintenance reserve. Pay the annual bills out of that account when they arrive. You stop feeling the lumpy bills entirely, and you stop raiding your chequing account every July.",
        ],
      },
      {
        h: "The costs that only show up when you move",
        p: [
          "Selling has its own line items: commission, legal fees, possibly a mortgage penalty. Buying adds property transfer tax, legal fees, and moving costs. None of these are monthly, but they decide whether a move pencils out — so model them before you fall in love with a listing.",
        ],
      },
    ],
  },
  {
    slug: "handyman-vs-contractor",
    title: "Handyman or Contractor? Choosing the Right Pro for the Job",
    tag: "Home services",
    minutes: 4,
    excerpt: "When a $95 visit solves it, when you need permits, and how to compare quotes properly.",
    body: [
      {
        h: "The dividing line is permits and trades",
        p: [
          "A handyman is the right call for work that touches nothing structural, electrical, or mechanical — mounting, patching, caulking, door and hardware adjustments, small carpentry. A licensed contractor or trade is required the moment the job involves permits, gas, significant electrical or plumbing, or anything holding the building up.",
          "If you are unsure which side of the line you are on, phone your municipality's building department and describe the work. The call is free and takes minutes.",
        ],
      },
      {
        h: "Why the distinction protects you",
        p: [
          "Unpermitted work has a long memory. It surfaces during a buyer's inspection, in an insurance claim after a fire or flood, and again when you sell. Work that was cheaper on the day routinely costs far more to unwind years later — and can complicate a sale at exactly the wrong moment.",
        ],
      },
      {
        h: "Comparing quotes properly",
        p: ["Three quotes tell you nothing unless they describe the same job. Insist that each one spells out:"],
        ul: [
          "Scope — precisely what is included, and what is explicitly excluded.",
          "Materials — brand, model, and grade, not just \"new fixtures\".",
          "Who pulls the permit, and whether the fee is in the price.",
          "Timeline, payment schedule, and what triggers a change order.",
          "Proof of liability insurance and WorkSafeBC coverage.",
        ],
      },
      {
        h: "The quote that is far lowest is information",
        p: [
          "A bid well under the others usually means a different scope, cheaper materials, or no permit. Ask directly which one it is. Sometimes the answer is fine and they are simply hungry for the work. Often it is the first sign of a change order coming later.",
        ],
      },
      {
        h: "Keep the paper",
        p: [
          "File the invoice, the permit, and the warranty in your hub as soon as the job is done. At resale, a documented history of proper work is a genuine advantage — and it is nearly impossible to reconstruct years afterward.",
        ],
      },
    ],
  },
  {
    slug: "equity-explained",
    title: "Home Equity, Explained in Plain English",
    tag: "Finances",
    minutes: 5,
    excerpt: "What equity actually is, how it grows, and the smart (and not-so-smart) ways to use it.",
    body: [
      {
        h: "What it is",
        p: [
          "Equity is your home's current value minus everything you owe against it. If the home is worth a million and the mortgage balance is six hundred thousand, you have four hundred thousand in equity.",
          "It is real wealth, but it is illiquid. You cannot spend it without either borrowing against it or selling.",
        ],
      },
      {
        h: "It grows two ways at once",
        p: [
          "Every payment you make shifts a little more toward principal and a little less toward interest — that is the half you control. Meanwhile the market moves the value up or down, which you do not control at all.",
          "Early in an amortization, interest dominates and principal barely moves. That reverses over time, and the crossover is more satisfying than most people expect.",
        ],
      },
      {
        h: "How you can access it",
        ul: [
          "A home equity line of credit — flexible, interest-only minimums, variable rate. Best for staged spending like a renovation.",
          "Refinancing — replace the mortgage with a larger one and take the difference in cash. Watch for a penalty if you break mid-term.",
          "A second mortgage — higher rate, faster to arrange, generally a last resort.",
          "Selling — the only route that converts equity to cash without adding debt.",
        ],
        p: ["Lenders generally cap total borrowing at a percentage of the home's appraised value, so your accessible equity is always less than your total equity."],
      },
      {
        h: "Uses that tend to pay off",
        p: [
          "Borrowing against equity makes sense when it buys something that appreciates or earns: a renovation that adds more value than it costs, a legal rental suite, or consolidating high-interest debt into a much lower rate. That last one is genuinely powerful — but only if the credit cards then stay at zero.",
        ],
      },
      {
        h: "Uses that rarely do",
        p: [
          "Financing a depreciating asset with your home is how a five-year problem becomes a twenty-five-year one. A car loan on a HELOC is cheaper per month and far more expensive over the amortization — and now your house is the collateral.",
          "The honest test: will the thing you are buying still be worth something when the borrowing is finally repaid?",
        ],
      },
    ],
  },
  {
    slug: "maintenance-seasons",
    title: "The Four-Season Home Maintenance Playbook",
    tag: "Maintenance",
    minutes: 7,
    excerpt: "Vancouver's wet winters and dry summers each have a short list of must-do tasks. Here they are.",
    body: [
      {
        h: "Why seasonal beats occasional",
        p: [
          "Almost every expensive home failure on the coast starts as a cheap one that nobody noticed. A clogged gutter is a ten-minute job in October and a soffit repair in February. Working in seasons means you catch things while they are still small.",
        ],
      },
      {
        h: "Spring",
        ul: [
          "Walk the roof line from the ground with binoculars — lifted shingles, moss, damaged flashing.",
          "Clear gutters and downspouts of winter debris and confirm water discharges away from the foundation.",
          "Check the grade around the house; soil should slope away on every side.",
          "Service air conditioning or a heat pump before the first hot week, when every technician is booked.",
          "Test the sump pump if you have one, by filling the pit rather than trusting the float.",
        ],
      },
      {
        h: "Summer",
        ul: [
          "Wash and inspect windows and check the seals; failed double-glazing shows as permanent fog.",
          "Touch up exterior paint and caulking while everything is dry — this is the single best month for it.",
          "Trim vegetation back from the walls and roof. Anything touching the house is a bridge for moisture and pests.",
          "Inspect the deck for soft boards and loose railings.",
        ],
      },
      {
        h: "Autumn — the important one",
        p: ["On the coast, autumn maintenance prevents more damage than the rest of the year combined."],
        ul: [
          "Clean gutters after the leaves finish dropping, not partway through.",
          "Have the heating system serviced and change the filter.",
          "Disconnect hoses and shut off exterior taps to prevent a freeze split.",
          "Check attic ventilation and insulation — this is where condensation problems begin.",
          "Clear yard drains and catch basins before the heavy rain arrives.",
        ],
      },
      {
        h: "Winter",
        ul: [
          "Watch for condensation on windows and in corners; persistent moisture means a ventilation problem, not a weather problem.",
          "Run bathroom fans well past the end of the shower — twenty minutes or more.",
          "After heavy rain or wind, walk the perimeter and the basement looking for water where it has never been.",
          "Test smoke and carbon-monoxide alarms while the house is closed up.",
        ],
      },
      {
        h: "Make it automatic",
        p: [
          "The playbook only works if you are not the one remembering it. Your hub already tracks the equipment in your home and its age — let the reminders come to you, and handle each one while it is still a ten-minute job.",
        ],
      },
    ],
  },
  {
    slug: "renovation-roi",
    title: "Which Renovations Actually Pay You Back?",
    tag: "Improvements",
    minutes: 6,
    excerpt: "Data-backed returns for the most common projects — and the ones to skip if resale is the goal.",
    body: [
      {
        h: "Two different questions",
        p: [
          "\"Will I enjoy this?\" and \"will this return what it cost?\" are separate questions, and conflating them is how people overspend. Renovate for your own life if you are staying. Renovate for return only if you are selling within a couple of years.",
        ],
      },
      {
        h: "What reliably returns",
        p: ["The winners are almost always the unglamorous ones — the projects that fix a perception problem cheaply."],
        ul: [
          "Paint, inside and out. Nothing else moves perceived value so far per dollar.",
          "Curb appeal — landscaping, lighting, a clean and defined entry. It sets the buyer's expectation before they walk in.",
          "Decluttering and deep cleaning. Effectively free, and it beats most renovations for effect on offer price.",
          "Fixing deferred maintenance. Every visible defect becomes a negotiating chip against you, usually discounted well past its repair cost.",
        ],
      },
      {
        h: "What returns some of it",
        p: [
          "Kitchens and bathrooms are the classic value projects and they do help — but the return depends heavily on whether you are bringing a dated room up to the neighbourhood standard, or pushing past it. Matching the standard usually pays. Exceeding it usually does not.",
        ],
      },
      {
        h: "What rarely pays back at resale",
        ul: [
          "Pools, on the coast — often a net negative for buyers who see maintenance and liability.",
          "Highly personal finishes. Bold choices narrow your buyer pool.",
          "Over-improving beyond the neighbourhood ceiling. There is a price no buyer will exceed on your street regardless of what you did inside.",
          "Any major project you cannot finish before listing. Buyers do not pay for potential; they discount for disruption.",
        ],
      },
      {
        h: "The exception worth taking seriously",
        p: [
          "Adding legal, rentable space is the one large project that can genuinely change your home's value class, because it converts the house into something that produces income. It is also permit-heavy and slow. Worth doing on a long horizon; rarely worth starting on a selling timeline.",
        ],
      },
      {
        h: "Before you commit",
        p: [
          "Get the value question answered before the design question. Your advisor can tell you what a project is likely to return in your specific neighbourhood — which is a very different answer than a national average, and the only one that matters to your sale.",
        ],
      },
    ],
  },
  {
    slug: "insurance-review",
    title: "How to Review Your Home Insurance in 30 Minutes",
    tag: "Protection",
    minutes: 4,
    excerpt: "Coverage limits, deductibles, and the three questions to ask your broker every year.",
    body: [
      {
        h: "Why annually",
        p: [
          "Construction costs move, your home changes, and policies quietly renew on the same terms year after year. Most underinsurance is not a decision anyone made — it is a policy that simply never got revisited.",
        ],
      },
      {
        h: "Check the rebuild figure first",
        p: [
          "You insure the cost to rebuild, not the market value. These are different numbers, and in expensive markets the land is often the larger share of what you paid. If rebuild cost has not been reviewed in several years, it is probably low — building costs have not been flat.",
        ],
      },
      {
        h: "Then check what is excluded",
        p: ["Standard policies exclude more than people assume. Read the list, then decide deliberately rather than by default."],
        ul: [
          "Overland water and sewer backup are frequently separate endorsements.",
          "Earthquake coverage is typically an add-on, with its own much larger deductible.",
          "Home businesses and short-term rentals often void or limit coverage entirely.",
          "Some older systems — knob-and-tube wiring, oil tanks, aging roofs — can restrict coverage or pricing.",
        ],
      },
      {
        h: "The three questions for your broker",
        ul: [
          "If my home burned to the ground tomorrow, is this limit genuinely enough to rebuild it today?",
          "What is excluded that I would expect to be covered, and what would each endorsement cost to add?",
          "What discounts am I eligible for that are not currently applied — alarm, claims-free, bundling, a new roof?",
        ],
      },
      {
        h: "Deductibles are a lever, not a setting",
        p: [
          "Raising your deductible lowers the premium, and that is a sensible trade if — and only if — you could comfortably absorb the deductible tomorrow. If you could not, the savings are a loan you are making to yourself at a bad moment.",
        ],
      },
      {
        h: "Keep the evidence",
        p: [
          "Photograph each room and store the images with your policy in your hub. After a loss, an insurer asks you to prove what you owned. Ten minutes of photos today is worth more than any argument later.",
        ],
      },
    ],
  },
  {
    slug: "suite-guide",
    title: "The Mortgage Helper: Adding a Rental Suite in BC",
    tag: "Income",
    minutes: 8,
    excerpt: "Zoning, permits, realistic budgets, and what a legal suite does to your home's value.",
    body: [
      {
        h: "Why suites are the most powerful project on this list",
        p: [
          "A legal secondary suite does something no kitchen renovation can: it turns your home into an income-producing asset. That changes both your monthly cash flow and the pool of buyers who will compete for the house later, because lenders may count a portion of documented rental income when qualifying a purchaser.",
        ],
      },
      {
        h: "Start with zoning, not design",
        p: [
          "Before you price anything, confirm with your municipality that a secondary suite is permitted at your address and under what conditions. Rules differ meaningfully between municipalities and have been changing in recent years as provincial policy pushes toward more small-scale housing. Your city's planning department is the authority — not a contractor, and not a neighbour who did it in 2011.",
        ],
      },
      {
        h: "What the building code will care about",
        p: ["Legalization is mostly about safety and separation. Expect requirements around:"],
        ul: [
          "Ceiling height and minimum room dimensions.",
          "A compliant means of egress — usually a proper exit and adequately sized windows in sleeping rooms.",
          "Fire separation between units, and interconnected smoke alarms.",
          "Ventilation, heating, and often separate electrical provisions.",
          "Parking, and sometimes a limit on suite size relative to the house.",
        ],
      },
      {
        h: "Budget honestly",
        p: [
          "Costs vary enormously with what already exists. Finishing an unfinished basement with no plumbing rough-in is a different project from converting a space that already has a bathroom and separate entrance. Get quotes on your actual conditions, and hold a contingency — suite projects routinely uncover wiring, moisture, or height problems once walls open.",
        ],
      },
      {
        h: "The obligations that follow",
        p: [
          "Once you have a tenant you are a landlord, with everything that implies: a tenancy agreement, rules about rent increases and entry, a formal process for ending a tenancy, and disputes handled through the Residential Tenancy Branch. Tell your insurer as well — a rented suite changes your policy, and failing to disclose it is a good way to have a claim denied.",
          "Rental income is also taxable, and a portion of your expenses becomes deductible. Worth an hour with an accountant before your first tenant, not after your first tax season.",
        ],
      },
      {
        h: "Is it worth it for you?",
        p: [
          "Run the real numbers rather than the exciting ones: construction cost and financing against realistic local rent, minus vacancy, maintenance, and the additional tax. Then weigh the part no spreadsheet captures — you will be sharing your property with someone. For many owners the arithmetic is compelling and the trade-off is easy. For others it is not, and that is a perfectly good answer.",
        ],
      },
    ],
  },
  {
    slug: "sell-ready",
    title: "Thinking of Selling in 2–3 Years? Start Here",
    tag: "Selling",
    minutes: 5,
    excerpt: "The low-cost moves that compound into a stronger sale price when you're ready.",
    body: [
      {
        h: "The advantage of a long runway",
        p: [
          "Sellers who decide in a month spend money to fix things fast. Sellers with two years fix the same things on their own schedule, at normal prices, with time to shop trades. The work is identical; the cost and stress are not.",
        ],
      },
      {
        h: "Start with the inspection you have not had yet",
        p: [
          "A pre-listing inspection years ahead of time is the highest-value thing on this list. It tells you exactly what a buyer's inspector will find, while you still have time to address it quietly instead of negotiating against it under a deadline.",
        ],
      },
      {
        h: "Build the paper trail as you go",
        p: [
          "Every invoice, permit, and warranty you file now becomes evidence later that the home was cared for. Buyers discount uncertainty. A documented maintenance history is one of the few things that quietly removes it.",
        ],
      },
      {
        h: "Spend where buyers look",
        ul: [
          "Deferred maintenance first — it is the cheapest category and the most heavily discounted when found.",
          "Paint and curb appeal last, timed close to listing so they are fresh.",
          "Big renovations only if you would enjoy them yourself for the remaining time. Otherwise you are financing a stranger's taste.",
        ],
      },
      {
        h: "Watch your mortgage term",
        p: [
          "If your term ends before you plan to sell, that renewal is a decision point: a shorter term, or a portable or open product, can save you a substantial penalty later. Line the term up with your timeline while you still have the option — after you have signed a five-year fixed is too late.",
        ],
      },
      {
        h: "Tell your advisor early",
        p: [
          "There is no obligation in saying \"probably in about two years\". It simply means the pricing conversation, the prep list, and the market timing get built over time rather than assembled in a panic the week before photos.",
        ],
      },
    ],
  },
];

export function guideBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

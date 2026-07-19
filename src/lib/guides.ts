/* Homeowner guides — the content behind every "Featured guides" card.
   Deliberately durable: no rates, no dollar thresholds that go stale, and no
   legal/tax rulings. Where a number or rule actually governs (permits, zoning,
   insurance limits), the guide sends the reader to the authority instead of
   guessing on their behalf. */

export type GuideBlock = { h: string; p?: string[]; ul?: string[] };
export type Article = {
  slug: string; title: string; excerpt: string; tag: string; minutes: number;
  /** Who this is written for. Buyer hubs surface "buyer" first; owners get the rest. */
  audience?: "buyer" | "owner";
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
  /* ---------------------------------------------------------------- */
  /* Buyer guides. Same durability rule, and it matters more here: BC   */
  /* thresholds and federal limits move. Explain the MECHANISM, name    */
  /* the programme, and send the reader to the authority for numbers.   */
  /* ---------------------------------------------------------------- */
  {
    slug: "first-home-bc",
    title: "Buying Your First Home in BC: The Whole Sequence",
    tag: "First-time buyers",
    minutes: 8,
    audience: "buyer",
    excerpt: "What happens, in what order, from 'maybe we should look' to the keys in your hand.",
    body: [
      {
        h: "Get the financing conversation out of the way first",
        p: [
          "Almost everyone starts by looking at listings. It is more fun and it is the wrong order. Until a broker or lender has looked at your income, debts and down payment, you are shopping against a number you invented.",
          "A pre-approval tells you the ceiling, roughly what the payment looks like, and — importantly — what would break it. It is not a guarantee; the lender still has to approve the specific property.",
        ],
      },
      {
        h: "Understand what you can put down",
        p: [
          "Canada sets a minimum down payment that steps up with price: the lowest percentage applies to the least expensive homes, a higher share applies above a threshold, and above a second threshold you must put twenty percent down. Those thresholds have moved in recent years — confirm the current ones with your broker rather than a blog.",
          "Below twenty percent you also pay mortgage default insurance, which is added to the loan. It is not optional and it is not a scam; it is what lets you buy with less down.",
        ],
      },
      {
        h: "Know about the stress test before it surprises you",
        p: [
          "Lenders qualify you at a rate higher than the one you will actually pay. That is deliberate: it checks you could still carry the mortgage if rates rise at renewal. It is the single most common reason a pre-approval comes in lower than people expect.",
        ],
      },
      {
        h: "Then, and only then, start looking",
        ul: [
          "Save searches and set alerts so new listings come to you, rather than refreshing all evening.",
          "See enough homes to calibrate. The third viewing teaches you more than the first two combined.",
          "Watch what sells, not just what lists — asking prices tell you what sellers hope for.",
        ],
      },
      {
        h: "Writing the offer",
        p: [
          "In BC an offer is usually made subject to conditions — commonly financing, inspection, and for a strata, review of the documents. Those subjects are your protection: they are the window in which you verify what you are buying and can walk away without losing your deposit.",
          "Subject removal has a deadline. Once you remove subjects, the deal is firm and your deposit is genuinely at risk. Never remove subjects on documents you have not actually read.",
        ],
      },
      {
        h: "Between firm and possession",
        ul: [
          "Your lawyer or notary does the title search, prepares documents, and handles the money.",
          "Your lender needs time — get them everything the day they ask.",
          "Arrange home insurance; your lender will require proof before closing.",
          "Budget for closing costs, which are separate from your down payment — see the closing-costs guide.",
        ],
      },
      {
        h: "The part nobody tells first-time buyers",
        p: [
          "The emotional swing is normal. Almost everyone has a moment of certainty that they are overpaying, usually days after subject removal. That feeling is not information. Your advisor has watched dozens of people through it, and it is a reasonable thing to phone them about.",
        ],
      },
    ],
  },
  {
    slug: "down-payment",
    title: "What You Actually Need for a Down Payment",
    tag: "Financing",
    minutes: 6,
    audience: "buyer",
    excerpt: "Where the money can come from, what counts, and what lenders will ask you to prove.",
    body: [
      {
        h: "The minimum is a floor, not a target",
        p: [
          "Canada's minimum down payment rises in steps with the purchase price, and above an upper threshold you must put twenty percent down. Confirm today's thresholds with your broker — they have changed more than once recently.",
          "Putting down more lowers both the loan and the default insurance premium. Putting down less gets you in sooner. Neither is automatically right; it depends on what your money would otherwise be doing.",
        ],
      },
      {
        h: "Where lenders let it come from",
        ul: [
          "Your own savings — the simplest, and the easiest to prove.",
          "A gift from an immediate family member, with a signed letter confirming it is a gift and not a loan.",
          "An RRSP withdrawal under the federal Home Buyers' Plan, which you repay to your RRSP over time.",
          "A First Home Savings Account, the registered account designed specifically for this — contributions are deductible and qualifying withdrawals are not taxed.",
          "Proceeds from selling something you own, with the paper trail to match.",
        ],
        p: ["Limits and eligibility for the federal programmes change; check the current rules on the Government of Canada site or with your broker before you count on a number."],
      },
      {
        h: "Prepare to prove where it came from",
        p: [
          "Expect to show ninety days of history for the funds. This is anti-money-laundering law, not suspicion of you. A large unexplained deposit the week before closing causes real delays.",
          "If family is gifting, get the letter early. It is the single most commonly forgotten document.",
        ],
      },
      {
        h: "Do not spend it all",
        p: [
          "Your down payment is not your whole budget. Closing costs land on top, and they are usually thousands. Arriving at possession day with nothing left is a stressful way to start.",
        ],
      },
    ],
  },
  {
    slug: "closing-costs",
    title: "Closing Costs: The Bill Nobody Warns You About",
    tag: "Financing",
    minutes: 5,
    audience: "buyer",
    excerpt: "What lands on top of your down payment, roughly when, and which ones you can avoid.",
    body: [
      {
        h: "Property transfer tax",
        p: [
          "BC charges a transfer tax when a property changes hands, calculated in tiers against the purchase price. It is usually the largest closing cost.",
          "There are exemptions — notably a First Time Home Buyers' Programme and an exemption for newly built homes — each with its own price threshold and conditions. The thresholds change with provincial budgets, so check the current rules on the BC government's property transfer tax pages, or ask your lawyer or notary.",
        ],
      },
      {
        h: "GST — only on new",
        p: [
          "Resale homes generally do not attract GST. Newly built ones do, and there is a partial rebate that phases out as price rises. If you are buying new, confirm whether the quoted price includes GST — it materially changes the deal.",
        ],
      },
      {
        h: "The rest of the list",
        ul: [
          "Legal or notary fees, plus disbursements like the title search and registration.",
          "A home inspection, paid at the time, usually during your subject period.",
          "An appraisal, if your lender orders one.",
          "Title insurance, commonly required.",
          "Adjustments — you reimburse the seller for property tax or strata fees they prepaid past your possession date.",
          "Moving costs, and setting up utilities.",
        ],
      },
      {
        h: "Plan for a percentage, then get real numbers",
        p: [
          "Many buyers budget a small percentage of the purchase price for closing costs as a placeholder. That is fine for early planning, but once you have an actual property your lawyer or notary can give you a real statement of adjustments. Ask for it before you need it.",
        ],
      },
      {
        h: "What buyers usually do not pay",
        p: [
          "In a typical BC resale transaction the seller pays the real estate commission out of their proceeds. If anyone tells you otherwise about a specific deal, ask them to show you where.",
        ],
      },
    ],
  },
  {
    slug: "mortgage-basics",
    title: "Mortgages Explained: Rate, Term, Amortization",
    tag: "Financing",
    minutes: 7,
    audience: "buyer",
    excerpt: "The three numbers people mix up, and the choices that actually change what you pay.",
    body: [
      {
        h: "Three different things",
        ul: [
          "The rate is the cost of borrowing, expressed per year.",
          "The term is how long that specific contract lasts — commonly a few years — after which you renew at whatever rates then exist.",
          "The amortization is how long the whole loan takes to pay off, commonly twenty-five years. You will go through several terms within one amortization.",
        ],
        p: ["People say \"my mortgage is five years\" when they mean the term. The difference matters at renewal, which is the moment your payment can change."],
      },
      {
        h: "Fixed or variable",
        p: [
          "Fixed buys certainty: your rate and payment hold for the term. Variable moves with the lender's prime rate, so the cost can fall or rise during the term.",
          "The honest framing is not which is cheaper — nobody knows — but how much fluctuation you can live with. If a rate rise would genuinely hurt, that is an argument for fixed regardless of forecasts.",
        ],
      },
      {
        h: "The features that matter more than a few basis points",
        ul: [
          "Prepayment privileges — how much extra you can pay each year without penalty.",
          "The penalty formula for breaking early. Fixed mortgages can use an interest-rate-differential calculation that is dramatically more expensive than three months' interest.",
          "Portability, if there is any chance you move before the term ends.",
          "Whether it is a collateral charge, which can make switching lenders at renewal more awkward.",
        ],
      },
      {
        h: "Why extra payments do so much",
        p: [
          "Early in an amortization, most of each payment is interest. Anything extra goes entirely against principal, so it removes not just that amount but all the future interest it would have carried. Small, regular extra payments shorten an amortization by years.",
        ],
      },
      {
        h: "Renewal is a decision, not a formality",
        p: [
          "Your lender will send an offer months ahead. It is rarely their best rate, because most people sign it. Shopping the renewal — or having a broker do it — is one of the highest-paid hours in personal finance.",
        ],
      },
    ],
  },
  {
    slug: "buyer-programs",
    title: "Programmes and Rebates Worth Knowing About",
    tag: "First-time buyers",
    minutes: 6,
    audience: "buyer",
    excerpt: "The federal and BC support that exists — what each one does, and where to check the current rules.",
    body: [
      {
        h: "Read this first",
        p: [
          "Every programme below is real, but the eligibility rules, price thresholds and dollar limits are set by government and change with budgets. This explains what each one is for. For the number that applies to you today, use the official source named in each entry, or ask your broker, lawyer or accountant.",
        ],
      },
      {
        h: "First Home Savings Account (federal)",
        p: [
          "A registered account built specifically for a first home. Contributions are tax-deductible like an RRSP, and qualifying withdrawals to buy a home are tax-free like a TFSA. There are annual and lifetime contribution limits. Details: Government of Canada, First Home Savings Account.",
        ],
      },
      {
        h: "Home Buyers' Plan (federal)",
        p: [
          "Lets you withdraw from your RRSP toward a first home and repay it over a set number of years. If you miss a repayment year, that portion becomes taxable income. Details: Canada Revenue Agency, Home Buyers' Plan.",
        ],
      },
      {
        h: "First-Time Home Buyers' Tax Credit (federal)",
        p: [
          "A non-refundable credit claimed on your tax return the year you buy. Modest, but it costs nothing but remembering to claim it — tell whoever prepares your return that you bought.",
        ],
      },
      {
        h: "BC Property Transfer Tax exemptions",
        p: [
          "BC runs a First Time Home Buyers' Programme that reduces or eliminates transfer tax below a price threshold, and a separate Newly Built Home Exemption. Both have conditions about occupancy and residency. This is often the largest single saving available to a first-time buyer, and it is claimed through your lawyer or notary at closing — so raise it with them early. Details: BC government property transfer tax exemptions.",
        ],
      },
      {
        h: "GST New Housing Rebate (federal)",
        p: [
          "Applies to newly built or substantially renovated homes, partially rebating the GST, and phasing out as price rises. Builders often credit it directly in the purchase price — check which way your contract is written.",
        ],
      },
      {
        h: "How to actually use this list",
        p: [
          "Bring it up at two moments: with your broker when you are working out the down payment, and with your lawyer or notary once you have an accepted offer. Those are the two people positioned to apply them. Leaving it later usually means leaving money behind.",
        ],
      },
    ],
  },
];

export function guideBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** Guides for a hub, most relevant first. Buyer hubs lead with buyer guides. */
export function guidesFor(journey?: string): Article[] {
  const buyer = journey === "buying";
  return [...ARTICLES].sort((a, b) => {
    const rank = (x: Article) => (buyer ? (x.audience === "buyer" ? 0 : 1) : (x.audience === "buyer" ? 1 : 0));
    return rank(a) - rank(b);
  });
}

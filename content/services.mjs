// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The words on the service pages. tools/build-pages.mjs turns each entry into site/<slug>.html.
//
// Rules for this file, the same as the rest of the site:
// - Claims stay inside what the home page already says: fixed price on a one-page plan, people
//   approve the money, read-only where possible, every run logged, we meet in person.
// - No clients, results or statistics. The log panels are examples and say so.
// - No prices and no new timelines. The one timeline is the home page's "within a few weeks".
// - Plain text everywhere except h1, which may use <em> for the amber word.

// Two answers the home page already gives word for word; the industry pages reuse them too.
export const SHIP = "First builds typically ship within a few weeks. We run it alongside your team until it’s trusted, then hand it over.";
export const PRICE = "Every build has a fixed price, written on the one-page plan before any work starts, along with what it costs to run each month. Any software or AI accounts it uses are in your name and billed to you directly. You know both numbers before you commit.";
export const MONEY = "No money is paid or sent without a person signing off, unless you decide otherwise.";

export const SERVICES = [
  {
    slug: "lead-follow-up",
    crumb: "Inquiries and quotes",
    title: "Lead and Quote Follow-Up Automation in Ontario | Third Shift",
    description: "Website and email inquiries logged in your CRM with a reply within minutes, and open quotes followed up on a set schedule that stops when the customer replies.",
    h1: "Every inquiry answered. Every quote <em>followed up.</em>",
    lede: "Third Shift builds the automation that logs every website and email inquiry, sends a reply within minutes, and follows up on open quotes on a schedule, so no lead goes quiet because someone forgot.",
    more: "Inquiries logged and answered within minutes, quotes chased on a schedule.",
    linkText: "How lead follow-up works",
    schema: {
      name: "Lead intake and follow-up automation",
      serviceType: "Lead management automation",
      description: "Website, email and form inquiries logged in the CRM with a reply sent, and open quotes followed up on a set schedule, stopping when the customer replies.",
    },
    log: {
      label: "An example night",
      boot: [["Website form", "connected"], ["Inbox", "connected"], ["CRM", "connected"], ["Prices", "a person decides", true]],
      rows: [
        ["9:47 PM", "Website inquiry logged in the CRM, reply sent"],
        ["10:15 PM", "Email inquiry matched to an existing customer’s record"],
        ["12:40 AM", "Followed up on 6 quotes older than five days"],
        ["12:41 AM", "Stopped follow-ups for 2 customers who replied"],
        ["12:42 AM", "1 held: customer asked about a discount", true],
        ["6:55 AM", "Morning list sent: new inquiries, replies to read, who to call"],
      ],
      foot: "An example. Yours runs on your own inquiries.",
    },
    handles: {
      kicker: "What it handles",
      h2: "From first message to booked call",
      intro: "Leads rarely go cold because the quote was wrong. They go cold because nobody got back to them.",
      cards: [
        ["Logging every inquiry", "Website forms and emails land in one place, your CRM or a shared spreadsheet, with who they are, what they asked and how they found you."],
        ["A reply within minutes", "The person hears back within minutes, day or night, in your words, with the next step or a link to book a call. Real questions are passed to you."],
        ["Quotes followed up", "Open quotes get a polite follow-up on the schedule you choose. The follow-ups stop as soon as the customer replies or books a call, and you can stop them for anyone at any time."],
        ["One record per person", "Someone who emails and then fills in the form is one contact, not two, and returning customers are matched to their history."],
        ["The morning list", "One email before your day starts: new inquiries, replies waiting, quotes still open, and who’s worth a phone call."],
        ["Where leads come from", "Each inquiry records where it came from, when that’s known, so over time you can see which posts, ads or referrals bring in inquiries."],
      ],
    },
    how: {
      kicker: "How it works",
      h2: "Nothing waits until someone remembers",
      intro: "It runs all day and all night, and it knows when to step back.",
      steps: [
        ["Captured", "An inquiry arrives by form or email and is logged with its details and where it came from."],
        ["Answered", "A reply goes out within minutes, written with you ahead of time. Anything that needs a real answer is flagged for you."],
        ["Followed up", "Open quotes get follow-ups on your schedule, spaced a few days apart."],
        ["Stopped", "A reply, a booked call or a no-thanks stops the follow-ups for that person straight away. You can also stop them for anyone, any time."],
        ["Summarized", "The morning email tells you who to call and what’s waiting."],
      ],
    },
    person: {
      kicker: "What stays with a person",
      h2: "Your name is on every message, so you decide what it says",
      items: [
        ["Prices and promises", "Discounts, custom prices and anything that commits you are drafted for you to approve, never sent on their own."],
        ["Real conversations", "When someone asks a real question, it hands the message to you instead of guessing at an answer."],
        ["Your voice", "Every reply and follow-up is written with you and approved before the first one goes out."],
        ["Stopping", "Anyone who asks to stop hears nothing more, and follow-ups only ever go to people who contacted you first."],
      ],
    },
    fit: {
      items: [
        "Inquiries come in after hours and wait until morning.",
        "Quotes go out and nobody follows up on them.",
        "Leads live in an inbox, a spreadsheet and someone’s memory.",
        "You can’t tell which posts, ads or referrals bring in work.",
      ],
      tools: ["Gmail", "Outlook", "HubSpot", "Google Sheets", "Excel", "Shopify", "Website forms"],
    },
    faq: [
      ["Will customers know it’s automated?", "The first reply says you’ve got their message and what happens next, the way a good front desk would. It doesn’t pretend to be a person in a conversation. Follow-ups go out under your name, in words you approved, and real questions come to you."],
      ["Do we need a CRM?", "No. A shared Google Sheet or Excel file works to start. If you already use HubSpot or another CRM, we connect to that instead."],
      ["What about Canada’s anti-spam law?", "Follow-ups only go to people who contacted you or asked you for a quote, and they finish well within the six months the law allows after an inquiry. Every message carries your business name, mailing address and contact details with a way to unsubscribe, and a request to stop is honoured straight away."],
      ["What does a build cost?", PRICE],
    ],
    cta: {
      h2: "Tell us where your leads go quiet",
      p: "A free 20-minute call. Tell us how inquiries arrive and what happens after a quote is sent, and we’ll tell you plainly what’s worth automating.",
    },
  },

  {
    slug: "reporting-automation",
    crumb: "Reporting",
    title: "Automated Business Reporting in Ontario | Third Shift",
    description: "Weekly and monthly reports built overnight from your accounting system, store and spreadsheets, checked against the source and sent before the team starts.",
    h1: "The Monday numbers, ready <em>before you are.</em>",
    lede: "Third Shift builds the reports you look at every week and every month, pulled overnight from the systems the numbers live in, checked, and in your inbox before the team starts. Nobody spends Monday morning copying figures into a spreadsheet.",
    more: "Weekly and monthly reports built overnight and checked against the source.",
    linkText: "How automated reporting works",
    schema: {
      name: "Reporting automation",
      serviceType: "Business reporting automation",
      description: "Weekly and monthly reports built overnight from the systems a business already uses, checked against the source and delivered before the team starts.",
    },
    log: {
      label: "An example night",
      boot: [["Accounting", "read-only"], ["Store", "read-only"], ["Timesheets", "read-only"]],
      rows: [
        ["2:00 AM", "Pulled last week’s sales, invoices and payments from accounting"],
        ["2:04 AM", "Pulled online orders and the hours from the timesheet file"],
        ["2:07 AM", "Checked report totals against the general ledger: they agree"],
        ["2:08 AM", "Note: Friday’s deposits aren’t in the bank feed yet", true],
        ["6:12 AM", "Weekly report built, with last week beside each number"],
        ["6:55 AM", "Sent to three inboxes"],
      ],
      foot: "An example. Yours runs on your own numbers.",
    },
    handles: {
      kicker: "What it handles",
      h2: "The numbers you already look at, without the copying",
      intro: "Not a new dashboard to learn. The report you build by hand today, built for you.",
      cards: [
        ["Weekly and monthly reports", "Sales, gross margin, overdue invoices, cash, jobs or orders in progress: the figures you already watch, built the same way every time."],
        ["Straight from the source", "Numbers are pulled from your accounting system, store, CRM and spreadsheets directly, not copied and pasted by hand."],
        ["Checked before they’re sent", "Totals are checked against the source. A report that doesn’t add up says so at the top instead of going out wrong."],
        ["Delivered the way you read them", "An email summary, a Google Sheet or Excel file, or a PDF for the bank or your partners."],
        ["Who owes you", "Overdue invoices by customer and by age, every Monday, with the ones due a reminder marked."],
        ["Month-end packs", "The reports your accountant or bank asks for, prepared from the closed month without the scramble."],
      ],
    },
    how: {
      kicker: "How it works",
      h2: "Built overnight, read over coffee",
      intro: "It only reads. It never writes a figure back to your books.",
      steps: [
        ["Pulled", "Overnight, read-only wherever your system allows, from each system the numbers live in."],
        ["Checked", "Totals are tied back to the source. Missing data is noted, never guessed."],
        ["Built", "Into the same layout every time, with the last period beside it."],
        ["Delivered", "To the people who need it, before the day starts."],
        ["Adjusted", "Want a new number later? It can be added once, and then it shows up every time."],
      ],
    },
    person: {
      kicker: "What stays with a person",
      h2: "The report shows what happened. What to do about it is yours.",
      items: [
        ["Read-only", "Reporting is built only to read. Wherever your system allows it, its login can’t change a figure either."],
        ["Odd numbers", "If something looks off, like a week with no deposits, the report flags it rather than smoothing it over."],
        ["Who sees what", "Each report goes only to the people you choose."],
        ["Every run logged", "A plain-English record of what it pulled, from where, and when, so any number can be traced back."],
      ],
    },
    fit: {
      items: [
        "Someone builds the same report by hand every week or month.",
        "The numbers you need are spread across three systems and a spreadsheet.",
        "Reports arrive late, or with mistakes from copying.",
        "Your bank or partners ask for the same pack every month.",
      ],
      tools: ["QuickBooks", "Xero", "Sage", "NetSuite", "Shopify", "Stripe", "HubSpot", "Excel", "Google Sheets"],
    },
    faq: [
      ["Do we need a new dashboard tool?", "Usually not. An email and a spreadsheet you already know how to read are often enough. If a dashboard would genuinely help, we say so and why."],
      ["What if two systems disagree?", "The report says so at the top, with the difference. It never picks one number and hides the other."],
      ["Can our accountant use it?", "Yes. The same figures can go to your accountant in the format they ask for."],
      ["What does a build cost?", PRICE],
    ],
    cta: {
      h2: "Tell us which numbers you build by hand",
      p: "A free 20-minute call. Bring the report you build today, and we’ll tell you plainly whether it’s worth automating.",
    },
  },

  {
    slug: "process-automation",
    crumb: "Routine processes",
    title: "Routine Process Automation in Ontario | Third Shift",
    description: "The routine only one person knows how to do, written down, built out and run on a schedule with a log of every run. For small businesses across Ontario.",
    h1: "The job only <em>one person</em> knows how to do.",
    lede: "Every business has one: the Friday routine, the spreadsheet with the formulas nobody touches, the checklist that lives in someone’s head. Third Shift writes it down, builds it out, and runs it on a schedule with a log of every run, so it still gets done when that person is away.",
    more: "The routine one person carries in their head, written down and run on a schedule.",
    linkText: "How process automation works",
    schema: {
      name: "Routine process automation",
      serviceType: "Business process automation",
      description: "The recurring jobs one person carries in their head, written down and run on a schedule with a log of every run.",
    },
    log: {
      label: "An example Friday",
      boot: [["Orders", "read-only"], ["Stock sheet", "connected"], ["Supplier orders", "a person approves", true]],
      rows: [
        ["4:00 PM", "Friday routine started"],
        ["4:01 PM", "Pulled this week’s orders and the latest stock counts"],
        ["4:03 PM", "Built the reorder list from the minimums sheet"],
        ["4:03 PM", "2 items held: below minimum, but that supplier is on hold", true],
        ["4:05 PM", "Weekly status email sent to the team"],
        ["4:06 PM", "Run logged: 11 steps, nothing skipped"],
      ],
      foot: "An example. Yours runs your own routine.",
    },
    handles: {
      kicker: "What it handles",
      h2: "Out of one head and onto a schedule",
      intro: "If it happens on a schedule and follows the same steps, it can usually run without anyone remembering to start it.",
      cards: [
        ["Written down first", "We sit with the person who does it and write down every step, including the ones they do without thinking."],
        ["Run on a schedule", "Daily, weekly, at month-end, or when something happens, like a new order or a form coming in."],
        ["A log of every run", "What it did, what it touched and what it held back, in plain English."],
        ["Safe when things change", "If a file moves or a column is renamed, it stops and tells someone instead of carrying on wrong."],
        ["Holidays and sick days", "The routine runs whether or not the person who used to do it is in that day."],
        ["Easy to hand over", "New staff read the log and the written steps instead of learning by looking over someone’s shoulder."],
      ],
    },
    how: {
      kicker: "How it works",
      h2: "Watched once, written down, then built",
      intro: "Steps that need judgment stay with a person. The rest runs on its own.",
      steps: [
        ["Shadowed", "We watch the routine done once, start to finish, and write down every step."],
        ["Agreed", "You check the written version and mark the steps that need a decision."],
        ["Built", "The rest is built to run on its schedule, in the systems you already use."],
        ["Run side by side", "It runs alongside the person who does it today until the results match."],
        ["Handed over", "With monitoring, the log of every run, and the written steps."],
      ],
    },
    person: {
      kicker: "What stays with a person",
      h2: "Decisions stay with people",
      items: [
        ["Judgment calls", "Anything that needs a decision is prepared and handed to a person, not decided by the automation."],
        ["Money", MONEY],
        ["Its own login", "Each automation has its own access, so you can switch it off without touching anything else."],
        ["Stops when unsure", "When something fails or looks wrong, it stops and tells a person instead of guessing."],
      ],
    },
    fit: {
      items: [
        "Only one person knows how to do it.",
        "It’s the same steps every week or every month.",
        "It falls apart when that person is on holiday.",
        "It lives in spreadsheets, email and a system you log into.",
      ],
      tools: ["Excel", "Google Sheets", "Gmail", "Outlook", "QuickBooks", "Xero", "Sage", "NetSuite", "Slack"],
    },
    faq: [
      ["What if the process isn’t written down anywhere?", "That’s the usual case. Writing it down is the first step of every build like this."],
      ["What if the person who does it is leaving?", "Then it’s worth writing down now, while they can still walk us through it."],
      ["Can we change it later?", "Yes. When the routine changes, the automation can be changed to match, and the written steps with it."],
      ["How long does a first build take?", SHIP],
    ],
    cta: {
      h2: "Tell us about the routine only one person knows",
      p: "A free 20-minute call. Describe what happens and how often, and we’ll tell you plainly whether it’s worth automating.",
    },
  },

  {
    slug: "invoice-automation",
    crumb: "Invoices and payables",
    title: "Accounts Payable Automation in Ontario | Third Shift",
    description: "Supplier invoices collected, matched to purchase orders and posted to your accounting system overnight, for Ontario businesses. People approve every payment.",
    h1: "Supplier invoices, cleared <em>overnight.</em>",
    lede: "Third Shift builds the automation that collects your supplier invoices, matches them to purchase orders and posts them to your accounting system while the office is closed. Anything that doesn’t match waits for a person, and nothing gets paid until someone approves it.",
    more: "Invoices collected, matched to purchase orders and posted overnight.",
    linkText: "How invoice automation works",
    schema: {
      name: "Supplier invoice and payables automation",
      serviceType: "Accounts payable automation",
      description: "Supplier invoices collected from email and vendor portals, matched to purchase orders, posted to the accounting system and queued for a payment run a person approves.",
    },
    log: {
      label: "An example night",
      boot: [["AP inbox", "read-only"], ["Accounting", "connected"], ["Payments", "a person approves", true]],
      rows: [
        ["11:02 PM", "Picked up 41 invoices from the AP inbox and two vendor portals"],
        ["11:06 PM", "Read supplier, invoice number, dates, GST/HST and line items"],
        ["11:09 PM", "Matched 37 to purchase orders and receipts, posted them as bills"],
        ["11:10 PM", "1 held: same invoice number as one posted on the 3rd", true],
        ["11:10 PM", "3 held: price or quantity doesn’t match the PO", true],
        ["6:55 AM", "Morning summary sent: what posted, what’s waiting, what’s due"],
      ],
      foot: "An example. Yours runs on your own invoices.",
    },
    handles: {
      kicker: "What it handles",
      h2: "The invoice work nobody misses",
      intro: "The steps an accounts payable clerk does by hand, done in the same order, with the same checks, every night.",
      cards: [
        ["Collecting invoices", "From the AP inbox, supplier emails and the vendor portals you already log into. Each one is kept with the original attached, so nobody has to ask where a number came from."],
        ["Reading and coding", "Supplier, invoice number, dates, line items and GST/HST are read off the page and coded to the right accounts, using rules taken from how your team codes them today."],
        ["Matching", "Each invoice is checked against its purchase order and, where you track it, what was received. Prices, quantities and totals have to agree within the tolerance you set."],
        ["Duplicates and bank details", "The same invoice arriving twice, from a second email or a resent PDF, is flagged and held before it’s posted. New or changed bank details are always held for a call-back."],
        ["Posting and the payment run", "Matched invoices are posted as bills with the PDF attached and lined up for payment by their due dates. A person reviews and approves each payment run."],
        ["Due dates and discounts", "Due dates and early-payment discounts are tracked, so the morning summary says what’s due this week and which discounts are still worth taking."],
      ],
    },
    how: {
      kicker: "How it works",
      h2: "From the inbox to an approved payment run",
      intro: "The AI reads and sorts. Rules and checks do the math.",
      steps: [
        ["Collected", "After hours, new invoices are gathered from the inbox and the portals, with the originals saved."],
        ["Read and checked", "The details come off each invoice, the math and the GST/HST are checked, and it’s compared with everything already posted."],
        ["Matched", "Each invoice is compared to its purchase order and receipt, where you use them. Inside your tolerance, it’s posted. Outside it, it’s held with the reason written next to it."],
        ["Summarized", "Before your team starts, one email: what was posted, what’s waiting and why, what’s due this week."],
        ["Approved by a person", "Your team clears the exceptions and approves the payment run. Nothing is paid without that sign-off."],
      ],
    },
    person: {
      kicker: "What stays with a person",
      h2: "Built the way a careful AP team would want it",
      intro: "The checks are the ones a careful accounts payable team makes by hand, in the same order, on every invoice, every night.",
      items: [
        ["Payments", MONEY],
        ["Exceptions", "An invoice that doesn’t match, a supplier it hasn’t seen before, or anything outside the rules waits for a person, with the reason."],
        ["Bank details", "New or changed supplier banking information is always held for a call-back to a number you already have."],
        ["Access", "Read-only access to the inbox wherever possible, a separate login in your accounting system, and access you can revoke at any time."],
      ],
    },
    fit: {
      items: [
        "Someone on your team spends hours a week keying invoices.",
        "Invoices arrive by email and from a handful of supplier portals.",
        "You use purchase orders, or would if checking them weren’t so slow.",
        "You’ve paid an invoice twice, missed a discount, or found one in an inbox a month late.",
      ],
      tools: ["QuickBooks", "Xero", "Sage", "NetSuite", "Gmail", "Outlook", "Excel", "Google Sheets"],
    },
    faq: [
      ["Do we need purchase orders?", "No. Without them, each invoice is checked against what you’ve paid that supplier before and against your coding rules, and anything unusual waits for a person. Purchase orders make the matching stricter, and we’ll tell you whether they’re worth adding."],
      ["What happens to an invoice it can’t read?", "It’s held for a person with the original attached, and the morning summary lists it. Poor scans and handwritten invoices are the usual ones."],
      ["Can it pay our suppliers?", "It lines up the payment run in your accounting system. A person approves the run before anything is paid, unless you decide otherwise."],
      ["How long does a first build take?", SHIP],
    ],
    cta: {
      h2: "Tell us how your invoices arrive",
      p: "A free 20-minute call. Bring a rough count of invoices a month and the system you post them to, and we’ll tell you plainly whether it’s worth automating.",
    },
  },

  {
    slug: "custom-automation",
    crumb: "Built to fit",
    title: "Custom Automation and Internal Tools in Ontario | Third Shift",
    description: "Reorder alerts, scheduling, timesheets, quotes, onboarding, app syncing and small internal tools, each built to fit one business, anywhere in Ontario.",
    h1: "Built for the job <em>in front of you.</em>",
    lede: "Invoices, inquiries and reports are where most owners start, not the whole menu. Every build is made for the business in front of us, so if a job repeats and lives in software, it’s a candidate.",
    more: "Reorder alerts, scheduling, timesheets, onboarding and small internal tools.",
    linkText: "More on what else we build",
    schema: {
      name: "Custom automation and internal tools",
      serviceType: "Custom software automation",
      description: "Automations and small internal tools built to fit one business: inventory and reorder alerts, scheduling, timesheets, document drafting, onboarding, and moving data between apps.",
    },
    log: {
      label: "An example morning",
      boot: [["Inventory", "read-only"], ["Calendar", "connected"], ["Payroll", "a person approves", true]],
      rows: [
        ["5:30 AM", "Reorder list sent: 4 items below their minimum"],
        ["6:00 AM", "Today’s crew schedule sent, with addresses and job notes"],
        ["6:15 AM", "Reminders sent for tomorrow’s appointments"],
        ["7:00 AM", "Timesheets checked: one missing, a reminder sent"],
        ["7:01 AM", "2 overtime entries held for approval before payroll", true],
        ["7:05 AM", "New customer set up in three systems, welcome email sent"],
      ],
      foot: "An example. Yours does your own jobs.",
    },
    handles: {
      kicker: "Other things we build",
      h2: "Examples, not the limit",
      intro: "Each of these is built for one business, in the systems it already uses.",
      cards: [
        ["Inventory counts and reorder alerts", "Stock checked against your minimums every night, with a reorder list ready for whoever does the buying. Nothing is ordered without a person."],
        ["Scheduling, dispatch and reminders", "The day’s schedule sent to each crew with addresses and notes, and reminders to customers the day before."],
        ["Timesheets and payroll prep", "Hours collected from wherever they’re entered, checked for gaps and overtime, and ready for payroll. A person approves before anyone is paid."],
        ["Quotes and contracts from templates", "Quotes and contracts filled in from your templates and the customer’s details, ready for you to check and send."],
        ["New-customer onboarding", "Accounts set up in each system, welcome emails and forms sent, and nothing missed when a new customer signs."],
        ["Syncing apps that don’t talk", "Orders, contacts or invoices moved between the systems that should share them, instead of being typed in twice."],
        ["Dashboards and small internal tools", "A simple screen for the job that’s outgrown a spreadsheet: a job tracker, a request form, an approval queue."],
        ["Month-end checklists", "The close steps run in order, each one checked off and logged, and anything missing chased before it holds up the month."],
      ],
    },
    how: {
      kicker: "How it starts",
      h2: "One call, one page, one build",
      intro: "No discovery retainer, no slide deck.",
      steps: [
        ["A 20-minute call", "You walk through the job that eats up your week. We tell you plainly whether it’s worth automating."],
        ["A one-page plan", "What it connects to, a fixed price and a delivery date. You decide from there."],
        ["Build, test, hand over", "We build it, run it alongside your team until it’s trusted, then hand it over with monitoring and a log of every run."],
      ],
    },
    person: {
      kicker: "How we build",
      h2: "The same rules on every build",
      items: [
        ["People approve the money", MONEY],
        ["Your data stays in your systems", "We build inside the accounts you already own. Where an AI model reads a document, we use business-grade services that don’t train on your data."],
        ["The least access that does the job", "Read-only wherever possible, a separate login for each automation, and access you can revoke at any time."],
        ["Every run is logged", "A plain-English record of what ran, what it touched and what it held back."],
      ],
    },
    fit: {
      items: [
        "It repeats daily, weekly or monthly.",
        "It follows the same steps most of the time.",
        "It lives in email, spreadsheets or an app you log into.",
        "Someone on your team dreads doing it.",
      ],
      tools: ["Gmail", "Outlook", "QuickBooks", "Xero", "Sage", "NetSuite", "Excel", "Google Sheets", "HubSpot", "Shopify", "Slack", "Stripe"],
    },
    faq: [
      ["Can you build something that isn’t on this list?", "Yes. These are examples, not the limit. Tell us what the job is and we’ll say honestly whether it’s worth building."],
      ["What if it isn’t worth automating?", "Then we’ll tell you on the call, and why. Some jobs don’t repeat enough, or need a judgment call every time."],
      ["What does a build cost?", PRICE],
    ],
    cta: {
      h2: "Tell us what eats your week",
      p: "A free 20-minute call. Describe the job, how often it happens and who does it today, and we’ll tell you plainly whether it’s worth building.",
    },
  },
];

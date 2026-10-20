// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The words on the "Who it's for" pages, one per kind of business the home page names. Same rules as
// content/services.mjs: claims stay inside what the home page says, no clients or results, the logs
// are labelled examples, no prices or new timelines. Each card may name the service page it belongs
// to (its third entry), and the page links there.
//
// Where a business already owns software that does part of the job (job management, practice
// management, an ERP), the page says we leave that part alone.

import { MONEY, PRICE, SHIP } from "./services.mjs";

export const INDUSTRIES = [
  {
    slug: "trades",
    crumb: "Trades and contractors",
    title: "Automation for Trades and Contractors in Kitchener | Third Shift",
    description: "For plumbing, HVAC, electrical, roofing and other trades in Waterloo Region: quotes followed up, crew schedules sent and supplier invoices matched to jobs.",
    h1: "The office work behind every job, <em>done overnight.</em>",
    lede: "Plumbing, HVAC, electrical, roofing, landscaping: the work happens on site, and the quotes, schedules, timesheets and supplier invoices pile up for the evening. Third Shift builds automations that handle that office work in the systems you already use, with you approving anything that involves money or a price.",
    more: "Quotes followed up, crew schedules sent, supplier invoices matched to jobs.",
    schema: {
      name: "AI automation for trades and contractors",
      serviceType: "Business process automation",
      audience: "Trades and contractors",
      description: "Office work for trades businesses in Waterloo Region, automated: quote follow-ups, crew schedules and reminders, timesheets, supplier invoices and weekly job numbers.",
    },
    log: {
      label: "An example night",
      boot: [["Inbox", "connected"], ["Accounting", "connected"], ["Prices", "you set them", true]],
      rows: [
        ["9:40 PM", "Picked up 14 supplier invoices and matched them to jobs"],
        ["9:44 PM", "2 held: materials billed to a job that’s already closed", true],
        ["10:30 PM", "Followed up on 5 quotes sent last week with no answer"],
        ["11:15 PM", "Tomorrow’s schedule sent to each crew, with addresses and notes"],
        ["11:20 PM", "Customer reminders queued for 8 AM"],
        ["6:30 AM", "Timesheets checked: one crew is missing Thursday’s hours"],
      ],
      foot: "An example. Yours runs on your own jobs.",
    },
    handles: {
      kicker: "What piles up",
      h2: "The work after the work",
      intro: "Most of it gets done at the kitchen table after the trucks are parked.",
      cards: [
        ["Quotes that go quiet", "Every quote gets a polite follow-up on your schedule, and the follow-ups stop when the customer replies or books.", "lead-follow-up"],
        ["Inquiries while you’re on a job", "Website and email inquiries are logged and get a reply within minutes, so people hear back quickly even while you’re on site.", "lead-follow-up"],
        ["Scheduling and reminders", "Each crew gets tomorrow’s jobs with addresses and notes, and customers get a reminder the day before.", "custom-automation"],
        ["Timesheets and payroll prep", "Crew hours gathered in one place, checked for gaps and overtime, and ready for payroll. You approve before anyone is paid.", "custom-automation"],
        ["Supplier invoices", "Materials invoices matched to jobs and purchase orders, where you use them, posted to your books, with anything odd held for you.", "invoice-automation"],
        ["Job costs and the weekly numbers", "Materials and hours against each job’s quote (where you track them), plus who still owes you, in one email every Monday.", "reporting-automation"],
      ],
    },
    person: {
      kicker: "What stays with you",
      h2: "You still run the business",
      items: [
        ["Prices and quotes", "Quotes, prices and discounts are yours. The automation follows up on quotes you’ve sent, and it never sends a price you haven’t approved."],
        ["Money", MONEY],
        ["Your customers", "Every message goes out under your business name, in words you approved, and anyone who asks to stop hears nothing more."],
        ["Your systems", "It works inside the tools you already use, with its own login you can switch off at any time."],
      ],
    },
    fit: {
      items: [
        "You write quotes at night after a full day on site.",
        "Quotes go out and nobody has time to follow up.",
        "Crew hours arrive on paper, by text or in a spreadsheet.",
        "Supplier invoices pile up until month-end.",
      ],
      tools: ["QuickBooks", "Xero", "Sage", "Gmail", "Outlook", "Excel", "Google Sheets", "HubSpot"],
    },
    faq: [
      ["We use job management software. Can you work with it?", "Often, yes. If it can export or connect, we build around it rather than replacing it. If it already sends reminders or follow-ups, we leave those alone and work on what it doesn’t, like supplier invoices and job costs."],
      ["Do my crews have to change how they work?", "As little as possible. We work from where hours already go where we can, like a shared sheet, an email or a photo of the paper timesheet. If anything has to change, we’ll say so on the call."],
      ["What does a build cost?", PRICE],
    ],
    cta: {
      h2: "Tell us where your evenings go",
      p: "A free 20-minute call. Tell us how quotes, schedules and invoices work today, and we’ll tell you plainly what’s worth automating.",
    },
  },

  {
    slug: "distributors",
    crumb: "Distributors and wholesalers",
    title: "Automation for Wholesale Distributors in Kitchener | Third Shift",
    description: "For wholesale distributors in Waterloo Region: emailed orders drafted, supplier invoices matched, reorder lists built and overdue accounts listed overnight.",
    h1: "Orders in, invoices matched, <em>stock watched.</em>",
    lede: "Distributors run on volume: customer orders arriving by email, supplier invoices to match, stock to reorder, and customers to chase for payment. Third Shift builds automations that take the re-keying out of it, inside the systems you already run, with a person approving anything that moves money.",
    more: "Emailed orders drafted, supplier invoices matched, stock and collections watched.",
    schema: {
      name: "AI automation for distributors and wholesalers",
      serviceType: "Business process automation",
      audience: "Wholesale distributors",
      description: "Office work for distributors in Waterloo Region, automated: draft orders from email and PDF purchase orders, supplier invoice matching, reorder alerts, collections and sales reporting.",
    },
    log: {
      label: "An example night",
      boot: [["Order inbox", "read-only"], ["Accounting", "connected"], ["Purchasing", "a person approves", true]],
      rows: [
        ["10:05 PM", "Read 23 customer orders from emails and PDF purchase orders"],
        ["10:12 PM", "Entered 21 as draft orders; 2 held: item codes not recognized", true],
        ["11:30 PM", "Matched 46 supplier invoices to purchase orders and receipts"],
        ["1:00 AM", "Reorder list built: 9 items below their minimum"],
        ["2:15 AM", "Statements drafted for 7 customers with past-due balances"],
        ["6:50 AM", "Morning summary: orders in, invoices posted, what’s low, who’s overdue"],
      ],
      foot: "An example. Yours runs on your own orders.",
    },
    handles: {
      kicker: "What piles up",
      h2: "Volume, re-keyed by hand",
      intro: "The same order, invoice or stock count typed into one system after another.",
      cards: [
        ["Order entry", "Orders that arrive by email or as PDF purchase orders are read and entered as draft orders for your team to check, with anything unclear held for a person.", "custom-automation"],
        ["Supplier invoices", "Matched to purchase orders and what was received, posted, and lined up for payment by their due dates.", "invoice-automation"],
        ["Reorder alerts", "Stock checked against your minimums every night, with a reorder list ready for whoever does the buying.", "custom-automation"],
        ["Collections", "Overdue balances by customer, with statements and reminders drafted for you to send.", "reporting-automation"],
        ["Sales by rep, customer and product", "The weekly numbers built overnight from your accounting system and store, checked against the source.", "reporting-automation"],
        ["Apps that don’t talk", "Your online store, accounting system and warehouse spreadsheets kept in step, instead of being typed in twice.", "custom-automation"],
      ],
    },
    person: {
      kicker: "What stays with you",
      h2: "Your margins, your call",
      items: [
        ["Pricing", "Prices, discounts and credit terms stay with you. Anything unusual on an order is held, not guessed."],
        ["Money", MONEY],
        ["Purchasing", "Reorder lists are prepared for a person to approve. Nothing is ordered on its own."],
        ["Your customers", "Statements and reminders go out under your business name, in words you approved."],
      ],
    },
    fit: {
      items: [
        "Orders arrive by email and get typed in by hand.",
        "Someone matches supplier invoices to purchase orders every week.",
        "You find out about low stock when a customer asks for it.",
        "Collections happen when someone remembers.",
      ],
      tools: ["QuickBooks", "Xero", "Sage", "NetSuite", "Shopify", "Excel", "Google Sheets", "Gmail", "Outlook"],
    },
    faq: [
      ["Our customers send orders in every format. Can it cope?", "Emails, PDFs and spreadsheets, yes. Anything it can’t read with confidence is held for a person with the original attached, rather than guessed at."],
      ["Do we have to change our item codes?", "No. It works from your price list and past orders, and holds anything that doesn’t match for a person."],
      ["How long does a first build take?", SHIP],
    ],
    cta: {
      h2: "Tell us where the re-keying happens",
      p: "A free 20-minute call. Tell us how orders, invoices and stock move today, and we’ll tell you plainly what’s worth automating.",
    },
  },

  {
    slug: "clinics",
    crumb: "Clinics",
    title: "Automation for Clinics in Kitchener-Waterloo | Third Shift",
    description: "For dental, physiotherapy, chiropractic and veterinary clinics in Waterloo Region: supplier invoices, inquiries, staff schedules and monthly numbers, automated.",
    h1: "Less time on paperwork, <em>more with patients.</em>",
    lede: "Dental, physiotherapy, chiropractic and veterinary clinics run on front-desk time: supplier invoices, inquiries, schedules and the month-end numbers. Third Shift builds automations for the business side of the clinic, around the clinic software you already use.",
    more: "The business side of the clinic: supplier invoices, inquiries, schedules and numbers.",
    schema: {
      name: "AI automation for clinics",
      serviceType: "Business process automation",
      audience: "Dental, physiotherapy, chiropractic and veterinary clinics",
      description: "Business-side office work for clinics in Waterloo Region, automated: supplier invoices, website inquiries, staff schedules and timesheets, supply reorders and monthly reporting.",
    },
    log: {
      label: "An example night",
      boot: [["Supplier inbox", "read-only"], ["Accounting", "connected"], ["Patient records", "not touched", true]],
      rows: [
        ["10:10 PM", "Picked up 18 supplier invoices: equipment, supplies and cleaning"],
        ["10:14 PM", "Matched 16 to orders and posted them; 2 held for review", true],
        ["11:00 PM", "Website inquiries acknowledged with the booking link"],
        ["11:30 PM", "Next week’s staff schedule sent to the team"],
        ["2:00 AM", "Monthly numbers built: revenue, supply and staffing costs"],
        ["6:45 AM", "Morning summary sent to the office manager"],
      ],
      foot: "An example. Yours runs on your own clinic’s work.",
    },
    handles: {
      kicker: "What piles up",
      h2: "The business side of the clinic",
      intro: "Patient care stays where it is. These are the jobs around it.",
      cards: [
        ["Supplier invoices", "Equipment, supply and service invoices matched, posted and lined up for payment, with anything odd held for the office manager.", "invoice-automation"],
        ["New inquiries", "Website inquiries get a quick reply with your booking link. Because people often mention symptoms, what gets logged, and where, is agreed with you first.", "lead-follow-up"],
        ["Staff schedules and timesheets", "Schedules sent to the team, hours checked against them, and payroll prep ready for approval.", "custom-automation"],
        ["Supplies and reorders", "Supply counts checked against your minimums, with a reorder list ready for whoever places the orders.", "custom-automation"],
        ["The monthly numbers", "Revenue, supply costs and staffing costs from your accounting system, built overnight and checked against the source. Patient balances stay in your clinic software.", "reporting-automation"],
        ["Month-end checklists", "The close steps run in order, each one logged, so month-end doesn’t depend on one person’s memory.", "process-automation"],
      ],
    },
    person: {
      kicker: "What stays with you",
      h2: "Patient privacy stays with you",
      items: [
        ["Patient records", "Patient records stay in your clinic software. An automation only touches what its job needs, and most of this work doesn’t need patient details at all."],
        ["Planned with your privacy officer", "Anything that would handle patient information is planned with your privacy officer before it’s built."],
        ["Money", MONEY],
        ["AI and your data", "Where an AI model reads a document, we use business-grade services that don’t train on your data."],
      ],
    },
    fit: {
      items: [
        "Your front desk spends evenings on paperwork.",
        "Supplier invoices are keyed in by hand.",
        "The monthly numbers take a day to put together.",
        "Month-end depends on one person.",
      ],
      tools: ["QuickBooks", "Xero", "Sage", "Gmail", "Outlook", "Excel", "Google Sheets"],
    },
    faq: [
      ["Do you work inside our clinic software?", "Usually not. Most of what we’d automate is on the business side, around it. If a build needs the clinic software, we use what it allows, read-only wherever possible."],
      ["What about patient privacy?", "Most of this work doesn’t need patient information. Anything that would is planned with you and your privacy officer first, and only goes ahead if it fits your clinic’s privacy policies."],
      ["What does a build cost?", PRICE],
    ],
    cta: {
      h2: "Tell us what keeps the front desk late",
      p: "A free 20-minute call. Tell us which office jobs take the most time, and we’ll tell you plainly what’s worth automating.",
    },
  },

  {
    slug: "professional-services",
    crumb: "Professional services",
    title: "Automation for Professional Firms in Kitchener | Third Shift",
    description: "For accounting firms, insurance brokerages and other professional offices in Waterloo Region: document chasing, client onboarding and billing, automated.",
    h1: "Hours back <em>from the admin.</em>",
    lede: "Accounting and bookkeeping firms, insurance brokerages, engineering and design offices: the client work pays, and the admin around it doesn’t. Third Shift builds automations for that admin: chasing documents, onboarding clients, billing, and the month-end routine.",
    more: "Documents chased, clients onboarded, billing and month-end kept moving.",
    schema: {
      name: "AI automation for professional services firms",
      serviceType: "Business process automation",
      audience: "Accounting firms, insurance brokerages and other professional services offices",
      description: "Admin work for professional services firms in Waterloo Region, automated: client document reminders, onboarding, billing from approved time, inquiries and month-end reporting.",
    },
    log: {
      label: "An example night",
      boot: [["Inbox", "connected"], ["Accounting", "connected"], ["Invoices", "you review them", true]],
      rows: [
        ["8:30 PM", "Document reminders sent to 6 clients missing year-end papers"],
        ["9:15 PM", "New client set up in three systems, engagement letter drafted"],
        ["11:00 PM", "Time entries checked: 3 missing a client code, flagged", true],
        ["1:00 AM", "Invoices drafted from approved time, ready to review"],
        ["2:30 AM", "Overdue accounts list built for Monday"],
        ["6:45 AM", "Morning summary: what’s waiting on clients, what’s ready to bill"],
      ],
      foot: "An example. Yours runs on your own clients.",
    },
    handles: {
      kicker: "What piles up",
      h2: "The admin around the client work",
      intro: "None of it is billable, and all of it has to happen.",
      cards: [
        ["Chasing documents", "Clients missing papers get polite reminders on a schedule, and the reminders stop once the documents are in, or when you say so.", "process-automation"],
        ["Client onboarding", "New clients set up in each system, engagement letters drafted from your template, and the welcome email sent.", "custom-automation"],
        ["Time to invoice", "Where you bill for time, entries are checked for gaps and invoices drafted from approved time for you to review and send.", "custom-automation"],
        ["Inquiries", "Website and email inquiries logged and replied to within minutes, with a link to book a call.", "lead-follow-up"],
        ["Month-end and reporting", "Unbilled work in progress, overdue accounts and hours by person, built overnight and checked against the source.", "reporting-automation"],
        ["Your own payables", "Supplier and subscription invoices coded, posted and lined up for approval.", "invoice-automation"],
      ],
    },
    person: {
      kicker: "What stays with you",
      h2: "Your judgment stays yours",
      items: [
        ["Client advice", "Nothing the automation does is advice. It handles the admin around your work and passes anything that needs judgment to you."],
        ["Confidentiality", "Client files stay in the systems you already use, with the least access that does the job. Where an AI model reads a document, it’s a business-grade service that doesn’t train on your data."],
        ["What clients see", "Every message goes out under your firm’s name, in words you approved, and you can stop reminders for any client at any time."],
        ["Money", MONEY],
      ],
    },
    fit: {
      items: [
        "Year-end means weeks of chasing clients for documents.",
        "Billing waits for a quiet day, so time sits unbilled.",
        "Onboarding a client means typing their details into four systems.",
        "Month-end reporting falls to the same person every time.",
      ],
      tools: ["QuickBooks", "Xero", "Sage", "Gmail", "Outlook", "Excel", "Google Sheets", "HubSpot"],
    },
    faq: [
      ["We’re an accounting firm. Isn’t this what we do for clients?", "You do the accounting. We automate the admin around it, like document chasing, onboarding and billing, so the firm’s own hours go further. If your practice software already chases documents, we leave that alone and work on what it doesn’t."],
      ["Will it send anything to clients without us?", "Only the messages you’ve approved, like document reminders, and you can stop them for any client at any time. Anything new waits for you."],
      ["How long does a first build take?", SHIP],
    ],
    cta: {
      h2: "Tell us where the non-billable hours go",
      p: "A free 20-minute call. Tell us which admin jobs eat into the week, and we’ll tell you plainly what’s worth automating.",
    },
  },

  {
    slug: "manufacturers",
    crumb: "Manufacturers",
    title: "Automation for Manufacturers in Kitchener-Waterloo | Third Shift",
    description: "For small manufacturers and machine shops in Waterloo Region: purchase orders, supplier invoices, material reorders, timesheets and weekly numbers, automated.",
    h1: "The shop floor runs. <em>So should the office.</em>",
    lede: "Small manufacturers and machine shops keep the floor moving and fit the office work in between: purchase orders, supplier invoices, material reorders, timesheets and the weekly numbers. Third Shift builds automations for that office work, inside the systems you already run.",
    more: "Purchase orders, supplier invoices, material reorders, timesheets and weekly numbers.",
    schema: {
      name: "AI automation for manufacturers",
      serviceType: "Business process automation",
      audience: "Small manufacturers and machine shops",
      description: "Office work for small manufacturers in Waterloo Region, automated: supplier invoice matching, material reorder alerts, timesheets and payroll prep, RFQ and quote follow-up, and weekly reporting.",
    },
    log: {
      label: "An example night",
      boot: [["Purchasing inbox", "read-only"], ["Accounting", "connected"], ["Orders", "a person approves", true]],
      rows: [
        ["6:00 PM", "Shift timesheets collected and checked against the schedule"],
        ["9:20 PM", "Matched 31 supplier invoices to purchase orders and receipts"],
        ["9:24 PM", "1 held: steel price above the PO by 8%", true],
        ["11:00 PM", "Material below minimum: reorder list ready for purchasing"],
        ["2:00 AM", "Weekly report built: shipments, open orders, overtime"],
        ["6:30 AM", "Morning summary sent to the shop manager"],
      ],
      foot: "An example. Yours runs on your own shop.",
    },
    handles: {
      kicker: "What piles up",
      h2: "Office work that waits on the floor",
      intro: "The paperwork that gets done between jobs, or after everyone has gone home.",
      cards: [
        ["Purchase orders and supplier invoices", "Invoices matched to purchase orders and receipts, posted and lined up for payment by due date, with price and quantity differences held.", "invoice-automation"],
        ["Material and reorder alerts", "Stock checked against your minimums, with a reorder list ready for purchasing to approve.", "custom-automation"],
        ["Timesheets and payroll prep", "Shift hours checked against the schedule, overtime flagged, and payroll prep ready for approval.", "custom-automation"],
        ["The weekly numbers", "Shipments, open orders, overtime and overdue accounts, built overnight from the systems they live in.", "reporting-automation"],
        ["RFQs and quotes", "RFQs logged and acknowledged, and quotes followed up on schedule, so new work doesn’t sit in an inbox.", "lead-follow-up"],
        ["Checklists and routines", "Month-end, maintenance reminders and the Friday routine, run on schedule and logged.", "process-automation"],
      ],
    },
    person: {
      kicker: "What stays with you",
      h2: "The decisions stay on your side",
      items: [
        ["Purchasing", "Reorder lists and purchase orders are prepared for a person to approve. Nothing is ordered on its own."],
        ["Money", MONEY],
        ["Exceptions", "Price changes, short shipments and anything outside your rules are held with the reason, not pushed through."],
        ["Access", "Read-only wherever possible, a separate login for each automation, and access you can revoke at any time."],
      ],
    },
    fit: {
      items: [
        "Supplier invoices get matched to purchase orders by hand.",
        "You find out material is low when a job is waiting on it.",
        "Timesheets come in on paper or in a spreadsheet.",
        "The weekly numbers are pulled together by hand from three places.",
      ],
      tools: ["QuickBooks", "Xero", "Sage", "NetSuite", "Excel", "Google Sheets", "Gmail", "Outlook"],
    },
    faq: [
      ["We have an ERP. Would you replace it?", "No. We build around the systems you run, reading from them and posting to them where they allow. If your ERP already handles reorder points, we leave that alone and work on what it doesn’t."],
      ["Does it touch the machines?", "No. This is office work: purchasing, invoices, stock, hours and reports. The shop floor stays as it is."],
      ["What does a build cost?", PRICE],
    ],
    cta: {
      h2: "Tell us what the office is behind on",
      p: "A free 20-minute call. Tell us how purchasing, invoices and hours work today, and we’ll tell you plainly what’s worth automating.",
    },
  },
];

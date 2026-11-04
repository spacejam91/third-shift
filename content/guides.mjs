// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The guide pages: one Ontario date or document a small business has to keep track of, explained from
// the official page that sets it. tools/build-pages.mjs turns each entry into site/<slug>.html.
//
// Rules for this file, on top of the ones in content/services.mjs:
// - Every fact comes from the official pages in `sources`, in our own words, checked on `checked`.
//   If the official page doesn't say it, the guide doesn't either.
// - No legal advice. The business decides and files; we keep the records and the dates.
// - Re-check the facts against the sources before changing `checked`.

export const GUIDES = [
  {
    slug: "aoda-compliance-report",
    crumb: "Accessibility compliance report",
    title: "Ontario Accessibility Compliance Report 2026 | Third Shift",
    description: "Ontario businesses and non-profits with 20 or more employees file an accessibility compliance report by December 31, 2026. Who files, and how it goes in.",
    h1: "The accessibility report is due <em>December 31.</em>",
    lede: "Ontario businesses and non-profits with 20 or more employees file an accessibility compliance report every three years, and this round closes on December 31, 2026. Here is who files, what to have ready and how it goes in, from the province’s own pages.",
    more: "Who files the report due December 31, 2026, what to have ready and who signs it.",
    linkText: "Guide: the accessibility compliance report",
    published: "2026-11-04",
    checked: "2026-11-04",
    about: "Accessibility for Ontarians with Disabilities Act compliance report",
    glance: {
      label: "At a glance",
      rows: [
        ["Who", "Businesses and non-profits in Ontario with 20 or more employees"],
        ["Due", "December 31, 2026, then every three years"],
        ["Where", "Online, through the Accessibility Compliance Reporting Portal"],
        ["Signs", "A senior officer who can confirm it’s complete and accurate"],
        ["If late", "Enforcement, which can include financial penalties"],
      ],
    },
    facts: {
      kicker: "What it is",
      h2: "A check on the rules that already apply",
      intro: "The report confirms that your organization has met the accessibility requirements that apply to it under the AODA.",
      items: [
        ["Who files", "Businesses and non-profits in Ontario with 20 or more employees. Designated public-sector organizations file too, on their own two-year cycle."],
        ["When", "Every three years. This round’s deadline is December 31, 2026."],
        ["Who signs", "A senior officer with the legal authority to say the report is complete and accurate. They’re named as the certifier when you file."],
        ["If it’s missed", "The ministry audits and inspects organizations to check compliance. One that doesn’t file could face enforcement, which can include financial penalties."],
      ],
    },
    rules: {
      kicker: "What it confirms",
      h2: "What the rules ask of you",
      intro: "The requirements grow with headcount. These are the main ones; ontario.ca has the full list, including accommodation and return-to-work plans.",
      items: [
        "With 20 to 49 employees: accessibility policies in place, and every employee and volunteer trained on the Ontario Human Rights Code, accessible customer service and the accessibility parts of their own job.",
        "With 50 or more: those policies written down, shared with staff and customers, and available in an accessible format on request.",
        "With 50 or more: a multi-year accessibility plan, posted on your website and reviewed at least every five years.",
        "With 50 or more: a written record of training, with how many people were trained and when.",
      ],
    },
    how: {
      id: "how-to-file",
      jump: "How to file it",
      kicker: "How it goes in",
      h2: "Four steps, all online",
      intro: "The report is filed through the province’s Accessibility Compliance Reporting Portal.",
      steps: [
        ["Gather what you need", "Your organization’s legal name, its business number (the nine-digit BN from your tax return), your number of employees, and your certifier’s name and contact details."],
        ["Open the portal", "Go to the Accessibility Compliance Reporting Portal, create an account with an email address and a password, and sign in."],
        ["Start a new submission", "Choose New Submission, then Accessibility Compliance Report, and answer the compliance questions."],
        ["Submit and keep the number", "Once it’s submitted, the certifier and the primary contact each get an email with a confirmation number. File it with your records."],
      ],
    },
    help: {
      kicker: "Where we come in",
      h2: "We keep the records. You sign.",
      intro: "We don’t file for you or give legal advice. We build the automation that keeps the records this report depends on, and puts the next deadline on the calendar long before it arrives.",
      items: [
        ["Training records", "Who was trained, on what and when, gathered into one list from what you already have, with new hires flagged until they’re done."],
        ["Policies and the plan", "Your accessibility policies on file and, with 50 or more employees, the multi-year plan, with a reminder before its review comes due."],
        ["The next deadline", "The next report date on the calendar three years out, with what the certifier needs ready ahead of time."],
        ["Every run logged", "A plain-English record of what was checked and chased, so you can show what was done and when."],
      ],
      link: "compliance-automation",
    },
    sources: [
      ["How to complete your accessibility compliance report", "https://www.ontario.ca/page/how-complete-your-accessibility-compliance-report", "ontario.ca, updated February 19, 2026"],
      ["Accessibility rules for businesses and non-profits", "https://www.ontario.ca/page/accessibility-rules-businesses-and-non-profits", "ontario.ca, updated June 16, 2026"],
    ],
    faq: [
      ["We have fewer than 20 employees. Do we file?", "This report is for businesses and non-profits with 20 or more employees. If your number of employees, address, contact or status changes, ontario.ca says to update it through the portal."],
      ["We run several companies. One report or several?", "One form can cover up to 20 organizations, as long as they share the same organization category, employee range, certifier and answers to every compliance question. Otherwise each one files its own."],
      ["Is there a paper form?", "The report is filed online. The ministry offers the form in an alternative format on request, and its contact details are on the ontario.ca page."],
      ["Can you file it for us?", "No. A senior officer in your organization certifies the report, and what the rules require of your business is for you and your advisors to confirm. We keep the records and the dates so the work is ready when it’s time to file."],
    ],
    cta: {
      h2: "Tell us what you keep on file today",
      p: "A free 20-minute call. Tell us how you track training, policies and filings now, and we’ll tell you what’s worth automating.",
    },
  },

  {
    slug: "wsib-clearance-certificate",
    crumb: "WSIB clearance certificates",
    title: "WSIB Clearance Certificates for Contractors | Third Shift",
    description: "What a WSIB clearance certificate is, why you check one before a subcontractor starts, how long it lasts and how to look one up, from WSIB’s own pages.",
    h1: "Clearances on file <em>before day one.</em>",
    lede: "In Ontario construction, a subcontractor’s WSIB clearance has to be in place before the work starts and for as long as it lasts. A clearance runs up to 90 days, so a long job needs more than one. Here is what one is, why it protects you and how to check it, from WSIB’s own pages.",
    more: "What a clearance is, why you check it before a subcontractor starts and how long it lasts.",
    linkText: "Guide: WSIB clearance certificates",
    published: "2026-11-04",
    checked: "2026-11-04",
    about: "WSIB clearance certificates",
    glance: {
      label: "At a glance",
      rows: [
        ["What", "Proof a business is registered and up to date with WSIB"],
        ["Lasts", "Up to 90 days; most end on the 20th of February, May, August or November"],
        ["Cost", "Free"],
        ["Check", "Online, with no login, by business name or other details"],
        ["Keep", "Clearance records for at least three years"],
      ],
    },
    facts: {
      kicker: "What it is",
      h2: "Proof your subcontractor is covered",
      intro: "A clearance is a number WSIB gives a registered business that is up to date on its premiums and reporting. Only businesses in good standing can get one.",
      items: [
        ["Why you check it", "When you hire a subcontractor, you’re the principal for that work. While their clearance is valid, WSIB won’t hold you liable for premiums and other amounts the subcontractor owes it. Without one, you may be liable for what they owe, up to the labour portion of your contract with them."],
        ["In construction, it’s required", "A clearance has to be in place before any construction work begins and for the whole job. Working without a valid one is an offence for the contractor and for whoever hired them, with fines of up to $100,000."],
        ["How long it lasts", "Up to 90 days from the date it’s issued. Most expire on the 20th of February, May, August and November, and WSIB issues the next one automatically if the account stays in good standing."],
        ["Long jobs", "The clearance has to cover the full length of the job, so if the work runs past the expiry date, you need the next one."],
      ],
    },
    how: {
      id: "how-to-check",
      jump: "How to check one",
      kicker: "How to check one",
      h2: "Look it up, save it, check it again",
      intro: "Looking up a clearance is free, and WSIB’s quick access service needs no login.",
      steps: [
        ["Open quick access clearances", "On wsib.ca, quick access clearances lets you find, view and download a clearance without an account."],
        ["Search for the business", "Search by business name, phone number, CRA business name, address, city or postal code."],
        ["Save it with the job", "Download the clearance and keep it on file. Principals and contractors have to keep clearance records for at least three years."],
        ["Check again before it runs out", "The next clearance isn’t available until after the renewal date. With a WSIB online services account, you can keep a list of your contractors and get reminder emails."],
      ],
    },
    help: {
      kicker: "Where we come in",
      h2: "We watch the dates. You decide who starts.",
      intro: "We don’t give legal advice or decide who works on your site. We build the automation that keeps the clearances on file, watches the dates and tells you what’s missing.",
      items: [
        ["On file before day one", "Each subcontractor’s clearance on file before they start, matched to the job, with a hold on anyone due on site without one."],
        ["Renewed before it lapses", "The expiry dates checked every night, and the next clearance asked for and filed after each renewal date."],
        ["Kept for the record", "Every clearance kept with the job, so you can show what was on file and when."],
        ["Insurance certificates too", "Subcontractors’ certificates of insurance kept with the same job, with their end dates watched the same way."],
      ],
      link: "compliance-automation",
    },
    sources: [
      ["Clearances", "https://www.wsib.ca/en/clearances", "wsib.ca, updated May 5, 2026"],
      ["Questions and answers: Clearances", "https://www.wsib.ca/en/clearancefaqs", "wsib.ca, updated July 20, 2026"],
      ["Clearance Certificate, policy 14-02-04", "https://www.wsib.ca/en/operational-policy-manual/clearance-certificate", "wsib.ca, published September 22, 2025"],
    ],
    faq: [
      ["Do I need one for a home renovation?", "WSIB says clearances aren’t required for contractors hired by a home’s resident, occupant or a family member for home repairs or renovations. A business hiring subcontractors is a different case."],
      ["Does it cost anything?", "Looking one up is free, and so are clearances. A newly registered business that needs one at registration usually pays a $250 advance, which WSIB credits toward its future premiums."],
      ["What if a subcontractor can’t get one?", "Only businesses that are registered and up to date with WSIB can get a clearance. If their account is marked ineligible, they have to bring it up to date first. Whether they can work for you in the meantime is a question for WSIB or your advisor."],
      ["Can you keep track of these for us?", "We build the automation that does it, in your own systems: clearances gathered from your inbox and drive, dates checked every night, and a morning list of what’s missing. You decide who works on your site."],
    ],
    cta: {
      h2: "Tell us how you track your subs",
      p: "A free 20-minute call. Tell us how clearances and certificates come in today, and we’ll tell you what’s worth automating.",
    },
  },
];

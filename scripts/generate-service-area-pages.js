const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const outputDir = path.join(root, "service-areas");
const phoneDisplay = "+91 92618 69245";
const phoneHref = "+919261869245";
const phoneDigits = "919261869245";
const phoneSchema = "+91-92618-69245";

const serviceAreas = [
  {
    slug: "faridabad",
    city: "Faridabad",
    region: "Haryana",
    network: "Delhi NCR",
    code: "FBD",
    headline: "Rooftop solar planning for Faridabad properties.",
    lead: "Your Energy supports Faridabad homeowners, housing societies, offices, factories, and institutions with structured solar assessment and project coordination.",
    context: "Faridabad projects can range from compact residential terraces to larger operational roofs. The right proposal starts by separating usable roof area from shade, access, and electrical constraints.",
    priority: "Review daytime consumption, sanctioned load, roof obstructions, meter location, and future expansion before finalising system capacity.",
  },
  {
    slug: "jodhpur",
    city: "Jodhpur",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "JDP",
    headline: "Clear solar decisions for Jodhpur rooftops.",
    lead: "Your Energy serves Jodhpur homes, hospitality properties, workshops, institutions, and commercial buildings through scheduled surveys and coordinated solar support.",
    context: "Jodhpur properties need proposals that account for roof material, dust exposure, safe maintenance access, and the way electricity is consumed across the day.",
    priority: "Confirm structural suitability, cleaning access, cable routing, operating load, and equipment placement before approving the design.",
  },
  {
    slug: "ajmer",
    city: "Ajmer",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "AJM",
    headline: "Practical rooftop solar support in Ajmer.",
    lead: "Your Energy helps Ajmer homeowners, institutions, hospitality teams, shops, and businesses evaluate solar with clear sizing, scope, and long-term service planning.",
    context: "A useful Ajmer assessment should connect the electricity bill with actual usable roof area instead of recommending capacity from property size alone.",
    priority: "Check monthly and seasonal consumption, shade windows, terrace access, meter arrangement, and maintenance responsibility at the survey stage.",
  },
  {
    slug: "kishangarh",
    city: "Kishangarh",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "KSG",
    headline: "Solar planning built around Kishangarh energy needs.",
    lead: "Your Energy coordinates rooftop solar assessments for Kishangarh homes, workshops, warehouses, institutions, and commercial properties.",
    context: "Projects with machinery, storage, or extended working hours need a load-led design that distinguishes daytime demand from evening and backup requirements.",
    priority: "Map operating hours, major electrical loads, roof zones, cable distance, and shutdown requirements before preparing the commercial proposal.",
  },
  {
    slug: "niwai",
    city: "Niwai",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "NIW",
    headline: "Straightforward solar guidance for Niwai.",
    lead: "Your Energy serves Niwai homes, shops, clinics, schools, and local businesses with rooftop surveys, system planning, and installation coordination.",
    context: "For smaller properties, careful placement and realistic consumption analysis matter more than simply choosing the largest system that can fit on the roof.",
    priority: "Review the latest bill, roof dimensions, shade, water availability for cleaning, and safe inverter placement before sizing the system.",
  },
  {
    slug: "bhilwara",
    city: "Bhilwara",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "BHL",
    headline: "Decision-ready solar planning for Bhilwara.",
    lead: "Your Energy supports Bhilwara residences, operating businesses, warehouses, institutions, and industrial properties with evidence-based rooftop solar planning.",
    context: "Higher-consumption properties require interval-aware load discussions, clear production assumptions, and a design that can be maintained without disrupting operations.",
    priority: "Validate daytime base load, roof strength, equipment zones, cable routes, safety isolation, and monitoring needs before quotation approval.",
  },
  {
    slug: "behror",
    city: "Behror",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "BHR",
    headline: "Local solar coordination for Behror projects.",
    lead: "Your Energy serves Behror homes, factories, warehouses, institutions, and commercial properties through scheduled technical visits and project support.",
    context: "Behror projects may combine residential and operational requirements, so generation goals, working hours, and backup expectations should be discussed separately.",
    priority: "Assess load profile, transformer or connection limits where relevant, roof access, shadow-free zones, and future capacity plans.",
  },
  {
    slug: "shahpura",
    city: "Shahpura",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "SHP",
    headline: "Thoughtful rooftop solar planning in Shahpura.",
    lead: "Your Energy helps Shahpura homeowners, shops, schools, clinics, and businesses move from initial interest to a practical solar project plan.",
    context: "A reliable proposal should reflect the property's real consumption, available roof zones, and the customer's maintenance capacity after installation.",
    priority: "Start with a recent electricity bill, roof measurements, shade observations, meter details, and a clear understanding of the customer's objective.",
  },
  {
    slug: "jhunjhunu",
    city: "Jhunjhunu",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "JHJ",
    headline: "Rooftop solar guidance for Jhunjhunu customers.",
    lead: "Your Energy supports Jhunjhunu homes, schools, clinics, institutions, and businesses with solar consultation, design coordination, and long-term planning.",
    context: "Properties with open terraces still require shade, structure, drainage, cable routing, and safe access checks before the usable solar area is confirmed.",
    priority: "Verify bill history, connection type, roof condition, installation access, inverter environment, and cleaning arrangements during assessment.",
  },
  {
    slug: "nawalgarh",
    city: "Nawalgarh",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "NWL",
    headline: "Clear solar assessment for Nawalgarh rooftops.",
    lead: "Your Energy serves Nawalgarh residences, schools, hospitality properties, shops, and commercial buildings through coordinated solar project support.",
    context: "The best system size depends on electricity use and roof constraints together, especially where terraces also support water tanks, access paths, or other daily uses.",
    priority: "Protect essential terrace access while reviewing shade, structural condition, monthly consumption, meter location, and equipment service space.",
  },
  {
    slug: "alwar",
    city: "Alwar",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "ALW",
    headline: "Solar planning for Alwar homes and enterprises.",
    lead: "Your Energy coordinates rooftop solar for Alwar homeowners, housing societies, institutions, commercial properties, and industrial customers.",
    context: "Alwar projects span different property types, making roof use, load timing, approval responsibilities, and after-sales planning important parts of the first discussion.",
    priority: "Document the consumption profile, usable roof, access limitations, electrical connection, stakeholder approvals, and monitoring expectations.",
  },
  {
    slug: "bhiwadi",
    city: "Bhiwadi",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "BWD",
    headline: "Commercial and residential solar support in Bhiwadi.",
    lead: "Your Energy serves Bhiwadi factories, warehouses, offices, housing communities, and homes with load-led solar assessment and execution planning.",
    context: "Operational roofs need production estimates tied to working-hour demand, plus a safe execution plan that respects access, shutdowns, and ongoing maintenance.",
    priority: "Study daytime base load, sanctioned capacity, roof structure, equipment clearances, cable routes, safety systems, and monitoring requirements.",
  },
  {
    slug: "neemrana",
    city: "Neemrana",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "NMR",
    headline: "Engineering-led solar planning for Neemrana.",
    lead: "Your Energy supports Neemrana factories, warehouses, institutions, commercial campuses, and homes through scheduled surveys and solar project coordination.",
    context: "Larger roofs can support meaningful capacity, but the design must still follow load behaviour, structural zones, electrical infrastructure, and operational safety.",
    priority: "Confirm interval demand where available, structural loading, interconnection point, cable distance, shutdown windows, and maintenance access.",
  },
  {
    slug: "viratnagar",
    city: "Viratnagar",
    region: "Rajasthan",
    network: "Rajasthan",
    code: "VRT",
    headline: "Accessible rooftop solar guidance in Viratnagar.",
    lead: "Your Energy serves Viratnagar homes, shops, schools, clinics, and businesses with solar assessment, quotation clarity, and coordinated execution.",
    context: "A practical system should fit both the customer's electricity use and the property's ability to support safe installation and routine cleaning.",
    priority: "Review bill history, roof condition, shade, access, inverter placement, cable route, and cleaning arrangements before final design.",
  },
  {
    slug: "narnaul",
    city: "Narnaul",
    region: "Haryana",
    network: "Haryana",
    code: "NRN",
    headline: "Rooftop solar planning for Narnaul properties.",
    lead: "Your Energy helps Narnaul homeowners, clinics, schools, shops, and businesses evaluate solar with clear technical and commercial assumptions.",
    context: "Narnaul assessments should connect monthly bills with roof usability, shade, maintenance access, and realistic generation expectations.",
    priority: "Share recent consumption, connection details, roof information, equipment preferences, and future load plans before quotation finalisation.",
  },
  {
    slug: "mahendragarh",
    city: "Mahendragarh",
    region: "Haryana",
    network: "Haryana",
    code: "MHG",
    headline: "Practical solar support across Mahendragarh.",
    lead: "Your Energy serves Mahendragarh homes, educational properties, clinics, shops, and operating businesses through planned site visits and project coordination.",
    context: "The initial assessment should identify the loads solar can offset, the roof zones that remain usable, and the responsibilities for system care.",
    priority: "Check consumption patterns, terrace use, shade, structural condition, meter position, cable path, and maintenance ownership.",
  },
  {
    slug: "bhiwani",
    city: "Bhiwani",
    region: "Haryana",
    network: "Haryana",
    code: "BHW",
    headline: "Clear rooftop solar decisions for Bhiwani.",
    lead: "Your Energy supports Bhiwani homeowners, institutions, warehouses, shops, and businesses with system planning and installation coordination.",
    context: "Different operating schedules and roof types require separate assumptions for generation, self-consumption, equipment placement, and maintenance access.",
    priority: "Review bill history, daytime demand, roof construction, shade, electrical connection, cable distance, and monitoring requirements.",
  },
  {
    slug: "charkhi-dadri",
    city: "Charkhi Dadri",
    region: "Haryana",
    network: "Haryana",
    code: "CKD",
    headline: "Solar assessment designed for Charkhi Dadri.",
    lead: "Your Energy serves Charkhi Dadri residences, schools, clinics, shops, and commercial properties through coordinated rooftop solar support.",
    context: "A responsible proposal should preserve safe roof access and use verified consumption rather than relying on broad capacity assumptions.",
    priority: "Confirm recent bills, terrace dimensions, shadow zones, roof condition, inverter location, and routine cleaning access.",
  },
  {
    slug: "kund",
    city: "Kund",
    region: "Haryana",
    network: "Haryana",
    code: "KND",
    headline: "Local rooftop solar support for Kund.",
    lead: "Your Energy serves Kund homes, shops, institutions, and local businesses through scheduled assessment, design coordination, and project support.",
    context: "For Kund properties, early clarity on the bill, roof, connection, and service expectations helps prevent avoidable scope changes later.",
    priority: "Review consumption, usable terrace area, shade, access, meter location, equipment space, and maintenance arrangements before sizing.",
  },
];

function schemaFor(area) {
  const canonical = `https://www.yourenergy.co.in/service-areas/${area.slug}.html`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonical}#service`,
    name: `Rooftop Solar Services in ${area.city}`,
    serviceType: "Rooftop solar consultation, design, and installation coordination",
    url: canonical,
    provider: {
      "@type": "Organization",
      name: "Your Energy",
      legalName: "FLYINGAPES TECHNOLOGIES PRIVATE LIMITED",
      url: "https://www.yourenergy.co.in/",
      telephone: phoneSchema,
    },
    areaServed: {
      "@type": "City",
      name: area.city,
      containedInPlace: { "@type": "State", name: area.region },
    },
  };
}

function renderPage(area) {
  const canonical = `https://www.yourenergy.co.in/service-areas/${area.slug}.html`;
  const whatsapp = `https://wa.me/${phoneDigits}?text=Hello%20Your%20Energy%2C%20I%20need%20solar%20help%20in%20${encodeURIComponent(area.city)}.`;
  const description = `Your Energy provides rooftop solar assessment, design, installation coordination, and support in ${area.city}, ${area.region}. Call ${phoneDisplay} to discuss your property.`;

  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solar Panel Installation in ${area.city} | Your Energy</title>
  <meta name="description" content="${description}">
  <meta name="theme-color" content="#08203f">
  <meta property="og:title" content="Solar Panel Installation in ${area.city} | Your Energy">
  <meta property="og:description" content="${area.lead}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Your Energy">
  <meta property="og:url" content="${canonical}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/favicon.ico?v=20260803-exact-logo" sizes="any">
  <link rel="icon" href="/assets/favicon.svg?v=20260803-exact-logo" sizes="any" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="../styles.css?v=20260804-service-areas-v1">
  <script type="application/ld+json">
${JSON.stringify(schemaFor(area), null, 2)}
  </script>
</head>
<body class="location-page service-area-page">
  <header class="site-header" id="top">
    <div class="container header-shell">
      <a class="brand" href="../index.html" aria-label="Your Energy home"><picture><source srcset="../assets/logo-your-energy-web.webp" type="image/webp"><img src="../assets/logo-your-energy-web.png" alt="Your Energy logo"></picture></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-label="Open menu">Menu</button>
      <div class="nav-panel" data-nav-panel><nav class="site-nav" aria-label="Primary"><a href="../index.html#about">About</a><a href="../index.html#solutions">Solutions</a><a href="../index.html#process">Process</a><a href="../index.html#faq">FAQ</a><a href="../blog.html">Blog</a><a href="#contact">Contact</a><a class="nav-whatsapp-cta" href="${whatsapp}" target="_blank" rel="noreferrer">Ask on WhatsApp</a></nav></div>
    </div>
  </header>

  <main>
    <section class="location-hero">
      <div class="container location-hero-grid">
        <div class="location-hero-copy">
          <nav class="location-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="index.html">Service Areas</a><span>/</span><span>${area.city}</span></nav>
          <span class="eyebrow">Solar Service Area &middot; ${area.network}</span>
          <h1>${area.headline}</h1>
          <p class="location-hero-lead">${area.lead}</p>
          <div class="location-hero-actions"><a class="button button-primary" href="../index.html#assessment">Get a Free Assessment</a><a class="button button-secondary" href="tel:${phoneHref}">Call ${phoneDisplay}</a><a class="location-text-link" href="${whatsapp}" target="_blank" rel="noreferrer">Discuss on WhatsApp &rarr;</a></div>
        </div>

        <aside class="location-office-card service-area-card" data-code="${area.code}" aria-label="${area.city} service information">
          <span class="location-card-label">Active service area</span>
          <h2>${area.city} Service Team</h2>
          <p class="service-area-place">${area.city}, ${area.region}</p>
          <div class="location-office-contact"><a href="tel:${phoneHref}">${phoneDisplay}</a><a href="mailto:yourenergy007@gmail.com">yourenergy007@gmail.com</a><p class="location-office-note">Your Energy serves this city through scheduled site visits and project coordination. This is a service-area page, not a physical office listing.</p></div>
        </aside>
      </div>
    </section>

    <section class="container location-proof" aria-label="${area.city} solar support highlights">
      <div class="location-proof-grid"><article><strong>Scheduled site assessment</strong><span>Visits are coordinated according to property location, project scope, and team availability.</span></article><article><strong>One shared contact number</strong><span>Call ${phoneDisplay} for residential, commercial, or housing-society enquiries.</span></article><article><strong>Clear service-area status</strong><span>${area.city} is an active service city and is not represented as a separate Your Energy office.</span></article></div>
    </section>

    <section class="location-section location-section-white">
      <div class="container">
        <div class="location-section-head"><div><span class="eyebrow">Planning for ${area.city}</span><h2>Start with the property, not a preset package.</h2></div><p>${area.context}</p></div>
        <div class="location-solution-grid">
          <article class="location-solution-card"><span class="location-card-index">01</span><h3>Homes and residential roofs</h3><p>Assess bill history, usable terrace area, shade, connection type, residential subsidy eligibility, and long-term maintenance needs.</p></article>
          <article class="location-solution-card"><span class="location-card-index">02</span><h3>Businesses and institutions</h3><p>Match proposed generation with operating-hour demand, electrical infrastructure, roof access, safety requirements, and commercial objectives.</p></article>
          <article class="location-solution-card"><span class="location-card-index">03</span><h3>Housing societies</h3><p>Review common-area loads, committee readiness, roof rights, approvals, metering, installation access, and ongoing service responsibility.</p></article>
        </div>
      </div>
    </section>

    <section class="location-section location-process-section">
      <div class="container">
        <div class="location-section-head"><div><span class="eyebrow eyebrow-dark">Assessment priorities</span><h2>Resolve the important questions early.</h2></div><p>${area.priority}</p></div>
        <div class="location-process-grid"><article class="location-process-card"><span>01</span><h3>Requirement review</h3><p>Understand the customer's bill, property type, objective, budget context, and expected project timeline.</p></article><article class="location-process-card"><span>02</span><h3>Technical survey</h3><p>Measure usable roof, shade, access, structure, cable route, meter position, and safe equipment zones.</p></article><article class="location-process-card"><span>03</span><h3>Design and scope</h3><p>Document capacity, equipment, production assumptions, inclusions, exclusions, and execution responsibilities.</p></article><article class="location-process-card"><span>04</span><h3>Delivery and support</h3><p>Coordinate installation, testing, documentation, monitoring, handover, and maintenance planning.</p></article></div>
      </div>
    </section>

    <section class="location-section">
      <div class="container location-faq-grid">
        <div class="location-faq-intro"><span class="eyebrow">${area.city} FAQs</span><h2>Know how local service works.</h2><p>Final sizing, pricing, generation, and eligibility depend on current rules and a property-specific technical assessment.</p></div>
        <div class="location-faq-list">
          <details class="faq-item"><summary>Does Your Energy serve ${area.city}?</summary><p>Yes. ${area.city} is within our active service network. Site visits are scheduled according to project location, scope, and team availability.</p></details>
          <details class="faq-item"><summary>Is this page for a physical Your Energy office?</summary><p>No. This page confirms service coverage in ${area.city}; it is not a physical office listing. Verified office locations are available in our <a href="../locations/">official office directory</a>.</p></details>
          <details class="faq-item"><summary>What should I share for an initial estimate?</summary><p>Share a recent electricity bill, property type, city, approximate roof information, and your contact number. A survey is required before final design.</p></details>
          <details class="faq-item"><summary>Can I call the same number for residential and commercial solar?</summary><p>Yes. Call ${phoneDisplay} and the team will route your enquiry according to the property and project requirement.</p></details>
        </div>
      </div>
    </section>

    <section class="location-section"><div class="container location-contact-card"><div><span class="eyebrow eyebrow-dark">Start with your latest bill</span><h2>Discuss your ${area.city} solar project.</h2><p>Tell us the property type, monthly electricity bill, city, and phone number. We will start with an indicative assessment and coordinate the next appropriate step.</p></div><div class="location-contact-actions"><a class="button button-primary" href="../index.html#assessment">Start Free Assessment</a><a class="button button-secondary" href="tel:${phoneHref}">Call ${phoneDisplay}</a></div></div></section>
  </main>

  <footer class="site-footer" id="contact">
    <div class="container footer-shell"><div class="footer-brand"><picture><source srcset="../assets/logo-your-energy-footer-reverse.webp" type="image/webp"><img src="../assets/logo-your-energy-footer-reverse.png" alt="Your Energy logo"></picture><p>Rooftop solar consultation, planning, installation coordination, and long-term support for homes, businesses, and housing societies.</p></div><div class="footer-links"><strong class="footer-column-title">Explore</strong><a href="../index.html#about">About</a><a href="../index.html#solutions">Solutions</a><a href="index.html">All Service Areas</a><a href="../locations/">Official Offices</a><a href="../blog.html">Blog</a><a href="mailto:yourenergy007@gmail.com">Email Us</a></div><div class="footer-meta"><strong class="footer-column-title">${area.city} Service Area</strong><span>${area.city}, ${area.region}</span><span>This is a service coverage page, not an office listing.</span><a class="footer-contact-line" href="tel:${phoneHref}"><span><small>Call Your Energy</small><strong>${phoneDisplay}</strong></span></a></div></div>
    <div class="container footer-legal"><span>Copyright &copy; 2026 FLYINGAPES TECHNOLOGIES PRIVATE LIMITED</span><nav class="footer-legal-links" aria-label="Legal"><a href="../privacy-policy.html">Privacy Policy</a><a href="../terms-of-service.html">Terms of Service</a><a href="../cancellation-policy.html">Cancellation Policy</a></nav></div>
  </footer>

  <div class="mobile-cta"><a href="${whatsapp}" target="_blank" rel="noreferrer">WhatsApp</a><a href="tel:${phoneHref}">Call Now</a></div>
  <script src="../script.js?v=20260803-structured-leads"></script>
</body>
</html>
`;
}

function directorySchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Your Energy Solar Service Areas",
    url: "https://www.yourenergy.co.in/service-areas/",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: serviceAreas.length,
      itemListElement: serviceAreas.map((area, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://www.yourenergy.co.in/service-areas/${area.slug}.html`,
        name: `Your Energy Solar Services in ${area.city}`,
      })),
    },
  };
}

function renderDirectoryGroup(name, areas) {
  return `<section class="service-area-directory-group"><div class="service-area-directory-group-head"><span>${name}</span><strong>${areas.length} service ${areas.length === 1 ? "city" : "cities"}</strong></div><div class="service-area-directory-grid">${areas.map((area) => `<article class="service-area-directory-card"><span>${area.region}</span><h2>${area.city}</h2><p>${area.headline}</p><a href="${area.slug}.html">View ${area.city} service page <span aria-hidden="true">&rarr;</span></a></article>`).join("")}</div></section>`;
}

function renderDirectory() {
  const groups = ["Delhi NCR", "Rajasthan", "Haryana"];
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solar Service Areas in Delhi NCR, Rajasthan &amp; Haryana | Your Energy</title>
  <meta name="description" content="Explore Your Energy rooftop solar service areas across Delhi NCR, Rajasthan, and Haryana. Call ${phoneDisplay} for residential, commercial, or housing-society solar support.">
  <meta name="theme-color" content="#08203f">
  <meta property="og:title" content="Your Energy Solar Service Areas">
  <meta property="og:description" content="Active rooftop solar service coverage across 19 cities, supported by the Your Energy project team.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Your Energy">
  <meta property="og:url" content="https://www.yourenergy.co.in/service-areas/">
  <link rel="canonical" href="https://www.yourenergy.co.in/service-areas/">
  <link rel="icon" href="/favicon.ico?v=20260803-exact-logo" sizes="any">
  <link rel="icon" href="/assets/favicon.svg?v=20260803-exact-logo" sizes="any" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="../styles.css?v=20260804-service-areas-v1">
  <script type="application/ld+json">
${JSON.stringify(directorySchema(), null, 2)}
  </script>
</head>
<body class="location-page service-area-page">
  <header class="site-header" id="top"><div class="container header-shell"><a class="brand" href="../index.html" aria-label="Your Energy home"><picture><source srcset="../assets/logo-your-energy-web.webp" type="image/webp"><img src="../assets/logo-your-energy-web.png" alt="Your Energy logo"></picture></a><button class="menu-toggle" type="button" aria-expanded="false" aria-label="Open menu">Menu</button><div class="nav-panel" data-nav-panel><nav class="site-nav" aria-label="Primary"><a href="../index.html#about">About</a><a href="../index.html#solutions">Solutions</a><a href="../index.html#process">Process</a><a href="../index.html#faq">FAQ</a><a href="../blog.html">Blog</a><a href="#contact">Contact</a><a class="nav-whatsapp-cta" href="https://wa.me/${phoneDigits}?text=Hello%20Your%20Energy%2C%20I%20need%20solar%20help%20in%20my%20city." target="_blank" rel="noreferrer">Ask on WhatsApp</a></nav></div></div></header>

  <main>
    <section class="location-hero"><div class="container location-hero-grid"><div class="location-hero-copy"><nav class="location-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span>/</span><span>Service Areas</span></nav><span class="eyebrow">Your Energy Service Network</span><h1>Solar support across the cities we serve.</h1><p class="location-hero-lead">Explore active Your Energy service areas across Delhi NCR, Rajasthan, and Haryana. These pages describe project coverage and do not claim a physical office in each city.</p><div class="location-hero-actions"><a class="button button-primary" href="#cities">Explore Service Cities</a><a class="button button-secondary" href="tel:${phoneHref}">Call ${phoneDisplay}</a></div></div><aside class="location-office-card service-area-card" data-code="19" aria-label="Your Energy service network summary"><span class="location-card-label">Active service network</span><h2>Coverage with clear status.</h2><p class="service-area-place">Delhi NCR, Rajasthan, and Haryana</p><div class="location-office-contact"><a href="tel:${phoneHref}">${phoneDisplay}</a><p class="location-office-note">Service cities are supported through scheduled project teams. For physical branches, use the <a href="../locations/">official office directory</a>.</p></div></aside></div></section>

    <section class="container location-proof" aria-label="Service network highlights"><div class="location-proof-grid"><article><strong>${serviceAreas.length} dedicated city pages</strong><span>Each city has a direct phone contact, canonical URL, and transparent service-area status.</span></article><article><strong>No invented branch details</strong><span>Service pages intentionally omit street information and never present a service city as a branch.</span></article><article><strong>Five official offices</strong><span>Verified physical offices remain listed separately in the official office directory.</span></article></div></section>

    <section class="location-section location-section-white" id="cities"><div class="container"><div class="location-section-head"><div><span class="eyebrow">Cities We Serve</span><h2>Find solar support for your city.</h2></div><p>Select a city to review how assessments work, what the first survey should resolve, and how to contact Your Energy. Site-visit availability depends on project location, scope, and scheduling.</p></div><div class="service-area-directory-groups">${groups.map((group) => renderDirectoryGroup(group, serviceAreas.filter((area) => area.network === group))).join("")}</div></div></section>

    <section class="location-section"><div class="container location-contact-card"><div><span class="eyebrow eyebrow-dark">Do not see your city?</span><h2>Ask our team about project coverage.</h2><p>Share your location, property type, monthly electricity bill, and phone number. We will confirm whether a survey can be coordinated for your project.</p></div><div class="location-contact-actions"><a class="button button-primary" href="../index.html#assessment">Start Free Assessment</a><a class="button button-secondary" href="tel:${phoneHref}">Call ${phoneDisplay}</a></div></div></section>
  </main>

  <footer class="site-footer" id="contact"><div class="container footer-shell"><div class="footer-brand"><picture><source srcset="../assets/logo-your-energy-footer-reverse.webp" type="image/webp"><img src="../assets/logo-your-energy-footer-reverse.png" alt="Your Energy logo"></picture><p>Rooftop solar consultation, planning, installation coordination, and long-term support for homes, businesses, and housing societies.</p></div><div class="footer-links"><strong class="footer-column-title">Explore</strong><a href="../index.html#about">About</a><a href="../index.html#solutions">Solutions</a><a href="../locations/">Official Offices</a><a href="../housing-societies.html">Housing Societies</a><a href="../commercial-solar.html">Commercial Solar</a><a href="../blog.html">Blog</a></div><div class="footer-meta"><strong class="footer-column-title">Service Area Contact</strong><span>Scheduled solar support across listed cities.</span><span>No physical branch is implied by a service-area page.</span><a class="footer-contact-line" href="tel:${phoneHref}"><span><small>Call Your Energy</small><strong>${phoneDisplay}</strong></span></a></div></div><div class="container footer-legal"><span>Copyright &copy; 2026 FLYINGAPES TECHNOLOGIES PRIVATE LIMITED</span><nav class="footer-legal-links" aria-label="Legal"><a href="../privacy-policy.html">Privacy Policy</a><a href="../terms-of-service.html">Terms of Service</a><a href="../cancellation-policy.html">Cancellation Policy</a></nav></div></footer>

  <div class="mobile-cta"><a href="https://wa.me/${phoneDigits}?text=Hello%20Your%20Energy%2C%20I%20need%20solar%20help%20in%20my%20city." target="_blank" rel="noreferrer">WhatsApp</a><a href="tel:${phoneHref}">Call Now</a></div>
  <script src="../script.js?v=20260803-structured-leads"></script>
</body>
</html>
`;
}

function generate() {
  fs.mkdirSync(outputDir, { recursive: true });
  serviceAreas.forEach((area) => {
    fs.writeFileSync(path.join(outputDir, `${area.slug}.html`), renderPage(area));
  });
  fs.writeFileSync(path.join(outputDir, "index.html"), renderDirectory());
}

if (require.main === module) {
  generate();
  console.log(`Generated ${serviceAreas.length} service-area pages and one directory.`);
}

module.exports = { serviceAreas, renderPage, renderDirectory, generate };

-- Labb Station proposal: each section starts on its own page (a new printed page, a separate sheet on screen).
-- Quotes that still use the template unchanged get the new layout; quotes with edited layouts keep theirs.
do $mig$
declare old_html text; new_html text := $tpl$<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Labb Station Proposal and Quote</title>
<style>@page {
  size: letter portrait;
  margin: 0.4in 0.4in 0.55in 0.4in;
  @bottom-left { content: "Ramsey Diagnostics Corporation d/b/a Labb  |  2115 Granby Street, Norfolk, VA 23517  |  info@labb.com"; font-family: Poppins; font-size: 7pt; color: #7b858d; }
  @bottom-right { content: "Quote v1.70  |  Page " counter(page) " of " counter(pages); font-family: Poppins; font-size: 7pt; color: #7b858d; }
}
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
* { box-sizing: border-box; }
body { font-family: Poppins, sans-serif; color: #404951; font-size: 8.6pt; line-height: 1.45; margin: 0; }
h1, h2, h3 { margin: 0; color: #404951; }
p { margin: 0 0 5pt 0; }
.micro { font-size: 6.6pt; letter-spacing: 1.1pt; text-transform: uppercase; color: #CF743C; font-weight: 600; margin-bottom: 3pt; }
.nw { white-space: nowrap; }
.pagebreak { break-before: page; }

/* Cover */
.cover { height: 11in; width: 8.5in; position: relative; break-after: page; }
.cover .top { padding: 0.8in 0.8in 0 0.8in; }
.cover-logo { height: 0.9in; }
.cover .rule { width: 1.2in; height: 4pt; background: #CF743C; border-radius: 2pt; margin: 0.4in 0 0.2in 0; }
.cover h1 { font-size: 40pt; font-weight: 800; line-height: 1.05; }
.cover .lead { font-size: 13pt; color: #6a747c; margin-top: 8pt; font-weight: 300; }
.cover-img { display: block; width: 3.9in; margin: 0.3in 0.9in 0 auto; }
.cover-bottom { position: absolute; left: 0.8in; right: 0.8in; bottom: 1.55in; display: flex; gap: 0.5in; }
.cover-bottom .prep { width: 3.4in; }
.cover-bottom .prep td.l { font-size: 9pt; width: 1.1in; }
.cover-bottom .prep td.v { height: 20pt; }
.cover .toc { flex: 1; font-size: 10pt; }
.cover .toc div { padding: 4pt 0; border-bottom: 0.5pt solid #e2e7e7; }
.cover .toc span { color: #CF743C; font-weight: 700; display: inline-block; width: 24pt; }
.cover .band { position: absolute; bottom: 0; left: 0; right: 0; background: #404951; color: #fff; padding: 0.35in 0.8in; display: flex; justify-content: space-between; align-items: flex-end; }
.cover .band .tag { font-size: 15pt; font-weight: 600; }
.cover .band .tag small { display: block; font-size: 9pt; font-weight: 400; opacity: 0.85; margin-top: 3pt; }
.cover .band .addr { font-size: 8.5pt; text-align: right; line-height: 1.5; opacity: 0.9; }

/* Header */
.header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2pt solid #404951; padding-bottom: 8pt; margin-bottom: 12pt; }
.doc-title { text-align: right; }
.doc-title h1 { font-size: 20pt; font-weight: 700; line-height: 1.1; }
.doc-title .sub { font-size: 8pt; color: #7b858d; }

/* Cards */
.card { border: 0.75pt solid #c8d3d3; border-radius: 6pt; padding: 8pt 10pt; margin-bottom: 8pt; border-left: 3pt solid #CF743C; break-inside: avoid; }
.card.plain { border-left: 0.75pt solid #c8d3d3; }
.card.pricecard { break-inside: auto; }
.card h2 { font-size: 11.5pt; font-weight: 700; margin-bottom: 4pt; }
.grid2 { display: flex; gap: 8pt; break-inside: avoid; }
.grid2 > .card { flex: 1; }
.tiles { display: flex; flex-wrap: wrap; gap: 8pt 12pt; margin-top: 6pt; }
.tiles > div { width: 31%; font-size: 8.6pt; }
.note { font-size: 7.2pt; color: #6a747c; }

/* Fields */
.fields { width: 100%; border-collapse: collapse; }
.fields td { padding: 3pt 0; vertical-align: bottom; }
.fields td.l { width: 30%; font-size: 7.4pt; color: #7b858d; white-space: nowrap; padding-right: 6pt; }
.fields td.v { border-bottom: 0.75pt solid #c8d3d3; height: 14pt; }
.fields td.v.filled { border-bottom: none; font-weight: 500; }
.ctype { font-size: 7pt; margin-top: 7pt; white-space: nowrap; }
.ctype .lbl { color: #7b858d; margin-right: 6pt; }
.check { display: inline-block; width: 8pt; height: 8pt; border: 0.75pt solid #404951; border-radius: 1.5pt; margin: 0 3pt 0 6pt; vertical-align: -0.5pt; }

/* Banner */
.banner { background: #404951; color: #fff; border-radius: 6pt; padding: 8pt 12pt; margin-bottom: 8pt; font-size: 9pt; break-inside: avoid; }
.banner .micro { color: #fff; opacity: 0.75; }

ul { margin: 2pt 0 0 0; padding-left: 13pt; }
li { margin-bottom: 3pt; }
li::marker { color: #CF743C; }

.steps { display: flex; gap: 7pt; margin-top: 6pt; }
.step { flex: 1; background: #f3f5f6; border-radius: 5pt; padding: 6pt 7pt; font-size: 7.6pt; line-height: 1.35; }
.step .n { display: block; font-weight: 800; color: #CF743C; font-size: 11pt; line-height: 1; margin-bottom: 3pt; }

/* Price tables */
table.price { width: 100%; border-collapse: collapse; font-size: 8pt; }
table.price th { text-align: left; font-size: 6.6pt; letter-spacing: 0.8pt; text-transform: uppercase; color: #7b858d; font-weight: 600; border-bottom: 1pt solid #404951; padding: 5pt 5pt; }
table.price td { border-bottom: 0.5pt solid #e2e7e7; padding: 5pt 5pt; vertical-align: top; }
table.price tr { break-inside: avoid; }
table.price tr.sect { break-after: avoid; }
table.price .num { text-align: right; white-space: nowrap; }
table.price .blank { border-bottom: 0.75pt solid #c8d3d3; display: inline-block; min-width: 52pt; height: 12pt; }
table.price .blank.s { min-width: 26pt; }
table.price .sku { font-weight: 700; }
table.price .desc { color: #6a747c; font-size: 7.2pt; }
table.price tr.sect td { background: #f3f5f6; font-weight: 700; font-size: 7.4pt; letter-spacing: 0.6pt; text-transform: uppercase; padding: 4pt 5pt; border-bottom: none; }
.badge { display: inline-block; font-size: 6pt; font-weight: 700; letter-spacing: 0.5pt; border: 0.75pt solid #404951; border-radius: 3pt; padding: 0 3pt; margin-left: 5pt; vertical-align: 1pt; }

.totals { width: 100%; border-collapse: collapse; margin-top: 4pt; font-size: 8.4pt; break-inside: avoid; }
.totals td { padding: 4pt 5pt; }
.totals td.num { text-align: right; width: 30%; }
.totals .blank { border-bottom: 0.75pt solid #c8d3d3; display: inline-block; min-width: 90pt; height: 12pt; }
.totals tr.grand td { border-top: 1.5pt solid #404951; font-weight: 700; font-size: 9.4pt; }

.terms li { font-size: 7.6pt; }
.sig { display: flex; gap: 18pt; margin-top: 10pt; }
.sig > div { flex: 1; }
.sig .line { border-bottom: 0.75pt solid #404951; height: 26pt; }
.sig .cap { font-size: 6.8pt; color: #7b858d; margin-top: 2pt; }

/* Agreement */
.agr { font-size: 7.6pt; line-height: 1.42; text-align: justify; }
.agr p { margin: 0 0 4.5pt 0; }
.agr p.sub { margin-left: 14pt; }
.agr p.h { break-after: avoid; margin-top: 4pt; }
.agr-head { border-bottom: 2pt solid #404951; padding-bottom: 6pt; margin-bottom: 10pt; }
.agr-head h1 { font-size: 16pt; font-weight: 700; }
.agr-sig { break-inside: avoid; text-align: left; margin-top: 6pt; }
.agr-sig .line { height: 22pt !important; }
.card.pricecard .micro, .card.pricecard h2 { break-after: avoid; }
.card.pricecard table.price thead { break-after: avoid; }

ol.cw { margin: 2pt 0 0 0; padding-left: 14pt; }
ol.cw li { margin-bottom: 4pt; }
ol.cw li::marker { color: #CF743C; font-weight: 700; }

.feat { display: flex; gap: 8pt; margin-top: 6pt; }
.feat > div { flex: 1; background: #f3f5f6; border-radius: 5pt; padding: 7pt 9pt; }
.feat > div:last-child { flex: 2; }
.feat .k { display: block; font-size: 6.6pt; letter-spacing: 0.8pt; text-transform: uppercase; color: #7b858d; font-weight: 600; }
.feat .v { display: block; font-size: 14pt; font-weight: 700; color: #404951; margin-top: 2pt; }
.feat .v.sm { font-size: 8.6pt; font-weight: 500; line-height: 1.35; }

.docs { display: flex; gap: 12pt; }
.docs .doc { flex: 1; }
.docs h3 { font-size: 11pt; font-weight: 700; margin: 0 0 2pt 0; }
.docs .note { min-height: 30pt; }
.docs img { width: 100%; display: block; border: 0.75pt solid #c8d3d3; border-radius: 3pt; margin-top: 4pt; }
.login-wrap { display: flex; align-items: center; justify-content: center; background: #f3f5f6; }
.browser { width: 100%; background: #fff; border: 0.75pt solid #c8d3d3; border-radius: 6pt; overflow: hidden; }
.browser .bar { background: #e9edef; padding: 5pt 7pt; }
.browser .bar span { display: inline-block; width: 6pt; height: 6pt; border-radius: 3pt; background: #c8d3d3; margin-right: 3pt; }
.login { padding: 14pt 30pt 12pt; text-align: center; }
.logo-slot { border: 1.2pt dashed #CF743C; color: #CF743C; font-weight: 700; font-size: 10pt; padding: 9pt 0; border-radius: 4pt; margin: 0 22pt 10pt; }
.login .lt { font-weight: 700; font-size: 10pt; margin-bottom: 8pt; }
.login .fld { border: 0.75pt solid #c8d3d3; border-radius: 4pt; padding: 5pt 7pt; text-align: left; color: #9aa3aa; font-size: 8pt; margin-bottom: 6pt; }
.login .btn { background: #404951; color: #fff; border-radius: 4pt; padding: 6pt; font-weight: 600; font-size: 8.6pt; margin-top: 2pt; }
.login .pw { font-size: 6.8pt; color: #7b858d; margin-top: 8pt; }

/* Each section is its own page: a new printed page, and a separate sheet on screen */
.page { break-before: page; }
@media screen {
  html { background: #e9ecee; }
  body { width: 8.5in; margin: 0 auto; padding: 0.3in 0; background: transparent; }
  .cover { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.12); margin-bottom: 0.3in; overflow: hidden; }
  .page { background: #fff; padding: 0.45in 0.45in 0.5in; margin: 0 0 0.3in; min-height: 11in; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
}
.esig img { max-height: 46pt; max-width: 2.6in; display: block; }
.esig .who { font-size: 8pt; margin-top: 2pt; }
.esig .pending { color: #7b858d; font-style: italic; }
</style></head><body>

<!-- COVER -->
<div class="cover">
  <div class="top">
    <img src="/quote-assets/b089670f3facbe293fa1.png" class="cover-logo" alt="Labb">
    <div class="rule"></div>
    <h1>Labb Station<br>Proposal and Quote</h1>
    <div class="lead">Digital rapid test reading, test kits, laboratory services and agreement</div>
  </div>
  <div class="cover-bottom">
    <table class="fields prep">
      <tr><td class="l">Prepared for</td><td class="v">{{client_company}}</td></tr>
      <tr><td class="l">Contact</td><td class="v">{{client_name}}</td></tr>
      <tr><td class="l">Quote number</td><td class="v">{{quote_number}}</td></tr>
      <tr><td class="l">Date</td><td class="v">{{quote_date}}</td></tr>
    </table>
    <div class="toc">
      <div><span>01</span>About Labb and Labb Station</div>
      <div><span>02</span>Result forms and your logo</div>
      <div><span>03</span>Products and services</div>
      <div><span>04</span>Pricing and quote totals</div>
      <div><span>05</span>Featured product: UA:06B</div>
      <div><span>06</span>Labb Station Agreement</div>
    </div>
  </div>
  <div class="band">
    <div class="tag">True Privacy with Real Protection&trade;<small>Built for all types of testing</small></div>
    <div class="addr">Ramsey Diagnostics Corporation d/b/a Labb<br>2115 Granby Street, Norfolk, VA 23517<br>info@labb.com</div>
  </div>
</div>

<section class="page">
<!-- PAGE: QUOTE DETAILS + ABOUT -->
<div class="header">
  <img src="/quote-assets/b089670f3facbe293fa1.png" style="height:0.55in" alt="Labb">
  <div class="doc-title"><h1>Labb Station Quote</h1><div class="sub">Digital rapid test reading, test kits and services</div></div>
</div>

<div class="grid2">
  <div class="card plain">
    <div class="micro">Prepared for</div>
    <table class="fields">
      <tr><td class="l">Company</td><td class="v">{{client_company}}</td></tr>
      <tr><td class="l">Contact name</td><td class="v">{{client_name}}</td></tr>
      <tr><td class="l">Email / phone</td><td class="v">{{client_email}} {{client_phone}}</td></tr>
      <tr><td class="l">Address</td><td class="v">{{client_location}}</td></tr>
      <tr><td class="l">Locations</td><td class="v">{{locations}}</td></tr>
    </table>
    <div class="ctype"><span class="lbl">Client type</span><span class="check"></span>Workplace <span class="check"></span>Clinic <span class="check"></span>Forensic <span class="check"></span>Treatment</div>
  </div>
  <div class="card plain">
    <div class="micro">Quote details</div>
    <table class="fields">
      <tr><td class="l">Quote number</td><td class="v">{{quote_number}}</td></tr>
      <tr><td class="l">Quote date</td><td class="v">{{quote_date}}</td></tr>
      <tr><td class="l">Valid through</td><td class="v">{{expires_on}}</td></tr>
      <tr><td class="l">Prepared by</td><td class="v">{{rep_name}}</td></tr>
      <tr><td class="l">Labb contact</td><td class="v filled">{{rep_email}}</td></tr>
    </table>
  </div>
</div>

<div class="card">
  <div class="micro">About Labb</div>
  <h2>Drug testing technology built on accuracy and privacy</h2>
  <p>Labb (Ramsey Diagnostics Corporation d/b/a Labb) is a Norfolk, Virginia company that builds digital tools for drug testing. Labb's founder has worked in the drug testing industry since 1997, and that experience shaped one goal: give testing programs results they can trust, while treating every donor with privacy and respect.</p>
  <p style="margin-bottom:0">Labb designs its own rapid test kits, runs its own reading platform, and connects clients to laboratory confirmation when a result needs it. Labb Station is built for all types of testing: workplace, clinic and collection site, forensic and treatment.</p>
</div>

<div class="card">
  <div class="micro">The Labb Station system</div>
  <h2>A digital reader for rapid drug tests</h2>
  <p>Labb Station replaces the visual read of a rapid test with a digital read. The collector captures an image of the test kit in the Labb app, and the platform returns the result. Clients can use their own phone or tablet as the reader, or order the Labb Station system (tablet and stand). The rapid screen reader technology is patented (US PAT 10,340,032).</p>
  <div class="steps">
    <div class="step"><span class="n">1</span>Add donor details, or scan the donor's driver's license to fill out the paperwork or find an existing order.</div>
    <div class="step"><span class="n">2</span>Collect the sample using a Labb urine cup or oral fluid kit.</div>
    <div class="step"><span class="n">3</span>Place the test on a table or desk.</div>
    <div class="step"><span class="n">4</span>Capture the test kit image in the Labb app.</div>
    <div class="step"><span class="n">5</span>Get the result, stored with the donor record and electronic chain of custody.</div>
  </div>
</div>

<div class="card reader-card">
  <div class="micro">Labb Station system</div>
  <h2>Tablet, stand and rapid test, ready to read</h2>
  <svg viewBox="0 0 1000 296" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block"><image x="317.5" y="6" width="365" height="282.7325186693822" href="/quote-assets/ea630642c8fa52674d6d.png"/><line x1="268" y1="81" x2="425.53999999999996" y2="95.0607433808554" stroke="#404951" stroke-width="1.2"/><circle cx="425.53999999999996" cy="95.0607433808554" r="6" fill="#CF743C" stroke="#fff" stroke-width="2"/><text x="260" y="85" text-anchor="end" font-family="Poppins" font-size="17" font-weight="700" fill="#404951">Tablet reader</text><text x="260" y="104" text-anchor="end" font-family="Poppins" font-size="13" fill="#6a747c">Shown with 11&#8243; screen</text><line x1="268" y1="258" x2="500.0" y2="249.1499660556687" stroke="#404951" stroke-width="1.2"/><circle cx="500.0" cy="249.1499660556687" r="6" fill="#CF743C" stroke="#fff" stroke-width="2"/><text x="260" y="262" text-anchor="end" font-family="Poppins" font-size="17" font-weight="700" fill="#404951">Testing stand</text><line x1="732" y1="51" x2="628.845" y2="65.37382892057026" stroke="#404951" stroke-width="1.2"/><circle cx="628.845" cy="65.37382892057026" r="6" fill="#CF743C" stroke="#fff" stroke-width="2"/><text x="740" y="55" text-anchor="start" font-family="Poppins" font-size="17" font-weight="700" fill="#404951">Rapid test</text><line x1="732" y1="196" x2="586.505" y2="158.67556008146641" stroke="#404951" stroke-width="1.2"/><circle cx="586.505" cy="158.67556008146641" r="6" fill="#CF743C" stroke="#fff" stroke-width="2"/><text x="740" y="200" text-anchor="start" font-family="Poppins" font-size="17" font-weight="700" fill="#404951">Kit pedestal</text></svg>
</div>

<div class="grid2">
  <div class="card">
    <div class="micro">What's included</div>
    <h2>Platform features</h2>
    <ul>
      <li>Digital reading of Labb rapid urine and oral fluid tests</li>
      <li>Unlimited collectors and mobile collectors per location</li>
      <li>Electronic chain of custody (eCCF) for rapid urine, rapid oral fluid and non-regulated lab testing</li>
      <li>Driver's license scan to start a test or locate an order</li>
      <li>Client portal with co-branding: upload your logo</li>
      <li>Role-based dashboards: collector level and organizational level views</li>
      <li>Image record of every test kit read</li>
    </ul>
  </div>
  <div class="card">
    <div class="micro">Confirmation workflow</div>
    <h2>Non-negative to lab, from the app</h2>
    <ol class="cw">
      <li>Press <b>Send to Lab</b> at the end of any rapid test where the result is non-negative.</li>
      <li>Make sure the specimen is sealed and secure. Follow the product guidelines for each test kit.</li>
      <li>Drop the specimen in the specimen transport bag and ship it to the laboratory.</li>
      <li>Results appear in each dashboard once reported by the laboratory and/or MRO.</li>
    </ol>
  </div>
</div>

</section>
<section class="page">
<div class="card">
  <div class="micro">Products and services</div>
  <h2>Test kits and services available with Labb Station</h2>
  <p>Labb Station reads Labb rapid test kits. Choose the kits that fit your testing program; the reader handles urine and oral fluid on the same platform. Kit panel configurations, cutoffs and classifications are listed on each product's data sheet.</p>
  <div class="tiles">
    <div><b>UA series</b>: rapid urine test cups<br><span class="note">UA:06B, UA:13A, UA:16A, UA:18C, UA:23A</span></div>
    <div><b>OR series</b>: rapid oral fluid tests<br><span class="note">OR:06A, OR:14A</span></div>
    <div><b>OraFlo ORF:31C</b>: privacy oral fluid test<br><span class="note">Drug names coded C1 to C10 on the device</span></div>
    <div><b>Confirmation and MRO</b><br><span class="note">Lab confirmation of non-negative results and MRO review, included in rapid test pricing</span></div>
    <div><b>Laboratory testing</b><br><span class="note">Quest: regulated (DOT), SAP and Flex panels. Averhealth: Flex 15, Flex 16 and Ultraflex</span></div>
    <div><b>Labb Station hardware</b><br><span class="note">Labb Station system (tablet and stand), or the stand on its own</span></div>
  </div>
</div>

</section>
<section class="page">
<!-- RESULT FORMS -->
<div class="banner">
  <div class="micro">Professional documents, automatically</div>
  <b>Labb Station turns rapid test kits into professional result forms in seconds.</b> Every test produces clean, consistent documents for your donors, employers and clients, with no typing and no handwritten forms. <span style="opacity:.75;font-size:7.6pt">Sample documents: all names and details shown are fictitious.</span>
</div>
<div class="docs">
  <div class="doc">
    <div class="micro">Before the test</div>
    <h3>Labb Passport</h3>
    <p class="note">The test authorization the donor brings to the collection site, with the product required and a barcode to start the test.</p>
    <img src="/quote-assets/4264c9e232cb0e8b8956.jpg" alt="Sample Labb Passport">
  </div>
  <div class="doc">
    <div class="micro">After the read</div>
    <h3>Confidential Drug Test Result Form</h3>
    <p class="note">Generated as soon as the test is read: donor, organization, collector and results on one page, with a QR code and password to verify the certified copy.</p>
    <img src="/quote-assets/a4c4dc919394e7c59b6f.jpg" alt="Sample result form">
  </div>
</div>


</section>
<section class="page">
<!-- LOGO / LOGIN -->
<div class="card">
  <div class="micro">Your brand</div>
  <h2>Add your logo once. It appears everywhere.</h2>
  <p>Upload your logo in the client portal and Labb Station places it on your result forms. Adding your logo also creates a custom login page for your clinical clients, so they can access their dashboards under your brand.</p>
</div>
<div class="card plain">
  <div class="micro">On every result form</div>
  <h2>Your logo in the header</h2>
  <img src="/quote-assets/b90b9f82663d43b4cef5.png" style="width:100%;display:block;border:0.5pt solid #e2e7e7;border-radius:4pt" alt="Result form header with logo slot">
  <p class="note" style="margin-top:5pt">The logo slot sits in the top left of each result form, above the specimen barcode.</p>
</div>
<div class="grid2">
  <div class="card plain">
    <div class="micro">Custom login page</div>
    <h2>Your clients sign in to your brand</h2>
    <p>When you add your logo, Labb Station creates a login page with your branding. Your clinical clients use it to reach their dashboards, view results and download result forms.</p>
    <ul>
      <li>Your logo on the login page and client portal</li>
      <li>Client dashboards with their own results</li>
      <li>Co-branded with Labb</li>
    </ul>
  </div>
  <div class="card plain login-wrap">
    <div class="browser">
      <div class="bar"><span></span><span></span><span></span></div>
      <div class="login">
        <div class="logo-slot">YOUR LOGO</div>
        <div class="lt">Client login</div>
        <div class="fld">Email</div>
        <div class="fld">Password</div>
        <div class="btn">Sign in</div>
        <div class="pw">Powered by Labb</div>
      </div>
    </div>
  </div>
</div>


</section>
<section class="page">
<!-- PRICING -->
<div class="banner">
  <div class="micro">All-inclusive rapid test pricing</div>
  <b>One price per test.</b> Each rapid test price includes the rapid test, laboratory confirmation of non-negative results and MRO review, at a capped positive rate of 6%.
</div>

<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Software and hardware</h2>
  {{price_table_software}}
</div>

<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Rapid tests</h2>
  {{price_table_kits}}
</div>

<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Laboratory testing and MRO</h2>
  {{lab_table}}
  <p class="note" style="margin-top:6pt">Laboratory tests are billed monthly, after the test is complete. Most lab tests are priced individually. For a specific price on lab testing or a complete list of all available panels, request a link from your Labb sales rep.</p>
</div>

</section>
<section class="page">
<div class="card">
  <div class="micro">Summary</div>
  <h2>Quote totals</h2>
  <table class="totals">
    <tr><td>Monthly recurring: software</td><td class="num">{{monthly_total}}/mo</td></tr>
    <tr><td>Setup, onboarding and certifications</td><td class="num">Included</td></tr>
    <tr><td>One time: hardware and rapid tests</td><td class="num">{{one_time_total}}</td></tr>
    <tr><td>Shipping</td><td class="num">Added at checkout</td></tr>
    <tr><td>Tax</td><td class="num">Added at checkout</td></tr>
    <tr class="grand"><td>Total due at order (includes the first month of software)</td><td class="num">{{due_today}}</td></tr>
  </table>
  <p class="note" style="margin-top:6pt">Laboratory testing and MRO review for laboratory tests are billed monthly, after the test is complete, and are not included in the total due at order.</p>
</div>

<div class="grid2">
  <div class="card plain">
    <div class="micro">Terms</div>
    <ul class="terms">
      <li>Pricing is valid through the date shown above.</li>
      <li>The Labb Station subscription is per physical location and includes unlimited collectors and mobile collectors.</li>
      <li>Shipping and applicable taxes are shown separately.</li>
      <li>Labb Station currently supports eCCF for non-regulated testing. Regulated (DOT) testing uses a paper chain of custody.</li>
      <li>Kits must match the client type. Forensic: any Labb kit. Workplace: Employment use only (EUO), OTC or IVD kits. Treatment centers: FDA 510(k) cleared kits only (IVD or OTC), urine up to the 15 panel, no oral fluid.</li>
      <li>Final terms are set in the Labb Station Agreement that follows.</li>
    </ul>
  </div>
  <div class="card plain">
    <div class="micro">Quote acceptance</div>
    {{signature_block}}
  </div>
</div>

</section>
<section class="page">
<!-- FEATURED PRODUCT -->
<div class="card">
  <div class="micro">Featured product</div>
  <h2>UA:06B Multi-Drug eTest Cup, Urine</h2>
  <p>The UA:06B is a 6 panel rapid urine test cup read by Labb Station. Every non-negative result goes to the laboratory from the app with Send to Lab.</p>
  <div class="feat">
    <div><span class="k">Price per test</span><span class="v">$6.99</span></div>
    <div><span class="k">Box price</span><span class="v">$174.75</span></div>
    <div><span class="k">Packaging</span><span class="v">Sold 25/bx</span></div>
    <div><span class="k">Includes</span><span class="v sm">Rapid test, lab confirmation and MRO review (capped positive rate of 6%)</span></div>
  </div>
</div>
<div class="card plain">
  <div class="micro">Procedure card</div>
  <h2>How to run the UA:06B</h2>
  <img src="/quote-assets/69a15387104efe7d1d8e.png" style="width:100%;display:block;border:0.5pt solid #e2e7e7;border-radius:4pt;margin-top:4pt" alt="UA:06B procedure card">
</div>


</section>
<section class="page">
<div class="agr">
<div class="agr-head">
  <div class="micro">Labb Station Agreement</div>
  <h1>LABB END USER AGREEMENT</h1>
</div>
<p>Effective Date: {{effective_date}}</p>
<p>This End User Agreement ("Agreement") is reached and made effective by and between:</p>
<p>BETWEEN: {{client_company}} (the "Client"), a company organized and existing under the laws of the ____________ of ______________________, with its head office located at: ________________________________________________</p>
<p>AND: Ramsey Diagnostics Corporation d/b/a Labb ("LABB"), a company organized and existing under the laws of the Commonwealth of Virginia, with its head office located at: 2115 Granby Street, Norfolk, VA 23517</p>
<p>as of the Effective Date set forth above and provides as follows, to wit:</p>
<p>WHEREAS Client is in need of reliable and readily available testing software, equipment and services in order to screen various persons for the presence and amount of specific drugs of abuse, analytes, and other substances including but not limited to ethanol, and to document the results of such screening; and</p>
<p>WHEREAS LABB offers drug testing software, equipment and services through the sale and use of a proprietary, accurate, and easy-to-use software, laboratory and rapid screening kits (“e-tests), training materials, mobile devices, and apps and through access to LABB, a system’s system for collecting and evaluating specimens and documenting the results thereof (collectively, the “Products and Services”); and</p>
<p>WHEREAS Client and LABB desire by this Agreement to set forth the terms and conditions under which Client may purchase Products and Services from LABB,</p>
<p>NOW, THEREFORE, for and in consideration of the mutual promises and undertakings of LABB and Client (collectively, the “Parties,” each of which is a “Party”) set forth hereinbelow and other good and valuable consideration, the receipt and sufficiency of which each of the Parties hereby acknowledges, the Parties mutually agree as follows:</p>

<p class="h"><b>1. Non-Exclusive Drug Abuse Program Management Services.</b> While this Agreement is in effect, Client may purchase LABB Products and Services on a non-exclusive basis which Client may use in connection with Client’s drug testing program. Specifically, during the Term of this Agreement, Client can:</p>
<p class="sub">a. purchase LABB’ laboratory and digital e-tests with software and readers to collect and to evaluate specimens;</p>
<p class="sub">b. utilize LABB’ designated laboratory and internal Medical Review Officer for further evaluation of all "non-negative" test results collected using LABB’ digital e-tests and readers;</p>
<p class="sub">c. rely upon LABB, by and through LABB’ authorized designees, to report all results of the further evaluation of “non-negative” tests to Client, subject to, and to the extent permitted by, applicable legal standards and, where applicable, the Department of Health and Human Services Guidelines for Federal Workplace Drug Testing Programs (the “Guidelines”);</p>
<p class="sub">d. authorize LABB to archive and store all test results and information associated therewith for a period of up to seven (7) years from the date such test result and information is either collected or received by LABB, whichever occurs later.</p>
<p class="sub">e. purchase the other Products and Services listed on Exhibit A (attached hereto and hereby incorporated by reference) from LABB.</p>

<p class="h"><b>2. Price and Payment.</b></p>
<p class="sub">a. <b>Price.</b> LABB reserves the right to include or exclude certain products and services offered to the Client under this Agreement, solely at LABB's discretion. Such changes will be communicated to the Client in writing, with a notice period of thirty (30) days. Additionally, LABB has the right to alter the prices mentioned above after the first year, with prior written notice of thirty (30) days to the Client.</p>
<p class="sub">b. <b>Payment.</b> LABB will invoice Client for Products purchased by, and Services rendered to, Client. Client shall pay each invoice Labb issued to Client within ten (10) days of the date of the invoice. In addition to the invoiced costs for Products purchased by, and Services rendered to, Client, LABB and Client hereby agree that Client will pay interest at a rate of the lesser of 1.5% per month or the highest rate allowed under applicable law on any portion of any invoiced amount which Client does not pay within thirty (30) days of the date of the invoice.</p>

<p class="h"><b>3. Limited Warranties and Remedies.</b></p>
<p class="sub">a. <b>Warranty.</b> LABB warrants to Client that the Products will conform to applicable industry standards for functionality and accuracy and that LABB and its authorized designees will render the Services in a manner which conform to applicable industry standards. Notwithstanding anything to the contrary elsewhere herein, the warranty in the preceding sentence will not apply, and LABB will have no liability for, (i) delays beyond the control of LABB in reporting results; (ii) delays or errors on the part of any clinic, laboratory, Medical Review Officer, or entity which ships, transports or delivers specimens; or (iii) errors or omissions on the part of Client.</p>
<p class="sub">b. <b>Limitation of Warranties.</b> THE WARRANTY SET FORTH HEREINABOVE AT SUB-PARAGRAPH 3(a.) IS IN LIEU OF ALL OTHER WARRANTIES OR OBLIGATIONS, EXPRESS OR IMPLIED. LABB HEREBY EXPRESSLY DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY AND OF FITNESS FOR A PARTICULAR PURPOSE.</p>
<p class="sub">c. <b>Remedies.</b> In the event of any breach of warranty by LABB regarding the Products and Services, LABB shall, at LABB's option, (i) replace any non-conforming Products purchased by Client and/or re-perform any non-conforming Services rendered to Client, (ii) refund the amounts Client paid to LABB for the non-conforming Products and/or Services, or (iii) credit (against the price of future purchases of Services) the amounts Client paid to LABB for the non-conforming Products and/or Services against other unpaid amounts due from Client to LABB.</p>
<p class="sub">d. <b>Limitation of Remedies and Liability.</b> EXCEPT FOR LABB'S OBLIGATIONS RESULTING FROM THIRD PARTY CLAIMS, CLIENT'S SOLE AND EXCLUSIVE REMEDY FOR DEFECTIVE PRODUCTS AND/OR SERVICES SHALL BE REFUND, CREDIT, OR REPLACEMENT/RE-PERFORMANCE AS PROVIDED HEREINABOVE IN SUB-PARAGRAPH 3(c), AND IN NO EVENT SHALL LABB BE LIABLE FOR THE COST OF PROCUREMENT OF SUBSTITUTE PRODUCTS OR SERVICES, LOSS OF PROFITS, OR ANY OTHER SPECIAL, CONSEQUENTIAL, OR INCIDENTAL DAMAGES, HOWEVER CAUSED, EVEN IF LABB HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. IF A COURT OF COMPETENT JURISDICTION FINDS THE FOREGOING LIMITATION INAPPLICABLE, UNENFORCEABLE OR UNLAWFUL FOR ANY REASON, THEN LABB'S LIABILITY FOR ANY CAUSE OF ACTION ARISING UNDER THIS AGREEMENT, SPECIFICALLY INCLUDING, BUT NOT LIMITED TO, BREACH OF WARRANTY SHALL NOT EXCEED THE TOTAL MONETARY AMOUNT PAID TO LABB BY CLIENT PURSUANT TO THIS AGREEMENT DURING THE SIX (6) MONTHS IMMEDIATELY PRECEDING THE DATE SUCH CAUSE OF ACTION AROSE.</p>

<p class="h"><b>4. Term and Termination.</b></p>
<p class="sub">a. <b>Term.</b> The term of this Agreement (the “Term”) is two (2) years, beginning on the Effective Date, and may only be extended pursuant to the terms of a subsequent writing signed by the Parties.</p>
<p class="sub">b. <b>Termination Upon 30-Days’ Notice.</b> Notwithstanding anything to the contrary elsewhere herein, either Party may terminate this Agreement by delivery of written notice of such termination to the other Party at least thirty (30) days prior to the date such termination takes effect.</p>
<p class="sub">c. <b>Automatic Termination.</b> This Agreement shall terminate immediately and automatically if and when either Party becomes the subject of insolvency or bankruptcy proceedings, ceases doing business, makes an assignment of assets for the benefit of creditors, dissolves, or has a trustee appointed for all or a substantial portion of Breaching Party's assets.</p>
<p class="sub">d. <b>Immediate Termination.</b> LABB may terminate this Agreement immediately and without prior notice to Client if LABB determines in its sole discretion that Client has breached any of the provisions of numbered paragraph 5 (Proprietary Information), including any sub-paragraphs thereof.</p>
<p class="sub">e. <b>Survival.</b> Upon the termination or expiration of the term of this Agreement, each Party’s rights and obligations under this Agreement shall end, and neither Party shall have any claim, including any claim for termination damages, against the other. However, notwithstanding anything to the contrary elsewhere herein, the provisions of this paragraph 4(e.) and numbered paragraphs 2, 3, 5, and 6 (and their respective sub-paragraphs therein) and the rights and obligations set forth therein shall survive the termination or expiration of this Agreement.</p>

<p class="h"><b>5. Proprietary Information.</b></p>
<p class="sub">a. <b>Proprietary Information.</b> Client acknowledges that (i) LABB’s e-readers and associated equipment which Client obtains in connection with the Products and Services contain proprietary software, (ii) the prices listed on Exhibit A, as may be amended from time to time as provided elsewhere herein, include (or may include in the future) discounts which are not made available to all purchasers of LABB’s Products and Services, and (iii) LABB derives value and competitive advantage from controlling the disclosure of such software and prices (“LABB’s Proprietary") and that Proprietary Information constitutes valuable special and unique property of such Party.</p>
<p class="sub">b. <b>Non-Disclosure.</b> Client will not, for any reason or purpose whatsoever, during the Term and thereafter disclose any of LABB’s Proprietary Information without LABB’s written authorization. In the event of a breach or threat of breach by Client of the provisions of this numbered paragraph 5, including any of its sub-paragraphs, Client and LABB stipulate that LABB shall be entitled to an injunction restraining Client from disclosing LABB’s Proprietary Information, and such injunction shall be in addition to, rather than in lieu of, all other legal and equitable relief which is necessary to provide complete relief to Client from such breach or threat of breach.</p>
<p class="sub">c. <b>Exceptions.</b> This section does not apply to LABB’s Proprietary Information that: (i) is or becomes publicly available through no fault of Client.</p>

<p class="h"><b>6. Miscellaneous.</b></p>
<p class="sub">a. <b>Non-assignment.</b> Client may not assign, transfer, or sell (including by operation of law) its rights under this Agreement, or delegate its duties hereunder to any person including any affiliate of Client, without the prior written consent of LABB. A transfer of a controlling interest in Client shall constitute an assignment. Any purported assignment without LABB's consent shall be void and shall constitute a breach of this Agreement.</p>
<p class="sub">b. <b>Entire Agreement; Modification; Waiver.</b> This Agreement contains the entire agreement between the Parties and may only be modified through a subsequent writing signed by both Parties. A waiver of any obligation by either Party under this Agreement shall be effective only if in writing and signed by both Parties. A waiver on one occasion shall not affect either Party’s right to require strict compliance with this Agreement in the future.</p>
<p class="sub">c. <b>Notices.</b> LABB shall send any notice required hereunder to Client at the address to which LABB sends invoices pursuant to this Agreement or such other address which client specifies in a writing which is delivered to LABB. Client shall send any notice required hereunder to LABB at the following address: General Manager, Ramsey Diagnostics Corporation d/b/a Labb, 2115 Granby St, Norfolk, VA 23517. Any notices required hereunder shall be deemed given: (i) if sent by U.S. mail, upon receipt as evidenced by a delivery confirmation receipt or (ii) if sent by recognized courier service, upon receipt as evidenced by the courier’s records.</p>
<p class="sub">d. <b>Attorney Fees.</b> In the event of a default under this Agreement, the defaulting Party shall reimburse the non- defaulting Party for all costs and expenses reasonably incurred by the non-defaulting Party in connection with the default, including, without limitation, reasonable attorney fees. Additionally, in the event any suit or action is brought to enforce or interpret any of the terms of this Agreement, the judge presiding over such suit or action shall award (in addition to, and not in lieu of, all other available legal and equitable relief) the reasonable attorney fees, costs, and expenses incurred by the Party in connection with such suit or action.</p>
<p class="sub">e. <b>Governing Law; Jurisdiction.</b> The rights of the parties in connection with or arising under this Agreement and the relationship of the Parties whether or not arising out of this Agreement shall be governed by the laws of the Commonwealth of Virginia, excluding choice of law rules. Each Party hereby stipulates and submits to the personal jurisdiction and venue of the state and federal courts sitting in Norfolk, Virginia.</p>
<p class="sub">f. <b>Counterparts and Facsimile Signatures.</b> This Agreement may be executed in multiple counterparts, none of which shall be deemed to be binding unless and until both Parties have signed this Agreement. Thereafter, each such counterpart shall be deemed an original, and all such signed counterparts together shall constitute one and the same document. Facsimile or portable document format (PDF) signatures shall be treated as original signatures for all purposes hereunder.</p>
<p class="sub">g. <b>Agency.</b> Client is an independent business and has no power, right, or authority to bind LABB or to assume or to create any obligation or responsibility, express or implied, on behalf of LABB. Client shall not take any action that could lead a third party to believe it has such authority. Nothing stated in this Agreement shall be construed as creating relationships of partners, employer and employee, franchisor and franchisee, or principal and agent between the Parties.</p>
<p class="sub">h. <b>Force Majeure.</b> Neither Party shall be liable for any delay or default in performing its obligations (other than payment obligations) if such default or delay is caused by any event beyond the reasonable control of such Party, including, but not limited to, acts of nature, war or insurrection, civil commotion, destruction of production facilities or materials by earthquake, fire, storm or flood, epidemic, or other similar event. The Party suffering such cause shall promptly notify the other Party of the cause and the expected duration of such cause.</p>


<p class="h"><b>7. Labb Station Subscription, Collectors, Laboratory Billing and MRO.</b></p>
<p class="sub">a. <b>Subscription.</b> The Labb Station subscription is $129.00 per month per physical location. Each physical location at which Client uses Labb Station requires its own subscription.</p>
<p class="sub">b. <b>Collectors.</b> Each Labb Station subscription includes unlimited collectors and mobile collectors.</p>
<p class="sub">c. <b>Laboratory Testing Billing.</b> Laboratory tests are billed monthly, after the test is complete.</p>
<p class="sub">d. <b>MRO Review for Laboratory Testing.</b> Medical Review Officer (MRO) review for laboratory testing is billed at $5.50 per test.</p>
<p style="margin-top:8pt">IN ACCEPTANCE, EXECUTION, AND RATIFICATION OF ALL OF THE FOREGOING, THE PARTIES, BY THEIR RESPECTIVE AUTHORIZED REPRESENTATIVES, HAVE SIGNED THIS AGREEMENT:</p>
<div class="sig agr-sig">
  <div><b>LABB</b><div class="line"></div><div class="cap">Authorized Signature</div><div style="margin-top:4pt">James T. Ramsey<br>President</div><div class="line" style="height:16pt"></div><div class="cap">Date</div></div>
  <div><b>Client</b>{{client_signature}}</div>
</div>
</div>

</section>
</body></html>$tpl$; n int;
begin
  select html into old_html from quote_templates where name = 'Labb Station proposal and quote' limit 1;
  if old_html is null then return; end if;
  update sales_quotes set html = new_html, updated_at = now()
    where md5(html) = md5(old_html) and status in ('draft', 'sent', 'viewed');
  get diagnostics n = row_count;
  raise notice '[056] updated % quotes to the paged layout', n;
  update quote_templates set html = new_html, updated_at = now() where name = 'Labb Station proposal and quote';
end $mig$;

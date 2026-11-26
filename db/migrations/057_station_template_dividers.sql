-- Labb Station proposal: cover-style divider pages before the result forms section and before the pricing section.
-- Quotes still using the template unchanged get them too; quotes with edited layouts keep theirs.
do $mig$
declare old_html text; new_html text; n int;
  css text := $css$
/* Section divider pages, styled like the cover */
@page divider { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
.divider { page: divider; break-before: page; height: 11in; width: 8.5in; position: relative; overflow: hidden; background: #fff; }
.divider .top { padding: 0.8in 0.8in 0 0.8in; }
.divider .dlogo { height: 0.6in; }
.divider .num { font-size: 96pt; font-weight: 800; color: #CF743C; line-height: 1; margin-top: 1.6in; letter-spacing: -2pt; }
.divider .rule { width: 1.2in; height: 4pt; background: #CF743C; border-radius: 2pt; margin: 0.25in 0 0.2in 0; }
.divider h1 { font-size: 40pt; font-weight: 800; line-height: 1.05; }
.divider .lead { font-size: 13pt; color: #5a646c; margin-top: 10pt; font-weight: 300; max-width: 5.6in; }
.divider .inside { margin-top: 0.45in; max-width: 4.6in; font-size: 11pt; }
.divider .inside .k { font-size: 8pt; letter-spacing: 1.1pt; text-transform: uppercase; color: #7b858d; font-weight: 600; margin-bottom: 4pt; }
.divider .inside div:not(.k) { padding: 6pt 0; border-bottom: 0.5pt solid #e2e7e7; }
.divider .inside span { color: #CF743C; font-weight: 700; margin-right: 8pt; }
.divider .band { position: absolute; bottom: 0; left: 0; right: 0; background: #404951; color: #fff; padding: 0.35in 0.8in; display: flex; justify-content: space-between; align-items: flex-end; }
.divider .band .tag { font-size: 13pt; font-weight: 600; }
.divider .band .tag small { display: block; font-size: 9pt; font-weight: 400; opacity: 0.85; margin-top: 3pt; }
.divider .band .addr { font-size: 8.5pt; text-align: right; line-height: 1.5; opacity: 0.9; }
@media screen { .divider { box-shadow: 0 2px 12px rgba(0,0,0,.12); margin: 0 0 0.3in; } }
</style>$css$;
  d1 text := $d1$<section class="divider">
  <div class="top">
    <img src="/quote-assets/b089670f3facbe293fa1.png" class="dlogo" alt="Labb">
    <div class="num">02</div>
    <div class="rule"></div>
    <h1>Result forms<br>and your logo</h1>
    <div class="lead">Every rapid test becomes a professional result form in seconds, with your logo on it.</div>
    <div class="inside">
      <div class="k">In this section</div>
      <div><span>&#8226;</span>Labb Passport</div>
      <div><span>&#8226;</span>Confidential Drug Test Result Form</div>
      <div><span>&#8226;</span>Your logo on every result form</div>
      <div><span>&#8226;</span>A custom login page for your clients</div>
    </div>
  </div>
  <div class="band">
    <div class="tag">Labb Station Proposal and Quote<small>Prepared for {{client_company}}</small></div>
    <div class="addr">Quote {{quote_number}}<br>{{quote_date}}</div>
  </div>
</section>
$d1$;
  d2 text := $d2$<section class="divider">
  <div class="top">
    <img src="/quote-assets/b089670f3facbe293fa1.png" class="dlogo" alt="Labb">
    <div class="num">04</div>
    <div class="rule"></div>
    <h1>Pricing and<br>quote totals</h1>
    <div class="lead">Software, equipment, rapid tests and laboratory services, priced for {{client_company}}.</div>
    <div class="inside">
      <div class="k">In this section</div>
      <div><span>&#8226;</span>Software and hardware</div>
      <div><span>&#8226;</span>Rapid tests, all-inclusive pricing</div>
      <div><span>&#8226;</span>Laboratory testing and MRO</div>
      <div><span>&#8226;</span>Quote totals</div>
    </div>
  </div>
  <div class="band">
    <div class="tag">Labb Station Proposal and Quote<small>Prepared for {{client_company}}</small></div>
    <div class="addr">Quote {{quote_number}}<br>{{quote_date}}</div>
  </div>
</section>
$d2$;
begin
  select html into old_html from quote_templates where name = 'Labb Station proposal and quote' limit 1;
  if old_html is null or position('class="divider"' in old_html) > 0 then return; end if;
  if position('<section class="page">' || chr(10) || '<!-- RESULT FORMS -->' in old_html) = 0
     or position('<section class="page">' || chr(10) || '<!-- PRICING -->' in old_html) = 0 then
    raise notice '[057] template markers not found, skipped'; return;
  end if;
  new_html := replace(old_html, '</style>', css);
  new_html := replace(new_html, '<section class="page">' || chr(10) || '<!-- RESULT FORMS -->', d1 || '<section class="page">' || chr(10) || '<!-- RESULT FORMS -->');
  new_html := replace(new_html, '<section class="page">' || chr(10) || '<!-- PRICING -->', d2 || '<section class="page">' || chr(10) || '<!-- PRICING -->');
  update sales_quotes set html = new_html, updated_at = now()
    where md5(html) = md5(old_html) and status in ('draft', 'sent', 'viewed');
  get diagnostics n = row_count;
  raise notice '[057] added divider pages to % quotes', n;
  update quote_templates set html = new_html, updated_at = now() where name = 'Labb Station proposal and quote';
end $mig$;

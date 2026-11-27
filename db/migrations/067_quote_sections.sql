-- Quote sections: Set-up and MRC, Hardware and NRC, Rapid Urine, Rapid Oral Fluid (each followed by the all-inclusive pricing note), Laboratory and MRO.
-- Drug abbreviations per quote product (kits fall back to their data sheet panel).
alter table quote_price_items add column if not exists drugs text;
do $mig$
declare oldb text := $o$<!-- PRICING -->
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

$o$; newb text := $n$<!-- PRICING -->
<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Set-up and MRC: Monthly Recurring Fees</h2>
  {{price_table_mrc}}
</div>

<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Hardware and NRC</h2>
  {{price_table_nrc}}
</div>

<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Rapid Urine Tests (Bundled with Confirmation and MRO)</h2>
  {{price_table_urine}}
</div>
<div class="banner">
  <div class="micro">All-inclusive rapid test pricing</div>
  <b>One price per test.</b> Each rapid test price includes the rapid test, laboratory confirmation of non-negative results and MRO review, at a capped positive rate of 6%.
</div>

<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Rapid Oral Fluid Tests (Bundled with Confirmation and MRO)</h2>
  {{price_table_oral}}
</div>
<div class="banner">
  <div class="micro">All-inclusive rapid test pricing</div>
  <b>One price per test.</b> Each rapid test price includes the rapid test, laboratory confirmation of non-negative results and MRO review, at a capped positive rate of 6%.
</div>

<div class="card pricecard">
  <div class="micro">Pricing</div>
  <h2>Laboratory and MRO Services</h2>
  {{lab_table}}
  <p class="note" style="margin-top:6pt">Laboratory tests are billed monthly, after the test is complete.</p>
</div>

$n$; n int;
begin
  update quote_templates set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0;
  update sales_quotes set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0 and status in ('draft', 'sent', 'viewed');
  get diagnostics n = row_count;
  raise notice '[067] new pricing sections on % open quotes', n;
end $mig$;

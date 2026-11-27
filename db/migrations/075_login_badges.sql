-- Labb Station proposal: rapid login badges card at the end of the Labb Station system page.
do $mig$
declare oldb text := $o$<div class="micro">Confirmation workflow</div>
    <h2>Non-negative to lab, from the app</h2>
    <ol class="cw">
      <li>Press <b>Send to Lab</b> at the end of any rapid test where the result is non-negative.</li>
      <li>Make sure the specimen is sealed and secure. Follow the product guidelines for each test kit.</li>
      <li>Drop the specimen in the specimen transport bag and ship it to the laboratory.</li>
      <li>Results appear in each dashboard once reported by the laboratory and/or MRO.</li>
    </ol>
  </div>
</div>

</section>$o$; newb text := $n$<div class="micro">Confirmation workflow</div>
    <h2>Non-negative to lab, from the app</h2>
    <ol class="cw">
      <li>Press <b>Send to Lab</b> at the end of any rapid test where the result is non-negative.</li>
      <li>Make sure the specimen is sealed and secure. Follow the product guidelines for each test kit.</li>
      <li>Drop the specimen in the specimen transport bag and ship it to the laboratory.</li>
      <li>Results appear in each dashboard once reported by the laboratory and/or MRO.</li>
    </ol>
  </div>
</div>

<div class="card plain badge-card" style="display:flex;gap:14pt;align-items:center;break-inside:avoid">
  <img src="/quote-assets/rapid-login-badges.png" alt="Labb rapid login badges with a retractable badge reel" style="width:2.1in;flex:0 0 auto">
  <div>
    <div class="micro">Rapid login badges</div>
    <h2>Sign in to the Labb app with one scan</h2>
    <p>Each certified collector gets a personal badge with a QR code. To sign in, the collector scans their badge with the Labb app instead of typing a username and password, so the next test can start in seconds, even with gloves on.</p>
    <ul>
      <li>Every badge belongs to one certified user, so each test read is recorded under the collector who performed it.</li>
      <li>A lost badge can be turned off and replaced without changing anyone else's sign-in.</li>
      <li>Each order includes 2 badges and a retractable badge reel.</li>
    </ul>
    <p class="note" style="margin:4pt 0 0">Badge designs may vary.</p>
  </div>
</div>

</section>$n$; c int;
begin
  update quote_templates set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0;
  update sales_quotes set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0 and status in ('draft', 'sent', 'viewed');
  get diagnostics c = row_count;
  raise notice '[075] badges card on % open quotes', c;
end $mig$;

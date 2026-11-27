-- New "About Labb" wording on the Labb Station proposal, naming the client's type of organization ({{client_type}}).
do $mig$
declare oldb text := $o$  <div class="micro">About Labb</div>
  <h2>Drug testing technology built on accuracy and privacy</h2>
  <p>Labb (Ramsey Diagnostics Corporation d/b/a Labb) is a Norfolk, Virginia company that builds digital tools for drug testing. Labb's founder has worked in the drug testing industry since 1997, and that experience shaped one goal: give testing programs results they can trust, while treating every donor with privacy and respect.</p>
  <p style="margin-bottom:0">Labb designs its own rapid test kits, runs its own reading platform, and connects clients to laboratory confirmation when a result needs it. Labb Station is built for all types of testing: workplace, clinic and collection site, forensic and treatment.</p>
$o$; newb text := $n$  <div class="micro">About Labb</div>
  <h2>Drug testing technology built for {{client_type}}</h2>
  <p>Labb is a Norfolk, Virginia company that builds software and technology to help organizations better manage their drug testing programs. Labb's founder has worked in the drug testing industry since 1997, and that experience shaped one goal: complete, purpose-built platforms that help {{client_type}} run and manage every aspect of drug testing, business development, program management and related services.</p>
  <p style="margin-bottom:0">Labb makes its own proprietary rapid test kits, runs its own Labb technology, and connects clients to laboratory confirmation when a result needs it. Labb offers a wide range of SaaS platforms for all types of organizations. The company is dedicated to better drug testing through technology.</p>
$n$; n int;
begin
  update quote_templates set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0;
  update sales_quotes set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0 and status in ('draft', 'sent', 'viewed');
  get diagnostics n = row_count;
  raise notice '[072] new About Labb on % open quotes', n;
end $mig$;

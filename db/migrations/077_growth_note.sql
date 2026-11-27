-- About Labb: a growth paragraph for clinics, collection sites and TPAs ({{growth_note}}, empty for other clients).
do $mig$
declare oldb text := $o$The company is dedicated to better drug testing through technology.</p>
$o$; newb text := $n$The company is dedicated to better drug testing through technology.</p>
  {{growth_note}}
$n$; c int;
begin
  update quote_templates set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0 and position('{{growth_note}}' in html) = 0;
  update sales_quotes set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0 and position('{{growth_note}}' in html) = 0 and status in ('draft', 'sent', 'viewed');
  get diagnostics c = row_count;
  raise notice '[077] growth paragraph on % open quotes', c;
end $mig$;

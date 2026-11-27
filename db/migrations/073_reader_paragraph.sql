-- New "A digital reader for rapid drug tests" wording on the Labb Station proposal.
do $mig$
declare oldb text := $o$<p>Labb Station replaces the visual read of a rapid test with a digital read. The collector captures an image of the test kit in the Labb app, and the platform returns the result. Clients can use their own phone or tablet as the reader, or order the Labb Station system (tablet and stand). The rapid screen reader technology is patented (US PAT 10,340,032).</p>$o$; newb text := $n$<p>Labb platforms replace the manual read of a rapid test by collectors with a digital reader app. The collector captures an image of the test kit in the Labb mobile app, and the platform interprets and returns the result quickly. Clients can use their own phone or tablet as the reader, or order the Labb Station system (tablet and stand). The rapid screen mobile app reader holds a US patent (US PAT 10,340,032).</p>$n$; n int;
begin
  update quote_templates set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0;
  update sales_quotes set html = replace(html, oldb, newb), updated_at = now() where position(oldb in html) > 0 and status in ('draft', 'sent', 'viewed');
  get diagnostics n = row_count;
  raise notice '[073] new reader paragraph on % open quotes', n;
end $mig$;

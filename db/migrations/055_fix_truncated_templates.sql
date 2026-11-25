-- Templates pasted before uploads could hold images were cut off at 400 KB, leaving only the cover and part
-- of a page. Turn those templates off and move draft or unsigned quotes that use them to the Labb Station proposal.
do $$
declare station bigint; n int;
begin
  select id into station from quote_templates where name = 'Labb Station proposal and quote' limit 1;
  update quote_templates set active = false, notes = 'Turned off: this copy was cut off at 400 KB and is missing most of the quote. Use Labb Station proposal and quote.'
    where html ilike '%<html%' and html not ilike '%</html>%' and active;
  get diagnostics n = row_count;
  raise notice '[055] turned off % cut-off templates', n;
  if station is not null then
    update sales_quotes set html = (select html from quote_templates where id = station), template_id = station, updated_at = now()
      where html ilike '%<html%' and html not ilike '%</html>%' and status in ('draft', 'sent', 'viewed');
    get diagnostics n = row_count;
    raise notice '[055] moved % quotes to the Labb Station proposal', n;
  end if;
end $$;

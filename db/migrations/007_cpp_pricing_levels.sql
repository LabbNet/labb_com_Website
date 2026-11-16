-- Price by service level: Service Level 1 and Service Level 3, each with a member price and MSRP.
alter table cpp_price_items add column if not exists sl1_cents      integer;
alter table cpp_price_items add column if not exists sl1_msrp_cents integer;
alter table cpp_price_items add column if not exists sl3_cents      integer;
alter table cpp_price_items add column if not exists sl3_msrp_cents integer;
-- Carry any earlier single prices into Service Level 1.
update cpp_price_items set sl1_cents = member_cents, sl1_msrp_cents = employer_cents
  where sl1_cents is null and sl1_msrp_cents is null and (member_cents is not null or employer_cents is not null);

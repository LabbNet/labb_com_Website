-- A quote is valid for 30 days from the day it's sent, unless the rep set the date by hand.
alter table sales_quotes add column if not exists expires_manual boolean not null default false;

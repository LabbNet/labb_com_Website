-- Member-editable contact details
alter table members add column if not exists phone          text;
alter table members add column if not exists address_line1  text;
alter table members add column if not exists address_line2  text;
alter table members add column if not exists city           text;
alter table members add column if not exists state          text;
alter table members add column if not exists postal_code    text;

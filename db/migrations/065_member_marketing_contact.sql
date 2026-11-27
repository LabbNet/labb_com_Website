-- How a CPP member wants their company name, phone and email shown on Labb marketing materials (free text, several lines).
alter table members add column if not exists marketing_contact text;

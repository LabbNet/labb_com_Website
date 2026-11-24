-- Ask an Expert: answers found in the guidebooks or on labb.com go out right away (status 'auto').
alter table ask_questions drop constraint if exists ask_questions_status_check;
alter table ask_questions add constraint ask_questions_status_check check (status in ('pending', 'approved', 'auto', 'matched', 'rejected'));

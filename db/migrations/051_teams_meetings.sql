-- Microsoft Teams meetings: the Outlook event created in the host's calendar for each Labb meeting.
alter table lead_meetings add column if not exists graph_event_id text;
alter table lead_meetings add column if not exists graph_mailbox text;

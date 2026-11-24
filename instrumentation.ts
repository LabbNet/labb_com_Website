// Runs once when the server starts. Starts the reads schedule job (reminders, the 7 AM email and night
// coverage), once a minute. Every send is recorded in the database, so a second instance during a deploy
// can't send duplicates.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  // Ask an Expert knowledge base: load guidebook passages, kits and drug profiles when they change.
  const { syncKb } = await import("@/lib/kb");
  setTimeout(() => syncKb(), 5_000);
  setInterval(() => syncKb(), 60 * 60_000); // picks up new and edited articles
  const { runReadsJobs } = await import("@/lib/readsNotify");
  setTimeout(() => runReadsJobs(), 15_000);
  setInterval(() => runReadsJobs(), 60_000);
  // Lead meeting reminders (video link about an hour before each call).
  const { runMeetingJobs } = await import("@/lib/meetings");
  setInterval(() => runMeetingJobs(), 60_000);
  // Leads: fold repeat submissions from the same email into one record, and flag likely duplicates for review.
  const { runDupeJobs } = await import("@/lib/dupes");
  setTimeout(() => runDupeJobs(), 25_000);
  setInterval(() => runDupeJobs(), 60 * 60_000);
  // Outlook busy times for each team member's booking page, every 10 minutes.
  const { runCalendarSync } = await import("@/lib/calsync");
  setTimeout(() => runCalendarSync(), 20_000);
  setInterval(() => runCalendarSync(), 10 * 60_000);
}

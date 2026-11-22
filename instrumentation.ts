// Runs once when the server starts. Starts the reads schedule job (reminders, the 7 AM email and night
// coverage), once a minute. Every send is recorded in the database, so a second instance during a deploy
// can't send duplicates.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { runReadsJobs } = await import("@/lib/readsNotify");
  setTimeout(() => runReadsJobs(), 15_000);
  setInterval(() => runReadsJobs(), 60_000);
  // Lead meeting reminders (video link about an hour before each call).
  const { runMeetingJobs } = await import("@/lib/meetings");
  setInterval(() => runMeetingJobs(), 60_000);
}

/* 4WDScout — runtime config.
 * These are PUBLIC values (safe to ship): the anon key is protected by RLS.
 * NEVER put the service_role or sb_secret_ key here — those bypass security. */
window.TRACKTION_CONFIG = {
  supabaseUrl: "https://ybicbvvloukajjgdqkpx.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaWNidnZsb3VrYWpqZ2Rxa3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjIxNjMsImV4cCI6MjEwMDYzODE2M30.LS-8XOb3cmyZFb2iZkMHJSdzcWceXp7RFMLGOY3TTow",
  // apple stays false until Sign in with Apple is configured (needs the paid
  // Apple Developer Program) — the button hides itself so it can't dead-click
  oauth: { google: true, apple: false }
};

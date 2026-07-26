/* Tracktion — runtime config.
 * Leave the Supabase fields blank to run fully offline (localStorage prototype).
 * Fill them in to switch on real accounts, cloud garage, and price-drop alerts.
 * These are PUBLIC values (safe to ship): the anon key is protected by RLS. */
window.TRACKTION_CONFIG = {
  supabaseUrl: "",       // e.g. "https://abcdxyz.supabase.co"
  supabaseAnonKey: "",   // your project's anon/public key
  oauth: { google: true, apple: true }   // must also be enabled in Supabase Auth
};

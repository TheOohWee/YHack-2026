/**
 * Fixed dashboard identity (account picker hidden).
 * Keep in sync with `WATTSUP_DEFAULT_USER_ID` in wattsup `.env` — otherwise Slack streak
 * credits go to a different Mongo user and the day streak won’t change here.
 */
export const DASHBOARD_USER_ID = "test-user";

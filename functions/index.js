const admin = require("firebase-admin");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

admin.initializeApp();

const ADMIN_BOOTSTRAP_SECRET = defineSecret("ADMIN_BOOTSTRAP_SECRET");

exports.bootstrapAdmin = onCall(
    {secrets: [ADMIN_BOOTSTRAP_SECRET]},
    async (request) => {
      const secret = request.data && request.data.secret;
      const email = request.data && request.data.email;

      if (!secret || !email) {
        throw new HttpsError("invalid-argument", "Missing email or secret.");
      }

      if (secret !== ADMIN_BOOTSTRAP_SECRET.value()) {
        throw new HttpsError("permission-denied", "Invalid bootstrap secret.");
      }

      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, {admin: true});

      return {ok: true, uid: user.uid, email};
    },
);

const {BetaAnalyticsDataClient} = require("@google-analytics/data");
const analyticsClient = new BetaAnalyticsDataClient();

const GA4_PROPERTY_ID = "490467479";

async function runMetric(property, metricName, startDate, endDate) {
  const [resp] = await analyticsClient.runReport({
    property,
    dateRanges: [{startDate, endDate}],
    metrics: [{name: metricName}],
  });

  const v = resp?.rows?.[0]?.metricValues?.[0]?.value ?? "0";
  return Number(v);
}

exports.getVisitsSummary = onCall({region: "us-central1"}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const isAdmin = request.auth?.token?.admin === true;
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin only.");
    }

    if (!GA4_PROPERTY_ID || !/^\d+$/.test(GA4_PROPERTY_ID)) {
      throw new HttpsError("failed-precondition", "GA4_PROPERTY_ID is missing/invalid.");
    }

    const property = `properties/${GA4_PROPERTY_ID}`;

    // Today
    const today = await runMetric(property, "sessions", "today", "today");

    // Month-to-date (UTC first day of month)
    const now = new Date();
    const startMonth =
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const monthToDate = await runMetric(property, "sessions", startMonth, "today");

    // All-time (set a very early start date)
    const allTime = await runMetric(property, "sessions", "2025-01-01", "today");

    return {today, monthToDate, allTime};
  } catch (err) {
    console.error("getVisitsSummary error:", err);

    // ✅ This makes the REAL error show in your browser console
    const msg = err?.message || String(err);
    throw new HttpsError("internal", `GA4 failed: ${msg}`);
  }
});

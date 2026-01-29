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

const { BetaAnalyticsDataClient } = require("@google-analytics/data");

// Uses the Cloud Functions service account automatically (ADC)
const ga4 = new BetaAnalyticsDataClient();

function toYMD(d) {
  return d.toISOString().slice(0, 10);
}

async function runSessionsReport(propertyId, startDate, endDate) {
  const [res] = await ga4.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: "sessions" }],
  });

  const v = res.rows?.[0]?.metricValues?.[0]?.value;
  return Number(v || 0);
}

exports.getVisitsSummary = onCall(async (request) => {
  // Admin only
  const isAdmin = !!(request.auth?.token?.admin === true);
  if (!isAdmin) throw new HttpsError("permission-denied", "Admin only.");

  // ✅ Put your GA4 PROPERTY ID here (numbers only)
  // Example: if GA4 shows "properties/123456789" then use "123456789"
  const PROPERTY_ID = "490467479";

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const today = "today";
  const monthStart = toYMD(startOfMonth);

  const todaySessions = await runSessionsReport(PROPERTY_ID, today, today);
  const monthSessions = await runSessionsReport(PROPERTY_ID, monthStart, "today");

  // “All time” — set a very early date (GA4 will clamp to first data available)
  const allTimeSessions = await runSessionsReport(PROPERTY_ID, "2005-01-01", "today");

  return {
    today: todaySessions,
    monthToDate: monthSessions,
    allTime: allTimeSessions,
  };
});


const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();

const ADMIN_BOOTSTRAP_SECRET = defineSecret("ADMIN_BOOTSTRAP_SECRET");

/**
 * One-time bootstrap:
 * Sets { admin: true } custom claim on the user with the provided email.
 * Protected by Secret Manager so nothing sensitive is in frontend code.
 */
exports.bootstrapAdmin = onCall(
  { secrets: [ADMIN_BOOTSTRAP_SECRET] },
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
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    return { ok: true, uid: user.uid, email };
  }
);

exports.getVisitsSummary = onCall(async (request) => {
  // Admin only
  if (!request.auth || !request.auth.token || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin only.");
  }

  // STUB for now (Stage 3 will replace with real GA4)
  return {
    today: 0,
    monthToDate: 0,
    allTime: 0
  };
});

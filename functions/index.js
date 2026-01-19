const admin = require("firebase-admin");
admin.initializeApp();

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ADMIN_BOOTSTRAP_SECRET = defineSecret("ADMIN_BOOTSTRAP_SECRET");

/**
 * POST JSON:
 * {
 *   "secret": "...",
 *   "email": "someone@example.com",
 *   "admin": true
 * }
 */
exports.bootstrapSetAdmin = onRequest(
  { secrets: [ADMIN_BOOTSTRAP_SECRET], cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") return res.status(405).send("Use POST");

      const { secret, email, admin: makeAdmin } = req.body || {};
      if (!secret || secret !== ADMIN_BOOTSTRAP_SECRET.value()) {
        return res.status(403).send("Forbidden");
      }
      if (!email) return res.status(400).send("Missing email");

      const user = await admin.auth().getUserByEmail(String(email).trim());
      await admin.auth().setCustomUserClaims(user.uid, { admin: !!makeAdmin });

      return res.json({ ok: true, uid: user.uid, admin: !!makeAdmin });
    } catch (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
  }
);

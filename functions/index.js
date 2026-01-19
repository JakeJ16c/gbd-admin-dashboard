const admin = require("firebase-admin");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

admin.initializeApp();

const ADMIN_BOOTSTRAP_SECRET = defineSecret("ADMIN_BOOTSTRAP_SECRET");

exports.bootstrapAdmin = onRequest({secrets: [ADMIN_BOOTSTRAP_SECRET]}, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Use POST"});
  }

  const {email, secret} = req.body || {};

  if (!email || !secret) {
    return res.status(400).json({error: "Missing email/secret"});
  }

  if (secret !== ADMIN_BOOTSTRAP_SECRET.value()) {
    return res.status(403).json({error: "Forbidden"});
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {admin: true});
    return res.json({ok: true, uid: user.uid, email});
  } catch (e) {
    return res.status(500).json({error: e.message});
  }
});

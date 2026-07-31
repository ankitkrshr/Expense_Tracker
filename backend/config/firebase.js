const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

let app;

try {
  const serviceAccountPathBackend = path.join(__dirname, '../serviceAccountKey.json');
  const serviceAccountPathRoot = path.join(__dirname, '../../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPathBackend)) {
    const serviceAccount = require(serviceAccountPathBackend);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully.");
  } else if (fs.existsSync(serviceAccountPathRoot)) {
    const serviceAccount = require(serviceAccountPathRoot);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully.");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully from env.");
  } else {
    console.warn("WARNING: Firebase Admin not initialized. Missing serviceAccountKey.json");
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error.message);
}

module.exports = { getAuth };

// This script will help you deploy Firebase rules
console.log(`
To deploy the Firestore security rules, follow these steps:

1. Install Firebase CLI if you haven't done so:
   npm install -g firebase-tools

2. Login to Firebase:
   firebase login

3. Initialize Firebase in your project (if not already done):
   firebase init

4. Deploy the Firestore security rules:
   firebase deploy --only firestore:rules

This will update your database permissions and fix the "Missing or insufficient permissions" error.
`); 
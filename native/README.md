# The iPhone app

A native shell (Capacitor 8) around the live app at
`https://londonhandstandacademy.com/lha-app.html`. Every change to the app
reaches the iPhone app without a new App Store release. Only a change to this
folder (the icon, permissions, the shell itself) needs a new build.

Never published to the website: the production build deletes `native/`.

## What is already done

- The Xcode project, `ios/App/App.xcodeproj`, bundle id
  `com.londonhandstandacademy.app`, name "Handstand", portrait only.
- The shell adds `LHAiOS` to the browser's name. The app sees it and runs its
  App Store build: nothing digital is priced or sold (Apple's rule without
  in-app purchase), and there are no Home Screen nudges. To preview it in a
  browser, open the app with `?ios=1` (and `?ios=0` to go back).
- Offline workouts keep working: the site is an app-bound domain.
- Camera, microphone and photo library permissions, with the reasons shown.
- Notifications through Apple: the app registers the phone, the server sends
  with `netlify/functions/push.mjs`. They are off until the keys are set.
- Delete my account, under Your account, which Apple requires.
- The icon, from `icons/icon-512-maskable.png`, scaled to 1024. A 1024 original
  would be sharper.

## What Elliott does, once

1. Install Xcode from the Mac App Store, open it once, then run
   `sudo xcode-select -s /Applications/Xcode.app` in Terminal.
2. Join the Apple Developer Program (developer.apple.com, £79 a year).
3. In Terminal: `cd ~/lha/native && npx cap sync ios && npx cap open ios`.
4. In Xcode: the App target, Signing & Capabilities, choose your Team, and
   add the Push Notifications capability.
5. Run it on the simulator or your iPhone with the play button.

## Notifications through Apple

In the Apple Developer site, Keys, make a key with Apple Push Notifications
service. Download the .p8 file once (Apple never shows it again). Then in
Netlify, Site configuration, Environment variables, add:

| Variable | Value |
| --- | --- |
| `APNS_KEY` | the whole text of the .p8 file |
| `APNS_KEY_ID` | the key's ID, 10 characters |
| `APNS_TEAM_ID` | your Team ID, 10 characters |
| `APNS_TOPIC` | `com.londonhandstandacademy.app` |
| `APNS_ENV` | `sandbox` while testing from Xcode, `production` for the App Store |

Never paste the .p8 file into a chat or commit it: this repository is public.

## Sign in with Apple

Continue with Apple sits on Sign in and on Create an account in the iPhone
app (not on the website). It only shows once the native plugin answers, so a
build without it never shows a dead button.

- The shell: `CapApp-SPM/Sources/CapApp-SPM/AppleSignIn.swift`, and the
  `com.apple.developer.applesignin` entitlement in `App/App.entitlements`.
- The server: `/api/app/auth/apple/nonce`, then `/api/app/auth/apple`, which
  checks Apple's identity token against Apple's published keys and ties
  Apple's user id to the email account (`apple:<email>`, `applesub:<id>`).
  An existing account on the address Apple verifies is signed in to;
  otherwise a new one is made and welcomed like an email sign up.
- Deleting the account revokes Apple's token, which Apple requires. The
  client secret for that is signed with the push key: key 26CN626Q89 has
  Sign in with Apple switched on too, so `APNS_KEY` and `APNS_KEY_ID` do
  both jobs. `SIWA_KEY` and `SIWA_KEY_ID` take over if a separate key is
  ever made.
- Hide My Email addresses only receive mail from registered senders:
  londonhandstandacademy.com, send.londonhandstandacademy.com and
  info@londonhandstandacademy.com are registered under Services, Sign in
  with Apple for Email Communication.

## The Ladder through Apple (in-app purchase)

The iPhone app sells one thing, the Ladder, through Apple. Coaching, sessions
and form checks are never sold inside it (`sells()` stays false for them;
`sellsLadder()` is true once the App Store answers with the product).

- The shell: `CapApp-SPM/Sources/CapApp-SPM/LadderStore.swift` (StoreKit 2).
- The server: `/api/app/iap/verify` checks each transaction Apple signed,
  pinned to Apple Root CA G3, and opens the Ladder until the date Apple gives
  (it rides on plus_until). `/api/app/iap/notify` takes Apple's renewals,
  refunds and lapses.

### Once, in App Store Connect

1. Agreements, Tax and Banking: accept the Paid Apps agreement, add your bank
   and tax details. Apple will not sell anything until this is done.
2. Your app, Monetisation, Subscriptions: a group called Handstand Ladder,
   with one subscription:
   - Reference name: The Handstand Ladder, monthly
   - Product ID: `com.londonhandstandacademy.app.ladder.monthly` (exactly)
   - Duration: 1 month. Price: £11.99 (UK), let Apple set the others.
   - Introductory offer: Free, 1 week, new subscribers.
   - Display name: The Handstand Ladder. Description: Every stage, film and fix.
   - Review screenshot: the purchase screen from the simulator.
3. App Information, App Store Server Notifications: version 2, the same URL
   for Production and Sandbox:
   `https://londonhandstandacademy.com/api/app/iap/notify`
4. Test it with a Sandbox tester (Users and Access, Sandbox) on TestFlight.
   A purchase in the Xcode simulator is signed by Xcode, not Apple, so the
   server rightly refuses it: the real test is TestFlight.

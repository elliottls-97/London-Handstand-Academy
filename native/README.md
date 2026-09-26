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

## Selling inside the app later

`sells()` in `lha-app.html` is the one switch. When Apple in-app purchase is
added (StoreKit in the shell, and the server checking Apple's receipts), set
`IOS_SELL` and the prices and buttons come back inside the iPhone app.

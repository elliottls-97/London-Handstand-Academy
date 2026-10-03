import Foundation
import UIKit
import Capacitor
import AuthenticationServices

/* Sign in with Apple, for the iPhone app.

   The web app asks the server for a nonce, passes its hash here, and gets
   back Apple's signed identity token with that hash inside it, plus a
   one-time authorisation code. Both go to the server (/api/app/auth/apple),
   which checks Apple's signature and decides who this is. Nothing here
   trusts anything: it only shows Apple's sheet and hands back what Apple
   signed.

   Apple gives the name and the email only the first time someone signs in
   to this app. After that the token carries Apple's user id, which the
   server has already tied to the account. */
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
                                ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
    ]
    private var pending: CAPPluginCall?

    /* the page only shows the button once this answers, so a build made
       before this plugin existed never shows one that does nothing */
    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["ok": true])
    }

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            /* a second tap while Apple's sheet is up replaces the first */
            if let old = self.pending { old.reject("Replaced by a newer sign in", "CANCELLED") }
            self.pending = call
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            if let nonce = call.getString("nonce"), !nonce.isEmpty { request.nonce = nonce }
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pending else { return }
        pending = nil
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = cred.identityToken, let token = String(data: data, encoding: .utf8) else {
            call.reject("Apple sent nothing back", "FAILED"); return
        }
        var o: [String: Any] = ["identityToken": token, "user": cred.user]
        if let c = cred.authorizationCode, let code = String(data: c, encoding: .utf8) { o["authorizationCode"] = code }
        if let e = cred.email { o["email"] = e }
        if let n = cred.fullName {
            o["givenName"] = n.givenName ?? ""
            o["familyName"] = n.familyName ?? ""
        }
        call.resolve(o)
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        guard let call = pending else { return }
        pending = nil
        if (error as? ASAuthorizationError)?.code == .canceled {
            call.reject("Cancelled", "CANCELLED"); return
        }
        call.reject(error.localizedDescription, "FAILED", error)
    }
}

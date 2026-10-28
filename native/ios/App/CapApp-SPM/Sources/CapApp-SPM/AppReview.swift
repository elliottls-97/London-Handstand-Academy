import Foundation
import UIKit
import Capacitor
import StoreKit

/* Apple's own "Enjoying the app?" stars, asked at a win: a stage cleared or
   a check point reached (Elliott, 28 Oct 2026, after 1.0 went live).

   Apple decides whether the sheet actually shows. It shows at most three
   times in a year whatever is asked, never in TestFlight builds, and says
   nothing back about whether it showed or what was chosen. So the page
   keeps its own count of asks and this only ever passes the request on. */
@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ask", returnType: CAPPluginReturnPromise),
    ]

    /* a build made before this plugin existed never answers, so the page
       never asks one */
    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["ok": true, "v": 1])
    }

    @objc func ask(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.resolve(["asked": false]); return
            }
            if #available(iOS 16.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve(["asked": true])
        }
    }
}

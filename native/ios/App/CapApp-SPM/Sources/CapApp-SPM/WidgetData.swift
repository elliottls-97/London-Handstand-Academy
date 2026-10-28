import Foundation
import UIKit
import Capacitor
import WidgetKit
import WebKit

/* What the Home Screen and Lock Screen widgets show (1.0.1).

   The page hands over a snapshot as the app goes to the background: the
   week by weekday, the check points, and the sign in, which From Elliott
   uses to ask the server for his latest message every half hour by itself.
   It all sits in the app group both the app and the widget extension can
   read, and nowhere else. Signing out clears it.

   A widget tapped opens the app with lhaapp://go?to=chat (or today, cps):
   the scene delegate hands the address here, and the page asks for it with
   pending(), on opening and on coming back to the front. */
@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetDataPlugin"
    public let jsName = "WidgetData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
    ]
    public static let group = "group.com.londonhandstandacademy.app"
    private static var waiting: [String: String]? = nil

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["ok": UserDefaults(suiteName: WidgetDataPlugin.group) != nil, "v": 1])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let d = UserDefaults(suiteName: WidgetDataPlugin.group) else { call.resolve(["ok": false]); return }
        d.set(call.getString("data") ?? "{}", forKey: "snap")
        d.set(call.getString("token") ?? "", forKey: "token")
        d.set(call.getString("base") ?? "https://londonhandstandacademy.com", forKey: "base")
        d.set(Date().timeIntervalSince1970, forKey: "at")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve(["ok": true])
    }

    @objc func clear(_ call: CAPPluginCall) {
        if let d = UserDefaults(suiteName: WidgetDataPlugin.group) {
            ["snap", "token", "remote", "at"].forEach { d.removeObject(forKey: $0) }
        }
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve(["ok": true])
    }

    @objc func pending(_ call: CAPPluginCall) {
        let w = WidgetDataPlugin.waiting
        WidgetDataPlugin.waiting = nil
        call.resolve(["go": w?["go"] ?? "", "m": w?["m"] ?? ""])
    }

    /* lhaapp://go?to=chat: kept until the page asks, and the page is
       nudged in case it is already open */
    @discardableResult
    public static func open(_ url: URL, webView: WKWebView?) -> Bool {
        guard url.scheme == "lhaapp" else { return false }
        let q = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let to = q.first(where: { $0.name == "to" })?.value ?? "today"
        let m = q.first(where: { $0.name == "m" })?.value ?? ""
        waiting = ["go": to, "m": m]
        webView?.evaluateJavaScript("window.lhaWidgetOpen && lhaWidgetOpen()", completionHandler: nil)
        return true
    }
}

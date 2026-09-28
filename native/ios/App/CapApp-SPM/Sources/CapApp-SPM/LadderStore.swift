import Foundation
import UIKit
import Capacitor
import StoreKit

/* The Ladder, sold inside the iPhone app through Apple (StoreKit 2).

   The web app asks for the product, starts a purchase, restores, and opens
   Apple's own Manage Subscriptions screen through this. Every transaction
   comes back as Apple's signed JWS, which the web app hands to the server
   (/api/app/iap/verify) to check against Apple's root certificate. Nothing
   here decides who has paid: the server does, on Apple's signature.

   Transactions are finished as soon as StoreKit has verified them. What a
   person owns is always recoverable from Transaction.currentEntitlements,
   which the web app reads on every launch. */
@objc(LadderStorePlugin)
public class LadderStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LadderStorePlugin"
    public let jsName = "LadderStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise),
    ]
    private var updates: Task<Void, Never>?

    /* renewals, purchases approved later (Ask to Buy) and refunds arrive
       here while the app is open; the page hears about each one */
    public override func load() {
        updates = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let t) = result { await t.finish() }
                self?.notifyListeners("transaction", data: ["jws": result.jwsRepresentation])
            }
        }
    }

    deinit { updates?.cancel() }

    private func period(_ p: Product.SubscriptionPeriod) -> [String: Any] {
        let unit: String
        switch p.unit {
        case .day: unit = "day"
        case .week: unit = "week"
        case .month: unit = "month"
        case .year: unit = "year"
        @unknown default: unit = "month"
        }
        return ["unit": unit, "value": p.value]
    }

    private func describe(_ p: Product) async -> [String: Any] {
        var o: [String: Any] = [
            "id": p.id,
            "title": p.displayName,
            "displayPrice": p.displayPrice,
            "price": NSDecimalNumber(decimal: p.price).doubleValue,
        ]
        if let sub = p.subscription {
            o["period"] = period(sub.subscriptionPeriod)
            if let intro = sub.introductoryOffer {
                let mode: String
                switch intro.paymentMode {
                case .freeTrial: mode = "freeTrial"
                case .payAsYouGo: mode = "payAsYouGo"
                case .payUpFront: mode = "payUpFront"
                default: mode = "other"
                }
                o["intro"] = ["mode": mode, "period": period(intro.period), "displayPrice": intro.displayPrice]
                o["introEligible"] = await sub.isEligibleForIntroOffer
            }
        }
        return o
    }

    @objc func products(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                var out: [[String: Any]] = []
                for p in try await Product.products(for: ids) { out.append(await describe(p)) }
                call.resolve(["products": out])
            } catch {
                call.reject("Could not reach the App Store", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Which product?"); return }
        let token = call.getString("accountToken").flatMap { UUID(uuidString: $0) }
        Task {
            do {
                guard let p = try await Product.products(for: [id]).first else {
                    call.reject("That is not on sale in this App Store"); return
                }
                var options: Set<Product.PurchaseOption> = []
                if let t = token { options.insert(.appAccountToken(t)) }
                switch try await p.purchase(options: options) {
                case .success(let result):
                    if case .verified(let t) = result { await t.finish() }
                    call.resolve(["status": "purchased", "jws": result.jwsRepresentation])
                case .pending:
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.resolve(["status": "unknown"])
                }
            } catch {
                call.reject(error.localizedDescription, nil, error)
            }
        }
    }

    private func owned() async -> [[String: Any]] {
        var out: [[String: Any]] = []
        for await r in Transaction.currentEntitlements {
            out.append(["jws": r.jwsRepresentation, "productId": (try? r.payloadValue.productID) ?? ""])
        }
        return out
    }

    @objc func entitlements(_ call: CAPPluginCall) {
        Task { call.resolve(["transactions": await owned()]) }
    }

    /* Restore asks Apple to bring this Apple ID's purchases to the phone,
       which can ask them to sign in; what is owned is returned either way */
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            try? await AppStore.sync()
            call.resolve(["transactions": await owned()])
        }
    }

    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.reject("No window to show it in"); return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription, nil, error)
            }
        }
    }
}

/* The app's one screen, with the store added to the plugins Capacitor
   already knows about. */
public class MainViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LadderStorePlugin())
    }
}

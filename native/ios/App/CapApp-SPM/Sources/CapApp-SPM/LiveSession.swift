import Foundation
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

/* The session on the lock screen and in the Dynamic Island.

   The phone is on the floor while they are upside down, and it locks. The
   follow along tells this what it is showing at each step: the drill, the
   set, work or rest, and when the timer ends. Lock screen and island then
   count down on their own, from that end time, without the app running.

   The app stops when the phone locks, so nothing moves the session on to
   the next drill until it is opened again: when a timer runs out the
   island says what is next, and opening the app carries on from there.

   Live Activities need iOS 16.2. On anything older every call answers and
   does nothing, and the web app asks available() before it starts one.

   The widget extension (SessionWidget) draws them. Its copy of
   LHASessionAttributes must stay field for field the same as this one:
   the system matches the two by the type's name. */
#if canImport(ActivityKit)
@available(iOS 16.1, *)
public struct LHASessionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var drill: String
        public var detail: String
        /* work, rest, reps (no timer), paused or done */
        public var phase: String
        public var startedAt: Date?
        public var endsAt: Date?
        /* seconds left, for a paused timer, which does not count down */
        public var left: Int
        public var step: Int
        public var of: Int
        public var next: String
    }
    public var title: String
}
#endif

@objc(LiveSessionPlugin)
public class LiveSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveSessionPlugin"
    public let jsName = "LiveSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func available(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            call.resolve(["available": ActivityAuthorizationInfo().areActivitiesEnabled])
            return
        }
        #endif
        call.resolve(["available": false])
    }

    @objc func start(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            let title = call.getString("title") ?? "Your session"
            let content = ActivityContent(state: Self.state(call), staleDate: Self.stale(call))
            Task {
                /* one session at a time: a killed app can leave one behind */
                for a in Activity<LHASessionAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
                do {
                    let a = try Activity.request(attributes: LHASessionAttributes(title: title), content: content, pushType: nil)
                    call.resolve(["started": true, "id": a.id])
                } catch {
                    call.resolve(["started": false, "why": error.localizedDescription])
                }
            }
            return
        }
        #endif
        call.resolve(["started": false])
    }

    @objc func update(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            let content = ActivityContent(state: Self.state(call), staleDate: Self.stale(call))
            Task {
                for a in Activity<LHASessionAttributes>.activities { await a.update(content) }
                call.resolve()
            }
            return
        }
        #endif
        call.resolve()
    }

    /* done: the session was finished, and says so for a while on the lock
       screen; otherwise it was ended early and goes at once */
    @objc func end(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            let done = call.getBool("done") ?? false
            let last = LHASessionAttributes.ContentState(drill: done ? "Session done" : "Session ended",
                detail: call.getString("detail") ?? "", phase: "done", startedAt: nil, endsAt: nil,
                left: 0, step: 0, of: 0, next: "")
            Task {
                for a in Activity<LHASessionAttributes>.activities {
                    await a.end(ActivityContent(state: last, staleDate: nil),
                                dismissalPolicy: done ? .after(Date().addingTimeInterval(15 * 60)) : .immediate)
                }
                call.resolve()
            }
            return
        }
        #endif
        call.resolve()
    }

    #if canImport(ActivityKit)
    private static func date(_ call: CAPPluginCall, _ key: String) -> Date? {
        guard let ms = call.getDouble(key), ms > 0 else { return nil }
        return Date(timeIntervalSince1970: ms / 1000)
    }

    @available(iOS 16.1, *)
    private static func state(_ call: CAPPluginCall) -> LHASessionAttributes.ContentState {
        let ends = date(call, "endsAt")
        var started = date(call, "startedAt")
        /* a countdown needs its start before its end */
        if let e = ends, let s = started, s > e { started = e }
        return LHASessionAttributes.ContentState(
            drill: String((call.getString("drill") ?? "").prefix(60)),
            detail: String((call.getString("detail") ?? "").prefix(80)),
            phase: call.getString("phase") ?? "work",
            startedAt: started, endsAt: ends,
            left: max(0, call.getInt("left") ?? 0),
            step: max(0, call.getInt("step") ?? 0), of: max(0, call.getInt("of") ?? 0),
            next: String((call.getString("next") ?? "").prefix(60)))
    }

    /* a timer that has run out while the app could not say what came next */
    private static func stale(_ call: CAPPluginCall) -> Date? {
        guard let e = date(call, "endsAt") else { return nil }
        return e.addingTimeInterval(3)
    }
    #endif
}

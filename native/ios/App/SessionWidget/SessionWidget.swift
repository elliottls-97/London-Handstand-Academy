import WidgetKit
import SwiftUI
import ActivityKit

/* The follow along on the lock screen and in the Dynamic Island.

   The app (LiveSession.swift in CapApp-SPM) says what is on screen at each
   step; this only draws it. The countdowns run from the end time they are
   given, so they keep going with the app asleep. When one runs out with
   the app still asleep, the card says what is next and to open the app.

   This copy of LHASessionAttributes must stay field for field the same as
   the app's: the system matches the two by the type's name. */
struct LHASessionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var drill: String
        var detail: String
        var phase: String
        var startedAt: Date?
        var endsAt: Date?
        var left: Int
        var step: Int
        var of: Int
        var next: String
    }
    var title: String
}

/* the app's colours: teal on the cool near white, and a lighter teal on
   the island's black, where the dark one disappears */
private let teal = Color(red: 0, green: 0.4, blue: 0.388)
private let tealOnBlack = Color(red: 0.247, green: 0.561, blue: 0.549)
private let ink = Color(red: 0.067, green: 0.067, blue: 0.067)
private let grey = Color(red: 0.353, green: 0.353, blue: 0.353)
private let ground = Color(red: 0.957, green: 0.957, blue: 0.961)

private func mmss(_ s: Int) -> String { String(format: "%d:%02d", s / 60, s % 60) }

private func kicker(_ s: LHASessionAttributes.ContentState) -> String {
    switch s.phase {
    case "rest": return "REST"
    case "paused": return "PAUSED"
    case "done": return "DONE"
    default: return s.of > 0 ? "SET \(s.step) OF \(s.of)" : "NOW"
    }
}

/* what is next is always said, not only once the timer has run out: the
   system does not always redraw a card the moment it goes stale */
private func line(_ s: LHASessionAttributes.ContentState, stale: Bool) -> String {
    if s.phase == "done" { return s.detail }
    if stale { return s.next.isEmpty ? "Open the app to carry on" : "Next: \(s.next). Open the app to carry on" }
    if s.phase == "rest" { return s.next.isEmpty ? s.detail : "Next: \(s.next)" }
    if s.next.isEmpty { return s.detail }
    return s.detail.isEmpty ? "Next: \(s.next)" : "\(s.detail) \u{00B7} Next: \(s.next)"
}

/* the countdown, drawn by the system from the end time */
struct Countdown: View {
    let s: LHASessionAttributes.ContentState
    let size: CGFloat
    let color: Color
    var body: some View {
        Group {
            if s.phase == "paused" {
                Text(mmss(s.left))
            } else if let end = s.endsAt, s.phase != "done" {
                Text(timerInterval: min(s.startedAt ?? end, end)...end, countsDown: true, showsHours: false)
            } else if s.phase == "done" {
                Image(systemName: "checkmark")
            } else {
                Text(s.of > 0 ? "\(s.step)/\(s.of)" : "Go")
            }
        }
        .font(.system(size: size, weight: .semibold, design: .rounded))
        .monospacedDigit()
        .foregroundColor(color)
        .multilineTextAlignment(.trailing)
    }
}

struct Bar: View {
    let s: LHASessionAttributes.ContentState
    let tint: Color
    var body: some View {
        if let end = s.endsAt, s.phase == "work" || s.phase == "rest" {
            ProgressView(timerInterval: min(s.startedAt ?? end, end)...end, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                .tint(tint)
        } else if s.of > 0 {
            ProgressView(value: Double(min(s.step, s.of)), total: Double(s.of)).tint(tint)
        }
    }
}

struct LockView: View {
    let context: ActivityViewContext<LHASessionAttributes>
    var body: some View {
        let s = context.state
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(kicker(s))
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.5)
                        .foregroundColor(teal)
                    Text(s.drill)
                        .font(.system(size: 22, weight: .regular, design: .serif))
                        .foregroundColor(ink)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                    let l = line(s, stale: context.isStale)
                    if !l.isEmpty {
                        Text(l)
                            .font(.system(size: 13))
                            .foregroundColor(grey)
                            .lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                /* a set width, so the timer's reserved room does not push
                   the drill's name onto a second line */
                Countdown(s: s, size: 36, color: teal)
                    .frame(width: 96, alignment: .trailing)
            }
            Bar(s: s, tint: teal)
        }
        .padding(16)
    }
}

struct SessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LHASessionAttributes.self) { context in
            LockView(context: context)
                .activityBackgroundTint(ground)
                .activitySystemActionForegroundColor(teal)
        } dynamicIsland: { context in
            let s = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(kicker(s))
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(1.2)
                            .foregroundColor(tealOnBlack)
                        Text(s.drill)
                            .font(.system(size: 17, weight: .regular, design: .serif))
                            .foregroundColor(.white)
                            .lineLimit(2)
                    }
                    .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Countdown(s: s, size: 30, color: tealOnBlack)
                        .padding(.trailing, 6)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        let l = line(s, stale: context.isStale)
                        if !l.isEmpty {
                            Text(l)
                                .font(.system(size: 13))
                                .foregroundColor(Color(white: 0.75))
                                .lineLimit(1)
                        }
                        Bar(s: s, tint: tealOnBlack)
                    }
                    .padding(.horizontal, 6)
                }
            } compactLeading: {
                Text(s.phase == "rest" ? "Rest" : s.phase == "paused" ? "Paused" : s.phase == "done" ? "Done" : "Set \(s.step)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(tealOnBlack)
            } compactTrailing: {
                Countdown(s: s, size: 14, color: .white)
                    .frame(maxWidth: 46)
            } minimal: {
                Countdown(s: s, size: 12, color: tealOnBlack)
            }
            .keylineTint(tealOnBlack)
        }
    }
}

// MARK: - The Home Screen and Lock Screen widgets (1.0.1)

/* Three widgets, asked for by Elliott on 28 Oct 2026, once the app was in
   the App Store: today's session, the check points, and From Elliott (his
   latest message, or his latest answer on a check point).

   The app writes what they show into the app group as it goes to the
   background (WidgetData.swift in CapApp-SPM): the week by weekday, so
   Today is right tomorrow with the app shut, the check points and their
   names, and the sign in. From Elliott uses the sign in to ask the server
   (/api/app/widget) for itself every half hour, so a reply shows without
   the app being opened. Tapping a widget opens the app where it points. */

private let appGroup = "group.com.londonhandstandacademy.app"
private let amber = Color(red: 0.953, green: 0.663, blue: 0.286)

struct WDay: Codable { var title: String?; var line: String?; var rest: Bool? }
struct WMsg: Codable { var text: String?; var at: Double?; var seen: Bool? }
struct WCp: Codable { var k: String?; var verdict: String?; var note: String?; var at: Double? }
struct WSnap: Codable {
    var signed: Bool?
    var coached: Bool?
    var coach: String?
    var stage: String?
    var week: [String: WDay]?
    var today: WDay?
    var met: Int?
    var of: Int?
    var names: [String: String]?
}
struct WRemote: Codable { var msg: WMsg?; var unread: Int?; var cp: WCp?; var at: Double? }

struct LHAEntry: TimelineEntry {
    let date: Date
    let snap: WSnap?
    let remote: WRemote?
}

private func groupDefaults() -> UserDefaults? { UserDefaults(suiteName: appGroup) }
private func decode<T: Decodable>(_ t: T.Type, _ key: String) -> T? {
    guard let s = groupDefaults()?.string(forKey: key), let d = s.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(t, from: d)
}
/* the gallery's picture of each widget, before the app has said anything */
private let sampleSnap = WSnap(signed: true, coached: false, coach: "Elliott", stage: "Wall Work",
    week: nil, today: WDay(title: "Wall Work", line: "Wall line \u{00B7} 30 min", rest: false),
    met: 4, of: 7, names: ["c1": "Chest to wall, 30 seconds"])
private let sampleRemote = WRemote(msg: WMsg(text: "Lovely line on that one. Next time push the floor away at the top.",
    at: Date().addingTimeInterval(-3600).timeIntervalSince1970 * 1000, seen: false), unread: 1, cp: nil, at: nil)

/* Monday is 0, as in the app */
private func weekday0(_ d: Date) -> Int { (Calendar.current.component(.weekday, from: d) + 5) % 7 }
private func dayFor(_ s: WSnap?, _ d: Date) -> WDay? {
    guard let s = s else { return nil }
    if s.coached == true { return s.today }
    return s.week?[String(weekday0(d))] ?? s.today
}
private func ago(_ ms: Double?) -> String {
    guard let ms = ms, ms > 0 else { return "" }
    let f = RelativeDateTimeFormatter(); f.unitsStyle = .full
    return f.localizedString(for: Date(timeIntervalSince1970: ms / 1000), relativeTo: Date())
}

/* Today and the check points: what the app last said, redrawn at each
   midnight for a week so the day moves on with the app shut */
struct LocalProvider: TimelineProvider {
    func placeholder(in context: Context) -> LHAEntry { LHAEntry(date: Date(), snap: sampleSnap, remote: nil) }
    func getSnapshot(in context: Context, completion: @escaping (LHAEntry) -> Void) {
        completion(LHAEntry(date: Date(), snap: context.isPreview ? sampleSnap : (decode(WSnap.self, "snap") ?? sampleSnap), remote: nil))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LHAEntry>) -> Void) {
        let snap = decode(WSnap.self, "snap"), cal = Calendar.current
        var entries = [LHAEntry(date: Date(), snap: snap, remote: nil)]
        var day = cal.startOfDay(for: Date())
        for _ in 0..<7 {
            guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
            entries.append(LHAEntry(date: day, snap: snap, remote: nil))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

/* From Elliott: asks the server itself, every half hour */
struct CoachProvider: TimelineProvider {
    func placeholder(in context: Context) -> LHAEntry { LHAEntry(date: Date(), snap: sampleSnap, remote: sampleRemote) }
    func getSnapshot(in context: Context, completion: @escaping (LHAEntry) -> Void) {
        if context.isPreview { completion(placeholder(in: context)); return }
        completion(LHAEntry(date: Date(), snap: decode(WSnap.self, "snap"), remote: decode(WRemote.self, "remote") ?? sampleRemote))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LHAEntry>) -> Void) {
        let snap = decode(WSnap.self, "snap"), kept = decode(WRemote.self, "remote")
        let again = Date().addingTimeInterval(30 * 60)
        let d = groupDefaults()
        guard let tok = d?.string(forKey: "token"), !tok.isEmpty,
              let base = d?.string(forKey: "base"), let url = URL(string: base + "/api/app/widget") else {
            completion(Timeline(entries: [LHAEntry(date: Date(), snap: snap, remote: nil)], policy: .after(again)))
            return
        }
        var req = URLRequest(url: url, timeoutInterval: 12)
        req.setValue("Bearer " + tok, forHTTPHeaderField: "Authorization")
        URLSession.shared.dataTask(with: req) { data, resp, _ in
            var remote = kept
            if let data = data, (resp as? HTTPURLResponse)?.statusCode == 200,
               let got = try? JSONDecoder().decode(WRemote.self, from: data) {
                remote = got
                d?.set(String(data: data, encoding: .utf8), forKey: "remote")
            }
            completion(Timeline(entries: [LHAEntry(date: Date(), snap: snap, remote: remote)], policy: .after(again)))
        }.resume()
    }
}

/* the ground, on every iOS this runs on: iOS 17 asks for it this way */
extension View {
    @ViewBuilder func lhaGround(_ c: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) { c }
        } else {
            self.padding(16).background(c)
        }
    }
}

struct Kicker: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10.5, weight: .semibold))
            .tracking(1.3)
            .foregroundColor(teal)
            .lineLimit(1)
    }
}

struct Ring: View {
    let met: Int
    let of: Int
    let size: CGFloat
    var body: some View {
        let f = of > 0 ? min(1, Double(met) / Double(of)) : 0
        ZStack {
            Circle().stroke(teal.opacity(0.14), lineWidth: size * 0.11)
            Circle().trim(from: 0, to: f)
                .stroke(met >= of && of > 0 ? amber : teal, style: StrokeStyle(lineWidth: size * 0.11, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(met)").font(.system(size: size * 0.3, weight: .regular, design: .serif)).foregroundColor(ink)
                Text("of \(of)").font(.system(size: size * 0.13, weight: .semibold)).foregroundColor(grey)
            }
        }
        .frame(width: size, height: size)
    }
}

struct PlayDisc: View {
    var body: some View {
        Image(systemName: "play.fill")
            .font(.system(size: 13, weight: .bold))
            .foregroundColor(.white)
            .frame(width: 32, height: 32)
            .background(Circle().fill(teal))
    }
}

/* nothing written yet: a phone that updated and has not opened the app */
struct OpenOnce: View {
    let what: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Kicker(text: "London Handstand")
            Spacer(minLength: 0)
            Text(what).font(.system(size: 15, weight: .regular, design: .serif)).foregroundColor(ink)
                .minimumScaleFactor(0.85)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// MARK: Today

struct TodayView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let d = dayFor(e.snap, e.date), met = e.snap?.met ?? 0, of = e.snap?.of ?? 0
        let rest = d?.rest == true
        switch family {
        case .accessoryInline:
            Text(e.snap == nil ? "Handstand" : rest ? "Rest day" : (d?.title ?? "Today")).lhaGround(.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(rest ? "REST DAY" : "TODAY").font(.system(size: 11, weight: .semibold))
                Text(d?.title ?? "Open the app").font(.system(size: 15, weight: .semibold)).lineLimit(1)
                Text(rest ? "Mobility if you want it" : (d?.line ?? "")).font(.system(size: 12)).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .lhaGround(.clear)
        case .systemMedium:
            if e.snap == nil { OpenOnce(what: "Open the app once and today's session shows here.").lhaGround(ground) }
            else {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Kicker(text: rest ? "Rest day" : "Today")
                        Text(d?.title ?? "Your session").font(.system(size: 24, weight: .regular, design: .serif))
                            .foregroundColor(ink).lineLimit(2).minimumScaleFactor(0.8)
                        Text(rest ? "Mobility if you want it" : (d?.line ?? "")).font(.system(size: 12.5))
                            .foregroundColor(grey).lineLimit(2)
                        Spacer(minLength: 0)
                        if !rest { PlayDisc() }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if of > 0 {
                        VStack(spacing: 6) {
                            Ring(met: met, of: of, size: 74)
                            Text("CHECK POINTS").font(.system(size: 9, weight: .semibold)).tracking(1.1).foregroundColor(grey)
                        }
                    }
                }
                .lhaGround(ground)
            }
        default:
            if e.snap == nil { OpenOnce(what: "Open the app once and today's session shows here.").lhaGround(ground) }
            else {
                VStack(alignment: .leading, spacing: 4) {
                    Kicker(text: rest ? "Rest day" : "Today")
                    Spacer(minLength: 2)
                    Text(d?.title ?? "Your session").font(.system(size: 21, weight: .regular, design: .serif))
                        .foregroundColor(ink).lineLimit(2).minimumScaleFactor(0.75)
                    Text(rest ? "Mobility if you want it" : (d?.line ?? "")).font(.system(size: 11.5))
                        .foregroundColor(grey).lineLimit(2)
                    Spacer(minLength: 4)
                    HStack {
                        if of > 0 {
                            Text("\(met) of \(of)").font(.system(size: 12, weight: .semibold)).foregroundColor(teal)
                        }
                        Spacer()
                        if !rest { PlayDisc() }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .lhaGround(ground)
            }
        }
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHAToday", provider: LocalProvider()) { e in
            TodayView(e: e).widgetURL(URL(string: "lhaapp://go?to=today"))
        }
        .configurationDisplayName("Today")
        .description("Today's session, one tap from starting.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: Check points

struct CheckpointsView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let met = e.snap?.met ?? 0, of = e.snap?.of ?? 0
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(min(met, max(of, 1))), in: 0...Double(max(of, 1))) {
                Text("CP")
            } currentValueLabel: {
                Text("\(met)")
            }
            .gaugeStyle(.accessoryCircular)
            .lhaGround(.clear)
        case .accessoryInline:
            Text(of > 0 ? "\(met) of \(of) check points" : "Check points").lhaGround(.clear)
        default:
            if e.snap == nil || of == 0 { OpenOnce(what: "Open the app once and your check points show here.").lhaGround(ground) }
            else {
                VStack(spacing: 8) {
                    Ring(met: met, of: of, size: 84)
                    Text(met >= of ? "Stage cleared" : (e.snap?.stage ?? "Check points"))
                        .font(.system(size: 12.5, weight: .semibold)).foregroundColor(met >= of ? teal : ink).lineLimit(1)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .lhaGround(ground)
            }
        }
    }
}

struct CheckpointsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHACheckpoints", provider: LocalProvider()) { e in
            CheckpointsView(e: e).widgetURL(URL(string: "lhaapp://go?to=cps"))
        }
        .configurationDisplayName("Check points")
        .description("How many of this stage's check points you have reached.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryInline])
    }
}

// MARK: From Elliott

/* his last message, or his last answer on a check point, whichever is newer */
private enum Said { case msg(WMsg), cp(WCp), none }
private func newest(_ r: WRemote?) -> Said {
    let m = r?.msg, c = r?.cp
    if let m = m, (m.at ?? 0) >= (c?.at ?? 0), !(m.text ?? "").isEmpty { return .msg(m) }
    if let c = c, (c.at ?? 0) > 0 { return .cp(c) }
    if let m = m, !(m.text ?? "").isEmpty { return .msg(m) }
    return .none
}
private func coachURL(_ s: Said, _ snap: WSnap?) -> URL? {
    switch s {
    case .msg: return URL(string: "lhaapp://go?to=chat")
    case .cp: return URL(string: snap?.coached == true ? "lhaapp://go?to=today" : "lhaapp://go?to=cps")
    case .none: return URL(string: snap?.coached == true ? "lhaapp://go?to=chat" : "lhaapp://go?to=answer")
    }
}

struct CoachView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let who = e.snap?.coach ?? "Elliott", said = newest(e.remote), unread = e.remote?.unread ?? 0
        let signed = e.snap?.signed == true
        let head: String = {
            switch said { case .cp: return "Check point"; default: return "From " + who }
        }()
        let words: String = {
            switch said {
            case .msg(let m): return m.text ?? ""
            case .cp(let c):
                let name = (c.k.flatMap { e.snap?.names?[$0] }) ?? "A check point"
                let v = c.verdict == "reached" ? "Reached" : "Not yet"
                let note = (c.note ?? "").isEmpty ? "" : ". " + (c.note ?? "")
                return v + ": " + name + note
            case .none:
                return signed ? (e.snap?.coached == true ? "Nothing new. Send me your next clip." : "Send me a clip. Your first form check is free.")
                    : "Sign in to the app and my replies show here."
            }
        }()
        let when: String = {
            switch said { case .msg(let m): return ago(m.at); case .cp(let c): return ago(c.at); case .none: return "" }
        }()
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(head.uppercased() + (unread > 0 ? " \u{00B7} \(unread) NEW" : "")).font(.system(size: 11, weight: .semibold)).lineLimit(1)
                Text(words).font(.system(size: 13)).lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .lhaGround(.clear)
            .widgetURL(coachURL(said, e.snap))
        default:
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Kicker(text: head)
                    if unread > 0 { Circle().fill(amber).frame(width: 7, height: 7) }
                    Spacer(minLength: 0)
                    if !when.isEmpty { Text(when).font(.system(size: 10.5)).foregroundColor(grey).lineLimit(1) }
                }
                Text(words)
                    .font(.system(size: family == .systemSmall ? 14 : 16, weight: .regular, design: .serif))
                    .foregroundColor(ink)
                    .lineLimit(family == .systemSmall ? 5 : 3)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(ground)
            .widgetURL(coachURL(said, e.snap))
        }
    }
}

struct CoachWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHACoach", provider: CoachProvider()) { e in
            CoachView(e: e)
        }
        .configurationDisplayName("From Elliott")
        .description("Elliott's latest reply, or his answer on a check point.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

@main
struct SessionWidgetBundle: WidgetBundle {
    var body: some Widget {
        SessionLiveActivity()
        TodayWidget()
        CheckpointsWidget()
        CoachWidget()
    }
}

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

/* Five widgets (Elliott, 28 Oct 2026: "there's got to be more useful stuff
   on here"): Today, This week, Check points, Next class and From Elliott.

   The app writes what they show into the app group as it goes to the
   background (WidgetData.swift in CapApp-SPM): the week by weekday, the
   days trained this week, the check points and the nearest one, and the
   sign in. From Elliott asks /api/app/widget for itself every half hour,
   so a reply shows with the app shut; Next class asks /api/app/workshops,
   which is public. Tapping a widget opens the app where it points. */

private let appGroup = "group.com.londonhandstandacademy.app"
private let amber = Color(red: 0.953, green: 0.663, blue: 0.286)
private let deep = Color(red: 0, green: 0.251, blue: 0.239)
private let faint = Color(red: 0, green: 0.251, blue: 0.239).opacity(0.10)

/* a number or a string in the JSON, read as a string */
struct LStr: Codable {
    let s: String
    init(_ s: String) { self.s = s }
    init(from d: Decoder) throws {
        let c = try d.singleValueContainer()
        if let v = try? c.decode(String.self) { s = v }
        else if let v = try? c.decode(Double.self) { s = v == v.rounded() ? String(Int(v)) : String(v) }
        else { s = "" }
    }
    func encode(to e: Encoder) throws { var c = e.singleValueContainer(); try c.encode(s) }
}

struct WDay: Codable {
    var title: String?; var sub: String?; var line: String?; var focus: [String]?
    var mins: Int?; var rest: Bool?; var mob: Bool?; var drills: Int?
}
struct WCpRow: Codable { var n: String?; var met: Bool? }
struct WNear: Codable { var n: String?; var v: Double?; var target: Double?; var unit: String?; var f: Double?; var down: Bool? }
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
    var cps: [WCpRow]?
    var near: WNear?
    var goal: Int?
    var got: Int?
    var run: Int?
    var weekStart: String?
    var days: [String: String]?
}
struct WMsg: Codable { var text: String?; var at: Double?; var seen: Bool? }
struct WCp: Codable { var k: String?; var verdict: String?; var note: String?; var at: Double? }
struct WWait: Codable { var at: Double?; var due: Double? }
struct WRemote: Codable { var msg: WMsg?; var unread: Int?; var cp: WCp?; var waiting: WWait?; var at: Double? }
struct WClass: Codable { var slug: LStr?; var title: LStr?; var when: LStr?; var priceLabel: LStr?; var left: LStr?; var places: LStr? }
struct WClasses: Codable { var workshops: [WClass]? }

struct LHAEntry: TimelineEntry {
    let date: Date
    let snap: WSnap?
    let remote: WRemote?
    let classes: WClasses?
}

private func groupDefaults() -> UserDefaults? { UserDefaults(suiteName: appGroup) }
private func decode<T: Decodable>(_ t: T.Type, _ key: String) -> T? {
    guard let s = groupDefaults()?.string(forKey: key), let d = s.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(t, from: d)
}

/* ── what the gallery shows before the app has said anything ── */
private let sampleSnap: WSnap = {
    var s = WSnap()
    s.signed = true; s.coached = false; s.coach = "Elliott"; s.stage = "Wall Work"
    s.today = WDay(title: "On the wall", sub: "Longer holds and the first slides", line: nil,
                   focus: ["Chest to wall", "Box work"], mins: 30, rest: false, mob: false, drills: nil)
    s.met = 4; s.of = 7; s.goal = 3; s.got = 2; s.run = 4
    s.cps = [WCpRow(n: "Chest to wall, 30 seconds", met: true), WCpRow(n: "Wall walk to vertical", met: true),
             WCpRow(n: "Box pike hold", met: false), WCpRow(n: "Shoulder taps, 10", met: false)]
    s.near = WNear(n: "Box pike hold", v: 24, target: 30, unit: "s", f: 0.8, down: false)
    s.days = ["0": "done", "2": "done"]
    return s
}()
private let sampleRemote = WRemote(msg: WMsg(text: "Lovely line on that one. Next time push the floor away at the top.",
    at: Date().addingTimeInterval(-3600).timeIntervalSince1970 * 1000, seen: false), unread: 1, cp: nil, waiting: nil, at: nil)
private let sampleClasses = WClasses(workshops: [
    WClass(slug: LStr("all-levels"), title: LStr("All Levels Handstand Class"),
           when: LStr(ISO8601DateFormatter().string(from: Date().addingTimeInterval(4 * 86400))),
           priceLabel: LStr("£25"), left: LStr("6"), places: LStr("12"))])

/* ── dates ── */
/* Monday is 0, as in the app */
private func weekday0(_ d: Date) -> Int { (Calendar.current.component(.weekday, from: d) + 5) % 7 }
private func ymd(_ d: Date) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
}
private func mondayKey(_ d: Date) -> String {
    let cal = Calendar.current
    return ymd(cal.date(byAdding: .day, value: -weekday0(d), to: cal.startOfDay(for: d)) ?? d)
}
private func dayFor(_ s: WSnap?, _ d: Date) -> WDay? {
    guard let s = s else { return nil }
    if s.coached == true { return s.today }
    return s.week?[String(weekday0(d))] ?? s.today
}
/* the days trained, only while the app's week is still this week */
private func trained(_ s: WSnap?, _ d: Date) -> [String: String] {
    guard let s = s, s.weekStart == mondayKey(d) else { return [:] }
    return s.days ?? [:]
}
private func gotThisWeek(_ s: WSnap?, _ d: Date) -> Int { (s?.weekStart == mondayKey(d)) ? (s?.got ?? 0) : 0 }
private func ago(_ ms: Double?) -> String {
    guard let ms = ms, ms > 0 else { return "" }
    let f = RelativeDateTimeFormatter(); f.unitsStyle = .full
    return f.localizedString(for: Date(timeIntervalSince1970: ms / 1000), relativeTo: Date())
}
private let london = TimeZone(identifier: "Europe/London") ?? .current
private func fmt(_ d: Date, _ f: String) -> String {
    let x = DateFormatter(); x.locale = Locale(identifier: "en_GB"); x.timeZone = london; x.dateFormat = f
    return x.string(from: d)
}
private func classDate(_ c: WClass) -> Date? {
    guard let w = c.when?.s else { return nil }
    let a = ISO8601DateFormatter(); a.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return a.date(from: w) ?? ISO8601DateFormatter().date(from: w)
}
/* 1pm, 11:30am */
private func clock(_ d: Date) -> String {
    let m = Calendar.current.dateComponents(in: london, from: d).minute ?? 0
    return fmt(d, m == 0 ? "ha" : "h:mma").lowercased()
}
private func upcoming(_ c: WClasses?, _ now: Date) -> [WClass] {
    (c?.workshops ?? []).compactMap { w -> (WClass, Date)? in
        guard let d = classDate(w), d > now else { return nil }; return (w, d)
    }.sorted { $0.1 < $1.1 }.map { $0.0 }
}
private func leftLine(_ c: WClass) -> String {
    let left = Int(c.left?.s ?? "") ?? -1, places = Int(c.places?.s ?? "") ?? 0
    if places > 0 && left <= 0 { return "Full, waiting list open" }
    if left > 0 { return left == 1 ? "1 place left" : "\(left) places left" }
    return ""
}

/* ── fetching for the ones that ask the server ── */
private func fetch(_ path: String, auth: Bool, _ done: @escaping (Data?) -> Void) {
    let d = groupDefaults()
    let base = d?.string(forKey: "base") ?? "https://londonhandstandacademy.com"
    guard let url = URL(string: base + path) else { done(nil); return }
    var req = URLRequest(url: url, timeoutInterval: 12)
    if auth {
        guard let tok = d?.string(forKey: "token"), !tok.isEmpty else { done(nil); return }
        req.setValue("Bearer " + tok, forHTTPHeaderField: "Authorization")
    }
    URLSession.shared.dataTask(with: req) { data, resp, _ in
        done((resp as? HTTPURLResponse)?.statusCode == 200 ? data : nil)
    }.resume()
}

/* One provider for all five. What the app last said is redrawn at each
   midnight for a week, so Today moves on with the app shut; a widget that
   shows Elliott's messages or the classes also asks the server, every half
   hour, and keeps the last answer for when there is no signal. */
struct LHAProvider: TimelineProvider {
    var coachFor: [WidgetFamily] = []
    var classesFor: [WidgetFamily] = []
    func placeholder(in context: Context) -> LHAEntry {
        LHAEntry(date: Date(), snap: sampleSnap, remote: sampleRemote, classes: sampleClasses)
    }
    func getSnapshot(in context: Context, completion: @escaping (LHAEntry) -> Void) {
        if context.isPreview { completion(placeholder(in: context)); return }
        completion(LHAEntry(date: Date(), snap: decode(WSnap.self, "snap"),
                            remote: decode(WRemote.self, "remote"), classes: decode(WClasses.self, "classes") ?? sampleClasses))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LHAEntry>) -> Void) {
        let fc = coachFor.contains(context.family), fl = classesFor.contains(context.family)
        let snap = decode(WSnap.self, "snap")
        var remote = decode(WRemote.self, "remote"), classes = decode(WClasses.self, "classes")
        let finish = {
            let cal = Calendar.current, now = Date()
            var entries = [LHAEntry(date: now, snap: snap, remote: remote, classes: classes)]
            var day = cal.startOfDay(for: now)
            for _ in 0..<7 {
                guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
                day = next
                entries.append(LHAEntry(date: day, snap: snap, remote: remote, classes: classes))
            }
            completion(Timeline(entries: entries, policy: (fc || fl) ? .after(now.addingTimeInterval(30 * 60)) : .atEnd))
        }
        if !fc && !fl { finish(); return }
        let g = DispatchGroup()
        if fc {
            g.enter()
            fetch("/api/app/widget", auth: true) { d in
                if let d = d, let r = try? JSONDecoder().decode(WRemote.self, from: d) {
                    remote = r; groupDefaults()?.set(String(data: d, encoding: .utf8), forKey: "remote")
                }
                g.leave()
            }
        }
        if fl {
            g.enter()
            fetch("/api/app/workshops", auth: false) { d in
                if let d = d, let r = try? JSONDecoder().decode(WClasses.self, from: d) {
                    classes = r; groupDefaults()?.set(String(data: d, encoding: .utf8), forKey: "classes")
                }
                g.leave()
            }
        }
        g.notify(queue: .main) { finish() }
    }
}

/* ── pieces ── */
extension View {
    /* the ground, on every iOS this runs on: iOS 17 asks for it this way */
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
    var color: Color = teal
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10.5, weight: .semibold))
            .tracking(1.2)
            .foregroundColor(color)
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
            Circle().stroke(faint, lineWidth: size * 0.11)
            Circle().trim(from: 0, to: f)
                .stroke(met >= of && of > 0 ? amber : teal, style: StrokeStyle(lineWidth: size * 0.11, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(met)").font(.system(size: size * 0.32, weight: .regular, design: .serif)).foregroundColor(ink)
                Text("of \(of)").font(.system(size: size * 0.13, weight: .semibold)).foregroundColor(grey)
            }
        }
        .frame(width: size, height: size)
    }
}

/* a thin bar, filled to f */
struct LineBar: View {
    let f: Double
    var tint: Color = teal
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(faint)
                Capsule().fill(tint).frame(width: max(6, g.size.width * CGFloat(min(1, max(0, f)))))
            }
        }
        .frame(height: 6)
    }
}

struct PlayDisc: View {
    var size: CGFloat = 32
    var body: some View {
        Image(systemName: "play.fill")
            .font(.system(size: size * 0.4, weight: .bold))
            .foregroundColor(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(teal))
    }
}

/* Monday to Sunday: filled for a day trained, half for part of one, a ring
   for a day planned, a dot for rest, and today circled in amber */
struct WeekStrip: View {
    let snap: WSnap?
    let date: Date
    var dot: CGFloat = 14
    var body: some View {
        let done = trained(snap, date), today = weekday0(date)
        HStack(spacing: 0) {
            ForEach(0..<7, id: \.self) { i in
                let k = done[String(i)], rest = snap?.coached != true && (snap?.week?[String(i)]?.rest ?? false)
                VStack(spacing: 4) {
                    Text(["M", "T", "W", "T", "F", "S", "S"][i])
                        .font(.system(size: dot * 0.62, weight: .semibold))
                        .foregroundColor(i == today ? deep : grey)
                    ZStack {
                        if k == "done" { Circle().fill(teal) }
                        else if k == "part" { Circle().fill(teal.opacity(0.45)) }
                        else if k == "miss" { Circle().stroke(grey.opacity(0.5), lineWidth: 1.5) }
                        else if rest { Circle().fill(faint).frame(width: dot * 0.4, height: dot * 0.4) }
                        else if i < today { Circle().stroke(grey.opacity(0.35), lineWidth: 1.5) }
                        else { Circle().stroke(teal.opacity(0.55), lineWidth: 1.5) }
                        if i == today { Circle().stroke(amber, lineWidth: 2).frame(width: dot + 5, height: dot + 5) }
                    }
                    .frame(width: dot, height: dot)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

/* nothing written yet: a phone that updated and has not opened the app */
struct OpenOnce: View {
    let what: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Kicker(text: "Handstand")
            Spacer(minLength: 0)
            Text(what).font(.system(size: 15, weight: .regular, design: .serif)).foregroundColor(ink)
                .minimumScaleFactor(0.85)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

/* short under a This week heading, which already says the week */
private func weekLine(_ s: WSnap?, _ d: Date, short: Bool = false) -> String {
    let got = gotThisWeek(s, d), goal = max(1, s?.goal ?? 3)
    if got >= goal { return short ? "Week done" : "Week done, \(got) of \(goal)" }
    return short ? "\(got) of \(goal) done" : "\(got) of \(goal) this week"
}
private func runLine(_ s: WSnap?) -> String {
    let r = s?.run ?? 0
    return r >= 2 ? "\(r) weeks running" : r == 1 ? "1 week done" : "Start your run"
}
/* before any reading there is no nearest one: the first still to do */
private func firstOpen(_ s: WSnap?) -> String? { s?.cps?.first(where: { $0.met != true })?.n }
private func nearValue(_ n: WNear) -> String {
    let v = n.v.map { $0 == $0.rounded() ? String(Int($0)) : String($0) } ?? ""
    let t = n.target.map { $0 == $0.rounded() ? String(Int($0)) : String($0) } ?? ""
    let u = n.unit ?? ""
    return t.isEmpty ? v + u : "\(v) of \(t)\(u.isEmpty ? "" : (u.count > 1 ? " " + u : u))"
}

// MARK: Today

struct TodayBlock: View {
    let e: LHAEntry
    var big = false
    var short = false
    var body: some View {
        let d = dayFor(e.snap, e.date), rest = d?.rest == true
        let focus = (d?.focus ?? []).joined(separator: " \u{00B7} ")
        VStack(alignment: .leading, spacing: 3) {
            Kicker(text: rest ? "Rest day" : short ? "Today" : (e.snap?.stage.map { "Today \u{00B7} " + $0 } ?? "Today"))
            Text(d?.title ?? "Your session").font(.system(size: big ? 26 : 22, weight: .regular, design: .serif))
                .foregroundColor(ink).lineLimit(2).minimumScaleFactor(0.75)
            if let sub = d?.sub ?? d?.line, !sub.isEmpty {
                Text(sub).font(.system(size: 12)).foregroundColor(grey).lineLimit(2)
            }
            if !focus.isEmpty && !rest {
                Text(focus).font(.system(size: 11, weight: .semibold)).foregroundColor(teal).lineLimit(1)
            }
        }
    }
}

struct TodayView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let d = dayFor(e.snap, e.date), rest = d?.rest == true
        let mins = d?.mins.map { "\($0) min" } ?? (d?.drills.map { "\($0) drills" } ?? "")
        switch family {
        case .accessoryInline:
            Text(e.snap == nil ? "Handstand" : rest ? "Rest day" : (d?.title ?? "Today")).lhaGround(.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(rest ? "REST DAY" : ("TODAY" + (mins.isEmpty ? "" : " \u{00B7} " + mins.uppercased()))).font(.system(size: 11, weight: .semibold))
                Text(d?.title ?? "Open the app").font(.system(size: 15, weight: .semibold)).lineLimit(1)
                Text(rest ? "Rest is part of it" : ((d?.focus ?? []).joined(separator: ", ").isEmpty ? (d?.sub ?? "") : (d?.focus ?? []).joined(separator: ", ")))
                    .font(.system(size: 12)).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .lhaGround(.clear)
        case .systemLarge:
            if e.snap == nil { OpenOnce(what: "Open the app once and your day shows here.").lhaGround(ground) }
            else { Dashboard(e: e).lhaGround(ground) }
        case .systemMedium:
            if e.snap == nil { OpenOnce(what: "Open the app once and today's session shows here.").lhaGround(ground) }
            else {
                HStack(alignment: .top, spacing: 14) {
                    VStack(alignment: .leading, spacing: 0) {
                        TodayBlock(e: e)
                        Spacer(minLength: 4)
                        HStack(spacing: 8) {
                            if !rest { PlayDisc(size: 30) }
                            if !mins.isEmpty && !rest { Text(mins).font(.system(size: 12.5, weight: .semibold)).foregroundColor(deep) }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    VStack(alignment: .leading, spacing: 7) {
                        Kicker(text: "This week", color: grey)
                        WeekStrip(snap: e.snap, date: e.date, dot: 11)
                        Text(weekLine(e.snap, e.date, short: true)).font(.system(size: 11.5, weight: .semibold)).foregroundColor(deep).lineLimit(1)
                        Text(runLine(e.snap)).font(.system(size: 11)).foregroundColor(grey).lineLimit(1)
                    }
                    .frame(width: 128)
                }
                .lhaGround(ground)
            }
        default:
            if e.snap == nil { OpenOnce(what: "Open the app once and today's session shows here.").lhaGround(ground) }
            else {
                VStack(alignment: .leading, spacing: 0) {
                    TodayBlock(e: e, short: true)
                    Spacer(minLength: 4)
                    HStack {
                        if !mins.isEmpty && !rest { Text(mins).font(.system(size: 12, weight: .semibold)).foregroundColor(deep) }
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

/* the large Today: the day, the week, the next win, Elliott and the next class */
struct Dashboard: View {
    let e: LHAEntry
    var body: some View {
        let d = dayFor(e.snap, e.date), rest = d?.rest == true
        let mins = d?.mins.map { "\($0) min" } ?? ""
        let cls = upcoming(e.classes, e.date).first
        VStack(alignment: .leading, spacing: 10) {
            Link(destination: URL(string: "lhaapp://go?to=today")!) {
                HStack(alignment: .center, spacing: 12) {
                    TodayBlock(e: e, big: true).frame(maxWidth: .infinity, alignment: .leading)
                    if !rest {
                        VStack(spacing: 4) {
                            PlayDisc(size: 40)
                            if !mins.isEmpty { Text(mins).font(.system(size: 11, weight: .semibold)).foregroundColor(deep) }
                        }
                    }
                }
            }
            Spacer(minLength: 2)
            Divider().overlay(faint)
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Kicker(text: "This week", color: grey)
                    Text(weekLine(e.snap, e.date, short: true)).font(.system(size: 13, weight: .semibold)).foregroundColor(deep)
                    Text(runLine(e.snap)).font(.system(size: 11)).foregroundColor(grey)
                }
                .frame(width: 112, alignment: .leading)
                WeekStrip(snap: e.snap, date: e.date, dot: 12)
            }
            Spacer(minLength: 2)
            Divider().overlay(faint)
            Link(destination: URL(string: "lhaapp://go?to=cps")!) {
                HStack(spacing: 12) {
                    Ring(met: e.snap?.met ?? 0, of: e.snap?.of ?? 0, size: 46)
                    VStack(alignment: .leading, spacing: 4) {
                        if let n = e.snap?.near, (e.snap?.met ?? 0) < (e.snap?.of ?? 0) {
                            Kicker(text: "Next win", color: grey)
                            HStack {
                                Text(n.n ?? "").font(.system(size: 13, weight: .semibold)).foregroundColor(ink).lineLimit(1)
                                Spacer(minLength: 4)
                                Text(nearValue(n)).font(.system(size: 12, weight: .semibold)).foregroundColor(teal).lineLimit(1)
                            }
                            LineBar(f: n.f ?? 0)
                        } else {
                            Kicker(text: "Check points", color: grey)
                            Text((e.snap?.met ?? 0) >= (e.snap?.of ?? 1) && (e.snap?.of ?? 0) > 0 ? "All reached. Stage cleared."
                                 : (firstOpen(e.snap).map { "Next up: " + $0 } ?? "Log one when you can do it."))
                                .font(.system(size: 13, weight: .semibold)).foregroundColor(ink).lineLimit(1)
                        }
                    }
                }
            }
            Spacer(minLength: 2)
            Divider().overlay(faint)
            Link(destination: URL(string: "lhaapp://go?to=chat")!) {
                CoachLine(e: e)
            }
            if let c = cls, let when = classDate(c) {
                Spacer(minLength: 2)
            Divider().overlay(faint)
                Link(destination: URL(string: "lhaapp://go?to=class&m=" + (c.slug?.s ?? ""))!) {
                    HStack(spacing: 8) {
                        Kicker(text: "Next class", color: grey)
                        Text(fmt(when, "EEE d MMM") + ", " + clock(when)).font(.system(size: 12.5, weight: .semibold)).foregroundColor(ink).lineLimit(1)
                        Spacer(minLength: 2)
                        Text(leftLine(c)).font(.system(size: 11.5)).foregroundColor(teal).lineLimit(1)
                    }
                }
            }
        }
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHAToday", provider: LHAProvider(coachFor: [.systemLarge], classesFor: [.systemLarge])) { e in
            TodayView(e: e).widgetURL(URL(string: "lhaapp://go?to=today"))
        }
        .configurationDisplayName("Today")
        .description("Today's session. The large one is your whole day: the week, your next win, Elliott and the next class.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: This week

struct WeekView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let got = gotThisWeek(e.snap, e.date), goal = max(1, e.snap?.goal ?? 3)
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(min(got, goal)), in: 0...Double(goal)) { Text("WK") } currentValueLabel: { Text("\(got)") }
                .gaugeStyle(.accessoryCircular)
                .lhaGround(.clear)
        case .accessoryInline:
            Text(weekLine(e.snap, e.date)).lhaGround(.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("THIS WEEK \u{00B7} \(got) OF \(goal)").font(.system(size: 11, weight: .semibold))
                Text(runLine(e.snap)).font(.system(size: 14, weight: .semibold)).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .lhaGround(.clear)
        default:
            if e.snap == nil { OpenOnce(what: "Open the app once and your week shows here.").lhaGround(ground) }
            else {
                VStack(alignment: .leading, spacing: 6) {
                    Kicker(text: "This week")
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(got)").font(.system(size: 40, weight: .regular, design: .serif)).foregroundColor(got >= goal ? teal : ink)
                        Text("of \(goal)").font(.system(size: 15, weight: .semibold)).foregroundColor(grey)
                    }
                    Spacer(minLength: 0)
                    WeekStrip(snap: e.snap, date: e.date, dot: 12)
                    Text(runLine(e.snap)).font(.system(size: 11.5, weight: .semibold)).foregroundColor(deep).lineLimit(1)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .lhaGround(ground)
            }
        }
    }
}

struct WeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHAWeek", provider: LHAProvider()) { e in
            WeekView(e: e).widgetURL(URL(string: "lhaapp://go?to=today"))
        }
        .configurationDisplayName("This week")
        .description("Sessions this week against your target, the days you trained, and your run of weeks.")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: Check points

struct CheckpointsView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let met = e.snap?.met ?? 0, of = e.snap?.of ?? 0, cleared = of > 0 && met >= of
        switch family {
        case .accessoryCircular:
            Gauge(value: Double(min(met, max(of, 1))), in: 0...Double(max(of, 1))) { Text("CP") } currentValueLabel: { Text("\(met)") }
                .gaugeStyle(.accessoryCircular)
                .lhaGround(.clear)
        case .accessoryInline:
            Text(of > 0 ? "\(met) of \(of) check points" : "Check points").lhaGround(.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                if let n = e.snap?.near, !cleared {
                    Text("NEXT WIN \u{00B7} " + nearValue(n).uppercased()).font(.system(size: 11, weight: .semibold)).lineLimit(1)
                    Text(n.n ?? "").font(.system(size: 14, weight: .semibold)).lineLimit(1)
                    ProgressView(value: min(1, max(0, n.f ?? 0)))
                } else {
                    Text("CHECK POINTS").font(.system(size: 11, weight: .semibold))
                    Text(cleared ? "Stage cleared" : "\(met) of \(of) reached").font(.system(size: 14, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .lhaGround(.clear)
        case .systemMedium:
            if e.snap == nil || of == 0 { OpenOnce(what: "Open the app once and your check points show here.").lhaGround(ground) }
            else {
                HStack(spacing: 16) {
                    VStack(spacing: 6) {
                        Ring(met: met, of: of, size: 78)
                        Text(cleared ? "Stage cleared" : (e.snap?.stage ?? "")).font(.system(size: 11, weight: .semibold))
                            .foregroundColor(cleared ? teal : grey).lineLimit(1)
                    }
                    VStack(alignment: .leading, spacing: 5) {
                        ForEach(Array((e.snap?.cps ?? []).prefix(5).enumerated()), id: \.offset) { _, c in
                            HStack(spacing: 7) {
                                Image(systemName: c.met == true ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 13)).foregroundColor(c.met == true ? teal : grey.opacity(0.6))
                                Text(c.n ?? "").font(.system(size: 12)).foregroundColor(c.met == true ? grey : ink).lineLimit(1)
                            }
                        }
                        if let n = e.snap?.near, !cleared {
                            LineBar(f: n.f ?? 0).padding(.top, 2)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .lhaGround(ground)
            }
        default:
            if e.snap == nil || of == 0 { OpenOnce(what: "Open the app once and your check points show here.").lhaGround(ground) }
            else {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Ring(met: met, of: of, size: 58)
                        Spacer(minLength: 0)
                    }
                    Spacer(minLength: 0)
                    if let n = e.snap?.near, !cleared {
                        Kicker(text: "Next win", color: grey)
                        Text(n.n ?? "").font(.system(size: 12.5, weight: .semibold)).foregroundColor(ink).lineLimit(2)
                        HStack(spacing: 6) {
                            LineBar(f: n.f ?? 0)
                            Text(nearValue(n)).font(.system(size: 10.5, weight: .semibold)).foregroundColor(teal).lineLimit(1).fixedSize()
                        }
                    } else if !cleared, let f = firstOpen(e.snap) {
                        Kicker(text: "Next up", color: grey)
                        Text(f).font(.system(size: 12.5, weight: .semibold)).foregroundColor(ink).lineLimit(2)
                    } else {
                        Text(cleared ? "Stage cleared" : (e.snap?.stage ?? "Check points"))
                            .font(.system(size: 13, weight: .semibold)).foregroundColor(cleared ? teal : ink).lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .lhaGround(ground)
            }
        }
    }
}

struct CheckpointsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHACheckpoints", provider: LHAProvider()) { e in
            CheckpointsView(e: e).widgetURL(URL(string: "lhaapp://go?to=cps"))
        }
        .configurationDisplayName("Check points")
        .description("This stage's check points, and how close you are to the next one.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: Next class

struct ClassRow: View {
    let c: WClass
    var body: some View {
        let when = classDate(c) ?? Date()
        HStack(spacing: 10) {
            VStack(spacing: 0) {
                Text(fmt(when, "EEE").uppercased()).font(.system(size: 9.5, weight: .semibold)).foregroundColor(teal)
                Text(fmt(when, "d")).font(.system(size: 20, weight: .regular, design: .serif)).foregroundColor(ink)
                Text(fmt(when, "MMM").uppercased()).font(.system(size: 9, weight: .semibold)).foregroundColor(grey)
            }
            .frame(width: 40, height: 50)
            .background(RoundedRectangle(cornerRadius: 10).fill(Color.white))
            VStack(alignment: .leading, spacing: 2) {
                Text(c.title?.s ?? "Class").font(.system(size: 13, weight: .semibold)).foregroundColor(ink).lineLimit(1)
                Text(clock(when) + (c.priceLabel.map { " \u{00B7} " + $0.s } ?? "")).font(.system(size: 11.5)).foregroundColor(grey).lineLimit(1)
                let l = leftLine(c)
                if !l.isEmpty {
                    Text(l).font(.system(size: 11, weight: .semibold))
                        .foregroundColor((Int(c.left?.s ?? "") ?? 9) <= 3 ? Color(red: 0.64, green: 0.31, blue: 0.24) : teal).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

struct ClassView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let list = upcoming(e.classes, e.date)
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                if let c = list.first, let when = classDate(c) {
                    Text("NEXT CLASS \u{00B7} " + fmt(when, "EEE d MMM").uppercased()).font(.system(size: 11, weight: .semibold)).lineLimit(1)
                    Text(c.title?.s ?? "Class").font(.system(size: 14, weight: .semibold)).lineLimit(1)
                    Text(clock(when) + (leftLine(c).isEmpty ? "" : " \u{00B7} " + leftLine(c))).font(.system(size: 12)).lineLimit(1)
                } else {
                    Text("NEXT CLASS").font(.system(size: 11, weight: .semibold))
                    Text("New dates soon").font(.system(size: 14, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .lhaGround(.clear)
            .widgetURL(URL(string: "lhaapp://go?to=class&m=" + (list.first?.slug?.s ?? "")))
        case .systemMedium:
            VStack(alignment: .leading, spacing: 8) {
                Kicker(text: "Classes \u{00B7} OverGravity, Shadwell")
                if list.isEmpty {
                    Text("No dates on sale right now. New ones show here first.").font(.system(size: 14, weight: .regular, design: .serif)).foregroundColor(ink)
                }
                ForEach(Array(list.prefix(2).enumerated()), id: \.offset) { _, c in
                    Link(destination: URL(string: "lhaapp://go?to=class&m=" + (c.slug?.s ?? ""))!) { ClassRow(c: c) }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .lhaGround(ground)
            .widgetURL(URL(string: "lhaapp://go?to=class"))
        default:
            VStack(alignment: .leading, spacing: 3) {
                Kicker(text: "Next class")
                if let c = list.first, let when = classDate(c) {
                    Text(fmt(when, "EEE d MMM")).font(.system(size: 21, weight: .regular, design: .serif)).foregroundColor(ink).lineLimit(1).minimumScaleFactor(0.8)
                    Text(clock(when) + (c.priceLabel.map { " \u{00B7} " + $0.s } ?? "")).font(.system(size: 12, weight: .semibold)).foregroundColor(deep)
                    Text(c.title?.s ?? "").font(.system(size: 11)).foregroundColor(grey).lineLimit(2)
                    Spacer(minLength: 0)
                    Text(leftLine(c)).font(.system(size: 11.5, weight: .semibold))
                        .foregroundColor((Int(c.left?.s ?? "") ?? 9) <= 3 ? Color(red: 0.64, green: 0.31, blue: 0.24) : teal).lineLimit(1)
                } else {
                    Spacer(minLength: 0)
                    Text("New dates soon. They show here first.").font(.system(size: 14, weight: .regular, design: .serif)).foregroundColor(ink)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(ground)
            .widgetURL(URL(string: "lhaapp://go?to=class&m=" + (list.first?.slug?.s ?? "")))
        }
    }
}

struct ClassWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHAClass", provider: LHAProvider(classesFor: [.systemSmall, .systemMedium, .accessoryRectangular])) { e in
            ClassView(e: e)
        }
        .configurationDisplayName("Next class")
        .description("The next Saturday classes at OverGravity, with places left. Tap to book.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
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
private func saidText(_ s: Said, _ snap: WSnap?) -> String {
    switch s {
    case .msg(let m): return m.text ?? ""
    case .cp(let c):
        let name = (c.k.flatMap { snap?.names?[$0] }) ?? "A check point"
        let v = c.verdict == "reached" ? "Reached" : "Not yet"
        return v + ": " + name + ((c.note ?? "").isEmpty ? "" : ". " + (c.note ?? ""))
    case .none:
        guard snap?.signed == true else { return "Sign in to the app and my replies show here." }
        return snap?.coached == true ? "Nothing new. Send me your next clip." : "Send me a clip. Your first form check is free."
    }
}
private func saidWhen(_ s: Said) -> String {
    switch s { case .msg(let m): return ago(m.at); case .cp(let c): return ago(c.at); case .none: return "" }
}
/* a clip sent and not answered yet, and when the 48 hours run out */
private func waitingLine(_ r: WRemote?, _ who: String) -> String? {
    guard let w = r?.waiting, let due = w.due else { return nil }
    let d = Date(timeIntervalSince1970: due / 1000)
    return d > Date() ? "Your clip is with \(who). Reply by " + fmt(d, "EEEE") + "." : "Your clip is with \(who)."
}

/* one line for the dashboard */
struct CoachLine: View {
    let e: LHAEntry
    var body: some View {
        let who = e.snap?.coach ?? "Elliott", said = newest(e.remote), unread = e.remote?.unread ?? 0
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 6) {
                Kicker(text: "From " + who, color: grey)
                if unread > 0 { Circle().fill(amber).frame(width: 7, height: 7) }
                Spacer(minLength: 0)
                Text(saidWhen(said)).font(.system(size: 10.5)).foregroundColor(grey).lineLimit(1)
            }
            Text(waitingLine(e.remote, who) ?? saidText(said, e.snap))
                .font(.system(size: 13.5, weight: .regular, design: .serif)).foregroundColor(ink).lineLimit(2)
        }
    }
}

struct CoachView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let who = e.snap?.coach ?? "Elliott", said = newest(e.remote), unread = e.remote?.unread ?? 0
        let url: URL? = {
            switch said {
            case .msg: return URL(string: "lhaapp://go?to=chat")
            case .cp: return URL(string: e.snap?.coached == true ? "lhaapp://go?to=today" : "lhaapp://go?to=cps")
            case .none: return URL(string: e.snap?.coached == true ? "lhaapp://go?to=chat" : "lhaapp://go?to=answer")
            }
        }()
        let wait = waitingLine(e.remote, who)
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(("From " + who).uppercased() + (unread > 0 ? " \u{00B7} \(unread) NEW" : "")).font(.system(size: 11, weight: .semibold)).lineLimit(1)
                Text(wait ?? saidText(said, e.snap)).font(.system(size: 13)).lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .lhaGround(.clear)
            .widgetURL(url)
        case .systemMedium:
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Kicker(text: "From " + who)
                    if unread > 0 {
                        Text("\(unread) new").font(.system(size: 10, weight: .bold)).foregroundColor(.white)
                            .padding(.horizontal, 7).padding(.vertical, 2).background(Capsule().fill(amber))
                    }
                    Spacer(minLength: 0)
                    Text(saidWhen(said)).font(.system(size: 10.5)).foregroundColor(grey).lineLimit(1)
                }
                Text(saidText(said, e.snap))
                    .font(.system(size: 16, weight: .regular, design: .serif)).foregroundColor(ink)
                    .lineLimit(wait == nil ? 4 : 3).minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                if let w = wait {
                    HStack(spacing: 6) {
                        Image(systemName: "clock").font(.system(size: 11, weight: .semibold)).foregroundColor(teal)
                        Text(w).font(.system(size: 11.5, weight: .semibold)).foregroundColor(deep).lineLimit(1)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(ground)
            .widgetURL(url)
        default:
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Kicker(text: "From " + who)
                    if unread > 0 { Circle().fill(amber).frame(width: 7, height: 7) }
                }
                if unread > 1 {
                    Text("\(unread) new").font(.system(size: 26, weight: .regular, design: .serif)).foregroundColor(teal)
                }
                Text(wait ?? saidText(said, e.snap))
                    .font(.system(size: 14, weight: .regular, design: .serif)).foregroundColor(ink)
                    .lineLimit(unread > 1 ? 3 : 5).minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                Text(saidWhen(said)).font(.system(size: 10.5)).foregroundColor(grey).lineLimit(1)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(ground)
            .widgetURL(url)
        }
    }
}

struct CoachWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHACoach", provider: LHAProvider(coachFor: [.systemSmall, .systemMedium, .accessoryRectangular])) { e in
            CoachView(e: e)
        }
        .configurationDisplayName("From Elliott")
        .description("Elliott's latest reply or check point answer, what is new, and when a clip you sent is due back.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

@main
struct SessionWidgetBundle: WidgetBundle {
    var body: some Widget {
        SessionLiveActivity()
        TodayWidget()
        WeekWidget()
        CheckpointsWidget()
        ClassWidget()
        CoachWidget()
    }
}

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

/* Five widgets, drawn to Claude Design's spec ("LHA iPhone widgets",
   29 Oct 2026): Today, This week, Check points, Next class and From
   Elliott, each in light and dark, tinted, StandBy and the Lock Screen.

   The app writes what they show into the app group as it goes to the
   background (WidgetData.swift in CapApp-SPM). From Elliott asks
   /api/app/widget for itself every half hour; Next class asks
   /api/app/workshops; Today fetches the still of the day's drill. Two
   buttons work without opening the app (iOS 17): Log today and Mark read.
   Everything else is a tap that opens the app where it points. */

#if canImport(UIKit)
import UIKit
typealias PlatformFont = UIFont
#else
import AppKit
typealias PlatformFont = NSFont
#endif
import AppIntents
import CoreText

let appGroup = "group.com.londonhandstandacademy.app"

// MARK: Fonts

/* Newsreader and Figtree, the app's own, bundled in the extension and
   registered once. Both are variable fonts, so a weight is an axis value;
   New York and SF stand in if they ever fail to load. */
private let fontsReady: Bool = {
    for n in ["Newsreader", "Figtree"] {
        if let u = Bundle.main.url(forResource: n, withExtension: "ttf") {
            CTFontManagerRegisterFontsForURL(u as CFURL, .process, nil)
        }
    }
    return true
}()
private func varFont(_ family: String, _ size: CGFloat, _ axes: [Int: CGFloat]) -> Font? {
    _ = fontsReady
    let attrs: [CFString: Any] = [kCTFontFamilyNameAttribute: family, kCTFontVariationAttribute: axes]
    let d = CTFontDescriptorCreateWithAttributes(attrs as CFDictionary)
    let f = CTFontCreateWithFontDescriptor(d, size, nil)
    guard (CTFontCopyFamilyName(f) as String) == family else { return nil }
    return Font(f as PlatformFont)
}
private let WGHT = 0x77676874, OPSZ = 0x6F70737A
/* the serif: headlines, big numbers, messages */
func serif(_ size: CGFloat, _ w: CGFloat = 500) -> Font {
    varFont("Newsreader", size, [WGHT: w, OPSZ: min(72, max(6, size))]) ?? .system(size: size, weight: w >= 500 ? .medium : .regular, design: .serif)
}
/* the sans: everything else */
func sans(_ size: CGFloat, _ w: CGFloat = 400) -> Font {
    varFont("Figtree", size, [WGHT: w]) ?? .system(size: size, weight: w >= 700 ? .bold : w >= 600 ? .semibold : w >= 500 ? .medium : .regular)
}

// MARK: Colours

/* the spec's tokens, light and dark; tinted mode is one colour at set strengths */
struct Pal {
    let card, tile, hair, ink, ink2, grey, grey2, teal, tealText, track, rung, amber, red, onTeal: Color
    let tinted: Bool
    static func of(_ cs: ColorScheme, tinted: Bool = false) -> Pal {
        if tinted {
            let w = Color.white
            return Pal(card: .clear, tile: w.opacity(0.14), hair: w.opacity(0.18), ink: w, ink2: w.opacity(0.92),
                       grey: w.opacity(0.7), grey2: w.opacity(0.65), teal: w, tealText: w.opacity(0.8), track: w.opacity(0.15),
                       rung: w.opacity(0.3), amber: w, red: w, onTeal: .black, tinted: true)
        }
        if cs == .dark {
            return Pal(card: hex(0x1c1d1e), tile: hex(0x272829), hair: Color.white.opacity(0.10), ink: hex(0xf4f4f5), ink2: hex(0xcfe6ec),
                       grey: hex(0xa9aaab), grey2: hex(0x9a9b9c), teal: hex(0x0b7a76), tealText: hex(0x5cc1bb), track: Color.white.opacity(0.12),
                       rung: hex(0x3a5f63), amber: hex(0xf3a949), red: hex(0xe08a74), onTeal: .white, tinted: false)
        }
        return Pal(card: .white, tile: hex(0xf4f4f5), hair: hex(0x00403d).opacity(0.10), ink: hex(0x111111), ink2: hex(0x00403d),
                   grey: hex(0x5a5a5a), grey2: hex(0x686868), teal: hex(0x006663), tealText: hex(0x006663), track: hex(0x006663).opacity(0.14),
                   rung: hex(0xcfe6ec), amber: hex(0xf3a949), red: hex(0xa4503c), onTeal: .white, tinted: false)
    }
}
func hex(_ v: UInt32) -> Color {
    Color(red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255)
}

/* every view reads the palette for the scheme and mode it is drawn in */
struct PalKey: EnvironmentKey { static let defaultValue = Pal.of(.light) }
extension EnvironmentValues { var pal: Pal { get { self[PalKey.self] } set { self[PalKey.self] = newValue } } }

struct Themed<C: View>: View {
    @Environment(\.colorScheme) var cs
    @Environment(\.widgetRenderingMode) var mode
    let content: () -> C
    var body: some View {
        let tinted = mode == .accented
        content().environment(\.pal, Pal.of(cs, tinted: tinted))
    }
}

// MARK: Data

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
    var mins: Int?; var rest: Bool?; var mob: Bool?; var drills: Int?; var still: String?
}
struct WCpRow: Codable { var n: String?; var met: Bool?; var val: String?; var next: Bool? }
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
    var loggedOn: String?
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
    var still: Data? = nil
}

func groupDefaults() -> UserDefaults? { UserDefaults(suiteName: appGroup) }
func decode<T: Decodable>(_ t: T.Type, _ key: String) -> T? {
    guard let s = groupDefaults()?.string(forKey: key), let d = s.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(t, from: d)
}
func store<T: Encodable>(_ v: T, _ key: String) {
    if let d = try? JSONEncoder().encode(v), let s = String(data: d, encoding: .utf8) { groupDefaults()?.set(s, forKey: key) }
}

/* ── the gallery's picture of each widget, before the app has said anything ── */
let sampleSnap: WSnap = {
    var s = WSnap()
    s.signed = true; s.coached = false; s.coach = "Elliott"; s.stage = "Wall Work"
    s.today = WDay(title: "On the wall", sub: "Longer holds and the first slides", line: nil,
                   focus: ["Chest to wall", "Box work"], mins: 30, rest: false, mob: false, drills: nil, still: nil)
    s.met = 4; s.of = 7; s.goal = 3; s.got = 2; s.run = 4
    s.cps = [WCpRow(n: "Chest to wall hold", met: true, val: "30s", next: false), WCpRow(n: "Wall walk to vertical", met: true, val: "Reached", next: false),
             WCpRow(n: "Shoulder taps", met: true, val: "10", next: false), WCpRow(n: "Kick up to the wall", met: true, val: "3 goes", next: false),
             WCpRow(n: "Box pike hold", met: false, val: "24 of 30s", next: true), WCpRow(n: "Heel pulls", met: false, val: "2 of 5", next: false),
             WCpRow(n: "Toe pulls", met: false, val: "5", next: false)]
    s.near = WNear(n: "Box pike hold", v: 24, target: 30, unit: "s", f: 0.8, down: false)
    return s
}()
let sampleRemote = WRemote(msg: WMsg(text: "Lovely line on that one. Next time push the floor away at the top.",
    at: Date().addingTimeInterval(-3600).timeIntervalSince1970 * 1000, seen: false), unread: 1, cp: nil, waiting: nil, at: nil)
let sampleClasses = WClasses(workshops: [
    WClass(slug: LStr("all-levels"), title: LStr("All Levels Handstand Class"),
           when: LStr(ISO8601DateFormatter().string(from: Date().addingTimeInterval(4 * 86400))),
           priceLabel: LStr("£25"), left: LStr("6"), places: LStr("12"))])

// MARK: Dates and words

/* Monday is 0, as in the app */
func weekday0(_ d: Date) -> Int { (Calendar.current.component(.weekday, from: d) + 5) % 7 }
func ymd(_ d: Date) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
}
func mondayKey(_ d: Date) -> String {
    let cal = Calendar.current
    return ymd(cal.date(byAdding: .day, value: -weekday0(d), to: cal.startOfDay(for: d)) ?? d)
}
func dayFor(_ s: WSnap?, _ d: Date) -> WDay? {
    guard let s = s else { return nil }
    if s.coached == true { return s.today }
    return s.week?[String(weekday0(d))] ?? s.today
}
func tomorrowFor(_ s: WSnap?, _ d: Date) -> WDay? {
    guard let s = s, s.coached != true else { return nil }
    for k in 1...6 { if let x = s.week?[String((weekday0(d) + k) % 7)], x.rest != true { return x } }
    return nil
}
/* the days trained, only while the app's week is still this week */
func trained(_ s: WSnap?, _ d: Date) -> [String: String] {
    guard let s = s, s.weekStart == mondayKey(d) else { return [:] }
    return s.days ?? [:]
}
func gotThisWeek(_ s: WSnap?, _ d: Date) -> Int { (s?.weekStart == mondayKey(d)) ? (s?.got ?? 0) : 0 }
func doneToday(_ s: WSnap?, _ d: Date) -> Bool { trained(s, d)[String(weekday0(d))] == "done" || s?.loggedOn == ymd(d) }
func ago(_ ms: Double?) -> String {
    guard let ms = ms, ms > 0 else { return "" }
    let f = RelativeDateTimeFormatter(); f.unitsStyle = .full
    return f.localizedString(for: Date(timeIntervalSince1970: ms / 1000), relativeTo: Date())
}
let london = TimeZone(identifier: "Europe/London") ?? .current
func fmt(_ d: Date, _ f: String) -> String {
    let x = DateFormatter(); x.locale = Locale(identifier: "en_GB"); x.timeZone = london; x.dateFormat = f
    return x.string(from: d)
}
func classDate(_ c: WClass) -> Date? {
    guard let w = c.when?.s else { return nil }
    let a = ISO8601DateFormatter(); a.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return a.date(from: w) ?? ISO8601DateFormatter().date(from: w)
}
/* 1pm, 11:30am */
func clock(_ d: Date) -> String {
    let m = Calendar.current.dateComponents(in: london, from: d).minute ?? 0
    return fmt(d, m == 0 ? "ha" : "h:mma").lowercased()
}
func upcoming(_ c: WClasses?, _ now: Date) -> [WClass] {
    (c?.workshops ?? []).compactMap { w -> (WClass, Date)? in
        guard let d = classDate(w), d > now else { return nil }; return (w, d)
    }.sorted { $0.1 < $1.1 }.map { $0.0 }
}
enum Places { case plenty, few, full, none }
func places(_ c: WClass) -> (String, Places) {
    let left = Int(c.left?.s ?? "") ?? -1, total = Int(c.places?.s ?? "") ?? 0
    if total > 0 && left <= 0 { return ("Full · Join the waiting list", .full) }
    if left > 0 { return (left == 1 ? "1 place left" : "\(left) places left", left <= 3 ? .few : .plenty) }
    return ("", .none)
}
func shortTitle(_ t: String) -> String {
    t.replacingOccurrences(of: "Calisthenics Class: ", with: "Calisthenics: ").replacingOccurrences(of: " and Muscle Up", with: "")
}
func weekLine(_ s: WSnap?, _ d: Date, short: Bool = false) -> String {
    let got = gotThisWeek(s, d), goal = max(1, s?.goal ?? 3)
    return short ? "\(got) of \(goal)" : "\(got) of \(goal) this week"
}
func runLine(_ s: WSnap?, _ d: Date) -> String {
    let r = s?.run ?? 0, got = gotThisWeek(s, d), goal = max(1, s?.goal ?? 3)
    if got >= goal { return "Week done · \(max(r, 1)) running" }
    return r >= 1 ? "\(r) week\(r == 1 ? "" : "s") running" : "Start your run"
}
func nearValue(_ n: WNear) -> String {
    let num: (Double?) -> String = { v in v.map { $0 == $0.rounded() ? String(Int($0)) : String($0) } ?? "" }
    let v = num(n.v), t = num(n.target), u = n.unit ?? ""
    return t.isEmpty ? v + u : "\(v) of \(t)\(u)"
}
/* the label over the check point to go for */
func winLabel(_ s: WSnap?) -> String {
    let met = s?.met ?? 0, of = s?.of ?? 0
    if of > 0 && met >= of { return "Stage cleared" }
    if of > 0 && met == of - 1 { return "One to go" }
    if met == 0 && s?.near == nil { return "First up" }
    return "Next win"
}
func firstOpen(_ s: WSnap?) -> WCpRow? { s?.cps?.first(where: { $0.met != true }) }

// MARK: Fetching

func fetch(_ path: String, auth: Bool, method: String = "GET", body: Data? = nil, _ done: @escaping (Data?) -> Void) {
    let d = groupDefaults()
    let base = d?.string(forKey: "base") ?? "https://londonhandstandacademy.com"
    guard let url = URL(string: path.hasPrefix("http") ? path : base + path) else { done(nil); return }
    var req = URLRequest(url: url, timeoutInterval: 12)
    req.httpMethod = method
    if let b = body { req.httpBody = b; req.setValue("application/json", forHTTPHeaderField: "Content-Type") }
    if auth {
        guard let tok = d?.string(forKey: "token"), !tok.isEmpty else { done(nil); return }
        req.setValue("Bearer " + tok, forHTTPHeaderField: "Authorization")
    }
    URLSession.shared.dataTask(with: req) { data, resp, _ in
        done((resp as? HTTPURLResponse)?.statusCode == 200 ? data : nil)
    }.resume()
}
func fetchAsync(_ path: String, auth: Bool, method: String = "GET", body: Data? = nil) async -> Data? {
    await withCheckedContinuation { c in fetch(path, auth: auth, method: method, body: body) { c.resume(returning: $0) } }
}

/* One provider for all five. What the app last said is redrawn at each
   midnight for a week; a widget that shows Elliott's messages or the
   classes also asks the server every half hour, and Today fetches the
   day's still, keeping the last of each for when there is no signal. */
struct LHAProvider: TimelineProvider {
    var coachFor: [WidgetFamily] = []
    var classesFor: [WidgetFamily] = []
    var stillFor: [WidgetFamily] = []
    func placeholder(in context: Context) -> LHAEntry {
        LHAEntry(date: Date(), snap: sampleSnap, remote: sampleRemote, classes: sampleClasses)
    }
    func getSnapshot(in context: Context, completion: @escaping (LHAEntry) -> Void) {
        if context.isPreview { completion(placeholder(in: context)); return }
        completion(LHAEntry(date: Date(), snap: decode(WSnap.self, "snap"), remote: decode(WRemote.self, "remote"),
                            classes: decode(WClasses.self, "classes") ?? sampleClasses, still: groupDefaults()?.data(forKey: "stillData")))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LHAEntry>) -> Void) {
        let fam = context.family
        let fc = coachFor.contains(fam), fl = classesFor.contains(fam), fs = stillFor.contains(fam)
        let snap = decode(WSnap.self, "snap")
        var remote = decode(WRemote.self, "remote"), classes = decode(WClasses.self, "classes")
        let d = groupDefaults()
        var still = d?.data(forKey: "stillData")
        let finish = {
            let cal = Calendar.current, now = Date()
            var entries = [LHAEntry(date: now, snap: snap, remote: remote, classes: classes, still: still)]
            var day = cal.startOfDay(for: now)
            for _ in 0..<7 {
                guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
                day = next
                entries.append(LHAEntry(date: day, snap: snap, remote: remote, classes: classes, still: still))
            }
            completion(Timeline(entries: entries, policy: (fc || fl) ? .after(now.addingTimeInterval(30 * 60)) : .atEnd))
        }
        let want = fs ? (dayFor(snap, Date())?.still ?? "") : ""
        let needStill = !want.isEmpty && d?.string(forKey: "stillURL") != want
        if !fc && !fl && !needStill { finish(); return }
        let g = DispatchGroup()
        if fc {
            g.enter()
            fetch("/api/app/widget", auth: true) { data in
                if let data = data, let r = try? JSONDecoder().decode(WRemote.self, from: data) {
                    remote = r; d?.set(String(data: data, encoding: .utf8), forKey: "remote")
                }
                g.leave()
            }
        }
        if fl {
            g.enter()
            fetch("/api/app/workshops", auth: false) { data in
                if let data = data, let r = try? JSONDecoder().decode(WClasses.self, from: data) {
                    classes = r; d?.set(String(data: data, encoding: .utf8), forKey: "classes")
                }
                g.leave()
            }
        }
        if needStill {
            g.enter()
            fetch(want, auth: false) { data in
                if let data = data, data.count > 200 { still = data; d?.set(data, forKey: "stillData"); d?.set(want, forKey: "stillURL") }
                g.leave()
            }
        }
        g.notify(queue: .main) { finish() }
    }
}

// MARK: The two buttons (iOS 17)

/* Log today: a session done away from the app. Sent as one, marked as from
   the widget so the history says so; the day fills at once. */
@available(iOS 17.0, *)
struct LogTodayIntent: AppIntent {
    static var title: LocalizedStringResource = "Log today"
    static var description = IntentDescription("Logs today as trained, without opening the app.")
    func perform() async throws -> some IntentResult {
        let now = Date()
        let body = try? JSONSerialization.data(withJSONObject: ["session": [
            "day": 0, "name": "Logged from the widget", "done": true, "kind": "all", "mode": "widget",
            "at": Int(now.timeIntervalSince1970 * 1000)]])
        _ = await fetchAsync("/api/app/progress", auth: true, method: "POST", body: body)
        if var s = decode(WSnap.self, "snap") {
            if s.weekStart == mondayKey(now) {
                var days = s.days ?? [:]
                if days[String(weekday0(now))] != "done" { days[String(weekday0(now))] = "done"; s.got = (s.got ?? 0) + 1 }
                s.days = days
            }
            s.loggedOn = ymd(now)
            store(s, "snap")
        }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
/* Mark read: Elliott's messages read; the messages stay */
@available(iOS 17.0, *)
struct MarkReadIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark read"
    static var description = IntentDescription("Marks Elliott's messages read.")
    func perform() async throws -> some IntentResult {
        _ = await fetchAsync("/api/app/widget/read", auth: true, method: "POST", body: Data("{}".utf8))
        if var r = decode(WRemote.self, "remote") { r.unread = 0; r.msg?.seen = true; store(r, "remote") }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: Pieces

extension View {
    /* the card ground, on every iOS this runs on: iOS 17 asks for it this way */
    @ViewBuilder func lhaGround(_ c: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) { c }
        } else {
            self.padding(c == .clear ? 0 : 16).background(c)
        }
    }
}

/* the LHA mark, before the first kicker only */
struct Logo: View {
    var size: CGFloat = 16
    var body: some View {
        #if canImport(UIKit)
        if let img = UIImage(named: "lha-logo") {
            Image(uiImage: img).resizable().frame(width: size, height: size).clipShape(RoundedRectangle(cornerRadius: size / 4))
        }
        #endif
    }
}

struct Kicker: View {
    @Environment(\.pal) var p
    let text: String
    var grey = false
    var logo = false
    var dot = false
    var body: some View {
        HStack(spacing: 6) {
            if logo { Logo() }
            Text(text.uppercased()).font(sans(11, 600)).tracking(0.88).foregroundColor(grey ? p.grey : p.tealText).lineLimit(1).minimumScaleFactor(0.75)
            if dot { Circle().fill(p.amber).frame(width: 8, height: 8) }
        }
    }
}

/* the serif headline, its last word in teal */
struct Headline: View {
    @Environment(\.pal) var p
    let text: String
    var size: CGFloat = 26
    var body: some View {
        let words = text.split(separator: " ").map(String.init)
        let head = words.dropLast().joined(separator: " "), last = words.last ?? ""
        (Text(head.isEmpty ? "" : head + " ").foregroundColor(p.ink) + Text(last).foregroundColor(p.tinted ? p.ink : p.tealText))
            .font(serif(size, 500)).tracking(-0.01 * size).lineLimit(2).minimumScaleFactor(0.8)
    }
}

struct PlayDisc: View {
    @Environment(\.pal) var p
    var size: CGFloat = 44
    var body: some View {
        Image(systemName: "play.fill").font(.system(size: size * 0.38, weight: .bold)).foregroundColor(p.onTeal)
            .offset(x: 1.5).frame(width: size, height: size).background(Circle().fill(p.teal))
    }
}

/* the still of the day's drill, with the play disc on it */
struct Poster: View {
    @Environment(\.pal) var p
    let still: Data?
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16).fill(p.tile)
            #if canImport(UIKit)
            if let d = still, let img = UIImage(data: d) {
                Image(uiImage: img).resizable().scaledToFill().frame(width: 64, height: 64).clipped()
                    .overlay(Color.black.opacity(0.2))
            }
            #endif
            PlayDisc()
        }
        .frame(width: 64, height: 64).clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct Ring: View {
    @Environment(\.pal) var p
    let met: Int
    let of: Int
    var size: CGFloat = 48
    var line: CGFloat = 4
    var showOf = false
    var body: some View {
        let f = of > 0 ? min(1, Double(met) / Double(of)) : 0, cleared = of > 0 && met >= of
        ZStack {
            Circle().stroke(p.track, lineWidth: line)
            Circle().trim(from: 0, to: f).stroke(p.tealText, style: StrokeStyle(lineWidth: line, lineCap: .round)).rotationEffect(.degrees(-90))
            if cleared {
                Image(systemName: "checkmark").font(.system(size: size * 0.32, weight: .bold)).foregroundColor(p.tealText)
            } else {
                VStack(spacing: 2) {
                    Text("\(met)").font(serif(size >= 72 ? 28 : size >= 56 ? 22 : 20, 500)).foregroundColor(p.ink)
                    if showOf { Text("of \(of)").font(sans(size >= 72 ? 10 : 9, 600)).foregroundColor(p.grey2) }
                }
            }
        }
        .frame(width: size, height: size)
    }
}

struct Meter: View {
    @Environment(\.pal) var p
    let f: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(p.track)
                Capsule().fill(p.tealText).frame(width: max(6, g.size.width * CGFloat(min(1, max(0, f)))))
            }
        }
        .frame(height: 6)
    }
}

/* a check point rung: done filled with a tick, the nearest ringed amber */
struct Rung: View {
    @Environment(\.pal) var p
    let met: Bool
    var next = false
    var body: some View {
        ZStack {
            if met {
                Circle().fill(p.tealText)
                Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundColor(p.tinted ? .black : .white)
            } else if next {
                Circle().strokeBorder(p.amber, lineWidth: p.tinted ? 3 : 2.5)
            } else {
                Circle().strokeBorder(p.rung, lineWidth: 2)
            }
        }
        .frame(width: 22, height: 22)
    }
}

/* the outline pill, a real button where there is an intent behind it */
struct Pill: View {
    @Environment(\.pal) var p
    let text: String
    var plus = false
    var solid = false
    var body: some View {
        HStack(spacing: 5) {
            if plus { Image(systemName: "plus").font(.system(size: 11, weight: .bold)) }
            Text(text).font(sans(13, 600))
        }
        .foregroundColor(solid ? p.onTeal : p.tealText)
        .padding(.horizontal, 12).frame(height: 32)
        .background(Capsule().fill(solid ? p.teal : Color.clear))
        .overlay(Capsule().strokeBorder(solid ? Color.clear : p.tealText, lineWidth: 1.5))
    }
}

/* Monday to Sunday: discs are done, rings are not, grey is behind you, amber is now */
struct WeekStrip: View {
    @Environment(\.pal) var p
    let snap: WSnap?
    let date: Date
    var dot: CGFloat = 20
    var body: some View {
        let done = trained(snap, date), today = weekday0(date)
        HStack(spacing: 0) {
            ForEach(0..<7, id: \.self) { i in
                let k = done[String(i)] ?? ((i == today && snap?.loggedOn == ymd(date)) ? "done" : nil)
                let rest = snap?.coached != true && (snap?.week?[String(i)]?.rest ?? false)
                VStack(spacing: 5) {
                    Text(["M", "T", "W", "T", "F", "S", "S"][i]).font(sans(9, 600)).tracking(0.36).foregroundColor(i == today ? p.ink2 : p.grey2)
                    ZStack {
                        Group {
                        if k == "done" { Circle().fill(p.tealText) }
                        else if k == "part" {
                            Circle().strokeBorder(p.tealText, lineWidth: 2)
                            Circle().trim(from: 0.25, to: 0.75).fill(p.tealText)
                        }
                        else if rest { Color.clear }
                        else if k == "miss" || i < today { Circle().strokeBorder(p.grey2, lineWidth: 2) }
                        else { Circle().strokeBorder(p.tealText, lineWidth: 2) }
                        }
                        .padding(i == today ? 4 : 0)
                        if i == today { Circle().strokeBorder(p.amber, lineWidth: p.tinted ? 3 : 2.5) }
                    }
                    .frame(width: dot, height: dot)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

struct Num: View {
    @Environment(\.pal) var p
    let text: String
    var body: some View { Text(text).font(sans(15, 600)).foregroundColor(p.ink2).lineLimit(1).minimumScaleFactor(0.85) }
}
struct Focus: View {
    @Environment(\.pal) var p
    let text: String
    var body: some View { Text(text).font(sans(13, 600)).foregroundColor(p.tealText).lineLimit(1) }
}
struct Sub: View {
    @Environment(\.pal) var p
    let text: String
    var lines = 2
    var body: some View { Text(text).font(sans(13, 400)).foregroundColor(p.grey).lineLimit(lines) }
}
struct Meta: View {
    @Environment(\.pal) var p
    let text: String
    var body: some View { Text(text).font(sans(12, 400)).foregroundColor(p.grey2).lineLimit(1) }
}
struct Hair: View {
    @Environment(\.pal) var p
    var body: some View { Rectangle().fill(p.hair).frame(height: 1) }
}

/* Log today, a button that works on iOS 17 and a tap before it */
struct LogButton: View {
    let e: LHAEntry
    var body: some View {
        if doneToday(e.snap, e.date) {
            Pill(text: "Logged")
        } else if #available(iOS 17.0, *) {
            Button(intent: LogTodayIntent()) { Pill(text: "Log today", plus: true) }.buttonStyle(.plain)
        } else {
            Link(destination: URL(string: "lhaapp://go?to=today")!) { Pill(text: "Log today", plus: true) }
        }
    }
}

// MARK: Today

/* the day as the app said it, or the first-open stand in */
struct DayInfo {
    let title: String, focus: String, sub: String, mins: String, rest: Bool, kicker: String
    init(_ e: LHAEntry) {
        let s = e.snap, d = dayFor(s, e.date)
        rest = d?.rest == true
        if s == nil {
            title = "Get upside down."; focus = ""; sub = ""; mins = "Open the app"; kicker = "Today"
        } else if rest {
            title = "Rest day"; focus = ""; sub = "Let it settle."
            mins = ""; kicker = s?.stage ?? "Today"
        } else {
            title = d?.title ?? "Your session"
            focus = (d?.focus ?? []).prefix(3).joined(separator: " · ")
            sub = d?.sub ?? d?.line ?? ""
            mins = d?.mins.map { "\($0) min" } ?? d?.drills.map { "\($0) drills" } ?? ""
            kicker = s?.coached == true ? "Programme" : (s?.stage ?? "Today")
        }
    }
}

struct TodayView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.pal) var p
    var body: some View {
        let d = DayInfo(e), tomorrow = tomorrowFor(e.snap, e.date)
        switch family {
        case .accessoryInline:
            Text(d.rest ? "Rest day" : d.title + (d.mins.isEmpty ? "" : " · " + d.mins)).lhaGround(.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(("Today · " + d.kicker).uppercased()).font(sans(11, 600)).lineLimit(1)
                Text(d.title).font(sans(16, 600)).lineLimit(1)
                Text(d.rest ? "Let it settle" : ([d.mins, d.focus.components(separatedBy: " · ").first ?? ""].filter { !$0.isEmpty }.joined(separator: " · ")))
                    .font(sans(12, 400)).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading).lhaGround(.clear)
        case .systemLarge:
            TodayLarge(e: e).lhaGround(p.card)
        case .systemMedium:
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Kicker(text: d.rest ? "Today · " + d.kicker : ["Today", d.kicker, d.mins].filter { !$0.isEmpty }.joined(separator: " · "), logo: true)
                        Headline(text: d.title)
                        if d.rest { Sub(text: d.sub, lines: 1) } else if !d.focus.isEmpty { Focus(text: d.focus) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if d.rest, let t = tomorrow {
                        VStack(alignment: .trailing, spacing: 2) {
                            Kicker(text: "Tomorrow", grey: true)
                            Text(t.title ?? "").font(sans(13, 600)).foregroundColor(p.ink).lineLimit(1)
                            Meta(text: t.mins.map { "\($0) min" } ?? "")
                        }
                    } else if !d.rest {
                        Link(destination: URL(string: "lhaapp://go?to=start")!) { Poster(still: e.still) }
                    }
                }
                Spacer(minLength: 6)
                Hair().padding(.bottom, 8)
                HStack(alignment: .bottom, spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Num(text: weekLine(e.snap, e.date))
                        if e.snap != nil { LogButton(e: e) }
                    }
                    Spacer(minLength: 0)
                    WeekStrip(snap: e.snap, date: e.date, dot: 20).frame(width: 184)
                }
            }
            .lhaGround(p.card)
        default:
            VStack(alignment: .leading, spacing: 4) {
                Kicker(text: d.kicker, logo: true)
                Headline(text: d.title)
                if d.rest { Sub(text: d.sub, lines: 1) } else if !d.focus.isEmpty { Focus(text: d.focus.components(separatedBy: " · ").first ?? "") }
                Spacer(minLength: 0)
                if d.rest, let t = tomorrow {
                    Kicker(text: "Tomorrow", grey: true)
                    Text([t.title ?? "", t.mins.map { "\($0) min" } ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                        .font(sans(13, 600)).foregroundColor(p.ink2).lineLimit(1)
                } else {
                    HStack(alignment: .center) {
                        Num(text: d.mins)
                        Spacer(minLength: 4)
                        if !d.rest { PlayDisc() }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(p.card)
        }
    }
}

/* the large Today: the day, the week, the next win, Elliott and the next class */
struct TodayLarge: View {
    let e: LHAEntry
    @Environment(\.pal) var p
    var body: some View {
        let d = DayInfo(e), s = e.snap, tomorrow = tomorrowFor(s, e.date)
        let cls = upcoming(e.classes, e.date).first
        VStack(alignment: .leading, spacing: 0) {
            Link(destination: URL(string: "lhaapp://go?to=start")!) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Kicker(text: "Today · " + (s?.coached == true ? "Your programme" : d.kicker), logo: true)
                        Headline(text: d.title, size: 30).padding(.top, 2)
                        if !d.sub.isEmpty { Sub(text: d.sub, lines: 1) }
                        if !d.focus.isEmpty && !d.rest { Focus(text: d.focus) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if d.rest, let t = tomorrow {
                        VStack(alignment: .trailing, spacing: 2) {
                            Kicker(text: "Tomorrow", grey: true)
                            Text(t.title ?? "").font(sans(13, 600)).foregroundColor(p.ink).lineLimit(1)
                            Meta(text: t.mins.map { "\($0) min" } ?? "")
                        }
                    } else if !d.rest {
                        VStack(spacing: 2) { Poster(still: e.still); Num(text: d.mins) }
                    }
                }
            }
            row {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Kicker(text: "This week", grey: true)
                        Num(text: weekLine(s, e.date, short: true) + " · " + runLine(s, e.date))
                        if s != nil { LogButton(e: e).padding(.top, 2) }
                    }
                    Spacer(minLength: 6)
                    WeekStrip(snap: s, date: e.date, dot: 18).frame(width: 170).padding(.top, 16)
                }
            }
            row {
                Link(destination: URL(string: "lhaapp://go?to=cps")!) {
                    HStack(spacing: 12) {
                        Ring(met: s?.met ?? 0, of: s?.of ?? 0)
                        VStack(alignment: .leading, spacing: 2) {
                            let n = s?.near, f = firstOpen(s)
                            HStack(alignment: .firstTextBaseline) {
                                Kicker(text: winLabel(s) + " · \(s?.met ?? 0) of \(s?.of ?? 0)", grey: true)
                                Spacer(minLength: 4)
                                Num(text: n.map(nearValue) ?? (f?.val.map { "Target " + $0 } ?? ""))
                            }
                            Text(n?.n ?? f?.n ?? "All reached").font(sans(16, 600)).foregroundColor(p.ink).lineLimit(1)
                            if let n = n { Meter(f: n.f ?? 0).padding(.top, 4) }
                        }
                    }
                }
            }
            row {
                Link(destination: URL(string: "lhaapp://go?to=chat")!) { CoachLine(e: e) }
            }
            if let c = cls, let when = classDate(c) {
                row {
                    Link(destination: URL(string: "lhaapp://go?to=class&m=" + (c.slug?.s ?? ""))!) {
                        let (pl, kind) = places(c)
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            Kicker(text: "Next class", grey: true)
                            Text(fmt(when, "EEE d MMM") + ", " + clock(when)).font(sans(16, 600)).foregroundColor(p.ink).lineLimit(1)
                            Spacer(minLength: 2)
                            Text(pl).font(sans(13, kind == .few && p.tinted ? 700 : 600)).foregroundColor(kind == .few ? p.red : kind == .full ? p.ink2 : p.tealText).lineLimit(1)
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }
    @ViewBuilder func row<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        Hair().padding(.vertical, 9)
        c()
    }
}

/* From Elliott as one row of the large Today */
struct CoachLine: View {
    let e: LHAEntry
    @Environment(\.pal) var p
    var body: some View {
        let who = e.snap?.coach ?? "Elliott", c = CoachSaid(e), unread = e.remote?.unread ?? 0
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Kicker(text: "From " + who, grey: true, dot: unread > 0)
                Spacer(minLength: 4)
                Meta(text: c.wait != nil ? (c.due ?? "") : (unread > 1 ? "\(unread) new · " : "") + c.when)
            }
            Text(c.wait ?? c.words).font(serif(16, 400)).foregroundColor(p.ink).lineLimit(2)
        }
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHAToday", provider: LHAProvider(coachFor: [.systemLarge], classesFor: [.systemLarge], stillFor: [.systemMedium, .systemLarge])) { e in
            Themed { TodayView(e: e) }.widgetURL(URL(string: "lhaapp://go?to=today"))
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
    @Environment(\.pal) var p
    var body: some View {
        let got = gotThisWeek(e.snap, e.date), goal = max(1, e.snap?.goal ?? 3)
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Circle().trim(from: 0, to: min(1, Double(got) / Double(goal))).stroke(style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .rotationEffect(.degrees(-90)).padding(4)
                VStack(spacing: 0) { Text("\(got)").font(sans(20, 700)); Text("OF \(goal)").font(sans(8, 600)) }
            }
            .lhaGround(.clear)
        case .accessoryInline:
            Text(weekLine(e.snap, e.date) + ((e.snap?.run ?? 0) > 0 ? " · \(e.snap?.run ?? 0) running" : "")).lhaGround(.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 3) {
                Text("THIS WEEK").font(sans(11, 600))
                Text(weekLine(e.snap, e.date, short: true) + " · " + ((e.snap?.run ?? 0) > 0 ? "\(e.snap?.run ?? 0) running" : "Start your run")).font(sans(15, 600)).lineLimit(1)
                LockStrip(snap: e.snap, date: e.date)
            }
            .frame(maxWidth: .infinity, alignment: .leading).lhaGround(.clear)
        default:
            VStack(alignment: .leading, spacing: 0) {
                Kicker(text: "This week", logo: true)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(got)").font(serif(44, 500)).tracking(-0.88).foregroundColor(got >= goal && !p.tinted ? p.tealText : p.ink)
                    Text("of \(goal)").font(sans(15, 600)).foregroundColor(p.grey)
                }
                .padding(.top, 4)
                Spacer(minLength: 0)
                WeekStrip(snap: e.snap, date: e.date, dot: 18)
                Num(text: runLine(e.snap, e.date)).padding(.top, 8)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(p.card)
        }
    }
}

/* the bar on the Lock Screen: one colour, the rest faint */
struct LockBar: View {
    let f: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill().opacity(0.25)
                Capsule().fill().frame(width: max(5, g.size.width * CGFloat(min(1, max(0, f)))))
            }
        }
        .frame(height: 5)
    }
}

/* the strip on the Lock Screen: one colour, so weight and shape do the work */
struct LockStrip: View {
    let snap: WSnap?
    let date: Date
    var body: some View {
        let done = trained(snap, date), today = weekday0(date)
        HStack(spacing: 6) {
            ForEach(0..<7, id: \.self) { i in
                let k = done[String(i)], rest = snap?.coached != true && (snap?.week?[String(i)]?.rest ?? false)
                ZStack {
                    if k == "done" { Circle().fill() }
                    else if rest { Circle().fill().opacity(0.25).frame(width: 4, height: 4) }
                    else { Circle().strokeBorder(lineWidth: i == today ? 3 : 1.5) }
                }
                .frame(width: 11, height: 11)
            }
        }
    }
}

struct WeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHAWeek", provider: LHAProvider()) { e in
            Themed { WeekView(e: e) }.widgetURL(URL(string: "lhaapp://go?to=today"))
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
    @Environment(\.pal) var p
    var body: some View {
        let s = e.snap, met = s?.met ?? 0, of = s?.of ?? 0, cleared = of > 0 && met >= of
        let n = s?.near, f = firstOpen(s), label = winLabel(s)
        let name = cleared ? "All \(of) reached" : (n?.n ?? f?.n ?? "Open the app")
        let value = cleared ? "Next stage is open" : (n.map(nearValue) ?? (f?.val.map { $0.isEmpty ? "" : "Target " + $0 } ?? ""))
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Circle().trim(from: 0, to: of > 0 ? min(1, Double(met) / Double(of)) : 0).stroke(style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .rotationEffect(.degrees(-90)).padding(4)
                VStack(spacing: 0) { Text("\(met)").font(sans(20, 700)); Text("OF \(of)").font(sans(8, 600)) }
            }
            .lhaGround(.clear)
        case .accessoryInline:
            Text(cleared ? "Stage cleared" : [name, value].filter { !$0.isEmpty }.joined(separator: " · ")).lhaGround(.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(label.uppercased()).font(sans(11, 600)).lineLimit(1)
                Text(name).font(sans(15, 600)).lineLimit(1)
                if let n = n, !cleared { LockBar(f: n.f ?? 0); Text(value).font(sans(12, 400)).lineLimit(1) }
                else { Text(value).font(sans(12, 400)).lineLimit(1) }
            }
            .frame(maxWidth: .infinity, alignment: .leading).lhaGround(.clear)
        case .systemLarge:
            CheckpointsLarge(e: e).lhaGround(p.card)
        case .systemMedium:
            HStack(alignment: .center, spacing: 16) {
                Ring(met: met, of: of, size: 72, line: 6, showOf: true)
                VStack(alignment: .leading, spacing: 2) {
                    Kicker(text: label + " · " + (s?.stage ?? ""), logo: true)
                    Text(name).font(sans(18, 600)).foregroundColor(p.ink).lineLimit(1).padding(.top, 2)
                    if let n = n, !cleared {
                        HStack(spacing: 10) { Meter(f: n.f ?? 0); Num(text: value).fixedSize() }.padding(.top, 4)
                    } else {
                        Meta(text: value)
                    }
                    HStack(spacing: 8) {
                        ForEach(Array((s?.cps ?? []).prefix(8).enumerated()), id: \.offset) { _, c in Rung(met: c.met == true, next: c.next == true) }
                    }
                    .padding(.top, 10)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .lhaGround(p.card)
        default:
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    Ring(met: met, of: of, size: 56, line: 5)
                    VStack(alignment: .leading, spacing: 0) {
                        Kicker(text: s?.stage ?? "Check points")
                        Num(text: "\(met) of \(of)")
                    }
                }
                Spacer(minLength: 0)
                Kicker(text: label, grey: true)
                Text(name).font(sans(16, 600)).foregroundColor(p.ink).lineLimit(1).minimumScaleFactor(0.85).padding(.top, 2)
                if let n = n, !cleared { Meter(f: n.f ?? 0).padding(.top, 6) }
                Num(text: value).padding(.top, 4)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(p.card)
        }
    }
}

/* the large one: every check point on the stage, the nearest ringed amber */
struct CheckpointsLarge: View {
    let e: LHAEntry
    @Environment(\.pal) var p
    var body: some View {
        let s = e.snap, met = s?.met ?? 0, of = s?.of ?? 0, cleared = of > 0 && met >= of
        let rows = Array((s?.cps ?? []).prefix(7))
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Kicker(text: (cleared ? "Stage cleared" : of > 0 && met == of - 1 ? "One to go" : "Check points") + " · " + (s?.stage ?? ""), logo: true)
                Spacer(minLength: 4)
                Num(text: "\(met) of \(of)")
            }
            .padding(.bottom, 6)
            ForEach(Array(rows.enumerated()), id: \.offset) { i, c in
                VStack(spacing: 0) {
                    if i > 0 { Hair() }
                    HStack(spacing: 10) {
                        Rung(met: c.met == true, next: c.next == true)
                        Text(c.n ?? "").font(sans(15, c.next == true ? 600 : 500))
                            .foregroundColor(c.met == true || c.next == true ? p.ink : p.grey).lineLimit(1)
                        Spacer(minLength: 4)
                        Text(c.met == true && (c.val ?? "").isEmpty ? "Reached" : (c.val ?? ""))
                            .font(sans(c.next == true ? 14 : 13, c.next == true ? 600 : 400)).foregroundColor(c.next == true ? p.ink2 : p.grey2).lineLimit(1)
                    }
                    .frame(height: 40)
                }
            }
            Spacer(minLength: 0)
            if met == 0 {
                Meta(text: "Reach all \(of > 0 ? String(of) : "of them") to clear the stage.")
            } else if cleared {
                Text("Next stage is open").font(sans(13, 600)).foregroundColor(p.tealText)
            } else {
                Meter(f: of > 0 ? Double(met) / Double(of) : 0)
            }
        }
    }
}

struct CheckpointsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHACheckpoints", provider: LHAProvider()) { e in
            Themed { CheckpointsView(e: e) }.widgetURL(URL(string: "lhaapp://go?to=cps"))
        }
        .configurationDisplayName("Check points")
        .description("This stage's check points and how close you are to the next one. The large one lists them all.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: Next class

struct DateTile: View {
    @Environment(\.pal) var p
    let when: Date?
    var body: some View {
        VStack(spacing: 1) {
            Text(when.map { fmt($0, "EEE").uppercased() } ?? "SAT").font(sans(9, 600)).tracking(0.54).foregroundColor(p.tealText)
            Text(when.map { fmt($0, "d") } ?? "?").font(serif(24, 500)).foregroundColor(p.ink)
            Text(when.map { fmt($0, "MMM").uppercased() } ?? "TBC").font(sans(9, 600)).tracking(0.54).foregroundColor(p.grey2)
        }
        .frame(width: 52, height: 56)
        .background(RoundedRectangle(cornerRadius: 12).fill(p.tile))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(p.hair, lineWidth: 1))
    }
}
struct PlacesText: View {
    @Environment(\.pal) var p
    let c: WClass
    var short = false
    var body: some View {
        let (t0, k) = places(c), t = short && k == .full ? "Full · Waiting list" : t0
        Text(t).font(sans(13, k == .few && p.tinted ? 700 : 600)).foregroundColor(k == .few ? p.red : k == .full ? p.ink2 : p.tealText).lineLimit(1)
    }
}

struct ClassView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.pal) var p
    var body: some View {
        let list = upcoming(e.classes, e.date)
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("NEXT CLASS").font(sans(11, 600))
                if let c = list.first, let when = classDate(c) {
                    Text(fmt(when, "EEE d MMM") + ", " + clock(when)).font(sans(15, 600)).lineLimit(1)
                    Text([shortTitle(c.title?.s ?? "").components(separatedBy: " ").prefix(2).joined(separator: " "), places(c).0].filter { !$0.isEmpty }.joined(separator: " · "))
                        .font(sans(12, places(c).1 == .few ? 700 : 400)).lineLimit(1)
                } else {
                    Text("New dates soon").font(sans(15, 600))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading).lhaGround(.clear)
            .widgetURL(URL(string: "lhaapp://go?to=class&m=" + (list.first?.slug?.s ?? "")))
        case .systemMedium:
            VStack(alignment: .leading, spacing: 6) {
                Kicker(text: "Classes · OverGravity, Shadwell", logo: true)
                if list.isEmpty {
                    HStack(spacing: 14) {
                        DateTile(when: nil).opacity(0.6)
                        VStack(alignment: .leading, spacing: 2) {
                            Headline(text: "No dates yet")
                            Sub(text: "New Saturdays post here first.")
                        }
                    }
                    .frame(maxHeight: .infinity)
                }
                ForEach(Array(list.prefix(2).enumerated()), id: \.offset) { _, c in
                    Link(destination: URL(string: "lhaapp://go?to=class&m=" + (c.slug?.s ?? ""))!) {
                        HStack(spacing: 12) {
                            DateTile(when: classDate(c))
                            VStack(alignment: .leading, spacing: 0) {
                                Text(shortTitle(c.title?.s ?? "Class")).font(sans(15, 600)).foregroundColor(p.ink).lineLimit(1)
                                Meta(text: [classDate(c).map(clock) ?? "", c.priceLabel?.s ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                                PlacesText(c: c)
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(height: 56)
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .lhaGround(p.card)
            .widgetURL(URL(string: "lhaapp://go?to=class"))
        default:
            VStack(alignment: .leading, spacing: 0) {
                if let c = list.first, let when = classDate(c) {
                    Kicker(text: "Next class", logo: true)
                    Headline(text: fmt(when, "EEE d MMM")).padding(.top, 4)
                    Num(text: [clock(when), c.priceLabel?.s ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                    Sub(text: shortTitle(c.title?.s ?? "")).padding(.top, 2)
                    Spacer(minLength: 0)
                    PlacesText(c: c, short: true)
                } else {
                    Kicker(text: "Classes", logo: true)
                    Headline(text: "No dates yet").padding(.top, 4)
                    Sub(text: "Saturdays at OverGravity, Shadwell.").padding(.top, 4)
                    Spacer(minLength: 0)
                    Text("New dates post here first").font(sans(13, 600)).foregroundColor(p.tealText)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(p.card)
            .widgetURL(URL(string: "lhaapp://go?to=class&m=" + (list.first?.slug?.s ?? "")))
        }
    }
}

struct ClassWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHAClass", provider: LHAProvider(classesFor: [.systemSmall, .systemMedium, .accessoryRectangular])) { e in
            Themed { ClassView(e: e) }
        }
        .configurationDisplayName("Next class")
        .description("The next Saturday classes at OverGravity, with places left. Tap to book.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

// MARK: From Elliott

/* what Elliott last said, newest first: a message, an answer on a check point, or nothing yet */
struct CoachSaid {
    var words = "", when = "", kind = "none", verdict = "", cpName = "", note = ""
    var wait: String? = nil, due: String? = nil
    init(_ e: LHAEntry) {
        let r = e.remote, s = e.snap, m = r?.msg, c = r?.cp
        if let w = r?.waiting, let dueMs = w.due {
            let d = Date(timeIntervalSince1970: dueMs / 1000)
            wait = "Your clip is with \(s?.coach ?? "Elliott")."
            due = d > Date() ? "Reply by " + fmt(d, "EEEE") : "Due now"
        }
        if let m = m, (m.at ?? 0) >= (c?.at ?? 0), !(m.text ?? "").isEmpty {
            kind = "msg"; words = m.text ?? ""; when = ago(m.at)
        } else if let c = c, (c.at ?? 0) > 0 {
            kind = "cp"; verdict = c.verdict == "reached" ? "Reached" : "Not yet"
            cpName = (c.k.flatMap { s?.names?[$0] }) ?? "A check point"; note = c.note ?? ""
            words = verdict + ": " + cpName + (note.isEmpty ? "" : ". " + note); when = ago(c.at)
        } else if let m = m, !(m.text ?? "").isEmpty {
            kind = "msg"; words = m.text ?? ""; when = ago(m.at)
        } else if s?.signed != true {
            kind = "signedout"; words = "Sign in to see your messages."
        } else {
            words = s?.coached == true ? "Send me your next clip." : "Send me a clip. Your first form check is free."
        }
    }
}

struct Avatar: View {
    @Environment(\.pal) var p
    var size: CGFloat = 28
    var body: some View {
        Text("E").font(serif(size * 0.54, 500)).foregroundColor(p.onTeal).frame(width: size, height: size).background(Circle().fill(p.teal))
    }
}

struct CoachView: View {
    let e: LHAEntry
    @Environment(\.widgetFamily) var family
    @Environment(\.pal) var p
    var body: some View {
        let who = e.snap?.coach ?? "Elliott", c = CoachSaid(e), unread = e.remote?.unread ?? 0
        let url: URL? = URL(string: c.kind == "signedout" ? "lhaapp://go?to=today"
            : c.kind == "none" ? (e.snap?.coached == true ? "lhaapp://go?to=chat" : "lhaapp://go?to=answer")
            : c.kind == "cp" ? "lhaapp://go?to=cps" : "lhaapp://go?to=chat")
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 4) {
                    Text(("From " + who).uppercased()).font(sans(11, 600)).lineLimit(1)
                    if unread > 0 { Circle().fill().frame(width: 6, height: 6) }
                }
                Text(c.wait ?? c.words).font(sans(13, 400)).lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading).lhaGround(.clear).widgetURL(url)
        case .systemMedium:
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 0) {
                        Kicker(text: "From " + who, logo: true, dot: unread > 0)
                        body(c, unread: unread, large: true).padding(.top, 6)
                    }
                    Spacer(minLength: 0)
                    Avatar(size: 36)
                }
                Spacer(minLength: 0)
                HStack(alignment: .center) {
                    if c.wait != nil {
                        Meta(text: "")
                        Spacer(minLength: 4)
                        HStack(spacing: 6) { Image(systemName: "clock").font(.system(size: 12, weight: .semibold)); Text(c.due ?? "").font(sans(15, 600)) }
                            .foregroundColor(p.ink2)
                    } else {
                        Meta(text: c.kind == "none" && e.snap?.coached != true ? "Any handstand, any wall" : c.kind == "signedout" ? "Your clips are safe" : c.when)
                        Spacer(minLength: 4)
                        action(c, unread: unread)
                    }
                }
            }
            .lhaGround(p.card).widgetURL(url)
        default:
            VStack(alignment: .leading, spacing: 0) {
                Kicker(text: "From " + who, logo: true, dot: unread > 0)
                body(c, unread: unread, large: false).padding(.top, 6)
                Spacer(minLength: 0)
                if c.wait != nil {
                    Kicker(text: "Reply by", grey: true)
                    Num(text: (c.due ?? "").replacingOccurrences(of: "Reply by ", with: ""))
                } else {
                    HStack(alignment: .center) {
                        if c.kind == "none" { Pill(text: "Send a clip", solid: true) }
                        else if c.kind == "signedout" { Pill(text: "Sign in") }
                        else { Meta(text: c.when) }
                        Spacer(minLength: 4)
                        Avatar()
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .lhaGround(p.card).widgetURL(url)
        }
    }
    /* the message, the count, the answer or the ask */
    @ViewBuilder func body(_ c: CoachSaid, unread: Int, large: Bool) -> some View {
        if let w = c.wait {
            Text(large ? w + " He watches every clip and replies on video." : w).font(serif(large ? 18 : 17, 400)).foregroundColor(p.ink).lineLimit(3)
        } else if unread > 1 {
            Headline(text: "\(unread) new")
            Sub(text: (large ? "" : "Latest: ") + c.words, lines: large ? 1 : 2).padding(.top, 2)
        } else if c.kind == "cp" {
            HStack(spacing: 8) {
                Rung(met: c.verdict == "Reached", next: c.verdict != "Reached")
                Kicker(text: c.verdict, grey: true)
                if large { Text(c.cpName).font(sans(16, 600)).foregroundColor(p.ink).lineLimit(1) }
            }
            if !large { Text(c.cpName).font(sans(16, 600)).foregroundColor(p.ink).lineLimit(1).padding(.top, 6) }
            if !c.note.isEmpty { Text(c.note).font(serif(large ? 18 : 17, 400)).foregroundColor(p.ink).lineLimit(2).padding(.top, 2) }
        } else {
            Text(c.words).font(serif(large ? 18 : 17, 400)).foregroundColor(p.ink).lineLimit(large ? 3 : 4).minimumScaleFactor(0.9)
        }
    }
    @ViewBuilder func action(_ c: CoachSaid, unread: Int) -> some View {
        if c.kind == "none" { Pill(text: "Send a clip", solid: true) }
        else if c.kind == "signedout" { Pill(text: "Sign in") }
        else if c.kind == "cp" { Pill(text: "Watch the reply") }
        else if unread > 0 {
            if #available(iOS 17.0, *) {
                Button(intent: MarkReadIntent()) { Pill(text: unread > 1 ? "Mark all read" : "Mark read") }.buttonStyle(.plain)
            } else { Pill(text: "Open the chat") }
        } else { EmptyView() }
    }
}

struct CoachWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LHACoach", provider: LHAProvider(coachFor: [.systemSmall, .systemMedium, .accessoryRectangular])) { e in
            Themed { CoachView(e: e) }
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

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

@main
struct SessionWidgetBundle: WidgetBundle {
    var body: some Widget {
        SessionLiveActivity()
    }
}

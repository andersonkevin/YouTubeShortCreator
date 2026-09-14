import Foundation
import AVFoundation
import Speech

guard CommandLine.arguments.count == 4 else { fatalError("Usage: AUDIO OUTPUT.json LANGUAGE") }
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard !FileManager.default.fileExists(atPath: output.path) else { fatalError("No overwrite") }
let done = DispatchSemaphore(value: 0)
Task.detached {
    do {
        guard let locale = await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: CommandLine.arguments[3])),
              await SpeechTranscriber.installedLocales.contains(locale) else {
            print("MISSING_LOCAL_MODEL: no installation or cloud fallback attempted"); exit(1)
        }
        let transcriber = SpeechTranscriber(locale: locale, transcriptionOptions: [], reportingOptions: [], attributeOptions: [.audioTimeRange])
        let analyzer = SpeechAnalyzer(modules: [transcriber])
        let file = try AVAudioFile(forReading: input)
        try await analyzer.prepareToAnalyze(in: file.processingFormat)
        let collector = Task { () throws -> [[String: Any]] in
            var words: [[String: Any]] = []
            for try await result in transcriber.results {
                guard result.isFinal else { continue }
                for run in result.text.runs {
                    if let range = run.audioTimeRange {
                        let text = String(result.text[run.range].characters)
                        words.append(["text": text, "start": range.start.seconds, "end": CMTimeRangeGetEnd(range).seconds])
                    }
                }
            }
            return words
        }
        if let end = try await analyzer.analyzeSequence(from: file) {
            try await analyzer.finalizeAndFinish(through: end)
        } else { throw NSError(domain: "EmptyAudio", code: 1) }
        let words = try await collector.value
        guard !words.isEmpty else { throw NSError(domain: "EmptyTranscript", code: 1) }
        let duration = try await AVURLAsset(url: input).load(.duration).seconds
        let record: [String: Any] = ["engine": "macOS SpeechTranscriber", "locale": locale.identifier, "duration": duration, "words": words]
        try JSONSerialization.data(withJSONObject: record, options: [.prettyPrinted, .sortedKeys]).write(to: output, options: .withoutOverwriting)
        print("PASS: \(words.count) timed segments, \(output.path)")
    } catch { print("LOCAL_TRANSCRIPTION_FAILED: \(error)"); exit(1) }
    done.signal()
}
if done.wait(timeout: .now() + 80) == .timedOut { print("LOCAL_TRANSCRIPTION_TIMEOUT"); exit(1) }

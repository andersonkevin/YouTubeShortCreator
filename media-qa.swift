import Foundation
import AVFoundation
import ImageIO

guard CommandLine.arguments.count == 5,
      let expected = Double(CommandLine.arguments[2]) else { fatalError("Usage: VIDEO SECONDS CAPTIONS OUTPUT.json") }
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[4])
guard !FileManager.default.fileExists(atPath: output.path) else { fatalError("No overwrite") }
let done = DispatchSemaphore(value: 0)
Task.detached {
    do {
        let asset = AVURLAsset(url: input)
        let videos = try await asset.loadTracks(withMediaType: .video)
        let audios = try await asset.loadTracks(withMediaType: .audio)
        let duration = try await asset.load(.duration).seconds
        guard videos.count == 1, audios.count == 1, let track = videos.first,
              try await track.load(.naturalSize) == CGSize(width: 1080, height: 1920),
              abs(try await track.load(.nominalFrameRate) - 30) < 0.1,
              abs(duration - expected) <= 0.067 else { fatalError("Invalid exported video") }
        let captionData = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[3]))
        let captions = try JSONSerialization.jsonObject(with: captionData) as! [String: Any]
        let cues = captions["cues"] as! [[String: Any]]
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = .zero
        var times = [0.5, duration / 2, duration - 0.1]
        for cue in cues {
            let start = cue["start"] as! Double
            times.append(max(0.1, start - 1.0 / 30.0))
            times.append(min(duration - 0.1, start + 1.0 / 30.0))
        }
        for time in times {
            let result = try await generator.image(at: CMTime(seconds: time, preferredTimescale: 30000))
            guard result.image.width == 1080, result.image.height == 1920 else { fatalError("Invalid decoded frame") }
        }
        let record: [String: Any] = ["status": "PASS", "duration": duration, "video_tracks": videos.count,
            "audio_tracks": audios.count, "decoded_samples": times.count, "dimensions": [1080, 1920],
            "listening_approval": "pending"]
        try JSONSerialization.data(withJSONObject: record, options: [.prettyPrinted, .sortedKeys]).write(to: output, options: .withoutOverwriting)
        print("PASS: encoded tracks, dimensions, duration and \(times.count) decoded samples")
        done.signal()
    } catch { fatalError("Media verification failed: \(error)") }
}
done.wait()

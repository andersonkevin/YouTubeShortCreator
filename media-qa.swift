import Foundation
import AVFoundation
import ImageIO
import AudioToolbox

guard CommandLine.arguments.count == 6,
      let expected = Double(CommandLine.arguments[2]), expected.isFinite,
      expected > 1, expected <= 180,
      abs(expected * 30 - (expected * 30).rounded()) < 0.00001 else {
    fatalError("Usage: VIDEO SECONDS SAMPLE_PLAN.json OUTPUT.json DECODED_DIRECTORY")
}
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[4])
let decoded = URL(fileURLWithPath: CommandLine.arguments[5], isDirectory: true)
guard try FileManager.default.contentsOfDirectory(atPath: decoded.path).isEmpty else { fatalError("Decoded directory must be empty") }
guard !FileManager.default.fileExists(atPath: output.path) else { fatalError("No overwrite") }
let done = DispatchSemaphore(value: 0)
Task.detached {
    do {
        let asset = AVURLAsset(url: input)
        let videos = try await asset.loadTracks(withMediaType: .video)
        let audios = try await asset.loadTracks(withMediaType: .audio)
        let duration = try await asset.load(.duration).seconds
        guard try await asset.load(.tracks).count == 2,
              videos.count == 1, audios.count == 1, let track = videos.first,
              try await track.load(.naturalSize) == CGSize(width: 1080, height: 1920),
              abs(try await track.load(.nominalFrameRate) - 30) < 0.1,
              abs(duration - expected) <= 0.067 else { fatalError("Invalid exported video") }
        let videoFormats = try await track.load(.formatDescriptions)
        let audioFormats = try await audios[0].load(.formatDescriptions)
        guard !videoFormats.isEmpty, !audioFormats.isEmpty,
              videoFormats.allSatisfy({ CMFormatDescriptionGetMediaSubType($0) == kCMVideoCodecType_H264 }),
              audioFormats.allSatisfy({ CMFormatDescriptionGetMediaSubType($0) == kAudioFormatMPEG4AAC }) else {
            fatalError("Expected H.264/AAC")
        }
        let count = Int((expected * 30).rounded())
        let reader = try AVAssetReader(asset: asset)
        let readerOutput = AVAssetReaderTrackOutput(track: track,
            outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
        guard reader.canAdd(readerOutput) else { fatalError("Video reader unavailable") }
        reader.add(readerOutput)
        guard reader.startReading() else { fatalError("Video reader failed to start") }
        var timestamps: [Double] = []
        while let sample = readerOutput.copyNextSampleBuffer() {
            let time = CMSampleBufferGetPresentationTimeStamp(sample).seconds
            guard time.isFinite, timestamps.count < count else { fatalError("Invalid frame count/timestamp") }
            timestamps.append(time)
        }
        guard reader.status == .completed, timestamps.count == count else { fatalError("Incomplete decoded frame sequence") }
        timestamps.sort()
        let errors = timestamps.enumerated().map { abs($0.element - Double($0.offset) / 30) }
        guard errors.allSatisfy({ $0 <= 0.00001 }) else { fatalError("Frame timestamps differ from 30 fps") }
        let planData = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[3]))
        guard let plan = try JSONSerialization.jsonObject(with: planData) as? [String: Any],
              let indices = plan["indices"] as? [Int], !indices.isEmpty,
              indices == Array(Set(indices)).sorted(), indices.allSatisfy({ $0 >= 0 && $0 < count }) else {
            fatalError("Invalid frame sample plan")
        }
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = .zero
        for (offset, index) in indices.enumerated() {
            let result = try await generator.image(at: CMTime(value: Int64(index), timescale: 30))
            guard result.image.width == 1080, result.image.height == 1920,
                  abs(result.actualTime.seconds - Double(index) / 30) <= 0.00001 else { fatalError("Invalid decoded frame") }
            let file = decoded.appendingPathComponent(String(format: "decoded-%05d.png", offset))
            guard !FileManager.default.fileExists(atPath: file.path),
                  let writer = CGImageDestinationCreateWithURL(file as CFURL, "public.png" as CFString, 1, nil) else {
                fatalError("Cannot create decoded sample")
            }
            CGImageDestinationAddImage(writer, result.image, nil)
            guard CGImageDestinationFinalize(writer) else { fatalError("Cannot write decoded sample") }
        }
        let record: [String: Any] = ["status": "PASS", "duration": duration, "video_tracks": videos.count,
            "audio_tracks": audios.count, "decoded_samples": indices.count, "decoded_frame_indices": indices,
            "dimensions": [1080, 1920], "frame_count": count, "fps": 30, "backend": "native",
            "frame_timing": ["frames_checked": count, "first_seconds": timestamps.first!,
                             "last_seconds": timestamps.last!, "maximum_error_seconds": errors.max()!],
            "listening_approval": "pending"]
        try JSONSerialization.data(withJSONObject: record, options: [.prettyPrinted, .sortedKeys]).write(to: output, options: .withoutOverwriting)
        print("PASS: encoded tracks, \(count) frame timestamps and \(indices.count) decoded samples")
        done.signal()
    } catch { fatalError("Media verification failed: \(error)") }
}
done.wait()

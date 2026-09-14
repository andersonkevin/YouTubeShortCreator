import Foundation
import AVFoundation

guard CommandLine.arguments.count == 4 else {
    fatalError("Usage: mux.swift SILENT_VIDEO AUDIO OUTPUT")
}

let videoURL = URL(fileURLWithPath: CommandLine.arguments[1])
let audioURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])

guard !FileManager.default.fileExists(atPath: outputURL.path) else {
    fatalError("Output already exists")
}
try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
)

let done = DispatchSemaphore(value: 0)
Task.detached {
    do {
        let video = AVURLAsset(url: videoURL)
        let audioAsset = AVURLAsset(url: audioURL)
        let videoDuration = try await video.load(.duration)
        let audioDuration = try await audioAsset.load(.duration)
        guard abs(videoDuration.seconds - audioDuration.seconds) < 1.0 / 15.0 else {
            fatalError("Video/audio durations differ too much: video=\(videoDuration.seconds), audio=\(audioDuration.seconds)")
        }
        let duration = CMTimeMinimum(videoDuration, audioDuration)
        guard let videoTrack = try await video.loadTracks(withMediaType: .video).first,
              let audioTrack = try await audioAsset.loadTracks(withMediaType: .audio).first else {
            fatalError("Missing video or audio track")
        }
        guard try await videoTrack.load(.naturalSize) == CGSize(width: 1080, height: 1920) else {
            fatalError("Video must be 1080x1920")
        }

        let composition = AVMutableComposition()
        guard let picture = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
              let sound = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            fatalError("Cannot create composition")
        }
        try picture.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: videoTrack, at: .zero)
        picture.preferredTransform = try await videoTrack.load(.preferredTransform)
        try sound.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: audioTrack, at: .zero)

        guard let session = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            fatalError("No export session")
        }
        try await session.export(to: outputURL, as: .mp4)

        let exported = AVURLAsset(url: outputURL)
        let length = try await exported.load(.duration).seconds
        let videos = try await exported.loadTracks(withMediaType: .video)
        let audios = try await exported.loadTracks(withMediaType: .audio)
        guard videos.count == 1, audios.count == 1,
              let exportedVideo = videos.first,
              try await exportedVideo.load(.naturalSize) == CGSize(width: 1080, height: 1920),
              abs(length - duration.seconds) < 1.0 / 30.0 else {
            fatalError("Combined review verification failed")
        }
        print("PASS: review mux, \(String(format: "%.3f", length))s, 1080x1920, one video and one audio track.")
        done.signal()
    } catch {
        fatalError("Review mux failed: \(error)")
    }
}
done.wait()

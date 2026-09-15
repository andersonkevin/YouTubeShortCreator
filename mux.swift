import Foundation
import AVFoundation
import AudioToolbox

func prepareCompressedPCM(_ asset: AVURLAsset, _ track: AVAssetTrack, _ description: CMAudioFormatDescription, _ output: URL) throws {
    guard !FileManager.default.fileExists(atPath: output.path),
          let basic = CMAudioFormatDescriptionGetStreamBasicDescription(description),
          basic.pointee.mSampleRate > 0,
          (1...2).contains(basic.pointee.mChannelsPerFrame) else { fatalError("Invalid compressed PCM preparation") }
    let rate = basic.pointee.mSampleRate
    let channels = basic.pointee.mChannelsPerFrame
    guard let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: rate,
                                     channels: channels, interleaved: true) else { fatalError("Invalid PCM format") }
    let file = try AVAudioFile(forWriting: output, settings: format.settings,
                              commonFormat: .pcmFormatFloat32, interleaved: true)
    let reader = try AVAssetReader(asset: asset)
    let sink = AVAssetReaderTrackOutput(track: track, outputSettings: [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: rate,
        AVNumberOfChannelsKey: channels,
        AVLinearPCMBitDepthKey: 32,
        AVLinearPCMIsFloatKey: true,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsNonInterleaved: false
    ])
    guard reader.canAdd(sink) else { fatalError("Cannot prepare compressed audio") }
    reader.add(sink)
    guard reader.startReading() else { throw reader.error! }
    var written: Int64 = 0
    while let sample = sink.copyNextSampleBuffer() {
        let start = CMSampleBufferGetPresentationTimeStamp(sample)
        let count = CMSampleBufferGetNumSamples(sample)
        guard start.seconds.isFinite, abs(start.seconds - Double(written) / rate) <= 2 / rate,
              count > 0, let block = CMSampleBufferGetDataBuffer(sample),
              CMBlockBufferGetDataLength(block) == count * Int(channels) * 4,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(count)) else {
            fatalError("Non-contiguous or invalid decoded audio samples")
        }
        buffer.frameLength = AVAudioFrameCount(count)
        guard let destination = buffer.mutableAudioBufferList.pointee.mBuffers.mData else { fatalError("Missing PCM buffer") }
        guard CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: count * Int(channels) * 4,
                                        destination: destination) == kCMBlockBufferNoErr else { fatalError("PCM copy failed") }
        try file.write(from: buffer)
        written += Int64(count)
    }
    guard reader.status == .completed else { throw reader.error! }
    guard written > 0 else { fatalError("Empty compressed audio") }
    print("Prepared native compressed PCM: \(written) frames, \(rate) Hz, \(channels) channels; original preserved")
}

guard CommandLine.arguments.count == 5 else {
    fatalError("Usage: mux.swift SILENT_VIDEO AUDIO OUTPUT TEMPORARY_PCM.caf")
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
        var audioAsset = AVURLAsset(url: audioURL)
        let videoDuration = try await video.load(.duration)
        guard let videoTrack = try await video.loadTracks(withMediaType: .video).first,
              var audioTrack = try await audioAsset.loadTracks(withMediaType: .audio).first else {
            fatalError("Missing video or audio track")
        }
        let descriptions = try await audioTrack.load(.formatDescriptions)
        // Direct AAC/Opus composition can misapply padding/pre-skip. Preserve decoded samples instead.
        if let compressed = descriptions.first(where: {
            let codec = CMFormatDescriptionGetMediaSubType($0)
            return codec == kAudioFormatOpus || codec == kAudioFormatMPEG4AAC
        }) {
            let pcmURL = URL(fileURLWithPath: CommandLine.arguments[4])
            try prepareCompressedPCM(audioAsset, audioTrack, compressed, pcmURL)
            audioAsset = AVURLAsset(url: pcmURL)
            guard let prepared = try await audioAsset.loadTracks(withMediaType: .audio).first else { fatalError("Missing prepared PCM") }
            audioTrack = prepared
        }
        let audioDuration = try await audioAsset.load(.duration)
        guard abs(videoDuration.seconds - audioDuration.seconds) < 1.0 / 15.0 else {
            fatalError("Video/audio durations differ too much: video=\(videoDuration.seconds), audio=\(audioDuration.seconds)")
        }
        let duration = CMTimeMinimum(videoDuration, audioDuration)
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

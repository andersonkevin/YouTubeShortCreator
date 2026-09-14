import Foundation
import AVFoundation

guard CommandLine.arguments.count == 3 else { fatalError("Usage: INPUT OUTPUT.f32") }
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard !FileManager.default.fileExists(atPath: output.path) else { fatalError("No overwrite") }
let done = DispatchSemaphore(value: 0)
Task.detached {
    do {
        let asset = AVURLAsset(url: input)
        let tracks = try await asset.loadTracks(withMediaType: .audio)
        guard tracks.count == 1, let track = tracks.first else { fatalError("Expected one audio track") }
        let reader = try AVAssetReader(asset: asset)
        let settings: [String: Any] = [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 32, AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false]
        let sink = AVAssetReaderTrackOutput(track: track, outputSettings: settings)
        reader.add(sink)
        guard reader.startReading() else { throw reader.error! }
        var data = Data()
        var first: Double?
        var last = 0.0
        while let sample = sink.copyNextSampleBuffer() {
            let pts = CMSampleBufferGetPresentationTimeStamp(sample).seconds
            if first == nil { first = pts }
            last = pts + CMSampleBufferGetDuration(sample).seconds
            guard let block = CMSampleBufferGetDataBuffer(sample) else { fatalError("No PCM block") }
            let length = CMBlockBufferGetDataLength(block)
            var bytes = [UInt8](repeating: 0, count: length)
            let status = bytes.withUnsafeMutableBytes { CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: length, destination: $0.baseAddress!) }
            guard status == kCMBlockBufferNoErr else { fatalError("PCM copy failed") }
            data.append(contentsOf: bytes)
        }
        guard reader.status == .completed else { throw reader.error! }
        try data.write(to: output, options: .withoutOverwriting)
        let descriptions = try await track.load(.formatDescriptions)
        print("samples=\(data.count / 4) firstPTS=\(first ?? -1) endPTS=\(last) formats=\(descriptions)")
        done.signal()
    } catch { fatalError("Decode failed: \(error)") }
}
done.wait()

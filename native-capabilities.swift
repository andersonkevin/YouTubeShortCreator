import Foundation
import AVFoundation

guard CommandLine.arguments.count == 2 else {
    fatalError("Usage: native-capabilities.swift TEMPORARY_PROBE.mp4")
}
let output = URL(fileURLWithPath: CommandLine.arguments[1])
guard !FileManager.default.fileExists(atPath: output.path) else {
    fatalError("Probe output already exists")
}
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: 1080,
    AVVideoHeightKey: 1920,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8000000]
]
guard writer.canApply(outputSettings: settings, forMediaType: .video),
      writer.canAdd(AVAssetWriterInput(mediaType: .video, outputSettings: settings)),
      AVAssetExportSession.allExportPresets().contains(AVAssetExportPresetHighestQuality) else {
    fatalError("Native H.264 encoding or highest-quality export capability unavailable")
}
print("PASS: native H.264 settings and export preset available; actual media still requires QA")

import Foundation
import AVFoundation
import ImageIO
import CoreGraphics

// This encoder consumes generated frames only; it never reads or edits narration.
guard CommandLine.arguments.count == 4,
      let count = Int(CommandLine.arguments[2]), count > 0 else {
    fatalError("Usage: encode.swift FRAME_DIRECTORY FRAME_COUNT OUTPUT.mp4")
}
let directory = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[3])
guard !FileManager.default.fileExists(atPath: output.path) else { fatalError("Output already exists") }
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: 1080, AVVideoHeightKey: 1920,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8000000]
])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: 1080,
    kCVPixelBufferHeightKey as String: 1920,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
])
guard writer.canAdd(input) else { fatalError("Video input unavailable") }
writer.add(input)
guard writer.startWriting() else { fatalError("Cannot start encoder: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)
for index in 0..<count {
    autoreleasepool {
        let file = directory.appendingPathComponent(String(format: "frame-%05d.png", index))
        guard let source = CGImageSourceCreateWithURL(file as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
              image.width == 1080, image.height == 1920,
              let pool = adaptor.pixelBufferPool else { fatalError("Invalid frame \(index)") }
        var buffer: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer) == kCVReturnSuccess,
              let buffer = buffer else { fatalError("Cannot allocate frame") }
        CVPixelBufferLockBaseAddress(buffer, [])
        guard let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: 1080, height: 1920,
            bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) else {
            fatalError("Cannot create frame context")
        }
        context.draw(image, in: CGRect(x: 0, y: 0, width: 1080, height: 1920))
        CVPixelBufferUnlockBaseAddress(buffer, [])
        while !input.isReadyForMoreMediaData {
            guard writer.status == .writing else { fatalError("Encoder failed") }
            Thread.sleep(forTimeInterval: 0.005)
        }
        guard adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(index), timescale: 30)) else {
            fatalError("Frame rejected: \(String(describing: writer.error))")
        }
    }
}
writer.endSession(atSourceTime: CMTime(value: Int64(count), timescale: 30))
input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting { semaphore.signal() }
semaphore.wait()
guard writer.status == .completed else { fatalError("Encoding failed") }
print("Encoded \(count) frames; media-qa.swift validates the muxed output")

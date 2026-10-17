// Extract private approved-font geometry without registering a system font.
import Foundation
import CoreText
import CoreGraphics

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

guard CommandLine.arguments.count == 3 ||
      (CommandLine.arguments.count == 4 && CommandLine.arguments[3] == "--nonzero") else {
    fail("Font snapshot, characters and optional nonzero normalization required")
}
let normalize = CommandLine.arguments.count == 4
do {
    let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
    guard !data.isEmpty, data.count <= 20_000_000 else { fail("Font exceeds size limit") }
    guard let descriptors = CTFontManagerCreateFontDescriptorsFromData(data as CFData) as? [CTFontDescriptor],
          descriptors.count == 1 else { fail("One supported static font face required") }
    let font = CTFontCreateWithFontDescriptor(descriptors[0], 1000, nil)
    if let axes = CTFontCopyVariationAxes(font), CFArrayGetCount(axes) > 0 {
        fail("Variable display fonts require separate outline qualification")
    }
    let characters = Array(CommandLine.arguments[2].unicodeScalars)
    guard !characters.isEmpty, characters.count <= 256,
          characters.allSatisfy({ $0.value >= 32 && $0.value <= 0x024F }) else { fail("Invalid outline repertoire") }
    var rows: [String: Any] = [:]
    for scalar in characters {
        var character = UniChar(scalar.value)
        var glyph = CGGlyph(0)
        guard CTFontGetGlyphsForCharacters(font, &character, &glyph, 1), glyph != 0 else {
            fail("Approved font lacks a requested glyph")
        }
        var advance = CGSize.zero
        CTFontGetAdvancesForGlyphs(font, .horizontal, &glyph, &advance, 1)
        var commands: [[Any]] = []
        if scalar.value != 32 {
            guard let original = CTFontCreatePathForGlyph(font, glyph, nil) else { fail("Requested glyph has no outline") }
            let path: CGPath
            if normalize {
                if #available(macOS 13.0, *) { path = original.normalized(using: .winding) }
                else { fail("Nonzero outline normalization requires macOS 13 or newer") }
            } else { path = original }
            path.applyWithBlock { pointer in
                let element = pointer.pointee
                switch element.type {
                case .moveToPoint: commands.append(["M", element.points[0].x, element.points[0].y])
                case .addLineToPoint: commands.append(["L", element.points[0].x, element.points[0].y])
                case .addQuadCurveToPoint: commands.append(["Q", element.points[0].x, element.points[0].y, element.points[1].x, element.points[1].y])
                case .addCurveToPoint: commands.append(["C", element.points[0].x, element.points[0].y, element.points[1].x, element.points[1].y, element.points[2].x, element.points[2].y])
                case .closeSubpath: commands.append(["Z"])
                @unknown default: fail("Unsupported font path command")
                }
            }
            guard !commands.isEmpty, commands.count <= 8192 else { fail("Glyph outline exceeds complexity limit") }
        }
        rows[String(scalar)] = ["advance": advance.width, "commands": commands]
    }
    let result: [String: Any] = ["version": 1, "units": 1000,
        "postscript_name": CTFontCopyPostScriptName(font), "glyphs": rows]
    let output = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    guard output.count <= 2_000_000 else { fail("Outline bundle exceeds size limit") }
    FileHandle.standardOutput.write(output)
} catch {
    fail("Could not decode the approved font snapshot")
}

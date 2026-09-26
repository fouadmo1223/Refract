# Refract — Media Toolkit

A fast, private media toolkit that runs in your browser. Compress, convert, resize, crop and edit images and videos without uploading them anywhere. It also includes optional AI tools for generating images and videos.

- **53 tools**: 26 image tools, 25 video tools and 2 AI generators
- **Local processing**: images are handled with Canvas and Web Workers (plus WebAssembly codecs for AVIF and WebP), and videos with FFmpeg compiled to WebAssembly
- **English and Arabic**, with a full right-to-left layout
- **Light, dark and system themes**
- **Accessible**: every control works from the keyboard, and search opens with Ctrl + K / ⌘K

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

To build for production:

```bash
npm run build
npm run preview
```

The build output in `dist/` is a static site you can host anywhere. To serve it from a sub-path, build with `BASE_PATH=/your-path/ npm run build`.

### Vercel

1. Import the GitHub repo in Vercel. It detects Vite automatically.
2. Keep the defaults: build command `npm run build`, output directory `dist`.
3. Deploy.

`vercel.json` rewrites every route to `index.html` so deep links such as `/image/compress` work, and it caches the hashed files in `/assets` long-term (including the ~32 MB FFmpeg WebAssembly file).

## Tools

| Category | Tools |
| --- | --- |
| Image | Compress, Convert (JPG/PNG/WebP/AVIF/BMP/GIF), HEIC → JPG, Image → SVG (vector tracing), Resize (with social media presets), Crop, Remove Background, Editor (light, color, detail, undo/redo), Photo filters, Add text / meme, Blur or pixelate areas, Collage, Border & frame, Watermark, Metadata viewer/remover, Batch processing (with ZIP download), Image ↔ Base64, ICO, SVG → PNG, Color picker, Blur, Pixelate, Grayscale, Rotate, Flip |
| Video | Compress, Convert (MP4/WebM/MOV/AVI/MKV/GIF), Trim, Split, Crop, Resize, Fit to 9:16 with blurred background, Add text, Watermark, Blur or pixelate areas, Filters & color, Fade in/out, Mute, Extract audio, Speed, Rotate, Video → GIF, GIF → Video, Thumbnail, Loop, Reverse, Frame rate, Extract frames, Merge, Add audio |
| AI | Image generator, Video generator (animate an image locally, or text-to-video) |

## AI tools and privacy

All image and video tools process files **on your device**. Nothing is uploaded.

The AI tools are the exception. They send your **prompt** to a third-party service using **your own API key**:

| Provider | What it's used for | Free option |
| --- | --- | --- |
| [Pollinations](https://enter.pollinations.ai) | Images and text-to-video | Free account with daily credits. Most video models need paid credits. |
| [Hugging Face](https://huggingface.co/settings/tokens) | Images (FLUX.1 schnell, SDXL) | Free token with monthly credits |

- "Animate an image" needs no key. It runs entirely in the browser with FFmpeg.
- Keys are stored only in your browser: in session storage by default, or in local storage if you choose "Remember on this device". They are sent only to the provider they belong to.
- The background remover downloads its AI model from IMG.LY's CDN the first time you use it. Your images are never uploaded.

## Project structure

```
src/
  components/   ui/ (design system), layout/, media/, feedback/
  features/     one folder per tool (image/, video/, ai/)
  services/     processing logic — image/, video/ (FFmpeg), ai/, backgroundRemoval/
  workers/      image Web Worker
  constants/    tool registry, file limits, formats, presets
  hooks/ store/ lib/ i18n/ locales/ routes/ pages/
```

Processing logic lives in `services/` and never inside components. To add a tool:

1. Register it in `src/constants/tools.js`.
2. Add a page in `src/features/`.
3. Map the page in `src/routes/toolRoutes.js`.
4. Add strings to both `src/locales/*/translation.json` files.

To add an AI or background-removal provider, write a provider module and register it in `src/services/ai/index.js` or `src/services/backgroundRemoval/index.js`.

## License

Refract is licensed under the **GNU Affero General Public License v3.0 or later** (see [LICENSE](LICENSE)). You may use, modify and host it. If you run a modified version for other people over a network, you must make your source code available to them under the same license.

### Third-party components

| Component | License | Notes |
| --- | --- | --- |
| [@imgly/background-removal](https://github.com/imgly/background-removal-js) | AGPL-3.0 | Background removal. This is the reason Refract uses the AGPL. |
| [FFmpeg](https://ffmpeg.org) via [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) (`@ffmpeg/core`) | GPL-2.0-or-later | Includes x264 and libvpx |
| [jSquash](https://github.com/jamsinclair/jSquash) (AVIF/WebP codecs) | Apache-2.0 | |
| [ImageTracer.js](https://github.com/jankovicsandras/imagetracerjs) | Public domain (Unlicense) | Image → SVG tracing |
| [heic2any](https://github.com/alexcorvi/heic2any) | MIT | HEIC decoding |
| React, React Router, TanStack Query, Zustand, i18next, Framer Motion, Zod, Lucide, Sonner, Floating UI, fflate, exifr, gifenc, UPNG.js | MIT / ISC / BSD | |
| Inter, IBM Plex Sans Arabic (via Fontsource) | SIL Open Font License 1.1 | |

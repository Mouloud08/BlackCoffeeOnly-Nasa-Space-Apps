# FireBridge demo video and fallback slides

- `out/firebridge-demo.mp4`: the 28.5-second demo (1920×1080, H.264 yuv420p, 30 fps, faststart, no audio).
- `out/firebridge-slides.pdf`: the 7-slide fallback (16:9). Previews: `out/slides/*.png`.

Everything on screen comes from real captures of `dist/firebridge.html` (light theme, real clicks, visible cursor).

## Re-render (one command)

```sh
node video/render.mjs C:/path/to/firebridge.html
```

This captures the five shots again (`capture.mjs`), checks every caption number against the text of the captured screen
(it stops if one is missing), renders with Remotion, re-encodes for the web, verifies the result with ffprobe
(≤ 29.5 s, 1920×1080, H.264 yuv420p, < 15 MB), saves one frame per shot in `out/frames/`, rebuilds the slides
(`slides.mjs`) and prints the final duration. About 4–5 minutes. Look at `out/frames/*.png` before publishing.

Options: `--skip-capture` (captions edited only), `--skip-slides`, `--force` (render despite a number mismatch; not for the final).
First run: `npm install` inside `video/` (render.mjs does it if `node_modules` is missing).

## Where things live

- `captions.json`: ALL on-screen text and timing (shots, captions with start/end in seconds, end card). `*x*` = emphasis.
- `capture.mjs`: the hash opened and the scripted clicks for each shot (selectors by id/class/role, not by label).
- `src/Demo.jsx`: the Remotion composition (window, caption band, cross-fades, end card); `slides.mjs`: the deck.
- `public/fonts/`: the app's fonts (Atelier Texte, Radio Canada). `public/captures/`: generated clips (not in git).

## Adding a voice track later

Put `voice.mp3` (or `.wav` / `.m4a`) in `video/public/`, starting at 0 s and no longer than 28.5 s, then run
`node video/render.mjs --skip-capture`. The composition lays it under the whole video and the output gets an AAC track.
The caption times in `captions.json` are the script to read from.

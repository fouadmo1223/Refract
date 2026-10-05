/** Starter snippets for HTML → image. */
export const HTML_EXAMPLES = {
  card: {
    width: 800,
    height: 420,
    html: `<div class="card">
  <span class="tag">New release</span>
  <h1>Refract 2.0</h1>
  <p>Edit images, videos and PDFs right in your browser — fast, private and free.</p>
  <div class="footer">refract.app</div>
</div>`,
    css: `body { display: grid; place-items: center; height: 100vh; background: linear-gradient(135deg, #0f766e, #1e3a8a); font-family: system-ui, sans-serif; }
.card { width: 640px; padding: 48px; border-radius: 28px; background: rgba(255,255,255,0.1); backdrop-filter: blur(12px); color: white; box-shadow: 0 30px 60px rgba(0,0,0,0.3); }
.tag { display: inline-block; padding: 6px 14px; border-radius: 999px; background: #fde047; color: #111; font-weight: 700; font-size: 14px; }
h1 { font-size: 56px; margin: 20px 0 12px; }
p { font-size: 22px; line-height: 1.5; opacity: 0.9; margin: 0; }
.footer { margin-top: 32px; font-weight: 600; opacity: 0.7; }`,
  },
  quote: {
    width: 1080,
    height: 1080,
    html: `<figure>
  <blockquote>“Simplicity is the ultimate sophistication.”</blockquote>
  <figcaption>— Leonardo da Vinci</figcaption>
</figure>`,
    css: `body { display: grid; place-items: center; height: 100vh; margin: 0; background: #fef3c7; font-family: Georgia, serif; }
figure { margin: 0 120px; text-align: center; }
blockquote { margin: 0; font-size: 84px; line-height: 1.15; color: #1f2937; }
figcaption { margin-top: 48px; font-size: 36px; color: #b45309; font-style: italic; }`,
  },
  banner: {
    width: 1500,
    height: 500,
    html: `<div class="banner">
  <div>
    <h1>Design · Code · Ship</h1>
    <p>Frontend engineer building delightful web apps</p>
  </div>
  <div class="dots"></div>
</div>`,
    css: `body { margin: 0; }
.banner { height: 100vh; display: flex; align-items: center; justify-content: space-between; padding: 0 120px; background: #0b1020; color: #e2e8f0; font-family: system-ui, sans-serif; overflow: hidden; }
h1 { font-size: 88px; margin: 0; background: linear-gradient(90deg, #22d3ee, #a78bfa); -webkit-background-clip: text; color: transparent; }
p { font-size: 32px; margin: 16px 0 0; color: #94a3b8; }
.dots { width: 360px; height: 360px; background-image: radial-gradient(#334155 3px, transparent 3px); background-size: 28px 28px; transform: rotate(12deg); }`,
  },
  code: {
    width: 900,
    height: null,
    html: `<div class="window">
  <div class="bar"><i></i><i></i><i></i><span>hello.js</span></div>
<pre><span class="k">function</span> <span class="f">greet</span>(name) {
  <span class="k">return</span> <span class="s">\`Hello, \${name}!\`</span>
}

console.<span class="f">log</span>(<span class="f">greet</span>(<span class="s">'world'</span>))</pre>
</div>`,
    css: `body { margin: 0; padding: 60px; background: linear-gradient(140deg, #f472b6, #8b5cf6); }
.window { border-radius: 14px; background: #1e1e2e; box-shadow: 0 24px 60px rgba(0,0,0,0.35); overflow: hidden; }
.bar { display: flex; align-items: center; gap: 8px; padding: 14px 18px; background: #181825; }
.bar i { width: 13px; height: 13px; border-radius: 50%; background: #f38ba8; }
.bar i:nth-child(2) { background: #f9e2af; } .bar i:nth-child(3) { background: #a6e3a1; }
.bar span { margin-left: 12px; color: #6c7086; font: 14px ui-monospace, monospace; }
pre { margin: 0; padding: 26px 30px; color: #cdd6f4; font: 20px/1.6 ui-monospace, Menlo, monospace; }
.k { color: #cba6f7; } .f { color: #89b4fa; } .s { color: #a6e3a1; }`,
  },
}

export default function handler(req, res) {
  res.status(200).json({ ok: true, url: req.url, ts: Date.now() });
}

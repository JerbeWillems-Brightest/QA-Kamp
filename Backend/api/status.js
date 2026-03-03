"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
// Remove dependency on @vercel/node types to avoid requiring extra package in this repo
function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    res.status(200).json({ message: 'Hello from backend', time: new Date().toISOString() });
}
//# sourceMappingURL=status.js.map
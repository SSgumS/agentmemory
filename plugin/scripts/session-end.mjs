#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
//#region src/hooks/_env.ts
const envPath = join(homedir(), ".agentmemory", ".env");
try {
	const raw = readFileSync(envPath, "utf8");
	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq < 1) continue;
		const key = trimmed.slice(0, eq).trim();
		let val = trimmed.slice(eq + 1).trim();
		if (val.startsWith("\"") && val.endsWith("\"") || val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
		if (!(key in process.env)) process.env[key] = val;
	}
} catch {}
//#endregion
//#region src/hooks/session-end.ts
function isSdkChildContext(payload) {
	if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
	if (!payload || typeof payload !== "object") return false;
	return payload.entrypoint === "sdk-ts";
}
const REST_URL = process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
const SECRET = process.env["AGENTMEMORY_SECRET"] || "";
function authHeaders() {
	const h = { "Content-Type": "application/json" };
	if (SECRET) h["Authorization"] = `Bearer ${SECRET}`;
	return h;
}
async function main() {
	let input = "";
	for await (const chunk of process.stdin) input += chunk;
	let data;
	try {
		data = JSON.parse(input);
	} catch {
		return;
	}
	if (isSdkChildContext(data)) return;
	const sessionId = data.session_id || data.sessionId || "unknown";
	fetch(`${REST_URL}/agentmemory/session/end`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify({ sessionId }),
		signal: AbortSignal.timeout(3e4)
	}).catch(() => {});
	if (process.env["CONSOLIDATION_ENABLED"] === "true") {
		fetch(`${REST_URL}/agentmemory/crystals/auto`, {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ olderThanDays: 0 }),
			signal: AbortSignal.timeout(6e4)
		}).catch(() => {});
		fetch(`${REST_URL}/agentmemory/consolidate-pipeline`, {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				tier: "all",
				force: true
			}),
			signal: AbortSignal.timeout(12e4)
		}).catch(() => {});
	}
	if (process.env["CLAUDE_MEMORY_BRIDGE"] === "true") fetch(`${REST_URL}/agentmemory/claude-bridge/sync`, {
		method: "POST",
		headers: authHeaders(),
		signal: AbortSignal.timeout(3e4)
	}).catch(() => {});
	setTimeout(() => process.exit(0), 1500).unref();
}
main();
//#endregion
export {};

//# sourceMappingURL=session-end.mjs.map
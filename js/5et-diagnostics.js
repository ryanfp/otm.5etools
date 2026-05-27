/**
 * 5etools Debug Diagnostics
 *
 * Catches errors that ES modules silently swallow.
 * Load this BEFORE any other scripts (non-deferred, non-module).
 * Remove once the issue is resolved.
 */
(function () {
	"use strict";

	const TAG = "[5et-diag]";
	const errors = [];

	/*
	========================
	       ERROR CAPTURE
	========================
	*/

	window.addEventListener("unhandledrejection", (evt) => {
		const reason = evt.reason;
		const msg = reason instanceof Error
			? `${reason.message}\n${reason.stack}`
			: String(reason);
		console.error(`${TAG} UNHANDLED PROMISE REJECTION:\n${msg}`);
		errors.push({type: "unhandledrejection", msg, time: Date.now()});
	});

	window.addEventListener("error", (evt) => {
		if (evt.filename) {
			console.error(`${TAG} UNCAUGHT ERROR in ${evt.filename}:${evt.lineno}:${evt.colno}\n${evt.message}`);
			errors.push({type: "error", msg: evt.message, file: evt.filename, line: evt.lineno, time: Date.now()});
		}
	});

	/*
	========================
	      FETCH MONITOR
	========================
	*/

	const _origFetch = window.fetch;
	window.fetch = async function (...args) {
		const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "unknown";
		let resp;
		try {
			resp = await _origFetch.apply(this, args);
		} catch (e) {
			console.error(`${TAG} FETCH NETWORK ERROR: ${url}\n${e.message}`);
			errors.push({type: "fetch-network", url, msg: e.message, time: Date.now()});
			throw e;
		}

		if (!resp.ok) {
			console.warn(`${TAG} FETCH HTTP ${resp.status}: ${url}`);
			errors.push({type: "fetch-status", url, status: resp.status, time: Date.now()});
		}

		// Detect HTML served instead of JSON (Cloudflare error pages, 404 pages)
		if (url.endsWith(".json")) {
			const ct = resp.headers.get("content-type") || "";
			if (ct.includes("text/html")) {
				console.error(`${TAG} JSON URL RETURNED HTML: ${url} (content-type: ${ct})`);
				errors.push({type: "json-as-html", url, contentType: ct, time: Date.now()});
			}
		}

		return resp;
	};

	/*
	========================
	    MODULE LOAD MONITOR
	========================
	*/

	// Detect module scripts that fail to load (network/syntax errors)
	new MutationObserver((mutations) => {
		for (const mut of mutations) {
			for (const node of mut.addedNodes) {
				if (node.tagName === "SCRIPT" && node.type === "module") {
					node.addEventListener("error", (evt) => {
						console.error(`${TAG} MODULE LOAD FAILED: ${node.src}`);
						errors.push({type: "module-load", src: node.src, time: Date.now()});
					});
				}
			}
		}
	}).observe(document.documentElement, {childList: true, subtree: true});

	/*
	========================
	    LIFECYCLE LOGGING
	========================
	*/

	const t0 = performance.now();
	const elapsed = () => `+${((performance.now() - t0) / 1000).toFixed(2)}s`;

	window.addEventListener("DOMContentLoaded", () => {
		console.log(`${TAG} DOMContentLoaded ${elapsed()}`);
	});

	window.addEventListener("load", () => {
		console.log(`${TAG} window.load ${elapsed()}`);

		// After a delay, check if the bestiary list populated
		setTimeout(() => {
			const listEl = document.querySelector(".list");
			const itemCount = listEl ? listEl.children.length : -1;
			console.log(`${TAG} List item count: ${itemCount} ${elapsed()}`);

			if (itemCount <= 0 && errors.length === 0) {
				console.warn(`${TAG} List is empty but no errors were caught. Checking page state...`);

				// Check if key globals exist
				const checks = [
					["globalThis.dbg_page", typeof globalThis.dbg_page],
					["globalThis.dbg_page?._dataList?.length", globalThis.dbg_page?._dataList?.length],
					["typeof DataUtil", typeof globalThis.DataUtil],
					["typeof DataLoader", typeof globalThis.DataLoader],
					["typeof ExcludeUtil", typeof globalThis.ExcludeUtil],
				];
				for (const [name, val] of checks) {
					console.log(`${TAG}   ${name} = ${val}`);
				}
			}

			if (errors.length) {
				console.warn(`${TAG} === DIAGNOSTIC SUMMARY: ${errors.length} error(s) captured ===`);
				errors.forEach((e, i) => console.warn(`${TAG}   ${i + 1}. [${e.type}] ${e.msg || e.url || ""}`));
			} else {
				console.log(`${TAG} === No errors captured ===`);
			}
		}, 5000);
	});
})();

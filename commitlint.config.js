module.exports = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"type-enum": [
			2,
			"always",
			[
				"feat",
				"fix",
				"style",
				"content",
				"refactor",
				"chore",
				"docs",
			],
		],
		"scope-enum": [
			2,
			"always",
			[
				"css",
				"brew",
				"data",
				"upstream",
				"build",
				"ui",
				"format",
				"tags",
			],
		],
		"scope-empty": [0],
	},
	prompt: {
		settings: {},
		messages: {
			skip: "(press enter to skip)",
			max: "(max %d chars)",
			min: "(min %d chars)",
			emptyWarning: "cannot be empty",
			upperLimitWarning: "over the limit",
			lowerLimitWarning: "below the limit",
		},
		questions: {
			type: {
				description: "Select the type of change you're committing",
				enum: {
					feat: {
						description: "Adds, adjusts, or removes a feature or behavior",
						title: "Features",
					},
					fix: {
						description: "Bug fix, broken link, rendering issue",
						title: "Bug Fixes",
					},
					style: {
						description: "CSS/visual-only changes or code appearance",
						title: "Style",
					},
					content: {
						description: "Data/JSON additions, removals, or corrections pertaining to actual written content",
						title: "Content",
					},
					refactor: {
						description: "Code restructuring with no behavior change",
						title: "Refactors",
					},
					chore: {
						description: "Build, config, tooling, upstream merges, etc.",
						title: "Chores",
					},
					docs: {
						description: "Documentation, README, comments only",
						title: "Documentation",
					},
				},
			},
			scope: {
				description: "What area of the codebase does this affect?",
				enum: {
					css: {
						description: "CSS/SCSS, custom overrides, theme changes",
					},
					brew: {
						description: "Homebrew JSON, managebrew.js, brew loading/building functions",
					},
					data: {
						description: "Official/Parnered JSON, other .js functions, HTML, etc.",
					},
					upstream: {
						description: "Merging or resolving upstream 5etools changes",
					},
					build: {
						description: "node build, service worker, Workbox, npm scripts",
					},
					ui: {
						description: "Page layout, nav, filters, DM Screen, modals",
					},
					format: {
						description: "Data formatting, JSON structure, schema compliance",
					},
					tags: {
						description: "Cross-reference {@tag} fixes in data files",
					},
				},
			},
			subject: {
				description: "Short description of the change (lowercase, no period)",
			},
			body: {
				description: "Longer description of the change (optional)",
			},
			isBreaking: {
				description: "Are there any breaking changes?",
			},
			breaking: {
				description: "Describe the breaking changes",
			},
			isIssueAffected: {
				description: "Does this change affect any open issues?",
			},
			issues: {
				description: "Add issue references (e.g. 'closes #123')",
			},
		},
	},
};

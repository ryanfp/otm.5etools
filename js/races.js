import {RenderRaces} from "./render-races.js";
const Renderer = globalThis.Renderer;

class RacesSublistManager extends SublistManager {
	static _getRowTemplate () {
		return [
			new SublistCellTemplate({
				name: "Name",
				css: "ve-bold ve-col-5 ve-pl-0 ve-pr-1",
				colStyle: "",
			}),
			new SublistCellTemplate({
				name: "Ability",
				css: "ve-col-5 ve-px-1",
				colStyle: "",
			}),
			new SublistCellTemplate({
				name: "Size",
				css: "ve-col-2 ve-text-center ve-pl-1 ve-pr-0",
				colStyle: "text-center",
			}),
		];
	}

	pGetSublistItem (race, hash) {
		const {sizeText, sizeShortText} = PageFilterRaces.getSizeDisplayInfo(race.size);

		const cellsText = [
			race.name,
			new SublistCell({text: race._slAbility, css: race._slAbility === VeCt.STR_NONE || race._slAbility === "Lineage" ? "ve-italic" : ""}),
			new SublistCell({text: sizeShortText, title: sizeText}),
		];

		const ele = ee`<div class="ve-lst__row ve-lst__row--sublist ve-flex-col">
				<a href="#${UrlUtil.autoEncodeHash(race)}" class="ve-lst__row-border ve-lst__row-inner">
					${this.constructor._getRowCellsHtml({values: cellsText})}
				</a>
			</div>
		`
			.onn("contextmenu", evt => this._handleSublistItemContextMenu(evt, listItem))
			.onn("click", evt => this._listSub.doSelect(listItem, evt));

		const listItem = new ListItem(
			hash,
			ele,
			race.name,
			{
				hash,
				page: race.page,
				ability: race._slAbility,
			},
			{
				entity: race,
				mdRow: [...cellsText],
			},
		);
		return listItem;
	}
}

class RacesPage extends ListPage {
	constructor () {
		const pageFilter = new PageFilterRaces();
		super({
			dataSource: DataUtil.race.loadJSON.bind(DataUtil.race, {isAddBaseRaces: true}),
			prereleaseDataSource: DataUtil.race.loadPrerelease.bind(DataUtil.race),
			brewDataSource: DataUtil.race.loadBrew.bind(DataUtil.race),

			pFnGetFluff: Renderer.race.pGetFluff.bind(Renderer.race),

			pageFilter,

			dataProps: ["race"],

			bookViewOptions: {
				nameSingular: "species",
				namePlural: "species",
				pageTitle: "Species Book View",
			},

			isPreviewable: true,

			tableViewOptions: {
				title: "Species",
				colTransforms: {
					name: UtilsTableview.COL_TRANSFORM_NAME,
					source: UtilsTableview.COL_TRANSFORM_SOURCE,
					page: UtilsTableview.COL_TRANSFORM_PAGE,
					_hasSubrace: {
						name: "Base/Subrace",
						transform: (race) => {
							if (race._isBaseRace) return "Base";
							if (race._baseName) return `Subrace of: ${race._baseName}`;
							return "N/A";
						},
					},
					_slAbility: {name: "Ability Score", transform: (race) => race._slAbility},
					_size: {
						name: "Size",
						transform: (race) => (race.size || [Parser.SZ_VARIES]).map(sz => Parser.sizeAbvToFull(sz)).join("/"),
					},
					_speed: {
						name: "Speed",
						transform: (race) => Parser.getSpeedString(race),
					},
					_fLangs: {
						name: "Languages",
						transform: (race) => (race._fLangs || [])
							.map(lang => {
      							// Shows only the language part before '|'
								const abbr = lang.split("|")[0];
      							// Optionally capitalize the first letter
								return abbr.charAt(0).toUpperCase() + abbr.slice(1);
							}
						)
							.join(", ") || "\u2014",
						// transform: (race) => (race._fLangs || []).join(", ") || "\u2014",
					},
					_age: {
						name: "Age",
						transform: (race) => {
							// If age is an object with max (and/or min), display as years.
							if (race.age && typeof race.age === "object") {
								let parts = [];
								if (race.age.min) parts.push(`Min: ${race.age.min} years`);
								if (race.age.max) parts.push(`Max: ${race.age.max} years`);
								if (parts.length) return parts.join(", ");
							}
							// If age is a non-object (could be a description string)
							if (race.age && typeof race.age === "string") {
								return Renderer.get().render({type: "entries", entries: [race.age]}, 1);
							}
							// Look for an entry block named "Age" in entries (as fallback)
							if (Array.isArray(race.entries)) {
								const ageEntry = race.entries.find(
									e => typeof e === "object" && e.name && e.name.trim().toLowerCase() === "age"
								);
								if (ageEntry && ageEntry.entries) {
									return Renderer.get().render({type: "entries", entries: ageEntry.entries}, 1);
								}
							}
							return "\u2014";
						},
					},
					_traitTags: {
						name: "Traits",
						transform: (race) => (race.traitTags || [])
							.map(t => PageFilterRaces._TRAIT_DISPLAY_VALUES[t] || t)
							.join(", ") || "\u2014",
					},
					_senses: {
						name: "Senses",
						transform: (race) => {
							const senseKeywords = ["blindsight", "truesight", "tremorsense", "see invisibility", "devilsight"];
							const mainEntries = Array.isArray(race.entries) ? race.entries : [];
							const matched = mainEntries.filter(e => {
							if (typeof e === "object" && e.name) {
								const lower = e.name.trim().toLowerCase();
								if (senseKeywords.some(sense => lower.includes(sense))) return true;
							}
							if (typeof e === "object" && e.entries && Array.isArray(e.entries)) {
								// Optionally, also scan the text for the keyword:
								const content = e.entries.join(" ").toLowerCase();
								if (senseKeywords.some(sense => content.includes(sense))) return true;
							}
							return false;
							});
							if (!matched.length) return "\u2014";
							return Renderer.get().render({type: "entries", entries: matched}, 1);
						},
					},
					_fVuln: {
						name: "Damage Vulnerability",
						transform: (race) => (race._fVuln || []).join(", ") || "\u2014",
					},
					_fRes: {
						name: "Damage Resistance",
						transform: (race) => (race._fRes || []).join(", ") || "\u2014",
					},
					_fImm: {
						name: "Damage Immunity",
						transform: (race) => (race._fImm || []).join(", ") || "\u2014",
					},
					entries: {
						name: "Features",
						transform: (it) => Renderer.get().render({
							type: "entries",
							entries: Array.isArray(it)
							? it.filter(e =>
								!(typeof e === "object" && e.name &&
									["age", "size", "languages", "languages", "bonus language", "speed", "darkvision"].includes(e.name.trim().toLowerCase())
								))
							: it
						}, 1),
						flex: 3
					},
				},
			},
			
			hasAudio: true,
		});
	}

	_addData (data) {
		if (data.race && data.race.length) super._addData(data);
		if (!data.subrace || !data.subrace.length) return;

		// Attach each subrace to a parent race, and recurse
		const nxtData = Renderer.race.adoptSubraces(this._dataList, data.subrace);

		if (nxtData.length) this._addData({race: Renderer.race.mergeSubraces(nxtData)});
	}

	getListItem (race, rcI, isExcluded) {
		const hash = UrlUtil.autoEncodeHash(race);
		if (this._seenHashes.has(hash)) return null;
		this._seenHashes.add(hash);

		this._pageFilter.mutateAndAddToFilters(race, isExcluded);

		const eleLi = document.createElement("div");
		eleLi.className = `ve-lst__row ve-flex-col ${isExcluded ? "ve-lst__row--blocklisted" : ""}`;

		const {sizeText, sizeShortText} = PageFilterRaces.getSizeDisplayInfo(race.size);

		const source = Parser.sourceJsonToAbv(race.source);

		eleLi.innerHTML = `<a href="#${hash}" class="ve-lst__row-border ve-lst__row-inner">
			<span class="ve-col-0-4 ve-px-0 ve-flex-vh-center ve-lst__btn-toggle-expand ve-self-flex-stretch ve-no-select">[+]</span>
			<span class="ve-bold ve-col-4-4 ve-pl-0 ve-pr-1">${race.name}</span>
			<span class="ve-col-3-6 ve-px-1 ${race._slAbility === VeCt.STR_NONE || race._slAbility. startsWith("Lineage") ? "ve-italic" : ""}">${race._slAbility}</span>
			<span class="ve-col-1-6 ve-px-1 ve-text-center" title="${sizeText}">${sizeShortText}</span>
			<span class="ve-col-2 ve-text-center ${Parser.sourceJsonToSourceClassname(race.source)} ve-pl-1 ve-pr-0" title="${Parser.sourceJsonToFull(race.source)}">${source}</span>
		</a>
		<div class="ve-flex ve-hidden ve-relative ve-accordion__wrp-preview">
			<div class="ve-vr-0 ve-absolute ve-accordion__vr-preview"></div>
			<div class="ve-flex-col ve-py-3 ve-ml-4 ve-accordion__wrp-preview-inner"></div>
		</div>`;

		const listItem = new ListItem(
			rcI,
			eleLi,
			race.name,
			{
				hash,
				source,
				page: race.page,
				ability: race._slAbility,
				size: sizeText,
				cleanName: PageFilterRaces.getInvertedName(race.name) || "",
				alias: PageFilterRaces.getListAliases(race),
			},
			{
				isExcluded,
			},
		);

		eleLi.addEventListener("click", (evt) => this._list.doSelect(listItem, evt));
		eleLi.addEventListener("contextmenu", (evt) => this._openContextMenu(evt, this._list, listItem));

		return listItem;
	}

	_renderStats_doBuildStatsTab ({ent}) {
		this._pgContent.empty().appends(RenderRaces.getRenderedRace(ent));
	}
}

const racesPage = new RacesPage();
racesPage.sublistManager = new RacesSublistManager();
window.addEventListener("load", () => racesPage.pOnLoad());

globalThis.dbg_page = racesPage;

import {RenderBackgrounds} from "./render-backgrounds.js";

/*
===============================================
				HELPER FUNCTIONS
===============================================
*/

// flattens entry lists to make it easier to parse
function flattenEntries(entries) {
  // Recursively flatten any items inside objects with .items
  let out = [];
  for (const e of entries || []) {
    if (Array.isArray(e.items)) out.push(...flattenEntries(e.items));
    else out.push(e);
  }
  return out;
}

const otherBenefitAllow = [
  "languages", "language",
  "fighting style", "fighting styles",
  "weapon proficiency", "weapon proficiencies",
  "armor proficiency", "armor proficiencies",
  "additional spells",
];

// function to try and catch rogue objects not outputting correctly
function toolProficiencyDisplay(code) {
	switch (code) {
		case "anyGamingSet": return "any gaming set";
		case "anyArtisansTool": return "any artisan's tools";
		case "anyMusicalInstrument": return "any musical instrument";
		default: return code;
	}
}

/*
=========================================
				REST OF CODE
=========================================
*/

class BackgroundSublistManager extends SublistManager {
	static _getRowTemplate () {
		return [
			new SublistCellTemplate({
				name: "Name",
				css: "ve-bold ve-col-3 ve-pl-0 ve-pr-1",
				colStyle: "",
			}),
			new SublistCellTemplate({
				name: "Ability",
				css: "ve-col-5 ve-px-1",
				colStyle: "",
			}),
			new SublistCellTemplate({
				name: "Skills",
				css: "ve-col-4 ve-pl-1 ve-pr-0",
				colStyle: "",
			}),
		];
	}

	pGetSublistItem (it, hash) {
		const name = it.name.replace("Variant ", "");
		const {summary: skills} = Renderer.generic.getSkillSummary({skillProfs: it.skillProficiencies || [], isShort: true});
		const cellsText = [
			name,
			new SublistCell({text: it._slAbility, css: it._slAbility === VeCt.STR_NONE ? "ve-italic" : ""}),
			skills,
		];

		const ele = ee`<div class="ve-lst__row ve-lst__row--sublist ve-flex-col">
			<a href="#${hash}" class="ve-lst__row-border ve-lst__row-inner">
				${this.constructor._getRowCellsHtml({values: cellsText})}
			</a>
		</div>`
			.onn("contextmenu", evt => this._handleSublistItemContextMenu(evt, listItem))
			.onn("click", evt => this._listSub.doSelect(listItem, evt));

		const listItem = new ListItem(
			hash,
			ele,
			name,
			{
				hash,
				source: Parser.sourceJsonToAbv(it.source),
				page: it.page,
				skills,
			},
			{
				entity: it,
				mdRow: [...cellsText],
			},
		);
		return listItem;
	}
}

class BackgroundPage extends ListPage {
	constructor () {
		const pageFilter = new PageFilterBackgrounds();
		super({
			dataSource: DataUtil.background.loadJSON.bind(DataUtil.background),

			pFnGetFluff: Renderer.background.pGetFluff.bind(Renderer.background),

			pageFilter,

			bookViewOptions: {
				nameSingular: "background",
				namePlural: "backgrounds",
				pageTitle: "Backgrounds Book View",
			},

			// controls what structure the table view has and what it's contents are
			tableViewOptions: {
				title: "Backgrounds",
				colTransforms: {
					name: UtilsTableview. COL_TRANSFORM_NAME,
					source: UtilsTableview.COL_TRANSFORM_SOURCE,
					page: UtilsTableview.COL_TRANSFORM_PAGE,
					_slAbility: {
						name: "Ability Scores",
						transform: (bg) => bg._slAbility
					},
					_fFeats: {
						name: "Feat",
						transform: (bg) => (bg._fFeats || []).join(", ") || "\u2014",
					},
					_skillDisplay: {
						name: "Skill Proficiencies",
						transform: (bg) => bg._skillDisplay
					},
					_fTools: {
						name: "Tool Proficiencies",
						transform: (bg) =>
							(bg._fTools || []).map(toolProficiencyDisplay).join(", ") || "\u2014",
					},
					transform: bg => {
						console.log(bg); // See all properties, including _startingEquipment etc.
						return bg._startingEquipment || "\u2014";
					},
					_otherBenefit: {
						name: "Other Benefit",
						transform: (bg) => {
							if (!Array.isArray(bg.entries)) return "\u2014";
							const allEntries = flattenEntries(bg.entries);
							const toDisplay = allEntries.filter(e =>
								typeof e === "object"
								&& e.name
								&& otherBenefitAllow.includes(e.name.trim().toLowerCase())
							);
							if (!toDisplay.length) return "\u2014";
							return Renderer.get().render({
								type: "entries",
								entries: toDisplay,
							}, 1);
						},
						flex: 2,
					}
				},
			},

			dataProps: ["background"],
		});
	}



	getListItem (bg, bgI, isExcluded) {
		this._pageFilter.mutateAndAddToFilters(bg, isExcluded);

		const eleLi = document.createElement("div");
		eleLi.className = `ve-lst__row ve-flex-col ${isExcluded ? "ve-lst__row--blocklisted" : ""}`;

		const name = bg.name.replace("Variant ", "");
		const hash = UrlUtil.autoEncodeHash(bg);
		const source = Parser.sourceJsonToAbv(bg.source);

		eleLi.innerHTML = `<a href="#${hash}" class="ve-lst__row-border ve-lst__row-inner">
			<span class="ve-bold ve-col-2-5 ve-pl-0 ve-pr-1">${name}</span>
			<span class="ve-col-3-5 ve-px-1 ${bg._slAbility === VeCt.STR_NONE ? "ve-italic" : ""}">${bg._slAbility}</span>
			<span class="ve-col-4 ve-px-1">${bg._skillDisplay}</span>
			<span class="ve-col-2 ve-text-center ${Parser.sourceJsonToSourceClassname(bg.source)}  ve-pl-1 ve-pr-0" title="${Parser.sourceJsonToFull(bg.source)}">${source}</span>
		</a>`;

		const listItem = new ListItem(
			bgI,
			eleLi,
			name,
			{
				hash,
				source,
				page: bg.page,
				ability: bg._slAbility,
				skills: bg._skillDisplay,
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
		this._pgContent.empty().appends(RenderBackgrounds.getRenderedBackground(ent));
	}
}

const backgroundsPage = new BackgroundPage();
backgroundsPage.sublistManager = new BackgroundSublistManager();
window.addEventListener("load", () => backgroundsPage.pOnLoad());

globalThis.dbg_page = backgroundsPage;

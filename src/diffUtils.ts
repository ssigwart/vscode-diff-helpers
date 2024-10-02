import { TextDocument } from "vscode";
import { getUriForFilename } from "./fileUtils";
import { UserSelectedInputType } from "./userInput";

export interface DiffLineProvider {
	getLineCount(): number;
	getLine(lineNum: number): string;
};

export class EditorDocumentDiffLineProvider
{
	readonly doc: TextDocument;
	constructor(doc: TextDocument)
	{
		this.doc = doc;
	}

	getLineCount(): number
	{
		return this.doc.lineCount;
	}

	getLine(lineNum: number): string
	{
		return this.doc.lineAt(lineNum).text;
	}
}

export class StringBasedDiffLineProvider
{
	readonly lines: string[] = [];
	constructor(diff: string)
	{
		this.lines = diff.split(/\r|\r?\n/);
	}

	getLineCount(): number
	{
		return this.lines.length;
	}

	getLine(lineNum: number): string
	{
		return lineNum < this.lines.length ? this.lines[lineNum] : "";
	}
}

/**
 * Build search result for diff
 *
 * @param {DiffLineProvider} diffLineProvider Diff line provider
 * @param {string|undefined} workspaceBaseFsPath Workspace base filesystem path
 * @param {UserSelectedInputType} userSelectedInputType User selected input type
 * @param {string|undefined} customSearch Custom search
 *
 * @return {Promise<string>} Search result
 */
export async function buildSearchResultForDiff(diffLineProvider: DiffLineProvider, workspaceBaseFsPath: string|undefined, userSelectedInputType: UserSelectedInputType, customSearch: string|undefined): Promise<string>
{
	// Build search result content
	let numMatches = 0;
	let numMatchingFiles = 0;
	let searchResultContent = "";
	let lastFilename = "";
	let lastMatchingFilename = "";
	let currentFilenameLineNum = -1;
	const hunkInfoRegex = /^@@ -[0-9]+,[0-9]+ \+([0-9]+),[0-9]+ @@/;
	let hunkInfo = null;

	if (userSelectedInputType === UserSelectedInputType.CustomSearch && customSearch !== undefined)
		customSearch = customSearch.toLowerCase();

	const lineCount = diffLineProvider.getLineCount();
	for (let lineNum = 0; lineNum < lineCount; lineNum++)
	{
		const line = diffLineProvider.getLine(lineNum);

		// Check if this is a new file
		if (line.startsWith("+++ "))
		{
			// Expect old file to start with a/ and the new one to start with b/, which git uses.
			// For general diffs, this might not be true.
			// The following line probably works in either case, but one place it might not work is if the file path really does start with `b/`.
			lastFilename = line.replace(/[+]{3} (b\/)?/, "");
			currentFilenameLineNum = -1;
		}
		// Check if hunk info
		else if ((hunkInfo = hunkInfoRegex.exec(line)) !== null)
			currentFilenameLineNum = parseInt(hunkInfo[1]);
		// Make sure this is an addition
		else if (currentFilenameLineNum !== -1)
		{
			if (line.startsWith("+"))
			{
				// Check for match
				let isMatch = false;
				if (userSelectedInputType === UserSelectedInputType.WorkNeeded)
				{
					if (/todo/i.test(line))
						isMatch = true;
				}
				else if (userSelectedInputType === UserSelectedInputType.WorkNeededLessParens)
				{
					if (/todo/i.test(line) && !/todo[(][^()]+[)]/i.test(line))
						isMatch = true;
				}
				else if (userSelectedInputType === UserSelectedInputType.CustomSearch)
				{
					if (customSearch !== undefined && line.toLowerCase().includes(customSearch))
						isMatch = true;
				}
				else if (userSelectedInputType === UserSelectedInputType.CustomSearchCaseSensitive)
				{
					if (customSearch !== undefined && line.includes(customSearch))
						isMatch = true;
				}

				// Is it a match
				if (isMatch)
				{
					// Add filename line
					if (lastFilename !== lastMatchingFilename)
					{
						numMatchingFiles++;
						if (searchResultContent !== "")
							searchResultContent += "\n";
						lastMatchingFilename = lastFilename;
						const targetUri = await getUriForFilename(lastFilename, workspaceBaseFsPath);
						if (targetUri !== undefined)
							searchResultContent += targetUri.fsPath + ":\n";
						else
							searchResultContent += lastFilename + ":\n";
					}

					// Add line. Start at index 1 to remove +
					numMatches++;
					searchResultContent += "  " + currentFilenameLineNum + ": " + line.substring(1) + "\n";
				}
			}

			// Update line number
			if (!line.startsWith("-"))
				currentFilenameLineNum++;
		}
	}

	// Build final search result
	searchResultContent = numMatches + " results - " + numMatchingFiles + " files\n\n" + searchResultContent;

	return searchResultContent;
};

import * as vscode from 'vscode';
import { getActiveWorkspaceFolder, getUriForFilename } from './fileUtils';
import { buildSearchResultForDiff, DiffLineProvider, EditorDocumentDiffLineProvider, StringBasedDiffLineProvider } from './diffUtils';
import { GitCli } from './git/gitCli';
import { GitCommandOutput } from './git/gitProvider';
import { determineUserSelectedInputType, getUserTextInput, UserSelectedInputType } from './userInput';

/**
 * Build git CLI
 *
 * @return {GitCli} Git CLI
 */
function buildGitCli(): GitCli
{
	return new GitCli(getActiveWorkspaceFolder()?.uri.fsPath ?? ".");
}

/**
 * Handle git cli search diff command
 *
 * @param {GitCommandOutput} diffResult Diff result
 */
async function handleGitCliSearchDiffCommand(diffResult: GitCommandOutput): Promise<void>
{
	if (!diffResult.success)
	{
		let msg = "Git request failed.";
		if (diffResult.errorMsg !== undefined)
			msg = diffResult.errorMsg;
		msg += "\n\n" + diffResult.stderr;
		vscode.window.showErrorMessage(msg);
	}
	else
		openSearchResultForDiff(new StringBasedDiffLineProvider(diffResult.stdout));
}

/**
 * Open search result for diff
 *
 * @param {DiffLineProvider} diffLineProvider Diff line provider
 */
async function openSearchResultForDiff(diffLineProvider: DiffLineProvider): Promise<void>
{
	const workspaceBaseFsPath = getActiveWorkspaceFolder()?.uri.fsPath;

	// Check what search we should do
	let customSearch: string|undefined = undefined;
	const userSelectedInputType = await determineUserSelectedInputType();
	if (userSelectedInputType === undefined)
		return;
	if (userSelectedInputType === UserSelectedInputType.CustomSearchCaseSensitive)
	{
		customSearch = await getUserTextInput("Enter search string (case sensitive)");
		if (customSearch === undefined)
			return;
	}
	else if (userSelectedInputType === UserSelectedInputType.CustomSearch)
	{
		customSearch = await getUserTextInput("Enter search string");
		if (customSearch === undefined)
			return;
	}

	let searchResultContent = await buildSearchResultForDiff(diffLineProvider, workspaceBaseFsPath, userSelectedInputType, customSearch);
	// Open search result
	let searchResultDoc = await vscode.workspace.openTextDocument({
		language: "search-result",
		content: searchResultContent
	});
	vscode.commands.executeCommand<vscode.TextDocumentShowOptions>("vscode.open", searchResultDoc.uri);
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('diff-helpers.searchDiff', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor !== undefined)
			openSearchResultForDiff(new EditorDocumentDiffLineProvider(editor.document));
	}));

	context.subscriptions.push(vscode.commands.registerCommand('diff-helpers.searchGitDiff', async () => {
		const gitCli = buildGitCli();
		handleGitCliSearchDiffCommand(await gitCli.diff());
	}));

	context.subscriptions.push(vscode.commands.registerCommand('diff-helpers.searchGitCachedDiff', async () => {
		const gitCli = buildGitCli();
		handleGitCliSearchDiffCommand(await gitCli.cachedDiff());
	}));

	context.subscriptions.push(vscode.commands.registerCommand('diff-helpers.searchBranchDiff', async () => {
		const gitCli = buildGitCli();
		try {
			const mainBranchName = await gitCli.getMainBranchName();
			handleGitCliSearchDiffCommand(await gitCli.diffBranches(mainBranchName, "HEAD"));
		} catch (e) {
			vscode.window.showErrorMessage("Failed to generate git diff.");
			console.error(e);
		}
	}));

	// Set up diff links
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({language: "diff"}, {
		provideDefinition: async function(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.LocationLink[]> {
			const rtn: vscode.LocationLink[] = [];

			// Get line
			const lineNum = position.line;
			const line = document.lineAt(lineNum);

			// Make sure this is an addition
			if (line.text.startsWith("+"))
			{
				const workspaceBaseFsPath = getActiveWorkspaceFolder()?.uri.fsPath;

				// Find target URI and line number. Use > 0 because we expect a filename above the hunk line info
				let offsetNumLines = 0;
				for (let loopLineNum = lineNum - 1; loopLineNum > 0; loopLineNum--)
				{
					const loopLine = document.lineAt(loopLineNum);
					const hunkInfo = /^@@ -[0-9]+,[0-9]+ \+([0-9]+),[0-9]+ @@/.exec(loopLine.text);
					if (hunkInfo !== null)
					{
						// Check for filename
						const filenameLine = document.lineAt(loopLineNum - 1);
						const filenameMatch = /^[+]{3} b\/([^\s]+)/.exec(filenameLine.text);
						if (filenameMatch !== null)
						{
							// Get filename and try to find it in the project
							let filename = filenameMatch[1];
							const targetUri = await getUriForFilename(filename, workspaceBaseFsPath);
							if (targetUri === undefined)
								vscode.window.showErrorMessage("Failed to find file `" + filename + "`.");
							else
							{
								// Build target link
								let targetLineNum = parseInt(hunkInfo[1]) - 1 + offsetNumLines;
								let targetRange = new vscode.Range(targetLineNum, 0, targetLineNum, line.range.end.character);
								const targetCharIdx = position.character - 1; // Subtract 1 to account for + at beginning of line
								let targetSelectionRange = new vscode.Range(targetLineNum, targetCharIdx, targetLineNum, targetCharIdx);
								rtn.push({
									originSelectionRange: line.range,
									targetUri: targetUri,
									targetRange: targetRange,
									targetSelectionRange: targetSelectionRange
								});
							}
						}

						break;
					}
					// Update offset
					if (!loopLine.text.startsWith("-"))
						offsetNumLines++;
				}
			}

			return rtn;
		},
	}));
}

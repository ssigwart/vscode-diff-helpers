import { workspace, Uri, WorkspaceFolder, window } from "vscode";

/**
 * Get uri for filename
 *
 * @param {string} filename Filename
 * @param {string|undefined} primaryPossibleBaseFsPath Primary possible base filesystem path
 *
 * @return {Uri|undefined} URI if found
 */
export async function getUriForFilename(filename: string, primaryPossibleBaseFsPath: string|undefined): Promise<Uri|undefined>
{
	// Check primary base filesystem path
	if (primaryPossibleBaseFsPath !== undefined)
	{
		const possibleFileUri = Uri.joinPath(Uri.file(primaryPossibleBaseFsPath), filename);
		try {
			const fileInfo = await workspace.fs.stat(possibleFileUri);
			return possibleFileUri;
		} catch (e) {
			// File probably wasn't found
		}
	}

	// Check each workplace folder
	const workspaceFolders = workspace.workspaceFolders ?? [];
	for (let folder of workspaceFolders)
	{
		const possibleFileUri = Uri.joinPath(folder.uri, filename);
		try {
			const fileInfo = await workspace.fs.stat(possibleFileUri);
			return possibleFileUri;
		} catch (e) {
			// File probably wasn't found
		}
	}

	// Check if it's a full path
	const possibleFileUri = Uri.file(filename);
	try {
		const fileInfo = await workspace.fs.stat(possibleFileUri);
		return possibleFileUri;
	} catch (e) {
		// File probably wasn't found
	}

	return undefined;
}

/**
 * Get active workspace folder
 *
 * @return {WorkspaceFolder|undefined} Active workspace folder
 */
export function getActiveWorkspaceFolder(): WorkspaceFolder|undefined
{
	const workspaceFolders = workspace.workspaceFolders;
	if (workspaceFolders !== undefined)
	{
		const activeFileFsPath = window.activeTextEditor?.document.uri.fsPath;
		if (activeFileFsPath !== undefined)
		{
			for (let workspaceFolder of workspaceFolders)
			{
				if (activeFileFsPath.startsWith(workspaceFolder.uri.fsPath))
					return workspaceFolder;
			}
		}

		// Return first workspace
		if (workspaceFolders.length > 0)
			return workspaceFolders[0];
	}

	return undefined;
}

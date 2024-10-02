import { QuickPickItem, window } from "vscode";

export enum UserSelectedInputType {
	WorkNeeded,
	WorkNeededLessParens,
	CustomSearch,
	CustomSearchCaseSensitive,
}

interface UserSelectedInputTypeOption extends QuickPickItem {
	userSelectedInputType: UserSelectedInputType;
}

/**
 * Determine user selected input type
 *
 * @return {Promise<UserSelectedInputType|undefined>} Selected input type
 */
export async function determineUserSelectedInputType(): Promise<UserSelectedInputType|undefined>
{
	const searchTypes: UserSelectedInputTypeOption[] = [
		{
			userSelectedInputType: UserSelectedInputType.WorkNeeded,
			label: "All instances of “TO" + "DO”."
		},
		{
			userSelectedInputType: UserSelectedInputType.WorkNeededLessParens,
			label: "All instances of “TO" + "DO” except those in format “TO" + "DO(SomeTag)”."
		},
		{
			userSelectedInputType: UserSelectedInputType.CustomSearch,
			label: "Custom search."
		},
		{
			userSelectedInputType: UserSelectedInputType.CustomSearchCaseSensitive,
			label: "Custom search (case sensitive)."
		}
	];
	const result = await window.showQuickPick(searchTypes, {
		placeHolder: "Search type"
	});

	return result?.userSelectedInputType;
}

/**
 * Get user text input
 *
 * @param {string} placeholderText Placeholder text
 *
 * @return {Promise<string|undefined>} Search text
 */
export async function getUserTextInput(placeholderText: string): Promise<string|undefined> {
	const result = await window.showInputBox({
		placeHolder: placeholderText
	});
	return result;
}

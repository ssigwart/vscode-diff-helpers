export interface GitCommandOutput {
	success: boolean,
	stdout: string,
	stderr: string,
	errorMsg?: string
};

export interface GitProvider {
	getMainBranchName(): Promise<string>;
	diff(): Promise<GitCommandOutput>;
	cachedDiff(): Promise<GitCommandOutput>;
	diffBranches(baseBranch: string, branch: string): Promise<GitCommandOutput>;
};

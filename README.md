This extension provides utilities for dealing with `diff` files and `git` diffs in particular.
The extension currently works for the unified diff format.

## Features

- Quick links for `diff` file.
	- Cmd+Click (or use F12) a line to go to the line.
- Search git diff.
	- Select from one of multiple commands to search added lines in a diff:
		- Search in `git diff` (`diff-helpers.searchGitDiff` command)
		- Search in `git diff --cached` (`diff-helpers.searchGitCachedDiff` command)
		- Search in changes between a branch and the `main` (or `master`) branch (`diff-helpers.searchBranchDiff` command)
- Search a `diff` file (`diff-helpers.searchDiff` command)
	- If you have a `.diff` file open, you can search added lines in a diff.

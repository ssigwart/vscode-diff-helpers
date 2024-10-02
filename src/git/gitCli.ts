import { spawn, exec, ExecException } from "child_process";
import { GitCommandOutput } from "./gitProvider";

interface GitCommandResult {
	err: Error | null,
	stdout: string,
	stderr: string
};

/**
 * Execute git cmd
 *
 * @param {string} cwd Cwd
 * @param {string} cmd Cmd
 * @param {string[]} args Args
 *
 * @return {Promise<GitCommandResult>} Command result
 */
async function executeGitCmd(cwd: string, cmd: string, args: string[]): Promise<GitCommandResult>
{
	return new Promise(function(resolve) {
		const child = spawn(cmd, args, {
			cwd: cwd
		});
		let didResolve = false;

		let stdout = "";
		child.stdout.on("data", (data) => {
			stdout += data;
		});

		let stderr = "";
		child.stderr.on("data", (data) => {
			stderr += data;
		});

		child.on("error", function(e: Error) {
			if (!didResolve)
			{
				didResolve = true;
				resolve({
					err: e,
					stdout: stdout,
					stderr: stderr
				});
			}
		});

		child.on("close", (code) => {
			if (!didResolve)
			{
				didResolve = true;
				if (code !== 0)
				{
					resolve({
						err: new Error("Exited with code " + code),
						stdout: stdout,
						stderr: stderr
					});
				}
				else
				{
					resolve({
						err: null,
						stdout: stdout,
						stderr: stderr
					});
				}
			}
		});
	});
}

/**
 * Execute git cmd and return output
 *
 * @param {string} cwd Cwd
 * @param {string} cmd Cmd
 * @param {string[]} args Args
 *
 * @return {Promise<GitCommandOutput>} Command output
 */
async function executeGitCmdAndReturnOutput(cwd: string, cmd: string, args: string[]): Promise<GitCommandOutput>
{
	const result = await executeGitCmd(cwd, cmd, args);
	if ((result.err === null))
	{
		return {
			success: true,
			stdout: result.stdout,
			stderr: result.stderr
		};
	}
	return {
		success: false,
		stdout: result.stdout,
		stderr: result.stderr,
		errorMsg: "Git request failed: " + result.err.message
	};
}

export class GitCli {
	private cwd: string;

	constructor(cwd: string) {
		this.cwd = cwd;
	};

	getMainBranchName(): Promise<string>
	{
		const that = this;
		const cmd = "(git symbolic-ref refs/remotes/origin/HEAD | sed -e 's@^refs/remotes/origin/@@') || (git show-ref refs/heads/master > /dev/null && echo 'master') || (git show-ref refs/heads/main > /dev/null && echo 'main')";
		return new Promise(function(resolve, reject) {
			exec(cmd, {
				cwd: that.cwd
			}, async function(err: ExecException | null, stdout: string, stderr: string): Promise<void> {
				if (err)
					reject(err);
				else
				{
					stdout = stdout.trimEnd();
					if (stdout === "")
						reject("Main branch not found.");
					else
						resolve(stdout);
				}
			});
		});
	}

	diff(): Promise<GitCommandOutput>
	{
		return executeGitCmdAndReturnOutput(this.cwd, "git", ["diff"]);
	}

	cachedDiff(): Promise<GitCommandOutput>
	{
		return executeGitCmdAndReturnOutput(this.cwd, "git", ["diff", "--cached"]);
	}

	diffBranches(baseBranch: string, branch: string): Promise<GitCommandOutput>
	{
		return executeGitCmdAndReturnOutput(this.cwd, "git", ["diff", "--merge-base", baseBranch, branch]);
	}
};

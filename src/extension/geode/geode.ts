import { execSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { JsonObject, JsonProperty, JsonSerializer } from "typescript-json-serializer";
import { OutputChannel, window } from "vscode";
import { getOptions, refreshOptions, updateOption } from "../options";
import { lookup, kill, Program, Query } from 'ps-node';

export namespace geode {
	export interface Installation {
		path: string;
		executable: string;
		nightly: boolean;
	}

	@JsonObject()
	export class ConfigJson {
		@JsonProperty({ name: 'working-installation' })
		workingInstallation: number = 0;
		@JsonProperty()
		installations: Installation[] = [];
	}

	let configJson: ConfigJson | null = null;

	export function setupConfig() {
		refreshOptions();
		
		if (!getOptions().geodeSuitePath) {
			const env = process.env.GEODE_SUITE as string;
			if (env && existsSync(env)) {
				updateOption('geodeSuitePath', env);
				window.showInformationMessage('Geode: Automatically detected Suite path :)');
			}
		}
		const path = `${getOptions().geodeSuitePath}/../config.json`;
		if (existsSync(path)) {
			configJson = new JsonSerializer().deserializeObject(
				JSON.parse(readFileSync(path).toString()),
				ConfigJson
			) ?? null;
		}
	}

	export function getConfig() {
		return configJson;
	}

	export function getWorkingInstallation(): Installation | undefined {
		return configJson?.installations[configJson.workingInstallation];
	}

	export function isSuiteInstalled(): boolean {
		return existsSync(getOptions().geodeSuitePath ?? "");
	}

	export function runCliCmd(cmd: string) {
		return execSync(`${getOptions().geodeSuitePath}/../bin/geode.exe ${cmd}`).toString();
	}

	export async function launchGD(channel: OutputChannel | undefined = undefined) {
		channel?.append('Launching Geometry Dash... ');
		try {
			channel?.appendLine('done');
			const inst = getWorkingInstallation();
			if (inst) {
				spawn(join(inst.path, inst.executable), { cwd: inst.path });
			}
			return true;
		} catch(e) {
			channel?.appendLine(`error: ${e}`);
			return false;
		}
	}

	function lookupAsync(query: Query): Promise<Program[]> {
		return new Promise((resolve, reject) => {
			lookup(query, (e, programs) => {
				if (e) {
					reject(e);
				}
				resolve(programs);
			});
		});
	}

	function killAsync(pid: string | number): Promise<void> {
		return new Promise((resolve, reject) => {
			kill(pid, { 
				signal: 'SIGKILL',
				timeout: 10,
			}, e => {
				if (e) {
					reject(e);
				}
				resolve();
			});
		});
	}

	export async function closeGD(channel: OutputChannel | undefined = undefined) {
		const inst = getWorkingInstallation();
		if (inst) {
			channel?.append('Closing Geometry Dash... ');
			try {
				const programs = await lookupAsync({
					command: inst.executable
				});
				if (programs.length > 1) {
					throw new Error(`Multiple programs with name ${inst.executable} open`);
				}
				if (programs.length) {
					await killAsync(programs[0].pid);
				}
				channel?.appendLine('done');
				return true;
			} catch(e) {
				channel?.appendLine(`error: ${e}`);
				return false;
			}
		}
		return true;
	}
}


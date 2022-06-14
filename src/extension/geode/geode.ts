import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { JsonObject, JsonProperty, JsonSerializer } from "typescript-json-serializer";
import { window } from "vscode";
import { getOptions, refreshOptions, updateOption } from "../options";

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

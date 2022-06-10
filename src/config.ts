import { workspace } from 'vscode';
import { JsonObject, JsonProperty, JsonSerializer } from 'typescript-json-serializer';
import { readFileSync } from 'fs';

export interface Options {
    geodeSuitePath: string;
    workingInstallation: number;
    spriteSearchDirectories: string[];
}

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

const opt: Options = workspace.getConfiguration('geode-support') as any;
const config = new JsonSerializer().deserializeObject(
    JSON.parse(readFileSync(`${getOptions().geodeSuitePath}/../config.json`).toString()),
    ConfigJson
) ?? null;

export function getOptions(): Options {
    return opt;
}

export function updateOption(option: string, value: any) {
    workspace.getConfiguration('geode-support').update(option, value);
}

export function getConfigJson(): ConfigJson | null {
    return config;
}

export function getWorkingInstallation(): Installation | undefined {
	return getConfigJson()?.installations[getConfigJson()?.workingInstallation ?? 0];
}

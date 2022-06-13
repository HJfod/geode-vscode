import { workspace, window } from 'vscode';
import { JsonObject, JsonProperty, JsonSerializer } from 'typescript-json-serializer';
import { existsSync, readFileSync } from 'fs';

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

export interface Options {
    geodeSuitePath: string;
    workingInstallation: number;
    databaseShowFavoritesByDefault: boolean,
    spriteSearchDirectories: string[];
}

let opt: Options = {
    geodeSuitePath: "",
    workingInstallation: 0,
    databaseShowFavoritesByDefault: true,
    spriteSearchDirectories: [],
};

export function refreshOptions() {
    const config = workspace.getConfiguration('geode-support');
    opt.geodeSuitePath = config.get('geodeSuitePath') as string;
    opt.workingInstallation = config.get('workingInstallation') as number;
    opt.databaseShowFavoritesByDefault = config.get('databaseShowFavoritesByDefault') as boolean;
    opt.spriteSearchDirectories = config.get('spriteSearchDirectories') as string[];
}

export function updateOption(option: string, value: any) {
    workspace.getConfiguration('geode-support').update(option, value);
    refreshOptions();
}

export function getOptions() {
    return opt;
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

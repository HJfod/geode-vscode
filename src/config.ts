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

export class Options {
    private static instance = new Options();

    public geodeSuitePath: string = "";
    public workingInstallation: number = 0;
    public spriteSearchDirectories: string[] = [];

    private constructor() {
        this.refresh();
    }

    private refresh() {
        const config = workspace.getConfiguration('geode-support');
        this.geodeSuitePath = config.get('geodeSuitePath') as string;
        this.workingInstallation = config.get('workingInstallation') as number;
        this.spriteSearchDirectories = config.get('spriteSearchDirectories') as string[];
    }

    public update(option: string, value: any) {
        workspace.getConfiguration('geode-support').update(option, value);
        this.refresh();
    }

    public static get() {
        return Options.instance;
    }
}

let config: ConfigJson | null = null;

export function loadConfigJson() {
    const path = `${Options.get().geodeSuitePath}/../config.json`;
    if (existsSync(path)) {
        config = new JsonSerializer().deserializeObject(
            JSON.parse(readFileSync(path).toString()),
            ConfigJson
        ) ?? null;
    }
	const env = process.env.GEODE_SUITE as string;
	if (env && existsSync(env)) {
		Options.get().update('geodeSuitePath', env);
		window.showInformationMessage('Geode: Automatically detected Suite path :)');
	}
}

export function getConfigJson(): ConfigJson | null {
    return config;
}

export function getWorkingInstallation(): Installation | undefined {
	return getConfigJson()?.installations[getConfigJson()?.workingInstallation ?? 0];
}

import { workspace } from 'vscode';

export interface Options {
	geodeSdkPath: string;
	geodeCliPath: string;
	workingInstallation: number;
	databaseShowFavoritesByDefault: boolean,
	spriteSearchDirectories: string[],
	textureQuality: string,
}

let opt: Options = {
	geodeSdkPath: "",
	geodeCliPath: "",
	workingInstallation: 0,
	databaseShowFavoritesByDefault: true,
	spriteSearchDirectories: [],
	textureQuality: ""
};

export function refreshOptions() {
	const config = workspace.getConfiguration('geode-support');
	opt.geodeSdkPath = config.get('geodeSdkPath') as string;
	opt.geodeCliPath = config.get('geodeCliPath') as string;
	opt.workingInstallation = config.get('workingInstallation') as number;
	opt.databaseShowFavoritesByDefault = config.get('databaseShowFavoritesByDefault') as boolean;
	opt.spriteSearchDirectories = config.get('spriteSearchDirectories') as string[];
	opt.textureQuality = config.get('textureQuality') as string;
}

export function updateOption(option: string, value: any) {
	workspace.getConfiguration('geode-support').update(option, value);
	refreshOptions();
}

export function getOptions() {
	return opt;
}

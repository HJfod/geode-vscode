import { workspace } from 'vscode';

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

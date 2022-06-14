import { window, commands, languages, ExtensionContext } from 'vscode';
import { spawn } from 'child_process';
import { join } from 'path';
import { getOptions } from './options';
import { setupConfig, getWorkingInstallation, getConfig } from './geode/geode';
import { refreshSpriteDatabase } from './database/SpriteDatabase';
import { loadData, saveData, setContext } from './save';
import { buildDatabasePanel } from './database/databaseWebView';
import { createClassWalkthrough } from './source/snippet';
import { isSuiteInstalled, runCliCmd } from './geode/geode';

export function activate(context: ExtensionContext) {
	// save context to global variable
	setContext(context);

	// try to load save data
	loadData();

	console.log('Geode Support loaded :-)');

	// load user variables
	setupConfig();

	console.log('Loaded config.json');

	// check if Geode Suite is installed
	if (!isSuiteInstalled()) {
		window.showErrorMessage(
			'Geode Suite path is not set! Please set ' +
			'\'geode-support.geodeSuitePath\' in user settings.'
		);
	}
	
	console.log('Checked suite');

	// create output window
	const channel = window.createOutputChannel('Geode');

	channel.appendLine(`Geode Suite location: ${getOptions().geodeSuitePath}`);
	channel.appendLine(`Geode CLI version: ${runCliCmd('--version')}`);
	
	console.log('Refreshing sprite database');

	// load sprites
	refreshSpriteDatabase(channel);

	console.log('Registering functions');

	// register commands
	context.subscriptions.push(commands.registerCommand('geode-support.launchGD', () => {
		if (!isSuiteInstalled()) {
			window.showErrorMessage(
				'Geode Suite path is not set! Please set ' +
				'\'geode-support.geodeSuitePath\' in user settings.'
			);
			return;
		}
		channel.append('Launching Geometry Dash... ');
		try {
			const inst = getWorkingInstallation();
			if (inst) {
				spawn(join(inst.path, inst.executable), { cwd: inst.path });
			}
			channel.appendLine('done');
		} catch(e) {
			channel.append('\n');
			channel.appendLine(`Error launching GD: ${e}`);
		}
	}));

	context.subscriptions.push(commands.registerCommand('geode-support.selectInstallation', () => {
		if (!isSuiteInstalled()) {
			window.showErrorMessage(
				'Geode Suite path is not set! Please set ' +
				'\'geode-support.geodeSuitePath\' in user settings.'
			);
			return;
		}
		window.showQuickPick(
			getConfig()?.installations.map((s, ix) => {
				return {
					label: join(s.path, s.executable),
					description: s.nightly ? 'Nightly' : 'Stable',
					command: ix
				};
			}) ?? []
		).then(inst => {
			if (inst) {
				try {
					channel.appendLine(`Set installation: ${runCliCmd(`config --cwi ${inst?.command}`)}`);
				} catch(e) {
					channel.appendLine(`Error setting installation: ${e}`);
				}
			}
		});
	}));

	context.subscriptions.push(commands.registerCommand('geode-support.browseSpriteDatabase', () => {
		buildDatabasePanel(context);
	}));

	context.subscriptions.push(commands.registerCommand('geode-support.createClass', () => {
		createClassWalkthrough();
	}));

	// register intellisense
	context.subscriptions.push(languages.registerCompletionItemProvider(
		{
			scheme: "file",
			language: "cpp"
		},
		{
			provideCompletionItems() {
				// todo
				return [];
			}
		}
	));

	console.log('Geode Support done :-)');
}

export function deactivate() {
	saveData();
}

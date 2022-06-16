import { window, commands, languages, ExtensionContext, extensions } from 'vscode';
import { join } from 'path';
import { getOptions } from './options';
import { geode } from './geode/geode';
import { refreshSpriteDatabase } from './database/SpriteDatabase';
import { loadData, saveData, setContext } from './save';
import { buildDatabasePanel } from './database/databaseWebView';
import { createClassWalkthrough } from './source/snippet';

export function activate(context: ExtensionContext) {
	// save context to global variable
	setContext(context);

	// try to load save data
	loadData();

	console.log('Geode Support loaded :-)');

	// load user variables
	geode.setupConfig();

	console.log('Loaded config.json');

	// check if Geode Suite is installed
	if (!geode.isSuiteInstalled()) {
		window.showErrorMessage(
			'Geode Suite path is not set! Please set ' +
			'\'geode-support.geodeSuitePath\' in user settings.'
		);
	}
	
	console.log('Checked suite');

	// create output window
	const channel = window.createOutputChannel('Geode');

	channel.appendLine(`Geode Suite location: ${getOptions().geodeSuitePath}`);
	channel.appendLine(`Geode CLI version: ${geode.runCliCmd('--version')}`);
	
	console.log('Refreshing sprite database');

	// load sprites
	refreshSpriteDatabase(channel);

	console.log('Registering functions');

	// register commands
	context.subscriptions.push(commands.registerCommand('geode-support.launchGD', () => {
		if (!geode.isSuiteInstalled()) {
			window.showErrorMessage(
				'Geode Suite path is not set! Please set ' +
				'\'geode-support.geodeSuitePath\' in user settings.'
			);
			return;
		}
		geode.launchGD(channel);
	}));

	context.subscriptions.push(commands.registerCommand('geode-support.selectInstallation', () => {
		if (!geode.isSuiteInstalled()) {
			window.showErrorMessage(
				'Geode Suite path is not set! Please set ' +
				'\'geode-support.geodeSuitePath\' in user settings.'
			);
			return;
		}
		window.showQuickPick(
			geode.getConfig()?.installations.map((s, ix) => {
				return {
					label: join(s.path, s.executable),
					description: s.nightly ? 'Nightly' : 'Stable',
					command: ix
				};
			}) ?? []
		).then(inst => {
			if (inst) {
				try {
					channel.appendLine(`Set installation: ${geode.runCliCmd(`config --cwi ${inst?.command}`)}`);
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

	context.subscriptions.push(commands.registerCommand('geode-support.buildAndLaunch', async () => {
		const cmake = extensions.getExtension('ms-vscode.cmake-tools');
		if (!cmake) {
			window.showErrorMessage(
				'CMake Tools extension is not installed! ' + 
				'Please install `ms-vscode.cmake-tools` to continue.'
			);
			return;
		}
		channel.show();
		if (!cmake.isActive) {
			channel.append('Activating CMake extension... ');
			await cmake.activate();
			channel.appendLine('done');
		}
		channel.append('Executing `cmake.build`... ');
		const code = await commands.executeCommand('cmake.build');
		if (code === 0) {
			channel.show();
			channel.appendLine('done');
			geode.launchGD(channel);
		} else {
			channel.appendLine(`error: build exited with code ${code}`);
		}
	}));

	const buildAndLaunch = window.createStatusBarItem();
	buildAndLaunch.text = '$(play) Build & Launch';
	buildAndLaunch.command = 'geode-support.buildAndLaunch';
	buildAndLaunch.show();
	context.subscriptions.push(buildAndLaunch);

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

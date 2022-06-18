
import { MetaItem } from '../types/types';
import { createLoadingCircle, getItemDatabase } from './item';
import { getSelectDatabase } from './list';
import "./database.scss";
 
let favorites: string[] = [];

export function getFavorites() {
	return favorites;
}

export function removeFavorite(fav: string) {
	favorites = favorites.filter(i => i !== fav);
}

// so for some reason InlineChunkHtmlPlugin in webpack 
// doesn't add `defer`... but also conveniently i already 
// have everything wrapped in a function anyway so just 
// do this lol
document.addEventListener("DOMContentLoaded", function() {
	const vscode = acquireVsCodeApi();
	const content = document.querySelector('main') as HTMLElement;
	const select = getSelectDatabase().create(
		document.getElementById('select-source') as HTMLButtonElement
	);
	const search = document.getElementById('search') as HTMLInputElement;
	const status = document.getElementById('status') as HTMLElement;

	// for performance, we only want to load 
	// sprites that are currently visible

	// luckily this thing exists which can 
	// check if a node is visible and lets us 
	// know when it becomes visible
	const observer = new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				getItemDatabase().itemByElement(entry.target)
					?.becameVisible(entry.isIntersecting);
			});
		}, {
			root: content,
			threshold: 0.1
		}
	);

	select.onChangeState(_ => {
		requestNewState();
	});

	search?.addEventListener('input', _ => {
		updateSearch();
	});

	document.addEventListener('mousedown', e => {
		getSelectDatabase().hideAll(e.target as Node);
	});

	function requestNewState() {
		// clear screen and add loading circle
		getItemDatabase().clear();
		content.querySelector('p')?.remove();
		const circle = createLoadingCircle(content);
		if (circle) {
			content.appendChild(circle);
		}
		status.innerHTML = 'Loading...';
		// get selected state
		vscode.postMessage({
			command: 'get-items',
			parts: select.value?.split('::'),
		});
	}

	function updateSearch() {
		status.innerHTML = `Found ${
			getItemDatabase().showByQuery(search.value)
		} results`;
	}

	function updateData(data: MetaItem[]) {
		getItemDatabase().clear();
		data.forEach(meta => {
			const item = getItemDatabase().create({
				meta: meta,
				favorite: favorites.some(f => f === meta.item.name),
				// idk if this is unsafe
				// the docs said to never pass vscode to global scope
				// but since all the items are allocated inside this 
				// globally scoped function, it shouldn't be passed 
				// i think?
				postMessage: vscode.postMessage,
			});
			observer.observe(item.element);
			content.appendChild(item.element);
		});
		content.querySelector('.loading-circle')?.remove();
		updateSearch();
	}

	// ipc listener
	window.addEventListener('message', e => {
		const message = e.data;
		switch (message.command) {
			case 'database': {
				favorites = message.favorites;

				select.setOptions(message.options);

				// update select value
				select.value = message.default;
				select.stateChanged();
			} break;

			case 'items': {
				updateData(message.items);
			} break;

			case 'image': {
				getItemDatabase().itemById(message.element)?.setImage(message.data);
			} break;
		}
	});

	// request data
	vscode.postMessage({ command: 'get-database' });

	// focus search input for mouseless computing
	search.focus();
});


import { Item } from '../types/types';
import { createLoadingCircle, getItemDatabase } from './item';
import "./database.scss";
 
let favorites: string[] = [];

export function getFavorites() {
	return favorites;
}

export function removeFavorite(fav: string) {
	favorites = favorites.filter(
		i => i !== fav
	);
}

// so for some reason InlineChunkHtmlPlugin in webpack 
// doesn't add `defer`... but also conveniently i already 
// have everything wrapped in a function anyway so just 
// do this lol
document.addEventListener("DOMContentLoaded", function() {

	const vscode = acquireVsCodeApi();
	const content = document.querySelector('main') as HTMLElement;
	const select = document.getElementById('select-source') as HTMLSelectElement;
	const search = document.getElementById('search') as HTMLInputElement;
	const searchCount = document.getElementById('search-count') as HTMLElement;

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

	select?.addEventListener('change', _ => {
		requestNewState();
	});

	search?.addEventListener('input', _ => {
		updateSearch();
	});

	document.addEventListener('click', _ => {
		document.querySelectorAll('#dropdown').forEach(
			dropdown => dropdown.classList.add('hidden')
		);
	});

	function requestNewState() {
		// clear screen and add loading circle
		getItemDatabase().clear();
		content.querySelector('p')?.remove();
		const circle = createLoadingCircle(content);
		if (circle) {
			content.appendChild(circle);
		}
		vscode.postMessage({
			command: 'get-items',
			parts: select.value.split('::'),
		});
	}

	function updateSearch() {
		searchCount.innerHTML = `Found ${
			getItemDatabase().showByQuery(search.value)
		} results`;
	}

	function updateData(data: Item[]) {
		getItemDatabase().clear();
		data.forEach(spr => {
			const item = getItemDatabase().create({
				item: spr,
				favorite: favorites.some(f => f === spr.name),
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
				// if i just assign `database = message.database` the 
				// resulting object has none of the functions...
				// i suspect vscode is doing JSON.stringify or smth 
				// when passing messages
				favorites = message.favorites;

				// update <select> value
				select.value = message.default;
				select.dispatchEvent(new Event('change'));
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

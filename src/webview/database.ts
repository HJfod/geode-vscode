
import { Sprite } from '../types/sprite';
import { createLoadingCircle, getItemDatabase, ItemType } from './item';

(function() {

    const vscode = acquireVsCodeApi();
    const content = document.querySelector('main') as HTMLElement;
    const select = document.getElementById('select-source') as HTMLSelectElement;
    const search = document.getElementById('search') as HTMLInputElement;
    const searchCount = document.getElementById('search-count') as HTMLElement;

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                getItemDatabase().itemByElement(entry.target)
                    ?.becameVisible(entry.isIntersecting, item => {
                        if (item.type === ItemType.font) {
                            vscode.postMessage({
                                command: 'load-font',
                                path: item.sprite.path,
                                element: item.id,
                                text: "Abc123"
                            });
                        } else {
                            vscode.postMessage({
                                command: 'load-image',
                                sprite: item.sprite,
                                element: item.id,
                            });
                        }
                    });
            });
        }, {
            root: content,
            threshold: 0.5
        }
    );

    select?.addEventListener('change', _ => {
        loadNewState();
    });

    search?.addEventListener('input', _ => {
        updateSearch();
    });

    function loadNewState() {
        getItemDatabase().clear();
        const circle = createLoadingCircle(content);
        if (circle) {
            content?.appendChild(circle);
        }
        if (select.value.startsWith('sheet:')) {
            vscode.postMessage({
                command: 'request-sheet',
                sheet: select.value.substring(6)
            });
        } else {
            vscode.postMessage({
                command: `request-${select.value}`
            });
        }
    }

    function updateSearch() {
        searchCount.innerHTML = `Found ${
            getItemDatabase().showByQuery(search.value)
        } sprites`;
    }

    function updateData(data: Sprite[]) {
        getItemDatabase().clear();
        content.querySelector('.loading-circle')?.remove();
        data.forEach(spr => {
            const item = getItemDatabase().create(spr);
            observer.observe(item.element);
            content.appendChild(item.element);
        });
        updateSearch();
    }

    window.addEventListener('message', e => {
        const message = e.data;
        switch (message.command) {
            case 'update': { 
                updateData(message.data);
            } break;

            case 'image': {
                getItemDatabase().itemById(message.element)?.setImage(message.data);
            } break;

            case 'font': {
                getItemDatabase().itemById(message.element)?.renderFont(message.data);
            } break;
        }
    });

    vscode.postMessage({
        command: "request-all"
    });

}());

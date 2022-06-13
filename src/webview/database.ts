
import { Sprite } from '../types/sprite';
import { SpriteDatabase } from '../types/SpriteDatabase';
import { createLoadingCircle, getFilename, getItemDatabase, ItemType } from './item';
 
(function() {

    const vscode = acquireVsCodeApi();
    const content = document.querySelector('main') as HTMLElement;
    const select = document.getElementById('select-source') as HTMLSelectElement;
    const search = document.getElementById('search') as HTMLInputElement;
    const searchCount = document.getElementById('search-count') as HTMLElement;

    const database = new SpriteDatabase;

    // for performance, we only want to load 
    // sprites that are currently visible

    // luckily this thing exists which can 
    // check if a node is visible and lets us 
    // know when it becomes visible
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
            threshold: 0.1
        }
    );

    select?.addEventListener('change', _ => {
        requestNewState();
    });

    search?.addEventListener('input', _ => {
        updateSearch();
    });

    function requestNewState() {
        // clear screen and add loading circle
        getItemDatabase().clear();
        content.querySelector('p')?.remove();
        const circle = createLoadingCircle(content);
        if (circle) {
            content.appendChild(circle);
        }
        // run this concurrently and shit
        try {
            const parts = select.value.split('::');
            switch (parts[0]) {
                case 'all': {
                    updateData(database.getAll());
                } break;

                case 'favorites': {
                    updateData(database.getFavorites());
                } break;

                case 'fonts': {
                    updateData(database.getAllFonts());
                } break;

                case 'sheets': {
                    updateData(database.getAllSheets());
                } break;

                case 'sprites': {
                    updateData(database.getAllSprites());
                } break;
            
                case 'sheet': {
                    const collection = database.collections.find(c => c.directory === parts[1]);
                    if (!collection) {
                        throw new Error(`Collection '${parts[1]}' not found`);
                    }
                    updateData(collection.sheets[parts[2]]);
                } break;

                case 'mod': {
                    updateData(database.getAllInMod(parts[1]));
                } break;
            }
        } catch(err) {
            content.querySelector('.loading-circle')?.remove();

            const errp = document.createElement('p');
            errp.innerHTML = `Error: ${err} :-(`;
            content.appendChild(errp);
        }
    }

    function updateSearch() {
        searchCount.innerHTML = `Found ${
            getItemDatabase().showByQuery(search.value)
        } sprites`;
    }

    function updateData(data: Sprite[]) {
        getItemDatabase().clear();
        data.forEach(spr => {
            const item = getItemDatabase().create({
                sprite: spr,
                favorite: database.favorites.some(f => f === spr.name),
                onUse: _ => {
                    vscode.postMessage({
                        command: 'use-value',
                        value: item.sprite.name
                    });
                },
                onFavorite: (_, fav) => {
                    if (fav) {
                        database.favorites.push(item.sprite.name);
                    } else {
                        database.favorites = database.favorites.filter(i => i !== item.sprite.name);
                    }
                    vscode.postMessage({
                        command: 'set-favorite',
                        name: item.sprite.name,
                        favorite: fav
                    });
                },
                onSheet: _ => {
                    select.value = "sheet:" + getFilename(item.sprite.path);
                    select.dispatchEvent(new Event('change'));
                },
                onInfo: _ => {
                    vscode.postMessage({
                        command: 'info',
                        sprite: item.sprite
                    });
                },
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
                database.collections = message.database.collections;
                database.favorites = message.database.favorites;

                // update <select> value
                select.value = message.default;
                select.dispatchEvent(new Event('change'));
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

}());

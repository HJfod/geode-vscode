
import { RenderedChars } from '../utils/font';
import { Sprite } from '../utils/sprite';

(function() {

    const vscode = acquireVsCodeApi();
    const content = document.querySelector('main') as HTMLElement;
    const select = document.getElementById('select-source') as HTMLSelectElement;
    const search = document.getElementById('search') as HTMLInputElement;
    const searchCount = document.getElementById('search-count') as HTMLElement;
    const fontTest = document.getElementById('font-test') as HTMLInputElement;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    fetchImage(entry.target);
                } else {
                    unloadImage(entry.target);
                }
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

    function createLoadingCircle(parent: Element | null) {
        if (!parent?.querySelector('.loading-circle')) {
            const circle = document.createElement('div');
            circle.classList.add('loading-circle');
            return circle;
        }
        return null;
    }

    function fetchImage(article: Element) {
        const circle = createLoadingCircle(article);
        if (circle) {
            article.insertBefore(circle, article.children[0]);
        }
        // is font
        if (article.getAttribute('id')?.endsWith('.fnt')) {
            vscode.postMessage({
                command: 'load-font',
                path: article.getAttribute('img-path'),
                element: article.getAttribute('id'),
                text: fontTest?.value
            });
        }
        // is image
        else {
            vscode.postMessage({
                command: 'load-image',
                path: article.getAttribute('img-path'),
                element: article.getAttribute('id'),
            });
        }
    }

    function unloadImage(article: Element) {
        const img = article.querySelector('img');
        if (img) {
            img.src = '';
        }
        article.querySelector('canvas')?.remove();
        article.querySelector(".loading-circle")?.remove();
    }

    function setImage(article: Element | null, data: string) {
        if (!article) {
            return;
        }
        const img = article.querySelector('img');
        if (img) {
            if (data) {
                img.src = `data:image/png;base64,${data}`;
            } else {
                img.src = 'invalid';
            }
        }
        article.querySelector(".loading-circle")?.remove();
    }

    function renderFont(article: Element | null, rendered: RenderedChars) {
        if (!article) {
            return;
        }
        const img = article.querySelector('img');
        if (!rendered) {
            if (img) {
                img.src = 'invalid';
            }
            article.querySelector(".loading-circle")?.remove();
            return;
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 150;
        canvas.height = 150;
        
        let posx = rendered.xoffset;
        rendered.chars.forEach(char => {
            const img = new Image(char.width, char.height);
            img.src = `data:image/png;base64,${char.data}`;
            ctx?.drawImage(img, posx, rendered.base);
            posx += char.xadvance;
        });
        if (img) {
            img.src = '';
        }
        article.insertBefore(canvas, article.children[0]);
        article.querySelector(".loading-circle")?.remove();
    }

    function loadNewState() {
        content.innerHTML = '';
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

    function filterSearch(name: string) {
        return name.replace(/\s/g, '').toLowerCase().includes(
            search.value.replace(/\s/g, '').toLowerCase()
        );
    }

    function updateSearch() {
        let show = 0;
        content.querySelectorAll('article').forEach(elem => {
            if (filterSearch(elem.id)) {
                elem.classList.remove('hidden');
                show++;
            } else {
                elem.classList.add('hidden');
            }
        });
        searchCount.innerHTML = `Found ${show} sprites`;
    }

    function getFilename(path: string) {
        return path.replace(/^.*[\\\/]/, '');
    }

    function updateData(data: Sprite[]) {
        content.innerHTML = '';
        data.forEach(spr => {
            const article = document.createElement('article');
            article.setAttribute('img-path', spr.path);
            article.setAttribute('id', spr.name);
            article.innerHTML = `
                <img>
                <p>${spr.name}</p>
                ${spr.path.endsWith('.plist') ? `
                    <p class="source">${getFilename(spr.path)}</p>
                ` : ''}
                <div>
                    <button>Use</button>
                    <button>★</button>
                </div>
            `;
            observer.observe(article);
            content.appendChild(article);
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
                setImage(document.getElementById(message.element), message.data);
            } break;

            case 'font': {
                renderFont(document.getElementById(message.element), message.data);
            } break;
        }
    });

    vscode.postMessage({
        command: "request-all"
    });

}());

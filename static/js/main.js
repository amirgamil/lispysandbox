const {
    Record,
    StoreOf,
    Component,
    ListOf,
} = window.Torus;

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

// only fire fn once it hasn't been called in delay ms
const bounce = (fn, delay) => {
    let to = null;
    return (...args) => {
        const bfn = () => fn(...args);
        clearTimeout(to);
        to = setTimeout(bfn, delay);
    }
}

//smallest unit of mutuable data
class Code extends Record { }

class SandBox extends Component {
    init(record, removeCallback) {;

        this.handleTitleInput = evt => this.handleInput("o", evt);
        this.handleBodyInput = evt => this.handleInput("b", evt);
		this.handleTagInput = this.handleTagInput.bind(this);
        this.removeCallback = removeCallback;
        this.show = this.show.bind(this);
		this.handleTagKeydown = this.handleTagKeydown.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleRemove = this.handleRemove.bind(this);
        this.save = this.save.bind(this);
        this.getResult = this.getResult.bind(this);
        this.bind(record, data => this.render(data));
    }

    show() {
        this.isCollapsed = false;
        this.render();
    }

    getResult() {
        this.save()
            .then(res => res.json())
            .then(data => {
                this.record.update({o: data})
            }).catch(exception => {
                //if this failed for one reason or another, show error eval
                this.record.update({o: "Error evaluating the expression!"})
            })
  
    }

    save() {
        return fetch("/code", {
            method: "POST",
            body: JSON.stringify(this.record.get("b"))
        });
    }

	handleTagInput(evt) {
		this.tagString = evt.target.value;
		this.render();
	}

    handleInput(prop, evt) {
        this.record.update({[prop]: evt.target.value});
    }

	handleTagKeydown(evt) {
		if (evt.key === 'Enter') {
			evt.target.blur();
			let tags = this.tagString.split('').join('').split('#');
			tags = tags.length > 1 ? tags.slice(1) : [];
			this.record.update({t: tags})
		}
	}
    handleKeydown(evt) {
        if (evt.key === 'Tab') {
            //stop what would have happened so we can artifically simulate tab
            evt.preventDefault();
            const idx = evt.target.selectionStart;
            if (idx != null) {
                const text = this.record.get("b").substring(0, idx) + "    " + this.record.get("b").substring(idx + 1);
                this.record.update({b: text});
            }
        } else if (evt.key === '(' || evt.key === '"' || evt.key === "'" || evt.key === "[") {
            evt.preventDefault();
            const idx = evt.target.selectionStart;
            var [leftAdd, rightAdd] = [evt.key, evt.key];
            if (leftAdd === '(') {
                rightAdd = ')';
            } else if (leftAdd == '[') {
                rightAdd = ']'
            }
            if (idx != null) {
                const text = this.record.get("b").substring(0, idx) + leftAdd + rightAdd + this.record.get("b").substring(idx);
                this.record.update({b: text});
                evt.target.setSelectionRange(idx + 1, idx + 1);
            }
        } else if (evt.key === 'Backspace') {
            const text = this.record.get("b");
            const idx = evt.target.selectionStart;
            if (idx != null && text.substring(idx - 1, idx+1) === "()" || text.substring(idx - 1, idx + 1) === "''" || text.substring(idx - 1, idx + 1) === '""' || text.substring(idx - 1, idx + 1) === '[]') {
                evt.preventDefault();
                const update = text.substring(0, idx - 1) + text.substring(idx+1)
                this.record.update({b: update})
                evt.target.setSelectionRange(idx - 1, idx - 1);
            }
        }
    }

    handleRemove() {
        this.removeCallback(this.record);
    }

    compose({b, o}) {
        return jdom`
                <div class = "block>
                    <div class="block-heading">
                        <h1 class = "title">
                            Lispy Sandbox
                        </h1>
                        <p> This is a sandbox to run <a href="https://github.com/amirgamil/lispy">Lispy</a>
                        code quickly and easily.
                        </p>
                    </div>
                    <div class="block-body">
                        <textarea class="thought"
                        placeholder="Write some code"
                        value="${b}"
                        onkeydown="${this.handleKeydown}"
                        oninput="${this.handleBodyInput}" />
                        <div class = "p-heights ${b.endsWith('\n') ? 'endline' : ''}">${b}</div>
                    </div>
                    <div class="output">
                        <pre class="code-output">
                        ${o}
                        </pre>
                        <button onclick=${this.getResult}>Run</button>
                    </div>
                </div>
                `
    }
}


class App extends Component {
    init() {
		
        const code = new Code({
            b: "",
            o: ""
        })

       	this.list  = new SandBox(code);
       	this.date = new Date();
       	this.save = bounce(this.save.bind(this), 800);
	   	this._loading = false;
	   	this._interval = setInterval(this.render.bind(this), 60 * 1000);

    }

    save() {
		if (this._lastSaved === new Date()) {
			return;
		}
		this._loading = true;
		this.render();
    }

    remove() {
        super.remove();
		clearInterval(this._interval);
    }

    compose() {
		const hour = new Date().getHours();
		if (hour > 19 || hour < 7) {
			document.body.classList.add('dark');
			document.documentElement.style.color = '#222';
		} else {
			document.body.classList.remove('dark');
			document.documentElement.style.color = '#fafafa';
		}
		return jdom
        `<main class="app" oninput="${this.save}">
            <header>
            </header>
            ${this.list.node}
            <footer>
                <p>
                    Built with love by
                    <a href = "https://amirbolous.com">
                        Amir</a>
                    inspired by 
                    <a href = "https://nightvale.dotink.co/">
                        Nightvale
                    </a>
                </p>
            </footer>
       </main>`;
    }
}

const app = new App();
document.body.appendChild(app.node);

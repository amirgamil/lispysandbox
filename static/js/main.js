const {
    Record,
    StoreOf,
    Component,
    ListOf,
    Router
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

class CodeStore extends StoreOf(Code) {
    fetch() {
        return fetch("/data")
            .then(r => r.json())
            .then(data => {
                //assign everything to blocks
                this.reset(data.map(code => new Code(code)));
            });
    }
}

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
        // this.save = this.save.bind(this);
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

    compose({h, d, b, o}) {
        document.body.classList.add("text");
        document.getElementsByClassName("text").innerHTML = d;
        return jdom`
                <div class = "block>
                    <div class="description">
                        <h4>${h}</h4>
                        <p innerHTML = ${d}>
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

class SandBoxList extends ListOf(SandBox) {
    compose() {
        return jdom`
        <div class="sandboxes">
            ${this.nodes}
        </div>
        `
    }
}


class App extends Component {
    init(router) {
        this.store = new CodeStore()
       	this.list  = new SandBoxList(this.store, (data) => this.store.remove(data));
        this.aboutActive = false;
       	this.date = new Date();
       	this.save = bounce(this.save.bind(this), 800);
	   	this._loading = true;
	   	this._interval = setInterval(this.render.bind(this), 60 * 1000);
        this.bind(router, ([name, params]) => {
            console.log(name);
            switch (name) {
                case "about": {
                    this.aboutActive = true;
                    this.render();
                    break;
                }
                default:
                    this.aboutActive = false;
                    this.store.fetch()
                               .then(() => {
                                    this.bind(this.store, this.save);
                                    this._loading = false;
                                    this.render();
                                });
                    this.render();
                    break;

            }
        })

    }

    save() {
		if (this._lastSaved === new Date()) {
			return;
		}
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
            <div class="row">
                    <h4><a class = "nav light hover-underline-animation" href = "https://github.com/amirgamil/lispy">Source</a></h4>
                    <div class = "line">
                    </div>
                    <h2>
                    <a class = "nav" href="/" style="font-weight: 700">Lispy</a>
                    </h2>
                    <div class= "line">
                    </div>
                    <h4><a class = "nav light hover-underline-animation" href = "/about">About</a></h4>
                </div>
            </header>
            ${this.aboutActive ? 
                (jdom`
                <div class="block-heading">
                <h3> What is Lispy? </h3>
                <p style="margin-top: -5px">
                <strong>Lispy</strong> is a programming language that is inspired by Scheme and Clojure. 
                It's a simple Lisp-dialect I built to better understand Lisp and, more generally, 
                functional programming.
                
                I kept a (relatively) detailed <a class = "link" href = "https://amirbolous.com/posts/pl">journal</a> 
                working on this project, which I hope is helpful for anyone interested in doing something
                similar.
                </p>

                <h3> What's this website? </h3>
                This website provides an interactive playground to learn about the language
                and run code!
                
                </p>
            </div>
            `): (jdom`
            <div class = "block-heading">
                <h3> A Breif Technical Tour </h3>
                <p style="margin-top: -5px">
                <strong>Lispy</strong> is written as a tree-walk interpreter in Go with a recursive-descent parser. 
                
                Because Lispy is interpreted, not compiled, it does not have a separate macro-expansion 
                stage (that would typically be done before code is evaluated). Instead, Lispy handles 
                macros as special functions, which it evaluates twice: once to generate the syntax of 
                the code, and the second to run this generated syntax (as a macro would).   
            </div>
            ${this._loading ? jdom`<p style="text-align:center">Loading...</p>`: null}
            ${this.list.node}
            <p>If you've made it this far, then please do check the <a class = "link" href = 'https://github.com/amirgamil/lispy'>source</a> where you can dig 
            into all of the details we missed here or reach out <a class = "link" href='https://twitter.com/amirbolous'>directly</a>!</p>`)}
            <footer>
                <p>
                    Built with love by
                    <a class = "link" href = "https://amirbolous.com">
                        Amir</a>
                    inspired by 
                    <a class = "link" href = "https://nightvale.dotink.co/">
                        Nightvale
                    </a>
                </p>
            </footer>
       </main>`;
    }
}


const router = new Router({
    about: "/about",
    default: "/",
})



const app = new App(router);
document.body.appendChild(app.node);

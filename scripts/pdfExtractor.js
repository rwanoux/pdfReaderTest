export default class PDFExtractor extends FormApplication {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "modules/pdfReaderTest/templates/extractor.hbs";
        options.width = 1550;
        options.height = 920;
        options.left = 80;
        options.title = "pdf extractor";
        options.resizable = true;
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        options.editable = true;
        return options;
    }

    constructor() {

        let data = super();
        return mergeObject(data, game.settings.get("pdfExtractor", "pdfExtractor"));


    }


    getData() {
        const data = game.settings.get("pdfExtractor", "pdfExtractor");

        return mergeObject(super.getData(), data);

    }

    async _updateObject(event, formData) {
        const data = {
            activePage: this.activePage,
            maxPage: this.maxPage,
            pdfUrl: this.pdfUrl,
            contents: this.contents,
            sizes: this.sizes,
            fonts: this.fonts
        };
        await game.settings.set('pdfExtractor', 'pdfExtractor', data);

    }
    async activateListeners(html) {






        let scanPage = html.find("#scanPage")[0];
        scanPage.addEventListener("click", this.scanPage.bind(this));
        let createBut = html.find("#createJournal")[0];
        createBut.addEventListener("click", this.createJournal.bind(this));

        let pageInput = html.find("#activePage")[0];
        pageInput.addEventListener("change", this.changePage.bind(this));
        let prevBut = html.find("#pdfPrevious")[0];
        prevBut.addEventListener("click", this.previous.bind(this));
        let nextBut = html.find("#pdfNext")[0];
        nextBut.addEventListener("click", this.nextPage.bind(this));

        let inputUrl = html.find("#pdfUrl")[0];
        inputUrl.addEventListener("change", this.setPdfUrl.bind(this));

        let textLayer = html.find("#text-layer")[0];
        textLayer.addEventListener("mouseup", this.getSelection.bind(this));



        super.activateListeners(html);

        //rendering pdf if already set
        if (this.pdfUrl) {
            await this.renderPdf(this.object.pdfUrl);
        }


    }

    getSelection(ev) {
        if (window.getSelection().toString().length > 0) {
            let cont = document.getElementById('htmlContent').append(window.getSelection());
        }


    }
    async createJournal(ev) {
        for (let i = 0; i < this.contents.length - 1; i++) {
            let cont = this.contents[i];

            if (cont.role == "chapter") {
                //if multi line chapter name : updating folder and journal with concat
                if (this.contents[i - 1]?.role == "chapter") {
                    console.log(this.contents[i - 1].str, cont)
                    let oldName = game.journal.filter(j => j.name.includes(this.contents[i - 1].str))[0].name;
                    let newName = oldName + " " + cont.str;

                    await game.journal.getName(oldName).update({
                        name: newName
                    });
                    await game.folders.getName(oldName).update({
                        name: newName
                    });
                }
                // else =>first line chapter label : creating journal and folder
                else {
                    let jFolder = ui.journal.folders.filter(f => f.name == cont.str)[0];
                    if (!jFolder) {
                        jFolder = await Folder.create({
                            name: cont.str,
                            type: "JournalEntry",
                            sort: i
                        });
                        let data = {
                            "name": cont.str,
                            "folder": jFolder.id
                        };
                        await JournalEntry.create(
                            data
                        );
                    }

                }
            }
            if (cont.role == "section") {
                let previousChapter = this.contents.filter(c => c.role == "chapter" && this.contents.indexOf(c) <= this.contents.indexOf(cont))
                let lastChapterName = game.folders.filter(f => f.name.includes(previousChapter[previousChapter.length - 1].str));
                console.log(lastChapterName);

            }
            if (cont.role == "paragraphe") {

            }

        }
    }
    async setPdfUrl(ev) {
        let obj = await game.settings.get("pdfExtractor", "pdfExtractor");
        obj.pdfUrl = document.getElementById('pdfUrl').value;
        this.pdfUrl = document.getElementById('pdfUrl').value;
        this.activePage = 1;
        document.getElementById('activePage').value = 1;
        this._updateObject();
        return this.renderPdf();

    }

    async changePage(ev) {
        ev.preventDefault();
        this.activePage = parseInt(ev.currentTarget.value);
        await this.renderPdf(this.pdfUrl);


    }
    nextPage(ev) {

        this.activePage++;
        document.getElementById('activePage').value = this.activePage;
        this.renderPdf(this.pdfUrl);
    }
    previous(ev) {
        this.activePage--;
        document.getElementById('activePage').value = this.activePage;
        this.renderPdf(this.pdfUrl);
    }

    async scanPage() {
        let obj = this;
        var loadingTask = await pdfjsLib.getDocument(this.pdfUrl);
        obj.fonts = {};
        obj.contents = [];
        obj.sizes = {};
        obj.pages = [];
        let responses = 0;
        let structure = [];


        loadingTask.promise.then(async function (pdf) {
            let maxPage = pdf.numPages;
            //getting textContent by pages
            for (var j = 0; j <= maxPage - 1; j++) {
                var page = await pdf.getPage(j + 1);
                obj.pages[j] = await page.getTextContent();
            }

            for (let i = 0; i < obj.pages.length; i++) {
                let p = obj.pages[i];
                for (let style in p.styles) {
                    if (!obj.fonts[style]) {
                        let s = p.styles[style];
                        obj.fonts[style] = s;
                    }
                }
                for (let it of p.items) {

                    //cleaning doubled

                    if (it.height != 0 && p.items[p.items.indexOf(it) - 1]?.str != it.str) {

                        // cleaning unknown charcode
                        it.str = it.str.replace(String.fromCharCode(65533), "");
                        it.numPage = i + 1;
                        obj.contents.push(it);
                        if (!obj.sizes[it.height.toString().replace(".", ",")]) {
                            obj.sizes[it.height.toString().replace(".", ",")] = {
                                tag: "truc"
                            };
                        }
                        //defining journals structure

                        //chapters
                        if ((it.height == 70 || it.height > 35) && it.str.length > 3) {
                            it.role = "chapter";
                        }
                        // section
                        if (it.height == 18 && !parseInt(it.str) && !it.str.toLowerCase().includes("chapitre")) {
                            it.role = "section";
                        }
                        if (it.height == 10 || it.height == 11 || (it.height > 39 && it.height < 41)) {
                            it.role = "paragraphe";
                        }
                        if (it.height == 16) {
                            it.role = "encardLabel";
                        }
                        if (it.height == 15 || it.height == 14 || it.height == 12 || it.height == 9.8) {
                            it.role = "subtitle";
                        }

                    }


                }
                let cleanContents = obj.contents.filter((ele, pos) => obj.contents.indexOf(ele) == pos);


                if (i == obj.pages.length - 1) {
                    let data = {
                        fonts: obj.fonts,
                        sizes: obj.sizes,
                        contents: obj.contents,

                    };
                    await game.settings.set("pdfExtractor", "pdfExtractor", mergeObject(game.settings.get("pdfExtractor", "pdfExtractor"), data));

                }
            }

            structure.forEach(t => { console.log(t); });
        }).then(this._updateObject()).then(this.render()).then(console.log("______________scan done_______"));


    }



    async renderPdf() {
        let activePage = this.activePage || 1;
        let maxPage = 0;
        var loadingTask = pdfjsLib.getDocument(this.pdfUrl);
        await loadingTask.promise.then(async function (pdf) {
            maxPage = pdf.numPages;

            pdf.getPage(activePage).then(async function (page) {
                // you var scale = 1.5;
                var viewport = page.getViewport({ scale: 0.9 });
                // Support HiDPI-screens.
                var outputScale = window.devicePixelRatio || 1;

                var canvas = document.getElementById('pdf-canvas');
                var context = canvas.getContext('2d');

                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                canvas.style.width = Math.floor(viewport.width) + "px";
                canvas.style.height = Math.floor(viewport.height) + "px";

                var transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] :
                    null;

                var renderContext = {
                    canvasContext: context,
                    transform: transform,
                    viewport: viewport
                };
                await page.render(renderContext);
                let textContent = await page.getTextContent();
                document.getElementById("text-layer").innerHTML = "";

                // Pass the data to the method for rendering of text over the pdf canvas.
                pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: $("#text-layer").get(0),
                    viewport: viewport,
                    textDivs: []
                });


            });

        });
        this.maxPage = maxPage;
        this._updateObject();

    }


}

class Chapter {
    constructor(it) {
        this.item = it;
        this.label = it.str.toUpperCase();
        this.numPage = it.numPage;
        this.sections = [];
    }
}

class Section {
    constructor(it) {
        this.item = it;
        this.label = it.str.toUpperCase();
        this.numPage = it.numPage;
    }
}
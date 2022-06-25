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

        //custom listenners
        /*
        let scanPdf = html.find("#scanPdf")[0];
        scanPdf.addEventListener("click", this._onscanPdf.bind(this));
        */
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


        //formApplication listenners
        super.activateListeners(html);

        //rendering pdf if already set
        if (this.pdfUrl) {
            await this.renderPdf(this.object.pdfUrl);
        }


    }

    getSelection(ev) {

        if (window.getSelection().toString().length > 0) {

            let nodeList = [];
            for (let node of document.getElementById('text-layer').children) {
                if (window.getSelection().toString().includes(node.innerHTML) && node.tagName != "br") {
                    nodeList.push(node.cloneNode());
                }
            }
            for (let node of nodeList) {
                document.getElementById('htmlContent').append(node);
            }
            var selObj = window.getSelection();
            alert(selObj);
            var selRange = selObj.getRangeAt(0);
            document.getElementById('htmlContent').append(selRange);
            // let cont = document.getElementById('htmlContent').append(window.getSelection());
        }



    }


    async createChapters() {


        let chapterList = this.contents.filter(c => c.role == "chapter");
        for (let i = 0; i < chapterList.length - 1; i++) {
            let cont = chapterList[i];
            let actualPage = cont.numPage;


            //concat chapter names depending if multiple chapters in same page
            let siblingContents = chapterList.filter(ct => ct.numPage == actualPage);
            let chapterName = "";
            if (siblingContents.length > 1) {
                chapterName = siblingContents.reduce(function (ac, a, index, array) {
                    return ac + " " + a.str;
                }, " ");
            }
            else {
                chapterName = cont.str;
            }
            //deleting space characters 
            for (let l of chapterName) {
                if (chapterName.startsWith(" ")) {
                    chapterName = chapterName.substring(1);
                }
            }


            let jFolder = ui.journal.folders.find(f => f.name == chapterName);
            if (!jFolder) {
                jFolder = await Folder.create({
                    name: chapterName,
                    type: "JournalEntry",
                    sort: i,
                    flags: {
                        pdfExtractor: {
                            sourcePage: actualPage
                        }
                    },
                    sorting: "m"
                });

                //creating journal with same name as folder for indexing sections and storing content before first section
                let data = {
                    "name": chapterName,
                    "folder": jFolder.id,
                    sort: this.contents.filter(c => c.role == "chapter").indexOf(cont)
                };
                await JournalEntry.create(
                    data
                );
            }

        }

    }
    async createSections() {
        let sectionList = this.contents.filter(c => c.role == "section");
        for (let i = 0; i < sectionList.length - 1; i++) {
            let section = sectionList[i];
            let actualPage = sectionList[i].numPage;

            let siblingContents = sectionList.filter(ct => ct.numPage == actualPage);
            let sectionName = "";


            if (siblingContents.length > 1) {
                sectionName = siblingContents.reduce(function (ac, a, index, array) {
                    return ac + " " + a.str;
                }, " ");
            }
            else {
                sectionName = section.str;
            }
            //deleting space characters 
            for (let l of sectionName) {
                if (sectionName.startsWith(" ")) {
                    sectionName = sectionName.substring(1);
                }
            }
            if (!game.journal.getName(sectionName)) {
                //ordering chapters by sourcePage

                let previousChapters = game.folders.filter(fold => fold.data.flags.pdfExtractor?.sourcePage <= actualPage).sort((a, b) => {
                    if (a.data.flags.pdfExtractor.sourcePage < b.data.flags.pdfExtractor.sourcePage) {
                        return -1;
                    }
                    if (a.data.flags.pdfExtractor.sourcePage > b.data.flags.pdfExtractor.sourcePage) {
                        return 1;
                    }
                    return 0;
                });

                if (previousChapters.length > 0) {
                    let lastChapter = previousChapters[previousChapters.length - 1];
                    await JournalEntry.create({
                        name: sectionName,
                        folder: lastChapter.id,
                        flags: {
                            pdfExtractor: {
                                sourcePage: actualPage
                            }
                        },
                        sort: i
                    });
                }

            }

        }
        console.log(sectionList);
    }
    async createJournal(ev) {

        await this.createChapters();
        await this.createSections();
        /*
                for (let i = 0; i < this.contents.length - 1; i++) {
                    let cont = this.contents[i];
        
        
                    if (cont.role == "section") {
        
                        let previousChapter = this.contents.filter(c => c.role == "chapter" && this.contents.indexOf(c) <= this.contents.indexOf(cont));
                        let lastChapterName = game.folders.filter(f => f.name.includes(previousChapter[previousChapter.length - 1].str))[0].name;
                        console.log(lastChapterName);
                        JournalEntry.create({
                            name: cont.str,
                            folder: game.folders.getName(lastChapterName).id,
                            sort: this.contents.filter(c => c.role == "section").indexOf(cont)
        
                        });
        
                    }
                    if (cont.role == "paragraphe") {
        
                    }
        
                }*/
    }
    async setPdfUrl(ev) {
        this.createLoading();
        this.pdfUrl = document.getElementById('pdfUrl').value;
        this.activePage = 1;
        await this._updateObject();
        document.getElementById('activePage').value = 1;

        await this.renderPdf();
        await this.scanPdf();
        this.deleteLoading();

    }

    async changePage(ev) {
        ev.preventDefault();
        this.activePage = parseInt(ev.currentTarget.value);
        await this.renderPdf(this.pdfUrl);


    }
    createLoading() {
        let loadingDiv = document.createElement('div');
        loadingDiv.id = "pdfLoading";
        loadingDiv.innerHTML = '<div><i class="fas fa-pray"></i><i class="fas fa-spinner"></i><div>';
        document.body.append(loadingDiv)
    }
    deleteLoading() {
        let loadingDiv = document.getElementById('pdfLoading');
        if (loadingDiv) { document.body.removeChild(loadingDiv); }

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
    async _onscanPdf() {
        await this.scanPdf();
        await this._updateObject()

    }
    async scanPdf() {
        let obj = this;
        var loadingTask = await pdfjsLib.getDocument(this.pdfUrl);
        obj.fonts = {};
        obj.contents = [];
        obj.sizes = {};
        obj.pages = [];
        let responses = 0;
        let structure = [];
        if (!document.getElementById("pdfLoading")) {
            this.createLoading();
        }

        loadingTask.promise.then(async function (pdf) {
            let maxPage = pdf.numPages;
            //getting textContent by pages
            for (var j = 0; j <= maxPage - 1; j++) {
                var page = await pdf.getPage(j + 1);
                obj.pages[j] = await page.getTextContent();
            }

            for (let i = 0; i < obj.pages.length; i++) {
                let p = obj.pages[i];


                //getting fonts in pages =>storing in this.fonts
                for (let style in p.styles) {
                    if (!obj.fonts[style]) {
                        let s = p.styles[style];
                        obj.fonts[style] = s;
                    }
                }


                for (let itemIndex = 0; itemIndex < p.items.length; itemIndex++) {
                    let it = p.items[itemIndex]
                    it.numPage = i + 1;

                    /*
                    //removing empty items
                    if (it.heigth == 0 || it.width == 0 || it.str == "") {
                        p.items.splice(obj.contents[it], 1);
                        break;
                    }
*/
                    if (it.height != 0 && p.items[p.items.indexOf(it) - 1]?.str != it.str) {

                        if (!obj.sizes[it.height.toFixed().toString().replace(".", ",")]) {
                            obj.sizes[it.height.toFixed().toString().replace(".", ",")] = {
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


                    //filtering unecessary textItems
                    if (it.height != 0 && it.width != 0 && it.str != "") {
                        obj.contents.push(it);
                    }


                }

                if (i == obj.pages.length - 1) {
                    ui.pdfExtractor.fonts = obj.fonts;
                    ui.pdfExtractor.sizes = obj.sizes;
                    ui.pdfExtractor.contents = obj.contents;
                    ui.pdfExtractor.objects = p.commonObjects;


                    await ui.pdfExtractor._updateObject();
                    ui.pdfExtractor.close();
                    ui.pdfExtractor.render(true);

                }

            }

            structure.forEach(t => { console.log(t); });

        });

        if (document.getElementById("pdfLoading")) {
            this.deleteLoading();
        }
    }



    async renderPdf() {
        if (!document.getElementById("pdfLoading")) {
            this.createLoading();
        }
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
        if (document.getElementById("pdfLoading")) {
            this.deleteLoading();
        }

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
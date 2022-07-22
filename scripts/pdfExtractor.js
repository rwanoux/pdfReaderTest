export default class PDFExtractor extends FormApplication {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "modules/pdfReaderTest/templates/extractor.hbs";
        options.width = 800;
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
        data.openActors = [];
        data.openItems = [];
        data.openJournals = [];

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
        textLayer.addEventListener("mouseup", this._onSelection.bind(this));


        //formApplication listenners
        super.activateListeners(html);

        // getting 
        Hooks.on('renderActorSheet', async function (app, html, sheetData) {
            if (!ui.pdfExtractor.openActors.some(act => act == sheetData.item.id)) {
                ui.pdfExtractor.openActors.push(sheetData.actor.id);

            }

        });
        Hooks.on('renderItemSheet', async function (app, html, sheetData) {
            if (!ui.pdfExtractor.openItems.some(it => it == sheetData.item.id)) {
                ui.pdfExtractor.openItems.push(sheetData.item.id);
            }

        });
        Hooks.on('renderJournalSheet', async function (app, html, sheetData) {
            if (!ui.pdfExtractor.openJournals.some(j => j == sheetData.document.id)) {
                ui.pdfExtractor.openItems.push(sheetData.document.id);
            }

        });
        Hooks.on('closeActorSheet', async function (app, html) {
            ui.pdfExtractor.openActors = [];
        });
        Hooks.on('closeJournalSheet', async function (app, html) {
            ui.pdfExtractor.openJournals = [];
        });
        Hooks.on('closeItemSheet', async function (app, html) {
            ui.pdfExtractor.openItems = [];
        });


        //rendering pdf if already set
        if (this.pdfUrl) {
            await this.renderPdf(this.object.pdfUrl);
        }


    }
    async _onSelection(ev) {
        if (window.getSelection().toString().length > 0) {

            let entityChoices = [];
            for (let key of game.system.documentTypes.Actor) {
                entityChoices.push(key);
            }
            for (let key of game.system.documentTypes.Item) {
                entityChoices.push(key);
            }
            entityChoices.push("JournalEntry");


            let butts = {};
            for (let choice of entityChoices) {
                butts[choice] = {
                    label: choice,

                    callback: () => {
                        ui.pdfExtractor.createEntity(choice);
                    }

                };
            }
            let d = new Dialog({
                title: "fill entity",
                content: "choose the entity you want to create",
                buttons: butts
            }, {
                left: 100,
                top: 100,
                resizable: true
            });
            d.render(true);
        }

    }
    async createEntity(type) {
        switch (type) {
            case "stormknight":
                await Actor.create({ name: "new", type: stormknight });
                break;
            case "JournalEntry":
                let content = await ui.pdfExtractor.getSelection();
                console.log(content)
                await ui.pdfExtractor.createJournal(content);
                break;
            default:
                let el = await ui.pdfExtractor.getSelection();
                let text = el.innerText
                for (let i = 0; i < text.length; i++) {
                    let car = text[i]
                    console.log(`
                    the __ ${car}
                    has code ${car.charCodeAt(0)}
                    `)
                }
        }
    }


    async getSelection() {
        //if some text is selected 

        if (window.getSelection().toString().length > 0) {


            // selected html elements

            let firtsNode = window.getSelection().anchorNode.parentNode;
            let lastNode = window.getSelection().focusNode.parentNode;
            let parent = firtsNode.parentNode;


            // html collection to array 
            let content = [].slice.call(parent.children);
            content = content.slice(content.indexOf(firtsNode), content.indexOf(lastNode) + 1);

            //new empty array to store elements
            let entityContent = [];

            // creating a div in order to grab inner html
            let d = document.createElement("div");


            console.log(content)

            // cleaning original content, deleting linebreak and empty span
            for (let node of content) {
                console.log(node.innerText)
                if (node.innerText) {
                    console.log('OLD_____________' + node.innerText);
                    node.innerText = node.innerText.replaceAll(/\n/g, "<br/>").replaceAll("�", `.
                    `);
                    console.log('NEW_____________' + node.innerText);

                    if (node.innerText == " " || node.tagName == "BR") {
                        if (content[content.indexOf(node) - 1]) {
                            content[content.indexOf(node) - 1].innerText += " ";
                        }
                        content.splice(content.indexOf(node), 1);
                    }


                    //adding space between spans

                    if (node.innerText.endsWith(" ") && content[content.indexOf(node) - 1]?.innerText.startsWith(" ")) {
                        node.innerText = node.innerText.substring(1);
                    }
                    console.log(node.innerText);
                } else {
                    content.splice(content.indexOf(node), 1);
                }

            };



            content.forEach(node => {

                let newNode = node.cloneNode(true);

                if (newNode.style.fontSize == "10px") {
                    entityContent[content.indexOf(node)] = newNode;
                }

                else if (newNode.style.fontSize == "9.8px" || newNode.style.fontSize == "14px") {
                    let title = document.createElement("h3");
                    if (newNode.innerText == content[content.indexOf(node) + 1]?.innerText) {
                        title = document.createElement("h2")
                    }
                    if (newNode.hasAttributes()) {
                        for (let i = 0; i < newNode.attributes.length; i++) {
                            title.setAttribute(newNode.attributes[i].name, newNode.attributes[i].value);
                        }
                    }
                    title.innerText = newNode.innerText.toUpperCase();

                    entityContent[content.indexOf(node)] = title;
                }
                else if (newNode.style.fontSize == "18px") {
                    let title = document.createElement("h1");
                    if (newNode.hasAttributes()) {
                        for (let i = 0; i < newNode.attributes.length; i++) {
                            title.setAttribute(newNode.attributes[i].name, newNode.attributes[i].value);
                        }
                    }
                    title.innerText = newNode.innerText;

                    entityContent[content.indexOf(node)] = title;
                }

            });
            // concatening same elements
            entityContent.forEach(node => {


                if (entityContent.indexOf(node) > 0) {
                    if (node.tagName === (entityContent[entityContent.indexOf(node) - 1])?.tagName) {
                        for (let i = entityContent.indexOf(node) - 1; i >= 0; i--) {
                            if (!entityContent[i].getAttribute("data-doubled")) {
                                if (entityContent[i].innerHTML != node.innerHTML) {
                                    if (entityContent[i].innerHTML.length > 1) {
                                        entityContent[i].innerHTML += " " + node.innerHTML;
                                    } else {
                                        entityContent[i].innerHTML += node.innerHTML;
                                    }

                                }

                                i = 0;
                            }
                        }


                        node.setAttribute("data-doubled", true);
                    }
                }



            });


            entityContent.forEach(node => {
                if (!node.getAttribute("data-doubled")) {
                    node.removeAttribute("style");

                    d.append(node);
                }


            });
            window.getSelection().empty();

            return d;
        }
    }


    async createJournal(element) {
        let j = await JournalEntry.create({
            content: element.innerHTML.replaceAll("�", ".").replaceAll("•", '<br/>•'),
            name: "new Journal"
        });

        j.sheet.render(true);
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
        if (this.activepage > this.maxPage) { this.activePage = this.maxPage; }

        ev.currentTarget.value = this.activePage;

        await this.renderPdf(this.pdfUrl);


    }
    createLoading() {
        let loadingDiv = document.createElement('div');
        loadingDiv.id = "pdfLoading";
        loadingDiv.innerHTML = '<div><i class="fas fa-pray"></i><i class="fas fa-spinner"></i><div>';
        document.body.append(loadingDiv);
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
        await this._updateObject();

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
                    let it = p.items[itemIndex];
                    it.numPage = i + 1;


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

                    ui.pdfExtractor.render(true);
                    if (document.getElementById("pdfLoading")) {
                        ui.pdfExtractor.deleteLoading();
                    }
                }

            }


        });


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
                var viewport = page.getViewport({ scale: 1 });
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
            ui.pdfExtractor.deleteLoading();
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
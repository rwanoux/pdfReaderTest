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
      
       

        let pageInput = html.find("#activePage")[0];
        pageInput.addEventListener("change", this.changePage.bind(this));

        let prevBut = html.find("#pdfPrevious")[0];
        prevBut.addEventListener("click", this.previous.bind(this));

        let nextBut = html.find("#pdfNext")[0];
        nextBut.addEventListener("click", this.nextPage.bind(this));

*/
        let inputUrl = html.find("#pdfUrl")[0];
        inputUrl.addEventListener("change", this.setPdfUrl.bind(this));

        let iframe = html.find("#pdfReader")[0];
        iframe.contentWindow.addEventListener("load", this.onFrameLoaded.bind(this))


        let createBut = html.find("#createJournal")[0];
        createBut.addEventListener("click", () => {

            this.scanPdfContent();

        });

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




        //formApplication listenners
        super.activateListeners(html);

    }
    async getTree(outlines) {
        let itIndex = 0;

        for (let item of outlines) {
            await Folder.create({
                name: item.title,
                type: "JournalEntry",

                sort: itIndex,
                sorting: "m"
            }).then(async (f) => {
                if (item.items.length > 0) {
                    await this.getSubTree(item, f.id)
                }
            });
            itIndex++;
        }
    }

    async getSubTree(parentItem, parentId) {
        let itIndex = 0;
        for (let item of parentItem.items) {
            await Folder.create({
                name: item.title,
                type: "JournalEntry",
                parent: parentId,
                sorting: "m",
                sort: itIndex
            }).then(async (f) => {
                if (item.items.length > 0) {
                    await this.getSubTree(item, f.id);
                }
            })

            itIndex++
        }



    }
    async onFrameLoaded(ev) {
        let frameDoc = ev.currentTarget.document;
        frameDoc.getElementById("viewer").addEventListener("mouseup", this._onSelection.bind(this));

    }

    async _onSelection(ev) {

        if (document.getElementById("pdfReader").contentWindow.getSelection().toString().length > 0) {

            let entityChoices = [];

            entityChoices.push("JournalEntry");
            entityChoices.push("Actot");
            entityChoices.push("Item");


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

        let content = await ui.pdfExtractor.getSelectedElements();
        console.log(content)

        switch (type) {
            case "Actor":
                await Actor.create({ name: "new", type: stormknight });
                break;
            case "JournalEntry":
                await ui.pdfExtractor.createJournal(content);
                break;
            case "Item":
                await ui.pdfExtractor.createItem(content);
                break;
            default:

                break
        }

    }


    async getSelectedElements() {


        let frameWin = document.getElementById("pdfReader").contentWindow;
        let frameDoc = document.getElementById("pdfReader").contentWindow.document;
        console.log(frameWin.PDFViewerApplication);

        //if some text is selected 
        if (frameWin.getSelection().toString().length > 0) {
            // selected html elements
            let firtsLine = frameWin.getSelection().anchorNode.parentElement.closest(".markedContent");
            let lastLine = frameWin.getSelection().focusNode.parentElement.closest(".markedContent");

            let firstPage = firtsLine.closest(".page");
            let lastPage = lastLine.closest(".page");

            let parentcontents = [].slice.call(frameDoc.querySelectorAll(".markedContent"));
            let presContents = [];

            //recuperer les spans contenant du text dans presContent
            if (firstPage.dataset.pageNumber == lastPage.dataset.pageNumber) {
                parentcontents = parentcontents.slice(parentcontents.indexOf(firtsLine), parentcontents.indexOf(lastLine) + 1);
                for (let c of parentcontents) {
                    for (let ch of c.children) {
                        if (ch.role == "presentation") {
                            presContents.push(ch)
                        }
                    }
                }
            }

            console.log(presContents)


            // creating a div in order to grab inner html
            let d = document.createElement("div");
            d.style.display = "relative";

            presContents.forEach(async (el) => {

                let newEl = el.cloneNode(true)

                d.append(newEl)
            })
            console.log(presContents)

            return d;
        }
    }


    async createJournal(element) {
        let j = await JournalEntry.create({
            content: element.innerHTML.replaceAll("�", "."),
            name: "new Journal"
        });

        j.sheet.render(true);
    }

    async setPdfUrl(ev) {
        if (this.pdfUrl != ev.currentTarget.value) {
            this.pdfUrl = ev.currentTarget.value;
            await this._updateObject();
            this.render(true)
        }

    }
    async scanPdfContent(ev) {

        console.log("---------------scaning")
        let frameWin = document.getElementById("pdfReader").contentWindow;
        let frameDoc = frameWin.document;
        let pairs = [];
        this.textContents = [];


        let pdf = frameWin.PDFViewerApplication.pdfDocument;

        // puttin all textContent by page 
        for (let i = 1; i <= pdf.numPages; i++) {
            let page = await pdf.getPage(i).then(async (p) => {
                let content = await p.getTextContent().then(c => {
                    c.sourcePage = i;
                    this.textContents.push(c)
                });
            });


        }
        console.log(this.textContents);

        // getting all chapters and outlines of thhe pdf doccument

        this.pdfProxy = pdf;
        let outlines = await pdf.getOutline().then(o => {
            this.getTree(o)

        });

    }

}


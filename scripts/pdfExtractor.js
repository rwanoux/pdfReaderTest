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
        data.openActors = "";
        data.openItems = "";
        data.openJournals = "";
        data.sizes = {};
        data.scanned = false;

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
        if (!ui.pdfExtractor.scanned && ui.pdfExtractor.pdfUrl) {

            iframe.contentWindow.addEventListener("load", async () => {
                this.createloading();
                //getting pdfjs app
                iframe.contentWindow.PDFViewerApplication.initializedPromise.then(async function () {
                    console.log(iframe.contentWindow.PDFViewerApplication.eventBus)
                    //waiting the pdf to be 
                    iframe.contentWindow.PDFViewerApplication.eventBus.on("layersloaded", async () => {
                        console.log(".....pdf loaded");

                        await ui.pdfExtractor.scanPdfTextContent()


                    })

                })

            })
        };


        let createBut = html.find("#createJournal")[0];
        createBut.addEventListener("click", () => {



        });
        let contentBut = html.find("#getContent")[0];
        contentBut.addEventListener("click", () => {

            this.getFoldersTextContent();

        });

        // getting 
        Hooks.on('renderActorSheet', async function (app, html, sheetData) {
            ui.pdfExtractor.openActors = sheetData.actor.id

        });
        Hooks.on('renderItemSheet', async function (app, html, sheetData) {
            ui.pdfExtractor.openItems = sheetData.item.id
        });
        Hooks.on('renderJournalSheet', async function (app, html, sheetData) {
            ui.pdfExtractor.openJournals = sheetData.document.id
        });
        Hooks.on('closeActorSheet', async function (app, html) {
            ui.pdfExtractor.openActors = "";
        });
        Hooks.on('closeJournalSheet', async function (app, html) {
            ui.pdfExtractor.openJournals = "";
        });
        Hooks.on('closeItemSheet', async function (app, html) {
            ui.pdfExtractor.openItems = "";
        });




        //formApplication listenners
        super.activateListeners(html);

    }
    createloading() {
        let loading = document.createElement("div");
        loading.innerHTML = `
                <i class="fas fa-cog fa-spin"></i>
    `
        loading.id = "pdfLoading";
        document.body.append(loading)
    }
    deleteLoading() {
        document.getElementById("pdfLoading").remove()
    }
    async onFrameLoaded(ev) {
        let frameDoc = ev.currentTarget.document;
        await this.scanPdfTextContent();
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
            if (this.openJournals) {
                let journal = game.journal.get(this.openJournals)
                butts["update"] = {
                    label: "update : " + journal.name,
                    callback: async () => {
                        await ui.pdfExtractor.updateOpenJournal();
                        clearPdfSelection()
                    }
                }
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
    clearPdfSelection() {
        let frameWin = document.getElementById("pdfReader").contentWindow;

        if (frameWin.getSelection) {
            if (frameWin.getSelection().empty) {  // Chrome
                frameWin.getSelection().empty();
            } else if (frameWin.getSelection().removeAllRanges) {  // Firefox
                frameWin.getSelection().removeAllRanges();
            }
        } else if (document.selection) {  // IE?
            document.selection.empty();
        }

    }
    async updateOpenJournal() {
        let content = await ui.pdfExtractor.getSelectedElements();
        let journal = await game.journal.get(this.openJournals);
        await journal.update({
            content: content.outerHTML

        });

    }
    async createEntity(type) {

        let content = await ui.pdfExtractor.getSelectedElements();

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

    async _onGetSelection() {
        console.log(this.textContents)
    }
    async getSelectedElements() {


        let frameWin = document.getElementById("pdfReader").contentWindow;
        let frameDoc = document.getElementById("pdfReader").contentWindow.document;

        //if some text is selected 
        if (frameWin.getSelection().toString().length > 0) {





            // selected html elements
            let firtsLine = frameWin.getSelection().anchorNode.parentElement.closest(".markedContent");
            let lastLine = frameWin.getSelection().focusNode.parentElement.closest(".markedContent");

            let firstPage = firtsLine.closest(".page");
            let lastPage = lastLine.closest(".page");

            await this._onGetSelection()


            /*
            let parentcontents = [].slice.call(frameDoc.querySelectorAll(".markedContent"));
            let presContents = [];
    
            //recuperer les spans contenant du text dans presContent
            if (firstPage.dataset.pageNumber == lastPage.dataset.pageNumber) {
                parentcontents = parentcontents.slice(parentcontents.indexOf(firtsLine), parentcontents.indexOf(lastLine) + 1);
                for (let c of parentcontents) {
                    for (let ch of c.children) {
                        if (ch.getAttribute("role") == "presentation") {
                            presContents.push(ch)
                        }
                    }
                }
            }
    
            // creating a div in order to grab inner html
            let d = document.createElement("div");
    
    
            for (let i = 0; i < presContents.length; i++) {
                let el = presContents[i];
                let nextEl = presContents[i + 1];
                let lineBreak = false
    
                if (el.innerText != nextEl?.innerText) {
                    let newEl = el.cloneNode(true);
                    if (newEl.innerText === "�") {
                        if (newEl.style.top == nextEl.style.top) {
                            newEl.innerText = ". "
                        } else {
                            lineBreak = true;
                        }
                    }
                    newEl.style.color = "black";
                    newEl.style.fontSize = "unset";
                    newEl.style.opacity = "1";
                    newEl.style.position = "unset"
    
                    if (newEl.tagName != "BR") {
                        d.append(newEl);
                        if (lineBreak) { d.append(document.createElement("br")) }
    
                    }
                }
    
            }
    
            return d;
            */
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
    async getTree(outlines) {
        let itIndex = 0;
        let pdf = this.pdfProxy;

        for (let item of outlines) {
            await Folder.create({
                name: item.title,
                type: "JournalEntry",

                sort: itIndex,
                sorting: "m"
            }).then(async (f) => {
                try {
                    await pdf.getDestination(item.dest).then(async (dest) => {
                        let ref = dest[0];
                        await pdf.getPageIndex(ref).then(async (id) => {
                            await f.setFlag("pdfReaderTest", "sourcePage", id + 1)
                        })
                    })

                } catch (e) {
                    alert(`
                    une erreur s'est produite
                    ${e}
                    `)
                }

                if (item.items.length > 0) {
                    await this.getSubTree(item, f.id)
                }


            });
            itIndex++;
        }

    }

    async getSubTree(parentItem, parentId) {
        let itIndex = 0;
        let pdf = this.pdfProxy;
        for (let item of parentItem.items) {
            await Folder.create({
                name: item.title,
                type: "JournalEntry",
                parent: parentId,
                sorting: "m",
                sort: itIndex
            }).then(async (f) => {
                try {
                    await pdf.getDestination(item.dest).then(async (dest) => {
                        let ref = dest[0];
                        await pdf.getPageIndex(ref).then(async (id) => {
                            await f.setFlag("pdfReaderTest", "sourcePage", id + 1)
                        })
                    })

                } catch (e) {
                    console.warn(e)
                }
                if (item.items.length > 0) {
                    await this.getSubTree(item, f.id);
                }
                this.createFolderContent()
            })

            itIndex++
        }
    }
    async scanPdfTextContent() {

        console.log("---------------scaning")
        let frameWin = document.getElementById("pdfReader").contentWindow;
        let frameDoc = frameWin.document;
        let pairs = [];
        this.textContents = [];


        let pdf = frameWin.PDFViewerApplication.pdfDocument;
        this.pdfProxy = pdf

        // puttin all textContent  
        for (let i = 1; i <= pdf.numPages; i++) {
            let page = await pdf.getPage(i).then(async (p) => {
                let content = await p.getTextContent().then(p => {

                    for (let c of p.items) {
                        c.sourcePage = i;
                        this.textContents.push(c)
                    }
                });
            });

        }

        await this.getSizes()

    }

    async getSizes() {
        for (let c of this.textContents) {
            if (!this.sizes[c.height.toString()]) {
                this.sizes[c.height.toString()] = "";

            }


        }
        console.log(this.sizes)
        console.log("***********************scan done");
        this.deleteLoading();
        ui.pdfExtractor.scanned = true;
        this.render(true)

    }
    async _onCreateFolder() {
        // getting all chapters and outlines of thhe pdf doccument and creating folders for journal entries
        let outlines = await this.pdfProxy.getOutline().then(async (o) => {
            await this.getTree(o)
        });
    }

    async getFoldersTextContent() {
        // creating contents in folders
        // getting folders if created by the module
        let moduleFolders = game.folders.filter(m => m.flags.pdfReaderTest);
        //sorting them by page
        moduleFolders.sort((a, b) => {
            a.flags.pdfReaderTest.sourcePage - b.flags.pdfReaderTest.sourcePage
        })
        for (let folder of moduleFolders) {
            let sourcePage = folder.flags.pdfReaderTest.sourcePage;
            console.log(folder.name, '_________', sourcePage)
            let nextFolder = moduleFolders[moduleFolders.indexOf(folder) + 1];

            let lastPage = sourcePage;
            if (nextFolder) {
                lastPage = nextFolder.flags.pdfReaderTest.sourcePage;
            }

            let contents = this.textContents.filter(c => c.sourcePage >= sourcePage && c.sourcePage <= lastPage);
            let newContents = [];
            for (let p of contents) {
                for (let c of p.items) {
                    newContents.push(c);
                }

            }
            let firstContent = newContents.filter(c => c.str.toUpperCase == folder.name.toUpperCase);
            let lastContent;
            if (nextFolder, folder.name.toUpperCase) {
                lastContent = newContents.filter(c => c.str.toUpperCase == nextFolder.name.toUpperCase);

            } else { lastContent = newContents[newContents.length - 1] }

        }
    }



}


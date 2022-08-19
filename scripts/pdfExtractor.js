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
        data.textContents = []



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
            scanned: this.scanned,
            textContents: this.textContents
        };
        game.settings.set('pdfExtractor', 'pdfExtractor', data);
        this.render()

    }
    async activateListeners(html) {


        let inputUrl = html.find("#pdfUrl")[0];
        inputUrl.addEventListener("change", this.setPdfUrl.bind(this));

        let iframe = html.find("#pdfReader")[0];
        iframe.contentWindow.addEventListener("load", async () => {



            //getting pdfjs app
            iframe.contentWindow.PDFViewerApplication.initializedPromise.then(async function () {
                //waiting the pdf to be  loaded
                if (!ui.pdfExtractor.scanned && ui.pdfExtractor.pdfUrl) {
                    iframe.contentWindow.PDFViewerApplication.eventBus.on("layersloaded", async () => {
                        ui.pdfExtractor.createloading();
                        console.log(".....pdf loaded");
                        await ui.pdfExtractor.scanPdfTextContent();
                    })
                };
                iframe.contentWindow.PDFViewerApplication.eventBus.on("pagerendered", async () => {
                    ui.pdfExtractor.setZoomRatio()
                })

            })


            iframe.contentWindow.document.body.addEventListener("mouseup", this._onSelection.bind(this))

        })

        //mouse up when selection in pdf



        let createBut = html.find("#createFolders")[0];
        createBut.addEventListener("click", () => {
            this._onCreateFolders()
        });
        /*
        let contentBut = html.find("#getContent")[0];
        contentBut.addEventListener("click", () => {

            this.getFoldersTextContent();

        });
*/
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
    setZoomRatio() {
        let frameWin = document.getElementById("pdfReader").contentWindow;
        let pdf = frameWin.PDFViewerApplication.pdfDocument;


        console.log(pdf)
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
        this.scanPdfTextContent();
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
                        ui.pdfExtractor.clearPdfSelection()

                    }

                };
            }
            if (this.openJournals) {
                let journal = game.journal.get(this.openJournals)
                butts["update" + this.openJournals] = {
                    label: "update : " + journal.name,
                    callback: async () => {
                        ui.pdfExtractor.updateOpenJournal();
                        ui.pdfExtractor.clearPdfSelection()
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
        ui.pdfExtractor.getSelectedElements().then(async (content) => {
            let journal = game.journal.get(this.openJournals);
            console.log(journal)
            journal.update({
                content: journal.data.content + "<br/>" + content.innerHTML.replace("�", ". ").replace("�", "")

            });

        });

    }
    async createEntity(type) {

        let content = ui.pdfExtractor.getSelectedElements().then(c => {
            switch (type) {
                case "Actor":
                    Actor.create({ name: "new", type: stormknight });
                    break;
                case "JournalEntry":
                    ui.pdfExtractor.createJournal(c);
                    break;
                case "Item":
                    ui.pdfExtractor.createItem(c);
                    break;
                default:

                    break
            }

        });


    }


    async getSelectedElements() {


        let frameWin = document.getElementById("pdfReader").contentWindow;
        let frameDoc = document.getElementById("pdfReader").contentWindow.document;


        //if some text is selected 
        if (frameWin.getSelection().toString().length > 0) {
            // selected html elements
            let firstLine = frameWin.getSelection().anchorNode.parentElement.closest(".markedContent");
            let lastLine = frameWin.getSelection().focusNode.parentElement.closest(".markedContent");
            let pdf = frameWin.PDFViewerApplication.pdfDocument;
            console.log(pdf.promise)

            let firstPage = firstLine.closest(".page");
            let lastPage = lastLine.closest(".page");


            let parentcontents = [].slice.call(frameDoc.querySelectorAll(".markedContent"));
            let presContents = [];

            //recuperer les spans contenant du text dans presContent

            parentcontents = parentcontents.slice(parentcontents.indexOf(firstLine), parentcontents.indexOf(lastLine) + 1);
            for (let c of parentcontents) {
                for (let ch of c.children) {
                    if (ch.getAttribute("role") == "presentation" && ch.tagName != "BR") {
                        presContents.push(ch)
                    }
                }
            }


            // creating a div in order to grab inner html
            let d = document.createElement("div");


            for (let i = 0; i < presContents.length; i++) {
                let el = presContents[i];
                let nextEl = presContents[i + 1];
                let parBreak = false


                let newEl = el.cloneNode(true);
                let firstNextLetter = nextEl?.innerText[0];

                if (newEl.innerText == newEl.innerText.toUpperCase()) {
                    if (/^[a-zA-Z\s]+$/.test(newEl.innerText) && newEl.innerText.length > 1) {
                        let title = document.createElement("h2");
                        title.innerText = newEl.innerText;
                        newEl = title
                    };

                }
                //repérer les points et retours paragraphes
                if (newEl.innerText === "�") {
                    newEl.innerText = ". ";
                    if (nextEl) {

                        if (parseInt(el.style.top.split("px")[0]) + parseInt(el.style.fontSize.split("px")[0]) < parseInt(nextEl.style.top.split("px")[0]) || parseInt(el.style.top.split("px")[0]) + parseInt(el.style.fontSize.split("px")[0]) > parseInt(nextEl.style.top.split("px")[0])) {

                            console.log(firstNextLetter)
                            if (firstNextLetter == firstNextLetter.toUpperCase()) {
                                parBreak = true;
                            }
                            else {
                                newEl.innerText = " "
                            }
                        }
                    }
                }

                //si retour à la ligne ajout d'espace si besoin 
                if (nextEl) {
                    if (firstNextLetter == "•") {
                        parBreak = true;
                    }
                    if (parseInt(newEl.style.top.split("px")[0]) + parseInt(newEl.style.fontSize.split("px")[0]) < parseInt(nextEl.style.top.split("px")[0]) || parseInt(newEl.style.top.split("px")[0]) + parseInt(newEl.style.fontSize.split("px")[0]) > parseInt(nextEl.style.top.split("px")[0])) {

                        if (!newEl.innerText.endsWith(" ") && !nextEl.innerText.startsWith(" ") && !parBreak) {
                            newEl.innerText += " "
                        }
                    }

                }

                newEl.removeAttribute("style")

                if (!nextEl) {
                    d.append(newEl);
                } else {
                    if (newEl.innerText != nextEl.innerText) {
                        d.append(newEl);
                    }
                }

                if (parBreak) { d.append(document.createElement("br")) }




            }
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
            this.scanned = false;
            this.pdfUrl = ev.currentTarget.value;
            this._updateObject();

        }

    }
    async getTree(outlines) {
        let frameWin = document.getElementById("pdfReader").contentWindow;
        let pdf = frameWin.PDFViewerApplication.pdfDocument;

        for (let item of outlines) {
            let itIndex = outlines.indexOf(item)
            Folder.create({
                name: item.title,
                type: "JournalEntry",

                sort: itIndex,
                sorting: "m"
            }).then(async (f) => {
                try {
                    await pdf.getDestination(item.dest).then(async (dest) => {

                        let ref = dest[0];
                        pdf.getPageIndex(ref).then(async (id) => {
                            await f.setFlag("pdfReaderTest", "sourcePage", id + 1)
                        })
                    })

                } catch (e) {
                    console.warn(e);
                }

                if (item.items.length > 0) {
                    this.getSubTree(item, f.id)
                }


            });
            itIndex++;
        }

    }

    async getSubTree(parentItem, parentId) {
        let itIndex = 0;
        let pdf = this.pdfProxy;
        for (let item of parentItem.items) {
            Folder.create({
                name: item.title,
                type: "JournalEntry",
                parent: parentId,
                sorting: "m",
                sort: itIndex
            }).then(async (f) => {
                try {
                    await pdf.getDestination(item.dest).then(async (dest) => {
                        let ref = dest[0];
                        pdf.getPageIndex(ref).then(async (id) => {
                            await f.setFlag("pdfReaderTest", "sourcePage", id + 1)
                        })
                    })

                } catch (e) {
                    console.warn(e)
                }
                if (item.items.length > 0) {
                    this.getSubTree(item, f.id);
                }
                ui.pdfExtractor.getFoldersTextContent()
            })

            itIndex++
        }
    }
    async scanPdfTextContent() {

        console.log("---------------scaning")
        let frameWin = document.getElementById("pdfReader").contentWindow;
        let frameDoc = frameWin.document;
        let pdf = frameWin.PDFViewerApplication.pdfDocument;
        this.pdfProxy = pdf;

        let pairs = [];

        this.textContents = [];
        // puttin all textContent  
        for (let i = 1; i <= pdf.numPages; i++) {
            let page = pdf.getPage(i).then(async (p) => {
                let content = await p.getTextContent().then(p => {

                    for (let c of p.items) {
                        c.sourcePage = i;
                        this.textContents.push(c)
                    }
                });
            });

        }
        this.getSizes()

    }

    async getSizes() {
        this.sizes = {};
        for (let c of this.textContents) {
            if (!this.sizes[c.height.toString()]) {
                this.sizes[c.height.toString().replace(".", ",")] = "";

            }
        }
        console.log("***********************scan done");
        ui.pdfExtractor.sizes = this.sizes;
        this.deleteLoading();
        this.scanned = true;
        this._updateObject()

    }
    async _onCreateFolders(ev) {
        let frameWin = document.getElementById("pdfReader").contentWindow;
        let pdf = frameWin.PDFViewerApplication.pdfDocument;
        pdf.getOutline().then(async (o, pdf) => {
            this.getTree(o)
        })




    }

    async getFoldersTextContent() {
        // creating contents in folders
        // getting folders if created by the module
        let moduleFolders = await game.folders.filter(mf => mf.flags.pdfReaderTest);
        console.log(moduleFolders)
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
            console.log(folder.name + '=============================');
            console.log(firstContent, lastContent)
        }
    }



}


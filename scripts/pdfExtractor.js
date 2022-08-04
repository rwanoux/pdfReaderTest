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
        console.log(iframe);
        iframe.addEventListener("load", this.onFrameLoaded.bind(this))

        let createBut = html.find("#createJournal")[0];
        createBut.addEventListener("click", this.getTree.bind(this));


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
    async getTree(ev) {
        let frameDoc = this.element.find("#pdfReader")[0].contentWindow.document;
        let pdfApp = this.element.find("#pdfReader")[0].contentWindow.PDFViewerApplication;

        let itIndex = 0;
        
        for (let item of pdfApp.pdfOutlineViewer._outline) {
            Folder.create({
                name: item.title,
                type: "JournalEntry",
                
                sort: itIndex,
                sorting: "n"
            }).then(async(f)=>{
                 if (item.items.length > 0) {
                await this.getSubTree(item, f.id)
            }
            itIndex++;
            });
           
        }
        game.folders.forEach(async (f)=>{
            await f.update({
                data:{
                    sorting:"n"
                }
                
            })
        })

    }
    
    async getSubTree(parentItem,parentId) {
        

        let itIndex = 0;

        for (let item of parentItem.items) {
            Folder.create({
                name: item.title,
                type: "JournalEntry",
                parent: parentId,
                sorting:"n",
                sort:itIndex
            }).then(async (f)=>{
              if (item.items.length > 0) {
                await this.getSubTree(item, f.id);
            }  
            })
            
            itIndex++
        }



    }
    async onFrameLoaded(ev) {
        let frameDoc = ev.currentTarget.contentWindow.document;
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

            console.log(firstPage, lastPage)
            let contents = [].slice.call(frameDoc.querySelectorAll(".markedContent"));

            if (firstPage.dataset.pageNumber == lastPage.dataset.pageNumber) {


                contents = contents.slice(contents.indexOf(firtsLine), contents.indexOf(lastLine) + 1);

            }

            console.log(contents)

            //new empty array to store elements
            let entityContent = [];

            // creating a div in order to grab inner html
            let d = document.createElement("div");




            // cleaning original content, deleting linebreak and empty span
            for (let line of contents) {

                if (line.innerText) {

                    if (line.innerText == " " || line.tagName == "BR") {
                        if (contents[contents.indexOf(line) - 1]) {
                            contents[contents.indexOf(line) - 1].innerText += " ";
                        }
                        contents.splice(contents.indexOf(line), 1);
                    }


                    //adding space between spans

                    if (line.innerText.endsWith(" ") && contents[contents.indexOf(line) - 1]?.innerText.startsWith(" ")) {
                        line.innerText = line.innerText.substring(1);
                    }
                } else {
                    contents.splice(contents.indexOf(line), 1);
                }

            };

            console.log(contents)

            contents.forEach(line => {

                for (let node of line.children) {

                    let newNode = node.cloneNode(true);

                    if (newNode.style.fontSize == "10px") {
                        entityContent[contents.indexOf(node)] = newNode;
                    }

                    else if (newNode.style.fontSize == "9.8px" || newNode.style.fontSize == "14px") {
                        let title = document.createElement("h3");
                        if (newNode.innerText == contents[contents.indexOf(node) + 1]?.innerText) {
                            title = document.createElement("h2")
                        }
                        if (newNode.hasAttributes()) {
                            for (let i = 0; i < newNode.attributes.length; i++) {
                                title.setAttribute(newNode.attributes[i].name, newNode.attributes[i].value);
                            }
                        }
                        title.innerText = newNode.innerText.toUpperCase();

                        entityContent[contents.indexOf(node)] = title;
                    }
                    else if (newNode.style.fontSize == "18px") {
                        let title = document.createElement("h1");
                        if (newNode.hasAttributes()) {
                            for (let i = 0; i < newNode.attributes.length; i++) {
                                title.setAttribute(newNode.attributes[i].name, newNode.attributes[i].value);
                            }
                        }
                        title.innerText = newNode.innerText;

                        entityContent[contents.indexOf(node)] = title;
                    }

                }
            });
            console.log(entityContent)
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

    setPdfUrl(ev) {
        this.pdfUrl = ev.currentTarget.value;
        this._updateObject()
    }

}

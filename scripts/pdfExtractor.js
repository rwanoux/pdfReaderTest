export default class PDFExtractor extends FormApplication {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "modules/pdfReaderTest/templates/extractor.hbs";
        options.width = 1550;
        options.height = 920;
        options.left = 80;
        options.title = "pdf extractor";
        options.resizeable = true;
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        options.editable = true;
        return options
    }

    constructor() {

        super();

        this.pdfUrl = "";
        this.activePage = 1;
        this.pages = [];
        this.fonts = {};

    }

    getData() {
        const data = game.settings.get("pdfExtractor", "pdfExtractor")

        return mergeObject(super.getData(), data);

    }

    async _updateObject(event, formData) {
        const data = expandObject(formData);
        await game.settings.set('pdfExtractor', 'pdfExtractor', data);
        this.render();
    }
    async activateListeners(html) {





        /*
                let createHtmlButton = html.find("#createHtml")[0];
                createHtmlButton.addEventListener("click", this.createHtml.bind(this))
        */
        let pageInput = html.find("#activePage")[0];
        pageInput.addEventListener("change", this.changePage.bind(this))
        let prevBut = html.find("#pdfPrevious")[0];
        prevBut.addEventListener("click", this.previous.bind(this))
        let nextBut = html.find("#pdfNext")[0];
        nextBut.addEventListener("click", this.nextPage.bind(this));
        let inputUrl = html.find("#pdfUrl")[0];
        inputUrl.addEventListener("change", this.setPdfUrl.bind(this));


        let textLayer = html.find("#text-layer")[0];
        textLayer.addEventListener("mouseup", this.getSelection.bind(this))



        super.activateListeners(html);
        if (this.pdfUrl) {
            await this.renderPdf(this.object.pdfUrl)
        }

    }

    getSelection(ev) {
        if (window.getSelection().toString().length > 0) {
            console.log(window.getSelection().toString().replace(/[\r\n]+/gm, " "))
        }

    }

    async setPdfUrl(ev) {
        let obj = await game.settings.get("pdfExtractor", "pdfExtractor")
        obj.pdfUrl = document.getElementById('pdfUrl').value;
        this.pdfUrl = document.getElementById('pdfUrl').value;
        await game.settings.set("pdfExtractor", "pdfExtractor", obj)
        return this.renderPdf()

    }

    async changePage(ev) {
        ev.preventDefault();
        this.activePage = parseInt(ev.currentTarget.value);
        await this.renderPdf(this.pdfUrl)
        //  game.settings.set("pdfExtractor", "pdfExtractor", this.object)


    }
    nextPage(ev) {
        console.log(this)
        this.activePage++;
        this.renderPdf(this.pdfUrl)
    }
    previous(ev) {
        this.activePage--;
        this.renderPdf(this.pdfUrl)
    }
    async createHtml(ev) {
        let htmlContent = document.createElement("div");
        let container = document.getElementById('htmlContent');
        let tagSelectors = document.getElementsByClassName("fontTag")
        for (let selector of tagSelectors) {
            this.object.fonts[selector.getAttribute("data-font")].tag = selector.options[selector.selectedIndex].value
        }

        for (let page of this.object.pages) {
            for (let i = 0; i < page.items.length; i++) {
                let it = page.items[i];
                if (it.str != page.items[i - 1]?.str) {

                    if (!it.str.startsWith(" ") || page.items[i - 1]?.str.endsWith(" ")) {
                        it.str = " " + it.str
                    }

                    if (container.lastChild && container.lastElementChild?.tagName.toUpperCase() == this.object.fonts[it.fontName].tag.toUpperCase()) {
                        container.lastChild.innerText += it.str


                    } else if (this.object.fonts[it.fontName].tag != "dont display") {
                        let el = document.createElement(this.object.fonts[it.fontName].tag);
                        el.classList.add(it.fontName);
                        el.innerText = it.str;
                        htmlContent.append(el)
                    }
                }

                let el = document.createElement(this.object.fonts[it.fontName].tag);
                el.classList.add(it.fontName);
                el.innerText = it.str;
                htmlContent.append(el)

            }
        }

        container.innerHTML = "";
        container.append(htmlContent);
        this.object.html = container.innerHTML
        await game.settings.set("pdfExtractor", "pdfExtractor", this.object)
    }
    async scanPdf() {
        let obj = this.object;
        var loadingTask = await pdfjsLib.getDocument(this.object.pdfUrl);
        let maxPages;
        let totalText = "";
        let pages;
        let countPromises = 0; // collecting all page promises
        obj.fonts = {}

        loadingTask.promise.then(async function (pdf) {
            maxPages = pdf._pdfInfo.numPages;
            pages = new Array(maxPages);

            //getting textContent by pages
            for (var j = 1; j <= maxPages; j++) {
                let pageText = ""
                var page = await pdf.getPage(j);
                pages[page._pageIndex] = await page.getTextContent();



                countPromises++;
                if (countPromises == maxPages) {
                    console.log('all pages scanned')
                    console.log(totalText)

                }
            }


            obj.pages = pages
            ui.pdfExtractor = mergeObject(ui.pdfExtractor, obj);
            console.log(obj)
            game.settings.set("pdfExtractor", "pdfExtractor", obj);
            console.log(obj);
            let fonts = {};
            let sizes = {}
            for (let i = 0; i < pages.length; i++) {

                let p = pages[i]
                for (let style in p.styles) {
                    if (!fonts[style]) {
                        let s = p.styles[style]

                        fonts[style] = s
                    }
                }
                //ksdjlksqjdlkfjqlskdjfqlksdjfl
                for (let it of p.items) {
                    // console.log(it.str)
                    if (!fonts[it.fontName].exemple && it.str != "") {
                        fonts[it.fontName].exemple = {
                            page: i + 1,
                            text: it.str
                        }
                    }
                    if (!sizes[it.height]) {
                        sizes[it.height] = {
                            tag: "untagged"
                        }
                    }
                    totalText += it.str
                }

                obj.fonts = fonts;
                obj.sizes = sizes;
            }


            await game.settings.set("pdfExtractor", "pdfExtractor", obj)

        })
        this.render(true)



    }



    async renderPdf() {
        let activePage = this.activePage
        var loadingTask = pdfjsLib.getDocument(this.pdfUrl);
        loadingTask.promise.then(async function (pdf) {

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
                await page.render(renderContext)
                let textContent = await page.getTextContent()
                console.log(textContent)
                document.getElementById("text-layer").innerHTML = "";
                textContent.items.forEach(it => {
                    console.log(it.str)
                    it.str = it.str.replace(String.fromCharCode(65533), "-")
                    /*carCode=65533,
                    for (var i = 0; i < it.str.length; i++) {
                        console.log("Code ASCII de " + it.str.charAt(i) + "=" + it.str.charCodeAt(i));
                    }
                    */
                })
                // Pass the data to the method for rendering of text over the pdf canvas.
                pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: $("#text-layer").get(0),
                    viewport: viewport,
                    textDivs: []
                });


            });

        });

    }


}
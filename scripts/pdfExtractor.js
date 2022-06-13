export default class PDFExtractor extends FormApplication {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "modules/pdfReaderTest/templates/extractor.hbs";
        options.width = 500;
        options.height = 800;
        options.title = "pdf extractor";
        options.resizeable = true;
        options.submitOnChange = true;
        options.closeOnSubmit = false;
        options.editable = true;
        return options
    }

    constructor() {
        super();
        this.object = {
            pdfUrl: "",
            pdf: null,
            activePage: 1,
            pages: [],
            fonts: []
        }

    }

    getData() {
        const data = game.settings.get("pdfExtractor", "pdfExtractor")

        return mergeObject(super.getData(), data);

    }
    async _render(...args) {

        if (this.object.pdfUrl) {
            super._render(...args);
            await this.renderPdf(this.object.pdfUrl)
        } else { super._render(...args); }
    }
    _updateObject(event, formData) {
        const data = expandObject(formData);
        game.settings.set('pdfExtractor', 'pdfExtractor', data);
    }
    activateListeners(html) {

        let fileButton = html.find("#pdfFileSelector")[0];
        fileButton.addEventListener("click", this.chooseFile.bind(this))

        let pageInput = html.find("#activePage")[0];
        pageInput.addEventListener("change", this.changePage.bind(this))
        let analyzeButton = html.find("#pdfAnalize")[0];
        analyzeButton.addEventListener("click", this.scanPdf.bind(this))

        super.activateListeners(html);

    }

    async scanPdf(ev) {
        ev.preventDefault();
        console.log(this);
        let maxPages = this.object.pdf._pdfInfo.numPages;
        let totalText = [];
        let countPromises = 0; // collecting all page promises
        for (var j = 1; j <= maxPages; j++) {
            let pageText = ""
            var page = await this.object.pdf.getPage(j);
            this.object.pages[page._pageIndex] = page;
            let txtObjects = await page.getTextContent();
            countPromises++;
            if (countPromises == maxPages) {
                console.log("done__________________________")
            }

        }
        console.log(this.object.pages)
        for (let p of this.object.pages) {
            let content = await p.getTextContent();

            // scannings fonts
            for (let style in content.styles) {
                console.log(style);
                if (!this.object.fonts[style]) {
                    this.object.fonts[style] = content.styles[style]
                }
            }

        }
        console.log(this.object);

        this._render()

    }
    changePage(ev) {
        ev.preventDefault();
        this.object.activePage = parseInt(ev.currentTarget.value);

        this.object.pdf.getPage(this.object.activePage).then(function(page) {
            // you var scale = 1.5;
            var viewport = page.getViewport({ scale: 0.5, });
            // Support HiDPI-screens.
            var outputScale = window.devicePixelRatio || 1;

            var canvas = document.getElementById('the-canvas');
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
            page.render(renderContext);

        });

    }
    chooseFile(ev) {
        ev.preventDefault();
        const fp = new FilePicker({
            type: "text",
            current: this.object.pdfUrl,
            callback: async path => {
                console.log(path)
                this.setPdfUrl(path);
                await this.renderPdf(path)
                this.render(true);

            },
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        return fp.browse();
    }
    setPdfUrl(path) {
        this.object.pdfUrl = path;

    }

    async renderPdf(path) {
        console.log(this)
        let obj = this.object;
        var loadingTask = pdfjsLib.getDocument(path);
        loadingTask.promise.then(function(pdf) {
            obj.pdf = pdf;
            //game.setting.set("pdfExtractor", "pdfExtractor", )
            pdf.getPage(obj.activePage).then(function(page) {
                // you var scale = 1.5;
                var viewport = page.getViewport({ scale: 0.5, });
                // Support HiDPI-screens.
                var outputScale = window.devicePixelRatio || 1;

                var canvas = document.getElementById('the-canvas');
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
                page.render(renderContext);

            });
        });
        console.log(this);
        game.settings.set("pdfExtractor", "pdfExtractor", this.object)

    }

}
export default class PDFExtractor extends FormApplication {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "modules/pdfReaderTest/templates/extractor.hbs";
        options.width = 500;
        options.height = 800;
        options.title = "pdf extractor";
        options.resizeable = true;
        options.submitOnChange = true;
        options.closeOnSubmit = false
        return options
    }

    constructor() {
        super();
        this.object = {
            pdfUrl: "",
            pdf: null,
            activePage: 1
        }

    }

    getData() {
        const data = super.getData();
        data.object = game.settings.get("pdfExtractor", "pdfExtractor")


        return data;

    }

    _updateObject(event, formData) {
        const data = expandObject(formData);
        game.settings.set('torgeternity', 'deckSetting', data);
    }
    activateListeners(html) {

        let fileButton = html.find("#pdfFileSelector")[0];
        fileButton.addEventListener("click", this.chooseFile.bind(this))
        let renderButton = html.find("#renderPdf")[0];
        renderButton.addEventListener("click", this.renderPdf.bind(this))


        super.activateListeners(html);

    }
    chooseFile(ev) {
        ev.preventDefault();
        const fp = new FilePicker({
            type: "text",
            current: this.object.pdfUrl,
            callback: async path => {
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
        this.object.pdfUrl = path
        return this
    }

    async renderPdf(path) {

        let obj = this.object;
        var loadingTask = pdfjsLib.getDocument(path);
        loadingTask.promise.then(function(pdf) {
            obj.pdf = pdf;
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

    }

}
export default class PDFExtractor extends FormApplication {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "modules/pdfReaderTest/templates/extractor.hbs";
        options.width = 500;
        options.height = 800;
        options.title = "pdf extractor";
        options.resizeable = true;
        return options
    }

    constructor() {
        super();
        this.object.pdfUrl = ""

    }

    getData() {
        const data = super.getData();


        return data;

    }

    _updateObject(event, formData) {
        const data = expandObject(formData);
        console.log(data)
    }
    activateListeners(html) {

        let fileButton = html.find("#pdfFileSelector")[0];
        fileButton.addEventListener("click", this.test.bind(this))
        let renderButton = html.find("#renderPdf")[0];
        renderButton.addEventListener("click", this.renderPdf.bind(this))


        super.activateListeners(html);

    }
    test(ev) {
        ev.preventDefault();
        const fp = new FilePicker({
            type: "text",
            current: this.object.pdfUrl,
            callback: path => {
                this.setPdfUrl(path);
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
    completDocument(str) {
        document.roughtText += str
    }
    async renderPdf(ev) {
        ev.preventDefault();

        var loadingTask = pdfjsLib.getDocument(this.object.pdfUrl);
        loadingTask.promise.then(function(pdf) {
            pdf.getPage(1).then(function(page) {
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
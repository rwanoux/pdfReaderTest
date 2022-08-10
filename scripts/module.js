import PDFExtractor from "./pdfExtractor.js";

pdfjsLib.workerSrc = '../pdfjs/build/pdf.worker.js';
pdfjsLib.disableFontFace = true;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'modules/pdfReaderTest/pdfjs/build/pdf.worker.js';

Hooks.once('init', async function () {
    let meta = document.createElement("meta");
    meta.setAttribute("charset", "UFT-8");
    document.head.append(meta);

    game.settings.register('pdfExtractor', 'pdfExtractor', {
        scope: 'world',
        config: false,
        type: Object,
        default: {
            pdfUrl: "",
            pdf: null,
            activePage: 1,
            pages: [],
            fonts: {},
            sizes: {}
        }
    });




});


Hooks.once('ready', async function () {
    ui.pdfExtractor = new PDFExtractor();
    CONFIG.debug.hooks = true;

});


Hooks.on("renderSidebarTab", (app, html) => {
    if (app.options.id == "settings") {
        let button = $(`<button><i class="fas fa-download"></i> pdfExtractor</button>`);
        button.click(() => {
            ui.pdfExtractor.render(true);
        });
        html.find("#settings-game").append(button);


    }
});
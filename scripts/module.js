import PDFExtractor from "./pdfExtractor.js";

pdfjsLib.workerSrc = '../pdfjs/build/pdf.worker.js';
pdfjsLib.disableWorker = true;
pdfjsLib.disableFontFace = true;


Hooks.once('init', async function () {
    game.settings.register('pdfExtractor', 'pdfExtractor', {
        scope: 'world',
        config: false,
        type: Object,
        default: {
            pdfUrl: "",
            pdf: null,
            activePage: 1,
            pages: [],
            fonts: {}
        }
    });




});


Hooks.once('ready', async function () {
    ui.pdfExtractor = new PDFExtractor();

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